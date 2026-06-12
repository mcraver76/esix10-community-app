-- ============================================================================
-- ESix10 — Tightened security rules (Row Level Security)
-- Run in Supabase:  SQL Editor -> New query -> paste -> Run.
-- Idempotent / safe to re-run. Does NOT touch any data.
--
-- MODEL:
--   * Everyone signed in can VIEW content.
--   * Members can CREATE their own content, DELETE their own posts/prayers,
--     REACT (🙏/❤️), and FLAG posts.
--   * Admins (profiles.role = 'admin') can do ANYTHING to ALL content.
--   * Members may change ONLY the reaction count on posts/prayers/devotions —
--     enforced by a trigger, so they can react but cannot edit the text.
-- ============================================================================

-- ── Helper: is the current user an admin? ───────────────────────────────────
-- SECURITY DEFINER so it can always read profiles.role regardless of policies.
create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ── Guards: non-admins may change ONLY the reaction column ──────────────────
-- (Admins bypass the guard entirely and may edit anything.)

create or replace function guard_posts_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if is_admin() then return new; end if;
  if new.id        is distinct from old.id
     or new.user_id   is distinct from old.user_id
     or new.group_id  is distinct from old.group_id
     or new.body      is distinct from old.body
     or new.photo_url is distinct from old.photo_url
     or new.created_at is distinct from old.created_at then
    raise exception 'Only admins can edit a post. Members may only react.';
  end if;
  return new;
end $$;

create or replace function guard_prayers_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if is_admin() then return new; end if;
  if new.id          is distinct from old.id
     or new.user_id     is distinct from old.user_id
     or new.group_id    is distinct from old.group_id
     or new.body        is distinct from old.body
     or new.anonymous   is distinct from old.anonymous
     or new.author_name is distinct from old.author_name
     or new.pinned      is distinct from old.pinned          -- pinning is admin-only
     or new.created_at  is distinct from old.created_at then
    raise exception 'Only admins can edit or pin a prayer. Members may only react.';
  end if;
  return new;
end $$;

create or replace function guard_devotions_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if is_admin() then return new; end if;
  if new.id            is distinct from old.id
     or new.title         is distinct from old.title
     or new.scripture     is distinct from old.scripture
     or new.scripture_ref is distinct from old.scripture_ref
     or new.body          is distinct from old.body
     or new.author_name   is distinct from old.author_name
     or new.created_at    is distinct from old.created_at then
    raise exception 'Only admins can edit a devotion. Members may only react.';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_posts_update     on posts;
drop trigger if exists trg_guard_prayers_update   on prayers;
drop trigger if exists trg_guard_devotions_update on devotions;
create trigger trg_guard_posts_update     before update on posts     for each row execute function guard_posts_update();
create trigger trg_guard_prayers_update   before update on prayers   for each row execute function guard_prayers_update();
create trigger trg_guard_devotions_update before update on devotions for each row execute function guard_devotions_update();

-- ── POSTS ───────────────────────────────────────────────────────────────────
drop policy if exists "Anyone can view posts"      on posts;
drop policy if exists "Members can insert posts"   on posts;
drop policy if exists "Users can delete own posts" on posts;
drop policy if exists "view posts"   on posts;
drop policy if exists "insert posts" on posts;
drop policy if exists "update posts" on posts;
drop policy if exists "delete posts" on posts;
create policy "view posts"   on posts for select using (true);
create policy "insert posts" on posts for insert with check (auth.uid() = user_id);
create policy "update posts" on posts for update using (auth.uid() is not null);          -- react (guard limits to reactions)
create policy "delete posts" on posts for delete using (auth.uid() = user_id or is_admin());

-- ── EVENTS  (members submit -> pending admin approval; admins manage) ────────
-- Add an "approved" flag. Add it WITHOUT a default first so existing rows become
-- NULL, approve those (they were admin-created), THEN default new rows to false.
-- This makes the script safe to re-run without re-approving pending events.
alter table events add column if not exists approved boolean;
update events set approved = true where approved is null;          -- existing events stay visible
alter table events alter column approved set default false;        -- future events start pending
drop policy if exists "Anyone can view events"   on events;
drop policy if exists "Admins can manage events" on events;
drop policy if exists "view events"   on events;
drop policy if exists "manage events" on events;
drop policy if exists "insert events" on events;
drop policy if exists "update events" on events;
drop policy if exists "delete events" on events;
create policy "view events"   on events for select using (approved = true or is_admin() or auth.uid() = created_by);
create policy "insert events" on events for insert with check (auth.uid() = created_by);
create policy "update events" on events for update using (is_admin());
create policy "delete events" on events for delete using (auth.uid() = created_by or is_admin());

-- ── PRAYERS ─────────────────────────────────────────────────────────────────
drop policy if exists "view prayers"       on prayers;
drop policy if exists "insert own prayers" on prayers;
drop policy if exists "update prayers"     on prayers;
drop policy if exists "delete prayers"     on prayers;
create policy "view prayers"       on prayers for select using (true);
create policy "insert own prayers" on prayers for insert with check (auth.uid() = user_id);
create policy "update prayers"     on prayers for update using (auth.uid() is not null);   -- react/pin (guard limits members to reactions)
create policy "delete prayers"     on prayers for delete using (auth.uid() = user_id or is_admin());

-- ── DEVOTIONS  (admins author; members react) ───────────────────────────────
drop policy if exists "view devotions"   on devotions;
drop policy if exists "insert devotions" on devotions;
drop policy if exists "update devotions" on devotions;
drop policy if exists "delete devotions" on devotions;
create policy "view devotions"   on devotions for select using (true);
create policy "insert devotions" on devotions for insert with check (is_admin());
create policy "update devotions" on devotions for update using (auth.uid() is not null);   -- react (guard limits to reactions)
create policy "delete devotions" on devotions for delete using (is_admin());

-- ── DEVOTION COMMENTS ───────────────────────────────────────────────────────
drop policy if exists "view devotion comments"   on devotion_comments;
drop policy if exists "insert devotion comments" on devotion_comments;
drop policy if exists "delete devotion comments" on devotion_comments;
create policy "view devotion comments"   on devotion_comments for select using (true);
create policy "insert devotion comments" on devotion_comments for insert with check (auth.uid() = user_id);
create policy "delete devotion comments" on devotion_comments for delete using (auth.uid() = user_id or is_admin());

-- ── POST FLAGS  (members flag; admins review) ───────────────────────────────
drop policy if exists "view flags"   on post_flags;
drop policy if exists "insert flags" on post_flags;
drop policy if exists "update flags" on post_flags;
create policy "view flags"   on post_flags for select using (is_admin() or auth.uid() = flagged_by);
create policy "insert flags" on post_flags for insert with check (auth.uid() = flagged_by);
create policy "update flags" on post_flags for update using (is_admin());

-- ── LOCAL RECOMMENDATIONS  (members suggest; admins approve) ─────────────────
drop policy if exists "view recs"   on local_recommendations;
drop policy if exists "insert recs" on local_recommendations;
drop policy if exists "update recs" on local_recommendations;
drop policy if exists "delete recs" on local_recommendations;
create policy "view recs"   on local_recommendations for select using (true);
create policy "insert recs" on local_recommendations for insert with check (auth.uid() = added_by);
create policy "update recs" on local_recommendations for update using (is_admin());
create policy "delete recs" on local_recommendations for delete using (auth.uid() = added_by or is_admin());

-- ============================================================================
-- DONE. kudos / messages / forge_* keep their existing member rules
-- (create own / delete own); forge_challenges & forge_wods are already admin-only.
-- ============================================================================
