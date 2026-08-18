-- ============================================================================
-- ESix10 — Stop the public ("anon") key from reading member data.
--
-- THE PROBLEM (confirmed against the live schema, 18 Aug 2026)
--   Every table in the public schema carries `GRANT ALL ... TO anon`. The anon
--   key ships inside the JavaScript every visitor downloads, so whether a table
--   is exposed comes down entirely to its row-level policy:
--
--     * policies written `TO authenticated`  -> safe (messages, profiles,
--       prayers, posts, room_members all correctly returned nothing when tested)
--     * policies written bare `USING (true)` -> target PUBLIC, so the anon key
--       reads them. These were readable by anyone on the internet:
--
--         private_group_members   WHICH MEMBER IS IN WHICH PRIVATE GROUP
--         private_groups          group name, description, creator
--         profile_stats (view)    per-member XP, counts, streaks, miles
--         forge_walks             user, distance, duration, personal notes
--         forge_challenges, forge_challenge_completions, forge_wod_completions
--         devotions, kudos        who encouraged whom
--         devotion_comments       members' written reflections
--         media_livestreams, forge_wods
--
--   private_group_members is the serious one: private groups are the recovery,
--   survivor and accountability groups that Terms of Use §7 promises are
--   confidential, and their membership list was world-readable.
--
--   NOTE: the last three (devotion_comments, media_livestreams, forge_wods)
--   were exposed by exactly the same mechanism but returned no rows when probed
--   only because they were empty at the time. Enumerating "what leaked" misses
--   them; revoking by default does not. Hence PART 1 below is a blanket revoke.
--
-- THE FIX — two layers
--   PART 1  the anon key loses read permission on every table and view. This
--           alone closes the leak regardless of what any policy says.
--   PART 2  private-group membership becomes visible only to that group's own
--           members (plus staff), so one signed-in MEMBER cannot list the
--           roster of a private group they do not belong to.
--
-- WHAT DOES NOT CHANGE
--   Signed-in members use the `authenticated` role and keep all current access.
--   Sign-up / sign-in / password reset use the auth endpoints, not these
--   tables, so the logged-out screens are unaffected. No data is modified.
--
-- Idempotent — safe to re-run. Rollback at the bottom.
-- ============================================================================


-- ============================================================================
-- PART 1 — take the public key's read permission away, everywhere.
-- ============================================================================
do $$
declare r record;
begin
  for r in
      select tablename as name from pg_tables where schemaname = 'public'
      union all
      select viewname  as name from pg_views  where schemaname = 'public'
  loop
    execute format('revoke select on public.%I from anon', r.name);
  end loop;
end $$;

-- Stop NEW tables from being handed to anon automatically in future. This
-- default is what created the exposure in the first place.
alter default privileges in schema public revoke select on tables from anon;


-- ============================================================================
-- PART 2 — private group membership is visible only to that group's members
--          (plus staff).
--
-- Why a function: a policy on private_group_members that itself reads
-- private_group_members would recurse. SECURITY DEFINER runs the lookup outside
-- row-level security, breaking the loop. It only ever reports on auth.uid() --
-- the person asking -- and returns yes/no, so it cannot be used to read anyone
-- else's data. `set search_path` stops it resolving names unexpectedly.
-- ============================================================================
create or replace function can_see_group_members(gid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from private_group_members m
                  where m.group_id = gid and m.user_id = auth.uid())
      or exists (select 1 from profiles p
                  where p.id = auth.uid() and p.role in ('admin', 'moderator'))
$$;

-- The existing policy names were never recorded (schema was applied by hand),
-- so find and drop them at run time.
do $$
declare pol record;
begin
  for pol in select policyname from pg_policies
             where schemaname = 'public'
               and tablename  = 'private_group_members'
               and cmd in ('SELECT', 'ALL')
  loop
    execute format('drop policy %I on private_group_members', pol.policyname);
  end loop;
end $$;

alter table private_group_members enable row level security;

drop policy if exists private_group_members_sel on private_group_members;
create policy private_group_members_sel on private_group_members
  for select
  to authenticated
  using (can_see_group_members(group_id));


-- ============================================================================
-- ROLLBACK (temporary measure only — it re-opens the leak):
--
--   do $$ declare r record; begin
--     for r in select tablename as name from pg_tables where schemaname='public'
--              union all select viewname from pg_views where schemaname='public'
--     loop execute format('grant select on public.%I to anon', r.name); end loop;
--   end $$;
--   alter default privileges in schema public grant select on tables to anon;
--   drop policy if exists private_group_members_sel on private_group_members;
--   create policy private_group_members_sel on private_group_members
--     for select to authenticated using (true);
-- ============================================================================
