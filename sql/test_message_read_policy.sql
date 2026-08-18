-- ============================================================================
-- ESix10 — Regression test for the message read policy.
--
-- Proves that fix_message_read_policy.sql blocks cross-room reads WITHOUT
-- breaking the rooms people are supposed to see. Runs against a THROWAWAY
-- local Postgres, never against the live database.
--
--   HOW TO RUN
--     createdb esix10_test
--     psql -d esix10_test -f sql/test_message_read_policy.sql
--     psql -d esix10_test -f sql/fix_message_read_policy.sql
--     psql -d esix10_test -f sql/test_message_read_policy.sql  # assertions
--
--   Any line containing ** FAIL ** or ** BROKE THE APP ** means do not ship.
--
-- The fixture mirrors the live schema as inferred from the app code:
--   alice + bob  -> brotherhood        carol -> sisterhood      dave -> admin
--   alice + carol are the only members of a private "Recovery" group
--   bob + carol are the only members of a casual custom group
-- ============================================================================

-- Mirror of the ESix10 schema (as inferred from the app) + a fake auth.uid()
create schema if not exists auth;
create table if not exists auth_current (uid uuid);
insert into auth_current values (null);
create or replace function auth.uid() returns uuid
  language sql stable as $$ select uid from auth_current limit 1 $$;

create table profiles (
  id uuid primary key, email text, full_name text, username text,
  group_id text, group_ids text[] default '{}', role text default 'member',
  status text default 'approved'
);
create table messages (
  id uuid default gen_random_uuid() primary key,
  room_id text not null, user_id uuid references profiles(id),
  body text not null, created_at timestamp default now()
);
create table room_members (
  room_id text not null, user_id uuid not null, added_by uuid,
  is_creator boolean default false, primary key (room_id, user_id)
);
create table private_groups (id uuid default gen_random_uuid() primary key, name text);
create table private_group_members (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references private_groups(id), user_id uuid, role text
);

-- Cast: alice & bob in brotherhood, carol in sisterhood, dave is admin
insert into profiles (id, username, group_id, group_ids, role) values
 ('11111111-1111-1111-1111-111111111111','alice','brotherhood','{brotherhood}','member'),
 ('22222222-2222-2222-2222-222222222222','bob',  'brotherhood','{brotherhood}','member'),
 ('33333333-3333-3333-3333-333333333333','carol','sisterhood','{sisterhood}','member'),
 ('44444444-4444-4444-4444-444444444444','dave', 'brotherhood','{brotherhood}','admin');

-- A private group (the sensitive case): alice + carol only
insert into private_groups (id, name) values ('99999999-9999-9999-9999-999999999999','Recovery');
insert into private_group_members (group_id, user_id, role) values
 ('99999999-9999-9999-9999-999999999999','11111111-1111-1111-1111-111111111111','creator'),
 ('99999999-9999-9999-9999-999999999999','33333333-3333-3333-3333-333333333333','member');

-- A casual custom group: bob + carol
insert into room_members (room_id, user_id) values
 ('group_custom_1700000000','22222222-2222-2222-2222-222222222222'),
 ('group_custom_1700000000','33333333-3333-3333-3333-333333333333');

-- Messages across every room type
insert into messages (room_id, user_id, body) values
 ('dm_11111111-1111-1111-1111-111111111111_22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','alice<->bob DM'),
 ('dm_33333333-3333-3333-3333-333333333333_44444444-4444-4444-4444-444444444444','33333333-3333-3333-3333-333333333333','carol<->dave DM'),
 ('group_brotherhood','22222222-2222-2222-2222-222222222222','brotherhood chat'),
 ('group_sisterhood','33333333-3333-3333-3333-333333333333','sisterhood chat'),
 ('group_all','44444444-4444-4444-4444-444444444444','leadership chat'),
 ('group_custom_1700000000','22222222-2222-2222-2222-222222222222','casual group chat'),
 ('private_99999999-9999-9999-9999-999999999999','11111111-1111-1111-1111-111111111111','RECOVERY GROUP - most sensitive');

alter table messages enable row level security;
create role app_user;
grant usage on schema public, auth to app_user;
grant select on all tables in schema public to app_user;
grant execute on all functions in schema auth to app_user;


\t on
\a
\echo '################ AFTER — with the fix applied ################'
set role authenticated;
update auth_current set uid='22222222-2222-2222-2222-222222222222';  -- bob
select '  rooms bob can read: ' || count(distinct room_id)::text || ' of 7 (his DM, brotherhood, casual group)' from messages;
select '  bob reads RECOVERY private group ...... ' ||
  case when exists(select 1 from messages where room_id='private_99999999-9999-9999-9999-999999999999') then 'YES  ** FAIL **' else 'BLOCKED  ok' end;
select '  bob reads carol/dave private DM ....... ' ||
  case when exists(select 1 from messages where room_id like 'dm_33333333%') then 'YES  ** FAIL **' else 'BLOCKED  ok' end;
select '  bob reads leadership chat ............. ' ||
  case when exists(select 1 from messages where room_id='group_all') then 'YES  ** FAIL **' else 'BLOCKED  ok' end;
select '  bob still reads his OWN dm ............ ' ||
  case when exists(select 1 from messages where room_id like 'dm_11111111%') then 'yes  ok' else 'NO  ** BROKE THE APP **' end;
select '  bob still reads brotherhood chat ...... ' ||
  case when exists(select 1 from messages where room_id='group_brotherhood') then 'yes  ok' else 'NO  ** BROKE THE APP **' end;
select '  bob still reads his casual group ...... ' ||
  case when exists(select 1 from messages where room_id='group_custom_1700000000') then 'yes  ok' else 'NO  ** BROKE THE APP **' end;

\echo ''
update auth_current set uid='44444444-4444-4444-4444-444444444444';  -- dave, ADMIN
select '  ADMIN reads RECOVERY private group .... ' ||
  case when exists(select 1 from messages where room_id='private_99999999-9999-9999-9999-999999999999') then 'YES' else 'BLOCKED  (see note in the file)' end;
select '  ADMIN reads other members'' DMs ........ ' ||
  case when exists(select 1 from messages where room_id like 'dm_11111111%') then 'YES' else 'BLOCKED  (see note in the file)' end;
select '  ADMIN still reads leadership chat ..... ' ||
  case when exists(select 1 from messages where room_id='group_all') then 'yes  ok' else 'NO  ** BROKE THE APP **' end;
select '  ADMIN still reads all group chats ..... ' ||
  case when (select count(distinct room_id) from messages where room_id in ('group_brotherhood','group_sisterhood'))=2 then 'yes  ok' else 'NO  ** BROKE THE APP **' end;
reset role;

\echo ''
\echo '################ NOT SIGNED IN (public anon key) ################'
update auth_current set uid=null;
set role anon_test;
select '  anonymous reads any message ........... ' ||
  case when exists(select 1 from messages) then 'YES  ** FAIL **' else 'BLOCKED  ok' end;
reset role;
