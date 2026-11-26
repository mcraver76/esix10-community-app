-- Anonymous invites for hidden groups, build steps 1 + 2 (docs/ANONYMOUS_INVITES_DESIGN.md).
-- Michael 11-26 9:22: YES, build on TEST. Tauriel 09:50: GO for steps 1-2. Lúthien. LOCAL TEST SERVER ONLY.
-- Safe to re-run.
--
-- STEP 1  A moderator of a HIDDEN group makes a personal, single-use invite (128-bit random code,
--         stored only as a SHA-256 hash, 72 h, revocable, every invite kept as the log).
--         The person signs up with that code + an alias: no real name, no username. The server
--         makes a LIMITED account (pending) and a join request on that group, and burns the code.
--         Redemption is not access: someone OTHER than the issuing moderator (the creator, another
--         group moderator, or the platform admin) approves it.
--         A LIMITED account only ever reaches the private groups it was approved into:
--           no feeds, no prayer wall posting, no members directory, no events/kudos/etc. writes,
--           no DMs (alias DMs with opaque room ids come in step 3), no casual group chats,
--           no other invite links, can't create groups, never listed to people outside its groups.
--         Moderators can't approve limited accounts from the admin screen; only the invite path
--         (or the platform admin) can.
-- STEP 2  HIDDEN groups: a member sees messages only from the moment they joined (everyone, not just
--         anonymous members). joined_at is set by the server and can't be edited.
--
-- How: is_approved() now means "approved FULL account". Every existing rule that relied on it
-- (feeds, posts, events, DMs, invite links, group creation, ...) therefore shuts limited accounts
-- out automatically. Chats + private photos use the new is_active_member() and allow limited
-- accounts into private_ rooms only.

------------------------------------------------------------------ account kind
alter table public.profiles add column if not exists account_kind text not null default 'full';
alter table public.profiles drop constraint if exists profiles_account_kind_chk;
alter table public.profiles add constraint profiles_account_kind_chk check (account_kind in ('full','limited'));
-- profiles uses column-by-column read grants (email stays hidden); the app may read the kind.
grant select (account_kind) on public.profiles to authenticated;

create or replace function public.is_active_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and status = 'approved');
$$;
create or replace function public.is_limited() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and account_kind = 'limited');
$$;
-- Approved = approved FULL account (limited accounts are kept out of everything except their groups).
create or replace function public.is_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and status = 'approved' and account_kind = 'full');
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'approved' and account_kind = 'full');
$$;
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('admin','moderator') and status = 'approved' and account_kind = 'full');
$$;
revoke all on function public.is_active_member() from public, anon;
revoke all on function public.is_limited() from public, anon;
grant execute on function public.is_active_member() to authenticated;
grant execute on function public.is_limited() to authenticated;

create or replace function public.my_groups() returns text[]
language sql stable security definer set search_path = public as $$
  select case when p.status = 'approved' and p.account_kind = 'full'
              then coalesce(p.group_ids, '{}') || coalesce(p.group_id, '')
              else '{}'::text[] end
  from profiles p where p.id = auth.uid();
$$;

------------------------------------------------------------------ STEP 2 helper: history from join
-- For a HIDDEN group's room: the moment I joined. Everything else: no limit.
create or replace function public.room_history_start(room text) returns timestamp
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select m.joined_at from private_group_members m
       join private_groups g on g.id = m.group_id
      where room like 'private\_%' and room = 'private_' || g.id::text
        and g.visibility = 'hidden' and m.user_id = auth.uid()
      limit 1),
    '-infinity'::timestamp);
$$;
revoke all on function public.room_history_start(text) from public, anon;
grant execute on function public.room_history_start(text) to authenticated;

