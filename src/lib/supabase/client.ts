"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * The app has to keep working with no Supabase project attached: the whole
 * prototype ran offline on localStorage and the demo must survive a dead
 * network on stage. Everything cloud-facing checks this first.
 */
export const supabaseConfigured = Boolean(URL && KEY);

/**
 * Session cookies, deliberately.
 *
 * The default is a long-lived cookie, which means reopening the site drops you
 * straight into the app. We want the sign-in page every time the browser is
 * opened, so these are written with no Max-Age and no Expires — the browser
 * discards them on close.
 *
 * A refresh keeps you signed in, and a second tab shares the session, because
 * the cookie survives for as long as the browser process does. Only closing
 * the browser signs you out.
 */
function getAll() {
  if (typeof document === "undefined") return [];
  return document.cookie
    .split("; ")
    .filter(Boolean)
    .map((pair) => {
      const eq = pair.indexOf("=");
      return {
        name: decodeURIComponent(pair.slice(0, eq)),
        value: decodeURIComponent(pair.slice(eq + 1)),
      };
    });
}

function setAll(
  list: { name: string; value: string; options?: { maxAge?: number } }[],
) {
  if (typeof document === "undefined") return;
  for (const { name, value, options } of list) {
    const parts = [
      `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
      "Path=/",
      "SameSite=Lax",
    ];
    // Removing a cookie still needs an explicit expiry, otherwise sign-out
    // would leave the session behind.
    if (value === "" || options?.maxAge === 0) parts.push("Max-Age=0");
    if (window.location.protocol === "https:") parts.push("Secure");
    document.cookie = parts.join("; ");
  }
}

let cached: SupabaseClient | null = null;

/**
 * One browser client for the tab. Creating a second one spawns a second auth
 * listener and the two fight over the refresh token.
 */
export function supabaseBrowser(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  if (!cached) {
    cached = createBrowserClient(URL!, KEY!, { cookies: { getAll, setAll } });
  }
  return cached;
}
