# ESix10 Community App — build guide

Faith/community web app (React + Vite + Supabase + Vercel + Resend). This file auto-loads
in every Claude Code session for this repo. Read it before touching anything.

**Michael is a non-developer.** Explain in plain English — no jargon dumps, no assumed
knowledge. He owns the product decisions; you do the engineering.

---

## 1. Facts you need before your first command

| | |
|---|---|
| **Repo** | `github.com/mcraver76/esix10-community-app` (NOT `esix10-community` — abandoned) |
| **Local clone** | `/Users/mcmack/Downloads/esix10-community-app` |
| **Live web** | https://community.esix10.com (also `esix10-community-app.vercel.app`) |
| **Supabase project** | `bffcrhjdibxqfmdreksi` ("ESix10 Web App") — **linked** |
| **Deploy** | push to `main` → Vercel auto-deploys |
| **iOS** | Capacitor live-URL wrapper, bundle `com.esix10.community`, on TestFlight |
| **Admin email** | `admin@esix10.com` (only controls who AUTO-becomes admin at signup) |

**Ignore these stale paths:** `~/Downloads/esix10-app` (old scaffold) and any loose
`~/Downloads/ESix10_App_*.jsx` snapshots.

**Tooling:** Node at `~/.local/node`, `gh` authed as `mcraver76`, Supabase CLI (logged in —
works **token-only, no DB password**), Docker Desktop at `/Applications/Docker.app`
(its CLI is not on PATH — `export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"`).
No Homebrew; use `python3 -m pip`.

---

## 2. Non-negotiables

1. **Never regenerate `src/App.jsx` from scratch.** Past regenerations silently dropped
   components and caused freezes. Targeted edits only. Splitting the file is fine — see §5.
2. **Schema changes go through migrations**, never the dashboard. See §3.
3. **Never `select('*')` on `profiles`.** The `email` column's grant is revoked, so `*`
   errors for every logged-in user. Use the `PROFILE_COLS` constant.
4. **Never write the profiles row before a session exists.** Email confirmation is ON, so
   there is no session right after `signUp()`. Pass fields via `options.data`; `loadProfile`
   creates the row on first authenticated login (its PGRST116 branch).
5. **Production is a live community** with confidential recovery/survivor conversations.
   Verify against live before "fixing" what a file *says* is broken (see §4).
6. **The anon key is public** (it ships in the bundle). `service_role` is a master key —
   server-side only, never in `src/`.

---

## 3. Database workflow (same as RhinoScore, since 18 Aug 2026)

```bash
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"   # only for db pull
supabase migration list --linked        # what's applied where
supabase db push                        # apply new migrations
```

- Schema lives **only** in `supabase/migrations/`. `20260818164608_remote_schema.sql` is the
  baseline snapshot of the hand-built live schema (26 tables).
- Every migration: **idempotent** (`if not exists`, `drop policy if exists` then create) and
  carries a **rollback** note at the bottom.
- `db push` and `migration list` need no Docker. `db pull`/`db dump` do.
- Loose `sql/*.sql` files are legacy. `verify_*.sql` are read-only diagnostics and fine to run.

### ⚠️ The Supabase anon trap — check this on any new table
Supabase grants `ALL ... TO anon` on public tables by default, and the anon key is public.
So a policy written as a bare `USING (true)` (**no `TO` clause** = PUBLIC) is readable **by
anyone on the internet**; `TO authenticated` is safe. This caused a real leak here (private
group *rosters* were world-readable) — closed 18 Aug by revoking anon SELECT on every table
and view plus the default privilege. **Always write `TO authenticated`.**

---

## 4. Security model (verified live 18 Aug 2026)

- **Roles** in `profiles.role`: `member` / `moderator` / `admin`. `is_staff()` = admin OR
  moderator; app helper `isStaff(p)`. Only admins change roles; only staff change `status`.
  A `guard_profile_privileges` trigger reverts illegal changes.
