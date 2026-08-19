import { guard } from "@/lib/api-guard";
import { generate, GeminiError, geminiConfigured } from "@/lib/gemini";
import type { ChatRequest, ChatResponse, ChatTurn } from "@/lib/ai/contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TURNS = 24;
const MAX_CHARS = 4000;

/**
 * The register here is the whole point of the feature. Nabta's growers include
 * people who are older, people who did not finish school, and people who have
 * never grown anything. An answer that is correct but unreadable is a failed
 * answer, so the constraints below are stated as hard rules rather than tone
 * suggestions, and they held across every test question.
 */
function systemPrompt(locale: "en" | "ar", context: string): string {
  const language =
    locale === "ar"
      ? "Answer in Arabic. Write directly in Arabic as a speaker in the UAE would say it, not translated word for word from English."
      : "Answer in English. If the grower writes in Arabic, answer in Arabic instead.";

  return `You are the Nabta growing helper. You help people grow food and plants at home in the United Arab Emirates.

WHO YOU ARE TALKING TO
Adults of any age and any level of schooling. Many have never grown anything before. Some read slowly. Some are asking because something is dying and they feel embarrassed about it.

HOW YOU ANSWER
Short sentences. Everyday words. If you must use a gardening word, explain it in the same sentence.
Give at most three steps. Number them.
Say what to do, not the science behind it.
Use amounts a person can picture: a cup of water, a finger deep, two hand spans apart. Never millilitres per square metre or pH figures unless asked.
Never make the grower feel stupid. If they made a mistake, tell them what to do now, not what they should have done.
If you genuinely do not know, say so and give the one thing most likely to help.
Do not use dashes in your writing. Use commas and full stops.
Keep the whole answer under 90 words unless the grower asks for more detail.

WHAT YOU KNOW ABOUT THIS PLACE
The UAE climate is the hard part. Summer heat from May to September kills most seedlings outdoors. The growing season is roughly October to March. Tap water is often salty, which burns leaf tips. Sandy soil drains too fast and holds no food for the plant. Shade in summer matters more than sun.

SAFETY
Do not recommend pesticides by brand or give dosing instructions. Suggest physical removal, washing leaves, or visiting an agricultural supply shop for advice.
You give growing advice only. If asked about anything else, say that you only help with plants, and ask what they are growing.

${context}

${language}`;
}

function contextBlock(ctx: ChatRequest["context"]): string {
  if (!ctx || ctx.length === 0) return "";
  const lines = ctx
    .slice(0, 8)
    .map(
      (p) =>
        `  ${p.species}, health ${p.healthScore} out of 100, last noted: ${p.lastCondition}`,
    );
  return [
    "PLANTS THIS GROWER IS TRACKING",
    ...lines,
    'If they say "my plant" without naming it, assume they mean one of these.',
  ].join("\n");
}

export async function POST(req: Request): Promise<Response> {
  const gate = await guard("chat", { limit: 40, windowMs: 60 * 60 * 1000 });
  if (!gate.ok) return gate.response;

  const fail = (error: string, status: number): Response =>
    Response.json({ ok: false, error } satisfies ChatResponse, { status });

  if (!geminiConfigured()) {
    return fail("The helper is not available on this server.", 503);
  }

  let payload: ChatRequest;
  try {
    payload = (await req.json()) as ChatRequest;
  } catch {
    return fail("Request body was not valid JSON.", 400);
  }

  const incoming = Array.isArray(payload?.messages) ? payload.messages : [];
  const messages: ChatTurn[] = incoming
    .filter(
      (m): m is ChatTurn =>
        Boolean(m) &&
        (m.role === "user" || m.role === "model") &&
        typeof m.text === "string" &&
        m.text.trim().length > 0,
    )
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, text: m.text.slice(0, MAX_CHARS) }));

  if (messages.length === 0) {
    return fail("No message to answer.", 400);
  }
  // Gemini requires the conversation to end on a user turn.
  if (messages[messages.length - 1].role !== "user") {
    return fail("The last message must be from the grower.", 400);
  }

  const locale: "en" | "ar" = payload.locale === "ar" ? "ar" : "en";

  try {
    const result = await generate({
      system: systemPrompt(locale, contextBlock(payload.context)),
      contents: messages.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      })),
      temperature: 0.4,
      // Generous, because these models reason before answering and a tight
      // cap truncates the reply into an empty string rather than a short one.
      maxOutputTokens: 2000,
      timeoutMs: 40_000,
    });

    return Response.json({
      ok: true,
      reply: result.text,
      model: result.model,
    } satisfies ChatResponse);
  } catch (err) {
    if (err instanceof GeminiError) {
      return fail(err.message, err.status >= 400 ? err.status : 502);
    }
    return fail("The helper could not answer just now.", 502);
  }
}
