-- ============================================================================
-- ESix10 — ONE read-only security check of the LIVE database.
--
-- This file CHANGES NOTHING. It only reports what the database currently does.
-- No message text, no prayer text, no email addresses are selected — counts,
-- policy names and permission grants only.
--
-- HOW TO RUN: Supabase dashboard -> SQL Editor -> New query -> paste all of
-- this -> Run. Then send back the result of each numbered section.
--
-- It supersedes verify_message_privacy.sql (that file is still correct; this
-- one adds the checks for what we found exposed to the public key on 18 Aug).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. WHAT IS THE MESSAGES READ POLICY RIGHT NOW?
--
--    This is the whole question the security branch exists to answer.
--    Look at `using_expression`:
--      * `true`                -> WIDE OPEN, every signed-in member can read
--                                 every DM and every private group. Apply the fix.
--      * a membership test     -> already closed (a fix was applied by hand on
--                                 17 Jun and never committed back to the repo).
--    And look at `applies_to_roles`: {public} includes people who are not
--    signed in; {authenticated} means signed-in only.
-- ----------------------------------------------------------------------------
select tablename,
       policyname,
       cmd,
       roles::text as applies_to_roles,
       qual        as using_expression
from   pg_policies
where  schemaname = 'public'
  and  tablename in ('messages', 'profiles', 'private_group_members',
                     'private_groups', 'room_members', 'profile_stats',
                     'prayers', 'posts')
  and  cmd in ('SELECT', 'ALL')
order  by tablename, policyname;


-- ----------------------------------------------------------------------------
-- 2. IS ROW LEVEL SECURITY SWITCHED ON AT ALL?
--
--    A table with rls_enabled = false has NO protection whatever policies say.
--    Every table in this list should read `true`.
-- ----------------------------------------------------------------------------
select c.relname             as table_name,
       c.relrowsecurity      as rls_enabled
from   pg_class c
join   pg_namespace n on n.oid = c.relnamespace
where  n.nspname = 'public'
  and  c.relkind = 'r'
order  by c.relrowsecurity, c.relname;


-- ----------------------------------------------------------------------------
-- 3. WHAT CAN A NOT-SIGNED-IN VISITOR READ?  (the 18 Aug finding)
--
--    `anon` is the public key that ships inside the app's JavaScript — anyone
--    who opens the site has it. Any table listed here with `anon` in the
--    grantees column is readable by the whole internet unless an RLS policy
--    stops it.
--
--    Live testing on 18 Aug showed anon COULD read: private_groups,
--    private_group_members, profile_stats, devotions, kudos, forge_walks,
--    forge_challenges, forge_challenge_completions, forge_wod_completions.
--    Expect those to show up here.
-- ----------------------------------------------------------------------------
select table_name,
       grantee,
       string_agg(distinct privilege_type, ', ' order by privilege_type) as can_do
from   information_schema.role_table_grants
where  table_schema = 'public'
  and  grantee in ('anon', 'authenticated')
group  by table_name, grantee
order  by table_name, grantee;


-- ----------------------------------------------------------------------------
-- 4. IS THE EMAIL COLUMN STILL LOCKED?  (protects Privacy Policy §3)
--
--    On 22 Jun the `email` column was removed from what signed-in members are
--    allowed to read. This proves whether that is still true.
--
--    EXPECTED: a long list of profiles columns for `authenticated`, with
--    `email` NOT among them. If `email` appears for authenticated, the
--    protection has been undone.
-- ----------------------------------------------------------------------------
select grantee,
       string_agg(column_name, ', ' order by column_name) as readable_columns
from   information_schema.column_privileges
where  table_schema = 'public'
  and  table_name   = 'profiles'
  and  privilege_type = 'SELECT'
  and  grantee in ('anon', 'authenticated')
group  by grantee;


-- ----------------------------------------------------------------------------
-- 5. SAFETY CHECK — do the columns the messages fix relies on exist?
--
--    The schema was applied by hand, so some of it was inferred from app code.
--    EXPECTED: 10 rows.
--      messages -> room_id, user_id | private_group_members -> group_id, user_id
--      profiles -> group_id, group_ids, id, role | room_members -> room_id, user_id
-- ----------------------------------------------------------------------------
select table_name, column_name, data_type
from   information_schema.columns
where  table_schema = 'public'
  and  ( (table_name = 'messages'              and column_name in ('room_id', 'user_id'))
      or (table_name = 'profiles'              and column_name in ('id', 'role', 'group_id', 'group_ids'))
      or (table_name = 'private_group_members' and column_name in ('group_id', 'user_id'))
      or (table_name = 'room_members'          and column_name in ('room_id', 'user_id')) )
order  by table_name, column_name;


-- ----------------------------------------------------------------------------
-- 6. SAFETY CHECK — what kinds of chat room actually exist?
--
--    Counts only, no message text. If any row comes back UNRECOGNISED, STOP
--    and send it over: the messages fix would lock that room type out for
--    everyone.
-- ----------------------------------------------------------------------------
select case
         when room_id =    'group_all'            then 'group_all       (leadership chat)'
         when left(room_id, 3)  = 'dm_'           then 'dm_*            (direct messages)'
         when left(room_id, 13) = 'group_custom_' then 'group_custom_*  (casual groups)'
         when left(room_id, 6)  = 'group_'        then 'group_*         (community group chats)'
         when left(room_id, 8)  = 'private_'      then 'private_*       (private groups)'
         else 'UNRECOGNISED -> ' || left(room_id, 16)
       end                     as room_type,
       count(*)                as message_count,
       count(distinct room_id) as room_count
from   messages
group  by 1
order  by message_count desc;
