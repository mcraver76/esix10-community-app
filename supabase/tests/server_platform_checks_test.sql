-- Platform checks (runs as postgres). LOCAL / throwaway DB only.
-- 1. The server's own login (service_role, used by notify/push functions) can read and write every
--    app table. Idril found new Supabase projects (~10-30 default change) can come with NO grants,
--    so server functions silently reach nobody (Tauriel 11-26: add this to every app's checks).
-- 2. Chat/post uploads take photos only (video OFF until a video scanner exists, Michael 11-26 9:49).
\set ON_ERROR_STOP on
do $$
declare t record; missing text := '';
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind = 'r' order by 1 loop
    if not (has_table_privilege('service_role', 'public.' || quote_ident(t.relname), 'SELECT')
        and has_table_privilege('service_role', 'public.' || quote_ident(t.relname), 'INSERT')
        and has_table_privilege('service_role', 'public.' || quote_ident(t.relname), 'UPDATE')
        and has_table_privilege('service_role', 'public.' || quote_ident(t.relname), 'DELETE')) then
      missing := missing || ' ' || t.relname;
    end if;
  end loop;
  perform rls_test.ok(missing = '', 'PLATFORM the server role can read + write every app table' ||
                      case when missing <> '' then ' (missing:' || missing || ')' else '' end);
end $$;
select rls_test.ok((select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
                     where n.nspname = 'public' and c.relkind = 'r'
                       and has_table_privilege('service_role', c.oid, 'SELECT')) >= 20,
  'PLATFORM sanity: the check above really looked at the app tables');
select rls_test.ok((select not exists (select 1 from unnest(allowed_mime_types) m where m like 'video/%')
                    from storage.buckets where id = 'private-media'),
  'PLATFORM private chat/post uploads refuse video files (photos only)');
\echo 'ALL PLATFORM CHECKS PASSED'
