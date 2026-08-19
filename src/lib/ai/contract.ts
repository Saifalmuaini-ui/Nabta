/**
 * The contract between the AI route handlers and the app.
 *
 * Plain data and types only, no secrets, so this is safe to import from client
 * components. The Gemini client itself lives in src/lib/gemini.ts and is
 * server only.
 *
 * Every human readable field carries both languages. The model produces them
 * together in one call, which costs roughly 150 extra output tokens and in
 * exchange means switching to Arabic never triggers a second model call or a
 * separate translation step. Advice written directly in Arabic also reads far
 * better than advice translated out of English.
 */

export type Locale = "en" | "ar";

/** A string the user will read, in both supported languages. */
export interface Bilingual {
  en: string;
  ar: string;
}

export type DiagnosisStatus = "healthy" | "issue" | "unclear";
export type DiagnosisSeverity = "none" | "mild" | "moderate" | "severe";

export interface AiDiagnosis {
  status: DiagnosisStatus;
  /** Named condition, for example "salinity burn" or "spider mite". */
  condition: Bilingual;
  severity: DiagnosisSeverity;
  /** What in the photograph led to this, so the grower can see it too. */
  evidence: Bilingual;
  /** One concrete action, not a list of possibilities. */
  whatToDo: Bilingual;
}

export interface AiAdvice {
  soil: Bilingual;
  location: Bilingual;
  water: Bilingual;
  seeds: Bilingual;
  care: Bilingual;
}

export interface AiYield {
  /** False for every log that is not a harvest with visible produce. */
  hasProduce: boolean;
  visibleCount: number;
  /** Deliberately a range. A single number here would be a false precision. */
  kgLow: number;
  kgHigh: number;
}

export interface AiPlantMatch {
  /** Id of a previously registered plant, or null when this is a new one. */
  matchedId: string | null;
  /** Model's own confidence in that match, 0 to 1. */
  matchConfidence: number;
  /**
   * Durable description of this specific plant: pot, setting, form, markings.
   * Stored and passed back on later captures so the model can re-identify it.
   * This is what makes "is this the plant you have been tending" answerable.
   */
  identity: string;
  /** Short friendly name, only used when registering a new plant. */
  nickname: Bilingual;
}

export type AiActivity =
  | "planting"
  | "watering"
  | "harvest"
  | "compost"
  | "pruning"
  | "none";

export interface AiVerification {
  species: Bilingual;
  /** 0 to 1. Below approximately 0.6 the UI should hedge the species claim. */
  confidence: number;
  activity: AiActivity;
  /** 0 to 100. */
  healthScore: number;
  isPlant: boolean;
  diagnosis: AiDiagnosis;
  advice: AiAdvice;
  produce: AiYield;
  plant: AiPlantMatch;
}

export interface VerifyRequest {
  /** Data URL or bare base64. The route accepts either. */
  image: string;
  /** Registered plants, so the model can re-identify rather than guess. */
  knownPlants: { id: string; species: string; identity: string }[];
}

export interface VerifyResponse {
  ok: boolean;
  result?: AiVerification;
  model?: string;
  tokens?: { prompt: number; output: number };
  /** Present when ok is false. Safe to show, never contains key material. */
  error?: string;
  /** True when the caller should fall back to the simulated verifier. */
  retryable?: boolean;
}

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

export interface ChatRequest {
  messages: ChatTurn[];
  locale: Locale;
  /** Lets the helper answer "my plant" without the user re-explaining. */
  context?: { species: string; healthScore: number; lastCondition: string }[];
}

export interface ChatResponse {
  ok: boolean;
  reply?: string;
  model?: string;
  error?: string;
}

/* ------------------------------------------------------------------ schema */

const bilingual = {
  type: "OBJECT",
  properties: {
    en: { type: "STRING" },
    ar: { type: "STRING" },
  },
  required: ["en", "ar"],
} as const;

/**
 * Passed to Gemini as responseSchema. Forcing structured output removes all
 * parsing guesswork: across every test call the response parsed first time.
 */
export const VERIFY_SCHEMA: Record<string, unknown> = {
  type: "OBJECT",
  properties: {
    isPlant: { type: "BOOLEAN" },
    species: bilingual,
    confidence: { type: "NUMBER" },
    activity: {
      type: "STRING",
      enum: ["planting", "watering", "harvest", "compost", "pruning", "none"],
    },
    healthScore: { type: "INTEGER" },
    diagnosis: {
      type: "OBJECT",
      properties: {
        status: { type: "STRING", enum: ["healthy", "issue", "unclear"] },
        condition: bilingual,
        severity: {
          type: "STRING",
          enum: ["none", "mild", "moderate", "severe"],
        },
        evidence: bilingual,
        whatToDo: bilingual,
      },
      required: ["status", "condition", "severity", "evidence", "whatToDo"],
    },
    advice: {
      type: "OBJECT",
      properties: {
        soil: bilingual,
        location: bilingual,
        water: bilingual,
        seeds: bilingual,
        care: bilingual,
      },
      required: ["soil", "location", "water", "seeds", "care"],
    },
    produce: {
      type: "OBJECT",
      properties: {
        hasProduce: { type: "BOOLEAN" },
        visibleCount: { type: "INTEGER" },
        kgLow: { type: "NUMBER" },
        kgHigh: { type: "NUMBER" },
      },
      required: ["hasProduce", "visibleCount", "kgLow", "kgHigh"],
    },
    plant: {
      type: "OBJECT",
      properties: {
        matchedId: { type: "STRING" },
        matchConfidence: { type: "NUMBER" },
        identity: { type: "STRING" },
        nickname: bilingual,
      },
      required: ["matchedId", "matchConfidence", "identity", "nickname"],
    },
  },
  required: [
    "isPlant",
    "species",
    "confidence",
    "activity",
    "healthScore",
    "diagnosis",
    "advice",
    "produce",
    "plant",
  ],
};
