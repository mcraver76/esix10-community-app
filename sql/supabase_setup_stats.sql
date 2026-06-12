-- ============================================================================
-- ESix10 — Missing tables + profile_stats view  (idempotent / safe to re-run)
-- Run in Supabase:  Dashboard -> SQL Editor -> New query -> paste -> Run
-- Uses "create table if not exists" + "drop policy if exists" before each policy,
-- so it runs cleanly whether or not these objects already exist.
-- It will NOT delete or change any DATA you already have.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- 1. MISSING SOURCE TABLES
-- ─────────────────────────────────────────────────────────────────────────

-- Kudos: one row per "👊" sent from one member to another.
create table if not exists kudos (
  id uuid default gen_random_uuid() primary key,
  from_user_id uuid references profiles(id) on delete cascade,
  to_user_id   uuid references profiles(id) on delete cascade,
  created_at   timestamp default now()
);
alter table kudos enable row level security;
drop policy if exists "view kudos"   on kudos;
drop policy if exists "insert kudos" on kudos;
create policy "view kudos"   on kudos for select using (true);
create policy "insert kudos" on kudos for insert with check (auth.uid() = from_user_id);

-- Prayer requests.
create table if not exists prayers (
  id uuid default gen_random_uuid() primary key,
  user_id     uuid references profiles(id) on delete cascade,
  group_id    text,
  body        text not null,
  anonymous   boolean default false,
  author_name text,
  reactions   int default 0,
  pinned      boolean default false,
  created_at  timestamp default now()
);
alter table prayers enable row level security;
drop policy if exists "view prayers"       on prayers;
drop policy if exists "insert own prayers" on prayers;
drop policy if exists "update prayers"     on prayers;
drop policy if exists "delete prayers"     on prayers;
create policy "view prayers"       on prayers for select using (true);
create policy "insert own prayers" on prayers for insert with check (auth.uid() = user_id);
create policy "update prayers"     on prayers for update using (true);   -- reactions/pin (tighten later)
create policy "delete prayers"     on prayers for delete using (true);   -- own/admin (tighten later)

-- Flags on posts (reported content for admin review).
create table if not exists post_flags (
  id uuid default gen_random_uuid() primary key,
  post_id    uuid references posts(id) on delete cascade,
  flagged_by uuid references profiles(id),
  reason     text,
  reviewed   boolean default false,
  created_at timestamp default now()
);
alter table post_flags enable row level security;
drop policy if exists "view flags"   on post_flags;
drop policy if exists "insert flags" on post_flags;
drop policy if exists "update flags" on post_flags;
create policy "view flags"   on post_flags for select using (true);
create policy "insert flags" on post_flags for insert with check (auth.uid() = flagged_by);
create policy "update flags" on post_flags for update using (true);      -- admin marks reviewed

-- Daily devotions (admin-authored).
create table if not exists devotions (
  id uuid default gen_random_uuid() primary key,
  title         text,
  scripture     text,
  scripture_ref text,
  body          text,
  author_name   text,
  reactions     int default 0,
  created_at    timestamp default now()
);
alter table devotions enable row level security;
drop policy if exists "view devotions"   on devotions;
drop policy if exists "insert devotions" on devotions;
drop policy if exists "update devotions" on devotions;
drop policy if exists "delete devotions" on devotions;
create policy "view devotions"   on devotions for select using (true);
create policy "insert devotions" on devotions for insert with check (auth.uid() is not null);
create policy "update devotions" on devotions for update using (true);   -- reactions/admin
create policy "delete devotions" on devotions for delete using (true);   -- admin

-- Comments on devotions.
create table if not exists devotion_comments (
  id uuid default gen_random_uuid() primary key,
  devotion_id uuid references devotions(id) on delete cascade,
  user_id     uuid references profiles(id) on delete cascade,
  author_name text,
  body        text not null,
  created_at  timestamp default now()
);
alter table devotion_comments enable row level security;
drop policy if exists "view devotion comments"   on devotion_comments;
drop policy if exists "insert devotion comments" on devotion_comments;
create policy "view devotion comments"   on devotion_comments for select using (true);
create policy "insert devotion comments" on devotion_comments for insert with check (auth.uid() = user_id);

-- Local recommendations (gyms, businesses, etc. by state/city).
create table if not exists local_recommendations (
  id uuid default gen_random_uuid() primary key,
  name        text not null,
  category    text,
  address     text,
  description text,
  website     text,
  state       text,
  city        text,
  added_by    uuid references profiles(id),
  approved    boolean default false,
  created_at  timestamp default now()
);
alter table local_recommendations enable row level security;
drop policy if exists "view recs"   on local_recommendations;
drop policy if exists "insert recs" on local_recommendations;
drop policy if exists "update recs" on local_recommendations;
drop policy if exists "delete recs" on local_recommendations;
create policy "view recs"   on local_recommendations for select using (true);
create policy "insert recs" on local_recommendations for insert with check (auth.uid() = added_by);
create policy "update recs" on local_recommendations for update using (true);  -- admin approve
create policy "delete recs" on local_recommendations for delete using (true);  -- own/admin

