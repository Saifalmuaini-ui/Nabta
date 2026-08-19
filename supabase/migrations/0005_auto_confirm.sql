-- ═══════════════════════════════════════════════════════════════════════════
-- Make account creation work without the mail loop.
--
-- The dashboard's "Confirm email" switch is not in the Email provider panel in
-- this version, and while confirmation is on a new account cannot sign in:
--
--   POST /auth/v1/signup  -> 200, confirmation_sent_at set
--   POST /auth/v1/token   -> 400 email_not_confirmed
--
-- The confirmation mail is also undeliverable — nabta.ae is not a domain we
-- control — and the built-in mailer rate-limits to a handful an hour, which is
-- what returns 429 over_email_send_rate_limit on repeated signups.
--
-- This stamps every new account as confirmed at the moment it is created, so
-- sign-up leads straight to a session.
--
-- ⚠️ THIS IS A DEMO SETTING. It means anyone can register with an address they
-- do not own. Before this is public, drop the trigger at the bottom of this
-- file and turn on real confirmation with a verified sending domain.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. new accounts are usable immediately ────────────────────────────────

create or replace function public.auto_confirm_user()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  -- `confirmed_at` is generated from this column, so setting it is enough.
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end $fn$;

drop trigger if exists auto_confirm_user_trg on auth.users;
create trigger auto_confirm_user_trg
  before insert on auth.users
  for each row execute function public.auto_confirm_user();

-- ── 2. unstick anything already created ───────────────────────────────────

update auth.users
set email_confirmed_at = now()
where email_confirmed_at is null;

-- ── 3. clean up the leftovers ─────────────────────────────────────────────

delete from auth.users where email like 'signup-test-%@nabta.ae';
delete from public.advisories where title = 'm';

-- ── verification ──────────────────────────────────────────────────────────
-- Every remaining account should have a confirmation timestamp.

select email,
       email_confirmed_at is not null as confirmed,
       created_at
from auth.users
order by created_at desc;
