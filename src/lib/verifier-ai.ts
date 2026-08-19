/**
 * The real verifier: a second implementation of the Verifier interface that
 * posts the frame to /api/verify, which calls Gemini server side.
 *
 * This is the swap the original design anticipated. Nothing about the shape of
 * the interface changed, so the UI keeps talking to one object and does not
 * care which implementation answered.
 *
 * If the model is unreachable, overloaded, or the key is missing, this falls
 * back to the simulated verifier rather than failing the capture. A grower at
 * a demo should never see a dead screen because a datacentre was busy. The
 * result carries source: "simulated" so the UI can say so honestly.
 */

import type { AiVerification, VerifyRequest, VerifyResponse } from "./ai/contract";
import {
  mockVerifier,
  streakInfo,
  type VerificationDraft,
  type Verifier,
  type VerifyInput,
} from "./verifier";
import {
  actionMeta,
  type LogAction,
  type PointsLine,
  type VerificationCheck,
  type VerificationOutcome,
} from "./types";

const NATIVE = ["Ghaf", "Ghaf sapling", "Date palm", "Date palm offshoot", "Moringa", "Sidr"];

/** Awarded when the model can see the plant but no activity is under way. */
const CHECK_IN_POINTS = 5;

function isNativeSpecies(name: string): boolean {
  const lower = name.toLowerCase();
  return NATIVE.some((n) => lower.includes(n.toLowerCase()));
}

/**
 * Points, including the integrity rule that gives this whole design its teeth.
 *
 * A plant the grower has tended before earns full bonuses and the streak
 * multiplier. A plant seen for the first time earns the base rate only. That
 * is what makes a stolen photograph unprofitable: it always arrives as day
 * one, and the thief would have to keep returning to someone else's plant for
 * weeks to build anything worth having.
 */
function award(
  ai: AiVerification,
  action: LogAction,
  isNewPlant: boolean,
  history: VerifyInput["history"],
): { breakdown: PointsLine[]; total: number } {
  const breakdown: PointsLine[] = [];
  let total = 0;

  const add = (label: string, points: number) => {
    breakdown.push({ label, points });
    total += points;
  };

  if (ai.activity === "none") {
    add("Plant check in", CHECK_IN_POINTS);
  } else {
    add(`${actionMeta(action).label} (base)`, actionMeta(action).basePoints);
  }

  if (isNewPlant) {
    // Deliberately quiet about it here. The result screen explains the state
    // properly, and a line reading "minus bonuses" would read as a punishment
    // for the many growers who are simply adding a genuine new plant.
    return { breakdown, total };
  }

  if (ai.healthScore >= 85) add("Healthy plant", 15);

  const seen = new Set(history.map((v) => v.species));
  if (!seen.has(ai.species.en)) add(`First ${ai.species.en}`, 40);

  if (isNativeSpecies(ai.species.en)) add("Native species", 50);

  if (ai.produce.hasProduce && ai.activity === "harvest") {
    add("Harvest recorded", 20);
  }

  const { streak, multiplier } = streakInfo(history);
  if (multiplier > 1) {
    const bonus = Math.round(total * (multiplier - 1));
    if (bonus > 0) add(`${streak} day streak x${multiplier}`, bonus);
  }

  return { breakdown, total };
}

function buildChecks(
  ai: AiVerification,
  isNewPlant: boolean,
  matchedId: string | null,
  duplicate: boolean,
): VerificationCheck[] {
  const pct = Math.round(ai.confidence * 100);
  return [
    {
      id: "plant",
      label: "Plant matter detected",
      status: ai.isPlant ? "pass" : "fail",
      detail: ai.isPlant
        ? "The model found a plant in the frame"
        : "No plant found in this photo",
    },
    {
      id: "species",
      label: "Species identified",
      status: ai.confidence >= 0.6 ? "pass" : "warn",
      detail:
        ai.confidence >= 0.6
          ? `${ai.species.en}, ${pct}% confident`
          : `Best guess ${ai.species.en}, only ${pct}% confident`,
    },
    {
      id: "activity",
      label:
        ai.activity === "none"
          ? "No activity in frame"
          : `Activity read as "${actionMeta(ai.activity as LogAction).label}"`,
      status: ai.activity === "none" ? "warn" : "pass",
      detail:
        ai.activity === "none"
          ? "Logged as a check in. Show the work in frame to earn the full rate."
          : "Read from the scene, not from anything you told us",
    },
    {
      id: "identity",
      label: isNewPlant ? "New plant registered" : "Known plant matched",
      status: isNewPlant ? "warn" : "pass",
      detail: isNewPlant
        ? "First time we have seen this plant. It starts at day one."
        : `Matched to ${matchedId}, ${Math.round(ai.plant.matchConfidence * 100)}% confident`,
    },
    {
      id: "dupe",
      label: "Not a duplicate submission",
      status: duplicate ? "fail" : "pass",
      detail: duplicate
        ? "This exact frame has already been submitted"
        : "Checked against your recent submissions",
    },
  ];
}

