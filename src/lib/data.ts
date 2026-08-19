import type {
  Emirate,
  LeaderRow,
  Listing,
  Reward,
  TeamRow,
} from "./types";

/**
 * Everything in this file is demo seed data for the prototype.
 * Partner brands and government programme details are illustrative
 * placeholders, not real offers.
 */

const DAY = 86_400_000;
const now = Date.now();

export const SPECIES = [
  { en: "Cherry tomato", ar: "طماطم كرزية", emoji: "🍅" },
  { en: "Rocket (jarjeer)", ar: "جرجير", emoji: "🥬" },
  { en: "Mint (na'na)", ar: "نعناع", emoji: "🌿" },
  { en: "Date palm offshoot", ar: "فسيلة نخيل", emoji: "🌴" },
  { en: "Ghaf sapling", ar: "شجرة الغاف", emoji: "🌳" },
  { en: "Okra (bamia)", ar: "بامية", emoji: "🌱" },
  { en: "Cucumber", ar: "خيار", emoji: "🥒" },
  { en: "Basil", ar: "ريحان", emoji: "🌿" },
  { en: "Moringa", ar: "مورينجا", emoji: "🌾" },
  { en: "Chilli pepper", ar: "فلفل حار", emoji: "🌶️" },
  { en: "Eggplant", ar: "باذنجان", emoji: "🍆" },
  { en: "Lemon tree", ar: "شجرة ليمون", emoji: "🍋" },
];

export const SEED_LEADERS: LeaderRow[] = [
  { id: "l1", name: "Fatima Al Suwaidi", area: "Al Zahia", emirate: "Sharjah", points: 8420, logs: 213, trees: 41, badge: "Ghaf Guardian" },
  { id: "l2", name: "Rashid Al Nuaimi", area: "Al Nuaimia", emirate: "Ajman", points: 7980, logs: 198, trees: 36, badge: "Water Saver" },
  { id: "l3", name: "Priya Menon", area: "Al Barsha", emirate: "Dubai", points: 7615, logs: 224, trees: 22, badge: "Rooftop Pioneer" },
  { id: "l4", name: "Khalid Al Mazrouei", area: "Khalifa City", emirate: "Abu Dhabi", points: 7190, logs: 176, trees: 58, badge: "Palm Keeper" },
  { id: "l5", name: "Aisha Al Zaabi", area: "Muwaileh", emirate: "Sharjah", points: 6870, logs: 191, trees: 29 },
  { id: "l6", name: "Yusuf Rahman", area: "Aljada", emirate: "Sharjah", points: 6240, logs: 165, trees: 19 },
  { id: "l7", name: "Noura Al Shamsi", area: "Digdaga", emirate: "Ras Al Khaimah", points: 5980, logs: 158, trees: 33 },
  { id: "l8", name: "Daniel Okoye", area: "Mirdif", emirate: "Dubai", points: 5510, logs: 149, trees: 12 },
  { id: "l9", name: "Mariam Al Hosani", area: "Dibba", emirate: "Fujairah", points: 5240, logs: 141, trees: 27 },
  { id: "l10", name: "Omar Haddad", area: "Al Bateen", emirate: "Abu Dhabi", points: 4990, logs: 133, trees: 15 },
  { id: "l11", name: "Layla Al Ali", area: "Falaj Al Mualla", emirate: "Umm Al Quwain", points: 4610, logs: 128, trees: 21 },
  { id: "l12", name: "Sanjay Iyer", area: "Dubai Hills", emirate: "Dubai", points: 4330, logs: 121, trees: 9 },
  { id: "l13", name: "Hessa Al Ketbi", area: "Al Tarfa", emirate: "Sharjah", points: 4120, logs: 117, trees: 24 },
  { id: "l14", name: "Amina Yusuf", area: "Al Rashidiya", emirate: "Ajman", points: 3870, logs: 104, trees: 14 },
  { id: "l15", name: "Tariq Al Balushi", area: "Al Faseel", emirate: "Fujairah", points: 3540, logs: 98, trees: 18 },
  { id: "l16", name: "Salem Al Marri", area: "Aljada", emirate: "Sharjah", points: 3310, logs: 92, trees: 16 },
  { id: "l17", name: "Reem Al Suwaidi", area: "Al Zahia", emirate: "Sharjah", points: 3080, logs: 88, trees: 22 },
  { id: "l18", name: "Grace Mutua", area: "Al Tarfa", emirate: "Sharjah", points: 2940, logs: 81, trees: 11 },
  { id: "l19", name: "Ahmed Al Blooshi", area: "Muwaileh", emirate: "Sharjah", points: 2760, logs: 76, trees: 13 },
  { id: "l20", name: "Zainab Haider", area: "Al Rahmaniya", emirate: "Sharjah", points: 2520, logs: 69, trees: 17 },
];

