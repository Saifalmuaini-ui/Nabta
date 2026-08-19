-- ═══════════════════════════════════════════════════════════════════════════
-- Nabta — Supabase schema + RBAC + demo accounts
-- Run once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: every statement is idempotent.
--
-- Roles:  user        the grower. The app as it already is.
--         government  a dashboard and an alert channel. Aggregates only —
--                     never an individual household's rows.
--         admin       sees and edits everything.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

-- ── helpers ───────────────────────────────────────────────────────────────

-- Safe numeric read out of a jsonb blob. The scan payload is written by the
-- client, so a bad value must never be able to fail an insert.
create or replace function public.jnum(j jsonb, k text)
returns numeric language plpgsql immutable as $fn$
declare v text;
begin
  v := j ->> k;
  if v is null or v = '' then return null; end if;
  return v::numeric;
exception when others then
  return null;
end $fn$;

-- ── profiles ──────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  name        text,
  area        text default 'Aljada',
  emirate     text default 'Sharjah',
  role        text not null default 'user',
  locale      text not null default 'en' check (locale in ('en','ar')),
  created_at  timestamptz not null default now()
);

-- Re-runnable role constraint (an older run may have used other names).
alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles set role = 'user'       where role in ('grower','citizen');
update public.profiles set role = 'government' where role in ('officer','gov');
alter table public.profiles
  add constraint profiles_role_check check (role in ('user','government','admin'));

-- The three demo logins get their role automatically, however they sign up.
create or replace function public.demo_role_for(addr text)
returns text language sql immutable as $fn$
  select case lower(coalesce(addr,''))
    when 'admin@nabta.ae' then 'admin'
    when 'gov@nabta.ae'   then 'government'
    else 'user'
  end;
$fn$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    public.demo_role_for(new.email)
  )
  on conflict (id) do nothing;
  return new;
end $fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role predicates. SECURITY DEFINER so they bypass RLS and cannot recurse
-- when a policy on profiles calls them.
create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $fn$
  select coalesce((select role from public.profiles where id = auth.uid()), 'user');
$fn$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $fn$
  select public.my_role() = 'admin';
$fn$;

-- Admin is a superset of government: an admin can open the console too.
create or replace function public.is_government()
returns boolean language sql stable security definer set search_path = public as $fn$
  select public.my_role() in ('government','admin');
$fn$;

-- ── plants ────────────────────────────────────────────────────────────────

create table if not exists public.plants (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users on delete cascade,
  client_id      text,
  species        text,
  species_arabic text,
  nickname       jsonb,
  identity       text,
  cover_path     text,
  history        jsonb not null default '[]'::jsonb,
  log_count      integer not null default 0,
  created_at     timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  unique (user_id, client_id)
);

create index if not exists plants_user_idx on public.plants (user_id, last_seen_at desc);

-- ── scans ─────────────────────────────────────────────────────────────────
-- user id, timestamp, and the scan payload as JSON. The columns beneath `scan`
-- are denormalised copies filled by a trigger: the district dashboard
-- aggregates over many rows and must not crack open JSON to do it. `scan`
-- stays the source of truth; the columns are always derived from it.

create table if not exists public.scans (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  created_at   timestamptz not null default now(),
  scan         jsonb not null,

  plant_id     uuid references public.plants on delete set null,
  client_id    text,
  photo_path   text,

  action       text,
  species      text,
  outcome      text,
  source       text,
  points       integer,
  confidence   numeric,
  health_score integer,
  co2          numeric,
  water        numeric,
  emirate      text,
  area         text,

  unique (user_id, client_id)
);

create index if not exists scans_user_idx     on public.scans (user_id, created_at desc);
create index if not exists scans_district_idx on public.scans (emirate, area, created_at desc);
create index if not exists scans_plant_idx    on public.scans (plant_id);

create or replace function public.scans_denormalise()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  new.action       := nullif(new.scan ->> 'action', '');
  new.species      := nullif(new.scan ->> 'species', '');
  new.outcome      := nullif(new.scan ->> 'outcome', '');
  new.source       := nullif(new.scan ->> 'source', '');
  new.points       := coalesce(public.jnum(new.scan, 'points'), 0)::integer;
  new.confidence   := public.jnum(new.scan, 'confidence');
  new.health_score := public.jnum(new.scan, 'healthScore')::integer;
  new.co2          := coalesce(public.jnum(new.scan, 'co2'), 0);
  new.water        := coalesce(public.jnum(new.scan, 'water'), 0);

  if new.emirate is null or new.area is null then
    select coalesce(new.emirate, p.emirate), coalesce(new.area, p.area)
      into new.emirate, new.area
    from public.profiles p where p.id = new.user_id;
  end if;

  return new;
