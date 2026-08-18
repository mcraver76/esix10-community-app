-- ============================================================================
-- ESix10 — Make the "is this username taken?" check work again.
--
-- THE BUG (found 18 Aug 2026 while auditing; not caused by it)
--   The sign-up screen checks whether a username is taken by reading the
--   profiles table. But the profiles read policy is `TO authenticated`, and a
--   visitor filling in the sign-up form is not signed in yet. So the check has
--   been quietly returning "nothing found" for every username, meaning every
--   name always looks available. It fails silently — no error on screen.
--
--   The database itself is not corrupted: a unique index on lower(username)
--   (`profiles_username_lower_key`) already exists and does reject duplicates.
--   The real-world symptom is therefore worse than a cosmetic one — the person
--   is told the name is free, and the failure only surfaces later when their
--   profile row is created on first sign-in.
--
-- THE FIX
--   A small function that answers only "is this name free — yes or no". It
--   reads profiles on the caller's behalf but hands back a single true/false,
--   so it cannot be used to fish for members' details. Signed-out visitors are
--   granted permission to call it, which is what the sign-up screen needs.
--
--   Deliberately NOT re-creating a unique index here: `profiles_username_lower_key`
--   already does the job, and adding a second one under a different name would
--   just duplicate it.
--
-- Pairs with the matching change in src/App.jsx. Idempotent.
-- ============================================================================

create or replace function username_available(u text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from profiles p where lower(p.username) = lower(trim(u))
  )
$$;

-- Signed-out visitors need to call this from the sign-up screen.
grant execute on function username_available(text) to anon, authenticated;

-- ============================================================================
-- ROLLBACK:  drop function if exists username_available(text);
-- ============================================================================
