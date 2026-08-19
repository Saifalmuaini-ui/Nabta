"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { SEED_LISTINGS } from "./data";
import type { Bilingual } from "./ai/contract";
import type {
  Listing,
  Plant,
  Profile,
  Redemption,
  Reward,
  Verification,
} from "./types";
import { streakInfo } from "./verifier";

const KEY = "nabta.state.v1";
const DAY = 86_400_000;

interface Persisted {
  profile: Profile;
  points: number;
  lifetimePoints: number;
  verifications: Verification[];
  redemptions: Redemption[];
  myListings: Listing[];
  plants: Plant[];
}

/** What the verifier hands back so the store can register or update a plant. */
export interface PlantUpsert {
  /** Set when the model matched an existing plant. */
  matchedId?: string | null;
  species: string;
  speciesArabic: string;
  nickname: Bilingual;
  identity: string;
  healthScore: number;
  cover: string;
}

/** A little history so the dashboard, streak and leaderboard are not empty on first run. */
function seedVerifications(): Verification[] {
  const base = [
    { d: 1, action: "watering" as const, species: "Cherry tomato", ar: "طماطم كرزية", pts: 17, health: 88 },
    { d: 2, action: "pruning" as const, species: "Mint (na'na)", ar: "نعناع", pts: 23, health: 91 },
    { d: 3, action: "planting" as const, species: "Ghaf sapling", ar: "شجرة الغاف", pts: 150, health: 84 },
  ];
  return base.map((b, i) => ({
    id: `seed-${i}`,
    createdAt: Date.now() - b.d * DAY - i * 3600_000,
    action: b.action,
    image: "",
    species: b.species,
    speciesArabic: b.ar,
    confidence: 0.93,
    healthScore: b.health,
    outcome: "approved" as const,
    points: b.pts,
    breakdown: [{ label: "Verified activity", points: b.pts }],
    checks: [],
    co2: b.action === "planting" ? 2.4 : 0.2,
    water: b.action === "watering" ? 18 : 2,
  }));
}

function defaultState(): Persisted {
  return {
    profile: {
      name: "Saif",
      area: "Aljada",
      emirate: "Sharjah",
      role: "grower",
      joinedAt: Date.now() - 96 * DAY,
    },
    points: 1240,
    lifetimePoints: 3860,
    verifications: seedVerifications(),
    redemptions: [],
    myListings: [],
    plants: [],
  };
}

interface StoreValue {
  ready: boolean;
  profile: Profile;
  points: number;
  lifetimePoints: number;
  verifications: Verification[];
  redemptions: Redemption[];
  listings: Listing[];
  plants: Plant[];
  streak: number;
  multiplier: number;
  totals: { logs: number; trees: number; co2: number; water: number };
  /** Returns the stored record, which carries the resolved plantId. */
  addVerification: (v: Verification, plant?: PlantUpsert) => Verification;
  redeem: (reward: Reward) => Redemption | null;
  addListing: (l: Omit<Listing, "id" | "createdAt" | "rating" | "mine">) => void;
  removeListing: (id: string) => void;
  updateProfile: (p: Partial<Profile>) => void;
  /**
   * Merge records pulled from Supabase. Union by id, newest first, so anything
   * logged offline on this device survives the merge instead of being replaced
   * by the cloud copy.
   */
  mergeCloud: (payload: { verifications: Verification[]; plants: Plant[] }) => void;
  reset: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function code(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const block = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `NBT-${block()}-${block()}`;
}

/** localStorage is ~5MB; frames add up fast. Keep the newest few with images. */
function trim(list: Verification[]): Verification[] {
  return list
    .slice(0, 40)
    .map((v, i) => (i < 8 ? v : { ...v, image: "" }));
}

/**
 * Plant records are small apart from the cover photo, and a grower can
 * accumulate plants indefinitely. Keep every plant, but only the newest dozen
 * keep a thumbnail. The identity string is what matters for re-identification
 * and it costs almost nothing to store.
 */
function trimPlants(list: Plant[]): Plant[] {
  return [...list]
    .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
    .map((p, i) => (i < 12 ? p : { ...p, cover: "" }));
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(defaultState);
  const [ready, setReady] = useState(false);

  // Load after mount so server and first client render agree.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Persisted>;
        setState((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // Corrupt or unavailable storage, carry on with defaults.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // Over quota: drop every stored frame, including plant covers, and try
      // once more. Losing thumbnails is survivable, losing the log is not.
      try {
        window.localStorage.setItem(
          KEY,
          JSON.stringify({
            ...state,
            verifications: state.verifications.map((v) => ({ ...v, image: "" })),
            plants: state.plants.map((p) => ({ ...p, cover: "" })),
          }),
        );
      } catch {
        /* give up quietly, the session still works in memory */
      }
    }
  }, [state, ready]);

