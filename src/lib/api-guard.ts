import "server-only";

import { supabaseServer } from "@/lib/supabase/server";

/**
 * Shared gate for the AI route handlers.
 *
 * Both routes previously accepted an unauthenticated POST, which meant anyone
 * who found the URL could spend the project's Gemini quota — broken access
 * control, and a bill. Every call now needs a signed-in user, and each user
 * gets a budget.
 *
 * The counter is per process and in memory, so it resets on redeploy and does
 * not coordinate across instances. That is honest for a single-instance
 * deployment; a multi-instance one needs a shared store such as Upstash Redis.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Drop expired buckets so the map cannot grow without bound. */
function sweep(now: number) {
  if (buckets.size < 500) return;
  for (const [key, b] of buckets) if (b.resetAt <= now) buckets.delete(key);
}

export interface RateLimit {
  /** Requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export type GuardResult =
  | { ok: true; userId: string }
  | { ok: false; response: Response };

function deny(error: string, status: number, retryable: boolean, extra?: HeadersInit): Response {
  return Response.json({ ok: false, error, retryable }, { status, headers: extra });
}

/**
 * Requires a session and applies a per-user rate limit.
 * Returns the user id on success, or the response to send back on failure.
 */
export async function guard(name: string, rules: RateLimit): Promise<GuardResult> {
  const supabase = await supabaseServer();
  if (!supabase) {
    return { ok: false, response: deny("Server is not configured.", 503, true) };
  }

  // getUser() validates the JWT with the auth server rather than trusting the
  // cookie's contents, which is the difference between a check and a formality.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, response: deny("Sign in to use this feature.", 401, false) };
  }

  const now = Date.now();
  sweep(now);

  const key = `${name}:${user.id}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + rules.windowMs });
    return { ok: true, userId: user.id };
  }

  if (bucket.count >= rules.limit) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return {
      ok: false,
      response: deny(
        `Too many requests. Try again in ${retryAfter} seconds.`,
        429,
        true,
        { "Retry-After": String(retryAfter) },
      ),
    };
  }

  bucket.count += 1;
  return { ok: true, userId: user.id };
}
