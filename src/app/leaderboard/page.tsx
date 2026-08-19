"use client";

import { useMemo, useState } from "react";
import { Award, Crown, Flame, MapPin, Medal, Sprout, TrendingUp, Trophy } from "lucide-react";
import { Bar, Card, DemoNote, PageHeader, Pill, SectionTitle, cx } from "@/components/ui";
import { useStore } from "@/lib/store";
import { AREA_TOTALS, EMIRATE_TOTALS, SEED_LEADERS, SEED_TEAMS } from "@/lib/data";
import { compact, num } from "@/lib/format";
import { EMIRATES, areasIn, type Emirate } from "@/lib/types";

type Board = "growers" | "teams" | "areas" | "emirates";
type Range = "month" | "all";

const BOARDS: { id: Board; label: string; arabic: string }[] = [
  { id: "growers", label: "Growers", arabic: "المزارعون" },
  { id: "areas", label: "Areas", arabic: "المناطق" },
  { id: "teams", label: "Schools & communities", arabic: "المدارس والمجتمعات" },
  { id: "emirates", label: "Emirates", arabic: "الإمارات" },
];

/** The monthly board is a deterministic slice of the all-time figures. */
function scoped(points: number, range: Range, salt = 0) {
  if (range === "all") return points;
  const jitter = 0.22 + (((points + salt) % 17) / 17) * 0.16;
  return Math.round(points * jitter);
}

