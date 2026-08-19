-- ═══════════════════════════════════════════════════════════════════════════
-- Security hardening.
--
-- CRITICAL FIX. `public.all_scans` was readable by anon and by any signed-in
-- user, exposing every household's scan rows including their user id, species
-- and district:
--
--   curl .../rest/v1/all_scans   ->  200  [{"grower_key":"d3a4c3ee-…", …}]
--
-- A Postgres view executes with the privileges of its OWNER, not the caller,
-- so row level security on the underlying `scans` table never applied. RLS on
-- the base table is not enough when a view sits on top of it.
--
-- The view exists only so the SECURITY DEFINER gov_* functions can aggregate
-- real and demo activity together. Those run as the owner, so they keep
-- working once the API roles lose direct access.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. close the view ─────────────────────────────────────────────────────

revoke all on public.all_scans from anon, authenticated, public;

-- Backing tables for the demo data: RLS already restricts them to admins, but
-- no API role has any business selecting them directly either.
revoke all on public.demo_scans from anon, authenticated, public;

do $blk$
begin
  execute 'revoke all on public.demo_advisory_stats from anon, authenticated, public';
exception when undefined_table then
  raise notice 'demo_advisory_stats not present yet (run 0003) — skipping';
end $blk$;

-- ── 2. nothing else may be readable without a login ───────────────────────
-- Anonymous callers need no table at all: every route behind the sign-in gate
-- is authenticated by the time it reads anything.

revoke all on public.profiles          from anon;
revoke all on public.plants            from anon;
revoke all on public.scans             from anon;
revoke all on public.advisories        from anon;
revoke all on public.advisory_receipts from anon;

-- ── 3. lock down function execution ───────────────────────────────────────
-- Postgres grants EXECUTE to PUBLIC on new functions. The gov_/admin_ helpers
-- gate on is_government()/is_admin() internally, so an unauthorised caller
-- already gets an empty set, but there is no reason for anon to reach them.

do $blk$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (p.proname like 'gov\_%' or p.proname like 'admin\_%')
  loop
    execute format('revoke all on function %s from anon, public', fn.sig);
    execute format('grant execute on function %s to authenticated', fn.sig);
  end loop;
end $blk$;

-- Internal helpers are not an API surface.
revoke all on function public.jnum(jsonb, text)   from anon, public;
revoke all on function public.demo_role_for(text) from anon, public;

-- ── 4. a grower may not hand themselves a role ────────────────────────────
-- profiles_self_write let a user UPDATE their own row, and `role` is a column
-- on that row — so a signed-in grower could PATCH themselves to admin. Replace
-- it with a policy that pins role, and route legitimate changes through
-- admin_set_role(), which checks is_admin().

drop policy if exists profiles_self_write on public.profiles;
create policy profiles_self_write on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.my_role());

-- Belt and braces: reject any change to role that did not come from an admin,
-- whichever path it arrives by.
create or replace function public.profiles_guard_role()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'role may only be changed by an administrator';
  end if;
  return new;
end $fn$;

drop trigger if exists profiles_guard_role_trg on public.profiles;
create trigger profiles_guard_role_trg
  before update on public.profiles
  for each row execute function public.profiles_guard_role();

-- ── 5. advisories reach the district they were addressed to ───────────────
-- Previously every signed-in user could read every advisory in the country.
-- A grower now sees only what was actually sent to them: national notices,
-- their emirate, or their district. Government and admin still see all of
-- them, which is what the console lists.

drop policy if exists advisories_read on public.advisories;
create policy advisories_read on public.advisories
  for select to authenticated
  using (
    public.is_government()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        -- a null emirate means the notice is national
        and (advisories.emirate is null or advisories.emirate = p.emirate)
        -- no districts listed means the whole emirate
        and (
          advisories.areas is null
          or cardinality(advisories.areas) = 0
          or p.area = any(advisories.areas)
        )
    )
  );

-- ── verification ──────────────────────────────────────────────────────────
-- Every row below should read `false` in the last column.

select
  c.relname                                   as object,
  c.relkind                                   as kind,
  has_table_privilege('anon', c.oid, 'SELECT')          as anon_can_read,
  has_table_privilege('authenticated', c.oid, 'SELECT') as user_can_read
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'v', 'm')
order by 1;
