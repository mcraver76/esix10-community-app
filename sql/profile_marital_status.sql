-- Adds an optional marital status to member profiles.
-- Run once in the Supabase SQL Editor. Safe to re-run.

alter table profiles add column if not exists marital_status text;

-- Optional hardening: prevent duplicate usernames at the database level
-- (case-insensitive). The app already checks before saving, but this guarantees
-- it even under race conditions. NOTE: only run this if no two existing rows
-- already share a username — otherwise it will error until you fix the dupes.
-- create unique index if not exists profiles_username_unique
--   on profiles (lower(username)) where username is not null;