export default function LeaderboardPage() {
  const { profile, lifetimePoints, points, totals, streak } = useStore();
  const [board, setBoard] = useState<Board>("growers");
  const [range, setRange] = useState<Range>("all");
  const [emirate, setEmirate] = useState<Emirate | "all">("all");
  const [area, setArea] = useState<string | "all">("all");

  // Areas belong to one emirate, so narrowing the emirate can strand the
  // selected area. Reset it rather than showing an empty board.
  const areaOptions = useMemo(() => areasIn(emirate), [emirate]);
  const activeArea =
    area !== "all" && !areaOptions.some((a) => a.name === area) ? "all" : area;

  const growers = useMemo(() => {
    const me = {
      id: "me",
      name: `${profile.name} (you)`,
      area: profile.area,
      emirate: profile.emirate,
      points: range === "all" ? lifetimePoints : points,
      logs: totals.logs,
      trees: totals.trees,
      badge: streak >= 3 ? `${streak}-day streak` : undefined,
      mine: true,
    };
    const rows = SEED_LEADERS.map((l, i) => ({
      ...l,
      points: scoped(l.points, range, i),
      mine: false,
    }));
    return [...rows, me]
      .filter((r) => emirate === "all" || r.emirate === emirate)
      .filter((r) => activeArea === "all" || r.area === activeArea)
      .sort((a, b) => b.points - a.points);
  }, [profile, lifetimePoints, points, totals, streak, range, emirate, activeArea]);

  const teams = useMemo(
    () =>
      SEED_TEAMS.map((t, i) => ({ ...t, points: scoped(t.points, range, i) }))
        .filter((t) => emirate === "all" || t.emirate === emirate)
        .filter((t) => activeArea === "all" || t.area === activeArea)
        .sort((a, b) => b.points - a.points),
    [range, emirate, activeArea],
  );

  const areas = useMemo(
    () =>
      AREA_TOTALS.map((a, i) => ({ ...a, points: scoped(a.points, range, i) }))
        .filter((a) => emirate === "all" || a.emirate === emirate)
        .sort((a, b) => b.points - a.points),
    [range, emirate],
  );

  const emirates = useMemo(
    () =>
      EMIRATE_TOTALS.map((e, i) => ({ ...e, points: scoped(e.points, range, i) })).sort(
        (a, b) => b.points - a.points,
      ),
    [range],
  );

  const myIndex = growers.findIndex((g) => g.mine);
  const scopeLabel =
    activeArea !== "all"
      ? activeArea
      : emirate !== "all"
        ? emirate
        : "the country";
  const top = growers.slice(0, 3);
  const maxEmirate = emirates[0]?.points ?? 1;

  return (
    <div>
      <PageHeader
        eyebrow="Community impact"
        title="Leaderboard"
        arabic="لوحة المتصدرين"
        subtitle="Every row here is backed by AI-verified photographic evidence, not self-reported claims."
      />

      {/* ── controls ── */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl border border-sand-200 bg-white p-1">
          {BOARDS.map((b) => (
            <button
              key={b.id}
              onClick={() => setBoard(b.id)}
              className={cx(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                board === b.id
                  ? "bg-palm-600 text-white"
                  : "text-ink-soft hover:text-ink",
              )}
            >
              {b.label}
            </button>
          ))}
        </div>

        <div className="flex rounded-xl border border-sand-200 bg-white p-1">
          {(["month", "all"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cx(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                range === r ? "bg-sand-100 text-ink" : "text-ink-soft hover:text-ink",
              )}
            >
              {r === "month" ? "This month" : "All time"}
            </button>
          ))}
        </div>

        {board !== "emirates" && (
          <select
            value={emirate}
            onChange={(e) => setEmirate(e.target.value as Emirate | "all")}
            className="rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-ink"
          >
            <option value="all">All emirates</option>
            {EMIRATES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        )}

        {(board === "growers" || board === "teams") && (
          <select
            value={activeArea}
            onChange={(e) => setArea(e.target.value)}
            className="rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-ink"
          >
            <option value="all">All areas</option>
            {areaOptions.map((a) => (
              <option key={a.name} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
        )}

        {activeArea !== "all" && (
          <button
            onClick={() => setArea("all")}
            className="text-xs font-medium text-palm-600 underline underline-offset-4 hover:text-palm-700"
          >
            Clear area
          </button>
        )}
      </div>

      {board === "growers" && (
        <>
          {/* podium */}
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            {top.map((g, i) => (
              <Card
                key={g.id}
                className={cx(
                  "flex flex-col items-center p-5 text-center",
                  i === 0 && "border-gold-400 bg-gold-50 sm:order-2",
                  i === 1 && "sm:order-1",
                  i === 2 && "sm:order-3",
                  g.mine && "ring-2 ring-palm-500",
                )}
              >
                <span className="text-2xl">
                  {i === 0 ? <Trophy size={16} /> : i === 1 ? <Medal size={16} /> : <Award size={16} />}
                </span>
                <p className="mt-2 text-sm font-semibold text-ink">{g.name}</p>
                <p className="text-xs font-medium text-palm-600">{g.area}</p>
                <p className="text-xs text-ink-faint">{g.emirate}</p>
                <p className="tnum mt-2 text-2xl font-semibold text-palm-600">
                  {num(g.points)}
                </p>
                {g.badge && (
                  <Pill tone={i === 0 ? "gold" : "sand"} className="mt-2">
                    {i === 0 && <Crown size={11} />} {g.badge}
                  </Pill>
                )}
              </Card>
            ))}
          </div>

          <Card className="overflow-hidden">
            <div className="hidden grid-cols-[3rem_1fr_6rem_5rem_5rem] gap-2 border-b border-sand-200 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-ink-faint sm:grid">
              <span>#</span>
              <span>Grower</span>
              <span className="text-end">Points</span>
              <span className="text-end">Logs</span>
              <span className="text-end">Plants</span>
            </div>
            <ul className="divide-y divide-sand-200">
              {growers.map((g, i) => (
                <li
                  key={g.id}
                  className={cx(
                    "grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 px-4 py-3 sm:grid-cols-[3rem_1fr_6rem_5rem_5rem]",
                    g.mine && "bg-palm-50",
                  )}
                >
                  <span
                    className={cx(
                      "tnum text-sm font-semibold",
                      i < 3 ? "text-gold-600" : "text-ink-faint",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cx(
                        "block truncate text-sm",
                        g.mine ? "font-semibold text-palm-700" : "font-medium text-ink",
                      )}
                    >
                      {g.name}
                    </span>
                    <span className="block truncate text-xs text-ink-faint">
                      <span className="font-medium text-palm-600">{g.area}</span>
                      {` · ${g.emirate}`}
                      {g.badge ? ` · ${g.badge}` : ""}
                    </span>
                  </span>
                  <span className="tnum text-end text-sm font-semibold text-ink sm:font-medium">
                    {num(g.points)}
                  </span>
                  <span className="tnum hidden text-end text-sm text-ink-soft sm:block">
                    {g.logs}
                  </span>
                  <span className="tnum hidden text-end text-sm text-ink-soft sm:block">
                    {g.trees}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {myIndex >= 0 && (
            <Card className="mt-4 flex items-center gap-3 border-palm-200 bg-palm-50 p-4">
              <TrendingUp size={18} className="shrink-0 text-palm-600" />
              <p className="text-sm text-ink">
                {myIndex === 0 ? (
                  <>
                    You lead {scopeLabel}
                    {growers[1] && (
                      <>
                        {" by "}
                        <span className="tnum font-semibold">
                          {num(growers[0].points - growers[1].points)}
                        </span>{" "}
                        points
                      </>
                    )}
                    .
                  </>
                ) : (
                  <>
                    You are <span className="font-semibold">#{myIndex + 1}</span> in{" "}
                    {scopeLabel}.{" "}
                    <span className="tnum font-semibold">
                      {num(growers[myIndex - 1].points - growers[myIndex].points)}
                    </span>{" "}
                    points behind {growers[myIndex - 1].name.replace(" (you)", "")}.
                  </>
                )}
              </p>
            </Card>
          )}
        </>
      )}

      {board === "teams" && (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-sand-200">
            {teams.map((t, i) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-4">
                <span
                  className={cx(
                    "tnum grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-semibold",
                    i < 3 ? "bg-gold-50 text-gold-600" : "bg-sand-100 text-ink-faint",
                  )}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{t.name}</p>
                  <p className="truncate text-xs text-ink-faint">
                    <span className="font-medium text-palm-600">{t.area}</span>
                    {` · ${t.emirate} · ${t.members} members · `}
                    {t.kind === "school" ? "School" : "Community garden"}
                  </p>
                </div>
                <div className="shrink-0 text-end">
                  <p className="tnum text-sm font-semibold text-ink">{num(t.points)}</p>
                  <p className="tnum text-xs text-ink-faint">
                    {num(Math.round(t.points / t.members))} / member
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {board === "areas" && (
        <>
          <Card className="overflow-hidden">
            <div className="hidden grid-cols-[3rem_1fr_7rem_6rem_6rem] gap-2 border-b border-sand-200 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-ink-faint sm:grid">
              <span>#</span>
              <span>Area</span>
              <span className="text-end">Points</span>
              <span className="text-end">Growers</span>
              <span className="text-end">Per grower</span>
            </div>
            <ul className="divide-y divide-sand-200">
              {areas.map((a, i) => {
                const mine = a.area === profile.area;
                return (
                  <li
                    key={a.area}
                    className={cx(
                      "grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 px-4 py-3 sm:grid-cols-[3rem_1fr_7rem_6rem_6rem]",
                      mine && "bg-palm-50",
                    )}
                  >
                    <span
                      className={cx(
                        "tnum text-sm font-semibold",
                        i < 3 ? "text-gold-600" : "text-ink-faint",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span
                          className={cx(
                            "truncate text-sm",
                            mine ? "font-semibold text-palm-700" : "font-medium text-ink",
                          )}
                        >
                          {a.area}
                        </span>
                        {mine && <Pill tone="palm">yours</Pill>}
                      </span>
                      <span className="block text-xs text-ink-faint">{a.emirate}</span>
                    </span>
                    <span className="tnum text-end text-sm font-semibold text-ink sm:font-medium">
                      {num(a.points)}
                    </span>
                    <span className="tnum hidden text-end text-sm text-ink-soft sm:block">
                      {num(a.growers)}
                    </span>
                    <span className="tnum hidden text-end text-sm text-ink-soft sm:block">
                      {num(Math.round(a.points / a.growers))}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="mt-4 flex items-start gap-3 border-palm-200 bg-palm-50 p-4">
            <MapPin size={18} className="mt-0.5 shrink-0 text-palm-600" />
            <p className="text-sm leading-relaxed text-ink">
              Area standings are the ones people check first, you know your
              neighbours in {profile.area}, and a district that is fifty points behind
              is a rivalry you can actually do something about. Emirate totals are for
              the annual report; this is the board that moves behaviour week to week.
            </p>
          </Card>
        </>
      )}

      {board === "emirates" && (
        <Card className="p-5">
          <SectionTitle hint="Points earned by all growers">Emirate standings</SectionTitle>
          <ul className="space-y-4">
            {emirates.map((e, i) => (
              <li key={e.emirate}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-ink">
                    {i === 0 && <Medal size={14} className="text-gold-500" />}
                    {e.emirate}
                    {e.emirate === profile.emirate && (
                      <Pill tone="palm">yours</Pill>
                    )}
                  </span>
                  <span className="tnum text-sm text-ink-soft">
                    {num(e.points)} · {compact(e.growers)} growers
                  </span>
                </div>
                <Bar value={e.points} max={maxEmirate} tone={i === 0 ? "gold" : "palm"} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ── how points work ── */}
      <section className="mt-8">
        <SectionTitle>How a rank is earned</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: <Sprout size={18} />,
              title: "Verified work only",
              body: "Points come from photographs the model accepted. Duplicates and re-photographed screens are rejected.",
            },
            {
              icon: <Flame size={18} />,
              title: "Consistency beats bursts",
              body: "Streak multipliers reach ×1.5 at fourteen consecutive days, so steady care outranks a single busy weekend.",
            },
            {
              icon: <TrendingUp size={18} />,
              title: "Efficiency scores higher",
              body: "Drip irrigation, native species and composting all carry bonuses. The incentive points where the strategy does.",
            },
          ].map((c) => (
            <Card key={c.title} className="p-4">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-palm-50 text-palm-600">
                {c.icon}
              </span>
              <p className="mt-3 text-sm font-medium text-ink">{c.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{c.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <DemoNote>
        Prototype: all growers, teams and emirate totals other than your own row are seeded
        demo data.
      </DemoNote>
    </div>
  );
}
