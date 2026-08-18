-- ============================================================================
-- ESix10 — Stop the public key from reading member data.
--
-- THE PROBLEM (confirmed against the live database, 18 Aug 2026)
--   The app's "anon" key ships inside the JavaScript every visitor downloads.
--   Anyone who opens the site has it. Tested from outside with nothing but
--   that key and no login, these tables answered:
--
--     private_group_members  2 rows   WHICH MEMBER IS IN WHICH PRIVATE GROUP
--     private_groups         2 rows   group name, description, creator
--     profile_stats         12 rows   per-member XP, counts, streaks, miles
--     forge_walks           15 rows   user, distance, duration, personal notes
--     forge_challenges      77 rows
--     forge_challenge_completions 12 rows
--     forge_wod_completions 11 rows
--     devotions              1 row
--     kudos                  1 row    who encouraged whom
--
--   private_group_members is the serious one: private groups are the recovery,
--   survivor and accountability groups that Terms of Use §7 promises are
--   confidential, and their membership list was readable by the whole internet.
--
--   (messages, profiles, prayers, posts, room_members and the flag tables were
--   tested at the same time and correctly returned nothing.)
--
-- THE FIX — two layers
--   PART 1 removes the public key's permission to read these tables at all.
--          This alone closes the leak, whatever the policies say.
--   PART 2 tightens private group membership so one MEMBER cannot list the
--          membership of a private group they do not belong to either.
--
-- WHAT DOES NOT CHANGE
--   Signing up, signing in and password reset do not touch these tables, so
--   the logged-out screens are unaffected. No data is modified or deleted.
--
-- ORDER: run verify_live_security.sql first. Idempotent — safe to re-run.
-- Rollback is at the bottom.
-- ============================================================================


-- ============================================================================
-- PART 1 — take the public key's read permission away.
--
-- `anon` is the not-signed-in role. `authenticated` (signed-in members) keeps
-- its access, so the app itself carries on working exactly as it does now.
-- ============================================================================
revoke select on private_groups              from anon;
revoke select on private_group_members       from anon;
revoke select on profile_stats               from anon;
revoke select on forge_walks                 from anon;
revoke select on forge_challenges            from anon;
revoke select on forge_challenge_completions from anon;
revoke select on forge_wod_completions       from anon;
revoke select on devotions                   from anon;
revoke select on kudos                       from anon;

-- Belt and braces: stop NEW tables from being handed to anon automatically in
-- future. This is the setting that caused the leak in the first place.
alter default privileges in schema public revoke select on tables from anon;


-- ============================================================================
-- PART 2 — private group membership is visible only to that group's members
--          (plus staff).
--
-- Why a function: a policy on private_group_members that itself reads
-- private_group_members would loop forever. SECURITY DEFINER runs the lookup
-- outside row-level security, which breaks the loop. It only ever reports on
-- auth.uid() — the person asking — and returns yes or no, so it cannot be
-- used to read anyone else's data.
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

-- Replace whatever SELECT policies exist on the table with the membership
-- test. The existing policy names were never written down (the schema was
-- applied by hand), so they are found and dropped by name at run time.
do $$
declare pol record;
begin
  for pol in select policyname from pg_policies
             where schemaname = 'public'
               and tablename  = 'private_group_members'
               and cmd in ('SELECT', 'ALL')
  loop
    execute format('drop policy %I on private_group_members', pol.policyname);
    raise notice 'dropped old policy: %', pol.policyname;
  end loop;
end $$;

alter table private_group_members enable row level security;

create policy private_group_members_sel on private_group_members
  for select
  to authenticated
  using (can_see_group_members(group_id));


-- ============================================================================
-- CONFIRM IT TOOK EFFECT
--
-- Expect: NO rows mentioning `anon` in the first result (the public key can no
-- longer read any of them), and one SELECT policy on private_group_members
-- applying to {authenticated}.
-- ============================================================================
select table_name, grantee, privilege_type
from   information_schema.role_table_grants
where  table_schema = 'public'
  and  grantee = 'anon'
  and  privilege_type = 'SELECT'
  and  table_name in ('private_groups', 'private_group_members', 'profile_stats',
                      'forge_walks', 'forge_challenges', 'forge_challenge_completions',
                      'forge_wod_completions', 'devotions', 'kudos')
order  by table_name;

select policyname, roles::text as applies_to_roles, qual as using_expression
from   pg_policies
where  schemaname = 'public' and tablename = 'private_group_members';


-- ============================================================================
-- ROLLBACK — if something in the app stops loading, run this to put it back
-- exactly as it was, then send over what broke.
--
--   grant select on private_groups, private_group_members, profile_stats,
--                   forge_walks, forge_challenges, forge_challenge_completions,
--                   forge_wod_completions, devotions, kudos to anon;
--   alter default privileges in schema public grant select on tables to anon;
--   drop policy if exists private_group_members_sel on private_group_members;
--   create policy private_group_members_sel on private_group_members
--     for select to authenticated using (true);
-- ============================================================================
