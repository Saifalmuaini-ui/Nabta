"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Coins,
  Gauge,
  Shield,
  Sparkles,
  BookOpen,
  Camera,
  Home,
  Landmark,
  MoreHorizontal,
  RotateCcw,
  ShoppingBasket,
  Sprout,
  Trophy,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { num } from "@/lib/format";
import { cx } from "./ui";
import StatusBanner from "./StatusBanner";

interface NavItem {
  href: string;
  /** Dictionary key, resolved per locale at render time. */
  key: string;
  icon: typeof Home;
}

const PRIMARY: NavItem[] = [
  { href: "/", key: "nav.home", icon: Home },
  { href: "/plants", key: "nav.plants", icon: Sprout },
  // Market and rewards share one tab. They are two halves of the same loop,
  // and the bottom bar only holds four items either side of the camera.
  { href: "/market", key: "nav.market", icon: ShoppingBasket },
  { href: "/helper", key: "nav.ask", icon: Sparkles },
];

const SECONDARY: NavItem[] = [
  { href: "/leaderboard", key: "nav.leaderboard", icon: Trophy },
  { href: "/learn", key: "nav.learn", icon: BookOpen },
  { href: "/gov", key: "nav.gov", icon: Landmark },
];

/** Shown only to the roles that can actually open them. */
const GOV_ITEM: NavItem = { href: "/console", key: "nav.console", icon: Gauge };
const ADMIN_ITEM: NavItem = { href: "/admin", key: "nav.admin", icon: Shield };

/**
 * One tap to switch language, always in the header on both layouts.
 * The button shows the language you would move to, not the one you are in,
 * because a control labelled with the current state reads as a status.
 */
function LanguageToggle() {
  const { t, toggle } = useI18n();
  return (
    <button
      onClick={toggle}
      aria-label={t("chrome.languageLabel")}
      className="rounded-full border border-sand-200 bg-white px-3 py-1.5 text-sm font-semibold text-ink-soft transition hover:border-palm-200 hover:text-palm-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palm-500"
    >
      {t("chrome.language")}
    </button>
  );
}

const ALL = [...PRIMARY, ...SECONDARY];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-palm-600 text-base">
        <Sprout size={18} className="text-white" />
      </span>
      <span className="leading-tight">
        <span className="block text-base font-semibold tracking-tight text-ink">
          Nabta
        </span>
        <span className="block text-[11px] text-ink-faint" dir="rtl">
          نبتة
        </span>
      </span>
    </Link>
  );
}

function PointsChip() {
  const { points, ready } = useStore();
  const { t } = useI18n();
  return (
    <Link
      href="/market?view=rewards"
      className="flex items-center gap-2 rounded-full border border-gold-100 bg-gold-50 px-3 py-1.5 transition hover:border-gold-400"
    >
      <Coins size={15} className="text-gold-600" />
      <span className="tnum text-sm font-semibold text-gold-600">
        {ready ? num(points) : "..."}
      </span>
      <span className="hidden text-xs text-gold-600/70 sm:inline">
        {t("chrome.points")}
      </span>
    </Link>
  );
}


