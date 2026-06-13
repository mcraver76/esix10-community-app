-- Group change requests
-- Members request a different group from their Profile page; admins approve/deny
-- in the Admin Dashboard ("Group Change Requests"). Admins can also set a group
-- directly from the Members tab.
--
-- Run this once in the Supabase SQL Editor. Safe to re-run (idempotent).

alter table profiles add column if not exists requested_group_id text;
alter table profiles add column if not exists requested_group_at timestamptz;

-- Notes:
-- * No new RLS policy is needed: members can already update their own profile row
--   (so they can set requested_group_id), and admins/staff can already update any
--   profile (so they can approve by setting group_id and clearing the request).
-- * Account email/password changes are handled by Supabase Auth from the member's
--   own Profile page (supabase.auth.updateUser) — no schema change required.
