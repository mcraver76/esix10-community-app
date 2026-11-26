-- Sign-up trigger tests (P0-1, P0-5a). These insert into auth.users, which only the auth
-- server can do, so this file runs as postgres. Rolled back at the end.
\set ON_ERROR_STOP on
begin;
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
do $$ declare nid uuid := gen_random_uuid(); r record; begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', nid, 'authenticated', 'authenticated',
          'adult@example.test', 'x', '{"full_name":"Adult","age_confirmed_18":true}', now(), now());
  select role, status into r from public.profiles where id = nid;
  perform rls_test.ok(r.role = 'member' and r.status = 'pending', 'P0-1 new sign-up gets a server-made member/pending profile');
end $$;
rollback;