- **Room id conventions** (the `messages` table holds all five kinds):
  | Kind | `room_id` | Membership tracked in |
  |---|---|---|
  | Direct message | `dm_<sortedUidA>_<sortedUidB>` | the id itself |
  | Community group | `group_<groupId>` | `profiles.group_ids` |
  | Casual group | `group_custom_<ts>` | `room_members` |
  | Private group | `private_<uuid>` | `private_group_members` |
  | Leadership | `group_all` | admins only |
- `messages` SELECT is already a membership test scoped `TO authenticated`, and **admins
  retain full read access by Michael's decision** (18 Aug). Admin reads are invisible and
  unlogged — the Moderator Agreement is the only control.
- `profiles.email` is protected by a **column grant revocation**, not the row policy. Staff
  read others' emails via the `staff_emails()` RPC; your own comes from the auth session.
- `username_available(text)` RPC exists for the signed-out signup check (profiles is
  `authenticated`-only, so the old direct read always returned "available").
- `notification_log` intentionally has RLS on and **zero policies** — service_role only.
  That's correct, not a hole.

---

## 5. Code layout & the split-in-progress

`src/App.jsx` was one 6,608-line file with 77 top-level definitions. It is being split by
feature, the same way RhinoScore's was (9,150 → 4,494 across 28 modules).

**The build does NOT catch a dangling reference after moving code between files** — it
compiles fine and crashes at runtime. So there is tooling for this; use it rather than
moving code by hand:

```bash
node scripts/split-deps.mjs "CompA,CompB"   # what does this block actually need?
node scripts/split-extract.mjs plan.json    # move it by AST range; App's imports are derived
npm run check:imports                       # every module must have zero unresolved refs
npm run build
```

1. **Find dependencies by parsing, not reading** — `split-deps` reports the block's *free
   variables*. `UNRESOLVED: none` means the list is complete.
2. **Extract shared pieces downward first.** A feature importing a helper *from App.jsx*
   creates a cycle (App→feature→App) — the thing RhinoScore had to unpick. That is why
   `supabaseClient`, `helpers`, `stats`, `icons`, `ui` exist.
3. **Never move by line number.** Regex boundaries mis-slice on brackets inside strings and
   swallow the comment belonging to the next declaration.
4. One feature per commit, and run the app afterwards.

**Two group systems — keep both:** casual main-chat groups ("talk trash with buddies",
low-stakes) and **Private/Community Groups** (`PrivateGroups`, serious/regulated — survivors,
recovery). **The 15-member cap on `join_policy='private'` groups is intentional** (intimacy and
accountability) — never propose raising it. Open and By-request groups are deliberately unlimited.

**Two navs to update** when adding a nav item: the mobile `MORE_ITEMS` array and the desktop
sidebar's hardcoded inline array.

---

## 6. Workflow

Branch → PR → squash-merge to `main` → Vercel deploys → **verify live** (fetch the deployed
bundle or hit the endpoint; don't infer success from a green merge). Finish the PR — carry it
through to production rather than leaving it half-shipped.

Before any change that writes to the production database, say what it does in plain English
and get Michael's go-ahead. Read-only diagnostics are fine to run freely.

---

## 7. Known-open items

- **`SUPABASE_SERVICE_ROLE_KEY` is not yet set in Vercel** → branded *signup* emails return
  503. Harmless (Supabase still sends its own confirmation mail; approval emails work).
- **Edge functions are not in the repo.** `generate` and `forge-autopilot` live only on
  Supabase — the same version-control gap the migrations just closed for schema.
  `forge-autopilot` must keep **JWT verification OFF**; its AI prompts are duplicated in
  `App.jsx` — keep them in sync.
- **Latent:** the `messages` policy checks `group_ids` (array) but not `group_id` (singular);
  a member with only the singular set couldn't read their community group chat.
- **No tests, no CI, no ErrorBoundary** — a crash shows a blank screen and leaves no record.
- Legal text in `src/legalContent.js` is a **draft template, not lawyer-reviewed**
  (governing law = Georgia placeholder). Bump `LEGAL_VERSION` to force re-acceptance.