export const SEED_TEAMS: TeamRow[] = [
  { id: "t1", name: "Al Qasimia School Green Club", kind: "school", area: "Al Majaz", emirate: "Sharjah", points: 41_220, members: 86 },
  { id: "t2", name: "Muwaileh Community Garden", kind: "community", area: "Muwaileh", emirate: "Sharjah", points: 38_640, members: 74 },
  { id: "t3", name: "Aljada Residents' Grow Club", kind: "community", area: "Aljada", emirate: "Sharjah", points: 36_500, members: 79 },
  { id: "t4", name: "Al Barsha Rooftop Collective", kind: "community", area: "Al Barsha", emirate: "Dubai", points: 34_180, members: 61 },
  { id: "t5", name: "Khalifa City Growers", kind: "community", area: "Khalifa City", emirate: "Abu Dhabi", points: 31_950, members: 68 },
  { id: "t6", name: "Al Zahia Family Plots", kind: "community", area: "Al Zahia", emirate: "Sharjah", points: 29_800, members: 63 },
  { id: "t7", name: "Al Nuaimia Secondary Eco Team", kind: "school", area: "Al Nuaimia", emirate: "Ajman", points: 27_400, members: 52 },
  { id: "t8", name: "Digdaga Farm Youth", kind: "community", area: "Digdaga", emirate: "Ras Al Khaimah", points: 24_870, members: 44 },
  { id: "t9", name: "Al Tarfa School Garden", kind: "school", area: "Al Tarfa", emirate: "Sharjah", points: 22_140, members: 48 },
  { id: "t10", name: "Fujairah Coastal Planters", kind: "community", area: "Dibba", emirate: "Fujairah", points: 19_310, members: 37 },
  { id: "t11", name: "Falaj Al Mualla Date Club", kind: "community", area: "Falaj Al Mualla", emirate: "Umm Al Quwain", points: 14_760, members: 29 },
];

export const EMIRATE_TOTALS: { emirate: Emirate; points: number; growers: number }[] = [
  { emirate: "Sharjah", points: 186_400, growers: 3120 },
  { emirate: "Dubai", points: 171_900, growers: 3480 },
  { emirate: "Abu Dhabi", points: 164_300, growers: 2960 },
  { emirate: "Ajman", points: 78_200, growers: 1140 },
  { emirate: "Ras Al Khaimah", points: 71_500, growers: 980 },
  { emirate: "Fujairah", points: 52_800, growers: 720 },
  { emirate: "Umm Al Quwain", points: 34_100, growers: 460 },
];

/**
 * Neighbourhood standings, the board people check first, because these are
 * the streets they actually live on.
 */
