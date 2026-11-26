-- P0-3 (Tauriel checklist): per-person daily caps for functions that cost money (video now; AI/email next).
-- Server-only: RLS on with no policies, and only the service role may run the counter.
-- Safe to re-run.
create table if not exists public.function_usage (
  user_id uuid not null,
  fn text not null,
  day date not null default (now() at time zone 'utc')::date,
  calls integer not null default 0,
  primary key (user_id, fn, day)
);
alter table public.function_usage enable row level security;
revoke all on public.function_usage from anon, authenticated;

-- Adds one call and returns true while still under the cap, false once the cap is reached.
create or replace function public.bump_function_usage(p_user uuid, p_fn text, p_cap integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  insert into function_usage (user_id, fn, day, calls)
  values (p_user, p_fn, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, fn, day) do update set calls = function_usage.calls + 1
  returning calls into n;
  return n <= p_cap;
end $$;
revoke all on function public.bump_function_usage(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.bump_function_usage(uuid, text, integer) to service_role;

-- Rollback: drop function public.bump_function_usage(uuid,text,integer); drop table public.function_usage;