/** Cheap exact-frame check. A real deployment would use a perceptual hash. */
function fingerprint(data: string): string {
  let h = 2166136261;
  const step = Math.max(1, Math.floor(data.length / 2048));
  for (let i = 0; i < data.length; i += step) {
    h ^= data.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${(h >>> 0).toString(36)}:${data.length}`;
}

export const geminiVerifier: Verifier = {
  id: "gemini",
  label: "Nabta Vision",

  async analyze(input: VerifyInput): Promise<VerificationDraft> {
    const plants = input.plants ?? [];

    const request: VerifyRequest = {
      image: input.image,
      knownPlants: plants.map((p) => ({
        id: p.id,
        species: p.species,
        identity: p.identity,
      })),
    };

    let payload: VerifyResponse;
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      payload = (await res.json()) as VerifyResponse;
    } catch {
      return degrade(input, "Could not reach the verification service.");
    }

    if (!payload.ok || !payload.result) {
      return degrade(input, payload.error ?? "The model could not read this photo.");
    }

    const ai = payload.result;

    // Map the model's activity onto the scoring vocabulary. "none" is not a
    // LogAction, so a check in is filed under pruning, the closest care action.
    const action: LogAction =
      ai.activity === "none" ? "pruning" : (ai.activity as LogAction);
    const meta = actionMeta(action);

    const mine = fingerprint(input.image);
    const duplicate = input.history.some(
      (v) => v.image && fingerprint(v.image) === mine,
    );

    const matchedId = ai.plant.matchedId;
    const isNewPlant = !matchedId;

    let outcome: VerificationOutcome = "approved";
    let note: string | undefined;

    if (duplicate) {
      outcome = "rejected";
      note = "You have already submitted this exact photo. Take a fresh one.";
    } else if (!ai.isPlant) {
      outcome = "rejected";
      note = "We could not find a plant in this photo. Point the camera at the plant and try again.";
    } else if (ai.confidence < 0.5) {
      outcome = "review";
      note = "We are not certain what this plant is. Someone will take a look and your points will follow.";
    } else if (ai.diagnosis.status === "issue" && ai.diagnosis.severity === "severe") {
      outcome = "review";
      note = "Logged. This plant needs attention, see the advice below.";
    }

    const { breakdown, total } =
      outcome === "rejected"
        ? { breakdown: [] as PointsLine[], total: 0 }
        : award(ai, action, isNewPlant, input.history);

    return {
      action,
      activityLabel: ai.activity === "none" ? "Plant check in" : meta.label,
      species: ai.species.en,
      speciesArabic: ai.species.ar,
      confidence: ai.confidence,
      healthScore: ai.healthScore,
      outcome,
      points: total,
      breakdown,
      checks: buildChecks(ai, isNewPlant, matchedId, duplicate),
      co2: outcome === "rejected" ? 0 : meta.co2,
      water: outcome === "rejected" ? 0 : meta.water,
      note,
      plantId: matchedId ?? undefined,
      plantIsNew: isNewPlant,
      plantNickname: ai.plant.nickname,
      diagnosis: ai.diagnosis,
      advice: ai.advice,
      produce: ai.produce,
      source: "ai",
      // Carried so the store can register the plant with its fingerprint.
      identity: ai.plant.identity,
    } as VerificationDraft & { identity: string };
  },
};

/** Falls back to the simulation and labels the result honestly. */
async function degrade(
  input: VerifyInput,
  reason: string,
): Promise<VerificationDraft> {
  const draft = await mockVerifier.analyze(input);
  return {
    ...draft,
    source: "simulated",
    note: draft.note
      ? `${draft.note} ${reason}`
      : `${reason} This result came from the offline simulation.`,
  };
}

/**
 * What the UI talks to. Swapping implementations is a one line change here.
 */
export const activeVerifier: Verifier = geminiVerifier;