end $fn$;

drop trigger if exists scans_denormalise_trg on public.scans;
create trigger scans_denormalise_trg
  before insert or update of scan on public.scans
  for each row execute function public.scans_denormalise();

-- ── demo scans ────────────────────────────────────────────────────────────
-- A government console with three accounts on it shows nothing. This table
-- holds synthetic district activity so the dashboard is legible in a pitch.
-- It is deliberately separate from `scans`: no foreign key, never mixed into
-- a grower's own record, and every console figure can be shown with it
-- excluded by emptying this one table.

create table if not exists public.demo_scans (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  grower_key   text not null,
  action       text,
  species      text,
  outcome      text,
  points       integer,
  health_score integer,
  co2          numeric,
  water        numeric,
  emirate      text,
  area         text
);

truncate public.demo_scans;

with picks as (
  select
    g,
    1 + ((g * 13 + floor(random() * 1000)::int) % 12) as di,   -- district
    1 + floor(random() * 5)::int                      as ai,   -- action
    1 + floor(random() * 10)::int                     as si,   -- species
    random()                                          as r_out,
    (random() * 120)::int                             as days_ago,
    (10 + floor(random() * 140))::int                 as pts,
    (62 + floor(random() * 38))::int                  as health,
    round((random() * 2.6)::numeric, 2)               as co2,
    round((random() * 26)::numeric, 1)                as water
  from generate_series(1, 1400) g
)
insert into public.demo_scans
  (created_at, grower_key, action, species, outcome, points, health_score, co2, water, emirate, area)
select
  now() - p.days_ago * interval '1 day' - (p.g % 24) * interval '1 hour',
  'demo-' || lpad((1 + ((p.g * 7) % 240))::text, 4, '0'),
  (array['planting','watering','harvest','compost','pruning'])[p.ai],
  (array[
    'Cherry tomato','Rocket (jarjeer)','Mint','Date palm offshoot','Ghaf sapling',
    'Cucumber','Basil','Okra (bamia)','Chilli pepper','Lemon tree'
  ])[p.si],
  case when p.r_out < 0.90 then 'approved'
       when p.r_out < 0.97 then 'review'
       else 'rejected' end,
  p.pts, p.health, p.co2, p.water,
  (array[
    'Sharjah','Sharjah','Sharjah','Sharjah','Sharjah','Sharjah','Sharjah','Sharjah',
    'Dubai','Dubai','Ajman','Abu Dhabi'
  ])[p.di],
  (array[
    'Aljada','Al Zahia','Muwaileh','Al Majaz','Al Rahmaniya','Tilal City','Al Khan','Al Tarfa',
    'Mirdif','Al Barsha','Al Nuaimia','Khalifa City'
  ])[p.di]
from picks p;

-- One surface the console reads from, so real and demo activity aggregate
-- together and the dashboard code stays simple.
create or replace view public.all_scans as
  select user_id::text as grower_key, created_at, action, species, outcome,
         points, health_score, co2, water, emirate, area, false as is_demo
  from public.scans
  union all
  select grower_key, created_at, action, species, outcome,
         points, health_score, co2, water, emirate, area, true as is_demo
  from public.demo_scans;

-- ── advisories: the government → grower alert channel ─────────────────────

create table if not exists public.advisories (
  id           uuid primary key default gen_random_uuid(),
  created_by   uuid references auth.users on delete set null,
  created_at   timestamptz not null default now(),
  kind         text not null default 'general'
                 check (kind in ('weather','pest','water','seasonal','general')),
  title        text not null,
  title_ar     text,
  body         text not null,
  body_ar      text,
  severity     text not null default 'info' check (severity in ('info','warning','urgent')),
  emirate      text,
  areas        text[],
  species      text[],
  circular_ref text,
  expires_at   timestamptz
);

create index if not exists advisories_recent_idx on public.advisories (created_at desc);

-- Receipts are what make "61% acted" a measured number rather than a claim.
create table if not exists public.advisory_receipts (
  advisory_id  uuid not null references public.advisories on delete cascade,
  user_id      uuid not null references auth.users on delete cascade,
  delivered_at timestamptz not null default now(),
  opened_at    timestamptz,
  acted_at     timestamptz,
  primary key (advisory_id, user_id)
);

