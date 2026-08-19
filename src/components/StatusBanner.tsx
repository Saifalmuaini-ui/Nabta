"use client";

import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, TriangleAlert, WifiOff, X } from "lucide-react";
import { cx } from "./ui";

/**
 * The app's one place for "something went wrong outside your control".
 *
 * Three sources feed it:
 *   · the browser going offline
 *   · a photo failing to upload
 *   · a record failing to sync
 *
 * Anything in the app can raise one with `notify()` below. Failures used to go
 * to console.warn only, which means a grower whose photo never left the phone
 * had no way of knowing.
 */

export type StatusKind = "offline" | "upload" | "sync";

interface StatusEvent {
  kind: StatusKind;
  message: string;
}

const EVENT = "nabta:status";

/** Raise a banner from anywhere, including non-React modules. */
export function notify(kind: StatusKind, message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<StatusEvent>(EVENT, { detail: { kind, message } }));
}

const LOOK: Record<StatusKind, { icon: React.ReactNode; tone: string }> = {
  offline: {
    icon: <WifiOff size={15} />,
    tone: "border-ink-faint/25 bg-sand-100 text-ink",
  },
  upload: {
    icon: <CloudOff size={15} />,
    tone: "border-gold-100 bg-gold-50 text-gold-600",
  },
  sync: {
    icon: <TriangleAlert size={15} />,
    tone: "border-gold-100 bg-gold-50 text-gold-600",
  },
};

export default function StatusBanner() {
  const [offline, setOffline] = useState(false);
  const [event, setEvent] = useState<StatusEvent | null>(null);

  // Connectivity. navigator.onLine only proves a network interface exists, so
  // a failed request also counts as evidence — that is what `notify` is for.
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    const onStatus = (e: Event) => {
      setEvent((e as CustomEvent<StatusEvent>).detail);
    };
    window.addEventListener(EVENT, onStatus);
    return () => window.removeEventListener(EVENT, onStatus);
  }, []);

  // Clear a transient message once connectivity returns.
  useEffect(() => {
    if (!offline && event?.kind === "offline") setEvent(null);
  }, [offline, event]);

  const shown: StatusEvent | null = offline
    ? {
        kind: "offline",
        message:
          "You are offline. You can keep logging — records are saved on this device and upload when you reconnect.",
      }
    : event;

  if (!shown) return null;
  const look = LOOK[shown.kind];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cx(
        "mb-4 flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm",
        look.tone,
      )}
    >
      <span className="mt-0.5 shrink-0">{look.icon}</span>
      <p className="flex-1 leading-relaxed">{shown.message}</p>
      {shown.kind !== "offline" && (
        <button
          onClick={() => setEvent(null)}
          aria-label="Dismiss"
          className="shrink-0 rounded p-0.5 opacity-60 transition hover:opacity-100"
        >
          <X size={14} />
        </button>
      )}
      {shown.kind === "sync" && (
        <button
          onClick={() => window.location.reload()}
          className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium underline-offset-2 hover:underline"
        >
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  );
}