------------------------------------------------------------------ chats
create or replace function public.is_room_member(room text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null or not public.is_active_member() then false
    -- limited (anonymous-invite) accounts: their private groups only
    when public.is_limited() then
      room like 'private\_%' and exists (select 1 from private_group_members pgm
              where room = 'private_' || pgm.group_id::text and pgm.user_id = auth.uid())
    when room like 'group\_custom\_%' or room like 'dm\_%' then
      exists (select 1 from room_members rm where rm.room_id = room and rm.user_id = auth.uid())
    when room like 'private\_%' then
      exists (select 1 from private_group_members pgm
              where room = 'private_' || pgm.group_id::text and pgm.user_id = auth.uid())
    when room = 'group_all' then public.is_admin()
    when room like 'group\_%' then
      public.is_admin()
      or exists (select 1 from profiles p
                 where p.id = auth.uid() and p.account_kind = 'full'
                   and substr(room, 7) = any(coalesce(p.group_ids,'{}') || coalesce(p.group_id,'')))
    else false
  end;
$$;

drop policy if exists "view messages" on public.messages;
create policy "view messages" on public.messages for select to authenticated
  using (public.is_room_member(room_id)
         and coalesce(created_at, 'infinity'::timestamp) >= public.room_history_start(room_id));

-- Private photos follow the chat (limited accounts included, for their own groups).
create or replace function public.can_access_media(path text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null or not public.is_active_member() then false
    when split_part(path, '/', 1) = 'posts' then
      public.is_admin() or split_part(path, '/', 2) = any(coalesce(public.my_groups(), '{}'))
    else public.is_room_member(split_part(path, '/', 1))
  end;
$$;

------------------------------------------------------------------ joined_at is the server's
create or replace function public.guard_private_group_member() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_trusted_server() then return new; end if;
  if tg_op = 'INSERT' then
    new.joined_at := now();
    -- only the group's real creator can hold the 'creator' role; everyone else joins as a member
    if not public.is_admin() and not (new.role = 'creator' and exists (select 1 from private_groups g
         where g.id = new.group_id and g.created_by = new.user_id)) then
      new.role := 'member';
    end if;
  else
    new.joined_at := old.joined_at; new.user_id := old.user_id; new.group_id := old.group_id;
    -- roles: only member <-> moderator; the creator row never changes
    if old.role = 'creator' or new.role not in ('member','moderator') then new.role := old.role; end if;
    -- anonymous (limited) accounts never become group moderators (Tauriel 11:05 #4). is_group_manager()
    -- already needs a full account; this keeps a later change from quietly giving them manager power.
    if new.role = 'moderator' and exists (select 1 from profiles p where p.id = old.user_id and p.account_kind = 'limited') then
      new.role := old.role;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_private_group_member on public.private_group_members;
create trigger trg_guard_private_group_member before insert or update on public.private_group_members
  for each row execute function public.guard_private_group_member();

-- The group's creator (or platform admin) can make a member a group moderator (the "↑mod" button
-- had no database permission, so it silently did nothing). Needed so a second leader can approve
-- anonymous invites.
drop policy if exists "update member role" on public.private_group_members;
create policy "update member role" on public.private_group_members for update to authenticated
  using (public.is_admin() or (public.is_approved() and exists (select 1 from private_groups g
         where g.id = private_group_members.group_id and g.created_by = auth.uid())))
  with check (public.is_admin() or (public.is_approved() and exists (select 1 from private_groups g
         where g.id = private_group_members.group_id and g.created_by = auth.uid())));

------------------------------------------------------------------ rosters + profiles
-- I can always see my OWN membership rows (a limited account needs them to find its group);
-- full rosters stay members-of-that-group + platform admin.
drop policy if exists private_group_members_sel on public.private_group_members;
create policy private_group_members_sel on public.private_group_members for select to authenticated
  using (user_id = auth.uid() or public.can_see_group_members(group_id));

create or replace function public.can_see_group_members(gid uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select public.is_admin()
      or (public.is_active_member()
          and exists (select 1 from private_group_members m where m.group_id = gid and m.user_id = auth.uid())
          -- limited accounts don't get rosters (user ids) until aliases land in step 3
          and not public.is_limited());
$$;

-- Who may see a profile row. Full members still see full members (the directory).
-- Limited profiles are seen only by themselves, the platform admin, people in a private group
-- with them, and the creator of a group they asked to join. A limited account sees only itself
-- and the people in its own groups.
create or replace function public.can_see_profile(pid uuid, pkind text) returns boolean
language sql stable security definer set search_path = public as $$
  select pid = auth.uid()
      or public.is_admin()
      or (pkind = 'full' and not public.is_limited())
      or exists (select 1 from private_group_members a
                   join private_group_members b on b.group_id = a.group_id
                  where a.user_id = auth.uid() and b.user_id = pid)
      or (pkind = 'limited' and exists (select 1 from private_group_requests r
                   join private_groups g on g.id = r.group_id
                  where r.user_id = pid and r.status = 'pending'
                    and (g.created_by = auth.uid()
                         or exists (select 1 from private_group_members m where m.group_id = g.id
                                    and m.user_id = auth.uid() and m.role in ('creator','moderator')))));
$$;
revoke all on function public.can_see_profile(uuid, text) from public, anon;
grant execute on function public.can_see_profile(uuid, text) to authenticated;

drop policy if exists "view profiles" on public.profiles;
create policy "view profiles" on public.profiles for select to authenticated
  using (public.can_see_profile(id, account_kind));

------------------------------------------------------------------ profile guard (adds account_kind rules)
create or replace function public.guard_profile_privileges() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  caller_admin boolean;
  caller_staff boolean;
  invite_approval boolean;
begin
  if public.is_trusted_server() then return new; end if;
  caller_admin := coalesce(public.is_admin(), false);
  caller_staff := coalesce(public.is_staff(), false);

  if tg_op = 'INSERT' then
    if not caller_admin then
      new.role := 'member';
      new.status := 'pending';
      new.group_id := null; new.group_ids := '{}';
      new.mod_agreement_at := null;
    end if;
    new.account_kind := 'full';
    return new;
  end if;

  -- UPDATE
  new.id := old.id;
  new.account_kind := old.account_kind;   -- only the server sets the kind
  -- the anonymous-invite approval RPC raises this flag for exactly one row (transaction-local)
  invite_approval := coalesce(current_setting('app.anon_approve', true), '') = old.id::text
                     and old.account_kind = 'limited' and old.status = 'pending' and new.status = 'approved';
  if not caller_admin then
    new.role := old.role;
    new.email := old.email;
    if invite_approval then
      null;  -- allowed
    elsif old.account_kind = 'limited' then
      new.status := old.status;            -- moderators can't approve/un-approve limited accounts
    elsif new.status is distinct from old.status
       and not (caller_staff and old.role = 'member'
                and ((old.status = 'pending' and new.status in ('approved','denied'))
                     or (old.status = 'approved' and new.status = 'removed'))) then
      new.status := old.status;
    end if;
  end if;
  if old.account_kind = 'limited' and not caller_admin then
    -- limited accounts never get community groups or a username
    new.group_ids := old.group_ids; new.group_id := old.group_id; new.username := old.username;
  end if;
  if not caller_staff then
    new.mod_agreement_at := case when old.role in ('admin','moderator') then new.mod_agreement_at else old.mod_agreement_at end;
    if (new.group_ids is distinct from old.group_ids or new.group_id is distinct from old.group_id) then
      if not (old.status = 'pending' and old.account_kind = 'full'
              and coalesce(array_length(old.group_ids,1),0) = 0 and old.group_id is null
              and new.group_ids <@ array['brotherhood','sisterhood','family']
              and (new.group_id is null or new.group_id = any(new.group_ids))) then
        new.group_ids := old.group_ids;
        new.group_id := old.group_id;
      end if;
    end if;
    if new.avatar_url is distinct from old.avatar_url
       and new.avatar_url is not null and new.avatar_url like '%://%' then
      new.avatar_url := old.avatar_url;
    end if;
  end if;
  return new;
end $$;

------------------------------------------------------------------ invites table (the log)
create table if not exists public.group_invites (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.private_groups(id) on delete cascade,
  code_hash   text not null unique,
  created_by  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  revoked_by  uuid,
  used_by     uuid,
  used_at     timestamptz
);
alter table public.group_invites enable row level security;   -- no policies: RPCs only
revoke all on public.group_invites from public, anon, authenticated;
create index if not exists group_invites_creator_idx on public.group_invites (created_by, created_at);

alter table public.private_group_requests add column if not exists invite_id uuid references public.group_invites(id);

create or replace function public.guard_private_group_request_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_trusted_server() then return new; end if;
  new.id := old.id; new.group_id := old.group_id; new.user_id := old.user_id;
  new.created_at := old.created_at; new.invite_id := old.invite_id;
  return new;
end $$;

-- A creator can't "approve" an anonymous-invite request by inserting the member row directly
-- (that would skip the second-person rule); those go through approve_private_invite_request().
drop policy if exists "insert members" on public.private_group_members;
create policy "insert members" on public.private_group_members for insert to authenticated
  with check (
    public.is_admin()
    or (user_id = auth.uid() and public.is_approved() and exists (select 1 from public.private_groups g
          where g.id = private_group_members.group_id and g.created_by = auth.uid()))
    or (public.is_approved()
        and exists (select 1 from public.private_groups g
                    where g.id = private_group_members.group_id and g.created_by = auth.uid())
        and exists (select 1 from public.private_group_requests r
                    where r.group_id = private_group_members.group_id
                      and r.user_id = private_group_members.user_id and r.status = 'pending'
                      and r.invite_id is null))
    or (user_id = auth.uid() and public.is_approved()
        and exists (select 1 from public.private_groups g
                    where g.id = private_group_members.group_id and g.approved
                      and g.join_policy = 'open' and g.visibility = 'listed'))
  );

-- Am I a manager (creator / group moderator) of this group?
create or replace function public.is_group_manager(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_approved() and (
    exists (select 1 from private_groups g where g.id = gid and g.created_by = auth.uid())
    or exists (select 1 from private_group_members m where m.group_id = gid and m.user_id = auth.uid()
               and m.role in ('creator','moderator')));
$$;
revoke all on function public.is_group_manager(uuid) from public, anon;
grant execute on function public.is_group_manager(uuid) to authenticated;

-- Group moderators (not only the creator) see their group's join requests, so a second
-- person can approve an anonymous invite from the screen. Deciding plain requests stays creator/admin.
drop policy if exists "view requests" on public.private_group_requests;
create policy "view requests" on public.private_group_requests for select to authenticated
  using (user_id = auth.uid() or public.is_admin()
         or exists (select 1 from private_groups g where g.id = group_id and g.created_by = auth.uid())
         or public.is_group_manager(group_id));

-- Make a personal invite. The code is shown ONCE (only its hash is kept).
create or replace function public.create_private_invite(gid uuid)
returns table (invite_id uuid, code text, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  g record; newcode text; newid uuid; exp timestamptz := now() + interval '72 hours';
begin
  if not (public.is_admin() or public.is_group_manager(gid)) then
    raise exception 'Only this group''s creator or moderators can invite people privately.';
  end if;
  select pg.id, pg.approved, pg.visibility into g from private_groups pg where pg.id = gid;
  if g.id is null or not g.approved or g.visibility <> 'hidden' then
    raise exception 'Private invites are only for approved hidden groups.';
  end if;
  if (select count(*) from group_invites i where i.created_by = auth.uid()
        and i.used_at is null and i.revoked_at is null and i.expires_at > now()) >= 5 then
    raise exception 'You already have 5 open invites. Cancel one or wait for it to be used.';
  end if;
  if (select count(*) from group_invites i where i.created_by = auth.uid()
        and i.created_at > now() - interval '24 hours') >= 10 then
    raise exception 'Daily limit reached (10 private invites a day).';
  end if;
  newcode := encode(extensions.gen_random_bytes(16), 'hex');
  insert into group_invites (group_id, code_hash, created_by, expires_at)
    values (gid, encode(extensions.digest(newcode, 'sha256'), 'hex'), auth.uid(), exp)
    returning id into newid;
  return query select newid, newcode, exp;
end $$;
revoke all on function public.create_private_invite(uuid) from public, anon;
grant execute on function public.create_private_invite(uuid) to authenticated;

-- Cancel an unused invite (the person who made it, the group's creator, or the platform admin).
create or replace function public.revoke_private_invite(iid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare inv record;
begin
  select i.* into inv from group_invites i where i.id = iid;
  if inv.id is null then raise exception 'Invite not found.'; end if;
  if not (public.is_admin()
          or (public.is_approved() and inv.created_by = auth.uid())
          or exists (select 1 from private_groups g where g.id = inv.group_id and g.created_by = auth.uid()
                     and public.is_approved())) then
    raise exception 'Not allowed.';
  end if;
  if inv.used_at is not null then raise exception 'That invite was already used.'; end if;
  update group_invites set revoked_at = now(), revoked_by = auth.uid() where id = iid and revoked_at is null;
end $$;
revoke all on function public.revoke_private_invite(uuid) from public, anon;
grant execute on function public.revoke_private_invite(uuid) to authenticated;

-- The group's invite list for its managers: never the code, never who used it.
create or replace function public.list_private_invites(gid uuid)
returns table (id uuid, invited_by text, created_at timestamptz, expires_at timestamptz, state text, mine boolean)
language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_admin() or public.is_group_manager(gid)) then raise exception 'Not allowed.'; end if;
  return query
    select i.id, coalesce('@' || p.username, nullif(p.full_name, ''), 'a moderator'),
           i.created_at, i.expires_at,
           case when i.used_at is not null then 'used'
                when i.revoked_at is not null then 'cancelled'
                when i.expires_at <= now() then 'expired' else 'open' end,
           i.created_by = auth.uid()
      from group_invites i left join profiles p on p.id = i.created_by
     where i.group_id = gid
     order by i.created_at desc limit 50;
end $$;
revoke all on function public.list_private_invites(uuid) from public, anon;
grant execute on function public.list_private_invites(uuid) to authenticated;

-- Approve an anonymous-invite request. Must be someone OTHER than the moderator who issued it:
-- the group's creator, another group moderator, or the platform admin.
create or replace function public.approve_private_invite_request(rid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r record; inv record; g record; n int;
begin
  select q.* into r from private_group_requests q where q.id = rid for update;
  if r.id is null or r.invite_id is null or r.status <> 'pending' then
    raise exception 'That request is not waiting for approval.';
  end if;
  select i.* into inv from group_invites i where i.id = r.invite_id;
  select pg.* into g from private_groups pg where pg.id = r.group_id;
  if not (public.is_admin() or public.is_group_manager(r.group_id)) then raise exception 'Not allowed.'; end if;
  if inv.created_by = auth.uid() and not public.is_admin() then
    raise exception 'A second person must approve someone you invited (the group''s creator or another moderator).';
  end if;
  if not exists (select 1 from profiles p where p.id = r.user_id and p.account_kind = 'limited' and p.status = 'pending') then
    raise exception 'That account is not waiting for approval.';
  end if;
  select count(*) into n from private_group_members m where m.group_id = r.group_id;
  if g.join_policy = 'private' and n >= 15 then
    raise exception 'This private group is limited to 15 members.';
  end if;
  insert into private_group_members (group_id, user_id, role) values (r.group_id, r.user_id, 'member');
  update private_group_requests set status = 'approved' where id = rid;
  perform set_config('app.anon_approve', r.user_id::text, true);
  update profiles set status = 'approved' where id = r.user_id;
  perform set_config('app.anon_approve', '', true);
  update private_groups set member_count = n + 1 where id = r.group_id;
end $$;
revoke all on function public.approve_private_invite_request(uuid) from public, anon;
grant execute on function public.approve_private_invite_request(uuid) to authenticated;

------------------------------------------------------------------ sign-up with an invite
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  md jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  inv record;
  alias text;
begin
  -- Adults only (Michael 2026-11-26). The sign-up screen sends age_confirmed_18 = true.
  if coalesce((md->>'age_confirmed_18')::boolean, false) is not true then
    raise exception 'You must be 18 or older to join.' using errcode = 'P0001';
  end if;

  if coalesce(md->>'anon_invite', '') <> '' then
    select i.* into inv from group_invites i
     where i.code_hash = encode(extensions.digest(md->>'anon_invite', 'sha256'), 'hex')
       and i.used_at is null and i.revoked_at is null and i.expires_at > now()
     for update;
    if inv.id is null then
      raise exception 'This private invite is not valid, was already used, or has expired. Ask for a new one.' using errcode = 'P0001';
    end if;
    alias := left(btrim(regexp_replace(coalesce(md->>'alias', ''), '[[:cntrl:]<>]', '', 'g')), 40);
    if length(alias) < 2 then
      raise exception 'Pick a name to show in the group (2 to 40 characters).' using errcode = 'P0001';
    end if;
    insert into public.profiles (id, email, full_name, username, role, status, account_kind, terms_version, terms_accepted_at)
    values (new.id, new.email, alias, null, 'member', 'pending', 'limited',
            md->>'terms_version', nullif(md->>'terms_accepted_at','')::timestamptz)
    on conflict (id) do nothing;
    update group_invites set used_at = now(), used_by = new.id where id = inv.id;
    insert into private_group_requests (group_id, user_id, status, invite_id)
      values (inv.group_id, new.id, 'pending', inv.id);
    -- Don't keep the (now burned) invite code in the account's sign-up data (Tauriel 11:05 #1).
    update auth.users set raw_user_meta_data = raw_user_meta_data - 'anon_invite' where id = new.id;
    return new;
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

------------------------------------------------------------------ no welcome DM for limited accounts
create or replace function public.send_welcome_dm() returns trigger
language plpgsql security definer set search_path = public as $$
declare admin_id uuid; room text; welcome_body text;
begin
  if new.status is distinct from 'approved' then return new; end if;
  if new.account_kind = 'limited' then return new; end if;   -- anonymous members get no DM rooms
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

-- Rollback: re-run is_approved/is_admin/is_staff/is_room_member/handle_new_user/send_welcome_dm from
-- 20261126120000, guard_profile_privileges from 20261126120200, my_groups + can_see_group_members +
-- "insert members" from 20261126140000/20261126130000, can_access_media from 20261126130100,
-- guard_private_group_request_update from 20261126140100, "view messages" from 20261126120000,
-- "view profiles" USING (true), private_group_members_sel USING (can_see_group_members(group_id));
-- "view requests" from 20261126140000; drop policy "update member role" on private_group_members;
-- drop trigger trg_guard_private_group_member; drop functions approve_private_invite_request,
-- list_private_invites, revoke_private_invite, create_private_invite, is_group_manager, can_see_profile,
-- room_history_start, is_limited, is_active_member, guard_private_group_member;
-- alter table private_group_requests drop column invite_id; drop table group_invites;
-- alter table profiles drop column account_kind.