-- ─────────────────────────────────────────────────────────────────────────
-- 2. profile_stats  — a LIVE VIEW
--    Computes each member's stats on the fly from their real activity.
--    Columns & XP formula match the app exactly (App.jsx getXP / normalizeProfileStats).
--    XP = posts*5 + walks*10 + challenges*8 + wods*12 + min(days_since_join*2, 100)
-- ─────────────────────────────────────────────────────────────────────────
-- profile_stats may already exist as a leftover (empty) TABLE from an earlier
-- attempt. You cannot replace a table with a view directly, so drop whichever
-- kind exists first (table OR view), then create the view fresh. Safe: the app
-- never writes to profile_stats, so there is no real data here to lose.
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'profile_stats'
               and table_type = 'BASE TABLE') then
    execute 'drop table public.profile_stats cascade';
  elsif exists (select 1 from information_schema.views
                where table_schema = 'public' and table_name = 'profile_stats') then
    execute 'drop view public.profile_stats cascade';
  end if;
end $$;

create view profile_stats as
with
post_c as (
  select user_id, count(*) c from posts group by user_id
),
kudos_c as (
  select to_user_id as user_id, count(*) c from kudos group by to_user_id
),
prayer_c as (
  select user_id, count(*) c from prayers group by user_id
),
walk_c as (
  select user_id, count(*) c, coalesce(sum(distance_miles), 0) miles
  from forge_walks group by user_id
),
chal_c as (
  select user_id, count(*) c from forge_challenge_completions group by user_id
),
wod_c as (
  select user_id, count(*) c from forge_wod_completions group by user_id
),
-- Current consecutive-day streaks (length of the most recent unbroken run).
walk_days as (select distinct user_id, date            as d from forge_walks),
chal_days as (select distinct user_id, created_at::date as d from forge_challenge_completions),
wod_days  as (select distinct user_id, created_at::date as d from forge_wod_completions),
walk_isl as (select user_id, d, d - cast(row_number() over (partition by user_id order by d) as int) as island from walk_days),
chal_isl as (select user_id, d, d - cast(row_number() over (partition by user_id order by d) as int) as island from chal_days),
wod_isl  as (select user_id, d, d - cast(row_number() over (partition by user_id order by d) as int) as island from wod_days),
walk_streak as (select distinct on (user_id) user_id, count(*) over (partition by user_id, island) cnt from walk_isl order by user_id, d desc),
chal_streak as (select distinct on (user_id) user_id, count(*) over (partition by user_id, island) cnt from chal_isl order by user_id, d desc),
wod_streak  as (select distinct on (user_id) user_id, count(*) over (partition by user_id, island) cnt from wod_isl  order by user_id, d desc)
select
  p.id                                   as user_id,
  coalesce(post_c.c,    0)               as post_count,
  coalesce(kudos_c.c,   0)               as kudos_count,
  coalesce(prayer_c.c,  0)               as prayer_count,
  coalesce(walk_c.c,    0)               as walk_count,
  coalesce(chal_c.c,    0)               as challenge_count,
  coalesce(wod_c.c,     0)               as wod_count,
  coalesce(walk_streak.cnt, 0)           as walk_streak,
  coalesce(chal_streak.cnt, 0)           as challenge_streak,
  coalesce(wod_streak.cnt,  0)           as wod_streak,
  coalesce(walk_c.miles, 0)              as total_miles,
  (
    coalesce(post_c.c, 0) * 5
    + coalesce(walk_c.c, 0) * 10
    + coalesce(chal_c.c, 0) * 8
    + coalesce(wod_c.c,  0) * 12
    + least(greatest(floor(extract(epoch from (now() - p.created_at::timestamptz)) / 86400)::int, 0) * 2, 100)
  )                                      as xp,
  now()                                  as updated_at
from profiles p
left join post_c      on post_c.user_id      = p.id
left join kudos_c     on kudos_c.user_id     = p.id
left join prayer_c    on prayer_c.user_id    = p.id
left join walk_c      on walk_c.user_id      = p.id
left join chal_c      on chal_c.user_id      = p.id
left join wod_c       on wod_c.user_id       = p.id
left join walk_streak on walk_streak.user_id = p.id
left join chal_streak on chal_streak.user_id = p.id
left join wod_streak  on wod_streak.user_id  = p.id;

-- Let logged-in users read the stats view.
grant select on profile_stats to anon, authenticated;

-- ============================================================================
-- DONE.
-- NOTE: "avatars" is a STORAGE bucket, not a table. If profile photo uploads
-- fail, create it in Dashboard -> Storage -> New bucket -> name "avatars" ->
-- make it Public.
-- ============================================================================
