import {
  Apple,
  BarChart3,
  Bean,
  Carrot,
  Citrus,
  ClipboardList,
  Droplets,
  Flame,
  Flower2,
  GraduationCap,
  Hammer,
  Handshake,
  House,
  Leaf,
  Microscope,
  Receipt,
  Recycle,
  Salad,
  Scissors,
  ShoppingBag,
  ShoppingBasket,
  Sprout,
  Ticket,
  TreeDeciduous,
  TreePalm,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import { cx } from "./ui";

/**
 * The seed data carries an `emoji` field per crop, reward, service and listing.
 * Rather than rewrite every record, this maps those to line icons at the point
 * of render, so the data stays as it is and the interface stops looking like a
 * chat message.
 */
const MAP: Record<string, LucideIcon> = {
  "🍅": Apple,
  "🥬": Salad,
  "🌿": Leaf,
  "🌴": TreePalm,
  "🌳": TreeDeciduous,
  "🌱": Sprout,
  "🥒": Salad,
  "🌾": Wheat,
  "🌶️": Flame,
  "🌶": Flame,
  "🍆": Salad,
  "🍋": Citrus,
  "🪴": Flower2,
  "💧": Droplets,
  "🎓": GraduationCap,
  "🎟️": Ticket,
  "🎟": Ticket,
  "✂️": Scissors,
  "✂": Scissors,
  "🛍️": ShoppingBag,
  "🛍": ShoppingBag,
  "🧺": ShoppingBasket,
  "🪣": Recycle,
  "🔬": Microscope,
  "🤝": Handshake,
  "🌰": Bean,
  "🛠️": Hammer,
  "🛠": Hammer,
  "🏡": House,
  "📋": ClipboardList,
  "🧾": Receipt,
  "📊": BarChart3,
  "🥕": Carrot,
};

/**
 * Renders the icon for a data record's emoji field. Falls back to a leaf, so an
 * emoji added to the data later still gets something sensible rather than a
 * blank space.
 */
export default function DataIcon({
  emoji,
  size = 20,
  className,
}: {
  emoji?: string;
  size?: number;
  className?: string;
}) {
  const Icon = (emoji && MAP[emoji.trim()]) || Leaf;
  return <Icon size={size} className={className} aria-hidden />;
}

/**
 * Icon in a tinted round tile — the repeating motif for list rows and cards.
 */
export function IconTile({
  emoji,
  size = 20,
  tone = "palm",
  className,
}: {
  emoji?: string;
  size?: number;
  tone?: "palm" | "gold" | "sand";
  className?: string;
}) {
  return (
    <span
      className={cx(
        "grid shrink-0 place-items-center rounded-xl",
        tone === "gold"
          ? "bg-gold-50 text-gold-600"
          : tone === "sand"
            ? "bg-sand-100 text-ink-soft"
            : "bg-palm-50 text-palm-600",
        className,
      )}
    >
      <DataIcon emoji={emoji} size={size} />
    </span>
  );
}
