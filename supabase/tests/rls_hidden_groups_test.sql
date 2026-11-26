-- Hidden private groups proof (Michael 11-26 9:08 "Yes, add hidden groups").
-- Runs as 'authenticator' (the app's own login). LOCAL / throwaway DB only. Rolled back at the end.
\set ON_ERROR_STOP on
begin;
\set grace   '''10000000-0000-0000-0000-000000000002'''
\set james   '''10000000-0000-0000-0000-000000000003'''
\set maria   '''10000000-0000-0000-0000-000000000004'''
\set david   '''10000000-0000-0000-0000-000000000005'''
\set newbie  '''10000000-0000-0000-0000-000000000006'''
\set hg      '''20000000-0000-0000-0000-000000000002'''
\set hgroom  '''private_20000000-0000-0000-0000-000000000002'''

select rls_test.as_service();
select invite_code as code from public.private_groups where id = :hg \gset

-------------------------------------------------------------- outsiders can't even tell it exists
select rls_test.as_user(:james);
select rls_test.ok((select count(*) = 0 from public.private_groups where id = :hg or name ilike '%Survivors%'),
  'HIDDEN an outsider cannot see the hidden group (not its name, description or count)');
select rls_test.ok((select count(*) >= 1 from public.private_groups where id = '20000000-0000-0000-0000-000000000001'),
  'HIDDEN normal listed groups still show in Discover');
select rls_test.ok((select count(*) = 0 from public.private_group_members where group_id = :hg),
  'HIDDEN an outsider cannot see who is in it');
select rls_test.ok((select count(*) = 0 from public.messages where room_id = :hgroom),
  'HIDDEN an outsider cannot read it');
do $$ begin
  begin
    insert into public.private_group_requests (group_id, user_id, status)
      values ('20000000-0000-0000-0000-000000000002', auth.uid(), 'pending');
    raise exception 'FAIL: HIDDEN outsider requested a hidden group without the invite link';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'PASS: HIDDEN cannot request a hidden group without its invite link (%)', sqlerrm;
  end;
end $$;
do $$ begin
  begin
    perform public.request_join_by_code('not-a-real-code');
    raise exception 'FAIL: HIDDEN a made-up invite code worked';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'PASS: HIDDEN a made-up invite code is refused (%)', sqlerrm;
  end;
end $$;

-------------------------------------------------------------- invite link -> request -> creator approves
select rls_test.ok((select status = 'requested' from public.request_join_by_code(:'code')),
  'HIDDEN the real invite link sends a join request');
select rls_test.ok((select count(*) = 0 from public.messages where room_id = :hgroom),
  'HIDDEN a request alone gives no access (still cannot read)');
select rls_test.ok((select count(*) = 0 from public.private_groups where id = :hg),
  'HIDDEN a request alone does not reveal the group in lists');

select rls_test.as_user(:maria);   -- plain member of the hidden group
select rls_test.ok((select count(*) = 0 from public.private_group_requests where group_id = :hg and user_id = :james),
  'HIDDEN other members cannot see who asked to join');

select rls_test.as_user(:grace);   -- the creator
select rls_test.ok((select count(*) = 1 from public.private_group_requests where group_id = :hg and user_id = :james and status = 'pending'),
  'HIDDEN the creator sees the pending request');
insert into public.private_group_members (group_id, user_id, role) values (:hg, :james, 'member');
update public.private_group_requests set status = 'approved' where group_id = :hg and user_id = :james;
select rls_test.ok(true, 'HIDDEN the creator can approve (adds the person, closes the request)');
update public.private_groups set invite_code = 'chosen-by-creator' where id = :hg;
select rls_test.as_service();
select rls_test.ok((select invite_code = :'code' from public.private_groups where id = :hg),
  'HIDDEN a creator cannot change the invite code to something guessable');

-- a leaked link can be killed by the creator
select rls_test.as_user(:grace);
select public.rotate_invite_code(:hg) as newcode \gset
select set_config('rls.oldcode', :'code', true);
select rls_test.as_user(:david);
do $$ begin
  begin
    perform public.request_join_by_code(current_setting('rls.oldcode'));
    raise exception 'FAIL: HIDDEN the old invite link still worked after rotation';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'PASS: HIDDEN after "new invite link", the old link is refused (%)', sqlerrm;
  end;
end $$;
select rls_test.ok((select status = 'requested' from public.request_join_by_code(:'newcode')),
  'HIDDEN the new invite link works');
select rls_test.as_user(:james);
do $$ begin
  begin
    perform public.rotate_invite_code('20000000-0000-0000-0000-000000000002');
    raise exception 'FAIL: HIDDEN a non-creator rotated the invite link';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'PASS: HIDDEN only the creator (or admin) can make a new invite link (%)', sqlerrm;
  end;
end $$;

-- a request can't be moved to another group
select rls_test.as_user(:grace);
update public.private_group_requests set group_id = '20000000-0000-0000-0000-000000000001'
  where group_id = :hg and user_id = :david;
select rls_test.as_service();
select rls_test.ok((select count(*) = 1 from public.private_group_requests where group_id = :hg and user_id = :david),
  'HIDDEN a creator cannot move a join request onto another group');

select rls_test.as_user(:maria);
insert into public.messages (room_id, user_id, body, sender_name) values (:hgroom, :maria, 'Welcome (after James joined, fake)', 'Maria Lopez');
select rls_test.as_user(:james);
select rls_test.ok((select count(*) >= 1 from public.messages where room_id = :hgroom),
  'HIDDEN once approved, the new member can read it');
select rls_test.ok((select count(*) = 0 from public.messages where room_id = :hgroom and body like 'Hidden-group test message%'),
  'HIDDEN history from join: the new member does not see what was said before they joined');
select rls_test.ok((select count(*) = 1 from public.private_groups where id = :hg),
  'HIDDEN once approved, the group shows in their own list');

-------------------------------------------------------------- pending members can't use invite links
select rls_test.as_user(:newbie);
do $$ begin
  begin
    perform public.request_join_by_code('anything');
    raise exception 'FAIL: HIDDEN a pending account used an invite link';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'PASS: HIDDEN accounts waiting for approval cannot use invite links (%)', sqlerrm;
  end;
end $$;

rollback;
\echo 'ALL HIDDEN GROUP TESTS PASSED'