export const AREA_TOTALS: {
  area: string;
  emirate: Emirate;
  points: number;
  growers: number;
}[] = [
  { area: "Aljada", emirate: "Sharjah", points: 42_310, growers: 486 },
  { area: "Al Zahia", emirate: "Sharjah", points: 39_870, growers: 441 },
  { area: "Muwaileh", emirate: "Sharjah", points: 37_240, growers: 512 },
  { area: "Khalifa City", emirate: "Abu Dhabi", points: 34_960, growers: 468 },
  { area: "Al Barsha", emirate: "Dubai", points: 33_180, growers: 505 },
  { area: "Al Tarfa", emirate: "Sharjah", points: 28_540, growers: 349 },
  { area: "Dubai Hills", emirate: "Dubai", points: 27_910, growers: 402 },
  { area: "Al Rahmaniya", emirate: "Sharjah", points: 24_680, growers: 318 },
  { area: "Mirdif", emirate: "Dubai", points: 23_450, growers: 377 },
  { area: "Al Nuaimia", emirate: "Ajman", points: 21_760, growers: 296 },
  { area: "Al Majaz", emirate: "Sharjah", points: 20_930, growers: 341 },
  { area: "Yas Island", emirate: "Abu Dhabi", points: 19_840, growers: 274 },
  { area: "Digdaga", emirate: "Ras Al Khaimah", points: 18_320, growers: 231 },
  { area: "Tilal City", emirate: "Sharjah", points: 16_470, growers: 208 },
  { area: "Al Bateen", emirate: "Abu Dhabi", points: 15_890, growers: 245 },
  { area: "Arabian Ranches", emirate: "Dubai", points: 14_620, growers: 219 },
  { area: "Al Rashidiya", emirate: "Ajman", points: 13_540, growers: 196 },
  { area: "Dibba", emirate: "Fujairah", points: 12_180, growers: 174 },
  { area: "Al Khan", emirate: "Sharjah", points: 11_460, growers: 187 },
  { area: "Al Hamra", emirate: "Ras Al Khaimah", points: 10_390, growers: 148 },
  { area: "Masdar City", emirate: "Abu Dhabi", points: 9_740, growers: 132 },
  { area: "Falaj Al Mualla", emirate: "Umm Al Quwain", points: 8_260, growers: 119 },
  { area: "Al Faseel", emirate: "Fujairah", points: 7_180, growers: 104 },
  { area: "Al Zahra", emirate: "Ajman", points: 6_540, growers: 97 },
];

export const SEED_LISTINGS: Listing[] = [
  {
    id: "m1",
    kind: "sell",
    title: "Heirloom cherry tomato seedlings",
    category: "Seedlings",
    description:
      "Grown from seed saved over three seasons in Sharjah, already hardened off for outdoor beds. Handover in Muwaileh or Al Nahda.",
    price: 12,
    quantity: "24 available",
    seller: "Aisha Al Zaabi",
    emirate: "Sharjah",
    rating: 4.9,
    createdAt: now - 2 * DAY,
    emoji: "🍅",
  },
  {
    id: "m2",
    kind: "trade",
    title: "Date palm offshoots (Khalas)",
    category: "Seedlings",
    description:
      "Four healthy offshoots separated this month. Looking to swap for citrus saplings or a working drip timer.",
    wants: "Citrus saplings or drip timer",
    quantity: "4 offshoots",
    seller: "Khalid Al Mazrouei",
    emirate: "Abu Dhabi",
    rating: 5,
    createdAt: now - 4 * DAY,
    emoji: "🌴",
  },
  {
    id: "m3",
    kind: "sell",
    title: "Home-made compost, sieved",
    category: "Compost",
    description:
      "Kitchen and garden waste, turned for 14 weeks. Sieved fine enough for seed trays. Bring your own sacks.",
    price: 25,
    quantity: "8 sacks (10kg)",
    seller: "Muwaileh Community Garden",
    emirate: "Sharjah",
    rating: 4.8,
    createdAt: now - 1 * DAY,
    emoji: "🪴",
  },
  {
    id: "m4",
    kind: "give",
    title: "Surplus rocket & mint, free to collect",
    category: "Produce",
    description:
      "Over-planted again. Cut fresh on collection day. First come, first served, please bring a container.",
    quantity: "About 3kg",
    seller: "Priya Menon",
    emirate: "Dubai",
    rating: 4.7,
    createdAt: now - 6 * 3600_000,
    emoji: "🥬",
  },
  {
    id: "m5",
    kind: "sell",
    title: "Drip irrigation kit, 40 emitters",
    category: "Tools",
    description:
      "Bought two, used one. Includes pressure regulator, 30m of 16mm line and a battery timer. Cuts my water use by about a third.",
    price: 180,
    quantity: "1 kit",
    seller: "Rashid Al Nuaimi",
    emirate: "Ajman",
    rating: 5,
    createdAt: now - 3 * DAY,
    emoji: "💧",
  },
  {
    id: "m6",
    kind: "sell",
    title: "Ghaf seeds, locally collected",
    category: "Seeds",
    description:
      "Collected from mature trees near Al Dhaid and scarified ready to sow. Germination has been strong at about 8 in 10.",
    price: 30,
    quantity: "12 packs of 25",
    seller: "Fatima Al Suwaidi",
    emirate: "Sharjah",
    rating: 4.9,
    createdAt: now - 5 * DAY,
    emoji: "🌳",
  },
  {
    id: "m7",
    kind: "trade",
    title: "Okra seed for cucumber seed",
    category: "Seeds",
    description:
      "Heat-tolerant local okra strain that carried straight through last summer. Happy to split any quantity.",
    wants: "Cucumber or squash seed",
    quantity: "6 packs",
    seller: "Noura Al Shamsi",
    emirate: "Ras Al Khaimah",
    rating: 4.6,
    createdAt: now - 8 * DAY,
    emoji: "🌱",
  },
  {
    id: "m8",
    kind: "sell",
    title: "Weekend workshop: soil for hot climates",
    category: "Know-how",
    description:
      "Three hours on site covering sandy-soil amendment, mulching and salinity. Small groups, ten people maximum.",
    price: 75,
    quantity: "10 seats",
    seller: "Digdaga Farm Youth",
    emirate: "Ras Al Khaimah",
    rating: 4.9,
    createdAt: now - 10 * DAY,
    emoji: "🎓",
  },
];

