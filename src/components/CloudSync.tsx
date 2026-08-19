"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { supabaseBrowser } from "@/lib/supabase/client";
import { fetchSyncedIds, pullAll, pushPlant, pushScan, pushProfile } from "@/lib/cloud";

/**
 * Renders nothing. Keeps the local store and Supabase in step:
 *
 *   sign in  → pull this account's scans and plants down and merge them
 *   new scan → upload the frame, push the row
 *
 * It is deliberately a reconciler rather than a hook inside `addVerification`.
 * A scan logged with no signal, or before signing in, is not lost: it sits in
 * localStorage until the next pass notices it is missing upstream and sends it.
 */
export default function CloudSync() {
  const { user, enabled, ready: authReady } = useAuth();
  const { verifications, plants, profile, ready, mergeCloud } = useStore();

  const supabase = supabaseBrowser();
  const syncedRef = useRef<Set<string>>(new Set());
  const pulledFor = useRef<string | null>(null);
  const busy = useRef(false);

  // ── pull on sign-in ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !supabase || !authReady || !ready) return;
    if (!user) {
      pulledFor.current = null;
      syncedRef.current = new Set();
      return;
    }
    if (pulledFor.current === user.id) return;
    pulledFor.current = user.id;

    (async () => {
      const [cloud, ids] = await Promise.all([
        pullAll(supabase, user.id),
        fetchSyncedIds(supabase, user.id),
      ]);
      syncedRef.current = ids;
      if (cloud.verifications.length || cloud.plants.length) mergeCloud(cloud);

      // Keep the cloud profile in step with whatever the device knows.
      void pushProfile(supabase, user.id, {
        name: profile.name,
        area: profile.area,
        emirate: profile.emirate,
      });
    })().catch((e) => console.warn("[nabta] initial sync failed:", e));
  }, [enabled, supabase, authReady, ready, user, mergeCloud, profile.name, profile.area, profile.emirate]);

  // ── push anything not upstream yet ───────────────────────────────────────
  useEffect(() => {
    if (!enabled || !supabase || !user || !ready) return;
    if (pulledFor.current !== user.id) return; // wait for the pull to settle
    if (busy.current) return;

    const pending = verifications.filter(
      (v) => !syncedRef.current.has(v.id) && !v.id.startsWith("seed-"),
    );
    if (pending.length === 0) return;

    busy.current = true;
    (async () => {
      // Oldest first, so a plant exists before the scans that point at it.
      for (const v of [...pending].reverse()) {
        let plantUuid: string | null = null;

        if (v.plantId) {
          const plant = plants.find((p) => p.id === v.plantId);
          if (plant) plantUuid = await pushPlant(supabase, user.id, plant);
        }

        const ok = await pushScan(supabase, user.id, v, plantUuid, {
          emirate: profile.emirate,
          area: profile.area,
        });
        if (ok) syncedRef.current.add(v.id);
      }
    })()
      .catch((e) => console.warn("[nabta] push failed:", e))
      .finally(() => {
        busy.current = false;
      });
  }, [enabled, supabase, user, ready, verifications, plants, profile.emirate, profile.area]);

  return null;
}
