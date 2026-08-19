"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Camera, CheckCircle2, Circle, Sun, Users } from "lucide-react";
import { Bar, Card, DemoNote, PageHeader, Pill, SectionTitle, cx } from "@/components/ui";
import DataIcon, { IconTile } from "@/components/DataIcon";
import LiveChallenges from "@/components/LiveChallenges";
import { CROP_CALENDAR, LEARN_PATHS } from "@/lib/data";
import { MONTHS } from "@/lib/format";

export default function LearnPage() {
  const [openPath, setOpenPath] = useState<string | null>(LEARN_PATHS[0].id);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [month, setMonth] = useState(new Date().getMonth());

  const sowNow = CROP_CALENDAR.filter((c) => c.sow.includes(month));

  function toggle(key: string) {
    setDone((d) => ({ ...d, [key]: !d[key] }));
  }

  return (
    <div>
      <PageHeader
        eyebrow="For anyone starting out"
        title="Start growing"
        arabic="ابدأ الزراعة"
        subtitle="You do not need land, tools or experience. You need the right plant, in the right month, in a climate that punishes guesswork."
      />

      {/* ── what to sow this month ── */}
      <section className="mb-9">
        <SectionTitle
          hint={
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded-lg border border-sand-200 bg-white px-2 py-1 text-xs text-ink"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>
          }
        >
          Sow in {MONTHS[month]}
        </SectionTitle>

        {sowNow.length === 0 ? (
          <Card className="flex items-start gap-3 p-5">
            <Sun size={20} className="mt-0.5 shrink-0 text-gold-500" />
            <p className="text-sm leading-relaxed text-ink-soft">
              Nothing in the starter list wants to be sown in {MONTHS[month]}. That is normal
              here, the heat does the deciding. Spend the month building beds, mulching, and
              fixing irrigation so you are ready the day it breaks.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sowNow.map((c) => (
              <Card key={c.crop} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <IconTile emoji={c.emoji} size={18} className="h-10 w-10" />
                  <Pill
                    tone={
                      c.difficulty === "easy"
                        ? "palm"
                        : c.difficulty === "medium"
                          ? "gold"
                          : "clay"
                    }
                  >
                    {c.difficulty}
                  </Pill>
                </div>
                <p className="mt-2 font-medium text-ink">{c.crop}</p>
                <p className="text-xs text-ink-faint" dir="rtl">
                  {c.arabic}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{c.note}</p>
                <p className="mt-2 text-xs font-medium text-palm-600">
                  Ready in {c.harvest.toLowerCase()}
                </p>
              </Card>
            ))}
          </div>
        )}

        {sowNow.length > 0 && (
          <p className="mt-3 text-xs text-ink-faint">
            {sowNow.length} of {CROP_CALENDAR.length} starter crops suit {MONTHS[month]}.
          </p>
        )}
      </section>

      {/* ── learning paths ── */}
      <LiveChallenges />

      <section className="mb-9">
        <SectionTitle hint="Finish a path to earn its bonus">Guided paths</SectionTitle>
        <div className="space-y-3">
          {LEARN_PATHS.map((p) => {
            const open = openPath === p.id;
            const completed = p.steps.filter((_, i) => done[`${p.id}-${i}`]).length;
            return (
              <Card key={p.id} className="overflow-hidden">
                <button
                  onClick={() => setOpenPath(open ? null : p.id)}
                  className="flex w-full items-start gap-4 p-5 text-start transition hover:bg-sand-50"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-palm-50 text-xl">
                    <DataIcon emoji={p.emoji} size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink">{p.title}</span>
                      <Pill tone={p.level === "Start here" ? "palm" : "sand"}>{p.level}</Pill>
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-ink-soft">
                      {p.blurb}
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-faint">
                      <span>{p.duration}</span>
                      <span>·</span>
                      <span>{p.steps.length} steps</span>
                      <span>·</span>
                      <span className="font-medium text-gold-600">+{p.reward} pts</span>
                    </span>
                  </span>
                  <span className="shrink-0 pt-1 text-ink-faint">
                    <ArrowRight
                      size={16}
                      className={cx("transition-transform", open && "rotate-90")}
                    />
                  </span>
                </button>

                {open && (
                  <div className="border-t border-sand-200 px-5 py-4">
                    <div className="mb-4">
                      <div className="mb-1.5 flex justify-between text-xs text-ink-faint">
                        <span className="tnum">
                          {completed} of {p.steps.length} done
                        </span>
                        {completed === p.steps.length && (
                          <span className="font-medium text-palm-600">
                            Path complete, bonus unlocked
                          </span>
                        )}
                      </div>
                      <Bar value={completed} max={p.steps.length} />
                    </div>

                    <ul className="space-y-1">
                      {p.steps.map((step, i) => {
                        const key = `${p.id}-${i}`;
                        const checked = !!done[key];
                        return (
                          <li key={key}>
                            <button
                              onClick={() => toggle(key)}
                              className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-start transition hover:bg-sand-50"
                            >
                              {checked ? (
                                <CheckCircle2
                                  size={17}
                                  className="mt-0.5 shrink-0 text-palm-500"
                                />
                              ) : (
                                <Circle size={17} className="mt-0.5 shrink-0 text-sand-300" />
                              )}
                              <span
                                className={cx(
                                  "text-sm leading-relaxed",
                                  checked ? "text-ink-faint line-through" : "text-ink",
                                )}
                              >
                                {step}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── calendar ── */}
      <section className="mb-9">
        <SectionTitle hint="Green = good month to sow">UAE sowing calendar</SectionTitle>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[46rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-sand-200">
                <th className="px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-ink-faint">
                  Crop
                </th>
                {MONTHS.map((m, i) => (
                  <th
                    key={m}
                    className={cx(
                      "px-1 py-3 text-center text-xs font-medium",
                      i === month ? "text-palm-600" : "text-ink-faint",
                    )}
                  >
                    {m}
                  </th>
                ))}
                <th className="px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-ink-faint">
                  Harvest
                </th>
              </tr>
            </thead>
            <tbody>
              {CROP_CALENDAR.map((c) => (
                <tr key={c.crop} className="border-b border-sand-100 last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <span className="me-2 inline-flex align-middle"><DataIcon emoji={c.emoji} size={15} /></span>
                    <span className="font-medium text-ink">{c.crop}</span>
                  </td>
                  {MONTHS.map((m, i) => (
                    <td key={m} className="px-1 py-2.5">
                      <div
                        className={cx(
                          "mx-auto h-6 w-full max-w-8 rounded",
                          c.sow.includes(i)
                            ? i === month
                              ? "bg-palm-500"
                              : "bg-palm-200"
                            : "bg-sand-100",
                        )}
                      />
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-ink-soft">
                    {c.harvest}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {/* ── next steps ── */}
      <section className="grid gap-3 md:grid-cols-2">
        <Card className="flex items-start gap-4 border-palm-200 bg-palm-50 p-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-palm-600">
            <Camera size={20} />
          </span>
          <div>
            <p className="font-medium text-ink">Log your first plant</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              First-time growers get a bonus on their first verified photo, and every log
              after that builds the streak.
            </p>
            <Link
              href="/verify"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-palm-600"
            >
              Open the camera <ArrowRight size={14} />
            </Link>
          </div>
        </Card>

        <Card className="flex items-start gap-4 p-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sand-100 text-ink-soft">
            <Users size={20} />
          </span>
          <div>
            <p className="font-medium text-ink">Find a mentor nearby</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              Experienced growers earn points for guiding a beginner to a first harvest.
              Ask in the marketplace under Know-how.
            </p>
            <Link
              href="/market"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-palm-600"
            >
              Browse the market <ArrowRight size={14} />
            </Link>
          </div>
        </Card>
      </section>

      <DemoNote>
        Prototype: growing guidance here is general and illustrative. Sowing windows vary by
        emirate, microclimate and soil, the government hub links to the agricultural
        extension service for site-specific advice.
      </DemoNote>
    </div>
  );
}
