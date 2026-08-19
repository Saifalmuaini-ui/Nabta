import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline — Nabta" };

/**
 * Served by the service worker when a navigation fails with no connection.
 * Static on purpose: it has to render from the cache with nothing else
 * available, so it pulls no data and imports no client component.
 */
export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-sand-50 px-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-palm-600 text-white">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M2 2l20 20M8.5 16.5a5 5 0 017 0M5 12.9a10 10 0 015.2-2.8M2 8.8a15 15 0 015-3.3M16.8 11.3A10 10 0 0119 12.9M12 20h.01" />
          </svg>
        </div>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-ink">
          You are offline
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Nabta needs a connection to load this page. Anything you logged is
          saved on this device and will upload by itself when you are back.
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-faint" dir="rtl">
          لا يوجد اتصال. ما سجّلته محفوظ على جهازك وسيُرفع تلقائياً عند عودة الاتصال.
        </p>
      </div>
    </main>
  );
}
