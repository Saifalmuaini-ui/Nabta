"use client";

import Link from "next/link";
import { Bar, Card, Pill, SectionTitle } from "@/components/ui";
import DataIcon, { IconTile } from "@/components/DataIcon";
import { CHALLENGES } from "@/lib/data";

/**
 * Live challenges sit in Start growing: they are what a beginner does next,
 * so they belong beside the guided paths rather than on the home page.
 */
export default function LiveChallenges() {
  return (
    <section className="mb-9">
      <SectionTitle
        hint={
          <Link href="/leaderboard" className="hover:text-palm-600">
            See all →
          </Link>
        }
      >
        Live challenges
      </SectionTitle>
      <div className="grid gap-3 md:grid-cols-3">
        {CHALLENGES.map((c) => (
          <Card key={c.id} className="flex flex-col p-4">
            <div className="flex items-start justify-between gap-2">
              <IconTile emoji={c.emoji} size={18} className="h-10 w-10" />
              <Pill tone="gold">+{c.reward}</Pill>
            </div>
            <p className="mt-3 font-medium text-ink">{c.title}</p>
            <p className="mt-1 flex-1 text-sm leading-relaxed text-ink-soft">
              {c.description}
            </p>
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-xs text-ink-faint">
                <span className="tnum">
                  {c.progress} / {c.target} {c.unit}
                </span>
                <span>{c.endsIn} left</span>
              </div>
              <Bar value={c.progress} max={c.target} />
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