export const REWARDS: Reward[] = [
  {
    id: "r1",
    kind: "discount",
    title: "20% off any seed order",
    partner: "Nakhla Agri Supply",
    description: "Applies to the full seed catalogue, including the heat-tolerant range. One use per grower per month.",
    cost: 400,
    emoji: "🎟️",
    stock: 240,
    value: "up to AED 120",
  },
  {
    id: "r2",
    kind: "supplies",
    title: "Sustainable seed bundle",
    partner: "Nabta Seed Bank",
    description: "Eight varieties chosen for the UAE winter season, all open-pollinated so you can save seed for next year.",
    cost: 900,
    emoji: "🌾",
    stock: 68,
    value: "AED 150",
  },
  {
    id: "r3",
    kind: "tools",
    title: "Professional pruning set",
    partner: "Wadi Tools",
    description: "Bypass secateurs, folding saw and a leather holster. The set most growers here end up buying twice.",
    cost: 2200,
    emoji: "✂️",
    stock: 24,
    value: "AED 420",
  },
  {
    id: "r4",
    kind: "tools",
    title: "Drip irrigation starter kit",
    partner: "Barakah Garden Centre",
    description: "Covers roughly 20 square metres. Pairs with the water-saving challenge for a bonus 300 points.",
    cost: 2600,
    emoji: "💧",
    stock: 15,
    value: "AED 480",
  },
  {
    id: "r5",
    kind: "voucher",
    title: "AED 100 mall voucher",
    partner: "Marsa Mall",
    description: "Spend anywhere in the mall, online or in store. Valid for six months from the day you redeem.",
    cost: 1800,
    emoji: "🛍️",
    stock: 120,
    value: "AED 100",
  },
  {
    id: "r6",
    kind: "voucher",
    title: "AED 50 grocery voucher",
    partner: "Souq Al Bustan",
    description: "Redeemable across the fresh produce aisles, including the shelf stocked by growers on this platform.",
    cost: 950,
    emoji: "🧺",
    stock: 300,
    value: "AED 50",
  },
  {
    id: "r7",
    kind: "supplies",
    title: "Compost bin + starter culture",
    partner: "Barakah Garden Centre",
    description: "220-litre tumbler with an activator sachet. Turns kitchen waste into usable compost in about ten weeks.",
    cost: 1600,
    emoji: "🪣",
    stock: 40,
    value: "AED 300",
  },
  {
    id: "r8",
    kind: "discount",
    title: "Free soil test & report",
    partner: "GreenLeaf Labs",
    description: "Salinity, pH and nutrient panel with a written plan for what to add. Drop your sample at any branch.",
    cost: 700,
    emoji: "🔬",
    stock: 90,
    value: "AED 180",
  },
];

