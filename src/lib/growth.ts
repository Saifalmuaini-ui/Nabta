/**
 * The points economy, in one file.
 *
 * The rule that shapes everything here: a photograph is evidence, not a
 * reward. Points are earned by growing something to maturity, and a capture
 * on its own pays nothing.
 *
 * Previously every verified photo paid out immediately — base points for the
 * action, plus health, novelty and native-species bonuses, multiplied by a
 * daily streak. A grower photographing the same pot each morning could clear a
 * reward in under a week without anything actually growing. That is inflation,
 * and it also made the record worthless to a municipality: the log measured
 * photographs taken, not food produced.
 *
 * So points now sit in escrow against a plant and are released when its cycle
 * completes:
 *
 *   plant it        →  cycle opens, nothing paid
 *   check in weekly →  each valid check-in adds to the pending total
 *   harvest it      →  the whole pending total is released, plus a bonus
 *
 * Two consequences worth keeping. Time cannot be faked — a cycle needs real
 * weeks of elapsed calendar to accumulate. And a stolen photograph is close to
 * worthless, because one capture pays nothing and the thief would have to keep
 * returning to the same plant for weeks to collect.
 */

import type { Plant, Verification } from "./types";

const DAY = 86_400_000;

/**
 * How long before a capture counts as the next check-in.
 *
 * Six days rather than seven: a person who tends on Saturdays should not be
 * punished for being a few hours early. Anything sooner is still recorded and
 * still verified, it just does not advance the cycle.
 */
export const CHECK_IN_INTERVAL_DAYS = 6;

/** Awarded into escrow per valid check-in. Never paid directly. */
export const CHECK_IN_PENDING = 30;

/** Released on top of escrow when a cycle completes. */
export const HARVEST_BONUS = 100;

/**
 * A cycle must show real tending before it pays. Plant-then-immediately-harvest
 * releases nothing, which closes the obvious shortcut.
 */
export const MIN_CHECK_INS_TO_RELEASE = 2;

/** Paid once per unbroken week of activity, and capped so it cannot compound. */
export const WEEKLY_STREAK_POINTS = 15;
export const MAX_STREAK_WEEKS = 4;

export type CaptureKind = "planted" | "checkin" | "early" | "harvest";

export interface CaptureOutcome {
  kind: CaptureKind;
  /** Added to the plant's escrow now. */
  pendingDelta: number;
  /** Paid into the spendable balance now. Only ever non-zero on a release. */
  released: number;
  /** Whether this capture advanced the cycle. */
  countsAsCheckIn: boolean;
  /** Shown on the result screen, in the grower's words. */
  message: string;
  /** When the next check-in becomes due, if the cycle is still open. */
  nextCheckInAt?: number;
}

/** Has enough time passed since this plant's last counted check-in? */
export function checkInDue(plant: Pick<Plant, "lastCheckInAt">, now = Date.now()): boolean {
  if (!plant.lastCheckInAt) return true;
  return now - plant.lastCheckInAt >= CHECK_IN_INTERVAL_DAYS * DAY;
}

export function nextCheckInAt(plant: Pick<Plant, "lastCheckInAt">): number | undefined {
  if (!plant.lastCheckInAt) return undefined;
  return plant.lastCheckInAt + CHECK_IN_INTERVAL_DAYS * DAY;
}

/** Plain-language "due in 3 days" / "due now". */
export function checkInLabel(plant: Pick<Plant, "lastCheckInAt">, now = Date.now()): string {
  const at = nextCheckInAt(plant);
  if (!at || now >= at) return "Check-in due";
  const days = Math.ceil((at - now) / DAY);
  return days === 1 ? "Check in tomorrow" : `Check in in ${days} days`;
}

/**
 * Decide what a capture is worth. Pure: the caller applies the result.
 *
 * `plant` is null when this capture is registering a new plant.
 */
