"use client";

import { useCallback, useEffect, useState } from "react";
import { Bug, CloudSun, Droplets, Megaphone, Sprout, X } from "lucide-react";
import { Card, SectionTitle, cx } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { supabaseBrowser } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/format";

interface Advisory {
  id: string;
  kind: string;
  title: string;
  title_ar: string | null;
  body: string;
  body_ar: string | null;
  severity: string;
  emirate: string | null;
  areas: string[] | null;
  created_at: string;
  circular_ref: string | null;
}

const ICON: Record<string, React.ReactNode> = {
  weather: <CloudSun size={15} />,
  pest: <Bug size={15} />,
  water: <Droplets size={15} />,
  seasonal: <Sprout size={15} />,
  general: <Megaphone size={15} />,
};

/**
 * The grower's end of the channel. Alerts an officer sends in the console
 * arrive here, and opening one writes a receipt — which is what makes
 * "did the guidance land" a measured number instead of a claim.
 */
export default function AlertsFeed() {
  const { user, enabled } = useAuth();
  const { profile } = useStore();
  const supabase = supabaseBrowser();

  const [alerts, setAlerts] = useState<Advisory[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const relevant = useCallback(
    (a: Advisory) => {
      if (a.emirate && a.emirate !== profile.emirate) return false;
      if (a.areas && a.areas.length > 0 && !a.areas.includes(profile.area)) return false;
      return true;
    },
    [profile.emirate, profile.area],
  );

  const load = useCallback(async () => {
    if (!supabase || !user) return;
    const { data } = await supabase
      .from("advisories")
      .select("id, kind, title, title_ar, body, body_ar, severity, emirate, areas, created_at, circular_ref")
      .order("created_at", { ascending: false })
      .limit(20);
    setAlerts(((data as Advisory[]) ?? []).filter(relevant).slice(0, 4));
  }, [supabase, user, relevant]);

  useEffect(() => {
    void load();
  }, [load]);

  // A new alert should appear without a refresh — that is the demo moment.
  useEffect(() => {
    if (!supabase || !user) return;
    const channel = supabase
      .channel("advisories-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "advisories" }, () => {
        void load();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, user, load]);

  // Seeing it counts as opening it.
  useEffect(() => {
    if (!supabase || !user || alerts.length === 0) return;
    void supabase.from("advisory_receipts").upsert(
      alerts.map((a) => ({
        advisory_id: a.id,
        user_id: user.id,
        opened_at: new Date().toISOString(),
      })),
      { onConflict: "advisory_id,user_id" },
    );
  }, [supabase, user, alerts]);

  if (!enabled || !user) return null;
  const shown = alerts.filter((a) => !dismissed.includes(a.id));
  if (shown.length === 0) return null;

  return (
    <section>
      <SectionTitle hint="From your municipality">Alerts</SectionTitle>
      <div className="space-y-2">
        {shown.map((a) => (
          <Card
            key={a.id}
            className={cx(
              "flex items-start gap-3 p-4",
              a.severity === "urgent"
                ? "border-clay-200 bg-clay-50"
                : a.severity === "warning"
                  ? "border-gold-200 bg-gold-50"
                  : "border-palm-200 bg-palm-50",
            )}
          >
            <span
              className={cx(
                "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                a.severity === "urgent"
                  ? "bg-clay text-white"
                  : a.severity === "warning"
                    ? "bg-gold-400 text-white"
                    : "bg-palm-600 text-white",
              )}
            >
              {ICON[a.kind] ?? <Megaphone size={15} />}
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{a.title}</p>
              {a.title_ar && (
                <p className="text-xs text-ink-soft" dir="rtl">{a.title_ar}</p>
              )}
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{a.body}</p>
              {a.body_ar && (
                <p className="mt-0.5 text-xs leading-relaxed text-ink-faint" dir="rtl">
                  {a.body_ar}
                </p>
              )}
              <p className="mt-1.5 text-xs text-ink-faint">
                {timeAgo(new Date(a.created_at).getTime())}
                {a.circular_ref ? ` · ${a.circular_ref}` : ""}
              </p>
            </div>

            <button
              onClick={() => setDismissed((d) => [...d, a.id])}
              aria-label="Dismiss"
              className="shrink-0 rounded-lg p-1 text-ink-faint transition hover:text-ink"
            >
              <X size={15} />
            </button>
          </Card>
        ))}
      </div>
    </section>
  );
}
