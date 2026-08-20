/**
 * Sanity-check the points economy against the real rules in src/lib/growth.ts.
 *
 *   node scripts/economy-check.ts
 *
 * Run this after changing any constant in growth.ts. The question it answers
 * is whether an honest grower is rewarded fairly while the shortcuts that the
 * old per-photo model paid out for now earn nothing.
 */
import {
  CHECK_IN_INTERVAL_DAYS,
  CHECK_IN_PENDING,
  HARVEST_BONUS,
  MIN_CHECK_INS_TO_RELEASE,
  evaluateCapture,
  weeklyStreakPoints,
} from "../src/lib/growth.ts";
import type { Plant } from "../src/lib/types.ts";

const DAY = 86_400_000;

function simulate(label: string, days: number, everyDays: number, harvest: boolean) {
  let plant: Plant | null = null;
  let balance = 0;
  let photos = 0;
  const t0 = Date.now();

  for (let d = 0; d <= days; d += everyDays) {
    const now = t0 + d * DAY;
    const isHarvest = harvest && d + everyDays > days;
    photos++;

    const out = evaluateCapture(
      plant,
      { action: isHarvest ? "harvest" : "watering", outcome: "approved" },
      now,
    );

    if (!plant) {
      plant = {
        id: "p", species: "x", speciesArabic: "x",
        nickname: { en: "x", ar: "x" }, identity: "x",
        createdAt: now, lastSeenAt: now, logCount: 1, history: [], cover: "",
        checkIns: 1, pendingPoints: 0, lastCheckInAt: now, cyclesCompleted: 0,
      };
      continue;
    }

    balance += out.released;
    plant.pendingPoints = Math.max(0, (plant.pendingPoints ?? 0) + out.pendingDelta);
    if (out.countsAsCheckIn) {
      plant.checkIns = (plant.checkIns ?? 0) + 1;
      plant.lastCheckInAt = now;
    }
    if (out.kind === "harvest") {
      plant.pendingPoints = 0;
      plant.checkIns = 0;
    }
  }

  console.log(
    `  ${label.padEnd(40)} photos ${String(photos).padStart(3)}` +
      `   earned ${String(balance).padStart(4)}` +
      `   held ${String(plant?.pendingPoints ?? 0).padStart(3)}`,
  );
  return balance;
}

console.log("── rules ──────────────────────────────────────────");
console.log(`  check-in interval          ${CHECK_IN_INTERVAL_DAYS} days`);
console.log(`  held per check-in          ${CHECK_IN_PENDING}`);
console.log(`  harvest bonus              ${HARVEST_BONUS}`);
console.log(`  min check-ins to release   ${MIN_CHECK_INS_TO_RELEASE}`);
console.log(`  streak bonus, 4 weeks      ${weeklyStreakPoints(4)}`);

console.log("\n── an honest grower ───────────────────────────────");
const rocket = simulate("Rocket, 30 days, weekly, harvested", 30, 7, true);
const tomato = simulate("Tomato, 90 days, weekly, harvested", 90, 7, true);
simulate("Tends weekly, never harvests (60d)", 60, 7, false);

console.log("\n── what the old model paid for ────────────────────");
simulate("Same plant photographed daily, 30d", 30, 1, false);
simulate("Daily photos then a harvest, 30d", 30, 1, true);
simulate("Plant and harvest on day one", 1, 1, true);

console.log("\n── pacing ─────────────────────────────────────────");
const REWARD = 400;
console.log(`  cheapest reward is ${REWARD} points`);
console.log(`  ~${Math.ceil(REWARD / Math.max(rocket, 1))} rocket cycles (${Math.ceil(REWARD / Math.max(rocket, 1)) * 30} days of real growing)`);
console.log(`  ~${(REWARD / Math.max(tomato, 1)).toFixed(1)} tomato cycles`);
