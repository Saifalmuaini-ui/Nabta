"use client";

import { useState } from "react";
import Link from "next/link";
import { Camera, Check, Copy, Gift, Lock, X } from "lucide-react";
import { Bar, Card, DemoNote, Empty, PageHeader, Pill, SectionTitle, cx } from "./ui";
import DataIcon, { IconTile } from "@/components/DataIcon";
import { useStore } from "@/lib/store";
import { REWARDS } from "@/lib/data";
import { num, timeAgo } from "@/lib/format";
import type { Redemption, Reward, RewardKind } from "@/lib/types";

const FILTERS: { id: RewardKind | "all"; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "discount", label: "Discounts" },
  { id: "supplies", label: "Seeds & supplies" },
  { id: "tools", label: "Tools" },
  { id: "voucher", label: "Vouchers" },
];

export function RewardsSection() {
  const { points, redemptions, redeem, ready } = useStore();
  const [filter, setFilter] = useState<RewardKind | "all">("all");
  const [confirming, setConfirming] = useState<Reward | null>(null);
  const [issued, setIssued] = useState<Redemption | null>(null);
  const [copied, setCopied] = useState(false);

  const list = REWARDS.filter((r) => filter === "all" || r.kind === filter).sort(
    (a, b) => a.cost - b.cost,
  );

  function confirmRedeem() {
    if (!confirming) return;
    const result = redeem(confirming);
    setConfirming(null);
    if (result) {
      setIssued(result);
      setCopied(false);
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Redeem"
        title="Rewards"
        arabic="المكافآت"
        subtitle="Points come from verified work in the ground. Spend them on the things that keep that work going, or on something for yourself."
        action={
          <div className="rounded-xl border border-gold-100 bg-gold-50 px-4 py-3 text-end">
            <p className="text-xs font-medium uppercase tracking-wide text-gold-600">
              Balance
            </p>
            <p className="tnum text-2xl font-semibold text-ink">
              {ready ? num(points) : "..."}
            </p>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cx(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
              filter === f.id
                ? "bg-palm-600 text-white"
                : "border border-sand-200 bg-white text-ink-soft hover:text-ink",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((r) => {
          const affordable = points >= r.cost;
          return (
            <Card key={r.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <IconTile emoji={r.emoji} size={20} className="h-11 w-11" tone="gold" />
                <Pill tone={affordable ? "palm" : "sand"}>
                  {affordable ? "Available" : <><Lock size={11} /> Locked</>}
                </Pill>
              </div>

              <p className="mt-3 font-medium leading-snug text-ink">{r.title}</p>
              <p className="text-xs text-ink-faint">{r.partner}</p>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
                {r.description}
              </p>

              <div className="mt-4">
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="tnum text-lg font-semibold text-gold-600">
                    {num(r.cost)} pts
                  </span>
                  <span className="text-xs text-ink-faint line-through">{r.value}</span>
                </div>
                {!affordable && (
                  <>
                    <Bar value={points} max={r.cost} tone="gold" />
                    <p className="tnum mt-1.5 text-xs text-ink-faint">
                      {num(r.cost - points)} points to go
                    </p>
                  </>
                )}
              </div>

              <button
                disabled={!affordable}
                onClick={() => setConfirming(r)}
                className={cx(
                  "mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                  affordable
                    ? "bg-palm-600 text-white hover:bg-palm-700"
                    : "cursor-not-allowed bg-sand-100 text-ink-faint",
                )}
              >
                {affordable ? "Redeem" : "Keep growing"}
              </button>

              <p className="mt-2 text-center text-[11px] text-ink-faint">
                {r.stock} left this month
              </p>
            </Card>
          );
        })}
      </div>

      <section className="mt-9">
        <SectionTitle hint={`${redemptions.length} redeemed`}>Your vouchers</SectionTitle>
        {redemptions.length === 0 ? (
          <Empty
            icon={<Gift size={28} />}
            title="No vouchers yet"
            body="Redeem anything above and the code appears here, ready to show at the counter."
          />
        ) : (
          <Card className="divide-y divide-sand-200">
            {redemptions.map((rd) => (
              <div key={rd.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{rd.title}</p>
                  <p className="text-xs text-ink-faint">
                    {rd.partner} · {timeAgo(rd.createdAt)} · {num(rd.cost)} pts
                  </p>
                </div>
                <button
                  onClick={() => copyCode(rd.code)}
                  className="flex items-center gap-2 rounded-lg border border-sand-200 px-3 py-1.5 font-mono text-xs text-ink transition hover:bg-sand-50"
                >
                  {rd.code}
                  <Copy size={12} className="text-ink-faint" />
                </button>
              </div>
            ))}
          </Card>
        )}
      </section>

      <Card className="mt-6 flex flex-wrap items-center justify-between gap-4 border-palm-200 bg-palm-50 p-5">
        <div>
          <p className="font-medium text-ink">Short on points?</p>
          <p className="mt-1 text-sm text-ink-soft">
            A verified planting is worth 60, and a native sapling carries a 50-point bonus on top.
          </p>
        </div>
        <Link
          href="/verify"
          className="flex items-center gap-2 rounded-xl bg-palm-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-palm-700"
        >
          <Camera size={16} /> Log something
        </Link>
      </Card>

      <DemoNote>
        Prototype: partner names and offers are placeholders. Redemption issues a locally
        generated code and does not contact any merchant.
      </DemoNote>

      {/* ── confirm dialog ── */}
      {confirming && (
        <Modal onClose={() => setConfirming(null)}>
          <IconTile emoji={confirming.emoji} size={26} className="mx-auto h-14 w-14" tone="gold" />
          <h2 className="mt-3 text-lg font-semibold text-ink">{confirming.title}</h2>
          <p className="mt-1 text-sm text-ink-soft">{confirming.partner}</p>
          <div className="mt-5 space-y-1.5 rounded-xl bg-sand-100 px-4 py-3 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-soft">Cost</span>
              <span className="tnum font-medium text-ink">{num(confirming.cost)} pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Balance after</span>
              <span className="tnum font-medium text-ink">
                {num(points - confirming.cost)} pts
              </span>
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => setConfirming(null)}
              className="flex-1 rounded-xl border border-sand-200 px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-sand-50"
            >
              Cancel
            </button>
            <button
              onClick={confirmRedeem}
              className="flex-1 rounded-xl bg-palm-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-palm-700"
            >
              Confirm
            </button>
          </div>
        </Modal>
      )}

      {/* ── voucher issued ── */}
      {issued && (
        <Modal onClose={() => setIssued(null)}>
          <span className="grid h-12 w-12 place-items-center rounded-full bg-palm-50 text-palm-600">
            <Check size={26} />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-ink">Redeemed</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {issued.title} · {issued.partner}
          </p>
          <div className="mt-5 w-full rounded-xl border border-dashed border-palm-200 bg-palm-50 px-4 py-5 text-center">
            <p className="text-xs uppercase tracking-wide text-palm-600">Your code</p>
            <p className="mt-1 font-mono text-xl font-semibold tracking-wider text-ink">
              {issued.code}
            </p>
          </div>
          <button
            onClick={() => copyCode(issued.code)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-sand-200 px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-sand-50"
          >
            {copied ? <Check size={15} className="text-palm-600" /> : <Copy size={15} />}
            {copied ? "Copied" : "Copy code"}
          </button>
          <button
            onClick={() => setIssued(null)}
            className="mt-2 w-full rounded-xl bg-palm-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-palm-700"
          >
            Done
          </button>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40"
      />
      <div className="animate-rise relative w-full max-w-sm rounded-t-3xl bg-white p-6 pb-8 sm:rounded-3xl sm:pb-6">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute end-4 top-4 text-ink-faint transition hover:text-ink"
        >
          <X size={18} />
        </button>
        <div className="flex flex-col items-center text-center">{children}</div>
      </div>
    </div>
  );
}
