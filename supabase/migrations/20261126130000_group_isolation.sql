-- Group isolation (Michael 2026-11-26: "making sure there's no way for sensitive conversations
-- to be able to be bled out into anything else", e.g. a domestic-violence survivors private group).
-- Lúthien. Local test server first. Safe to re-run.
--
-- BEFORE: every signed-in person (even pending/removed) could read every group's posts and prayer
-- requests by calling the database directly; the screens only HID other groups. Anonymous prayers
-- still carried the author's id. Any moderator could see who is in every private group.
-- AFTER:
--  * Posts + prayers: readable only by approved members of that group (+ platform admin, + the author).
--    You can only post into a group you're in.
--  * Prayers are read through prayer_wall, which never shows who posted an anonymous request
--    (not even to admins). Authors see "is_mine" so they can still delete their own.
--  * Private group member lists: members + platform admin only (moderators no longer).
--  * Live updates (realtime) follow the same rules automatically (they check these policies).

-- Which groups am I in? (approved people only)
create or replace function public.my_groups() returns text[]
language sql stable security definer set search_path = public as $$
  select case when p.status = 'approved'
              then coalesce(p.group_ids, '{}') || coalesce(p.group_id, '')
              else '{}'::text[] end
  from profiles p where p.id = auth.uid();
$$;
revoke all on function public.my_groups() from public, anon;
grant execute on function public.my_groups() to authenticated;

------------------------------------------------------------------ posts
drop policy if exists "view posts" on public.posts;
create policy "view posts" on public.posts for select to authenticated
  using (public.is_admin() or user_id = auth.uid()
         or group_id = any(coalesce(public.my_groups(), '{}')));

drop policy if exists "insert posts" on public.posts;
create policy "insert posts" on public.posts for insert to authenticated
  with check (auth.uid() = user_id and public.is_approved()
              and (public.is_admin() or group_id = any(coalesce(public.my_groups(), '{}'))));

------------------------------------------------------------------ prayers
-- The table itself: only your own rows (and admin) are readable directly.
drop policy if exists "view prayers" on public.prayers;
create policy "view prayers" on public.prayers for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "insert own prayers" on public.prayers;
create policy "insert own prayers" on public.prayers for insert to authenticated
  with check (auth.uid() = user_id and public.is_approved()
              and (public.is_admin() or group_id = any(coalesce(public.my_groups(), '{}'))));

-- The prayer wall everyone reads: group-scoped, and anonymous means anonymous.
create or replace view public.prayer_wall with (security_barrier = true) as
  select pr.id, pr.group_id, pr.body, pr.anonymous,
         case when pr.anonymous then null else pr.user_id end as user_id,
         case when pr.anonymous then 'Anonymous' else pr.author_name end as author_name,
         pr.reactions, pr.pinned, pr.created_at,
         (pr.user_id = auth.uid()) as is_mine
  from public.prayers pr
  where public.is_admin() or pr.group_id = any(coalesce(public.my_groups(), '{}'));
revoke all on public.prayer_wall from public, anon;
grant select on public.prayer_wall to authenticated;

------------------------------------------------------------------ private group rosters
create or replace function public.can_see_group_members(gid uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select public.is_admin()
      or (public.is_approved()
          and exists (select 1 from private_group_members m where m.group_id = gid and m.user_id = auth.uid()));
$$;

-- Nobody gets put into a private group without asking: the creator (or admin) can only add
-- someone who has a pending request to join (a creator can't "label" a person as a survivor).
drop policy if exists "insert members" on public.private_group_members;
create policy "insert members" on public.private_group_members for insert to authenticated
  with check (
    public.is_admin()
    or (exists (select 1 from public.private_groups g
                where g.id = private_group_members.group_id and g.created_by = auth.uid())
        and exists (select 1 from public.private_group_requests r
                    where r.group_id = private_group_members.group_id
                      and r.user_id = private_group_members.user_id and r.status = 'pending'))
    or (user_id = auth.uid() and public.is_approved()
        and exists (select 1 from public.private_groups g
                    where g.id = private_group_members.group_id and g.approved and g.join_policy = 'open'))
  );

-- Rollback: restore "view posts"/"view prayers" USING (true) and the baseline insert policies
-- (schema.sql :1325, :1317, :1548, :1552), the 20260818170000 can_see_group_members, then
-- drop view prayer_wall; drop function my_groups().
