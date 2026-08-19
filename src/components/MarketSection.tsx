"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Gift,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Star,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { Card, DemoNote, Empty, PageHeader, Pill, cx } from "./ui";
import DataIcon, { IconTile } from "@/components/DataIcon";
import { useStore } from "@/lib/store";
import { aed, timeAgo } from "@/lib/format";
import { EMIRATES, type Emirate, type Listing, type ListingKind } from "@/lib/types";

const KINDS: { id: ListingKind | "all"; label: string; icon?: typeof Tag }[] = [
  { id: "all", label: "All listings" },
  { id: "sell", label: "For sale", icon: Tag },
  { id: "trade", label: "Swap", icon: ArrowLeftRight },
  { id: "give", label: "Free", icon: Gift },
];

const CATEGORIES: Listing["category"][] = [
  "Seeds",
  "Seedlings",
  "Produce",
  "Tools",
  "Compost",
  "Know-how",
];

export function MarketSection() {
  const { listings, profile, addListing, removeListing } = useStore();
  const [kind, setKind] = useState<ListingKind | "all">("all");
  const [category, setCategory] = useState<Listing["category"] | "all">("all");
  const [emirate, setEmirate] = useState<Emirate | "all">("all");
  const [query, setQuery] = useState("");
  const [composing, setComposing] = useState(false);
  const [contacted, setContacted] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings
      .filter((l) => kind === "all" || l.kind === kind)
      .filter((l) => category === "all" || l.category === category)
      .filter((l) => emirate === "all" || l.emirate === emirate)
      .filter(
        (l) =>
          !q ||
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.seller.toLowerCase().includes(q),
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [listings, kind, category, emirate, query]);

  return (
    <div>
      <PageHeader
        eyebrow="Grower marketplace"
        title="Market"
        arabic="السوق"
        subtitle="Sell surplus, swap seed, or give away what you cannot use. One market for every grower in the country instead of seven disconnected ones."
        action={
          <button
            onClick={() => setComposing(true)}
            className="flex items-center gap-2 rounded-xl bg-palm-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-palm-700"
          >
            <Plus size={16} /> New listing
          </button>
        }
      />

      {/* ── filters ── */}
      <div className="mb-5 space-y-3">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search seeds, tools, produce, growers…"
            className="w-full rounded-xl border border-sand-200 bg-white py-2.5 ps-10 pe-4 text-sm text-ink placeholder:text-ink-faint focus:border-palm-400 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {KINDS.map((k) => (
            <button
              key={k.id}
              onClick={() => setKind(k.id)}
              className={cx(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                kind === k.id
                  ? "bg-palm-600 text-white"
                  : "border border-sand-200 bg-white text-ink-soft hover:text-ink",
              )}
            >
              {k.icon && <k.icon size={13} />}
              {k.label}
            </button>
          ))}

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Listing["category"] | "all")}
            className="rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-ink"
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

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
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty
          icon={<Search size={28} />}
          title="Nothing matches those filters"
          body="Try widening the category or emirate, or post what you are looking for as a swap."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((l) => (
            <Card key={l.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <IconTile emoji={l.emoji} size={20} className="h-11 w-11" />
                <Pill
                  tone={l.kind === "sell" ? "sky" : l.kind === "trade" ? "gold" : "palm"}
                >
                  {l.kind === "sell" ? "For sale" : l.kind === "trade" ? "Swap" : "Free"}
                </Pill>
              </div>

              <p className="mt-3 font-medium leading-snug text-ink">{l.title}</p>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-ink-soft">
                {l.description}
              </p>

              {l.kind === "trade" && l.wants && (
                <p className="mt-3 rounded-lg bg-gold-50 px-3 py-2 text-xs text-gold-600">
                  <span className="font-medium">Wants:</span> {l.wants}
                </p>
              )}

              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-lg font-semibold text-ink">
                  {l.kind === "sell" && l.price != null
                    ? aed(l.price)
                    : l.kind === "give"
                      ? "Free"
                      : "Swap"}
                </span>
                <span className="text-xs text-ink-faint">{l.quantity}</span>
              </div>

              <div className="mt-3 flex items-center gap-2 border-t border-sand-200 pt-3 text-xs text-ink-faint">
                <span className="truncate font-medium text-ink-soft">{l.seller}</span>
                <span className="flex shrink-0 items-center gap-0.5">
                  <Star size={11} className="fill-gold-400 text-gold-400" />
                  {l.rating.toFixed(1)}
                </span>
                <span className="ml-auto flex shrink-0 items-center gap-1">
                  <MapPin size={11} />
                  {l.emirate}
                </span>
              </div>

              <p className="mt-1 text-[11px] text-ink-faint">
                {l.category} · listed {timeAgo(l.createdAt)}
              </p>

              {l.mine ? (
                <button
                  onClick={() => removeListing(l.id)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-clay/30 px-4 py-2.5 text-sm font-medium text-clay transition hover:bg-clay-50"
                >
                  <Trash2 size={15} /> Remove listing
                </button>
              ) : (
                <button
                  onClick={() => setContacted(l.id)}
                  className={cx(
                    "mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                    contacted === l.id
                      ? "bg-palm-50 text-palm-600"
                      : "bg-palm-600 text-white hover:bg-palm-700",
                  )}
                >
                  <MessageCircle size={15} />
                  {contacted === l.id ? "Request sent" : "Contact grower"}
                </button>
              )}
            </Card>
          ))}
        </div>
      )}

      <DemoNote>
        Prototype: listings are demo data plus anything you post, held in this browser only.
        Contacting a grower does not send a message. A production build would add identity
        verification, in-app messaging, and escrow for paid orders.
      </DemoNote>

      {composing && (
        <ComposeListing
          defaultEmirate={profile.emirate}
          defaultSeller={profile.name}
          onClose={() => setComposing(false)}
          onSubmit={(l) => {
            addListing(l);
            setComposing(false);
          }}
        />
      )}
    </div>
  );
}

