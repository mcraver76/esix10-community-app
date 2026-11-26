-- P0 hardening (Tauriel checklist P0-1, P0-2, P0-5a; register SEC-111, SEC-112).
-- Lúthien 2026-11-26. Local test server first; never applied to live without Michael's yes.
-- Safe to re-run (create or replace / drop if exists).
--
-- WHAT THIS CLOSES
--  P0-1  Nobody can create or edit their own profile into admin/approved, or change their
--        own group list, email or avatar URL. Profiles are now created by a server trigger
--        on sign-up (member + pending). The guard runs on INSERT and UPDATE.
--  P0-5a Sign-up is refused server-side unless the person confirmed they are 18 or older.
--  P0-2  One is_room_member(room) helper decides every chat read, post and roster.
--        DMs are real room_members rows made by start_dm() with exactly the 2 people.
--        Custom group chats are made by create_custom_room(). No "room name contains my id"
--        shortcut, no self-join into an empty room, rosters only for your own rooms.
--        Pending / removed members can't read or post in any chat.
--
-- BEHAVIOR NOTES (for Tauriel / Michael)
--  * No more auto-admin by email address. Platform admins are set by the server (SQL/service role).
--  * Admins no longer read other people's DMs or private groups (group chats only). Reports still reach staff.
--  * A brand-new pending member may set their group list ONCE (the first group pick); after that only staff.

------------------------------------------------------------------------------
-- P0-1 / P0-5a: profiles are created by the server at sign-up
------------------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare md jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  -- Adults only (Michael 2026-11-26). The sign-up screen sends age_confirmed_18 = true.
  if coalesce((md->>'age_confirmed_18')::boolean, false) is not true then
    raise exception 'You must be 18 or older to join.' using errcode = 'P0001';
  end if;
  insert into public.profiles (id, email, full_name, username, role, status, terms_version, terms_accepted_at)
  values (
    new.id, new.email,
    coalesce(md->>'full_name', ''),
    nullif(lower(regexp_replace(coalesce(md->>'username',''), '[^a-zA-Z0-9_]', '', 'g')), ''),
    'member', 'pending',
    md->>'terms_version',
    nullif(md->>'terms_accepted_at','')::timestamptz
  )
  on conflict (id) do nothing;
  return new;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- The browser may no longer insert profile rows at all.
drop policy if exists "insert own profile" on public.profiles;

-- One guard for INSERT and UPDATE.
create or replace function public.guard_profile_privileges() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  caller_admin boolean;
  caller_staff boolean;
begin
  if auth.uid() is null then return new; end if;  -- trusted server (service role / triggers)
  caller_admin := exists (select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'approved');
  caller_staff := exists (select 1 from profiles where id = auth.uid() and role in ('admin','moderator') and status = 'approved');

  if tg_op = 'INSERT' then
    if not caller_admin then
      new.role := 'member';
      new.status := 'pending';
      new.group_id := null; new.group_ids := '{}';
      new.mod_agreement_at := null;
    end if;
    return new;
  end if;

  -- UPDATE
  new.id := old.id;
  if not caller_admin then
    new.role := old.role;
    new.email := old.email;
  end if;
  if not caller_staff then
    new.status := old.status;
    new.mod_agreement_at := case when old.role in ('admin','moderator') then new.mod_agreement_at else old.mod_agreement_at end;
    -- Group list: only the first pick by a pending member with no groups yet.
    if (new.group_ids is distinct from old.group_ids or new.group_id is distinct from old.group_id) then
      if not (old.status = 'pending'
              and coalesce(array_length(old.group_ids,1),0) = 0 and old.group_id is null
              and new.group_ids <@ array['brotherhood','sisterhood','family']
              and (new.group_id is null or new.group_id = any(new.group_ids))) then
        new.group_ids := old.group_ids;
        new.group_id := old.group_id;
      end if;
    end if;
    -- Photo avatars need staff approval (members put photos in avatar_pending).
    -- Members may still pick a preset (non-URL) avatar or clear it.
    if new.avatar_url is distinct from old.avatar_url
       and new.avatar_url is not null and new.avatar_url like '%://%' then
      new.avatar_url := old.avatar_url;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists guard_profile_privileges_trg on public.profiles;
drop trigger if exists trg_guard_profile_privileges on public.profiles;
create trigger trg_guard_profile_privileges before insert or update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- Approved = status approved (role alone no longer counts; a removed admin is removed).
create or replace function public.is_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and status = 'approved');
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'approved');
$$;
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('admin','moderator') and status = 'approved');
$$;

