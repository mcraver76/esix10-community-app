-- RLS proof test for hardening P0-1, P0-2, P0-5a (Tauriel checklist). LOCAL / throwaway DB only.
-- Run: zsh ~/claude/esix10/scripts/run-rls-tests.sh   (fails loudly on the first broken rule)
-- Everything runs inside one transaction that is rolled back, so the fake data is unchanged.
\set ON_ERROR_STOP on
begin;

-- Helpers live in a throwaway schema (rolled back at the end).
create schema rls_test;
grant usage on schema rls_test to authenticated;
create function rls_test.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create function rls_test.ok(cond boolean, name text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAIL: %', name; end if;
  raise notice 'PASS: %', name;
end $$;
grant execute on all functions in schema rls_test to authenticated;

-- Fake people (from seed.sql)
\set admin   '''10000000-0000-0000-0000-000000000001'''
\set james   '''10000000-0000-0000-0000-000000000003'''
\set maria   '''10000000-0000-0000-0000-000000000004'''
\set david   '''10000000-0000-0000-0000-000000000005'''
\set newbie  '''10000000-0000-0000-0000-000000000006'''
\set removed '''10000000-0000-0000-0000-000000000007'''
\set dm_jm   '''dm_10000000-0000-0000-0000-000000000003_10000000-0000-0000-0000-000000000004'''

-------------------------------------------------------------------- P0-5a adults only
reset role; select set_config('request.jwt.claims', '', true);
do $$ begin
  begin
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
            'kid@example.test', 'x', '{"full_name":"Kid"}', now(), now());
    raise exception 'FAIL: P0-5a sign-up without 18+ confirmation was accepted';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'PASS: P0-5a sign-up without 18+ confirmation is refused (%)', sqlerrm;
  end;
end $$;

-------------------------------------------------------------------- P0-1 profile created by server as member/pending
do $$ declare nid uuid := gen_random_uuid(); r record; begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', nid, 'authenticated', 'authenticated',
          'adult@example.test', 'x', '{"full_name":"Adult","age_confirmed_18":true}', now(), now());
  select role, status into r from public.profiles where id = nid;
  perform rls_test.ok(r.role = 'member' and r.status = 'pending', 'P0-1 new sign-up gets a server-made member/pending profile');
end $$;

-------------------------------------------------------------------- P0-1 no self-admin
select rls_test.as_user(:newbie);
do $$ begin
  begin
    insert into public.profiles (id, role, status) values (auth.uid(), 'admin', 'approved');
    raise exception 'FAIL: P0-1 browser profile insert was accepted';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'PASS: P0-1 browser cannot insert a profile row (%)', sqlerrm;
  end;
end $$;
update public.profiles set role = 'admin', status = 'approved' where id = auth.uid();
do $$ begin
  begin
    update public.profiles set email = 'evil@example.test' where id = auth.uid();
  exception when others then raise notice 'PASS: P0-1 member cannot write the email column (%)', sqlerrm;
  end;
end $$;
reset role; select set_config('request.jwt.claims', '', true);
select rls_test.ok((select role = 'member' and status = 'pending' and email = 'newbie@example.test'
                   from public.profiles where id = :newbie), 'P0-1 pending member cannot raise own role/status/email');

select rls_test.as_user(:james);
update public.profiles set group_ids = array['brotherhood','sisterhood','family'], group_id = 'sisterhood' where id = auth.uid();
select rls_test.ok((select group_ids = array['brotherhood'] from public.profiles where id = auth.uid()),
                  'P0-1 approved member cannot add themselves to other groups');
update public.profiles set avatar_url = 'https://evil.example/x.png' where id = auth.uid();
select rls_test.ok((select avatar_url is null from public.profiles where id = auth.uid()),
                  'P0-1 member cannot skip photo approval by writing avatar_url');
update public.profiles set bio = 'Still allowed to edit my bio' where id = auth.uid();
select rls_test.ok((select bio = 'Still allowed to edit my bio' from public.profiles where id = auth.uid()),
                  'P0-1 member can still edit their own normal fields');

