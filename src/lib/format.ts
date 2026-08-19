export function num(n: number): string {
  return new Intl.NumberFormat("en-AE").format(Math.round(n));
}

export function aed(n: number): string {
  return `AED ${new Intl.NumberFormat("en-AE").format(n)}`;
}

export function compact(n: number): string {
  return new Intl.NumberFormat("en-AE", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function litres(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k L`;
  return `${Math.round(n)} L`;
}

export function kg(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)} t`;
  return `${n.toFixed(1)} kg`;
}

export function timeAgo(ts: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  return new Date(ts).toLocaleDateString("en-AE", {
    day: "numeric",
    month: "short",
  });
}

export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