-- ── row level security ────────────────────────────────────────────────────

alter table public.profiles          enable row level security;
alter table public.plants            enable row level security;
alter table public.scans             enable row level security;
alter table public.advisories        enable row level security;
alter table public.advisory_receipts enable row level security;
alter table public.demo_scans        enable row level security;

drop policy if exists profiles_self_read   on public.profiles;
drop policy if exists profiles_self_write  on public.profiles;
drop policy if exists profiles_self_insert on public.profiles;
drop policy if exists profiles_admin       on public.profiles;
create policy profiles_self_read   on public.profiles for select using (id = auth.uid());
create policy profiles_self_write  on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_self_insert on public.profiles for insert with check (id = auth.uid());
create policy profiles_admin       on public.profiles for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists plants_owner on public.plants;
drop policy if exists plants_admin on public.plants;
create policy plants_owner on public.plants for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy plants_admin on public.plants for all
  using (public.is_admin()) with check (public.is_admin());

-- A grower reads and writes only their own scans. Admin sees everything.
-- Government gets NO row policy at all: the console reads the aggregate
-- functions below, so no official can browse one household's photographs.
drop policy if exists scans_owner on public.scans;
drop policy if exists scans_admin on public.scans;
create policy scans_owner on public.scans for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy scans_admin on public.scans for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists advisories_read on public.advisories;
drop policy if exists advisories_gov  on public.advisories;
create policy advisories_read on public.advisories for select to authenticated using (true);
create policy advisories_gov  on public.advisories for all
  using (public.is_government()) with check (public.is_government());

drop policy if exists receipts_owner on public.advisory_receipts;
drop policy if exists receipts_admin on public.advisory_receipts;
create policy receipts_owner on public.advisory_receipts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy receipts_admin on public.advisory_receipts for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists demo_scans_admin on public.demo_scans;
create policy demo_scans_admin on public.demo_scans for all
  using (public.is_admin()) with check (public.is_admin());

-- ── government console ────────────────────────────────────────────────────
-- SECURITY DEFINER so they can read across households, gated on
-- is_government() so anyone else gets an empty set. Aggregates only.

create or replace function public.gov_totals()
returns table (
  growers bigint, scans bigint, plants bigint, districts bigint,
  water numeric, co2 numeric, avg_health numeric, approved_pct numeric
)
language sql stable security definer set search_path = public as $fn$
  select
    count(distinct grower_key),
    count(*),
    count(distinct grower_key || coalesce(species,'')),
    count(distinct area),
    coalesce(sum(water), 0),
    coalesce(sum(co2), 0),
    round(avg(health_score), 1),
    round(100.0 * count(*) filter (where outcome = 'approved') / nullif(count(*), 0), 1)
  from public.all_scans
  where public.is_government();
$fn$;

create or replace function public.gov_district_stats()
returns table (
  emirate text, area text, growers bigint, scans bigint,
  water numeric, co2 numeric, avg_health numeric
)
language sql stable security definer set search_path = public as $fn$
  select emirate, area, count(distinct grower_key), count(*),
         coalesce(sum(water), 0), coalesce(sum(co2), 0), round(avg(health_score), 1)
  from public.all_scans
  where public.is_government() and outcome = 'approved'
  group by 1, 2
  order by 4 desc;
$fn$;

create or replace function public.gov_species_mix()
returns table (species text, scans bigint, growers bigint)
language sql stable security definer set search_path = public as $fn$
  select coalesce(species, 'Unknown'), count(*), count(distinct grower_key)
  from public.all_scans
  where public.is_government() and outcome = 'approved'
  group by 1 order by 2 desc limit 10;
$fn$;

create or replace function public.gov_activity_mix()
returns table (action text, scans bigint, water numeric, co2 numeric)
language sql stable security definer set search_path = public as $fn$
  select coalesce(action, 'other'), count(*),
         coalesce(sum(water), 0), coalesce(sum(co2), 0)
  from public.all_scans
  where public.is_government() and outcome = 'approved'
  group by 1 order by 2 desc;
$fn$;

-- Verification integrity: how much fraud pressure the channel is under.
create or replace function public.gov_integrity()
returns table (outcome text, scans bigint, pct numeric)
language sql stable security definer set search_path = public as $fn$
  select coalesce(outcome, 'unknown'), count(*),
         round(100.0 * count(*) / nullif(sum(count(*)) over (), 0), 1)
  from public.all_scans
  where public.is_government()
  group by 1 order by 2 desc;
