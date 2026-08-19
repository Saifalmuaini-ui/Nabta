/**
 * Gemini client. Server side only.
 *
 * This module reads GEMINI_API_KEY. It must never be imported from a client
 * component or the key ends up in the browser bundle. Everything here is
 * called from route handlers under src/app/api.
 *
 * Model fallback is not decoration. The first live call made against this key
 * came back 503 "model is currently experiencing high demand", so a single
 * hardcoded model would have meant a dead demo. Each model in GEMINI_MODELS is
 * tried in turn on an overload or rate limit response.
 */

import "server-only";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/** Verified working on this key, in preference order. */
const DEFAULT_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
];

/** Responses worth trying the next model for, rather than failing outright. */
const RETRYABLE = new Set([404, 429, 500, 502, 503, 504]);

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

export function geminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function models(): string[] {
  const raw = process.env.GEMINI_MODELS;
  if (!raw) return DEFAULT_MODELS;
  const parsed = raw
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : DEFAULT_MODELS;
}

export interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

export interface GeminiCall {
  /** Steers behaviour without being part of the turn history. */
  system?: string;
  contents: { role: "user" | "model"; parts: GeminiPart[] }[];
  /** Supplying a schema forces valid JSON back, which removes all parsing guesswork. */
  schema?: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
  /** Per attempt, not total across the fallback chain. */
  timeoutMs?: number;
}

export interface GeminiResult {
  text: string;
  model: string;
  promptTokens: number;
  outputTokens: number;
}

async function attempt(
  model: string,
  call: GeminiCall,
  key: string,
): Promise<GeminiResult> {
  const generationConfig: Record<string, unknown> = {
    temperature: call.temperature ?? 0.3,
  };
  if (call.maxOutputTokens) {
    generationConfig.maxOutputTokens = call.maxOutputTokens;
  }
  if (call.schema) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = call.schema;
  }

  const body: Record<string, unknown> = {
    contents: call.contents,
    generationConfig,
  };
  if (call.system) {
    body.systemInstruction = { parts: [{ text: call.system }] };
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    call.timeoutMs ?? 45_000,
  );

  let res: Response;
  try {
    res = await fetch(
      `${ENDPOINT}/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Header rather than query string, so the key cannot leak through
          // request logs or a Referer header.
          "x-goog-api-key": key,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    throw new GeminiError(
      aborted ? `${model} timed out` : `${model} unreachable`,
      0,
      true,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const parsed = (await res.json()) as { error?: { message?: string } };
      if (parsed.error?.message) detail = parsed.error.message;
    } catch {
      // Body was not JSON. The status code is enough to act on.
    }
    throw new GeminiError(detail, res.status, RETRYABLE.has(res.status));
  }

  const json = (await res.json()) as {
    candidates?: {
      content?: { parts?: { text?: string }[] };
      finishReason?: string;
    }[];
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };

  const candidate = json.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();

  if (!text) {
    // A blocked or truncated answer is a real failure, but retrying the same
    // prompt on another model is reasonable and often succeeds.
    throw new GeminiError(
      `${model} returned no text (finish reason ${candidate?.finishReason ?? "unknown"})`,
      200,
      true,
    );
  }

  return {
    text,
    model,
    promptTokens: json.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: json.usageMetadata?.candidatesTokenCount ?? 0,
  };
}

/** Runs the call against each model in turn until one answers. */
export async function generate(call: GeminiCall): Promise<GeminiResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new GeminiError("GEMINI_API_KEY is not set", 0, false);
  }

  const chain = models();
  let last: GeminiError | undefined;

  for (const model of chain) {
    try {
      return await attempt(model, call, key);
    } catch (err) {
      const failure =
        err instanceof GeminiError
          ? err
          : new GeminiError(String(err), 0, true);
      last = failure;
      if (!failure.retryable) throw failure;
      // Otherwise fall through and try the next model in the chain.
    }
  }

  throw last ?? new GeminiError("No model produced a response", 0, true);
}

/** generate() plus a JSON parse, for calls that supplied a schema. */
export async function generateJson<T>(
  call: GeminiCall & { schema: Record<string, unknown> },
): Promise<{ value: T; meta: Omit<GeminiResult, "text"> }> {
  const result = await generate(call);
  try {
    return {
      value: JSON.parse(result.text) as T,
      meta: {
        model: result.model,
        promptTokens: result.promptTokens,
        outputTokens: result.outputTokens,
      },
    };
  } catch {
    throw new GeminiError(
      `${result.model} returned text that is not valid JSON`,
      200,
      false,
    );
  }
}