  const addVerification = useCallback(
    (v: Verification, upsert?: PlantUpsert): Verification => {
      // The plant id is resolved out here rather than inside the updater. The
      // updater must stay pure, because React invokes it twice in development
      // and generating an id in there would produce two different plants.
      let plantId = upsert?.matchedId ?? undefined;
      let created: Plant | null = null;

      if (upsert && !plantId) {
        plantId = `pl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        created = {
          id: plantId,
          species: upsert.species,
          speciesArabic: upsert.speciesArabic,
          nickname: upsert.nickname,
          identity: upsert.identity,
          createdAt: v.createdAt,
          lastSeenAt: v.createdAt,
          logCount: 1,
          history: [{ at: v.createdAt, score: upsert.healthScore }],
          cover: upsert.cover,
        };
      }

      const stored: Verification = upsert
        ? { ...v, plantId, plantIsNew: Boolean(created) }
        : v;

      setState((s) => {
        const plants = created
          ? [created, ...s.plants]
          : s.plants.map((p) =>
              p.id === plantId
                ? {
                    ...p,
                    lastSeenAt: v.createdAt,
                    logCount: p.logCount + 1,
                    // Refresh the fingerprint: plants change as they grow, and
                    // a stale description makes later matching harder.
                    identity: upsert?.identity || p.identity,
                    history: [
                      ...p.history,
                      { at: v.createdAt, score: upsert?.healthScore ?? 0 },
                    ].slice(-60),
                  }
                : p,
            );

        return {
          ...s,
          plants: trimPlants(plants),
          verifications: trim([stored, ...s.verifications]),
          points: s.points + stored.points,
          lifetimePoints: s.lifetimePoints + stored.points,
        };
      });

      return stored;
    },
    [],
  );

  // Returns the voucher synchronously so the caller can show it immediately,
  // a setState updater would not have run yet.
  const redeem = useCallback(
    (reward: Reward): Redemption | null => {
      if (state.points < reward.cost) return null;
      const issued: Redemption = {
        id: `rd-${Date.now()}`,
        rewardId: reward.id,
        title: reward.title,
        partner: reward.partner,
        code: code(),
        cost: reward.cost,
        createdAt: Date.now(),
      };
      setState((s) => ({
        ...s,
        points: Math.max(0, s.points - reward.cost),
        redemptions: [issued, ...s.redemptions],
      }));
      return issued;
    },
    [state.points],
  );

  const addListing = useCallback(
    (l: Omit<Listing, "id" | "createdAt" | "rating" | "mine">) => {
      setState((s) => ({
        ...s,
        myListings: [
          {
            ...l,
            id: `my-${Date.now()}`,
            createdAt: Date.now(),
            rating: 5,
            mine: true,
          },
          ...s.myListings,
        ],
      }));
    },
    [],
  );

  const removeListing = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      myListings: s.myListings.filter((l) => l.id !== id),
    }));
  }, []);

  const updateProfile = useCallback((p: Partial<Profile>) => {
    setState((s) => ({ ...s, profile: { ...s.profile, ...p } }));
  }, []);

  const mergeCloud = useCallback(
    (payload: { verifications: Verification[]; plants: Plant[] }) => {
      setState((s) => {
        const byId = <T extends { id: string }>(local: T[], cloud: T[]): T[] => {
          const seen = new Map(cloud.map((x) => [x.id, x]));
          // Local wins on conflict: it still holds the captured frame, which
          // the cloud copy deliberately drops.
          for (const x of local) seen.set(x.id, x);
          return [...seen.values()];
        };

        const verifications = byId(s.verifications, payload.verifications).sort(
          (a, b) => b.createdAt - a.createdAt,
        );
        const plants = byId(s.plants, payload.plants).sort(
          (a, b) => b.lastSeenAt - a.lastSeenAt,
        );

        // Points are derived from the merged log, not added to, or signing in
        // on a second device would double the balance.
        const lifetime = verifications.reduce((a, v) => a + Math.max(0, v.points), 0);
        const spent = s.redemptions.reduce((a, r) => a + r.cost, 0);

        return {
          ...s,
          verifications: trim(verifications),
          plants: trimPlants(plants),
          lifetimePoints: lifetime,
          points: Math.max(0, lifetime - spent),
        };
      });
    },
    [],
  );

  const reset = useCallback(() => {
    setState(defaultState());
  }, []);

  const value = useMemo<StoreValue>(() => {
    const { streak, multiplier } = streakInfo(state.verifications);
    const approved = state.verifications.filter((v) => v.outcome !== "rejected");
    return {
      ready,
      ...state,
      listings: [...state.myListings, ...SEED_LISTINGS],
      streak,
      multiplier,
      totals: {
        logs: approved.length,
        trees: approved.filter((v) => v.action === "planting").length,
        co2: approved.reduce((a, v) => a + v.co2, 0),
        water: approved.reduce((a, v) => a + v.water, 0),
      },
      addVerification,
      redeem,
      addListing,
      removeListing,
      updateProfile,
      mergeCloud,
      reset,
    };
  }, [
    state,
    ready,
    addVerification,
    redeem,
    addListing,
    removeListing,
    updateProfile,
    mergeCloud,
    reset,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
