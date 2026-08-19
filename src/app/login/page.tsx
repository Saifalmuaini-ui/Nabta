"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, Landmark, Loader2, Lock, Mail, ShieldCheck, Sprout, User } from "lucide-react";
import { cx } from "@/components/ui";
import { useAuth } from "@/lib/auth";

type Mode = "signin" | "signup";

function LoginInner() {
  const { enabled, signIn, signUp, signInWithGoogle } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const oauthError = params.get("error");

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(oauthError);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    const err =
      mode === "signin"
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, name.trim());

    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    if (mode === "signup") {
      setNotice(
        "Account created. If email confirmation is on for this project, open the link in your inbox before signing in.",
      );
      setMode("signin");
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function google() {
    setBusy(true);
    setError(null);
    const err = await signInWithGoogle();
    if (err) {
      setError(err);
      setBusy(false);
    }
    // On success the browser leaves for Google, so no state reset here.
  }

  return (
    <main className="min-h-dvh lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* ── brand panel ── */}
      <section className="relative overflow-hidden bg-palm-700 px-6 py-10 text-white sm:px-10 lg:flex lg:flex-col lg:justify-between lg:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-palm-500/40 blur-3xl"
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 text-xl backdrop-blur">
              <Sprout size={22} className="text-white" />
            </span>
            <span className="leading-tight">
              <span className="block text-lg font-semibold tracking-tight">Nabta</span>
              <span className="block text-sm text-palm-200" dir="rtl">
                نبتة
              </span>
            </span>
          </div>

          <h1 className="mt-8 max-w-md text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
            Plant it. Verify it. Earn from it.
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-palm-100" dir="rtl">
            ازرع، وتحقّق، واكسب
          </p>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-palm-100">
            Photograph what you grow. AI checks it. Your points, your plants and
            your water record follow your account, not your phone.
          </p>
        </div>

        <ul className="relative mt-10 space-y-3 lg:mt-0">
          {[
            { icon: <Camera size={15} />, en: "One photo, fifteen seconds", ar: "صورة واحدة" },
            { icon: <Sprout size={15} />, en: "Your plants, tracked over time", ar: "نباتاتك عبر الوقت" },
            { icon: <Landmark size={15} />, en: "Guidance straight from the city", ar: "إرشاد من البلدية" },
          ].map((f) => (
            <li key={f.en} className="flex items-center gap-3 text-sm text-palm-100">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10">
                {f.icon}
              </span>
              <span className="flex-1">{f.en}</span>
              <span className="text-xs text-palm-200" dir="rtl">
                {f.ar}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── form panel ── */}
      <section className="flex items-center justify-center bg-sand-50 px-6 py-10 sm:px-10">
        <div className="w-full max-w-sm">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            {mode === "signin" ? "Sign in" : "Create your account"}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {mode === "signin"
              ? "Welcome back."
              : "It takes a moment, and your record starts from here."}
          </p>

          {!enabled && (
            <p className="mt-4 rounded-lg bg-gold-50 px-3 py-2 text-xs leading-relaxed text-gold-700">
              No Supabase project is attached, so sign-in is unavailable and the
              app is running from local storage only.
            </p>
          )}

          <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-sand-100 p-1">
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                  setNotice(null);
                }}
                className={cx(
                  "rounded-lg px-3 py-2 text-sm font-medium transition",
                  mode === m ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink",
                )}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-5 space-y-3">
            {mode === "signup" && (
              <Field
                icon={<User size={15} />}
                label="Name"
                value={name}
                onChange={setName}
                type="text"
                placeholder="Fatima Al Suwaidi"
                required
              />
            )}
            <Field
              icon={<Mail size={15} />}
              label="Email"
              value={email}
              onChange={setEmail}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
            <Field
              icon={<Lock size={15} />}
              label="Password"
              value={password}
              onChange={setPassword}
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder="At least 6 characters"
              required
              minLength={6}
            />

            {error && (
              <p className="rounded-lg bg-clay-50 px-3 py-2 text-sm text-clay-700">{error}</p>
            )}
            {notice && (
              <p className="rounded-lg bg-palm-50 px-3 py-2 text-sm text-palm-700">{notice}</p>
            )}

            <button
              type="submit"
              disabled={busy || !enabled}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-palm-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-palm-700 disabled:opacity-50"
            >
              {busy && <Loader2 size={15} className="animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-ink-faint">
            <span className="h-px flex-1 bg-sand-200" />
            or
            <span className="h-px flex-1 bg-sand-200" />
          </div>

          <button
            type="button"
            onClick={google}
            disabled={busy || !enabled}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-white/60 disabled:opacity-50"
          >
            <GoogleMark />
            Continue with Google
          </button>

          <DemoAccounts
            onPick={(em, pw) => {
              setMode("signin");
              setEmail(em);
              setPassword(pw);
              setError(null);
              setNotice(null);
            }}
          />

          <p className="mt-6 text-center text-xs leading-relaxed text-ink-faint">
            Anything logged on this device before signing in is uploaded to your
            account the first time you sign in.
          </p>
        </div>
      </section>
    </main>
  );
}

/**
 * Demo logins, printed on the gate so a judge can move between the three
 * roles without being handed a password. Remove this block before anything
 * resembling production.
 */
const DEMO = [
  {
    role: "User",
    ar: "مستخدم",
    email: "user@nabta.ae",
    password: "NabtaUser123!",
    blurb: "The grower. The app as it is.",
    icon: <Sprout size={14} />,
    tone: "palm",
  },
  {
    role: "Government",
    ar: "حكومة",
    email: "gov@nabta.ae",
    password: "NabtaGov123!",
    blurb: "District dashboard, sends alerts.",
    icon: <Landmark size={14} />,
    tone: "gold",
  },
  {
    role: "Admin",
    ar: "إدارة",
    email: "admin@nabta.ae",
    password: "NabtaAdmin123!",
    blurb: "Sees and edits everything.",
    icon: <ShieldCheck size={14} />,
    tone: "clay",
  },
] as const;

function DemoAccounts({ onPick }: { onPick: (email: string, password: string) => void }) {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-sand-300 bg-white/60 p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
        Demo accounts — tap to fill
      </p>
      <div className="space-y-1.5">
        {DEMO.map((d) => (
          <button
            key={d.email}
            type="button"
            onClick={() => onPick(d.email, d.password)}
            className="flex w-full items-center gap-2.5 rounded-lg border border-sand-200 bg-white px-2.5 py-2 text-left transition hover:border-palm-300"
          >
            <span
              className={cx(
                "grid h-7 w-7 shrink-0 place-items-center rounded-lg",
                d.tone === "palm"
                  ? "bg-palm-50 text-palm-600"
                  : d.tone === "gold"
                    ? "bg-gold-50 text-gold-600"
                    : "bg-clay-50 text-clay",
              )}
            >
              {d.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-1.5">
                <span className="text-xs font-semibold text-ink">{d.role}</span>
                <span className="text-[10px] text-ink-faint" dir="rtl">{d.ar}</span>
              </span>
              <span className="block truncate text-[11px] text-ink-faint">{d.blurb}</span>
            </span>
            <span className="hidden shrink-0 text-right sm:block">
              <span className="block text-[10px] text-ink-soft">{d.email}</span>
              <span className="block font-mono text-[10px] text-ink-faint">{d.password}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-ink-faint sm:hidden">
        user@nabta.ae · NabtaUser123! — gov@nabta.ae · NabtaGov123! —
        admin@nabta.ae · NabtaAdmin123!
      </p>
    </div>
  );
}

function Field({
  icon,
  label,
  value,
  onChange,
  ...rest
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-soft">{label}</span>
      <span className="flex items-center gap-2 rounded-xl border border-sand-200 bg-white px-3 focus-within:border-palm-400">
        <span className="text-ink-faint">{icon}</span>
        <input
          {...rest}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint"
        />
      </span>
    </label>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.2-.4-4.6H24v9.1h12.4c-.5 2.9-2.1 5.3-4.6 7l7.6 5.9c4.4-4.1 6.7-10.1 6.7-17.4z" />
      <path fill="#FBBC05" d="M10.4 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.8 2.3-8.3 2.3-6.3 0-11.7-3.7-13.6-9.1l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
