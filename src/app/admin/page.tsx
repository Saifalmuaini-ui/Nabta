"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Database,
  Landmark,
  Loader2,
  Megaphone,
  Save,
  Search,
  Shield,
  Sprout,
  Trash2,
  User as UserIcon,
  Users,
} from "lucide-react";
import { Card, DemoNote, PageHeader, Pill, SectionTitle, cx } from "@/components/ui";
import { useAuth, type Role } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabase/client";
import { num, timeAgo } from "@/lib/format";
import { AREAS, EMIRATES, type Emirate } from "@/lib/types";

interface AdminUser {
  id: string; name: string | null; email: string; role: Role;
  area: string | null; emirate: string | null; created_at: string;
  scans: number; plants: number; points: number; last_scan: string | null;
}
interface Stats {
  users: number; admins: number; governments: number;
  real_scans: number; demo_scans: number; plants: number; advisories: number;
}

const ROLES: { id: Role; label: string; tone: "palm" | "gold" | "clay" }[] = [
  { id: "user", label: "User", tone: "palm" },
  { id: "government", label: "Government", tone: "gold" },
  { id: "admin", label: "Admin", tone: "clay" },
];

export default function AdminPage() {
  const { isAdmin, ready } = useAuth();
  const supabase = supabaseBrowser();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    const [u, s] = await Promise.all([
      supabase.rpc("admin_list_users"),
      supabase.rpc("admin_stats"),
    ]);
    setUsers((u.data as AdminUser[]) ?? []);
    setStats((s.data?.[0] as Stats) ?? null);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (ready && isAdmin) void load();
    else if (ready) setLoading(false);
  }, [ready, isAdmin, load]);

  async function setRole(id: string, role: Role) {
    if (!supabase) return;
    const { error } = await supabase.rpc("admin_set_role", { p_user: id, p_role: role });
    if (error) { setToast(error.message); return; }
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    setToast("Role updated.");
  }

  async function saveProfile(id: string, patch: Partial<AdminUser>) {
    if (!supabase) return;
    const { error } = await supabase
      .from("profiles")
      .update({ name: patch.name, area: patch.area, emirate: patch.emirate })
      .eq("id", id);
    if (error) { setToast(error.message); return; }
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
    setEditing(null);
    setToast("Profile saved.");
  }

  async function wipeScans(id: string, email: string) {
    if (!supabase) return;
    if (!confirm(`Delete every scan belonging to ${email}? This cannot be undone.`)) return;
    const { error } = await supabase.from("scans").delete().eq("user_id", id);
    if (error) { setToast(error.message); return; }
    setToast("Scans deleted.");
    void load();
  }

  if (ready && !isAdmin) {
    return (
      <div className="pb-4">
        <PageHeader eyebrow="Restricted" title="Admin" />
        <Card className="p-6 text-sm text-ink-soft">
          This area is for administrator accounts only.
        </Card>
      </div>
    );
  }

  const filtered = users.filter((u) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return (
      (u.name ?? "").toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s) ||
      (u.area ?? "").toLowerCase().includes(s) ||
      u.role.includes(s)
    );
  });

  return (
    <div className="pb-4">
      <PageHeader
        eyebrow="Administrator"
        title="Admin console"
        arabic="لوحة الإدارة"
        subtitle="Every account, every record. Change roles, correct details, and remove data on request."
      />

      {toast && (
        <div className="mb-4 rounded-xl bg-palm-50 px-4 py-2.5 text-sm text-palm-700">
          {toast}
        </div>
      )}

      {loading ? (
        <Card className="flex items-center gap-2 p-6 text-sm text-ink-soft">
          <Loader2 size={15} className="animate-spin" /> Loading accounts…
        </Card>
      ) : (
        <>
          <section className="mb-9">
            <SectionTitle>Platform</SectionTitle>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Tile icon={<Users size={15} />} label="Accounts" value={num(stats?.users ?? 0)} />
              <Tile icon={<Landmark size={15} />} label="Government" value={num(stats?.governments ?? 0)} />
              <Tile icon={<Shield size={15} />} label="Admins" value={num(stats?.admins ?? 0)} />
              <Tile icon={<Megaphone size={15} />} label="Alerts sent" value={num(stats?.advisories ?? 0)} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Tile icon={<Database size={15} />} label="Real scans" value={num(stats?.real_scans ?? 0)} tone="palm" />
              <Tile icon={<Database size={15} />} label="Demo scans" value={num(stats?.demo_scans ?? 0)} />
              <Tile icon={<Sprout size={15} />} label="Plants" value={num(stats?.plants ?? 0)} />
            </div>
          </section>

          <section className="mb-9">
            <SectionTitle hint={`${filtered.length} of ${users.length}`}>Accounts</SectionTitle>

            <label className="mb-3 flex items-center gap-2 rounded-xl border border-sand-200 bg-white px-3">
              <Search size={15} className="text-ink-faint" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, email, district or role"
                className="w-full bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint"
              />
            </label>

            <div className="space-y-2">
              {filtered.map((u) =>
                editing === u.id ? (
                  <EditRow
                    key={u.id}
                    user={u}
                    onCancel={() => setEditing(null)}
                    onSave={(patch) => saveProfile(u.id, patch)}
                  />
                ) : (
                  <Card key={u.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-medium text-ink">
                          <UserIcon size={14} className="text-ink-faint" />
                          {u.name || u.email.split("@")[0]}
                          <Pill tone={ROLES.find((r) => r.id === u.role)?.tone ?? "palm"}>
                            {u.role}
                          </Pill>
                        </p>
                        <p className="mt-0.5 truncate text-xs text-ink-faint">
                          {u.email} · {u.area ?? "—"}, {u.emirate ?? "—"}
                        </p>
                        <p className="tnum mt-1 text-xs text-ink-faint">
                          {num(u.scans)} scans · {num(u.plants)} plants · {num(u.points)} pts
                          {u.last_scan ? ` · last ${timeAgo(new Date(u.last_scan).getTime())}` : " · never scanned"}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {ROLES.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => setRole(u.id, r.id)}
                            disabled={u.role === r.id}
                            className={cx(
                              "rounded-lg border px-2.5 py-1 text-xs transition",
                              u.role === r.id
                                ? "border-palm-400 bg-palm-50 font-medium text-palm-700"
                                : "border-sand-200 text-ink-soft hover:border-palm-300",
                            )}
                          >
                            {r.label}
                          </button>
                        ))}
                        <button
                          onClick={() => setEditing(u.id)}
                          className="rounded-lg border border-sand-200 px-2.5 py-1 text-xs text-ink-soft transition hover:border-palm-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => wipeScans(u.id, u.email)}
                          title="Delete this account's scans"
                          className="rounded-lg border border-sand-200 px-2 py-1 text-xs text-ink-faint transition hover:border-clay-200 hover:text-clay"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </Card>
                ),
              )}
              {filtered.length === 0 && (
                <Card className="p-6 text-center text-sm text-ink-soft">No accounts match.</Card>
              )}
            </div>
          </section>
        </>
      )}

      <DemoNote>
        Role changes take effect the next time that account loads a page. Admin
        rights are enforced in the database, not in this screen: the underlying
        policies check the caller&apos;s role on every read and write.
      </DemoNote>
    </div>
  );
}

