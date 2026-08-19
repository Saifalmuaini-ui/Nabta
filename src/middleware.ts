import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isDev = process.env.NODE_ENV !== "production";

/**
 * Everything requires a signed-in user except these. Sign-in is the front
 * door, not a side entrance, so the list is a small allowlist rather than a
 * growing list of protected routes.
 */
const PUBLIC = ["/login", "/auth"];

/**
 * Content-Security-Policy.
 *
 * This deliberately does NOT use a nonce, and that is worth explaining because
 * a nonce is the stricter option on paper.
 *
 * Next renders most of these pages statically at build time, then emits the
 * React flight data as inline <script> bodies in that prebuilt HTML. A nonce
 * minted per request in middleware can never be stamped onto HTML that was
 * generated hours earlier during the build. The result in production was a
 * policy naming a nonce that no script carried — and because 'strict-dynamic'
 * makes the browser ignore 'self', every script was blocked. The page rendered
 * from server HTML and then sat there: no hydration, no working buttons.
 *
 * Note that adding 'unsafe-inline' alongside a nonce does not help either —
 * CSP3 says a browser ignores 'unsafe-inline' whenever a nonce is present.
 *
 * So: 'self' covers the chunk files, 'unsafe-inline' covers Next's inline
 * bootstrap. The honest trade is that script-src is weaker than a nonce-based
 * policy would be. Everything else here stays strict, and React escapes
 * interpolated values by default, so the XSS surface is small.
 */
function contentSecurityPolicy(): string {
  const supabaseHost = URL ? new global.URL(URL).host : "*.supabase.co";

  return [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    // Tailwind ships a stylesheet, but Next injects a few inline style
    // attributes. Style nonces are not plumbed through, so this stays.
    `style-src 'self' 'unsafe-inline'`,
    // data: and blob: are the camera capture path.
    `img-src 'self' data: blob:`,
    `font-src 'self' data:`,
    `connect-src 'self' https://${supabaseHost} wss://${supabaseHost}${isDev ? " ws: http://localhost:*" : ""}`,
    `media-src 'self' blob:`,
    `worker-src 'self' blob:`,
    `manifest-src 'self'`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export async function middleware(request: NextRequest) {
  const csp = contentSecurityPolicy();
  const nextOptions = { request };
  let response = NextResponse.next(nextOptions);

  const finish = (res: NextResponse) => {
    res.headers.set("Content-Security-Policy", csp);
    return res;
  };

  // No project attached: the app runs in offline demo mode, so let everything
  // through rather than locking the user out of their own prototype.
  if (!URL || !KEY) return finish(response);

  const supabase = createServerClient(URL, KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(list) {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next(nextOptions);
        for (const { name, value, options } of list) {
          // Strip the lifetime so a refreshed token stays a session cookie.
          // Otherwise this handler would quietly re-persist the session that
          // the browser client deliberately keeps short-lived, and reopening
          // the site would skip the sign-in page again.
          const opts = {
            ...options,
            httpOnly: false, // the browser client has to read it back
            sameSite: "lax" as const,
            secure: !isDev,
            path: "/",
          };
          delete opts.maxAge;
          delete opts.expires;
          if (value === "") opts.maxAge = 0; // still allow removal
          response.cookies.set(name, value, opts);
        }
      },
    },
  });

  // Touching the user refreshes an expiring token and writes the new cookie
  // onto `response`. Do not remove: without it the session dies silently.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC.some((p) => path === p || path.startsWith(`${p}/`));

  if (!user && !isPublic) {
    // An API caller wants a status code, not a login page. Redirecting here
    // hands the client an HTML body it will fail to parse as JSON, which
    // surfaces as a confusing error rather than "sign in".
    if (path.startsWith("/api/")) {
      return finish(
        NextResponse.json(
          { ok: false, error: "Sign in to use this feature.", retryable: false },
          { status: 401 },
        ) as unknown as NextResponse,
      );
    }

    const to = request.nextUrl.clone();
    to.pathname = "/login";
    to.search = "";
    // Send them back where they were headed, but not to the root — landing on
    // the home page after signing in is what you want anyway.
    if (path !== "/") to.searchParams.set("next", path);
    return finish(NextResponse.redirect(to));
  }

  // Role gates. Only two paths need a role, so the profile is read only for
  // those rather than on every request.
  if (user && (path.startsWith("/console") || path.startsWith("/admin"))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = (profile?.role as string) ?? "user";
    const allowed = path.startsWith("/admin")
      ? role === "admin"
      : role === "government" || role === "admin";

    if (!allowed) {
      const to = request.nextUrl.clone();
      to.pathname = "/";
      to.search = "";
      return finish(NextResponse.redirect(to));
    }
  }

  if (user && path === "/login") {
    const to = request.nextUrl.clone();
    to.pathname = "/";
    to.search = "";
    return finish(NextResponse.redirect(to));
  }

  return finish(response);
}

export const config = {
  matcher: [
    // Everything except static assets and image files. The service worker is
    // excluded so it can be fetched before a session exists.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.json|sw.js|offline|photos|.*\\.(?:svg|png|jpg|jpeg|webp|gif)$).*)",
  ],
};