export interface Challenge {
  id: string;
  title: string;
  description: string;
  reward: number;
  progress: number;
  target: number;
  unit: string;
  endsIn: string;
  emoji: string;
}

export const CHALLENGES: Challenge[] = [
  {
    id: "c1",
    title: "Ghaf Season",
    description: "Plant and verify native ghaf saplings before the winter window closes.",
    reward: 500,
    progress: 2,
    target: 5,
    unit: "saplings",
    endsIn: "18 days",
    emoji: "🌳",
  },
  {
    id: "c2",
    title: "Water Saver",
    description: "Log irrigation on drip or sub-surface systems instead of hose watering.",
    reward: 300,
    progress: 7,
    target: 12,
    unit: "logs",
    endsIn: "9 days",
    emoji: "💧",
  },
  {
    id: "c3",
    title: "Grow a Beginner",
    description: "Mentor someone through their first verified harvest.",
    reward: 750,
    progress: 1,
    target: 2,
    unit: "beginners",
    endsIn: "26 days",
    emoji: "🤝",
  },
];

export interface CropWindow {
  crop: string;
  arabic: string;
  emoji: string;
  /** month indices 0-11 that are good for sowing */
  sow: number[];
  harvest: string;
  difficulty: "easy" | "medium" | "hard";
  note: string;
}

export const CROP_CALENDAR: CropWindow[] = [
  { crop: "Rocket (jarjeer)", arabic: "جرجير", emoji: "🥬", sow: [9, 10, 11, 0, 1], harvest: "25,35 days", difficulty: "easy", note: "The fastest possible win. Sow a fresh row every two weeks." },
  { crop: "Radish", arabic: "فجل", emoji: "🌰", sow: [9, 10, 11, 0, 1], harvest: "28 days", difficulty: "easy", note: "Ready before most beginners lose interest, that is the point." },
  { crop: "Mint (na'na)", arabic: "نعناع", emoji: "🌿", sow: [1, 2, 9, 10, 11], harvest: "Cut as needed", difficulty: "easy", note: "Keep it in its own pot or it takes the whole bed." },
  { crop: "Cherry tomato", arabic: "طماطم", emoji: "🍅", sow: [8, 9, 10], harvest: "Dec,Mar", difficulty: "medium", note: "Needs afternoon shade cloth once temperatures climb past 35°C." },
  { crop: "Cucumber", arabic: "خيار", emoji: "🥒", sow: [8, 9, 10, 1], harvest: "50,60 days", difficulty: "medium", note: "Trellis it. Fruit on the sand scars and spoils." },
  { crop: "Okra (bamia)", arabic: "بامية", emoji: "🌱", sow: [2, 3, 4, 7], harvest: "55,65 days", difficulty: "easy", note: "One of the few crops that genuinely enjoys a Gulf summer." },
  { crop: "Eggplant", arabic: "باذنجان", emoji: "🍆", sow: [8, 9, 10, 11], harvest: "70,85 days", difficulty: "medium", note: "Feed heavily. Hungry plants give you thin, bitter fruit." },
  { crop: "Chilli pepper", arabic: "فلفل حار", emoji: "🌶️", sow: [8, 9, 10], harvest: "75,90 days", difficulty: "medium", note: "Carries over to a second season if you shade it through July." },
  { crop: "Basil", arabic: "ريحان", emoji: "🌿", sow: [9, 10, 11, 0, 1, 2], harvest: "40 days", difficulty: "easy", note: "Pinch the flower spikes off or the leaves turn hard." },
  { crop: "Ghaf tree", arabic: "شجرة الغاف", emoji: "🌳", sow: [10, 11, 0, 1], harvest: "Lifetime", difficulty: "medium", note: "The national tree. Deep taproot, water hard for year one, then barely at all." },
  { crop: "Moringa", arabic: "مورينجا", emoji: "🌾", sow: [2, 3, 4, 8], harvest: "Leaves in 60 days", difficulty: "easy", note: "Drought-hardy and fast. Cut it back to keep the leaves within reach." },
  { crop: "Date palm", arabic: "نخيل", emoji: "🌴", sow: [2, 3, 8, 9], harvest: "Year 4+", difficulty: "hard", note: "Plant offshoots, not seed, if you want fruit that matches the parent." },
];

