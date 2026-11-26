-- Hidden private groups (Michael 2026-11-26 9:08: "Yes, add hidden groups"; Tauriel rec 09:10).
-- For sensitive groups (e.g. domestic-violence survivors): a HIDDEN group is not listed in Discover;
-- its name, description and member count are invisible to non-members; people join only through an
-- invite link, and the creator (or admin) still approves every request. Safe to re-run.

alter table public.private_groups add column if not exists visibility text not null default 'listed';
alter table public.private_groups drop constraint if exists private_groups_visibility_chk;
alter table public.private_groups add constraint private_groups_visibility_chk check (visibility in ('listed','hidden'));
alter table public.private_groups add column if not exists invite_code text;
update public.private_groups set invite_code = replace(gen_random_uuid()::text, '-', '') where invite_code is null;
alter table public.private_groups alter column invite_code set default replace(gen_random_uuid()::text, '-', '');
alter table public.private_groups alter column invite_code set not null;
create unique index if not exists private_groups_invite_code_key on public.private_groups (invite_code);

-- Am I in this private group? (security definer, so policies can use it without recursion)
create or replace function public.is_private_group_member(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from private_group_members m where m.group_id = gid and m.user_id = auth.uid());
$$;
revoke all on function public.is_private_group_member(uuid) from public, anon;
grant execute on function public.is_private_group_member(uuid) to authenticated;

-- Who can see a group row at all.
drop policy if exists "view approved groups" on public.private_groups;
create policy "view approved groups" on public.private_groups for select to authenticated
  using (
    public.is_admin()
    or created_by = auth.uid()
    or public.is_private_group_member(id)
    or (approved and visibility = 'listed' and public.is_approved())
  );

-- The invite code can't be changed by members (admin/server only); a creator may switch
-- visibility. (approved + created_by are already locked by guard_private_group_approval.)
create or replace function public.guard_private_group_invite() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_trusted_server() or public.is_admin() then return new; end if;
  if tg_op = 'UPDATE' then new.invite_code := old.invite_code; end if;
  if tg_op = 'INSERT' then new.invite_code := replace(gen_random_uuid()::text, '-', ''); end if;
  return new;
end $$;
drop trigger if exists trg_guard_private_group_invite on public.private_groups;
create trigger trg_guard_private_group_invite before insert or update on public.private_groups
  for each row execute function public.guard_private_group_invite();

-- Ask to join with an invite link. Works for hidden groups too; the request still needs approval.
-- Returns only what the person needs: the group's name and where they stand.
create or replace function public.request_join_by_code(code text)
returns table (group_id uuid, group_name text, status text)
language plpgsql security definer set search_path = public as $$
declare g record;
begin
  if auth.uid() is null or not public.is_approved() then raise exception 'Your profile must be approved first.'; end if;
  select pg.id, pg.name into g from private_groups pg
   where pg.invite_code = code and pg.approved limit 1;
  if g.id is null then raise exception 'That invite link is not valid.'; end if;
  if exists (select 1 from private_group_members m where m.group_id = g.id and m.user_id = auth.uid()) then
    return query select g.id, g.name, 'member'::text; return;
  end if;
  if not exists (select 1 from private_group_requests r
                 where r.group_id = g.id and r.user_id = auth.uid() and r.status = 'pending') then
    insert into private_group_requests (group_id, user_id, status) values (g.id, auth.uid(), 'pending');
  end if;
  return query select g.id, g.name, 'requested'::text;
end $$;
revoke all on function public.request_join_by_code(text) from public, anon;
grant execute on function public.request_join_by_code(text) to authenticated;

-- Join requests: a person can't request a hidden group they can't see (except via the code RPC above).
drop policy if exists "insert requests" on public.private_group_requests;
create policy "insert requests" on public.private_group_requests for insert to authenticated
  with check (user_id = auth.uid() and public.is_approved()
              and exists (select 1 from private_groups g where g.id = group_id
                          and g.approved and g.visibility = 'listed'));

-- The group's creator (not just the admin) sees and decides requests for THEIR group.
drop policy if exists "view requests" on public.private_group_requests;
create policy "view requests" on public.private_group_requests for select to authenticated
  using (user_id = auth.uid() or public.is_admin()
         or exists (select 1 from private_groups g where g.id = group_id and g.created_by = auth.uid()));
drop policy if exists "update requests" on public.private_group_requests;
create policy "update requests" on public.private_group_requests for update to authenticated
  using (public.is_admin()
         or exists (select 1 from private_groups g where g.id = group_id and g.created_by = auth.uid()));

-- Who can be added to a private group (replaces the 11-26 13:00 version; adds "the creator joins
-- their own new group"). Nobody is added without asking: the creator/admin can add only someone
-- with a pending request; a person can add themselves only to an open, listed group.
drop policy if exists "insert members" on public.private_group_members;
create policy "insert members" on public.private_group_members for insert to authenticated
  with check (
    public.is_admin()
    or (user_id = auth.uid() and exists (select 1 from public.private_groups g
          where g.id = private_group_members.group_id and g.created_by = auth.uid()))
    or (exists (select 1 from public.private_groups g
                where g.id = private_group_members.group_id and g.created_by = auth.uid())
        and exists (select 1 from public.private_group_requests r
                    where r.group_id = private_group_members.group_id
                      and r.user_id = private_group_members.user_id and r.status = 'pending'))
    or (user_id = auth.uid() and public.is_approved()
        and exists (select 1 from public.private_groups g
                    where g.id = private_group_members.group_id and g.approved
                      and g.join_policy = 'open' and g.visibility = 'listed'))
  );

-- Rollback: restore the baseline "view approved groups"/"insert requests"/"view requests"/"update requests"
-- policies (schema.sql :1489, :1333, :1568, :1483); drop trigger trg_guard_private_group_invite;
-- drop functions request_join_by_code(text), guard_private_group_invite(), is_private_group_member(uuid);
-- alter table private_groups drop column invite_code, drop column visibility.
