-- Anonymous invites, steps 1 + 2 (docs/ANONYMOUS_INVITES_DESIGN.md; Michael 11-26 9:22 yes on test).
-- Runs as 'authenticator' (the app's own login). LOCAL / throwaway DB only. Rolled back at the end.
-- Uses the fixture from server_anon_invite_signup_test.sql: "Dove", a limited account invited by Grace.
\set ON_ERROR_STOP on
begin;
\set admin   '''10000000-0000-0000-0000-000000000001'''
\set grace   '''10000000-0000-0000-0000-000000000002'''
\set james   '''10000000-0000-0000-0000-000000000003'''
\set maria   '''10000000-0000-0000-0000-000000000004'''
\set dove    '''10000000-0000-0000-0000-000000000008'''
\set hg      '''20000000-0000-0000-0000-000000000002'''
\set lg      '''20000000-0000-0000-0000-000000000001'''
\set hgroom  '''private_20000000-0000-0000-0000-000000000002'''
\set lgroom  '''private_20000000-0000-0000-0000-000000000001'''

create function pg_temp.refused(q text) returns boolean language plpgsql as $$
begin
  execute q;
  return false;
exception when others then
  raise notice '   (refused: %)', sqlerrm;
  return true;
end $$;

select rls_test.as_service();
select id as dove_req from public.private_group_requests where user_id = :dove and group_id = :hg \gset
select invite_code as lgcode from public.private_groups where id = :lg \gset
select set_config('t.hg', :hg, true), set_config('t.lg', :lg, true), set_config('t.req', :'dove_req', true),
       set_config('t.maria', :maria, true), set_config('t.dove', :dove, true), set_config('t.lgcode', :'lgcode', true);

-------------------------------------------------------------- 1. who can make invites
select rls_test.as_user(:maria);   -- plain member
select rls_test.ok(pg_temp.refused($q$select public.create_private_invite(current_setting('t.hg')::uuid)$q$),
  'ANON a plain group member cannot make private invites');
select rls_test.as_user(:james);   -- outsider
select rls_test.ok(pg_temp.refused($q$select public.create_private_invite(current_setting('t.hg')::uuid)$q$),
  'ANON an outsider cannot make private invites');
select rls_test.as_user(:grace);   -- creator
select rls_test.ok(pg_temp.refused($q$select public.create_private_invite(current_setting('t.lg')::uuid)$q$),
  'ANON private invites only exist for HIDDEN groups');
select (public.create_private_invite(:hg)).* \gset inv_
select rls_test.ok(:'inv_code' ~ '^[0-9a-f]{32}$' and :'inv_expires_at'::timestamptz between now() + interval '71 hours' and now() + interval '73 hours',
  'ANON the creator gets a 128-bit code that expires in 72 h');
select rls_test.ok(pg_temp.refused('select count(*) from public.group_invites'),
  'ANON nobody can read the invites table directly (no codes, no hashes)');
select rls_test.ok((select count(*) = 0 from public.list_private_invites(:hg) l where l::text like '%' || :'inv_code' || '%'),
  'ANON the invite list never shows the code');
select public.revoke_private_invite(:'inv_invite_id');
select rls_test.ok((select state = 'cancelled' from public.list_private_invites(:hg) where id = :'inv_invite_id'),
  'ANON the creator can cancel an invite');

-- limits: 5 open at a time, 10 a day
select public.create_private_invite(:hg) from generate_series(1, 5);
select rls_test.ok(pg_temp.refused($q$select public.create_private_invite(current_setting('t.hg')::uuid)$q$),
  'ANON max 5 open invites per moderator');
select public.revoke_private_invite(id) from public.list_private_invites(:hg) where state = 'open' and mine;
select public.create_private_invite(:hg) from generate_series(1, 3);   -- fixture 1 + 1 + 5 + 3 = 10 today
select rls_test.ok(pg_temp.refused($q$select public.create_private_invite(current_setting('t.hg')::uuid)$q$),
  'ANON max 10 private invites a day per moderator');

-------------------------------------------------------------- 2. a pending limited account has no access
select rls_test.as_user(:dove);
select rls_test.ok((select count(*) = 0 from public.messages where room_id = :hgroom),
  'ANON before approval the invited person cannot read the group');
select rls_test.ok((select count(*) = 0 from public.private_groups where id = :hg),
  'ANON before approval the group is not even visible to them');

-------------------------------------------------------------- 3. a SECOND person approves
select rls_test.as_user(:grace);   -- Grace issued Dove's invite
select rls_test.ok(pg_temp.refused($q$select public.approve_private_invite_request(current_setting('t.req')::uuid)$q$),
  'ANON the moderator who issued the invite cannot approve it alone');
select rls_test.ok(pg_temp.refused(format($q$insert into public.private_group_members (group_id, user_id, role) values (%L, %L, 'member')$q$,
                                         current_setting('t.hg'), current_setting('t.dove'))),
  'ANON the creator cannot skip the second approval by adding the member row directly');
update public.profiles set status = 'approved' where id = :dove;   -- Grace is also a platform moderator
select rls_test.as_service();
select rls_test.ok((select status = 'pending' from public.profiles where id = :dove),
  'ANON platform moderators cannot approve a limited account from the admin screen');
select rls_test.as_user(:maria);
select rls_test.ok(pg_temp.refused($q$select public.approve_private_invite_request(current_setting('t.req')::uuid)$q$),
  'ANON a plain member cannot approve');
-- group moderator roles: only the creator (or admin) can promote; only member <-> moderator
update public.private_group_members set role = 'moderator' where group_id = :hg and user_id = :maria;  -- Maria tries herself
select rls_test.as_service();
select rls_test.ok((select role = 'member' from public.private_group_members where group_id = :hg and user_id = :maria),
  'ANON a member cannot make themselves a group moderator');
select rls_test.as_user(:grace);
update public.private_group_members set role = 'creator' where group_id = :hg and user_id = :maria;
select rls_test.as_service();
select rls_test.ok((select role = 'member' from public.private_group_members where group_id = :hg and user_id = :maria),
  'ANON nobody can be made a second "creator"');
select rls_test.as_user(:grace);
update public.private_group_members set role = 'moderator' where group_id = :hg and user_id = :maria;
select rls_test.as_service();
select rls_test.ok((select role = 'moderator' from public.private_group_members where group_id = :hg and user_id = :maria),
  'ANON the creator can make a member a group moderator (the ↑mod button now works)');
select rls_test.as_user(:maria);   -- now a group moderator, and not the issuer
select public.approve_private_invite_request(:'dove_req');
select rls_test.as_service();
select rls_test.ok((select p.status = 'approved' and p.account_kind = 'limited' from public.profiles p where p.id = :dove)
                   and (select count(*) = 1 from public.private_group_members where group_id = :hg and user_id = :dove)
                   and (select status = 'approved' from public.private_group_requests where id = :'dove_req'),
  'ANON a second group moderator approves: member of the group, still a LIMITED account');
select rls_test.ok(not exists (select 1 from public.room_members where user_id = :dove),
  'ANON no welcome DM room is made for a limited account');

-------------------------------------------------------------- 4. what a limited account can and cannot reach
select rls_test.as_user(:maria);
insert into public.messages (room_id, user_id, body, sender_name) values (:hgroom, :maria, 'Welcome, Dove (fake)', 'Maria Lopez');
select rls_test.as_user(:dove);
select rls_test.ok((select count(*) = 1 from public.private_groups where id = :hg),
  'ANON once approved, they see their group');
select rls_test.ok((select count(*) = 1 from public.messages where room_id = :hgroom and body like 'Welcome, Dove%'),
  'ANON they read new messages in their group');
select rls_test.ok((select count(*) = 0 from public.messages where room_id = :hgroom and body like 'Hidden-group test message%'),
  'ANON history from join: they do not see what was said before they joined');
insert into public.messages (room_id, user_id, body, sender_name) values (:hgroom, :dove, 'Thank you (fake)', 'Dove (test alias)');
select rls_test.ok(true, 'ANON they can post in their group');
select rls_test.ok((select count(*) = 1 from public.private_group_members where group_id = :hg),
  'ANON they see only their own membership row (no roster of user ids until aliases, step 3)');
select rls_test.ok((select count(*) = 0 from public.messages where room_id <> :hgroom),
  'ANON no other chat at all (community groups, DMs, other private groups)');
select rls_test.ok((select count(*) = 0 from public.private_groups where id = :lg),
  'ANON other private groups are not visible');
select rls_test.ok((select count(*) = 0 from public.posts) and (select count(*) = 0 from public.prayer_wall),
  'ANON no feeds and no prayer wall');
select rls_test.ok((select count(*) = 3 from public.profiles)
                   and (select count(*) = 0 from public.profiles where id = :james),
  'ANON no members directory: they see only themselves + the people in their group');
select rls_test.ok(pg_temp.refused($q$insert into public.posts (user_id, group_id, body) values (auth.uid(), 'sisterhood', 'x')$q$),
  'ANON they cannot post to a community feed');
select rls_test.ok(pg_temp.refused($q$select public.start_dm(current_setting('t.maria')::uuid)$q$),
  'ANON no DMs yet (alias DMs with opaque room ids come in step 3)');
select rls_test.ok(pg_temp.refused($q$select public.create_custom_room('x', array[current_setting('t.maria')::uuid])$q$),
  'ANON they cannot start casual group chats');
select rls_test.ok(pg_temp.refused($q$select public.request_join_by_code(current_setting('t.lgcode'))$q$),
  'ANON they cannot use other groups'' invite links');
select rls_test.ok(pg_temp.refused($q$insert into public.private_groups (name, created_by) values ('x', auth.uid())$q$),
  'ANON they cannot create groups');
select rls_test.ok(pg_temp.refused($q$select public.create_private_invite(current_setting('t.hg')::uuid)$q$),
  'ANON they cannot invite others');
update public.profiles set group_ids = array['sisterhood'], group_id = 'sisterhood', username = 'iamreal' where id = :dove;
select rls_test.as_service();
select rls_test.ok((select coalesce(array_length(group_ids,1),0) = 0 and group_id is null and username is null from public.profiles where id = :dove),
  'ANON they cannot add themselves to community groups or set a username');

select rls_test.as_user(:grace);
update public.private_group_members set role = 'moderator' where group_id = :hg and user_id = :dove;
select rls_test.as_service();
select rls_test.ok((select role = 'member' from public.private_group_members where group_id = :hg and user_id = :dove),
  'ANON an anonymous (limited) member can never be made a group moderator');

-------------------------------------------------------------- 5. who can see the limited account
select rls_test.as_user(:james);
select rls_test.ok((select count(*) = 0 from public.profiles where id = :dove),
  'ANON people outside the group cannot see the limited account at all');
select rls_test.as_user(:maria);
select rls_test.ok((select count(*) = 1 from public.profiles where id = :dove),
  'ANON people in the group see the account (alias only)');
select rls_test.ok((select count(*) = 0 from public.profiles where account_kind = 'limited' and id <> :dove),
  'ANON other limited accounts stay invisible');

-------------------------------------------------------------- 6. history-from-join can't be faked; listed groups unaffected
select rls_test.as_user(:dove);
update public.private_group_members set joined_at = '2000-01-01' where group_id = :hg and user_id = :dove;
select rls_test.as_user(:grace);
update public.private_group_members set joined_at = '2000-01-01' where group_id = :hg and user_id = :dove;
select rls_test.as_service();
select rls_test.ok((select joined_at > now() - interval '1 hour' from public.private_group_members where group_id = :hg and user_id = :dove),
  'ANON nobody can back-date a join to read older history');
select rls_test.as_user(:maria);
select rls_test.ok((select count(*) >= 1 from public.messages where room_id = :hgroom and body like 'Hidden-group test message%'),
  'ANON members who were already there still see the history');
select rls_test.ok((select count(*) >= 1 from public.messages where room_id = :lgroom),
  'ANON listed (not hidden) private groups keep their full history');

rollback;
\echo 'ALL ANON INVITE TESTS PASSED'
