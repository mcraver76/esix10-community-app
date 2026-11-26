-- Group + private-group isolation proof (Michael 11-26: "no way for sensitive conversations to bleed out").
-- Runs as 'authenticator' (the app's own login). LOCAL / throwaway DB only. Rolled back at the end.
\set ON_ERROR_STOP on
begin;
\set admin   '''10000000-0000-0000-0000-000000000001'''
\set grace   '''10000000-0000-0000-0000-000000000002'''
\set james   '''10000000-0000-0000-0000-000000000003'''
\set maria   '''10000000-0000-0000-0000-000000000004'''
\set david   '''10000000-0000-0000-0000-000000000005'''
\set newbie  '''10000000-0000-0000-0000-000000000006'''
\set removed '''10000000-0000-0000-0000-000000000007'''
\set pg      '''20000000-0000-0000-0000-000000000001'''
\set pgroom  '''private_20000000-0000-0000-0000-000000000001'''

-------------------------------------------------------------- group posts + prayers stay in their group
select rls_test.as_user(:james);   -- Brotherhood
select rls_test.ok((select count(*) = 0 from public.posts where group_id <> 'brotherhood'),
  'GROUPS brother sees no Sisterhood/Family posts (direct database call)');
select rls_test.ok((select count(*) = 0 from public.prayer_wall where group_id <> 'brotherhood'),
  'GROUPS brother sees no Sisterhood/Family prayer requests');
select rls_test.ok((select count(*) = 0 from public.prayers where user_id <> auth.uid()),
  'GROUPS the raw prayers table shows only your own rows');
do $$ begin
  begin
    insert into public.posts (user_id, group_id, body) values (auth.uid(), 'sisterhood', 'sneaky');
    raise exception 'FAIL: GROUPS brother posted into the Sisterhood';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'PASS: GROUPS cannot post into a group you are not in (%)', sqlerrm;
  end;
end $$;
select rls_test.ok((select count(*) >= 1 from public.posts where group_id = 'brotherhood'),
  'GROUPS brother still sees Brotherhood posts');

select rls_test.as_user(:david);   -- Family
select rls_test.ok((select count(*) = 0 from public.prayer_wall where group_id = 'sisterhood'),
  'GROUPS family member cannot see the Sisterhood''s anonymous prayer');

-------------------------------------------------------------- anonymous means anonymous
select rls_test.as_user(:grace);   -- Sisterhood moderator
select rls_test.ok((select bool_and(user_id is null and author_name = 'Anonymous')
                    from public.prayer_wall where anonymous), 'ANON anonymous prayer hides who posted it (moderator view)');
select rls_test.as_user(:admin);
select rls_test.ok((select bool_and(user_id is null and author_name = 'Anonymous')
                    from public.prayer_wall where anonymous), 'ANON anonymous prayer hides who posted it even from the admin');
select rls_test.as_user(:maria);
select rls_test.ok((select bool_and(is_mine) from public.prayer_wall where anonymous),
  'ANON the author can still recognize (and delete) their own anonymous prayer');

-------------------------------------------------------------- private group = locked
select rls_test.as_user(:maria);   -- member of the private group
select rls_test.ok((select count(*) >= 1 from public.messages where room_id = :pgroom),
  'PRIVATE a member reads the private group chat');
select rls_test.ok((select count(*) >= 2 from public.private_group_members where group_id = :pg),
  'PRIVATE a member sees the member list');

select rls_test.as_user(:james);   -- approved, not a member
select rls_test.ok((select count(*) = 0 from public.messages where room_id = :pgroom),
  'PRIVATE non-member cannot read the private group chat');
select rls_test.ok((select count(*) = 0 from public.private_group_members where group_id = :pg),
  'PRIVATE non-member cannot see who is in the private group');
do $$ begin
  begin
    insert into public.messages (room_id, user_id, body)
      values ('private_20000000-0000-0000-0000-000000000001', auth.uid(), 'sneaky');
    raise exception 'FAIL: PRIVATE non-member posted into the private group';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'PASS: PRIVATE non-member cannot post into the private group (%)', sqlerrm;
  end;
end $$;
do $$ begin
  begin
    insert into public.private_group_members (group_id, user_id, role)
      values ('20000000-0000-0000-0000-000000000001', auth.uid(), 'member');
    raise exception 'FAIL: PRIVATE non-member added themselves to an approval-only private group';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'PASS: PRIVATE cannot add yourself to an approval-only private group (%)', sqlerrm;
  end;
end $$;

-- a MODERATOR who is not in the private group gets nothing either
reset role; select set_config('request.jwt.claims', '', true);
select rls_test.as_service(); update public.profiles set role = 'moderator' where id = :james;
select rls_test.as_user(:james);
select rls_test.ok((select count(*) = 0 from public.messages where room_id = :pgroom),
  'PRIVATE a moderator outside the group cannot read it');
select rls_test.ok((select count(*) = 0 from public.private_group_members where group_id = :pg),
  'PRIVATE a moderator outside the group cannot see its member list');
select rls_test.as_service(); update public.profiles set role = 'member' where id = :james;

-- the creator cannot drag someone in without their request
select rls_test.as_user(:grace);   -- creator of the private group
do $$ begin
  begin
    insert into public.private_group_members (group_id, user_id, role)
      values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'member');
    raise exception 'FAIL: PRIVATE creator added a person who never asked to join';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'PASS: PRIVATE creator cannot add someone who did not ask to join (%)', sqlerrm;
  end;