function AccountChip() {
  const { enabled, ready, user, profile, signOut } = useAuth();
  if (!enabled) return null;

  if (!ready) {
    return <span className="h-8 w-8 rounded-full bg-sand-100" aria-hidden />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-1.5 rounded-full border border-sand-200 bg-white px-3 py-1.5 text-sm font-medium text-ink transition hover:border-palm-300"
      >
        Sign in
      </Link>
    );
  }

  const label = profile?.name || user.email?.split("@")[0] || "Account";
  const initial = label.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-palm-100 text-sm font-semibold text-palm-700">
        {initial}
      </span>
      <span className="hidden text-sm text-ink sm:inline">{label}</span>
      <button
        onClick={() => void signOut()}
        className="rounded-full border border-sand-200 px-2.5 py-1 text-xs text-ink-faint transition hover:border-clay-200 hover:text-clay"
      >
        Sign out
      </button>
    </div>
  );
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { profile, streak, reset } = useStore();
  const { t } = useI18n();
  const { isGovernment, isAdmin } = useAuth();

  const secondary = [
    ...SECONDARY,
    ...(isGovernment ? [GOV_ITEM] : []),
    ...(isAdmin ? [ADMIN_ITEM] : []),
  ];

  useEffect(() => setMoreOpen(false), [pathname]);

  // The sign-in gate stands alone: no sidebar, no tab bar, no points chip.
  // It is the first thing anyone sees, and none of that chrome is usable yet.
  if (pathname === "/login" || pathname.startsWith("/auth")) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-dvh lg:flex">
      {/* ── desktop sidebar ── */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-e border-sand-200 bg-white px-4 py-6 lg:flex">
        <div className="px-2">
          <Logo />
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {PRIMARY.map((item) => (
            <SideLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}

          <Link
            href="/verify"
            className={cx(
              "mt-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              pathname.startsWith("/verify")
                ? "bg-palm-600 text-white"
                : "bg-palm-500 text-white hover:bg-palm-600",
            )}
          >
            <Camera size={18} />
            {t("nav.verify")}
          </Link>

          <div className="my-4 h-px bg-sand-200" />

          {secondary.map((item) => (
            <SideLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
        </nav>

        <div className="rounded-xl border border-sand-200 bg-sand-50 p-3">
          <p className="text-sm font-medium text-ink">{profile.name}</p>
          <p className="text-xs text-ink-faint">
            {profile.emirate} · {streak}-day streak
          </p>
          <button
            onClick={reset}
            className="mt-3 flex items-center gap-1.5 text-xs text-ink-faint transition hover:text-clay"
          >
            <RotateCcw size={12} /> Reset demo data
          </button>
        </div>
      </aside>

      {/* ── main column ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-sand-200 bg-sand-50/85 px-4 py-3 backdrop-blur lg:hidden">
          <Logo />
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <PointsChip />
            <AccountChip />
          </div>
        </header>

        <div className="hidden justify-end gap-2 px-8 pt-6 lg:flex">
          <LanguageToggle />
          <PointsChip />
          <AccountChip />
        </div>

        <main className="pb-safe mx-auto w-full max-w-5xl flex-1 px-4 pt-6 lg:px-8">
          <StatusBanner />
          {children}
        </main>
      </div>

      {/* ── mobile bottom bar ── */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-sand-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom,0px)]">
          {PRIMARY.slice(0, 2).map((item) => (
            <TabLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}

          <Link
            href="/verify"
            aria-label="Verify with camera"
            className="relative -mt-5 grid h-14 w-14 shrink-0 place-items-center self-start rounded-full bg-palm-600 text-white shadow-lg shadow-palm-900/25 transition active:scale-95"
          >
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-palm-400/40" />
            <Camera size={22} className="relative" />
          </Link>

          {PRIMARY.slice(2).map((item) => (
            <TabLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}

          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-ink-faint transition"
          >
            <MoreHorizontal size={20} />
            <span className="text-[10px] font-medium">{t("nav.more")}</span>
          </button>
        </div>
      </nav>

      {/* ── mobile "more" sheet ── */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-ink/40"
          />
          <div className="animate-rise absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-5 pb-8">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">{t("nav.more")}</p>
              <button onClick={() => setMoreOpen(false)} aria-label={t("chrome.close")}>
                <X size={18} className="text-ink-faint" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {secondary.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-ink transition active:bg-sand-100"
                >
                  <item.icon size={18} className="text-palm-500" />
                  {t(item.key)}
                </Link>
              ))}
              <button
                onClick={() => {
                  reset();
                  setMoreOpen(false);
                }}
                className="mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-clay transition active:bg-clay-50"
              >
                <RotateCcw size={18} />
                {t("chrome.reset")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SideLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  const { t } = useI18n();
  return (
    <Link
      href={item.href}
      className={cx(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
        active
          ? "bg-palm-50 text-palm-600"
          : "text-ink-soft hover:bg-sand-100 hover:text-ink",
      )}
    >
      <Icon size={18} />
      {t(item.key)}
    </Link>
  );
}

function TabLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  const { t } = useI18n();
  return (
    <Link
      href={item.href}
      className={cx(
        "flex flex-1 flex-col items-center gap-0.5 py-2.5 transition",
        active ? "text-palm-600" : "text-ink-faint",
      )}
    >
      <Icon size={20} />
      <span className="text-[10px] font-medium">{t(item.key)}</span>
    </Link>
  );
}

export { ALL as NAV_ITEMS };