export interface LearnPath {
  id: string;
  title: string;
  arabic: string;
  duration: string;
  level: "Start here" | "Next step" | "Going further";
  emoji: string;
  blurb: string;
  steps: string[];
  reward: number;
}

export const LEARN_PATHS: LearnPath[] = [
  {
    id: "p1",
    title: "Your first four weeks on a balcony",
    arabic: "أول أربعة أسابيع",
    duration: "4 weeks",
    level: "Start here",
    emoji: "🪴",
    blurb:
      "No garden, no tools, no experience. Three containers on a balcony and something you can actually eat by the end of the month.",
    steps: [
      "Pick the sunniest two metres you have and note how many hours of direct light it really gets",
      "Set up three containers with a sand, compost and coco-peat mix",
      "Sow rocket, radish and mint, all fast, all forgiving",
      "Water at sunrise, check the top 2cm of soil before every watering",
      "Log your first verified photo and claim the beginner bonus",
      "Harvest, then re-sow the same containers the same week",
    ],
    reward: 250,
  },
  {
    id: "p2",
    title: "A villa garden through one winter season",
    arabic: "موسم شتوي كامل",
    duration: "1 season",
    level: "Next step",
    emoji: "🏡",
    blurb:
      "The October-to-April window is when almost everything grows here. This plans the whole run, bed by bed.",
    steps: [
      "Test your soil for salinity before you spend anything on plants",
      "Build raised beds and fill them 40% compost by volume",
      "Lay drip line before you plant, never after",
      "Stagger your sowing across three dates so the harvest does not arrive all at once",
      "Mulch every exposed centimetre of soil",
      "Plan the summer shut-down: what stays, what gets shaded, what gets pulled",
    ],
    reward: 600,
  },
  {
    id: "p3",
    title: "Native trees and the ghaf",
    arabic: "الأشجار المحلية والغاف",
    duration: "Ongoing",
    level: "Next step",
    emoji: "🌳",
    blurb:
      "Native species survive on a fraction of the water and hold the soil down. The highest-value planting you can do here.",
    steps: [
      "Learn to tell ghaf, samr and sidr apart on sight",
      "Collect and scarify seed in the right month",
      "Germinate in deep pots, the taproot goes down before anything appears above",
      "Plant out between November and February only",
      "Water deeply for the first twelve months, then step right back",
      "Register the tree so it counts toward the national canopy tally",
    ],
    reward: 800,
  },
  {
    id: "p4",
    title: "Growing without soil",
    arabic: "الزراعة المائية",
    duration: "6 weeks",
    level: "Going further",
    emoji: "💧",
    blurb:
      "Hydroponics uses up to 90% less water than open field. Build a working system from hardware-store parts.",
    steps: [
      "Understand the trade: more water saved, more attention required",
      "Build a Kratky jar system for under AED 100",
      "Learn to read EC and pH and correct them",
      "Move up to a recirculating NFT channel",
      "Run leafy greens continuously through the summer",
      "Cost it honestly against your water bill before scaling up",
    ],
    reward: 700,
  },
  {
    id: "p5",
    title: "From garden to market",
    arabic: "من الحديقة إلى السوق",
    duration: "Ongoing",
    level: "Going further",
    emoji: "🧺",
    blurb:
      "You are growing more than you can eat. Turn the surplus into income through the marketplace and local buyers.",
    steps: [
      "Work out your real cost per kilogram, water included",
      "Learn what a food-handling permit requires and when you need one",
      "Photograph and list produce so it actually sells",
      "Price against the souq, not against the supermarket",
      "Build repeat buyers through consistent weekly quantities",
      "Apply for a smallholder supplier slot with a retail partner",
    ],
    reward: 900,
  },
];

