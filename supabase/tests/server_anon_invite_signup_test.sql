-- Anonymous invites, step 1: sign-up with a private invite (inserts into auth.users = auth-server
-- step, so this runs as postgres). LOCAL / throwaway DB only.
-- The LAST block is KEPT (committed) as the fixture for rls_anon_invites_test.sql:
--   invite 30000000-...-0001 made by Grace (hidden group's creator), code 'test-anon-code-0001'
--   -> limited account 10000000-...-0008 "Dove (test alias)", pending, with a pending join request.
\set ON_ERROR_STOP on
\set hg '''20000000-0000-0000-0000-000000000002'''
\set grace '''10000000-0000-0000-0000-000000000002'''

begin;
-- an unused, expired and a revoked invite for the refusal checks (rolled back)
insert into public.group_invites (id, group_id, code_hash, created_by, expires_at, revoked_at) values
 ('30000000-0000-0000-0000-0000000000e1', :hg, encode(extensions.digest('expired-code', 'sha256'), 'hex'), :grace, now() - interval '1 minute', null),
 ('30000000-0000-0000-0000-0000000000e2', :hg, encode(extensions.digest('revoked-code', 'sha256'), 'hex'), :grace, now() + interval '1 day', now()),
 ('30000000-0000-0000-0000-0000000000e3', :hg, encode(extensions.digest('good-code', 'sha256'), 'hex'), :grace, now() + interval '1 day', null);

create function pg_temp.try_signup(email text, md jsonb) returns text language plpgsql as $$
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', email, 'x', md, now(), now());
  return 'accepted';
exception when others then return sqlerrm;
end $$;

select rls_test.ok(pg_temp.try_signup('a1@example.test', '{"age_confirmed_18":true,"anon_invite":"made-up","alias":"Wren"}') like '%not valid%',
  'ANON a made-up invite code is refused at sign-up (no account made)');
select rls_test.ok(pg_temp.try_signup('a2@example.test', '{"age_confirmed_18":true,"anon_invite":"expired-code","alias":"Wren"}') like '%not valid%',
  'ANON an expired invite (past 72 h) is refused');
select rls_test.ok(pg_temp.try_signup('a3@example.test', '{"age_confirmed_18":true,"anon_invite":"revoked-code","alias":"Wren"}') like '%not valid%',
  'ANON a cancelled invite is refused');
select rls_test.ok(pg_temp.try_signup('a4@example.test', '{"anon_invite":"good-code","alias":"Wren"}') like '%18 or older%',
  'ANON the 18+ check still applies to invite sign-ups');
select rls_test.ok(pg_temp.try_signup('a5@example.test', '{"age_confirmed_18":true,"anon_invite":"good-code","alias":" "}') like '%name to show%',
  'ANON an alias is required');
select rls_test.ok(pg_temp.try_signup('a6@example.test', '{"age_confirmed_18":true,"anon_invite":"good-code","alias":"Wren","full_name":"Real Name","username":"realuser"}') = 'accepted',
  'ANON a valid invite is accepted');
select rls_test.ok((select account_kind = 'limited' and status = 'pending' and username is null and full_name = 'Wren'
                    from public.profiles where email = 'a6@example.test'),
  'ANON the account is LIMITED + pending, shows only the alias (real name/username in the form are ignored)');
select rls_test.ok((select used_at is not null from public.group_invites where id = '30000000-0000-0000-0000-0000000000e3'),
  'ANON the invite is burned on use');
select rls_test.ok((select count(*) = 1 from public.private_group_requests r join public.profiles p on p.id = r.user_id
                    where p.email = 'a6@example.test' and r.group_id = :hg and r.status = 'pending'
                      and r.invite_id = '30000000-0000-0000-0000-0000000000e3'),
  'ANON sign-up makes a pending join request on the inviting group (not access)');
select rls_test.ok(pg_temp.try_signup('a7@example.test', '{"age_confirmed_18":true,"anon_invite":"good-code","alias":"Robin"}') like '%not valid%',
  'ANON an invite works only once');
select rls_test.ok(pg_temp.try_signup('a8@example.test', '{"age_confirmed_18":true,"full_name":"Normal Person","username":"normal1"}') = 'accepted',
  'ANON a normal sign-up (no invite) is accepted');
select rls_test.ok((select account_kind = 'full' from public.profiles where email = 'a8@example.test'),
  'ANON ...and is still a full account');
rollback;

-- KEPT fixture for the app-login tests
insert into public.group_invites (id, group_id, code_hash, created_by, expires_at) values
 ('30000000-0000-0000-0000-000000000001', :hg, encode(extensions.digest('test-anon-code-0001', 'sha256'), 'hex'), :grace, now() + interval '72 hours');
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000008', 'authenticated', 'authenticated',
        'dove-throwaway@example.test', 'x',
        '{"age_confirmed_18":true,"anon_invite":"test-anon-code-0001","alias":"Dove (test alias)"}', now(), now());
\echo 'ALL ANON INVITE SIGN-UP TESTS PASSED'
