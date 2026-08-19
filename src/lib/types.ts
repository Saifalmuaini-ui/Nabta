import type { AiAdvice, AiDiagnosis, AiYield, Bilingual } from "./ai/contract";

export type Emirate =
  | "Sharjah"
  | "Dubai"
  | "Abu Dhabi"
  | "Ajman"
  | "Ras Al Khaimah"
  | "Fujairah"
  | "Umm Al Quwain";

export const EMIRATES: Emirate[] = [
  "Sharjah",
  "Dubai",
  "Abu Dhabi",
  "Ajman",
  "Ras Al Khaimah",
  "Fujairah",
  "Umm Al Quwain",
];

/**
 * Districts and communities. This is the level people actually compete at,
 * you know the neighbours in Al Zahia; you do not know "Sharjah".
 */
export interface Area {
  name: string;
  arabic: string;
  emirate: Emirate;
}

export const AREAS: Area[] = [
  // Sharjah
  { name: "Aljada", arabic: "الجادة", emirate: "Sharjah" },
  { name: "Al Zahia", arabic: "الزاهية", emirate: "Sharjah" },
  { name: "Al Tarfa", arabic: "الطرفة", emirate: "Sharjah" },
  { name: "Muwaileh", arabic: "مويلح", emirate: "Sharjah" },
  { name: "Al Majaz", arabic: "المجاز", emirate: "Sharjah" },
  { name: "Al Rahmaniya", arabic: "الرحمانية", emirate: "Sharjah" },
  { name: "Tilal City", arabic: "مدينة تلال", emirate: "Sharjah" },
  { name: "Al Khan", arabic: "الخان", emirate: "Sharjah" },
  // Dubai
  { name: "Al Barsha", arabic: "البرشاء", emirate: "Dubai" },
  { name: "Mirdif", arabic: "مردف", emirate: "Dubai" },
  { name: "Dubai Hills", arabic: "دبي هيلز", emirate: "Dubai" },
  { name: "Arabian Ranches", arabic: "المرابع العربية", emirate: "Dubai" },
  { name: "Jumeirah", arabic: "جميرا", emirate: "Dubai" },
  // Abu Dhabi
  { name: "Khalifa City", arabic: "مدينة خليفة", emirate: "Abu Dhabi" },
  { name: "Al Reem Island", arabic: "جزيرة الريم", emirate: "Abu Dhabi" },
  { name: "Yas Island", arabic: "جزيرة ياس", emirate: "Abu Dhabi" },
  { name: "Al Bateen", arabic: "البطين", emirate: "Abu Dhabi" },
  { name: "Masdar City", arabic: "مدينة مصدر", emirate: "Abu Dhabi" },
  // Ajman
  { name: "Al Nuaimia", arabic: "النعيمية", emirate: "Ajman" },
  { name: "Al Rashidiya", arabic: "الراشدية", emirate: "Ajman" },
  { name: "Al Zahra", arabic: "الزهراء", emirate: "Ajman" },
  // Ras Al Khaimah
  { name: "Al Hamra", arabic: "الحمراء", emirate: "Ras Al Khaimah" },
  { name: "Digdaga", arabic: "دقداقة", emirate: "Ras Al Khaimah" },
  { name: "Al Nakheel", arabic: "النخيل", emirate: "Ras Al Khaimah" },
  // Fujairah
  { name: "Dibba", arabic: "دبا", emirate: "Fujairah" },
  { name: "Al Faseel", arabic: "الفصيل", emirate: "Fujairah" },
  // Umm Al Quwain
  { name: "Falaj Al Mualla", arabic: "فلج المعلا", emirate: "Umm Al Quwain" },
  { name: "Al Salamah", arabic: "السلامة", emirate: "Umm Al Quwain" },
];

export function areasIn(emirate: Emirate | "all"): Area[] {
  return emirate === "all"
    ? AREAS
    : AREAS.filter((a) => a.emirate === emirate);
}

export function areaEmirate(name: string): Emirate | undefined {
  return AREAS.find((a) => a.name === name)?.emirate;
}

/** What the grower says they did. The verifier checks the photo against this. */
export type LogAction =
  | "planting"
  | "watering"
  | "harvest"
  | "compost"
  | "pruning";

export interface ActionMeta {
  id: LogAction;
  label: string;
  arabic: string;
  basePoints: number;
  /** kg CO2e sequestered/avoided, per verified log, illustrative model figures */
  co2: number;
  /** litres of water saved vs. conventional practice, per verified log */
  water: number;
  hint: string;
}

