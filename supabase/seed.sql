-- FAKE test data for the LOCAL test server only (Michael 2026-11-26: "build everything
-- out on a test server… nothing goes into the live database"). Every person, email and post
-- here is made up. `supabase db reset` (start-local.sh --reset) wipes and reloads it.
--
-- Test logins (local only, all share one test password): see LOCAL_TEST_SERVER.md.
--   admin@example.test (admin) · mod@example.test (moderator)
--   james@example.test, maria@example.test, david@example.test (approved members)
--   newbie@example.test (pending approval) · removed@example.test (removed member, for security tests)

create extension if not exists pgcrypto;

do $$
declare
  pw text := crypt('LocalTest-2026!', gen_salt('bf'));
  people jsonb := '[
    {"id":"10000000-0000-0000-0000-000000000001","email":"admin@example.test","name":"Test Admin","user":"testadmin","role":"admin","status":"approved","group":"brotherhood"},
    {"id":"10000000-0000-0000-0000-000000000002","email":"mod@example.test","name":"Grace Moderator","user":"gracemod","role":"moderator","status":"approved","group":"sisterhood"},
    {"id":"10000000-0000-0000-0000-000000000003","email":"james@example.test","name":"James Carter","user":"jcarter","role":"member","status":"approved","group":"brotherhood"},
    {"id":"10000000-0000-0000-0000-000000000004","email":"maria@example.test","name":"Maria Lopez","user":"mlopez","role":"member","status":"approved","group":"sisterhood"},
    {"id":"10000000-0000-0000-0000-000000000005","email":"david@example.test","name":"David & Ana Kim","user":"thekims","role":"member","status":"approved","group":"family"},
    {"id":"10000000-0000-0000-0000-000000000006","email":"newbie@example.test","name":"Sam Newcomer","user":"samnew","role":"member","status":"pending","group":"brotherhood"},
    {"id":"10000000-0000-0000-0000-000000000007","email":"removed@example.test","name":"Rex Removed","user":"rexremoved","role":"member","status":"removed","group":"brotherhood"}
  ]';
  p jsonb;
begin
  for p in select * from jsonb_array_elements(people) loop
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', (p->>'id')::uuid, 'authenticated', 'authenticated',
      p->>'email', pw, now(), now() - interval '30 days', now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', p->>'name', 'username', p->>'user', 'age_confirmed_18', true),
      '', '', '', '')
    on conflict (id) do nothing;

    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), (p->>'id')::uuid, p->>'id',
      jsonb_build_object('sub', p->>'id', 'email', p->>'email', 'email_verified', true),
      'email', now(), now(), now())
    on conflict do nothing;

    insert into public.profiles (id, email, full_name, username, role, status, group_id, group_ids,
      city, state, bio, terms_accepted_at, terms_version, mod_agreement_at, last_seen)
    values ((p->>'id')::uuid, p->>'email', p->>'name', p->>'user', p->>'role', p->>'status',
      p->>'group', array[p->>'group'], 'Marietta', 'GA', 'Fake test profile for the local test server.',
      now(), '2026-06-13', case when p->>'role' in ('admin','moderator') then now() end, now())
    on conflict (id) do update set role = excluded.role, status = excluded.status,
      group_id = excluded.group_id, group_ids = excluded.group_ids, city = excluded.city,
      state = excluded.state, bio = excluded.bio, terms_accepted_at = excluded.terms_accepted_at,
      terms_version = excluded.terms_version, mod_agreement_at = excluded.mod_agreement_at,
      last_seen = excluded.last_seen;
  end loop;
end $$;

