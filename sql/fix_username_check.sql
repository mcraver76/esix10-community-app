-- ============================================================================
-- ESix10 — Make the "is this username taken?" check work again.
--
-- THE BUG (found 18 Aug 2026 while auditing, not caused by it)
--   The sign-up screen checks whether a username is taken by reading the
--   profiles table. But signed-out visitors cannot read profiles — that was
--   locked down on 22 Jun to protect member email addresses. So the check has
--   been quietly returning "nothing found" for every username since then, and
--   TWO MEMBERS CAN CURRENTLY SIGN UP WITH THE SAME USERNAME.
--
--   It fails silently: no error appears on screen, the name just always looks
--   available.
--
-- THE FIX
--   A small function that answers only "is this name free — yes or no". It
--   reads profiles on the caller's behalf but hands back a single true/false,
--   so it cannot be used to fish for members' details.
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
  select not exists (select 1 from profiles p where lower(p.username) = lower(trim(u)))
$$;

-- Signed-out visitors need to call this from the sign-up screen.
grant execute on function username_available(text) to anon, authenticated;


-- ----------------------------------------------------------------------------
-- Are there already duplicate usernames from the period the check was broken?
-- Anything listed here needs sorting out by hand before the guard below.
-- ----------------------------------------------------------------------------
select lower(username) as username, count(*) as accounts
from   profiles
where  username is not null and username <> ''
group  by 1
having count(*) > 1
order  by 2 desc;


-- ----------------------------------------------------------------------------
-- Stop it happening again at the database level, so no future app change can
-- reintroduce it.
--
-- RUN THIS ONLY IF THE QUERY ABOVE RETURNED NO ROWS — a unique index cannot be
-- created while duplicates exist, and it will simply fail with an error that
-- names them.
-- ----------------------------------------------------------------------------
create unique index if not exists profiles_username_unique_ci
  on profiles (lower(username))
  where username is not null and username <> '';


-- ----------------------------------------------------------------------------
-- Check it works. Expect: true for a name nobody has, false for a real one.
-- ----------------------------------------------------------------------------
select username_available('definitely_not_taken_9f3a') as should_be_true;
