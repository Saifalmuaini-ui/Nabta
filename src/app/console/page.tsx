"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bug,
  CheckCircle2,
  CloudSun,
  Droplets,
  Eye,
  Loader2,
  MapPin,
  Megaphone,
  RadioTower,
  RefreshCw,
  Send,
  ShieldCheck,
  Sprout,
  Users,
  Wheat,
} from "lucide-react";
import { cx } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabase/client";
import { compact, litres, num } from "@/lib/format";
import { AREAS, EMIRATES, type Emirate } from "@/lib/types";

interface Totals {
  growers: number; scans: number; plants: number; districts: number;
  water: number; co2: number; avg_health: number; approved_pct: number;
}
interface District {
  emirate: string; area: string; growers: number; scans: number;
  water: number; co2: number; avg_health: number;
}
interface Comms {
  advisories: number; sent: number; opened: number; acted: number;
  open_pct: number; act_pct: number;
}
interface Effect {
  advisory_id: string; title: string; kind: string; severity: string;
  created_at: string; sent: number; opened: number; acted: number; acted_pct: number;
}

const KINDS = [
  { id: "weather", label: "Weather", ar: "طقس", icon: <CloudSun size={14} /> },
  { id: "pest", label: "Pest", ar: "آفات", icon: <Bug size={14} /> },
  { id: "water", label: "Water", ar: "مياه", icon: <Droplets size={14} /> },
  { id: "seasonal", label: "Seasonal", ar: "موسمي", icon: <Sprout size={14} /> },
  { id: "general", label: "General", ar: "عام", icon: <Megaphone size={14} /> },
] as const;

