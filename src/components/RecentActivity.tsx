"use client";

import Link from "next/link";
import {
  Droplets,
  Leaf,
  Recycle,
  Scissors,
  ShoppingBasket,
  Sprout,
  type LucideIcon,
} from "lucide-react";
import { Card, SectionTitle, cx } from "@/components/ui";
import { useStore } from "@/lib/store";
import { timeAgo } from "@/lib/format";
import { actionMeta } from "@/lib/types";

const ICON: Record<string, LucideIcon> = {
  planting: Sprout,
  watering: Droplets,
  harvest: ShoppingBasket,
  compost: Recycle,
  pruning: Scissors,
};

/**
 * The verified log. It lives with My Plants rather than on the home page,
 * because it only means anything next to the plants it belongs to.
 */
export default function RecentActivity({ limit = 6 }: { limit?: number }) {
  const { verifications } = useStore();
  const recent = verifications.slice(0, limit);

  return (
    <section>
      <SectionTitle
        hint={
          <Link href="/verify" className="hover:text-palm-600">
            Add a log →
          </Link>
        }
      >
        Recent activity
      </SectionTitle>
      <Card className="divide-y divide-sand-200">
        {recent.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-ink-soft">
            Nothing logged yet. Your first verified photo starts the streak.
          </p>
        )}
        {recent.map((v) => (
          <div key={v.id} className="flex items-center gap-3 px-4 py-3">
            <span
              className={cx(
                "grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg",
                v.outcome === "rejected" ? "bg-clay-50 text-clay" : "bg-palm-50 text-palm-600",
              )}
            >
              {(() => { const I = ICON[v.action] ?? Leaf; return <I size={17} />; })()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                {actionMeta(v.action).label} · {v.species}
              </p>
              <p className="text-xs text-ink-faint">
                {timeAgo(v.createdAt)} ·{" "}
                {v.outcome === "approved"
                  ? "verified"
                  : v.outcome === "review"
                    ? "under review"
                    : "rejected"}
              </p>
            </div>
            <span
              className={cx(
                "tnum shrink-0 text-sm font-semibold",
                v.points > 0 ? "text-palm-600" : "text-ink-faint",
              )}
            >
              {v.points > 0 ? `+${v.points}` : "0"}
            </span>
          </div>
        ))}
      </Card>
    </section>
  );
}
