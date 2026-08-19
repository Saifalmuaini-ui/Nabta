import { guard } from "@/lib/api-guard";
import { generateJson, GeminiError, geminiConfigured } from "@/lib/gemini";
import {
  VERIFY_SCHEMA,
  type AiVerification,
  type VerifyRequest,
  type VerifyResponse,
} from "@/lib/ai/contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Roughly 8MB of base64, well above a 640px capture. */
const MAX_IMAGE_CHARS = 8_000_000;

function buildPrompt(known: VerifyRequest["knownPlants"]): string {
  const registry =
    known.length === 0
      ? "The grower has no registered plants yet. This capture registers their first one, so matchedId must be an empty string."
      : [
          "Plants this grower has already registered:",
          ...known.map(
            (p) => `  id ${p.id}: ${p.species}. Recorded as: ${p.identity}`,
          ),
          "",
          "Decide whether the plant in this photograph is one of those, using the pot, the container, the setting, the background, the overall form and the size. Growth between visits is expected, so a larger version of a registered plant is still a match. If it matches, put that id in matchedId. If it is a different plant, set matchedId to an empty string.",
        ].join("\n");

  return `You are the plant verification model for Nabta, a platform for people growing food and plants at home in the United Arab Emirates.

Look at the photograph and report what you actually see. Do not flatter the grower and do not invent detail that is not visible.

${registry}

Identify the activity from the scene, not from any claim. Use "harvest" only when picked produce is visible, "watering" when water, wet soil or irrigation is visible, "compost" when compost or soil is being added, "pruning" when cut material or cutting tools are visible, "planting" when a young plant or seed is going into soil. Otherwise use "none".

Set isPlant to false if the photograph does not show a plant.

For the identity field, write one sentence that would let you recognise this exact plant again on a later visit. Describe the container, the setting and the plant's form. Do not describe the lighting or the weather, those change.

Health score is 0 to 100. Judge it on leaf colour, firmness, damage and new growth.

For diagnosis, consider the ways plants fail in the Gulf specifically: salt burn from tap water or salty soil, heat stress, water stress, spider mite, whitefly, powdery mildew, and nitrogen or iron shortage. If the plant is fine, say so plainly rather than inventing a problem.

For produce, only set hasProduce true when you can see fruit or vegetables. Give a weight range in kilograms that is honestly wide. A single tomato plant with a few fruit is well under one kilogram.

WRITING RULES, these matter more than sounding expert:
Many growers using this are older, or did not finish school, or are growing for the first time. Write for them.
Short sentences. Everyday words. Explain anything a beginner would not know.
Amounts a person can picture, like a cup of water or two hand spans apart. Never millilitres per square metre.
Say what to do, not the science behind it.
Never make the grower feel stupid. If something went wrong, say what to do now.
Do not use dashes in any of your writing. Use commas and full stops.
Keep each field to one or two short sentences.

Write the en fields in English and the ar fields in Arabic. Write the Arabic directly in Arabic, as an Arabic speaker in the UAE would say it. Do not translate word for word from the English.`;
}

export async function POST(req: Request): Promise<Response> {
  const fail = (
    error: string,
    status: number,
    retryable: boolean,
  ): Response => {
    const body: VerifyResponse = { ok: false, error, retryable };
    return Response.json(body, { status });
  };

  // Vision calls are the expensive ones: 20 an hour is generous for a grower
  // and useless to someone scraping the endpoint.
  const gate = await guard("verify", { limit: 20, windowMs: 60 * 60 * 1000 });
  if (!gate.ok) return gate.response;

  if (!geminiConfigured()) {
    return fail("AI is not configured on this server.", 503, true);
  }

  let payload: VerifyRequest;
  try {
    payload = (await req.json()) as VerifyRequest;
  } catch {
    return fail("Request body was not valid JSON.", 400, false);
  }

  if (typeof payload?.image !== "string" || payload.image.length === 0) {
    return fail("No image supplied.", 400, false);
  }
  if (payload.image.length > MAX_IMAGE_CHARS) {
    return fail("Image is too large.", 413, false);
  }

  // Accept a data URL or bare base64, and recover the real mime type when the
  // caller sent a data URL, because captures are JPEG but uploads may be PNG.
  let mimeType = "image/jpeg";
  let data = payload.image;
  const dataUrl = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(payload.image);
  if (dataUrl) {
    mimeType = dataUrl[1] || mimeType;
    data = dataUrl[3];
  }
  if (data.length === 0) {
    return fail("Image payload was empty.", 400, false);
  }

  const known = Array.isArray(payload.knownPlants)
    ? payload.knownPlants.slice(0, 40)
    : [];

  try {
    const { value, meta } = await generateJson<AiVerification>({
      system: buildPrompt(known),
      contents: [
        {
          role: "user",
          parts: [
            { text: "Assess this capture." },
            { inline_data: { mime_type: mimeType, data } },
          ],
        },
      ],
      schema: VERIFY_SCHEMA,
      temperature: 0.2,
      maxOutputTokens: 4000,
      timeoutMs: 45_000,
    });

    // The schema cannot express "empty string means null", so normalise here
    // and drop any id the model invented that we never sent it.
    const claimed = value.plant?.matchedId ?? "";
    const real = known.some((p) => p.id === claimed) ? claimed : null;

    const result: AiVerification = {
      ...value,
      confidence: clamp01(value.confidence),
      healthScore: Math.max(0, Math.min(100, Math.round(value.healthScore))),
      plant: {
        ...value.plant,
        matchedId: real,
        matchConfidence: clamp01(value.plant?.matchConfidence ?? 0),
      },
    };

    const body: VerifyResponse = {
      ok: true,
      result,
      model: meta.model,
      tokens: { prompt: meta.promptTokens, output: meta.outputTokens },
    };
    return Response.json(body);
  } catch (err) {
    if (err instanceof GeminiError) {
      return fail(err.message, err.status >= 400 ? err.status : 502, err.retryable);
    }
    return fail("Verification failed.", 502, true);
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