export default function ConsolePage() {
  const { isGovernment, ready } = useAuth();
  const supabase = supabaseBrowser();

  const [totals, setTotals] = useState<Totals | null>(null);
  const [districts, setDistricts] = useState<District[]>([]);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [comms, setComms] = useState<Comms | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    const [t, d, e, c] = await Promise.all([
      supabase.rpc("gov_totals"),
      supabase.rpc("gov_district_stats"),
      supabase.rpc("gov_advisory_effectiveness"),
      supabase.rpc("gov_comms"),
    ]);
    setTotals((t.data?.[0] as Totals) ?? null);
    setDistricts((d.data as District[]) ?? []);
    setEffects((e.data as Effect[]) ?? []);
    setComms((c.data?.[0] as Comms) ?? null);
    setUpdatedAt(new Date());
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (ready && isGovernment) void load();
    else if (ready) setLoading(false);
  }, [ready, isGovernment, load]);

  if (ready && !isGovernment) {
    return (
      <div className="rounded-2xl bg-palm-900 p-8 text-palm-100">
        <p className="text-sm">
          This console is for municipal accounts. Your account does not have the
          government role.
        </p>
      </div>
    );
  }

  // Communication first: reach and response are what a municipality is buying.
  const sent = Number(comms?.sent ?? 0);
  const openPct = Number(comms?.open_pct ?? 0);
  const actPct = Number(comms?.act_pct ?? 0);

  const top = districts.slice(0, 8);
  const maxTonnes = Math.max(1, ...top.map((d) => d.scans));

  return (
    <div className="overflow-hidden rounded-2xl bg-palm-900 text-white">
      <div className="p-5 sm:p-7">
        {/* ── console toolbar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-palm-700 pb-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">
              Government console
              <span className="ms-2.5 text-sm font-normal text-palm-200" dir="rtl">
                لوحة البلدية
              </span>
            </h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-palm-200">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold-500" />
              Live district data
              {updatedAt && (
                <span className="text-palm-200/70">
                  · updated{" "}
                  {updatedAt.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => void load()}
            className="flex items-center gap-1.5 rounded-lg bg-palm-700 px-3 py-1.5 text-xs font-medium text-palm-100 transition hover:bg-palm-600 hover:text-white"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {loading ? (
          <p className="mt-10 flex items-center gap-2 text-sm text-palm-200">
            <Loader2 size={15} className="animate-spin" /> Loading district data…
          </p>
        ) : (
          <>
            <Band en="Communication" ar="التواصل" note="reach and response" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Tile icon={<Users size={17} />} value={compact(totals?.growers ?? 0)} en="Registered growers" ar="مزارع مسجّل" />
              <Tile icon={<RadioTower size={17} />} value={compact(sent)} en="Advisories delivered" ar="إرشادات مُرسلة" />
              <Tile icon={<Eye size={17} />} value={`${openPct}%`} en="Opened the message" ar="نسبة الفتح" />
              <Tile icon={<CheckCircle2 size={17} />} value={`${actPct}%`} en="Acted within 14 days" ar="استجابوا خلال ١٤ يوماً" />
            </div>

            <Band en="Production" ar="الإنتاج" note="what the channel produced" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Tile icon={<Wheat size={17} />} value={compact(totals?.scans ?? 0)} en="Verified logs" ar="سجلات موثّقة" />
              <Tile icon={<Droplets size={17} />} value={litres(totals?.water ?? 0)} en="Water saved" ar="مياه موفّرة" />
              <Tile icon={<MapPin size={17} />} value={num(totals?.districts ?? 0)} en="Districts active" ar="مناطق نشطة" />
              <Tile icon={<ShieldCheck size={17} />} value={`${totals?.approved_pct ?? 0}%`} en="Passed verification" ar="نسبة التحقق" />
            </div>

            <Band en="Districts" ar="المناطق" />
            <div className="grid gap-3 lg:grid-cols-[1.15fr_1fr]">
              <Panel en="Activity by district" ar="النشاط حسب المنطقة" unit="verified logs">
                <div className="mt-5 flex h-44 items-end gap-2">
                  {top.map((d) => {
                    const h = Math.max(6, (d.scans / maxTonnes) * 100);
                    return (
                      <div key={`${d.emirate}-${d.area}`} className="flex min-w-0 flex-1 flex-col items-center">
                        <span className="tnum mb-1 text-[11px] text-palm-100">{d.scans}</span>
                        <div
                          className="w-full rounded-t bg-gold-500"
                          style={{ height: `${h}%` }}
                          title={`${d.area}: ${d.scans} logs`}
                        />
                        <span className="mt-1.5 w-full truncate text-center text-[9px] text-palm-200">
                          {d.area}
                        </span>
                      </div>
                    );
                  })}
                  {top.length === 0 && (
                    <p className="w-full self-center text-center text-sm text-palm-200">
                      No verified activity yet.
                    </p>
                  )}
                </div>
              </Panel>

              <Panel en="Farm registry" ar="سجل المزارع" unit={`showing ${Math.min(5, districts.length)}`}>
                <table className="mt-4 w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wide text-gold-500">
                      <th className="pb-2 font-semibold">District</th>
                      <th className="pb-2 font-semibold">Growers</th>
                      <th className="pb-2 font-semibold">L / kg</th>
                      <th className="pb-2 font-semibold">Health</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {districts.slice(0, 5).map((d) => {
                      const perKg = d.scans ? Math.round(d.water / d.scans) : 0;
                      return (
                        <tr key={`${d.emirate}-${d.area}`} className="border-t border-palm-700">
                          <td className="py-2 text-white">{d.area}</td>
                          <td className="tnum py-2 text-palm-100">{num(d.growers)}</td>
                          <td className="tnum py-2 text-palm-100">{perKg}</td>
                          <td className="tnum py-2">
                            <span className={cx(
                              "text-xs font-semibold",
                              Number(d.avg_health) >= 80 ? "text-palm-200" : "text-gold-500",
                            )}>
                              {d.avg_health ?? "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {districts.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-sm text-palm-200">
                          No districts reporting.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Panel>
            </div>

            <Band en="Advisories" ar="الإرشادات" note="municipality → household" />
            <div className="grid gap-3 lg:grid-cols-[1fr_1.15fr]">
              <Panel en="Advisory effectiveness" ar="أثر الإرشاد" unit="did it land">
                <ul className="mt-3 space-y-2">
                  {effects.slice(0, 4).map((e) => (
                    <li key={e.advisory_id} className="flex items-center gap-3 border-t border-palm-700 pt-2 first:border-0 first:pt-0">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold-500 text-palm-900">
                        {KINDS.find((k) => k.id === e.kind)?.icon ?? <Megaphone size={14} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-white">{e.title}</p>
                        <p className="tnum text-[11px] text-palm-200">
                          {num(e.sent)} sent · {num(e.opened)} opened · {num(e.acted)} acted
                        </p>
                      </div>
                      <span className="tnum shrink-0 text-sm font-semibold text-gold-500">
                        {e.acted_pct}%
                      </span>
                    </li>
                  ))}
                  {effects.length === 0 && (
                    <li className="py-4 text-center text-sm text-palm-200">
                      Nothing sent yet. Use the composer.
                    </li>
                  )}
                </ul>
              </Panel>

              <Panel en="Send an advisory" ar="إرسال إرشاد" unit="new">
                <Composer supabase={supabase} onSent={load} />
              </Panel>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs">
              <p className="text-palm-200">
                Simulated data — one pilot emirate, one season.
              </p>
              <p className="text-gold-500" dir="rtl">
                بيانات تجريبية — منطقة واحدة
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Section label between tile bands, so the page reads as a dashboard. */
function Band({ en, ar, note }: { en: string; ar: string; note?: string }) {
  return (
    <div className="mb-2.5 mt-7 flex items-baseline justify-between gap-3 first:mt-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-gold-500">
        {en}
        {note && <span className="ms-2 font-normal normal-case tracking-normal text-palm-200">{note}</span>}
      </p>
      <p className="shrink-0 text-[11px] text-palm-200" dir="rtl">{ar}</p>
    </div>
  );
}

function Tile({
  icon, value, en, ar,
}: {
  icon: React.ReactNode; value: string; en: string; ar: string;
}) {
  return (
    <div className="rounded-xl bg-palm-700 p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold-500 text-palm-900">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="tnum text-xl font-semibold leading-tight text-white">{value}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-palm-200">{en}</p>
          <p className="text-[10px] text-gold-500" dir="rtl">{ar}</p>
        </div>
      </div>
    </div>
  );
}

function Panel({
  en, ar, unit, children,
}: {
  en: string; ar: string; unit?: string; children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-palm-700 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-gold-500">
          {en}
          {unit && <span className="ms-2 font-normal normal-case text-palm-200">{unit}</span>}
        </p>
        <p className="shrink-0 text-[11px] text-palm-200" dir="rtl">{ar}</p>
      </div>
      {children}
    </section>
  );
}

function Composer({
  supabase, onSent,
}: {
  supabase: ReturnType<typeof supabaseBrowser>; onSent: () => void;
}) {
  const [kind, setKind] = useState<string>("weather");
  const [severity, setSeverity] = useState("warning");
  const [emirate, setEmirate] = useState<Emirate>("Sharjah");
  const [areas, setAreas] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [bodyAr, setBodyAr] = useState("");
  const [reach, setReach] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const inEmirate = useMemo(() => AREAS.filter((a) => a.emirate === emirate), [emirate]);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase
      .rpc("gov_reach", { p_emirate: emirate, p_areas: areas.length ? areas : null })
      .then(({ data }) => {
        if (alive) setReach(typeof data === "number" ? data : null);
      });
    return () => {
      alive = false;
    };
  }, [supabase, emirate, areas]);

  async function send() {
    if (!supabase || !title.trim() || !body.trim()) return;
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.from("advisories").insert({
      kind,
      severity,
      emirate,
      areas: areas.length ? areas : null,
      title: title.trim(),
      title_ar: titleAr.trim() || null,
      body: body.trim(),
      body_ar: bodyAr.trim() || null,
    });
    setBusy(false);
    if (error) {
      setMsg({ ok: false, text: error.message });
      return;
    }
    setMsg({ ok: true, text: `Delivered to ${num(reach ?? 0)} growers.` });
    setTitle(""); setBody(""); setTitleAr(""); setBodyAr("");
    onSent();
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((k) => (
          <button
            key={k.id}
            onClick={() => setKind(k.id)}
            className={cx(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
              kind === k.id
                ? "bg-gold-500 text-palm-900"
                : "bg-palm-900/50 text-palm-100 hover:bg-palm-900",
            )}
          >
            {k.icon} {k.label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Select value={emirate} onChange={(v) => { setEmirate(v as Emirate); setAreas([]); }} label="Emirate">
          {EMIRATES.map((e) => <option key={e}>{e}</option>)}
        </Select>
        <Select value={severity} onChange={setSeverity} label="Severity">
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="urgent">Urgent</option>
        </Select>
      </div>

      <p className="mb-1.5 mt-3 text-[10px] uppercase tracking-wide text-gold-500">
        Target area <span className="normal-case text-palm-200">none = whole emirate</span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {inEmirate.map((a) => {
          const on = areas.includes(a.name);
          return (
            <button
              key={a.name}
              onClick={() =>
                setAreas((p) => (on ? p.filter((x) => x !== a.name) : [...p, a.name]))
              }
              className={cx(
                "rounded-lg px-2 py-1 text-[11px] transition",
                on ? "bg-gold-500 text-palm-900" : "bg-palm-900/50 text-palm-100 hover:bg-palm-900",
              )}
            >
              {a.name}
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Input value={title} onChange={setTitle} placeholder="Heat warning: 46C Thursday" />
        <Input value={titleAr} onChange={setTitleAr} placeholder="تحذير من ارتفاع الحرارة" rtl />
        <Input value={body} onChange={setBody} placeholder="Move plants into shade, water at dawn." />
        <Input value={bodyAr} onChange={setBodyAr} placeholder="انقل النباتات إلى الظل" rtl />
      </div>

      {msg && (
        <p className={cx("mt-2 text-xs", msg.ok ? "text-palm-200" : "text-gold-400")}>
          {msg.text}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11px] text-palm-200">
          Reaches{" "}
          <span className="tnum font-semibold text-white">
            {reach === null ? "…" : num(reach)}
          </span>{" "}
          growers
        </p>
        <button
          onClick={send}
          disabled={busy || !title.trim() || !body.trim()}
          className="flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2 text-sm font-semibold text-palm-900 transition hover:bg-gold-400 disabled:opacity-40"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Send
        </button>
      </div>
    </div>
  );
}

function Input({
  value, onChange, placeholder, rtl,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; rtl?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      dir={rtl ? "rtl" : undefined}
      className="w-full rounded-lg bg-palm-900/50 px-3 py-2 text-sm text-white outline-none placeholder:text-palm-200/60 focus:bg-palm-900"
    />
  );
}

function Select({
  value, onChange, label, children,
}: {
  value: string; onChange: (v: string) => void; label: string; children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wide text-gold-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-palm-900/50 px-3 py-2 text-sm text-white outline-none focus:bg-palm-900"
      >
        {children}
      </select>
    </label>
  );
}
