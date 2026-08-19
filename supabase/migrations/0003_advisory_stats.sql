-- ═══════════════════════════════════════════════════════════════════════════
-- Communication metrics for the console.
--
-- Reach, open rate and act rate are the numbers a government communication
-- buyer actually cares about, and they were all reading 0: receipts only exist
-- once a real grower opens the feed, and there are three accounts.
--
-- This adds demo delivery figures for the seeded advisories, kept in their own
-- table exactly like demo_scans, and makes a newly sent advisory record its
-- real reach at the moment it is sent. Opened and acted stay at zero for a new
-- send until genuine receipts arrive — those are measured, not invented.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.demo_advisory_stats (
  advisory_id uuid primary key references public.advisories on delete cascade,
  sent        integer not null default 0,
  opened      integer not null default 0,
  acted       integer not null default 0,
  seeded      boolean not null default false
);

alter table public.demo_advisory_stats enable row level security;

drop policy if exists demo_adv_admin on public.demo_advisory_stats;
create policy demo_adv_admin on public.demo_advisory_stats for all
  using (public.is_admin()) with check (public.is_admin());

-- ── seed the advisories that were already there ───────────────────────────
-- Every random draw sits in the target list of a CTE that references the row,
-- so it is evaluated per row rather than once for the whole statement.

delete from public.demo_advisory_stats where seeded;

with picks as (
  select a.id,
         (900 + floor(random() * 2300))::int as sent,
         0.58 + random() * 0.32              as open_rate,
         0.48 + random() * 0.34              as act_rate
  from public.advisories a
)
insert into public.demo_advisory_stats (advisory_id, sent, opened, acted, seeded)
select p.id,
       p.sent,
       (p.sent * p.open_rate)::int,
       ((p.sent * p.open_rate) * p.act_rate)::int,
       true
from picks p
on conflict (advisory_id) do update
  set sent = excluded.sent, opened = excluded.opened,
      acted = excluded.acted, seeded = true;

-- ── a new send records its real reach ─────────────────────────────────────

create or replace function public.advisory_record_reach()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare n integer;
begin
  select count(distinct grower_key) into n
  from public.all_scans
  where (new.emirate is null or emirate = new.emirate)
    and (new.areas is null or cardinality(new.areas) = 0 or area = any(new.areas));

  insert into public.demo_advisory_stats (advisory_id, sent, opened, acted, seeded)
  values (new.id, coalesce(n, 0), 0, 0, false)
  on conflict (advisory_id) do update set sent = excluded.sent;

  return new;
end $fn$;

drop trigger if exists advisory_reach_trg on public.advisories;
create trigger advisory_reach_trg
  after insert on public.advisories
  for each row execute function public.advisory_record_reach();

-- ── effectiveness now sums real receipts and demo delivery ────────────────

create or replace function public.gov_advisory_effectiveness()
returns table (
  advisory_id uuid, title text, kind text, severity text, created_at timestamptz,
  sent bigint, opened bigint, acted bigint, acted_pct numeric
)
language sql stable security definer set search_path = public as $fn$
  select a.id, a.title, a.kind, a.severity, a.created_at,
         count(r.*)           + coalesce(d.sent, 0),
         count(r.opened_at)   + coalesce(d.opened, 0),
         count(r.acted_at)    + coalesce(d.acted, 0),
         case
           when (count(r.*) + coalesce(d.sent, 0)) = 0 then 0
           else round(
             100.0 * (count(r.acted_at) + coalesce(d.acted, 0))
                   / (count(r.*) + coalesce(d.sent, 0)), 1)
         end
  from public.advisories a
  left join public.advisory_receipts r    on r.advisory_id = a.id
  left join public.demo_advisory_stats d  on d.advisory_id = a.id
  where public.is_government()
  group by a.id, a.title, a.kind, a.severity, a.created_at, d.sent, d.opened, d.acted
  order by a.created_at desc
  limit 25;
$fn$;

-- ── headline communication figures, so the console does not have to add up ──

create or replace function public.gov_comms()
returns table (
  advisories bigint, sent bigint, opened bigint, acted bigint,
  open_pct numeric, act_pct numeric
)
language sql stable security definer set search_path = public as $fn$
  with e as (select * from public.gov_advisory_effectiveness())
  select count(*),
         coalesce(sum(sent), 0),
         coalesce(sum(opened), 0),
         coalesce(sum(acted), 0),
         case when coalesce(sum(sent), 0) = 0 then 0
              else round(100.0 * sum(opened) / sum(sent), 1) end,
         case when coalesce(sum(sent), 0) = 0 then 0
              else round(100.0 * sum(acted) / sum(sent), 1) end
  from e;
$fn$;

-- Should show three advisories with real-looking reach and response.
select title, sent, opened, acted,
       round(100.0 * acted / nullif(sent, 0), 1) as acted_pct
from public.demo_advisory_stats d
join public.advisories a on a.id = d.advisory_id
order by a.created_at desc;
