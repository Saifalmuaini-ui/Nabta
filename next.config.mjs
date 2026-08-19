/** @type {import('next').NextConfig} */

// `npm run export` emits a plain HTML/CSS/JS bundle in out/ that any static
// host — or the bundled Windows launcher — can serve. The app has no backend,
// so nothing is lost in the export. npm sets npm_lifecycle_event to the script
// name, which avoids needing cross-platform env-var syntax in the script itself.
const isStaticExport =
  process.env.npm_lifecycle_event === "export" ||
  process.env.STATIC_EXPORT === "1";

// NOTE: this project lives inside a OneDrive-synced folder, and OneDrive opens
// files in .next while Next is still writing them. That surfaces as
// intermittent `EBUSY: resource busy or locked` and 500s on pages that worked
// a second earlier — the app is fine when it happens; delete .next and restart.
//
// Do not try to fix it by moving distDir outside the project: the generated
// server bundles resolve node_modules by walking up from their own location,
// so a build directory outside the project root fails with
// "Cannot find module 'react/jsx-runtime'". The real fixes are to exclude
// .next from OneDrive sync, or to keep the project outside OneDrive entirely.

/**
 * Security headers.
 *
 * Content-Security-Policy is NOT here — it is set per request in middleware.ts
 * so each response can carry a fresh nonce. A static CSP would need
 * 'unsafe-inline' in script-src for Next's bootstrap, which is the single
 * biggest grade penalty and a real XSS weakening.
 *
 * HSTS is emitted unconditionally. Browsers ignore it over plain HTTP, so it
 * is harmless on localhost and correct the moment this is served over TLS.
 */
const securityHeaders = [
  // Force HTTPS for two years, including subdomains, and allow preloading.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Stop the browser guessing a response's type — blocks a class of XSS where
  // an uploaded file is served back and sniffed as script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Clickjacking. frame-ancestors in the CSP is the modern control; this is
  // the fallback for older agents.
  { key: "X-Frame-Options", value: "DENY" },
  // Never leak a full URL (which can carry ids) to another origin.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera is needed for capture, on this origin only. Everything else off.
  {
    key: "Permissions-Policy",
    value: [
      "camera=(self)",
      "microphone=()",
      "geolocation=(self)",
      "payment=()",
      "usb=()",
      "magnetometer=()",
      "accelerometer=()",
      "gyroscope=()",
      "interest-cohort=()",
    ].join(", "),
  },
  // Isolate the browsing context from cross-origin popups and embeds.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  // Legacy, but still read by some scanners.
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig = {
  reactStrictMode: true,
  // Do not advertise the framework version to scanners.
  poweredByHeader: false,

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The service worker must never be cached, or a stale one pins an old
      // build on every returning device.
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },

  ...(isStaticExport && {
    output: "export",
    trailingSlash: true,
    images: { unoptimized: true },
  }),
};

export default nextConfig;
