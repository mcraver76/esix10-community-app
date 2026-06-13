-- Lightweight membership for CASUAL main-chat groups (group_custom_* rooms).
-- Makes a casual group visible only to its members, and powers add/remove.
-- (Private Groups have their own separate, stricter tables — this is not those.)
-- Run once in the Supabase SQL Editor. Safe to re-run.

create table if not exists room_members (
  room_id    text not null,
  user_id    uuid not null,
  added_by   uuid,
  is_creator boolean default false,
  created_at timestamptz default now(),
  primary key (room_id, user_id)
);

alter table room_members enable row level security;

drop policy if exists room_members_sel on room_members;
drop policy if exists room_members_ins on room_members;
drop policy if exists room_members_del on room_members;

-- Readable by any signed-in member (so member lists load). Casual groups only.
create policy room_members_sel on room_members for select to authenticated using (true);
-- You may add people (the row records who added them).
create policy room_members_ins on room_members for insert to authenticated with check (added_by = auth.uid());
-- The person who added someone (the creator) can remove them; anyone can leave.
create policy room_members_del on room_members for delete to authenticated using (added_by = auth.uid() or user_id = auth.uid());

-- NOTE: casual groups created BEFORE this migration have no membership rows,
-- so they won't appear in the new members-only list — just recreate them.