$fn$;

create or replace function public.gov_weekly_trend()
returns table (week date, scans bigint, growers bigint, water numeric)
language sql stable security definer set search_path = public as $fn$
  select date_trunc('week', created_at)::date, count(*),
         count(distinct grower_key), coalesce(sum(water), 0)
  from public.all_scans
  where public.is_government() and created_at > now() - interval '12 weeks'
  group by 1 order by 1;
$fn$;

create or replace function public.gov_advisory_effectiveness()
returns table (
  advisory_id uuid, title text, kind text, severity text, created_at timestamptz,
  sent bigint, opened bigint, acted bigint, acted_pct numeric
)
language sql stable security definer set search_path = public as $fn$
  select a.id, a.title, a.kind, a.severity, a.created_at,
         count(r.*), count(r.opened_at), count(r.acted_at),
         case when count(r.*) = 0 then 0
              else round(100.0 * count(r.acted_at) / count(r.*), 1) end
  from public.advisories a
  left join public.advisory_receipts r on r.advisory_id = a.id
  where public.is_government()
  group by a.id, a.title, a.kind, a.severity, a.created_at
  order by a.created_at desc
  limit 25;
$fn$;

-- How many growers an alert would reach before it is sent.
create or replace function public.gov_reach(p_emirate text default null, p_areas text[] default null)
returns bigint
language sql stable security definer set search_path = public as $fn$
  select count(distinct grower_key)
  from public.all_scans
  where public.is_government()
    and (p_emirate is null or emirate = p_emirate)
    and (p_areas is null or cardinality(p_areas) = 0 or area = any(p_areas));
$fn$;

-- ── admin console ─────────────────────────────────────────────────────────

create or replace function public.admin_list_users()
returns table (
  id uuid, name text, email text, role text, area text, emirate text,
  created_at timestamptz, scans bigint, plants bigint, points bigint, last_scan timestamptz
)
language sql stable security definer set search_path = public as $fn$
  select p.id, p.name, u.email::text, p.role, p.area, p.emirate, p.created_at,
         (select count(*) from public.scans s where s.user_id = p.id),
         (select count(*) from public.plants pl where pl.user_id = p.id),
         (select coalesce(sum(s.points),0)::bigint from public.scans s where s.user_id = p.id),
         (select max(s.created_at) from public.scans s where s.user_id = p.id)
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.is_admin()
  order by p.created_at desc;
$fn$;