------------------------------------------------------------------------------
-- P0-2: one membership helper for every chat
------------------------------------------------------------------------------
create or replace function public.is_room_member(room text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null or not public.is_approved() then false
    -- casual group chats + DMs: real roster rows only
    when room like 'group\_custom\_%' or room like 'dm\_%' then
      exists (select 1 from room_members rm where rm.room_id = room and rm.user_id = auth.uid())
    -- private groups: the private group's member list
    when room like 'private\_%' then
      exists (select 1 from private_group_members pgm
              where room = 'private_' || pgm.group_id::text and pgm.user_id = auth.uid())
    -- leadership chat
    when room = 'group_all' then public.is_admin()
    -- the three community group chats
    when room like 'group\_%' then
      public.is_admin()
      or exists (select 1 from profiles p
                 where p.id = auth.uid()
                   and substr(room, 7) = any(coalesce(p.group_ids,'{}') || coalesce(p.group_id,'')))
    else false
  end;
$$;
revoke all on function public.is_room_member(text) from public, anon;
grant execute on function public.is_room_member(text) to authenticated;

-- messages
drop policy if exists "view messages" on public.messages;
drop policy if exists "insert messages" on public.messages;
create policy "view messages" on public.messages for select to authenticated
  using (public.is_room_member(room_id));
create policy "insert messages" on public.messages for insert to authenticated
  with check (user_id = auth.uid() and public.is_room_member(room_id));

-- room_members: read only for rooms you're in; nobody self-joins; only the room's
-- creator (or a platform admin) adds people, and only approved people.
drop policy if exists "room_members_sel" on public.room_members;
drop policy if exists "room_members_ins" on public.room_members;
create policy "room_members_sel" on public.room_members for select to authenticated
  using (user_id = auth.uid() or public.is_room_member(room_id));
create policy "room_members_ins" on public.room_members for insert to authenticated
  with check (
    room_id like 'group\_custom\_%'
    and added_by = auth.uid()
    and user_id <> auth.uid()
    and exists (select 1 from profiles p where p.id = room_members.user_id and p.status = 'approved')
    and (public.is_admin() or exists (select 1 from room_members c
          where c.room_id = room_members.room_id and c.user_id = auth.uid() and c.is_creator))
  );

-- start_dm(other): makes the DM room with exactly the two people, returns its id.
create or replace function public.start_dm(other uuid) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); room text;
begin
  if me is null or not public.is_approved() then raise exception 'Not allowed'; end if;
  if other is null or other = me then raise exception 'Pick someone else'; end if;
  if not exists (select 1 from profiles where id = other and status = 'approved') then
    raise exception 'That member is not available';
  end if;
  room := 'dm_' || least(me::text, other::text) || '_' || greatest(me::text, other::text);
  insert into room_members (room_id, user_id, added_by)
    select room, u, me from unnest(array[me, other]) as u
    where not exists (select 1 from room_members r where r.room_id = room and r.user_id = u);
  return room;
end $$;
revoke all on function public.start_dm(uuid) from public, anon;
grant execute on function public.start_dm(uuid) to authenticated;

-- create_custom_room(name, members): creator + approved invitees + the announcement line.
create or replace function public.create_custom_room(room_name text, member_ids uuid[]) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); room text; sender text;
begin
  if me is null or not public.is_approved() then raise exception 'Not allowed'; end if;
  if coalesce(trim(room_name),'') = '' or length(room_name) > 60 then raise exception 'Give the group a name (60 characters max)'; end if;
  if coalesce(array_length(member_ids,1),0) = 0 or array_length(member_ids,1) > 50 then raise exception 'Add 1 to 50 people'; end if;
  room := 'group_custom_' || replace(gen_random_uuid()::text, '-', '');
  insert into room_members (room_id, user_id, added_by, is_creator) values (room, me, me, true);
  insert into room_members (room_id, user_id, added_by)
    select distinct room, p.id, me from profiles p
    where p.id = any(member_ids) and p.id <> me and p.status = 'approved';
  select coalesce('@' || username, full_name) into sender from profiles where id = me;
  insert into messages (room_id, user_id, body, sender_name)
    values (room, me, '📢 [GROUP:' || trim(room_name) || '] Created', sender);
  return room;
end $$;
revoke all on function public.create_custom_room(text, uuid[]) from public, anon;
grant execute on function public.create_custom_room(text, uuid[]) to authenticated;

-- The welcome DM now also creates the real DM rows.
create or replace function public.send_welcome_dm() returns trigger
language plpgsql security definer set search_path = public as $$
declare admin_id uuid; room text; welcome_body text;
begin
  if new.status is distinct from 'approved' then return new; end if;
  if tg_op = 'UPDATE' and old.status is not distinct from 'approved' then return new; end if;
  select id into admin_id from public.profiles where role = 'admin' and status = 'approved' order by created_at asc limit 1;
  if admin_id is null or admin_id = new.id then return new; end if;
  room := 'dm_' || least(admin_id::text, new.id::text) || '_' || greatest(admin_id::text, new.id::text);
  insert into public.room_members (room_id, user_id, added_by)
    select room, u, admin_id from unnest(array[admin_id, new.id]) as u
    where not exists (select 1 from public.room_members r where r.room_id = room and r.user_id = u);
  if exists (select 1 from public.messages where room_id = room) then return new; end if;
  welcome_body :=
'Welcome to ESix10 — I''m genuinely glad you''re here. 🦏

You were made for more than comfort. This community is built on Ephesians 6:10 — be strong in the Lord and in the strength of His might. Brotherhood. Sisterhood. Family.

Jump into your group chat, introduce yourself, and check out The Forge when you''re ready. If you ever need anything, just reply right here — my door is always open.

Prepared. Equipped. Unshaken.
— Michael';
  insert into public.messages (room_id, user_id, body, sender_name)
  values (room, admin_id, welcome_body, 'Michael');
  return new;
end $$;

-- One-time backfill: existing DMs get their two real roster rows (both people must exist).
insert into public.room_members (room_id, user_id, added_by)
select distinct m.room_id, u.id, u.id
from public.messages m
cross join lateral (values (substr(m.room_id, 4, 36)), (substr(m.room_id, 41, 36))) as ids(txt)
join public.profiles u on u.id::text = ids.txt
where m.room_id ~ '^dm_[0-9a-f-]{36}_[0-9a-f-]{36}$'
  and not exists (select 1 from public.room_members r where r.room_id = m.room_id and r.user_id = u.id);

-- Rollback: re-run the policy/function bodies from 20260818164608_remote_schema.sql
-- (view messages :1537, insert messages :1313, room_members :1435-1443, insert own profile :1321,
--  guard_profile_privileges :143, is_* :195-227, send_welcome_dm :233), then
-- drop trigger on_auth_user_created on auth.users; drop function start_dm, create_custom_room, is_room_member, handle_new_user.