function Tile({
  icon, label, value, tone,
}: {
  icon: React.ReactNode; label: string; value: string; tone?: "palm";
}) {
  return (
    <Card className="p-4">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-ink-faint">
        {icon} {label}
      </p>
      <p className={cx("tnum mt-1.5 text-2xl font-semibold", tone === "palm" ? "text-palm-600" : "text-ink")}>
        {value}
      </p>
    </Card>
  );
}

function EditRow({
  user, onSave, onCancel,
}: {
  user: AdminUser;
  onSave: (patch: Partial<AdminUser>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(user.name ?? "");
  const [emirate, setEmirate] = useState<Emirate>((user.emirate as Emirate) ?? "Sharjah");
  const [area, setArea] = useState(user.area ?? "");

  const areas = AREAS.filter((a) => a.emirate === emirate);

  return (
    <Card className="border-palm-200 bg-palm-50/40 p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-palm-700">
        Editing {user.email}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-soft">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-palm-400"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-soft">Emirate</span>
          <select
            value={emirate}
            onChange={(e) => { setEmirate(e.target.value as Emirate); setArea(""); }}
            className="w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-ink"
          >
            {EMIRATES.map((e) => <option key={e}>{e}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-soft">District</span>
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-ink"
          >
            <option value="">—</option>
            {areas.map((a) => <option key={a.name}>{a.name}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-xl border border-sand-200 px-3 py-1.5 text-sm text-ink-soft transition hover:border-ink-faint"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave({ name, area, emirate })}
          className="flex items-center gap-1.5 rounded-xl bg-palm-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-palm-700"
        >
          <Save size={14} /> Save
        </button>
      </div>
    </Card>
  );
}