const EMOJI_BY_CATEGORY: Record<Listing["category"], string> = {
  Seeds: "🌰",
  Seedlings: "🌱",
  Produce: "🧺",
  Tools: "🛠️",
  Compost: "🪴",
  "Know-how": "🎓",
};

function ComposeListing({
  defaultEmirate,
  defaultSeller,
  onClose,
  onSubmit,
}: {
  defaultEmirate: Emirate;
  defaultSeller: string;
  onClose: () => void;
  onSubmit: (l: Omit<Listing, "id" | "createdAt" | "rating" | "mine">) => void;
}) {
  const [kind, setKind] = useState<ListingKind>("sell");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Listing["category"]>("Produce");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [wants, setWants] = useState("");
  const [quantity, setQuantity] = useState("");
  const [emirate, setEmirate] = useState<Emirate>(defaultEmirate);

  const valid = title.trim().length > 2 && description.trim().length > 5;

  return (
    <div className="fixed inset-0 z-50 grid place-items-end overflow-y-auto sm:place-items-center">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink/40" />
      <div className="animate-rise relative my-auto w-full max-w-lg rounded-t-3xl bg-white p-6 sm:rounded-3xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">New listing</h2>
          <button onClick={onClose} aria-label="Close" className="text-ink-faint hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            {(["sell", "trade", "give"] as ListingKind[]).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={cx(
                  "flex-1 rounded-xl px-3 py-2 text-sm font-medium transition",
                  kind === k
                    ? "bg-palm-600 text-white"
                    : "border border-sand-200 text-ink-soft hover:text-ink",
                )}
              >
                {k === "sell" ? "Sell" : k === "trade" ? "Swap" : "Give away"}
              </button>
            ))}
          </div>

          <Field label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Surplus cherry tomatoes, 4kg"
              className="w-full rounded-xl border border-sand-200 px-3.5 py-2.5 text-sm focus:border-palm-400 focus:outline-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Listing["category"])}
                className="w-full rounded-xl border border-sand-200 px-3 py-2.5 text-sm focus:border-palm-400 focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Emirate">
              <select
                value={emirate}
                onChange={(e) => setEmirate(e.target.value as Emirate)}
                className="w-full rounded-xl border border-sand-200 px-3 py-2.5 text-sm focus:border-palm-400 focus:outline-none"
              >
                {EMIRATES.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="How it was grown, when it was picked, where to collect."
              className="w-full resize-none rounded-xl border border-sand-200 px-3.5 py-2.5 text-sm focus:border-palm-400 focus:outline-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            {kind === "sell" && (
              <Field label="Price (AED)">
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                  inputMode="decimal"
                  placeholder="25"
                  className="w-full rounded-xl border border-sand-200 px-3.5 py-2.5 text-sm focus:border-palm-400 focus:outline-none"
                />
              </Field>
            )}
            {kind === "trade" && (
              <Field label="Looking for">
                <input
                  value={wants}
                  onChange={(e) => setWants(e.target.value)}
                  placeholder="Citrus saplings"
                  className="w-full rounded-xl border border-sand-200 px-3.5 py-2.5 text-sm focus:border-palm-400 focus:outline-none"
                />
              </Field>
            )}
            <Field label="Quantity">
              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="4 kg"
                className="w-full rounded-xl border border-sand-200 px-3.5 py-2.5 text-sm focus:border-palm-400 focus:outline-none"
              />
            </Field>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-sand-200 px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-sand-50"
          >
            Cancel
          </button>
          <button
            disabled={!valid}
            onClick={() =>
              onSubmit({
                kind,
                title: title.trim(),
                category,
                description: description.trim(),
                price: kind === "sell" ? Number(price) || 0 : undefined,
                wants: kind === "trade" ? wants.trim() || "Open to offers" : undefined,
                quantity: quantity.trim() || "1 available",
                seller: defaultSeller,
                emirate,
                emoji: EMOJI_BY_CATEGORY[category],
              })
            }
            className={cx(
              "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition",
              valid
                ? "bg-palm-600 text-white hover:bg-palm-700"
                : "cursor-not-allowed bg-sand-100 text-ink-faint",
            )}
          >
            Post listing
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
        {label}
      </span>
      {children}
    </label>
  );
}
