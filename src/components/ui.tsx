import type { ReactNode } from "react";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/**
 * Direction for a specific run of text, which is not always the page direction.
 *
 * In an RTL document, a paragraph of English inherits RTL, and the bidi
 * algorithm then places trailing neutral characters by paragraph direction.
 * A full stop ends up at the left of the sentence, reading ".like this". The
 * fix is to declare the direction of the text itself rather than let it
 * inherit, which also matters permanently for content that stays in one
 * language, such as species names and partner brands.
 */
export function dirOf(text: string | undefined): "rtl" | "ltr" | undefined {
  if (!text) return undefined;
  // Arabic, Arabic Supplement and Arabic Presentation Forms.
  return /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/.test(text)
    ? "rtl"
    : "ltr";
}

export function Card({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  return (
    <Tag
      className={cx(
        "rounded-[1.25rem] border border-sand-200 bg-white",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function PageHeader({
  eyebrow,
  title,
  arabic,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  arabic?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p
            dir={dirOf(eyebrow)}
            className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-palm-500"
          >
            {eyebrow}
          </p>
        )}
        <h1
          dir={dirOf(title)}
          className="flex flex-wrap items-baseline gap-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl"
        >
          {title}
          {arabic && (
            <span className="text-lg font-normal text-ink-faint" dir="rtl">
              {arabic}
            </span>
          )}
        </h1>
        {subtitle && (
          <p
            dir={dirOf(subtitle)}
            className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft"
          >
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}

export function SectionTitle({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-soft">
        {children}
      </h2>
      {hint && <div className="text-xs text-ink-faint">{hint}</div>}
    </div>
  );
}

const PILL_TONES = {
  palm: "bg-palm-50 text-palm-600 ring-palm-100",
  gold: "bg-gold-50 text-gold-600 ring-gold-100",
  sand: "bg-sand-100 text-ink-soft ring-sand-200",
  clay: "bg-clay-50 text-clay ring-clay/20",
  sky: "bg-sky-tag/10 text-sky-tag ring-sky-tag/20",
} as const;

export function Pill({
  children,
  tone = "sand",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof PILL_TONES;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        PILL_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Bar({
  value,
  max,
  tone = "palm",
}: {
  value: number;
  max: number;
  tone?: "palm" | "gold";
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-sand-100"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cx(
          "h-full rounded-full transition-[width] duration-700 ease-out",
          tone === "palm" ? "bg-palm-500" : "bg-gold-400",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  icon,
  tone = "plain",
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: ReactNode;
  tone?: "plain" | "palm" | "gold";
}) {
  return (
    <Card
      className={cx(
        "p-4",
        tone === "palm" && "border-palm-100 bg-palm-50",
        tone === "gold" && "border-gold-100 bg-gold-50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
          {label}
        </p>
        {icon && <span className="text-ink-faint">{icon}</span>}
      </div>
      <p className="tnum mt-2 text-2xl font-semibold tracking-tight text-ink">
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-ink-faint">{sub}</p>}
    </Card>
  );
}

export function Empty({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <div className="mb-1 text-ink-faint">{icon}</div>
      <p dir={dirOf(title)} className="font-medium text-ink">
        {title}
      </p>
      <p dir={dirOf(body)} className="max-w-sm text-sm text-ink-soft">
        {body}
      </p>
    </Card>
  );
}

export function DemoNote({ children }: { children: ReactNode }) {
  return (
    <p
      dir={typeof children === "string" ? dirOf(children) : undefined}
      className="mt-6 rounded-xl border border-dashed border-sand-300 bg-sand-100/60 px-4 py-3 text-xs leading-relaxed text-ink-soft"
    >
      {children}
    </p>
  );
}
