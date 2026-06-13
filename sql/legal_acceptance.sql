-- Record each member's acceptance of Terms/Privacy and (for staff) the
-- Moderator Agreement. Run once in the Supabase SQL Editor. Safe to re-run.

alter table profiles add column if not exists terms_accepted_at timestamptz;
alter table profiles add column if not exists terms_version text;     -- matches LEGAL_VERSION in the app
alter table profiles add column if not exists mod_agreement_at timestamptz;

-- NOTE: existing members have terms_version = NULL, so they'll be asked to
-- read & accept the Terms/Privacy once on next login. Bump LEGAL_VERSION in the
-- app whenever the Terms/Privacy change to re-prompt everyone.
