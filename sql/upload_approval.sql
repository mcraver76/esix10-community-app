-- Moderation: uploaded images (profile photos + post photos) must be admin-approved.
-- Run once in the Supabase SQL Editor. Safe to re-run.

-- A member's newly uploaded profile photo lands here until an admin approves it.
-- Their public avatar_url is unchanged until approval.
alter table profiles add column if not exists avatar_pending text;

-- Post photos are hidden until approved. Default TRUE so EXISTING posts stay
-- visible; the app sets it FALSE for any new post that includes a photo.
alter table posts add column if not exists photo_approved boolean default true;
