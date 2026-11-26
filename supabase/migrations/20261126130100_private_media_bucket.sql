-- Private photos/videos for chats and group posts (security 2026-11-26; checklist P1-9).
-- Before: chat + private-group + post photos went to the PUBLIC "avatars" bucket, so anyone with
-- the link could open them without signing in. After: a private bucket where the database decides,
-- per file, who may read it, using the SAME rules as the conversation itself:
--   <room_id>/...          -> is_room_member(room_id)      (DMs, private groups, group chats)
--   posts/<group_id>/...   -> member of that group (or platform admin)
-- Files are shown through short-lived signed links (src/privateMedia.js).
-- Moving existing objects out of "avatars" is a separate step at go-live (Tauriel, item f).
-- Safe to re-run.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('private-media', 'private-media', false, 104857600,
        array['image/jpeg','image/png','image/gif','image/webp','image/heic','image/heif',
              'video/mp4','video/quicktime','video/webm'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_access_media(path text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null or not public.is_approved() then false
    when split_part(path, '/', 1) = 'posts' then
      public.is_admin() or split_part(path, '/', 2) = any(coalesce(public.my_groups(), '{}'))
    else public.is_room_member(split_part(path, '/', 1))
  end;
$$;
revoke all on function public.can_access_media(text) from public, anon;
grant execute on function public.can_access_media(text) to authenticated;

drop policy if exists "private media read" on storage.objects;
create policy "private media read" on storage.objects for select to authenticated
  using (bucket_id = 'private-media' and public.can_access_media(name));

drop policy if exists "private media upload" on storage.objects;
create policy "private media upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'private-media' and public.can_access_media(name)
              and split_part(split_part(name, '/', -1), '_', 1) = auth.uid()::text);

drop policy if exists "private media delete" on storage.objects;
create policy "private media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'private-media' and (owner_id = auth.uid()::text or public.is_admin()));

-- Rollback: drop the 3 policies + function can_access_media(text); delete the bucket only once empty.
