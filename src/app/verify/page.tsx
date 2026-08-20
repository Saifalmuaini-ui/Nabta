"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ImageIcon,
  Loader2,
  RefreshCw,
  Sparkles,
  Sprout,
  Trophy,
  XCircle,
} from "lucide-react";
import { Bar, Card, cx, DemoNote, PageHeader, Pill, SectionTitle } from "@/components/ui";
import { CHECK_IN_PENDING } from "@/lib/growth";
import { useStore } from "@/lib/store";
import { makeSamplePhoto } from "@/lib/samplePhoto";
import { loadSamplePhoto, randomSample } from "@/lib/samplePhotos";
import { actionMeta, type Verification } from "@/lib/types";
import { STAGES, type VerificationDraft } from "@/lib/verifier";
import { activeVerifier } from "@/lib/verifier-ai";
import { useI18n } from "@/lib/i18n";

type Phase = "setup" | "camera" | "review" | "analyzing" | "result";

const MAX_EDGE = 640;

async function downscaleFile(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read that image"));
      el.src = url;
    });
    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.62);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function VerifyPage() {
  const { verifications, plants, addVerification, streak, multiplier } = useStore();

  const [phase, setPhase] = useState<Phase>("setup");
  const [image, setImage] = useState<string>("");
  const [stageIndex, setStageIndex] = useState(0);
  // points and cycle come back from the store, which owns the economy.
  const [draft, setDraft] = useState<
    (VerificationDraft & Pick<Verification, "cycle">) | null
  >(null);
  const [cameraError, setCameraError] = useState<string>("");
  const [shareLocation, setShareLocation] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const startCamera = useCallback(async () => {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("This browser does not expose a camera. Upload a photo or use the sample instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      setPhase("camera");
      // The <video> only exists once the camera phase has rendered.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      setCameraError(
        "Camera access was blocked or no camera was found. Upload a photo or use the sample instead.",
      );
    }
  }, []);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const scale = Math.min(1, MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    setImage(canvas.toDataURL("image/jpeg", 0.62));
    stopCamera();
    setPhase("review");
  }, [stopCamera]);

  const analyze = useCallback(async () => {
    setPhase("analyzing");
    setStageIndex(0);

    let coords: { lat: number; lng: number } | null = null;
    if (shareLocation && typeof navigator !== "undefined" && navigator.geolocation) {
      coords = await new Promise((resolve) => {
        const done = setTimeout(() => resolve(null), 2500);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(done);
            resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          },
          () => {
            clearTimeout(done);
            resolve(null);
          },
          { timeout: 2500 },
        );
      });
    }

    // Start the model immediately and let the stage animation play over the
    // top of it. A real vision call takes about thirteen seconds, so running
    // the stages first and the call afterwards would stack the two waits and
    // leave the grower watching a spinner for the best part of twenty.
    const pending = activeVerifier.analyze({
      image,
      history: verifications,
      coords,
      plants,
    });

    for (let i = 0; i < STAGES.length; i++) {
      setStageIndex(i);
      await new Promise((r) => setTimeout(r, 340 + Math.random() * 260));
    }
    // Hold on the last stage until the model actually answers.
    setStageIndex(STAGES.length - 1);

    const result = await pending;

    // `result.action` is what the model read off the photo, so nothing here
    // needs the grower to have declared anything.
    const record: Verification = {
      id: `v-${Date.now()}`,
      createdAt: Date.now(),
      image,
      ...result,
    };

    // Only register a plant when a real model actually identified one. The
    // simulated fallback has no idea what it is looking at, so letting it
    // create registry entries would poison the log with invented plants.
    const identity = (result as { identity?: string }).identity;
    const upsert =
      result.source === "ai" && result.outcome !== "rejected" && identity
        ? {
            matchedId: result.plantId ?? null,
            species: result.species,
            speciesArabic: result.speciesArabic,
            nickname: result.plantNickname ?? { en: result.species, ar: result.speciesArabic },
            identity,
            healthScore: result.healthScore,
            cover: image,
          }
        : undefined;

    const stored = addVerification(record, upsert);
    setDraft({
      ...result,
      plantId: stored.plantId,
      plantIsNew: stored.plantIsNew,
      // The store decides what a capture is worth, so take its numbers.
      points: stored.points,
      breakdown: stored.breakdown,
      cycle: stored.cycle,
    });
    setPhase("result");
  }, [image, verifications, plants, addVerification, shareLocation]);

  const restart = useCallback(() => {
    stopCamera();
    setImage("");
    setDraft(null);
    setStageIndex(0);
    setPhase("setup");
  }, [stopCamera]);

  return (
    <div className="pb-4">
      <PageHeader
        eyebrow="AI verification"
        title="Log your work"
        arabic="وثّق عملك"
        subtitle="Photograph what you did in the garden. Nothing to fill in, the model reads the activity and the species off the photo, scores plant health, screens for duplicates, and advances the plant's grow cycle."
      />

      {phase === "setup" && (
        <div className="mx-auto max-w-xl">
          <Card className="flex flex-col p-5">
            <SectionTitle hint="The AI works out what you did">Capture</SectionTitle>
            <button
              onClick={startCamera}
              className="flex items-center justify-center gap-2 rounded-xl bg-palm-600 px-4 py-4 text-sm font-semibold text-white transition hover:bg-palm-700 active:scale-[0.99]"
            >
              <Camera size={18} /> Open camera
            </button>

            <div className="my-4 flex items-center gap-3 text-xs text-ink-faint">
              <span className="h-px flex-1 bg-sand-200" />
              or
              <span className="h-px flex-1 bg-sand-200" />
            </div>

            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-xl border border-sand-200 px-4 py-3 text-sm font-medium text-ink transition hover:bg-sand-50"
            >
              <ImageIcon size={16} /> Upload a photo
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  setImage(await downscaleFile(file));
                  setPhase("review");
                } catch {
                  setCameraError("That file could not be read as an image.");
                }
                e.target.value = "";
              }}
            />

            <button
              onClick={async () => {
                try {
                  setImage(await loadSamplePhoto(randomSample().src));
                } catch {
                  // Nothing served the photo, for example an offline file open.
                  // The drawn stand-in is worse but it keeps the flow walkable.
                  setImage(makeSamplePhoto());
                }
                setPhase("review");
              }}
              className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-dashed border-sand-300 px-4 py-3 text-sm font-medium text-ink-soft transition hover:bg-sand-50"
            >
              <Sparkles size={16} /> Use a sample photo
            </button>

            {cameraError && (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-clay-50 px-3 py-2.5 text-xs text-clay">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                {cameraError}
              </p>
            )}

            <div className="mt-5 rounded-xl bg-sand-100 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                Framing tip
              </p>
              <p className="mt-1 text-sm text-ink">
                Get the plant and what you did to it in the same frame, the
                watering can, the cut stems, the picked fruit. That is what the
                model reads the activity from.
              </p>
            </div>

            <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={shareLocation}
                onChange={(e) => setShareLocation(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-palm-600"
              />
              <span>
                Share location with this log
                <span className="block text-xs text-ink-faint">
                  Confirms the plot and unlocks the geo check. Optional, the log still counts without it.
                </span>
              </span>
            </label>

            <div className="mt-5">
              <div className="flex items-center justify-between rounded-xl bg-gold-50 px-4 py-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gold-600">
                    Current streak
                  </p>
                  <p className="tnum text-lg font-semibold text-ink">{streak} days</p>
                </div>
                <Pill tone="gold">×{multiplier} points</Pill>
              </div>
            </div>
          </Card>
        </div>
      )}

      {phase === "camera" && (
        <Card className="overflow-hidden p-0">
          <div className="relative aspect-[3/4] w-full bg-ink sm:aspect-video">
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="h-3/5 w-3/5 rounded-2xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.28)]" />
            </div>
            <p className="absolute inset-x-0 top-4 text-center text-xs font-medium text-white/90 drop-shadow">
              Include the plant and what you did to it
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 p-4">
            <button
              onClick={restart}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-sand-100"
            >
              Cancel
            </button>
            <button
              onClick={capture}
              className="grid h-16 w-16 place-items-center rounded-full border-4 border-palm-600 bg-white transition active:scale-95"
              aria-label="Take photo"
            >
              <span className="h-11 w-11 rounded-full bg-palm-600" />
            </button>
            <span className="w-[68px]" />
          </div>
        </Card>
      )}

      {(phase === "review" || phase === "analyzing") && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <Card className="overflow-hidden p-0">
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-ink">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="Captured plant" className="h-full w-full object-cover" />
              {phase === "analyzing" && (
                <>
                  <div className="absolute inset-0 bg-palm-900/25" />
                  <div className="animate-scanline absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent via-palm-200/60 to-transparent" />
                  <div className="absolute inset-4 rounded-xl border border-palm-200/60" />
                </>
              )}
            </div>
          </Card>

          <div>
            {phase === "review" ? (
              <Card className="p-5">
                <SectionTitle>Ready to submit</SectionTitle>
                <dl className="divide-y divide-sand-200 text-sm">
                  <div className="flex justify-between py-2.5">
                    <dt className="text-ink-soft">Activity</dt>
                    <dd className="font-medium text-palm-600">
                      Detected from the photo
                    </dd>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <dt className="text-ink-soft">Species</dt>
                    <dd className="font-medium text-palm-600">
                      Detected from the photo
                    </dd>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <dt className="text-ink-soft">Streak multiplier</dt>
                    <dd className="tnum font-medium text-ink">×{multiplier}</dd>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <dt className="text-ink-soft">Location</dt>
                    <dd className="font-medium text-ink">
                      {shareLocation ? "Shared" : "Not shared"}
                    </dd>
                  </div>
                </dl>
                <button
                  onClick={analyze}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-palm-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-palm-700"
                >
                  <Sparkles size={16} /> Verify with AI
                </button>
                <button
                  onClick={restart}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-ink-soft transition hover:bg-sand-100"
                >
                  <RefreshCw size={15} /> Retake
                </button>
              </Card>
            ) : (
              <Card className="p-5">
                <SectionTitle hint={`${stageIndex + 1} of ${STAGES.length}`}>
                  Analysing
                </SectionTitle>
                <Bar value={stageIndex + 1} max={STAGES.length} />
                <ul className="mt-5 space-y-3">
                  {STAGES.map((stage, i) => {
                    const done = i < stageIndex;
                    const active = i === stageIndex;
                    return (
                      <li
                        key={stage.id}
                        className={cx(
                          "flex items-start gap-3 transition-opacity",
                          !done && !active && "opacity-35",
                        )}
                      >
                        <span className="mt-0.5 shrink-0">
                          {done ? (
                            <CheckCircle2 size={17} className="text-palm-500" />
                          ) : active ? (
                            <Loader2 size={17} className="animate-spin text-palm-500" />
                          ) : (
                            <span className="block h-[17px] w-[17px] rounded-full border border-sand-300" />
                          )}
                        </span>
                        <span>
                          <span className="block text-sm font-medium text-ink">
                            {stage.label}
                          </span>
                          <span className="block text-xs text-ink-faint">
                            {stage.detail}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}
          </div>
        </div>
      )}

      {phase === "result" && draft && (
        <ResultView draft={draft} image={image} onAgain={restart} />
      )}

      <DemoNote>
        Prototype: verification is simulated locally and is deterministic per image, submit
        the same photo twice and the duplicate check will catch it. The model lives behind a
        single <code className="font-mono text-[11px]">Verifier</code> interface in{" "}
        <code className="font-mono text-[11px]">src/lib/verifier.ts</code>, so a real vision
        model can replace it without touching this screen.
      </DemoNote>
    </div>
  );
}

function HealthRing({ score }: { score: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const tone = score >= 80 ? "#14805b" : score >= 62 ? "#c29a44" : "#b4531f";
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20">
      <circle cx="40" cy="40" r={r} fill="none" stroke="#f3efe5" strokeWidth="8" />
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke={tone}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${(score / 100) * c} ${c}`}
        transform="rotate(-90 40 40)"
      />
      <text
        x="40"
        y="45"
        textAnchor="middle"
        className="tnum fill-ink text-[18px] font-semibold"
      >
        {score}
      </text>
    </svg>
  );
}

function ResultView({
  draft,
  image,
  onAgain,
}: {
  draft: VerificationDraft & Pick<Verification, "cycle">;
  image: string;
  onAgain: () => void;
}) {
  const { t, locale, pick } = useI18n();
  const approved = draft.outcome === "approved";
  const rejected = draft.outcome === "rejected";

  return (
    <div className="animate-rise grid gap-5 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-5">
        <Card className="overflow-hidden p-0">
          <div className="aspect-[3/4] w-full overflow-hidden bg-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="Verified plant" className="h-full w-full object-cover" />
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <HealthRing score={draft.healthScore} />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
              Plant health
            </p>
            <p className="text-sm text-ink">
              {/* Prefer what the model actually saw. The score bands below are
                  a fallback for the simulated verifier, which has no idea what
                  is in the photo and should not claim otherwise. */}
              {draft.diagnosis
                ? pick(draft.diagnosis.condition)
                : draft.healthScore >= 80
                  ? "Colour and firmness both look right."
                  : draft.healthScore >= 62
                    ? "Holding steady. Watch for leaf curl this week."
                    : "Stressed. Check salinity and watering depth."}
            </p>
          </div>
        </Card>
      </div>

      <div className="space-y-5">
        <Card
          className={cx(
            "p-5",
            approved && "border-palm-200 bg-palm-50",
            draft.outcome === "review" && "border-gold-100 bg-gold-50",
            rejected && "border-clay/30 bg-clay-50",
          )}
        >
          <div className="flex items-start gap-3">
            {approved ? (
              <CheckCircle2 className="mt-0.5 shrink-0 text-palm-600" size={22} />
            ) : rejected ? (
              <XCircle className="mt-0.5 shrink-0 text-clay" size={22} />
            ) : (
              <AlertTriangle className="mt-0.5 shrink-0 text-gold-600" size={22} />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold text-ink">
                {approved
                  ? "Verified"
                  : rejected
                    ? "Not accepted"
                    : "Verified, flagged for review"}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {draft.note ??
                  `Read as ${(draft.activityLabel ?? actionMeta(draft.action).label).toLowerCase()} on ${draft.species}, at ${Math.round(draft.confidence * 100)}% confidence.`}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Pill tone="gold">
                  {draft.activityLabel ?? actionMeta(draft.action).label}
                </Pill>
                <Pill tone="palm">
                  {draft.species}
                  <span dir="rtl" className="opacity-70">
                    {draft.speciesArabic}
                  </span>
                </Pill>
                <Pill tone="sand">{Math.round(draft.confidence * 100)}% confidence</Pill>
              </div>
            </div>
            {/*
              A capture pays nothing on its own now. Showing "+0" would read as
              a failure, so the held amount is shown instead and the balance
              figure only appears when a cycle actually released.
            */}
            <div className="shrink-0 text-end">
              {draft.points > 0 ? (
                <>
                  <p className="tnum text-3xl font-semibold text-palm-600">
                    +{draft.points}
                  </p>
                  <p className="text-xs text-ink-faint">points released</p>
                </>
              ) : draft.cycle?.kind === "checkin" ? (
                <>
                  <p className="tnum text-3xl font-semibold text-gold-600">
                    +{CHECK_IN_PENDING}
                  </p>
                  <p className="text-xs text-ink-faint">held till harvest</p>
                </>
              ) : (
                <>
                  <p className="tnum text-2xl font-semibold text-ink-faint">—</p>
                  <p className="text-xs text-ink-faint">logged</p>
                </>
              )}
            </div>
          </div>
        </Card>

        {draft.cycle && (
          <Card
            className={
              draft.cycle.kind === "harvest"
                ? "border-palm-200 bg-palm-50 p-5"
                : "border-sand-200 p-5"
            }
          >
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              {draft.cycle.kind === "harvest"
                ? "Cycle complete"
                : draft.cycle.kind === "planted"
                  ? "Cycle started"
                  : draft.cycle.kind === "checkin"
                    ? "Weekly check-in"
                    : "Logged"}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink">{draft.cycle.message}</p>
          </Card>
        )}

        {draft.plantIsNew !== undefined && (
          <Card
            className={cx(
              "flex items-start gap-3 p-5",
              draft.plantIsNew ? "border-gold-100 bg-gold-50" : "border-palm-100 bg-palm-50",
            )}
          >
            <Sprout
              className={cx(
                "mt-0.5 shrink-0",
                draft.plantIsNew ? "text-gold-600" : "text-palm-600",
              )}
              size={20}
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">
                {draft.plantIsNew ? t("verify.newPlant") : t("verify.knownPlant")}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {draft.plantIsNew
                  ? t("verify.newPlantBody")
                  : t("verify.knownPlantBody")}
              </p>
            </div>
          </Card>
        )}

        {draft.diagnosis && (
          <Card
            className={cx(
              "p-5",
              draft.diagnosis.status === "issue" &&
                (draft.diagnosis.severity === "severe"
                  ? "border-clay/30 bg-clay-50"
                  : "border-gold-100 bg-gold-50"),
            )}
          >
            <SectionTitle>
              {draft.diagnosis.status === "healthy"
                ? t("verify.plantCheck")
                : t("verify.whatWeFound")}
            </SectionTitle>
            <p className="text-base font-semibold text-ink">
              {pick(draft.diagnosis.condition)}
            </p>
            <p className="mt-1 text-sm text-ink-soft">{pick(draft.diagnosis.evidence)}</p>
            <div className="mt-4 rounded-xl bg-white/70 p-4 ring-1 ring-inset ring-sand-200">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                {t("verify.doThisNext")}
              </p>
              <p className="mt-1.5 text-sm font-medium text-ink">
                {pick(draft.diagnosis.whatToDo)}
              </p>
            </div>
          </Card>
        )}

        {draft.advice && (
          <Card as="section" className="overflow-hidden p-0">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-palm-500">
                <span>
                  <span className="block text-sm font-semibold text-ink">
                    {t("verify.howToGrow")}{" "}
                    {locale === "ar" ? draft.speciesArabic : draft.species}
                  </span>
                  <span className="block text-xs text-ink-faint">
                    {t("verify.adviceHint")}
                  </span>
                </span>
                <ChevronDown
                  size={18}
                  className="shrink-0 text-ink-faint transition-transform group-open:rotate-180 motion-reduce:transition-none"
                />
              </summary>
              <dl className="divide-y divide-sand-200 border-t border-sand-200 text-sm">
                {(
                  [
                    [t("verify.soil"), pick(draft.advice.soil)],
                    [t("verify.location"), pick(draft.advice.location)],
                    [t("verify.water"), pick(draft.advice.water)],
                    [t("verify.seeds"), pick(draft.advice.seeds)],
                    [t("verify.care"), pick(draft.advice.care)],
                  ] as const
                ).map(([label, text]) => (
                  <div key={label} className="px-5 py-3.5">
                    <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                      {label}
                    </dt>
                    <dd className="mt-1 text-ink">{text}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </Card>
        )}

        {draft.produce?.hasProduce && (
          <Card className="p-5">
            <SectionTitle>{t("verify.harvest")}</SectionTitle>
            <p className="tnum text-2xl font-semibold text-ink">
              {draft.produce.kgLow.toFixed(1)} to {draft.produce.kgHigh.toFixed(1)} kg
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              {draft.produce.visibleCount} visible in frame. The range is wide on
              purpose, since a photograph cannot show everything the plant is
              carrying.
            </p>
          </Card>
        )}

        {draft.breakdown.length > 0 && (
          <Card className="p-5">
            <SectionTitle>What this capture earned</SectionTitle>
            <ul className="divide-y divide-sand-200 text-sm">
              {draft.breakdown.map((line) => (
                <li key={line.label} className="flex justify-between py-2.5">
                  <span className="text-ink-soft">{line.label}</span>
                  <span className="tnum font-medium text-palm-600">+{line.points}</span>
                </li>
              ))}
              <li className="flex justify-between py-2.5 font-semibold">
                <span className="text-ink">Total</span>
                <span className="tnum text-ink">{draft.points}</span>
              </li>
            </ul>
          </Card>
        )}

        <Card className="p-5">
          <SectionTitle>Integrity checks</SectionTitle>
          <ul className="space-y-3">
            {draft.checks.map((check) => (
              <li key={check.id} className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0">
                  {check.status === "pass" ? (
                    <CheckCircle2 size={16} className="text-palm-500" />
                  ) : check.status === "warn" ? (
                    <AlertTriangle size={16} className="text-gold-500" />
                  ) : (
                    <XCircle size={16} className="text-clay" />
                  )}
                </span>
                <span>
                  <span className="block text-sm font-medium text-ink">{check.label}</span>
                  <span className="block text-xs text-ink-faint">{check.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        {!rejected && (
          <Card className="grid grid-cols-2 gap-4 p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                CO₂ counted
              </p>
              <p className="tnum text-xl font-semibold text-ink">
                {draft.co2.toFixed(1)} kg
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                Water saved
              </p>
              <p className="tnum text-xl font-semibold text-ink">{draft.water} L</p>
            </div>
          </Card>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={onAgain}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-palm-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-palm-700"
          >
            <Camera size={16} /> Log another
          </button>
          <Link
            href="/leaderboard"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-sand-200 px-4 py-3 text-sm font-medium text-ink transition hover:bg-sand-50"
          >
            <Trophy size={16} /> Leaderboard
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
