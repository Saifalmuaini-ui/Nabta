/**
 * Nabta service worker.
 *
 * Deliberately conservative. This app is behind a sign-in gate and shows
 * per-user data, so the one thing a cache must never do is serve one person's
 * page to the next person on the same device.
 *
 * Rules:
 *   · never cache anything on the Supabase origin, or any API route
 *   · never cache an HTML document — navigations go to the network, and fall
 *     back to a static offline page only when the network is genuinely gone
 *   · cache the immutable build assets, which is what makes a repeat launch
 *     fast and lets the shell paint with no connection
 */

const VERSION = "nabta-v1";
const STATIC_CACHE = `${VERSION}-static`;
const OFFLINE_URL = "/offline";

const PRECACHE = [OFFLINE_URL, "/icon.svg", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

/** Anything that must always come from the network, never from a cache. */
function isPrivate(url) {
  return (
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname === "/login"
  );
}

/** Build output is content-hashed, so it is safe to cache forever. */
function isImmutableAsset(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/photos/"))
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (isPrivate(url)) return; // straight to the network, uncached

  // Navigations: network first, offline page as the fallback. Never cached,
  // because an HTML document here is personalised.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        const offline = await cache.match(OFFLINE_URL);
        return (
          offline ??
          new Response("<h1>Offline</h1>", {
            status: 503,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          })
        );
      }),
    );
    return;
  }

  // Immutable assets: cache first, and fill the cache in the background.
  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
            }
            return res;
          }),
      ),
    );
  }
});

/** Lets a new build take over without the user closing every tab. */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
