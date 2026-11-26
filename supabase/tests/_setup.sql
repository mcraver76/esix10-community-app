-- Test helpers for the RLS suite (LOCAL / throwaway DB only). Run as postgres before the tests;
-- _teardown.sql removes them. The tests themselves log in as 'authenticator' (exactly like the
-- app's API), so the guards treat them as untrusted app users.
\set ON_ERROR_STOP on
drop schema if exists rls_test cascade;
create schema rls_test;
grant usage on schema rls_test to authenticator, anon, authenticated, service_role;

create function rls_test.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create function rls_test.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end $$;
create function rls_test.as_service() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform set_config('role', 'service_role', true);
end $$;
create function rls_test.ok(cond boolean, name text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAIL: %', name; end if;
  raise notice 'PASS: %', name;
end $$;
grant execute on all functions in schema rls_test to authenticator, anon, authenticated, service_role;
