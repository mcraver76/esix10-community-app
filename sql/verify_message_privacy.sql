-- ============================================================================
-- ESix10 — READ-ONLY diagnostic for message privacy.
--
-- This file CHANGES NOTHING. It only reports what the live database currently
-- does. Run it in the Supabase SQL Editor and read the four result sets.
--
-- Run this BEFORE fix_message_read_policy.sql. Section 4 in particular is a
-- safety check: it proves the fix will not accidentally lock anyone out of a
-- room type we did not know about.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Who can currently READ these tables?
--
--    Look at the `using_expression` column. If it says `true`, that table is
--    readable by everyone the `roles` column names — no restriction at all.
--    If `roles` says {public} rather than {authenticated}, that includes
--    requests that are not signed in.
-- ----------------------------------------------------------------------------
select tablename,
       policyname,
       cmd,
       roles::text as applies_to_roles,
       qual        as using_expression
from   pg_policies
where  schemaname = 'public'
  and  tablename in ('messages', 'profiles', 'private_group_members',
                     'private_groups', 'room_members')
  and  cmd in ('SELECT', 'ALL')
order  by tablename, policyname;


-- ----------------------------------------------------------------------------
-- 2. Is Row Level Security actually switched ON for those tables?
--
--    A table with rls_enabled = false has NO protection at all, whatever
--    policies exist on it.
-- ----------------------------------------------------------------------------
select c.relname              as table_name,
       c.relrowsecurity       as rls_enabled,
       c.relforcerowsecurity  as rls_forced
from   pg_class c
join   pg_namespace n on n.oid = c.relnamespace
where  n.nspname = 'public'
  and  c.relname in ('messages', 'profiles', 'private_group_members',
                     'private_groups', 'room_members')
order  by c.relname;


-- ----------------------------------------------------------------------------
-- 3. Confirm the columns the fix depends on actually exist.
--
--    The community app's schema was applied by hand, so parts of it were
--    inferred from the app code rather than read from a migration file.
--    Every row listed below must come back, or the fix will fail to install.
--
--    Expected 10 rows:
--      messages              -> room_id, user_id
--      private_group_members -> group_id, user_id
--      profiles              -> group_id, group_ids, id, role
--      room_members          -> room_id, user_id
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
-- 4. SAFETY CHECK — what kinds of chat room actually exist?
--
--    Counts only. No message text is selected, so nobody's private
--    conversation is exposed by running this.
--
--    The fix understands the five room types listed below. If a row comes back
--    labelled UNRECOGNISED, STOP and send it over before applying the fix —
--    that room type would be locked out for everyone.
-- ----------------------------------------------------------------------------
select case
         when room_id =    'group_all'         then 'group_all       (leadership chat)'
         when left(room_id, 3)  = 'dm_'        then 'dm_*            (direct messages)'
         when left(room_id, 13) = 'group_custom_' then 'group_custom_*  (casual groups)'
         when left(room_id, 6)  = 'group_'     then 'group_*         (community group chats)'
         when left(room_id, 8)  = 'private_'   then 'private_*       (private groups)'
         else 'UNRECOGNISED -> ' || left(room_id, 16)
       end                       as room_type,
       count(*)                  as message_count,
       count(distinct room_id)   as room_count
from   messages
group  by 1
order  by message_count desc;