export interface GovService {
  id: string;
  title: string;
  entity: string;
  category: "Permit" | "Subsidy" | "Advisory" | "Programme" | "Data";
  description: string;
  status: "Open" | "Seasonal" | "Always on";
  action: string;
  emoji: string;
}

export const GOV_SERVICES: GovService[] = [
  {
    id: "g1",
    title: "Home farm registration",
    entity: "Ministry of Climate Change & Environment",
    category: "Permit",
    description:
      "Register a home or community plot so verified output counts toward national production figures and unlocks supplier routes.",
    status: "Always on",
    action: "Start registration",
    emoji: "📋",
  },
  {
    id: "g2",
    title: "Drip irrigation cost share",
    entity: "Ministry of Energy & Infrastructure",
    category: "Subsidy",
    description:
      "Partial reimbursement on approved water-efficient irrigation for registered growers. Verified water-saving logs strengthen an application.",
    status: "Open",
    action: "Check eligibility",
    emoji: "💧",
  },
  {
    id: "g3",
    title: "Native tree planting grant",
    entity: "Municipality, Public Parks & Horticulture",
    category: "Programme",
    description:
      "Free ghaf, sidr and samr saplings for verified planting sites, with a site visit after the first year.",
    status: "Seasonal",
    action: "Request saplings",
    emoji: "🌳",
  },
  {
    id: "g4",
    title: "Salinity & soil advisory",
    entity: "Agricultural Extension Service",
    category: "Advisory",
    description:
      "Book an agronomist to review a soil report and give a written amendment plan for the plot.",
    status: "Always on",
    action: "Book a visit",
    emoji: "🔬",
  },
  {
    id: "g5",
    title: "Food handling permit, smallholder",
    entity: "Municipality, Food Safety",
    category: "Permit",
    description:
      "The route to selling produce beyond the doorstep. Required before any listing here can be fulfilled commercially.",
    status: "Always on",
    action: "Apply",
    emoji: "🧾",
  },
  {
    id: "g6",
    title: "Open agricultural data",
    entity: "Federal Competitiveness & Statistics Centre",
    category: "Data",
    description:
      "Anonymised, aggregated planting and yield data from this platform, published back for researchers and planners.",
    status: "Always on",
    action: "View datasets",
    emoji: "📊",
  },
];

export const STRATEGY_PILLARS = [
  {
    id: "s1",
    title: "Diversify food sources",
    detail:
      "Every registered home plot and community garden is another domestic source. The platform counts them where they were previously invisible.",
    metric: "12,860",
    metricLabel: "registered growing sites",
  },
  {
    id: "s2",
    title: "Technology-driven production",
    detail:
      "AI photo verification turns informal planting into structured, auditable production data at almost no cost per record.",
    metric: "184,300",
    metricLabel: "AI-verified activity logs",
  },
  {
    id: "s3",
    title: "Reduce food loss and waste",
    detail:
      "Surplus produce is listed, traded or given away locally instead of being thrown out at the end of a season.",
    metric: "31.4t",
    metricLabel: "surplus redirected this year",
  },
  {
    id: "s4",
    title: "Sustainable resource use",
    detail:
      "Water-efficient methods earn more points than wasteful ones, so the incentive and the national target point the same way.",
    metric: "4.2M L",
    metricLabel: "irrigation water saved",
  },
];

/** Headline numbers for the dashboard. Demo figures. */
export const COMMUNITY_IMPACT = {
  growers: 12_860,
  logs: 184_300,
  trees: 47_920,
  waterSaved: 4_180_000,
  co2: 268_400,
  surplusKg: 31_400,
};
