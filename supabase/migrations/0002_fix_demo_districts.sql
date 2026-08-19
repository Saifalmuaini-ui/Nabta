-- ═══════════════════════════════════════════════════════════════════════════
-- Fix: the demo activity all landed in one district.
--
-- The original seed picked a district with
--   cross join lateral (select ... order by random() limit 1)
-- which never references the outer row. Postgres is free to evaluate an
-- uncorrelated subquery once and reuse the result, so all 1,400 rows got the
-- same district and the console showed a single bar.
--
-- Every random choice is now made in the target list of a CTE that references
-- the series value, so it is evaluated per row and cannot be hoisted.
-- ═══════════════════════════════════════════════════════════════════════════

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

-- Should print 12 rows, not 1.
select emirate, area, count(*) as scans, count(distinct grower_key) as growers
from public.demo_scans
group by 1, 2
order by 3 desc;
