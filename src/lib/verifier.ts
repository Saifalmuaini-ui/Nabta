import type { AiAdvice, AiDiagnosis, AiYield, Bilingual } from "./ai/contract";
import { SPECIES } from "./data";
import { dayKey } from "./format";
import {
  ACTIONS,
  actionMeta,
  type LogAction,
  type Plant,
  type PointsLine,
  type Verification,
  type VerificationCheck,
  type VerificationOutcome,
} from "./types";

/**
 * ── Swapping in a real model ───────────────────────────────────────────────
 * Everything below the `Verifier` interface is a simulation. To go live,
 * write a second implementation of `Verifier` that POSTs the frame to a
 * vision model (e.g. Claude with an image block) and maps the response onto
 * `VerificationDraft`. Nothing else in the app needs to change, the UI only
 * ever talks to `activeVerifier`.
 */

export interface VerifyInput {
  image: string;
  history: Verification[];
  coords?: { lat: number; lng: number } | null;
  /** Registered plants, so the verifier can re-identify rather than guess. */
  plants?: Plant[];
}

export interface VerificationDraft {
  /** Read off the photo, the grower is never asked what they did. */
  action: LogAction;
  species: string;
  speciesArabic: string;
  confidence: number;
  healthScore: number;
  outcome: VerificationOutcome;
  points: number;
  breakdown: PointsLine[];
  checks: VerificationCheck[];
  co2: number;
  water: number;
  note?: string;

  /* Only the real model fills these in. */
  /**
   * What to call the activity on screen. Needed because "no activity visible"
   * has no LogAction to file it under, and showing the action it is stored as
   * would claim the grower did something the model never saw.
   */
  activityLabel?: string;
  plantId?: string;
  plantIsNew?: boolean;
  plantNickname?: Bilingual;
  diagnosis?: AiDiagnosis;
  advice?: AiAdvice;
  produce?: AiYield;
  source?: "ai" | "simulated";
}

export interface Verifier {
  id: string;
  label: string;
  analyze(input: VerifyInput): Promise<VerificationDraft>;
}

/** The visible steps the UI walks through while analysing. */
export const STAGES = [
  { id: "upload", label: "Preparing frame", detail: "Compressing and stripping location metadata" },
  { id: "detect", label: "Detecting plant matter", detail: "Segmenting foliage from background" },
  { id: "species", label: "Identifying species", detail: "Matching against the UAE species index" },
  { id: "activity", label: "Reading the activity", detail: "Working out what was done from the scene" },
  { id: "health", label: "Scoring plant health", detail: "Leaf colour, turgor, pest and stress markers" },
  { id: "action", label: "Confirming the activity", detail: "Checking the photo supports what you logged" },
  { id: "fraud", label: "Running integrity checks", detail: "Duplicate, re-photograph and screen-capture detection" },
  { id: "award", label: "Calculating points", detail: "Applying streak, novelty and efficiency bonuses" },
] as const;

/* ── deterministic pseudo-randomness, seeded by the image itself ─────────── */

