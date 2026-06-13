-- Let STAFF (admin OR moderator) moderate posts — specifically toggle
-- photo_approved — while still blocking content edits, and blocking regular
-- members from changing photo_approved (they may only react).
-- Run once in the Supabase SQL Editor. Safe to re-run.

create or replace function guard_posts_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Admins may edit anything.
  if is_admin() then return new; end if;

  -- Moderators may moderate (e.g. approve/deny photos) but not edit content.
  if is_staff() then
    if new.id        is distinct from old.id
       or new.user_id    is distinct from old.user_id
       or new.group_id   is distinct from old.group_id
       or new.body       is distinct from old.body
       or new.photo_url  is distinct from old.photo_url
       or new.created_at is distinct from old.created_at then
      raise exception 'Moderators may moderate posts (e.g. approve photos) but not edit content.';
    end if;
    return new;
  end if;

  -- Regular members: reactions only — cannot edit content OR change photo_approved.
  if new.id            is distinct from old.id
     or new.user_id        is distinct from old.user_id
     or new.group_id       is distinct from old.group_id
     or new.body           is distinct from old.body
     or new.photo_url      is distinct from old.photo_url
     or new.photo_approved is distinct from old.photo_approved
     or new.created_at     is distinct from old.created_at then
    raise exception 'Only staff can moderate a post. Members may only react.';
  end if;
  return new;
end $$;
