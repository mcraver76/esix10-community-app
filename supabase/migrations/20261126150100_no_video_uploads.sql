-- Video uploads OFF in chats and group posts until a video scanner exists (Michael 11-26 9:49 "Yes",
-- Tauriel's safety-layer plan: no way to hash-check videos yet). YouTube/Vimeo/Facebook LINKS still work.
-- The private-media bucket now accepts photos only, max 10 MB (the app already limits photos to 5 MB).
-- LOCAL TEST SERVER first. Safe to re-run.
update storage.buckets
   set allowed_mime_types = array['image/jpeg','image/png','image/gif','image/webp','image/heic','image/heif'],
       file_size_limit = 10485760
 where id = 'private-media';

-- Rollback: re-run the insert ... on conflict from 20261126130100_private_media_bucket.sql
-- (adds video/mp4, video/quicktime, video/webm back and the 100 MB limit).
