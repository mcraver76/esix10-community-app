-- ============================================================================
-- ESix10 — Restrict who can READ messages to the people in the room.
--
-- THE PROBLEM
--   The existing read policy is:
--       create policy "view messages" on messages for select using (true);
--   `using (true)` means the database approves every read request. Because the
--   policy targets PUBLIC rather than `authenticated`, that can include
--   requests carrying only the public anon key, which ships inside the app's
--   JavaScript. The app's screens only ever display your own conversations,
--   so nothing looks wrong from inside the app — but the screen is not what
--   protects the data. This policy is.
--
--   The messages table holds all five kinds of conversation, including
--   direct messages and private-group chat (Terms of Use §7 promises those
--   are confidential).
--
-- THE FIX
--   You can read a room only if you belong to it:
--     dm_<a>_<b>        one of the two ids is yours
--     group_all         admins only
--     group_custom_<n>  you have a row in room_members for that room
--     group_<id>        that group is one of yours (admins see all)
--     private_<id>      you have a row in private_group_members for it
--
-- WHAT DOES NOT CHANGE
--   Sending, editing and deleting messages are governed by separate policies
--   and are untouched. No data is modified. No table is altered.
--
-- BEFORE RUNNING
--   Run verify_message_privacy.sql first. Section 3 must return all 10 rows,
--   and section 4 must not report any UNRECOGNISED room type.
--
-- Idempotent — safe to re-run. Rollback is at the bottom of this file.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- The membership test.
--
-- SECURITY DEFINER is deliberate: this function reads room_members,
-- private_group_members and profiles, each of which has its own row-level
-- security. Running it as the definer lets it answer the membership question
-- without those policies interfering. It is safe because the function only
-- ever reports on auth.uid() — the person asking — and returns a yes/no. It
-- cannot be used to read anyone else's data.
--
-- `set search_path = public` stops the function resolving table names
-- somewhere unexpected.
-- ----------------------------------------------------------------------------
create or replace function can_read_room(rid text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select case

    -- Direct messages. Room key is dm_<uuidA>_<uuidB> with the two ids sorted,
    -- so your own id must be one of the two.
    when left(rid, 3) = 'dm_' then
      auth.uid()::text in (split_part(rid, '_', 2), split_part(rid, '_', 3))

    -- Leadership chat: admins only. Checked before the general group_ rule.
    when rid = 'group_all' then
      exists (select 1 from profiles p
               where p.id = auth.uid() and p.role = 'admin')

    -- Casual groups: membership lives in room_members.
    -- Checked before the general group_ rule, which would otherwise match too.
    when left(rid, 13) = 'group_custom_' then
      exists (select 1 from room_members rm
               where rm.room_id = rid and rm.user_id = auth.uid())

    -- Community group chats (brotherhood / sisterhood / family).
    -- A member may belong to several groups; admins can see all of them,
    -- which matches what the app already shows them.
    when left(rid, 6) = 'group_' then
      exists (select 1 from profiles p
               where p.id = auth.uid()
                 and ( p.role = 'admin'
                    or substring(rid from 7) = p.group_id
                    or substring(rid from 7) = any(coalesce(p.group_ids, '{}')) ))

    -- Private groups: membership lives in private_group_members.
    -- Note there is no admin override here — see the note at the bottom.
    when left(rid, 8) = 'private_' then
      exists (select 1 from private_group_members pgm
               where pgm.user_id = auth.uid()
                 and pgm.group_id::text = substring(rid from 9))

    -- Anything we do not recognise is denied rather than allowed.
    else false
  end
$$;


-- ----------------------------------------------------------------------------
-- Swap the open policy for the membership test.
--
-- `to authenticated` is part of the fix: it also stops requests that are not
-- signed in, which the old PUBLIC-targeted policy did not.
-- ----------------------------------------------------------------------------
drop policy if exists "view messages" on messages;
drop policy if exists messages_sel     on messages;

create policy messages_sel on messages
  for select
  to authenticated
  using (can_read_room(room_id));


-- ----------------------------------------------------------------------------
-- Confirm it took effect. Expect exactly one SELECT policy on messages,
-- applying to {authenticated}, with can_read_room(room_id) as its expression.
-- ----------------------------------------------------------------------------
select policyname,
       roles::text as applies_to_roles,
       qual        as using_expression
from   pg_policies
where  schemaname = 'public' and tablename = 'messages' and cmd = 'SELECT';


-- ============================================================================
-- A DECISION WORTH MAKING DELIBERATELY
--
-- As written, an admin can read the community group chats and the leadership
-- chat, but NOT other members' direct messages and NOT private groups they
-- have not joined.
--
-- That is the stricter reading, and it matches your own Moderator Agreement
-- ("Don't look into people's information without a reason tied to your role")
-- and Terms §7. It is a real change from today, where an admin could read
-- everything. If you would rather admins retain a full view, say so and the
-- private_ branch can be widened — but consider that recovery, survivors and
-- accountability groups are exactly what lives behind that branch.
--
--
-- ROLLBACK
--   If something in the app stops loading and you need the old behaviour back
--   immediately, run these two lines. This re-opens read access to everyone,
--   so treat it as a temporary measure:
--
--     drop policy if exists messages_sel on messages;
--     create policy "view messages" on messages for select using (true);
--
--   Then send over what broke.
-- ============================================================================