-------------------------------------------------------------------- P0-2 DMs
select rls_test.as_user(:david);
select rls_test.ok((select count(*) = 0 from public.messages where room_id = :dm_jm),
                  'P0-2 outsider cannot read someone else''s DM');
do $$ begin
  begin
    insert into public.room_members (room_id, user_id, added_by)
      values ('dm_10000000-0000-0000-0000-000000000003_10000000-0000-0000-0000-000000000004',
              auth.uid(), auth.uid());
    raise exception 'FAIL: P0-2 outsider joined a DM roster';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'PASS: P0-2 outsider cannot add themselves to a DM (%)', sqlerrm;
  end;
end $$;
do $$ begin
  begin
    insert into public.messages (room_id, user_id, body)
      values ('dm_10000000-0000-0000-0000-000000000003_10000000-0000-0000-0000-000000000004', auth.uid(), 'sneaky');
    raise exception 'FAIL: P0-2 outsider posted into a DM';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'PASS: P0-2 outsider cannot post into someone else''s DM (%)', sqlerrm;
  end;
end $$;
-- an empty room can't be claimed either
do $$ begin
  begin
    insert into public.room_members (room_id, user_id, added_by) values ('dm_x_y', auth.uid(), auth.uid());
    raise exception 'FAIL: P0-2 self-join into an empty room was accepted';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'PASS: P0-2 no self-join into an empty room (%)', sqlerrm;
  end;
end $$;
select rls_test.ok((select count(*) = 0 from public.room_members where room_id = :dm_jm),
                  'P0-2 outsider cannot see another DM''s roster');

select rls_test.as_user(:james);
select rls_test.ok((select count(*) >= 1 from public.messages where room_id = :dm_jm),
                  'P0-2 the two DM people can still read their DM');
insert into public.messages (room_id, user_id, body) values (:dm_jm, :james, 'hello Maria');
select rls_test.ok(true, 'P0-2 a DM person can still post');
select rls_test.ok((select public.start_dm(:david) like 'dm\_%'), 'P0-2 start_dm makes a real 2-person DM');

-------------------------------------------------------------------- P0-2 group chats
select rls_test.as_user(:james);
select rls_test.ok((select count(*) = 0 from public.messages where room_id = 'group_sisterhood'),
                  'P0-2 brother cannot read the sisterhood chat');
do $$ begin
  begin
    insert into public.messages (room_id, user_id, body) values ('group_sisterhood', auth.uid(), 'sneaky');
    raise exception 'FAIL: P0-2 posted into a group chat the member isn''t in';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'PASS: P0-2 cannot post into a group chat you''re not in (%)', sqlerrm;
  end;
end $$;
select rls_test.ok((select count(*) >= 1 from public.messages where room_id = 'group_brotherhood'),
                  'P0-2 member still reads their own group chat');

-- custom room: creator adds, outsiders can't
select rls_test.as_user(:james);
select public.create_custom_room('Test crew', array[:maria]::uuid[]) as room \gset
select rls_test.as_user(:david);
select rls_test.ok((select count(*) = 0 from public.messages where room_id = :'room'),
                  'P0-2 outsider cannot read a custom group chat');
select rls_test.as_user(:maria);
select rls_test.ok((select count(*) >= 1 from public.messages where room_id = :'room'),
                  'P0-2 invited member reads the custom group chat');

-------------------------------------------------------------------- P1-7 (early) pending / removed see no chats
select rls_test.as_user(:newbie);
select rls_test.ok((select count(*) = 0 from public.messages), 'P1-7 pending member sees no chat messages');
select rls_test.as_user(:removed);
select rls_test.ok((select count(*) = 0 from public.messages), 'P1-7 removed member sees no chat messages');

reset role; select set_config('request.jwt.claims', '', true);
rollback;
\echo 'ALL RLS P0 TESTS PASSED'