end $$;

select rls_test.as_user(:admin);
select rls_test.ok((select count(*) = 0 from public.messages where room_id = :pgroom),
  'PRIVATE even the platform admin does not read private group conversations');

-------------------------------------------------------------- photos follow the same lock
select rls_test.as_user(:maria);
select rls_test.ok(public.can_access_media('private_20000000-0000-0000-0000-000000000001/x_1.jpg'),
  'PHOTOS a private-group member can open its photos');
select rls_test.ok(public.can_access_media('posts/sisterhood/x_1.jpg'), 'PHOTOS a sister can open Sisterhood post photos');
select rls_test.as_user(:james);
select rls_test.ok(not public.can_access_media('private_20000000-0000-0000-0000-000000000001/x_1.jpg'),
  'PHOTOS a non-member cannot open private group photos');
select rls_test.ok(not public.can_access_media('posts/sisterhood/x_1.jpg'), 'PHOTOS a brother cannot open Sisterhood post photos');
select rls_test.ok(not public.can_access_media('dm_10000000-0000-0000-0000-000000000004_10000000-0000-0000-0000-000000000005/x_1.jpg'),
  'PHOTOS an outsider cannot open someone else''s DM photos');
select rls_test.as_anon();
select rls_test.ok((select count(*) = 0 from storage.objects where bucket_id = 'private-media'),
  'PHOTOS signed-out visitors see no private photos');
select rls_test.as_service();
select rls_test.ok((select not public from storage.buckets where id = 'private-media'),
  'PHOTOS the private-media bucket is not public');

-------------------------------------------------------------- pending / removed see nothing
select rls_test.as_user(:newbie);
select rls_test.ok((select count(*) = 0 from public.posts), 'PENDING sees no posts');
select rls_test.ok((select count(*) = 0 from public.prayer_wall), 'PENDING sees no prayer requests');
select rls_test.ok(not public.can_access_media('posts/brotherhood/x_1.jpg'), 'PENDING cannot open group photos');
select rls_test.as_user(:removed);
select rls_test.ok((select count(*) = 0 from public.posts), 'REMOVED sees no posts');
select rls_test.ok((select count(*) = 0 from public.prayer_wall), 'REMOVED sees no prayer requests');

rollback;
\echo 'ALL GROUP ISOLATION TESTS PASSED'
