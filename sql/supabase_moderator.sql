-- ============================================================================
-- ESix10 — Moderator role
-- Adds a "moderator" tier that can use the Admin Dashboard moderation actions
-- (approve members, handle flagged posts/members, approve events & local recs,
-- remove flagged members) but CANNOT change roles or create official content.
-- Run in Supabase SQL Editor. Idempotent / safe to re-run.
-- (To make someone a moderator: set profiles.role = 'moderator' — the app's
--  Members tab now has a "Make Mod" button for admins.)
-- ============================================================================

-- Staff = admin OR moderator.
create or replace function is_staff()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('admin','moderator'));
$$;

-- ── profiles: staff may update other members (needed to approve/deny/remove).
-- A guard ensures ONLY admins change roles, and ONLY staff change status —
-- this also stops a pending member from self-approving.
drop policy if exists "Users can update own profile" on profiles;
drop policy if exists "staff update profiles" on profiles;
create policy "staff update profiles" on profiles for update using (is_staff() or auth.uid() = id);

create or replace function guard_profile_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not is_admin() then
    raise exception 'Only admins can change a member role.';
  end if;
  if new.status is distinct from old.status and not is_staff() then
    raise exception 'Only admins or moderators can change a member status.';
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_profile_privileges on profiles;
create trigger trg_guard_profile_privileges before update on profiles
  for each row execute function guard_profile_privileges();

-- ── Moderation actions: allow staff (admin OR moderator) ────────────────────
drop policy if exists "update flags" on post_flags;
create policy "update flags" on post_flags for update using (is_staff());

drop policy if exists "update member flags" on member_flags;
create policy "update member flags" on member_flags for update using (is_staff());

drop policy if exists "update events" on events;
drop policy if exists "delete events" on events;
create policy "update events" on events for update using (is_staff());
create policy "delete events" on events for delete using (auth.uid() = created_by or is_staff());

drop policy if exists "update recs" on local_recommendations;
drop policy if exists "delete recs" on local_recommendations;
create policy "update recs" on local_recommendations for update using (is_staff());
create policy "delete recs" on local_recommendations for delete using (auth.uid() = added_by or is_staff());

drop policy if exists "delete posts" on posts;
create policy "delete posts" on posts for delete using (auth.uid() = user_id or is_staff());

-- ============================================================================
-- DONE. Creating devotions / challenges / WODs and changing roles stay
-- ADMIN-only (those use is_admin(), unchanged).
-- ============================================================================
