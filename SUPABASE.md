# Supabase setup

## 1. Run the migration (required — nothing works until you do)

Open the [SQL Editor](https://supabase.com/dashboard/project/jpxmeffbinmguzbmotdp/sql/new),
paste the whole of `supabase/migrations/0001_init.sql`, and run it. It is
idempotent, so it is safe to run again after any edit.

It creates the tables, RLS policies, storage bucket, the `gov_*` and `admin_*`
functions, ~1,400 rows of synthetic district activity so the console is not
empty, three sample alerts, **and the three demo accounts**.

Verify:

```bash
curl -s "https://jpxmeffbinmguzbmotdp.supabase.co/rest/v1/scans?select=id&limit=1" \
  -H "apikey: YOUR_ANON_KEY" -H "Authorization: Bearer YOUR_ANON_KEY"
```

`[]` = ready. `PGRST205` = the migration has not run.

## Demo accounts

| Role | Email | Password | Gets |
|---|---|---|---|
| User | `user@nabta.ae` | `NabtaUser123!` | the app as it already is |
| Government | `gov@nabta.ae` | `NabtaGov123!` | `/console` — district dashboard, sends alerts |
| Admin | `admin@nabta.ae` | `NabtaAdmin123!` | `/admin` + `/console` + everything a user sees |

These are printed on the sign-in page with tap-to-fill buttons. **Delete the
`DemoAccounts` block in `src/app/login/page.tsx` before this is ever public.**

The migration confirms these three addresses directly in the database, so they
sign in without an inbox even while email confirmation is on. Re-running it
resets their passwords to the values above.

## 2. Turn off email confirmation (recommended for demos)

Authentication → Providers → Email → uncheck **Confirm email**.

Without this, *new* sign-ups get "check your inbox" and cannot get in. The three
demo accounts are unaffected either way.

## 3. Google sign-in (optional)

1. Google Cloud Console → Credentials → OAuth client ID (Web).
2. Authorised redirect URI:
   `https://jpxmeffbinmguzbmotdp.supabase.co/auth/v1/callback`
3. Supabase → Authentication → Providers → Google → paste client ID and secret.
4. Supabase → Authentication → URL Configuration → add `http://localhost:3000/**`.

Until step 3, the Google button returns "provider is not enabled". Expected.

## Roles

Set on `public.profiles.role`, one of `user` | `government` | `admin`.

- **user** — reads and writes only their own rows. Everything else is invisible.
- **government** — has **no row policy on `scans` at all**. The console reads
  `SECURITY DEFINER` functions that return aggregates only, so no official can
  open one household's photographs. Can insert advisories.
- **admin** — full read/write on every table, plus `admin_list_users()` and
  `admin_set_role()`.

Promote someone from the admin console, or by hand:

```sql
update public.profiles set role = 'government'
where id = (select id from auth.users where email = 'someone@example.com');
```

New sign-ups default to `user`. The three demo addresses are pinned to their
role by `demo_role_for()`, however they are created.

## Demo data

`public.demo_scans` holds the synthetic district activity. It has no foreign key
to `auth.users` and is never mixed into a grower's own record — the console
reads the `all_scans` view, which unions it with real `scans`.

To show the console on real data only:

```sql
truncate public.demo_scans;
```

## Behaviour with no Supabase attached

Blank the two `NEXT_PUBLIC_SUPABASE_*` values in `.env.local` and restart: the
middleware detects no project, the gate opens, and the app runs from
localStorage exactly as it did before. That is the escape hatch if you are ever
locked out on stage.

## Security notes

- The anon key is meant to be public. It grants nothing on its own; RLS is what
  protects the data.
- **Never** put the `service_role` key in a `NEXT_PUBLIC_` variable.
- `plant-photos` is private. Objects live under `<user-id>/…` and the storage
  policies compare that first segment to `auth.uid()`. Reads use signed URLs.
- Role checks in `middleware.ts` are for UX. The real enforcement is in the
  database: every function checks `is_admin()` / `is_government()` itself, so
  calling the REST API directly gains nothing.
- Geotagged photos of homes are personal data under the UAE PDPL. Confirm the
  hosting region is acceptable to a government client before this goes near a
  real municipality; self-hosting is the fallback.