export function evaluateCapture(
  plant: Plant | null,
  verification: Pick<Verification, "action" | "outcome">,
  now = Date.now(),
): CaptureOutcome {
  // A rejected capture never moves the cycle, in either direction.
  if (verification.outcome === "rejected") {
    return {
      kind: "early",
      pendingDelta: 0,
      released: 0,
      countsAsCheckIn: false,
      message: "Not verified, so the cycle did not advance. Take a fresh photo.",
    };
  }

  // First capture of a plant: the cycle opens.
  if (!plant) {
    return {
      kind: "planted",
      pendingDelta: 0,
      released: 0,
      countsAsCheckIn: true,
      message:
        "Plant registered. Check in every week as it grows, and the points are paid when you harvest it.",
      nextCheckInAt: now + CHECK_INTERVAL_MS,
    };
  }

  const isHarvest = verification.action === "harvest";

  if (isHarvest) {
    const checkIns = plant.checkIns ?? 0;
    if (checkIns < MIN_CHECK_INS_TO_RELEASE) {
      return {
        kind: "early",
        pendingDelta: 0,
        released: 0,
        countsAsCheckIn: false,
        message: `Harvest recorded, but a cycle needs at least ${MIN_CHECK_INS_TO_RELEASE} weekly check-ins before points are released.`,
      };
    }
    const released = (plant.pendingPoints ?? 0) + HARVEST_BONUS;
    return {
      kind: "harvest",
      pendingDelta: -(plant.pendingPoints ?? 0),
      released,
      countsAsCheckIn: true,
      message: `Harvest verified. ${released} points released for a completed cycle.`,
    };
  }

  // A tending photo between check-ins is still verified and still filed, it
  // simply does not advance the cycle. Saying so plainly avoids the sense that
  // the app quietly ignored it.
  if (!checkInDue(plant, now)) {
    return {
      kind: "early",
      pendingDelta: 0,
      released: 0,
      countsAsCheckIn: false,
      message: `Logged. ${checkInLabel(plant, now)} for this plant to earn its next ${CHECK_IN_PENDING} points.`,
      nextCheckInAt: nextCheckInAt(plant),
    };
  }

  return {
    kind: "checkin",
    pendingDelta: CHECK_IN_PENDING,
    released: 0,
    countsAsCheckIn: true,
    message: `Check-in counted. ${CHECK_IN_PENDING} points held until you harvest this plant.`,
    nextCheckInAt: now + CHECK_INTERVAL_MS,
  };
}

const CHECK_INTERVAL_MS = CHECK_IN_INTERVAL_DAYS * DAY;

/**
 * Weekly streak, replacing the old daily multiplier.
 *
 * The multiplier scaled every award, so a long streak inflated everything at
 * once. This pays a flat amount per unbroken week and stops at four, which
 * rewards the habit without becoming the main source of points.
 */
export function weeklyStreakPoints(weeks: number): number {
  return Math.min(weeks, MAX_STREAK_WEEKS) * WEEKLY_STREAK_POINTS;
}

/** Consecutive weeks in which at least one verified capture was filed. */
export function streakWeeks(history: Pick<Verification, "createdAt" | "outcome">[]): number {
  const weeks = new Set(
    history
      .filter((v) => v.outcome !== "rejected")
      .map((v) => Math.floor(v.createdAt / (7 * DAY))),
  );
  if (weeks.size === 0) return 0;

  const thisWeek = Math.floor(Date.now() / (7 * DAY));
  let n = 0;
  // Allow the current week to be still in progress by starting from last week
  // if nothing has been filed yet this week.
  let cursor = weeks.has(thisWeek) ? thisWeek : thisWeek - 1;
  while (weeks.has(cursor)) {
    n++;
    cursor--;
  }
  return n;
}

/** Total still held across every open cycle. */
export function totalPending(plants: Plant[]): number {
  return plants.reduce((sum, p) => sum + (p.pendingPoints ?? 0), 0);
}
