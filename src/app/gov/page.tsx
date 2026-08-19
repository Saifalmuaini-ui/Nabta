"use client";

import { useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  ChevronRight,
  Coins,
  Camera,
  Info,
  Shield,
  ShieldCheck,
  Sprout,
  Target,
  Thermometer,
} from "lucide-react";
import { Card, DemoNote, PageHeader, Pill, SectionTitle, cx } from "@/components/ui";
import { IconTile } from "@/components/DataIcon";
import { useStore } from "@/lib/store";
import { GOV_SERVICES, STRATEGY_PILLARS } from "@/lib/data";
import { num } from "@/lib/format";
import type { GovService } from "@/lib/data";

const CATEGORIES: (GovService["category"] | "all")[] = [
  "all",
  "Permit",
  "Subsidy",
  "Programme",
  "Advisory",
  "Data",
];

const ADVISORIES = [
  {
    id: "a1",
    icon: Thermometer,
    tone: "clay" as const,
    title: "Heat advisory, inland areas",
    body: "Daytime highs above 46°C expected for the next nine days. Shift irrigation to before sunrise and hold off on new transplants.",
    source: "National Centre of Meteorology",
  },
  {
    id: "a2",
    icon: AlertTriangle,
    tone: "gold" as const,
    title: "Whitefly pressure rising",
    body: "Reports up sharply on tomato and eggplant across three emirates. Inspect leaf undersides before you buy or accept seedlings.",
    source: "Agricultural Extension Service",
  },
];

