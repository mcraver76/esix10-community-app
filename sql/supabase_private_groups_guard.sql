-- ============================================================================
-- ESix10 — Harden private groups against not-yet-approved members
-- A trigger blocks pending members from creating private groups or sending
-- join requests, at the database level. This approach does NOT touch your
-- existing private-group policies — it just adds an approval gate on INSERT.
-- Requires is_approved() (created by supabase_member_access.sql).
-- Run in Supabase SQL Editor. Idempotent / safe to re-run.
-- ============================================================================

create or replace function guard_private_group_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not is_approved() then
    raise exception 'Your profile must be approved by an admin before you can create or join private groups.';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_private_groups          on private_groups;
drop trigger if exists trg_guard_private_group_requests  on private_group_requests;
create trigger trg_guard_private_groups
  before insert on private_groups
  for each row execute function guard_private_group_insert();
create trigger trg_guard_private_group_requests
  before insert on private_group_requests
  for each row execute function guard_private_group_insert();

-- ============================================================================
-- DONE. Approved members & admins are unaffected; pending members are blocked
-- from creating/joining private groups in the database, matching the app UI.
-- ============================================================================