create or replace function public.admin_set_role(p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_admin() then
    raise exception 'not authorised';
  end if;
  if p_role not in ('user','government','admin') then
    raise exception 'unknown role %', p_role;
  end if;
  update public.profiles set role = p_role where id = p_user;
end $fn$;

create or replace function public.admin_stats()
returns table (
  users bigint, admins bigint, governments bigint,
  real_scans bigint, demo_scans bigint, plants bigint, advisories bigint
)
language sql stable security definer set search_path = public as $fn$
  select
    (select count(*) from public.profiles where public.is_admin()),
    (select count(*) from public.profiles where role = 'admin' and public.is_admin()),
    (select count(*) from public.profiles where role = 'government' and public.is_admin()),
    (select count(*) from public.scans where public.is_admin()),
    (select count(*) from public.demo_scans where public.is_admin()),
    (select count(*) from public.plants where public.is_admin()),
    (select count(*) from public.advisories where public.is_admin());
$fn$;

-- ── realtime ──────────────────────────────────────────────────────────────
do $blk$
begin
  alter publication supabase_realtime add table public.advisories;
exception when duplicate_object then null;
end $blk$;

-- ── storage: plant photos ─────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('plant-photos', 'plant-photos', false, 10485760,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists plant_photos_read   on storage.objects;
drop policy if exists plant_photos_insert on storage.objects;
drop policy if exists plant_photos_update on storage.objects;
drop policy if exists plant_photos_delete on storage.objects;
drop policy if exists plant_photos_admin  on storage.objects;

create policy plant_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'plant-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy plant_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'plant-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy plant_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'plant-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy plant_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'plant-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy plant_photos_admin on storage.objects for all to authenticated
  using (bucket_id = 'plant-photos' and public.is_admin())
  with check (bucket_id = 'plant-photos' and public.is_admin());

-- ── demo accounts ─────────────────────────────────────────────────────────
--   user@nabta.ae  / NabtaUser123!   role user
--   gov@nabta.ae   / NabtaGov123!    role government
--   admin@nabta.ae / NabtaAdmin123!  role admin
--
-- Creates any that are missing, confirms their email so they can sign in
-- without an inbox, and pins the role. Re-running resets their passwords.

do $blk$
declare
  acct record;
  uid  uuid;
begin
  for acct in
    select * from (values
      ('user@nabta.ae',  'NabtaUser123!',  'Sara Al Marzooqi',     'user'),
      ('gov@nabta.ae',   'NabtaGov123!',   'Sharjah Municipality', 'government'),
      ('admin@nabta.ae', 'NabtaAdmin123!', 'Nabta Admin',          'admin')
    ) as t(email, pw, name, role)
  loop
    select id into uid from auth.users where email = acct.email;

    if uid is null then
      uid := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
        acct.email, extensions.crypt(acct.pw, extensions.gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', acct.name),
        '', '', '', ''
      );

      begin
        insert into auth.identities (id, user_id, identity_data, provider, provider_id,
                                     last_sign_in_at, created_at, updated_at)
        values (gen_random_uuid(), uid,
                jsonb_build_object('sub', uid::text, 'email', acct.email),
                'email', acct.email, now(), now(), now());
      exception when others then
        -- Older GoTrue schemas have no provider_id column.
        insert into auth.identities (id, user_id, identity_data, provider,
                                     last_sign_in_at, created_at, updated_at)
        values (gen_random_uuid(), uid,
                jsonb_build_object('sub', uid::text, 'email', acct.email),
                'email', now(), now(), now());
      end;
    else
      -- Already exists (created through the sign-up form): confirm it and
      -- reset the password so the printed credentials are always correct.
      update auth.users
         set encrypted_password = extensions.crypt(acct.pw, extensions.gen_salt('bf')),
             email_confirmed_at = coalesce(email_confirmed_at, now()),
             updated_at         = now()
       where id = uid;
    end if;

    insert into public.profiles (id, name, role, area, emirate)
    values (uid, acct.name, acct.role, 'Aljada', 'Sharjah')
    on conflict (id) do update
      set role = excluded.role, name = coalesce(public.profiles.name, excluded.name);
  end loop;
end $blk$;

-- A couple of alerts so the console and the grower's feed are not empty.
insert into public.advisories (kind, title, title_ar, body, body_ar, severity, emirate, areas, circular_ref)
select * from (values
  ('weather', $t$Heat warning: 46C expected Thursday$t$, $t$تحذير من ارتفاع الحرارة$t$,
   $t$Move container plants into shade and water at dawn, not midday. Skip fertiliser until the peak passes.$t$,
   $t$انقل النباتات إلى الظل واسقِ عند الفجر لا في منتصف النهار$t$,
   'urgent', 'Sharjah', array['Aljada','Al Zahia','Muwaileh'], 'ADV-2026-014'),
  ('pest', $t$Whitefly reported in your district$t$, $t$انتشار الذبابة البيضاء$t$,
   $t$Check the underside of tomato and cucumber leaves. Spray at dusk, never at midday.$t$,
   $t$افحص أسفل أوراق الطماطم والخيار، ورش عند الغروب$t$,
   'warning', 'Sharjah', array['Aljada','Al Majaz'], 'ADV-2026-011'),
  ('water', $t$Summer irrigation schedule now in effect$t$, $t$جدول الري الصيفي$t$,
   $t$Drip irrigation before 7am. Households on the summer schedule cut roughly a third of their litres per kilo.$t$,
   $t$الري بالتنقيط قبل السابعة صباحاً$t$,
   'info', 'Sharjah', null, 'ADV-2026-009')
) as v(kind, title, title_ar, body, body_ar, severity, emirate, areas, circular_ref)
where not exists (select 1 from public.advisories);

-- ── pgvector (optional) ───────────────────────────────────────────────────
-- Provisioned for per-plant embeddings, so re-identification can become a
-- nearest-neighbour lookup instead of comparing a text description.
do $blk$
begin
  create extension if not exists vector with schema extensions;
  alter table public.plants add column if not exists embedding extensions.vector(768);
  create index if not exists plants_embedding_idx
    on public.plants using hnsw (embedding extensions.vector_cosine_ops);
exception when others then
  raise notice 'pgvector step skipped: %', sqlerrm;
end $blk$;
