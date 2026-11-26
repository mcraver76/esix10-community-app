-- RLS proof test for hardening P0-1, P0-2, P0-5a + Tauriel's M1/M2/M3 (11-26). LOCAL / throwaway DB only.
-- Runs logged in as 'authenticator' (the same login the app's API uses), so every guard treats
-- these checks as untrusted app users. Run: zsh ~/claude/esix10/scripts/run-rls-tests.sh
-- Everything is rolled back at the end.
\set ON_ERROR_STOP on
begin;

\set admin   '''10000000-0000-0000-0000-000000000001'''
\set moder   '''10000000-0000-0000-0000-000000000002'''
\set james   '''10000000-0000-0000-0000-000000000003'''
\set maria   '''10000000-0000-0000-0000-000000000004'''
\set david   '''10000000-0000-0000-0000-000000000005'''
\set newbie  '''10000000-0000-0000-0000-000000000006'''
\set removed '''10000000-0000-0000-0000-000000000007'''
\set dm_jm   '''dm_10000000-0000-0000-0000-000000000003_10000000-0000-0000-0000-000000000004'''

select rls_test.ok(session_user = 'authenticator', 'harness: logged in as the app''s authenticator login');

-------------------------------------------------------------------- M1 signed-out visitors
select rls_test.as_anon();
do $$ begin
  begin
    insert into public.profiles (id, role, status) values (gen_random_uuid(), 'admin', 'approved');
    raise exception 'FAIL: M1 anon inserted a profile';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'PASS: M1 signed-out visitor cannot insert a profile (%)', sqlerrm;
  end;
end $$;
do $$ declare n int; begin
  begin
    update public.profiles set role = 'admin' where id = '10000000-0000-0000-0000-000000000006';
    get diagnostics n = row_count;
    if n > 0 then raise exception 'FAIL: M1 anon updated a profile'; end if;
    raise notice 'PASS: M1 signed-out visitor updates 0 profiles';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'PASS: M1 signed-out visitor cannot update profiles (%)', sqlerrm;
  end;
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
select rls_test.as_service();
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

-------------------------------------------------------------------- M2 moderator limits
select rls_test.as_user(:moder);
update public.profiles set status = 'removed' where id = :admin;
update public.profiles set status = 'approved' where id = :removed;
update public.profiles set status = 'approved' where id = :newbie;
select rls_test.as_service();
select rls_test.ok((select status = 'approved' from public.profiles where id = :admin),
                  'M2 moderator cannot remove an admin');
select rls_test.ok((select status = 'approved' from public.profiles where id = :newbie),
                  'M2 moderator can still approve a pending member');
select rls_test.ok((select status = 'removed' from public.profiles where id = :removed),
                  'M2 moderator cannot bring back a removed member (admin-only)');
select rls_test.as_service(); update public.profiles set status = 'pending' where id = :newbie;

-------------------------------------------------------------------- M3 private groups
select rls_test.as_user(:james);
insert into public.private_groups (name, created_by, approved, join_policy) values ('Self-approved?', :james, true, 'open');
update public.private_groups set approved = true where created_by = :james;
select rls_test.as_service();
select rls_test.ok((select bool_and(not approved) from public.private_groups where created_by = :james),
                  'M3 creator cannot approve their own private group');

-------------------------------------------------------------------- P0-2 DMs
select rls_test.as_user(:david);
select rls_test.ok((select count(*) = 0 from public.messages where room_id = :dm_jm),
                  'P0-2 outsider cannot read someone else''s DM');
do $$ begin
  begin
    insert into public.room_members (room_id, user_id, added_by)
      values ('dm_10000000-0000-0000-0000-000000000003_10000000-0000-0000-0000-000000000004', auth.uid(), auth.uid());
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

rollback;
\echo 'ALL RLS P0 TESTS PASSED'
