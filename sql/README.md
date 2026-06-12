# Database (Supabase) setup

These are the SQL migrations for the ESix10 community app, in the order they
should be run in the **Supabase SQL Editor** on a fresh project. Each is
idempotent (safe to re-run).

> The base tables (`profiles`, `posts`, `events`, `messages`, the Forge tables)
> are created by the `SQL_SETUP` snippet embedded near the top of `src/App.jsx`.
> Run that first on a brand-new project, then the files below.

| # | File | What it does |
|---|------|--------------|
| 1 | `supabase_setup_stats.sql` | Missing tables (kudos, prayers, post_flags, devotions, devotion_comments, local_recommendations) + the `profile_stats` live view |
| 2 | `supabase_security.sql` | Row-level security: members create/delete own content + react + flag; admins manage all; reaction-only edit guards; events `approved` column |
| 3 | `supabase_member_access.sql` | `is_approved()` — new members are limited (browse + react) until an admin approves them |
| 4 | `supabase_private_groups_guard.sql` | Blocks pending members from creating/joining private groups |
| 5 | `supabase_member_flags.sql` | `member_flags` table — members can report other members |
| 6 | `supabase_moderator.sql` | `is_staff()` + moderator role (moderation without full admin); fixes admin member-approval; only admins change roles, only staff change status |

## Notes
- `avatars` is a Supabase **Storage** bucket (public), not a table — created in
  the dashboard, holds profile photos and post photos.
- Email is sent via Resend through `api/send-email.js` (needs `RESEND_API_KEY`,
  `RESEND_FROM`, `APP_URL` env vars on Vercel).
