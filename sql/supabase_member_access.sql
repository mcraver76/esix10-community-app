-- ============================================================================
-- ESix10 — "Auto-approve with limited access" enforcement
-- New members are let into the app immediately but may only BROWSE + REACT
-- until an admin approves their profile. This blocks create-actions in the
-- database (not just the UI), so the limit can't be bypassed.
-- Run in Supabase SQL Editor. Idempotent / safe to re-run.
-- ============================================================================

-- Is the current user an approved member (or an admin)?
create or replace function is_approved()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and (status = 'approved' or role = 'admin')
  );
$$;

-- POSTS — only approved members may post
drop policy if exists "insert posts"        on posts;
drop policy if exists "Members can insert posts" on posts;
create policy "insert posts" on posts for insert with check (auth.uid() = user_id and is_approved());

-- PRAYERS
drop policy if exists "insert own prayers" on prayers;
create policy "insert own prayers" on prayers for insert with check (auth.uid() = user_id and is_approved());

-- DEVOTION COMMENTS
drop policy if exists "insert devotion comments" on devotion_comments;
create policy "insert devotion comments" on devotion_comments for insert with check (auth.uid() = user_id and is_approved());

-- MESSAGES (covers direct messages and private-group chat)
drop policy if exists "insert messages" on messages;
create policy "insert messages" on messages for insert with check (auth.uid() = user_id and is_approved());

-- KUDOS
drop policy if exists "insert kudos" on kudos;
create policy "insert kudos" on kudos for insert with check (auth.uid() = from_user_id and is_approved());

-- EVENTS (already member-submittable & admin-approved; now also requires approval to submit)
drop policy if exists "insert events" on events;
create policy "insert events" on events for insert with check (auth.uid() = created_by and is_approved());

-- ============================================================================
-- NOTE: Reactions (🙏/❤️) stay OPEN to pending members — they are UPDATEs on
-- posts/prayers/devotions, governed by the existing update rules + guard, and
-- are intentionally NOT gated here.
--
-- Private GROUPS (private_groups / private_group_requests): blocked in the app
-- UI for pending members. If those tables have RLS we want to harden too, tell
-- me and I'll add matching insert rules once we confirm their columns.
-- ============================================================================