function hashImage(data: string): number {
  // Sample the string rather than walking all of it, data URLs get long.
  let h = 2166136261;
  const step = Math.max(1, Math.floor(data.length / 2048));
  for (let i = 0; i < data.length; i += step) {
    h ^= data.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= data.length;
  return h >>> 0;
}

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

const NATIVE = ["Ghaf sapling", "Date palm offshoot", "Moringa"];

function currentStreak(history: Verification[]): number {
  if (history.length === 0) return 0;
  const days = new Set(history.map((v) => dayKey(v.createdAt)));
  let streak = 0;
  const cursor = new Date();
  // Today only counts if something was already logged today; otherwise start at yesterday.
  if (!days.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function streakMultiplier(streak: number): number {
  if (streak >= 14) return 1.5;
  if (streak >= 7) return 1.25;
  if (streak >= 3) return 1.15;
  return 1;
}

export function streakInfo(history: Verification[]) {
  const streak = currentStreak(history);
  return { streak, multiplier: streakMultiplier(streak) };
}

/* ── the simulated verifier ───────────────────────────────────────────────── */

export const mockVerifier: Verifier = {
  id: "mock-v1",
  label: "Nabta Vision (simulated)",

  async analyze({ image, history, coords }: VerifyInput): Promise<VerificationDraft> {
    const seed = hashImage(image);
    const rand = rng(seed);

    // The activity is read off the photo rather than declared. A real model
    // would classify the scene here; the simulation derives it from the image
    // hash so the same photo always reports the same activity.
    const action = ACTIONS[seed % ACTIONS.length].id;
    const meta = actionMeta(action);

    // Same photo submitted twice, the seed makes this reproducible, which is
    // exactly the property a real perceptual hash would give us.
    const duplicate = history.some((v) => v.image && hashImage(v.image) === seed);

    const species = SPECIES[seed % SPECIES.length];
    const confidence = duplicate ? 0.99 : 0.72 + rand() * 0.27;
    const healthScore = Math.round(58 + rand() * 41);
    const lowConfidence = confidence < 0.8;
    const seenSpecies = new Set(history.map((v) => v.species));
    const isNewSpecies = !seenSpecies.has(species.en);
    const isNative = NATIVE.includes(species.en);
    const dripDetected = action === "watering" && rand() > 0.35;

    const checks: VerificationCheck[] = [
      {
        id: "plant",
        label: "Plant matter detected",
        status: "pass",
        detail: `Foliage covers ${Math.round(24 + rand() * 46)}% of the frame`,
      },
      {
        id: "species",
        label: "Species identified",
        status: lowConfidence ? "warn" : "pass",
        detail: lowConfidence
          ? `Best match ${species.en}, but only ${Math.round(confidence * 100)}% confident`
          : `${species.en}, ${Math.round(confidence * 100)}% confidence`,
      },
      {
        id: "action",
        label: `Activity read as "${meta.label}"`,
        status: rand() > 0.12 ? "pass" : "warn",
        detail:
          action === "watering"
            ? dripDetected
              ? "Drip emitters visible at the base, water-efficient method"
              : "Soil moisture visible at the base"
            : action === "harvest"
              ? "Detached produce and parent plant both in frame"
              : "Scene shows tools, disturbed soil and fresh growth consistent with this activity",
      },
      {
        id: "fresh",
        label: "Capture is live",
        status: "pass",
        detail: "No screen moiré or re-photograph artefacts found",
      },
      {
        id: "dupe",
        label: "Not a duplicate submission",
        status: duplicate ? "fail" : "pass",
        detail: duplicate
          ? "This exact frame has already been submitted and rewarded"
          : `Checked against your last ${Math.min(history.length, 90)} submissions`,
      },
      {
        id: "geo",
        label: "Location plausible",
        status: coords ? "pass" : "warn",
        detail: coords
          ? `Within your registered plot (±${Math.round(6 + rand() * 20)}m)`
          : "Location not shared, verified on image evidence alone",
      },
    ];

    /* ── outcome ── */
    let outcome: VerificationOutcome = "approved";
    let note: string | undefined;

    if (duplicate) {
      outcome = "rejected";
      note = "Duplicate photo. Take a fresh one, no points awarded.";
    } else if (lowConfidence || healthScore < 62) {
      outcome = "review";
      note =
        healthScore < 62
          ? "Logged, but this plant looks stressed. An extension officer will follow up with advice."
          : "Logged and queued for a quick human check. Points land within 24 hours.";
    }

    /* ── points ── */
    const breakdown: PointsLine[] = [];
    let total = 0;

    if (outcome !== "rejected") {
      breakdown.push({ label: `${meta.label} (base)`, points: meta.basePoints });
      total += meta.basePoints;

      if (healthScore >= 85) {
        breakdown.push({ label: "Healthy plant bonus", points: 15 });
        total += 15;
      }
      if (isNewSpecies) {
        breakdown.push({ label: `First ${species.en}`, points: 40 });
        total += 40;
      }
      if (isNative) {
        breakdown.push({ label: "Native species bonus", points: 50 });
        total += 50;
      }
      if (dripDetected) {
        breakdown.push({ label: "Water-efficient method", points: 25 });
        total += 25;
      }

      const { streak, multiplier } = streakInfo(history);
      if (multiplier > 1) {
        const bonus = Math.round(total * (multiplier - 1));
        breakdown.push({ label: `${streak}-day streak ×${multiplier}`, points: bonus });
        total += bonus;
      }
    }

    return {
      action,
      species: species.en,
      speciesArabic: species.ar,
      confidence,
      healthScore,
      outcome,
      points: total,
      breakdown,
      checks,
      co2: outcome === "rejected" ? 0 : meta.co2,
      water: outcome === "rejected" ? 0 : meta.water + (dripDetected ? 12 : 0),
      note,
    };
  },
};

export const activeVerifier: Verifier = mockVerifier;
