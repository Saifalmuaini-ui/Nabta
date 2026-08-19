"use client";

import { useEffect, useState } from "react";
import { Gift, ShoppingBasket } from "lucide-react";
import { MarketSection } from "@/components/MarketSection";
import { RewardsSection } from "@/components/RewardsSection";
import { cx } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

type View = "market" | "rewards";

/**
 * Market and rewards live under one tab.
 *
 * They were separate tabs, which split a single idea in two: points come out
 * of verified work and go back into growing, either by trading with another
 * grower or by spending them with a partner. Putting them side by side also
 * frees a slot in the bottom bar, which only holds four comfortably.
 *
 * Each section keeps its own header, so the title, the subtitle and the action
 * in the corner all change with the sub tab. The balance chip belongs to
 * rewards, the new listing button belongs to the market.
 */
export default function MarketPage() {
  const [view, setView] = useState<View>("market");
  const { t } = useI18n();

  // The points chip in the header deep links straight to the rewards side.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("view");
    if (wanted === "rewards") setView("rewards");
  }, []);

  const tabs: { id: View; label: string; hint: string; icon: typeof Gift }[] = [
    {
      id: "market",
      label: t("market.tabMarket"),
      hint: t("market.tabMarketHint"),
      icon: ShoppingBasket,
    },
    {
      id: "rewards",
      label: t("market.tabRewards"),
      hint: t("market.tabRewardsHint"),
      icon: Gift,
    },
  ];

  return (
    <div className="pb-4">
      <div
        role="tablist"
        aria-label={t("market.tablist")}
        className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-sand-200 bg-white p-2"
      >
        {tabs.map((tab) => {
          const active = view === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              onClick={() => {
                setView(tab.id);
                // Keep the address bar honest without adding a history entry
                // for every tab press.
                const url = new URL(window.location.href);
                if (tab.id === "rewards") url.searchParams.set("view", "rewards");
                else url.searchParams.delete("view");
                window.history.replaceState(null, "", url);
              }}
              className={cx(
                "flex items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palm-500",
                active
                  ? "bg-palm-600 text-white"
                  : "text-ink-soft hover:bg-sand-50",
              )}
            >
              <tab.icon size={17} className="shrink-0" />
              <span className="text-start leading-tight">
                <span className="block">{tab.label}</span>
                <span
                  className={cx(
                    "hidden text-[11px] font-normal sm:block",
                    active ? "text-palm-100" : "text-ink-faint",
                  )}
                >
                  {tab.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {view === "market" ? <MarketSection /> : <RewardsSection />}
    </div>
  );
}