export const ACTIONS: ActionMeta[] = [
  {
    id: "planting",
    label: "New planting",
    arabic: "زراعة جديدة",
    basePoints: 60,
    co2: 2.4,
    water: 0,
    hint: "Frame the whole seedling and the soil around it.",
  },
  {
    id: "watering",
    label: "Watering / irrigation",
    arabic: "ري",
    basePoints: 15,
    co2: 0.1,
    water: 18,
    hint: "Show the drip line or the wet soil at the base.",
  },
  {
    id: "harvest",
    label: "Harvest",
    arabic: "حصاد",
    basePoints: 45,
    co2: 1.1,
    water: 6,
    hint: "Hold the produce in frame next to the plant it came from.",
  },
  {
    id: "compost",
    label: "Composting",
    arabic: "تسميد عضوي",
    basePoints: 30,
    co2: 1.8,
    water: 4,
    hint: "Capture the compost being spread, not just the bag.",
  },
  {
    id: "pruning",
    label: "Pruning / care",
    arabic: "تقليم ورعاية",
    basePoints: 20,
    co2: 0.3,
    water: 2,
    hint: "Show the plant before and the cut material together.",
  },
];

export function actionMeta(id: LogAction): ActionMeta {
  return ACTIONS.find((a) => a.id === id) ?? ACTIONS[0];
}

/**
 * A registered plant, not a photograph.
 *
 * This is the spine of the integrity model. A single photo can never prove
 * ownership, so the question is not "is this yours" but "is this the plant you
 * have been tending". Each plant gets an identity from its first capture, and
 * later captures are matched against it. A stolen photo therefore arrives as a
 * new plant on day one: no history, no streak, minimum points. To profit from
 * it a thief has to keep returning to that same plant for weeks.
 */
export interface Plant {
  id: string;
  species: string;
  speciesArabic: string;
  nickname: Bilingual;
  /**
   * Description of the container, setting and form, written by the model on
   * first capture and passed back on every later one so it can re-identify.
   * Deliberately excludes lighting and weather, which change between visits.
   */
  identity: string;
  createdAt: number;
  lastSeenAt: number;
  logCount: number;
  /** Health over time, so the log view can show a trend rather than a number. */
  history: { at: number; score: number }[];
  /** Data URL of the first capture, kept as the plant's thumbnail. */
  cover: string;
}

export type CheckStatus = "pass" | "warn" | "fail";

export interface VerificationCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface PointsLine {
  label: string;
  points: number;
}

export type VerificationOutcome = "approved" | "review" | "rejected";

export interface Verification {
  id: string;
  createdAt: number;
  action: LogAction;
  /** data URL of the captured frame, kept small so localStorage survives */
  image: string;
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

  /* Fields below are populated by the real model. They are optional because
   * seeded history and the simulated verifier predate them. */

  /** Display name for the activity, since a check in has no LogAction. */
  activityLabel?: string;
  /** Which plant this log belongs to, linking it into that plant's timeline. */
  plantId?: string;
  /** True when this capture registered a plant rather than matching one. */
  plantIsNew?: boolean;
  diagnosis?: AiDiagnosis;
  advice?: AiAdvice;
  produce?: AiYield;
  /** Lets the UI be honest about whether a real model saw this photo. */
  source?: "ai" | "simulated";
}

export type ListingKind = "sell" | "trade" | "give";

export interface Listing {
  id: string;
  kind: ListingKind;
  title: string;
  category: "Seeds" | "Seedlings" | "Produce" | "Tools" | "Compost" | "Know-how";
  description: string;
  price?: number;
  wants?: string;
  quantity: string;
  seller: string;
  emirate: Emirate;
  rating: number;
  createdAt: number;
  emoji: string;
  mine?: boolean;
}

export type RewardKind = "discount" | "supplies" | "tools" | "voucher";

export interface Reward {
  id: string;
  kind: RewardKind;
  title: string;
  partner: string;
  description: string;
  cost: number;
  emoji: string;
  stock: number;
  /** shown as a strikethrough retail value */
  value: string;
}

export interface Redemption {
  id: string;
  rewardId: string;
  title: string;
  partner: string;
  code: string;
  cost: number;
  createdAt: number;
}

export interface LeaderRow {
  id: string;
  name: string;
  area: string;
  emirate: Emirate;
  points: number;
  logs: number;
  trees: number;
  badge?: string;
}

export interface TeamRow {
  id: string;
  name: string;
  kind: "school" | "community" | "emirate";
  area: string;
  emirate: Emirate;
  points: number;
  members: number;
}

export interface Profile {
  name: string;
  area: string;
  emirate: Emirate;
  role: "grower" | "beginner";
  joinedAt: number;
}
