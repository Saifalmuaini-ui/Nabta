# Security

## ⚠️ Two critical holes were found and fixed — run `0004_security.sql`

Both were live on the project while it was reachable. Neither is fixed until
that migration is run.

### 1. Anonymous read of every household's scans

`public.all_scans` returned data to callers with **no login at all**:

```
GET /rest/v1/all_scans   →  200
[{"grower_key":"d3a4c3ee-…","species":"Dragon Tree","emirate":"Sharjah", …}]
```

A Postgres view runs with its **owner's** privileges, so the row level
security on `scans` never applied. RLS on a base table does not protect a view
sitting on top of it. The view is only needed by the `SECURITY DEFINER` `gov_*`
functions, which run as the owner, so revoking the API roles' access costs
nothing.

### 2. Any user could make themselves an administrator

Verified by doing it:

```
PATCH /rest/v1/profiles?id=eq.<self>   {"role":"admin"}   →  200
role now: admin
```

`profiles_self_write` allowed a user to update their own row, and `role` is a
column on that row. The demo account has been set back to `user`. The fix pins
`role` in the policy **and** adds a trigger that rejects any role change not
made by an admin, so neither path works alone.

Run it, then check the verification query at the end of the file: `anon_can_read`
must be `false` for every object.

---

## What is exposed on purpose

| Value | Where | Safe? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser | Yes — a public endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser | Yes — grants nothing on its own; RLS is the control |
| `GEMINI_API_KEY` | server only | Never reaches the browser |

`src/lib/gemini.ts`, `src/lib/api-guard.ts` and `src/lib/supabase/server.ts`
all `import "server-only"`, so importing any of them from a client component
fails the **build** rather than leaking at runtime. Audited: no `service_role`
key anywhere in `src/`, and no non-`NEXT_PUBLIC_` variable read from client
code. `.env.local` is gitignored.

**Never** put the `service_role` key in a `NEXT_PUBLIC_` variable. It bypasses
RLS entirely.

---

## OWASP Top 10

| | Control |
|---|---|
| **A01 Broken access control** | RLS on every table; role checks in `SECURITY DEFINER` functions, not just the UI; middleware gates `/console` and `/admin`; the two holes above closed |
| **A02 Cryptographic failures** | Passwords hashed by Supabase Auth (bcrypt); HSTS for two years with preload; session cookies are `Secure` outside dev |
| **A03 Injection** | No string-built SQL — PostgREST and parameterised RPC only. CSP blocks inline script; React escapes by default |
| **A04 Insecure design** | Government reads aggregates only — there is *no policy* granting officials access to individual scan rows, so it cannot be misconfigured open |
| **A05 Misconfiguration** | Security headers below; `poweredByHeader: false`; `robots: noindex`; anon revoked from every table |
| **A06 Vulnerable components** | `npm audit` in CI before deploying; Next 15 / React 19 current |
| **A07 Auth failures** | Supabase Auth; JWTs validated with `getUser()` (checks with the auth server) rather than trusting the cookie; per-user rate limits |
| **A08 Integrity failures** | Service worker never caches HTML or any authenticated response; storage bucket restricts MIME types and 10 MB |
| **A09 Logging** | Failures surface to the user via `StatusBanner` instead of dying in `console.warn`. **Gap: no server-side audit log** — see below |
| **A10 SSRF** | The server makes exactly one outbound call, to a hardcoded Google endpoint. No user-supplied URL is ever fetched |

### Known gaps, stated honestly

- **Rate limiting is per process and in memory.** It resets on redeploy and
  does not coordinate across instances. Fine for one instance; a scaled
  deployment needs Upstash Redis or similar.
- **No audit log.** Role changes and advisory sends are not recorded. Before a
  real government deployment, add an append-only `audit_log` table written by
  trigger.
- **No CAPTCHA on sign-up.** Supabase Auth has built-in rate limits; enable
  hCaptcha in the dashboard before opening registration publicly.
- **Demo credentials are printed on the sign-in page.** Delete the
  `DemoAccounts` block in `src/app/login/page.tsx` before this is public.

---

## Security headers

Set in `next.config.mjs`, except CSP which is per request in `middleware.ts`.

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(self), microphone=(), geolocation=(self), payment=() …
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Content-Security-Policy: … script-src 'self' 'nonce-<random>' 'strict-dynamic' …
```

**CSP uses a per-request nonce.** That is what allows `script-src` to drop
`'unsafe-inline'`, which is the single largest scoring penalty on
securityheaders.com and a genuine XSS weakening. `'unsafe-eval'` and the HMR
websocket appear in development only.

Verify after deploying:

```bash
curl -sI https://your-domain/ | grep -i -E "content-security|strict-transport|x-frame"
```

---

## About the "A rating"

Two different scanners are being conflated, and only one of them is about this
app:

- **SSL Labs grades the TLS configuration of the server**, not the code:
  protocol versions, cipher suites, certificate chain, key size. Nothing in
  this repository can change that grade. Deploy behind **Vercel, Cloudflare or
  Netlify** and you get **A/A+** by default — modern TLS 1.3, strong ciphers, a
  valid chain. The HSTS header above is the one app-side ingredient, and it is
  set.
- **securityheaders.com grades the headers**, which *is* this app. The set
  above, with a nonce-based CSP and no `unsafe-inline`, is an **A+**
  configuration.

Neither can be tested on `localhost` — there is no certificate and no public
hostname. Both need the deployed URL.

To keep A+ on TLS: do not terminate TLS yourself, do not add a custom domain
without a valid certificate, and submit the domain to the HSTS preload list
only once you are certain every subdomain is HTTPS-only, because that is hard
to undo.
