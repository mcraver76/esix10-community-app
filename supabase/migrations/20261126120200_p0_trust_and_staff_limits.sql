-- P0-1 follow-ups from Tauriel's review (11-26 08:10): M1, M2, M3. Safe to re-run.
--  M1  Guards trust ONLY the real server (not "no user id", which is also a signed-out visitor).
--      Same pattern as the Alliance (Idril): every app request arrives through the
--      'authenticator' login, so app users are never trusted; migrations, seed and the
--      service role are.
--  M2  Moderators may change status only on plain members, and only pending -> approved/denied
--      or approved -> removed. Staff rows, and bringing back a removed/denied person, are admin-only.
--  M3  Only admins approve private groups (a creator can't self-approve, then open it).
--  Also: the old private-group insert guard now trusts the server too, so seeding needs no
--  trigger pause.

create or replace function public.is_trusted_server() returns boolean
language sql stable set search_path = public as $$
  select session_user <> 'authenticator' or coalesce(auth.role(), '') = 'service_role';
$$;
revoke all on function public.is_trusted_server() from public, anon;
grant execute on function public.is_trusted_server() to authenticated, service_role;

create or replace function public.guard_profile_privileges() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  caller_admin boolean;
  caller_staff boolean;
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
    return new;
  end if;

  -- UPDATE
  new.id := old.id;
  if not caller_admin then
    new.role := old.role;
    new.email := old.email;
    -- M2: a moderator may change status only on a plain member's row, and only
    -- pending -> approved/denied or approved -> removed. Undoing a removal or denial is admin-only.
    if new.status is distinct from old.status
       and not (caller_staff and old.role = 'member'
                and ((old.status = 'pending' and new.status in ('approved','denied'))
                     or (old.status = 'approved' and new.status = 'removed'))) then
      new.status := old.status;
    end if;
  end if;
  if not caller_staff then
    new.mod_agreement_at := case when old.role in ('admin','moderator') then new.mod_agreement_at else old.mod_agreement_at end;
    if (new.group_ids is distinct from old.group_ids or new.group_id is distinct from old.group_id) then
      if not (old.status = 'pending'
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

-- Old private-group insert guard: trust the server, require approval for everyone else.
create or replace function public.guard_private_group_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_trusted_server() then return new; end if;
  if not public.is_approved() then
    raise exception 'Your profile must be approved by an admin before you can create or join private groups.';
  end if;
  return new;
end $$;

-- M3: only admins (or the server) set approved on private groups.
create or replace function public.guard_private_group_approval() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_trusted_server() or public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.approved := false;
  else
    new.approved := old.approved;
    new.created_by := old.created_by;
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_private_group_approval on public.private_groups;
create trigger trg_guard_private_group_approval before insert or update on public.private_groups
  for each row execute function public.guard_private_group_approval();

-- Rollback: re-run guard_profile_privileges from 20261126120000; guard_private_group_insert from
-- the baseline (:128); drop trigger trg_guard_private_group_approval on public.private_groups;
-- drop function guard_private_group_approval(), is_trusted_server().