-- Feed posts
insert into public.posts (user_id, group_id, body, created_at, reactions) values
 ('10000000-0000-0000-0000-000000000003', 'brotherhood', 'Men''s breakfast Saturday at 7. Bring a brother who needs it. (fake post)', now() - interval '3 hours', '{"🙏":4,"👊":2}'),
 ('10000000-0000-0000-0000-000000000004', 'sisterhood', 'Finished the 21-day reading plan today. Thank you all for the encouragement! (fake post)', now() - interval '1 day', '{"❤️":6}'),
 ('10000000-0000-0000-0000-000000000005', 'family', 'Family game night was a hit. Looking for ideas for next month. (fake post)', now() - interval '2 days', '{"😂":3}'),
 ('10000000-0000-0000-0000-000000000001', 'brotherhood', 'Welcome to the local TEST community. Everything here is fake data. (fake post)', now() - interval '5 days', '{}');

-- Prayer wall (one anonymous)
insert into public.prayers (user_id, group_id, body, anonymous, author_name, reactions, created_at) values
 ('10000000-0000-0000-0000-000000000003', 'brotherhood', 'Prayers for my dad''s surgery on Tuesday. (fake)', false, 'James Carter', 5, now() - interval '6 hours'),
 ('10000000-0000-0000-0000-000000000004', 'sisterhood', 'Wisdom for a big decision at work. (fake)', true, 'Maria Lopez', 3, now() - interval '1 day');

-- Devotion
insert into public.devotions (title, scripture, scripture_ref, body, author_name) values
 ('Stand Firm', 'Be strong in the Lord and in his mighty power.', 'Ephesians 6:10',
  'A short fake devotion for testing layouts on the local server.', 'Test Admin');

-- Events (approved + one waiting for approval)
insert into public.events (title, description, group_id, event_date, location, created_by, approved) values
 ('Men''s Breakfast (test)', 'Fake event', 'brotherhood', now() + interval '3 days', 'Community Hall', '10000000-0000-0000-0000-000000000001', true),
 ('Sisters'' Night of Worship (test)', 'Fake event', 'sisterhood', now() + interval '9 days', 'Chapel', '10000000-0000-0000-0000-000000000002', true),
 ('Family Picnic (pending, test)', 'Fake event waiting for approval', 'family', now() + interval '14 days', 'Laurel Park', '10000000-0000-0000-0000-000000000005', false);

-- Group chat + a DM
insert into public.messages (room_id, user_id, sender_name, body, created_at) values
 ('group_brotherhood', '10000000-0000-0000-0000-000000000003', 'James Carter', 'Who is in for Saturday? (fake)', now() - interval '2 hours'),
 ('group_brotherhood', '10000000-0000-0000-0000-000000000001', 'Test Admin', 'Count me in. (fake)', now() - interval '90 minutes'),
 ('group_sisterhood', '10000000-0000-0000-0000-000000000004', 'Maria Lopez', 'Praying for everyone this week. (fake)', now() - interval '5 hours'),
 ('dm_10000000-0000-0000-0000-000000000003_10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'James Carter', 'Thanks for the prayer last week. (fake DM)', now() - interval '1 day');

-- The DM above is a real room with exactly its two people (security P0-2).
insert into public.room_members (room_id, user_id, added_by) values
 ('dm_10000000-0000-0000-0000-000000000003_10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003'),
 ('dm_10000000-0000-0000-0000-000000000003_10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003');

-- One approved private group (the guards trust the server while seeding: is_trusted_server()).
insert into public.private_groups (id, name, description, created_by, approved, member_count, join_policy) values
 ('20000000-0000-0000-0000-000000000001', 'Recovery Circle (test)', 'Fake private group', '10000000-0000-0000-0000-000000000002', true, 2, 'approval');
insert into public.private_group_members (group_id, user_id, role) values
 ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'creator'),
 ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'member');
insert into public.messages (room_id, user_id, sender_name, body, created_at) values
 ('private_20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'Maria Lopez',
  'Sensitive test message inside the private group (fake).', now() - interval '3 hours');
-- one prayer per group, so cross-group tests have something to find
insert into public.prayers (user_id, group_id, body, anonymous, author_name, reactions, created_at) values
 ('10000000-0000-0000-0000-000000000005', 'family', 'Family prayer request (fake)', false, 'David & Ana Kim', 1, now() - interval '2 hours');
