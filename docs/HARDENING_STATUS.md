# Community app: hardening status (Tauriel's shared checklist)

Source checklist: `~/claude/security/ORG-APP-HARDENING-CHECKLIST.md` (Tauriel, 2026-11-26; same standard as the Alliance).
Work happens on the local test server only (`LOCAL_TEST_SERVER.md`). The live DB stays paused until Michael's yes.
Legend: ✅ done with proof, waiting on Tauriel's PASS · 🟡 partly · ⬜ open. **Only Tauriel marks PASS.**

**How to re-run the proof:**
- `zsh ~/claude/esix10/scripts/run-rls-tests.sh` rebuilds the local DB from migrations + fake data, then runs `supabase/tests/rls_p0_test.sql`.
- `zsh ~/claude/esix10/scripts/test-cloudflare-fn.sh` runs the function gate checks.

Branch: `security/p0-criticals`.

## P0
| # | Item | Status | Proof |
|---|---|---|---|
| 1 | Profile insert guard (SEC-111) | ✅ | **Migration `20261126120000_p0_profile_and_chat_locks.sql`:** `handle_new_user()` trigger on auth.users creates member/pending; "insert own profile" policy dropped; `guard_profile_privileges` runs BEFORE INSERT OR UPDATE and locks role, status, email, group_ids/group_id (first pick only while pending), photo avatar_url and id. `is_approved/is_admin/is_staff` require status = approved. **App:** App.jsx loadProfile no longer inserts or auto-admins. **Tests (11-26 7:47, all PASS):** "P0-1 new sign-up gets a server-made member/pending profile", "browser cannot insert a profile row", "pending member cannot raise own role/status/email", "approved member cannot add themselves to other groups", "cannot skip photo approval", "can still edit own normal fields". **Browser (7:52, as fake member James via the real API):** an update to role=admin left role = member. |
| 2 | Room / chat membership (SEC-112 + your a, b) | ✅ | **Same migration:** one `is_room_member(room)` helper used by messages select + insert and room_members select. No self-join (insert = room creator or admin only, approved invitees only). DMs are real rows via `start_dm()`, the welcome DM creates its rows, and existing DMs are backfilled. Casual groups via `create_custom_room()`. strpos shortcut removed; admins no longer read DMs or private groups. **App:** App.jsx send() calls start_dm first; group creation uses the RPC; DM rooms are filtered out of "My Groups". **Tests (all PASS):** outsider can't read/post/join/see the roster of a DM; no self-join into an empty room; brother can't read or post in the sisterhood chat; outsider can't read a custom group; DM people and invitees still can. **Browser (7:52):** start_dm, a DM send + read, create_custom_room and the chat screen all work; the sisterhood chat returned 0 rows to James. |
| 3 | Edge function caller checks (SEC-113 + your c) | 🟡 | **cloudflare:** `supabase/functions/cloudflare/index.ts` now requires a signed-in, approved admin/moderator (checked server-side with getUser + profile) and a per-person daily cap (`function_usage` + `bump_function_usage()`, service-role only, migration `20261126120100`). **Local proof (`test-cloudflare-fn.sh`, 7:48):** public key → 401; approved member → 403; pending → 403; admin passes the gate (then 500 only because local has no Cloudflare token). **App:** media.jsx uses `supabase.functions.invoke` (the user's token, no hard-coded live URL). **OPEN:** (a) the token rotation to a Stream-only token is Michael's click at the real redeploy (Kora: waits); (b) NEW FINDING: the `generate` (AI) and `notify` functions exist only on the paused live project, not in the repo. The app sent its own AI prompt with the public key, so anyone could use the Anthropic key as a free AI proxy. The app now calls them via invoke (forge.jsx), but the server code must be pulled into the repo and given a fixed server-side prompt, a staff check and a cap before any redeploy. |
| 4 | Sensitive access gates | n/a for v1 | No youth or background checks in v1 (Michael 11-26). Revisit with the youth version. |
| 5a | Adults only | 🟡 | `handle_new_user()` refuses sign-up unless `age_confirmed_18` = true (server-side). auth.jsx sends the box value. **Test PASS:** "P0-5a sign-up without 18+ confirmation is refused". **OPEN:** terms text 18+ wording check (legalContent.js §2 already says 18+; Vairë to confirm); the "report suspected minor → suspend" flow. |

## P1
| # | Item | Status | Proof / next |
|---|---|---|---|
| 5 | org_id lock on every table | ⬜ | No org layer exists yet. Build it per Michael 11-26 7:32 (Community-only orgs). |
| 6 | Org admin vs platform owner | ⬜ | Comes with the org layer. |
| 7 | Pending / removed see nothing | 🟡 | Chats done (tests "pending/removed member sees no chat messages" PASS). Posts, prayers, events, members and media read rules are next. |
| 8 | Security definer hygiene | 🟡 | New functions pin search_path and revoke from anon. Still to do: revoke the default anon EXECUTE (schema.sql:2166) and the `increment_*` anon grants. |
| 9 | Storage buckets | ⬜ | Chat photos go to a private bucket + signed URLs, and existing objects move too. |
| 10 | Input safety | ⬜ | http/https-only links in DB + screen (events.jsx:279). |
| 11 | RLS isolation test in CI | 🟡 | The test exists and runs locally (`supabase/tests/rls_p0_test.sql`, 22 checks). CI workflow + the 2-org case come next. |
| 12 | One migration chain | 🟡 | 11-26: all migrations replay cleanly on a fresh local DB (twice). Still to do: fold or retire the 15 loose `sql/` files; pull the `generate`, `notify` and `forge-autopilot` functions into the repo. |
| 13 | Secrets out of git | ⬜ | gitleaks history scan; grep dist. |
| 14 | Dependencies | ⬜ | @capacitor/ios critical advisory (8.4.1 → 8.6.3; real-phone check by Elanor). |

## P2 (15–19)
⬜ All open: headers (`public/_headers` for Cloudflare Pages), auth settings, backups + restore drill, logging, sensitive-group privacy (anonymous prayers, stream_key, marital status).

## App Build Standard v2 (Tauriel PASS 11-26 07:52), adopted 11-26
**File size check (`wc -l`, 11-26 7:50):**
- **Over 800: `src/App.jsx` = 1,544 lines.** Split it before the org layer lands. Messages + PrivateGroups out first, using the existing split scripts + `check:imports`.
- Watch list (500–800): forge.jsx 651, profile.jsx 629, feed.jsx 545.
- Everything else is under 500.

| # | Tooling to copy | Status | Notes |
|---|---|---|---|
| 1 | CI: lint → import check → tests → build + migration replay + RLS suite + 800-line warning | ⬜ | The local replay + RLS run already works (`run-rls-tests.sh`); needs `.github/workflows/ci.yml` |
| 2 | RLS harness (fixtures, 2 orgs, "A can't see B") — NOTE (Idril 11-26): if guards switch to `is_trusted_server()`, psql sessions count as trusted and would skip the guards, so switch to the API harness (`rls-test.mjs`, shared with Alliance) in the same change | 🟡 | The SQL harness exists (`supabase/tests/rls_p0_test.sql`); add an API-level harness (Idril's `rls-test.mjs`) + 2 orgs when the org layer exists |
| 3 | Ship-script template (gates → dry-run → push → verify → merge) | ⬜ | Galadriel pairs |
| 4 | Live query helper (temp-folder link, one SQL file) | ⬜ | Galadriel pairs |
| 5 | Off-site DB backup + check + restore drill | ⬜ | Galadriel pairs; = checklist P2-17 |
| 6 | File backup function + bucket-coverage test | ⬜ | with P1-9 storage |
| 7 | Actions pinned to SHAs | ⬜ | with #1 |
| 8 | EN + ES strings file + missing-key test | ⬜ | The app is English-only today; add `src/strings.js` during the premium pass |

## Other Highs from the 11-26 audit still open
- Anonymous prayers expose user_id/author (schema.sql:1552).
- stream_key readable by all members.
- Members can self-approve groups/events/recs.
- `staff_emails()` returns every email.
- Reactions can be inflated by anon.