export default function GovPage() {
  const { profile, totals, lifetimePoints } = useStore();
  const [category, setCategory] = useState<GovService["category"] | "all">("all");

  const services = GOV_SERVICES.filter(
    (s) => category === "all" || s.category === category,
  );

  const growerId = `ZR-${profile.emirate.slice(0, 2).toUpperCase()}-04127`;

  return (
    <div className="pb-4">
      <PageHeader
        eyebrow="Government hub"
        title="Your government dashboard"
        arabic="لوحة الخدمات الحكومية"
        subtitle="Your verified growing record, the advisories that affect you, and the services it unlocks."
      />

      {/* ── at a glance ── */}
      <section className="mb-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile icon={<Camera size={15} />} label="Verified logs" value={num(totals.logs)} tone="palm" />
          <Tile icon={<Sprout size={15} />} label="Plants recorded" value={num(totals.trees)} />
          <Tile icon={<Coins size={15} />} label="Lifetime points" value={num(lifetimePoints)} tone="gold" />
          <Tile icon={<ShieldCheck size={15} />} label="Standing" value="Good" tone="palm" />
        </div>
      </section>

      {/* ── identity strip ── */}
      <section className="mb-8">
        <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-palm-50 text-palm-600">
              <BadgeCheck size={18} />
            </span>
            <div>
              <p className="flex items-center gap-2 font-medium text-ink">
                {profile.name}
                <Pill tone="palm">Verified grower</Pill>
              </p>
              <p className="text-xs text-ink-faint">
                {profile.emirate} · home plot · registered{" "}
                {new Date(profile.joinedAt).toLocaleDateString("en-AE", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
          <div className="rounded-xl bg-sand-100 px-4 py-2 text-end">
            <p className="text-[10px] uppercase tracking-wide text-ink-faint">Grower ID</p>
            <p className="font-mono text-sm font-medium text-ink">{growerId}</p>
          </div>
        </Card>
      </section>

      {/* ── two-column body: services beside the panels that inform them ── */}
      <div className="mb-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <SectionTitle hint={`${services.length} available`}>Services</SectionTitle>

          <div className="mb-3 flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cx(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition",
                  category === c
                    ? "bg-palm-600 text-white"
                    : "border border-sand-200 bg-white text-ink-soft hover:text-ink",
                )}
              >
                {c === "all" ? "All" : `${c}s`}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {services.map((s) => (
              <Card key={s.id} className="flex items-start gap-3 p-4">
                <IconTile emoji={s.emoji} size={17} className="h-10 w-10" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium leading-snug text-ink">{s.title}</p>
                    <Pill tone={s.status === "Open" ? "palm" : s.status === "Seasonal" ? "gold" : "sky"}>
                      {s.status}
                    </Pill>
                  </div>
                  <p className="text-xs text-ink-faint">
                    {s.entity} · {s.category}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{s.description}</p>
                  <button className="mt-2.5 inline-flex items-center gap-1 text-sm font-medium text-palm-600 transition hover:text-palm-700">
                    {s.action} <ChevronRight size={14} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          {/* ── advisories ── */}
          <section>
            <SectionTitle hint="Your area">Advisories</SectionTitle>
            <div className="space-y-2">
              {ADVISORIES.map((a) => (
                <Card
                  key={a.id}
                  className={cx(
                    "flex items-start gap-3 p-4",
                    a.tone === "clay" ? "border-clay/25 bg-clay-50" : "border-gold-100 bg-gold-50",
                  )}
                >
                  <a.icon
                    size={17}
                    className={cx(
                      "mt-0.5 shrink-0",
                      a.tone === "clay" ? "text-clay" : "text-gold-600",
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{a.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">{a.body}</p>
                    <p className="mt-1.5 text-xs text-ink-faint">{a.source}</p>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* ── data governance ── */}
          <section>
            <SectionTitle>Your data</SectionTitle>
            <Card className="divide-y divide-sand-200 p-0">
              <div className="p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-ink">
                  <Shield size={15} className="text-palm-600" /> Shared with government
                </p>
                <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                  <li>Planting counts by area and species, aggregated</li>
                  <li>Anonymised yield and water-use trends</li>
                  <li>Your own record, only on services you apply to</li>
                </ul>
              </div>
              <div className="p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-ink">
                  <Shield size={15} className="text-ink-faint" /> Never shared
                </p>
                <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                  <li>Your photographs, unless you attach them to an application</li>
                  <li>Precise home coordinates, coarsened to the district</li>
                  <li>Marketplace conversations and prices</li>
                </ul>
              </div>
            </Card>
          </section>

          <Card className="flex items-start gap-2.5 border-sky-tag/20 bg-sky-tag/5 p-4">
            <Info size={15} className="mt-0.5 shrink-0 text-sky-tag" />
            <p className="text-xs leading-relaxed text-ink-soft">
              <span className="font-medium text-ink">Concept prototype.</span> The entities
              and programmes shown illustrate how the platform would connect to government
              services. They are not live offers and nothing here has been endorsed by any
              authority.
            </p>
          </Card>
        </div>
      </div>

      {/* ── strategy alignment ── */}
      <section>
        <SectionTitle hint="Demo figures">
          Alignment, UAE National Food Security Strategy 2051
        </SectionTitle>
        <Card className="overflow-hidden p-0">
          <div className="flex items-start gap-3 bg-palm-700 p-5 text-white">
            <Target size={19} className="mt-0.5 shrink-0 text-palm-200" />
            <p className="text-sm leading-relaxed text-palm-100">
              The strategy sets out to make the UAE a world leader in food security by 2051,
              through diversified sources, technology-led production, less waste and lighter
              use of water and land. A national platform for household and community growing
              contributes to all four, and, just as importantly, makes that contribution
              measurable.
            </p>
          </div>
          <ul className="divide-y divide-sand-200">
            {STRATEGY_PILLARS.map((p) => (
              <li key={p.id} className="flex flex-wrap items-start gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{p.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{p.detail}</p>
                </div>
                <div className="shrink-0 text-end">
                  <p className="tnum text-xl font-semibold text-palm-600">{p.metric}</p>
                  <p className="text-xs text-ink-faint">{p.metricLabel}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <DemoNote>
        Prototype: no data leaves this browser. Everything on this page runs locally.
      </DemoNote>
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "palm" | "gold";
}) {
  return (
    <Card className="p-4">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-ink-faint">
        {icon} {label}
      </p>
      <p
        className={cx(
          "tnum mt-1.5 text-2xl font-semibold",
          tone === "palm" ? "text-palm-600" : tone === "gold" ? "text-gold-600" : "text-ink",
        )}
      >
        {value}
      </p>
    </Card>
  );
}
