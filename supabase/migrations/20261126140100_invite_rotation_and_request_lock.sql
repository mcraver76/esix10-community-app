-- Tauriel follow-ups on hidden groups (11-26 09:20). Safe to re-run.
-- 1. The group's creator (or admin) can kill a leaked invite link by making a new random one.
-- 2. A join request can't be moved: only its status may change.

-- 1 ------------------------------------------------------------------------------------------
-- The invite guard lets the code change only for admin/server, or inside rotate_invite_code()
-- (which raises a transaction-local flag; PostgREST has no way for a client to set it).
create or replace function public.guard_private_group_invite() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_trusted_server() or public.is_admin()
     or coalesce(current_setting('app.invite_rotate', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'UPDATE' then new.invite_code := old.invite_code; end if;
  if tg_op = 'INSERT' then new.invite_code := replace(gen_random_uuid()::text, '-', ''); end if;
  return new;
end $$;

create or replace function public.rotate_invite_code(gid uuid) returns text
language plpgsql security definer set search_path = public as $$
declare newcode text := replace(gen_random_uuid()::text, '-', '');
begin
  if auth.uid() is null or not public.is_approved() then raise exception 'Not allowed'; end if;
  if not (public.is_admin() or exists (select 1 from private_groups g where g.id = gid and g.created_by = auth.uid())) then
    raise exception 'Only the group''s creator can make a new invite link';
  end if;
  perform set_config('app.invite_rotate', 'on', true);
  update private_groups set invite_code = newcode where id = gid;
  perform set_config('app.invite_rotate', '', true);
  return newcode;
end $$;
revoke all on function public.rotate_invite_code(uuid) from public, anon;
grant execute on function public.rotate_invite_code(uuid) to authenticated;

-- 2 ------------------------------------------------------------------------------------------
drop policy if exists "update requests" on public.private_group_requests;
create policy "update requests" on public.private_group_requests for update to authenticated
  using (public.is_admin()
         or exists (select 1 from private_groups g where g.id = group_id and g.created_by = auth.uid()))
  with check (public.is_admin()
         or exists (select 1 from private_groups g where g.id = group_id and g.created_by = auth.uid()));

create or replace function public.guard_private_group_request_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_trusted_server() then return new; end if;
  new.id := old.id; new.group_id := old.group_id; new.user_id := old.user_id; new.created_at := old.created_at;
  return new;
end $$;
drop trigger if exists trg_guard_private_group_request_update on public.private_group_requests;
create trigger trg_guard_private_group_request_update before update on public.private_group_requests
  for each row execute function public.guard_private_group_request_update();

-- Rollback: re-run guard_private_group_invite from 20261126140000; drop function rotate_invite_code(uuid);
-- restore "update requests" from 20261126140000; drop trigger trg_guard_private_group_request_update + its function.
