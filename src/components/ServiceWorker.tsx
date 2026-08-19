"use client";

import { useEffect } from "react";

/**
 * Registers the service worker. Kept out of the layout body so the layout can
 * stay a server component.
 */
export default function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Registering during dev fights the HMR socket and caches half-built
    // chunks, so it only runs against a real build.
    if (process.env.NODE_ENV !== "production") return;

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
        console.warn("[nabta] service worker registration failed:", err);
      });
    };

    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
