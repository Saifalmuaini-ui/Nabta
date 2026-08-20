"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Camera, Leaf, Sprout, TrendingDown, TrendingUp } from "lucide-react";
import { Card, DemoNote, Empty, PageHeader, Pill, SectionTitle, cx } from "@/components/ui";
import RecentActivity from "@/components/RecentActivity";
import { checkInDue, checkInLabel, totalPending } from "@/lib/growth";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { timeAgo } from "@/lib/format";
import type { Plant } from "@/lib/types";

export default function PlantsPage() {
  const { plants, verifications, ready } = useStore();
  const { t, locale, pick, rtl } = useI18n();
  const [openId, setOpenId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...plants].sort((a, b) => b.lastSeenAt - a.lastSeenAt),
    [plants],
  );

  const open = sorted.find((p) => p.id === openId) ?? null;

  if (open) {
    return (
      <PlantDetail
        plant={open}
        logs={verifications.filter((v) => v.plantId === open.id)}
        onBack={() => setOpenId(null)}
      />
    );
  }

  return (
    <div className="pb-4">
      <PageHeader
        eyebrow={t("plants.eyebrow")}
        title={t("plants.title")}
        arabic={locale === "en" ? "نباتاتي" : undefined}
        subtitle={t("plants.subtitle")}
      />

      {!ready ? null : sorted.length === 0 ? (
        <Empty
          icon={<Sprout size={28} />}
          title={t("plants.emptyTitle")}
          body={t("plants.emptyBody")}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {sorted.map((plant) => {
            const trend = trendOf(plant);
            const latest = plant.history[plant.history.length - 1]?.score ?? 0;
            return (
              <li key={plant.id}>
                <button
                  onClick={() => setOpenId(plant.id)}
                  className="flex w-full items-center gap-4 rounded-[1.25rem] border border-sand-200 bg-white p-3 text-start transition hover:border-palm-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palm-500"
                >
                  <span className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-sand-100">
                    {plant.cover ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={plant.cover}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-ink-faint">
                        <Leaf size={22} />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-semibold text-ink">
                      {pick(plant.nickname) || plant.species}
                    </span>
                    {/* The model often nicknames a plant after its species,
                        and printing the same words twice reads as a bug. */}
                    {pick(plant.nickname) &&
                      pick(plant.nickname) !== plant.species && (
                        <span className="block truncate text-sm text-ink-soft">
                          {plant.species}
                        </span>
                      )}
                    <span className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Pill tone={latest >= 80 ? "palm" : latest >= 60 ? "gold" : "clay"}>
                        {t("plants.health")} {latest}
                      </Pill>
                      <Pill tone="sand">
                        {plant.logCount}{" "}
                        {plant.logCount === 1 ? t("plants.photo") : t("plants.photos")}
                      </Pill>
                      {(plant.pendingPoints ?? 0) > 0 && (
                        <Pill tone="gold">{plant.pendingPoints} held</Pill>
                      )}
                      {checkInDue(plant) ? (
                        <Pill tone="palm">Check-in due</Pill>
                      ) : (
                        <Pill tone="sand">{checkInLabel(plant)}</Pill>
                      )}
                      {trend !== 0 && (
                        <Pill tone={trend > 0 ? "palm" : "clay"}>
                          {trend > 0 ? (
                            <TrendingUp size={12} />
                          ) : (
                            <TrendingDown size={12} />
                          )}
                          {trend > 0 ? t("plants.improving") : t("plants.declining")}
                        </Pill>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-9">
        <RecentActivity limit={8} />
      </div>

      <DemoNote>{t("plants.note")}</DemoNote>
    </div>
  );
}

/** Positive when the plant is doing better than it was, negative when worse. */
function trendOf(plant: Plant): number {
  const h = plant.history;
  if (h.length < 2) return 0;
  const delta = h[h.length - 1].score - h[0].score;
  // Ignore small wobble. Health scoring is not precise enough to call a five
  // point move a trend, and claiming otherwise would be noise.
  return Math.abs(delta) < 6 ? 0 : Math.sign(delta);
}

function PlantDetail({
  plant,
  logs,
  onBack,
}: {
  plant: Plant;
  logs: ReturnType<typeof useStore>["verifications"];
  onBack: () => void;
}) {
  const { t, locale, pick, rtl } = useI18n();
  const scores = plant.history;
  const best = Math.max(...scores.map((s) => s.score), 1);

  return (
    <div className="pb-4">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 text-sm font-medium text-ink-soft transition hover:text-palm-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palm-500"
      >
        <ArrowLeft size={16} className={cx(rtl && "rotate-180")} /> {t("plants.all")}
      </button>

      <PageHeader
        eyebrow={`${t("plants.registered")} ${timeAgo(plant.createdAt)}`}
        title={pick(plant.nickname) || plant.species}
        arabic={plant.nickname.ar}
        subtitle={plant.identity}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-5">
          {plant.cover && (
            <Card className="overflow-hidden p-0">
              <div className="aspect-[3/4] w-full bg-ink">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={plant.cover}
                  alt={plant.species}
                  className="h-full w-full object-cover"
                />
              </div>
            </Card>
          )}

          <Card className="p-5">
            <SectionTitle>{t("plants.healthOverTime")}</SectionTitle>
            {scores.length < 2 ? (
              <p className="text-sm text-ink-soft">{t("plants.oneReading")}</p>
            ) : (
              <div className="flex h-28 items-end gap-1.5" aria-hidden="true">
                {scores.slice(-24).map((s, i) => (
                  <div
                    key={`${s.at}-${i}`}
                    className={cx(
                      "flex-1 rounded-t",
                      s.score >= 80
                        ? "bg-palm-500"
                        : s.score >= 60
                          ? "bg-gold-400"
                          : "bg-clay",
                    )}
                    style={{ height: `${Math.max(6, (s.score / best) * 100)}%` }}
                  />
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-ink-faint">
              {scores.length}{" "}
              {locale === "ar"
                ? scores.length === 1
                  ? "قراءة"
                  : "قراءات"
                : scores.length === 1
                  ? "reading"
                  : "readings"}
              , {timeAgo(plant.lastSeenAt)}
            </p>
          </Card>
        </div>

        <div>
          <SectionTitle
            hint={
              <Link href="/verify" className="hover:text-palm-600">
                {t("plants.addPhoto")}
              </Link>
            }
          >
            {t("plants.everyVisit")}
          </SectionTitle>

          {logs.length === 0 ? (
            <Empty
              icon={<Camera size={26} />}
              title={t("plants.noPhotosTitle")}
              body={t("plants.noPhotosBody")}
            />
          ) : (
            <ol className="space-y-3">
              {logs.map((log) => (
                <li key={log.id}>
                  <Card className="flex gap-4 p-4">
                    <span className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-sand-100">
                      {log.image ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={log.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="grid h-full w-full place-items-center text-ink-faint">
                          <Leaf size={18} />
                        </span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm font-semibold text-ink">
                          {log.activityLabel ?? t("plants.logged")}
                        </p>
                        <p className="shrink-0 text-xs text-ink-faint">
                          {timeAgo(log.createdAt)}
                        </p>
                      </div>
                      {log.diagnosis && (
                        <p className="mt-1 text-sm text-ink-soft">
                          {log.diagnosis.condition.en}
                        </p>
                      )}
                      {log.diagnosis?.whatToDo.en && (
                        <p className="mt-1.5 text-sm text-ink">
                          {log.diagnosis.whatToDo.en}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Pill tone="sand">{t("plants.health")} {log.healthScore}</Pill>
                        {log.points > 0 && (
                          <Pill tone="gold">+{log.points} {t("plants.points")}</Pill>
                        )}
                        {log.plantIsNew && <Pill tone="palm">{t("plants.firstPhoto")}</Pill>}
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
