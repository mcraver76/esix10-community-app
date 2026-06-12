-- ============================================================================
-- ESix10 — member_flags: let members report other members to admins
-- Mirrors post_flags. Run in Supabase SQL Editor. Idempotent / safe to re-run.
-- Requires is_admin() + is_approved() (already created earlier).
-- ============================================================================

create table if not exists member_flags (
  id uuid default gen_random_uuid() primary key,
  flagged_user_id uuid references profiles(id) on delete cascade,  -- the reported member
  flagged_by      uuid references profiles(id) on delete cascade,  -- the reporter
  reason          text,
  reviewed        boolean default false,
  created_at      timestamp default now()
);
alter table member_flags enable row level security;

drop policy if exists "view member flags"   on member_flags;
drop policy if exists "insert member flags" on member_flags;
drop policy if exists "update member flags" on member_flags;

-- Admins (and the reporter) can see reports; only approved members can file one;
-- only admins can mark them reviewed.
create policy "view member flags"   on member_flags for select using (is_admin() or auth.uid() = flagged_by);
create policy "insert member flags" on member_flags for insert with check (auth.uid() = flagged_by and is_approved());
create policy "update member flags" on member_flags for update using (is_admin());

-- ============================================================================
-- DONE. Reported members appear in the Admin Dashboard -> "Flagged Members".
-- ============================================================================
