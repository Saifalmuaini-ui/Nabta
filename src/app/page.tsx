"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Camera,
  Droplets,
  Flame,
  Landmark,
  Leaf,
  Sprout,
} from "lucide-react";
import { Card } from "@/components/ui";
import AlertsFeed from "@/components/AlertsFeed";
import { useStore } from "@/lib/store";
import { COMMUNITY_IMPACT, REWARDS, SEED_LEADERS } from "@/lib/data";
import { compact, kg, litres, num } from "@/lib/format";

export default function HomePage() {
  const { profile, points, lifetimePoints, streak, totals, ready } = useStore();

  const nextReward =
    [...REWARDS].sort((a, b) => a.cost - b.cost).find((r) => r.cost > points) ?? REWARDS[0];

  const rank = SEED_LEADERS.filter((l) => l.points > lifetimePoints).length + 1;
  const toGo = Math.max(0, nextReward.cost - points);
  const progress = Math.min(100, (points / nextReward.cost) * 100);

  return (
    <div className="space-y-8">
      {/*
        Restrained on purpose. A saturated hero block with a greeting, three
        statistics, a bar and two buttons reads as a game; a quiet header with
        one number and one action reads as a tool. Same information, less noise.
      */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-faint">
            {profile.emirate} · {profile.role === "grower" ? "Grower" : "Beginner"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            Ahlan, {profile.name}
          </h1>
        </div>
        <Link
          href="/verify"
          className="flex items-center gap-2 rounded-xl bg-palm-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-palm-700"
        >
          <Camera size={16} /> Log today&apos;s work
        </Link>
      </header>

      {/* ── balance and progress, one card ── */}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-faint">Points balance</p>
            <p className="tnum mt-1 text-3xl font-semibold leading-none text-ink">
              {ready ? num(points) : "—"}
            </p>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-end">
              <p className="text-xs uppercase tracking-wide text-ink-faint">Streak</p>
              <p className="tnum mt-1 flex items-center justify-end gap-1.5 text-lg font-semibold text-ink">
                <Flame size={15} className="text-gold-500" />
                {streak}d
              </p>
            </div>
            <div className="text-end">
              <p className="text-xs uppercase tracking-wide text-ink-faint">National rank</p>
              <Link
                href="/leaderboard"
                className="tnum mt-1 block text-lg font-semibold text-ink transition hover:text-palm-600"
              >
                #{rank}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-sand-200 pt-4">
          <div className="mb-2 flex items-baseline justify-between text-xs">
            <span className="text-ink-soft">
              {toGo > 0 ? `${num(toGo)} points to ` : "Ready to claim "}
              <span className="font-medium text-ink">{nextReward.title}</span>
            </span>
            <span className="tnum text-ink-faint">
              {num(points)} / {num(nextReward.cost)}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-sand-100">
            <div
              className="h-full rounded-full bg-palm-500 transition-[width] duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </Card>

      <AlertsFeed />

      {/* ── your record ── */}
      <section>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Verified logs" value={num(totals.logs)} icon={<Camera size={14} />} />
          <Metric label="Plants started" value={num(totals.trees)} icon={<Sprout size={14} />} />
          <Metric label="Water saved" value={litres(totals.water)} icon={<Droplets size={14} />} />
          <Metric label="CO₂ counted" value={kg(totals.co2)} icon={<Leaf size={14} />} />
        </div>
      </section>

      {/* ── entry points ── */}
      <section className="grid gap-3 md:grid-cols-2">
        <EntryCard
          href="/learn"
          icon={<BookOpen size={17} />}
          title="Never planted anything?"
          body="Guided paths built for this climate, from three containers on a balcony to a full winter season."
          cta="Start here"
        />
        <EntryCard
          href="/gov"
          icon={<Landmark size={17} />}
          title="Government support"
          body="Permits, irrigation subsidies, native saplings and agronomist visits, tied to your verified record."
          cta="Open the dashboard"
        />
      </section>

      {/* ── national context, deliberately quiet ── */}
      <section className="border-t border-sand-200 pt-5">
        <p className="mb-3 text-xs uppercase tracking-wide text-ink-faint">
          Across the UAE · demo figures
        </p>
        <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          {[
            ["Growers", compact(COMMUNITY_IMPACT.growers)],
            ["Verified logs", compact(COMMUNITY_IMPACT.logs)],
            ["Plants started", compact(COMMUNITY_IMPACT.trees)],
            ["Water saved", litres(COMMUNITY_IMPACT.waterSaved)],
            ["CO₂ counted", `${compact(COMMUNITY_IMPACT.co2)} kg`],
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline gap-2">
              <dt className="text-ink-faint">{label}</dt>
              <dd className="tnum font-semibold text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-ink-faint">
        {icon} {label}
      </p>
      <p className="tnum mt-1.5 text-xl font-semibold text-ink">{value}</p>
    </Card>
  );
}

function EntryCard({
  href,
  icon,
  title,
  body,
  cta,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <Link href={href} className="group">
      <Card className="flex h-full items-start gap-4 p-5 transition group-hover:border-palm-200">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-palm-50 text-palm-600">
          {icon}
        </span>
        <div>
          <p className="font-medium text-ink">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{body}</p>
          <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-palm-600">
            {cta} <ArrowRight size={14} />
          </span>
        </div>
      </Card>
    </Link>
  );
}
