# Community app: in-depth audit (Lúthien, 2026-11-26)

Michael (7:20, via Idril): "an in-depth analysis of how it's set up, security… use everything we learned on RhinoScore as a baseline." Michael (7:24, via Kora) also asked for a "premium look & feel" review against the Facebook, Instagram and LinkedIn apps. Those apps set the quality bar only; we copy none of their branding.

**How it was checked:** the code only, no live database (it has been paused since 10-21, per Michael).
- Four read-only reviews: database security, app code, build process (against `~/claude/app-build-standard/` plus the RhinoScore lessons), and premium look & feel.
- Lúthien re-read the database rules behind every **Critical** item herself.
- One saved script (`~/claude/esix10/scripts/audit-checks.sh`) ran `git status`, `npm audit`, the RLS table count and the code searches.
- Idril's 93-item RhinoScore checklist (`six10-alliance/docs/baseline-audit-2026-11-26/RHINOSCORE_BASELINE.md`) is the shared yardstick for the follow-up.

**Nobody can use any of this today.** The database and its edge functions are paused, so none of these holes can be exploited right now. All of them have to be fixed before the app is ever turned on for real members. Michael (11-26 7:33): Dec 1 is the **account and ownership move only**, and the app stays paused until he says a design is locked in and Tauriel has passed every item on the hardening checklist (`docs/HARDENING_STATUS.md`). The fixes go in as migrations and are tested on the local test server first.

---

## In one paragraph
The app looks good and has real safety features: member approval, reporting, photo review, and versioned legal terms that everyone must re-accept. Every table has row security on (26 of 26, counted). The old anonymous-read leak is truly closed. But it was built before the RhinoScore lessons. Several "admin only" and "private" rules are enforced only on screen, not in the database. Two holes are serious: **any member can make themselves admin**, and **any member can read other people's DMs and private-group chats**. The build process is missing CI, tests, crash records, security headers and git backups of key files. On polish, chat, loading, buttons and the iPhone wrapper are what make it feel home-built.

---

## A. Security: must fix before going live (ranked)

| # | Severity | What a bad actor could do | Where | Fix | Checked by |
|---|---|---|---|---|---|
| 1 | **Critical** | Any new sign-up (or a member who deletes and re-creates their profile) can save themselves as **admin and approved**. The privilege guard only runs on *updates*, not *inserts*. | schema.sql:1321 (insert rule only checks your own id), :962 (guard trigger = BEFORE UPDATE only); App.jsx:1150-1177 (browser writes role/status at signup) | Create profiles server-side with a trigger on new sign-ups (role=member, status=pending). Run the guard on INSERT too. | Lúthien read :962, :1321, :143-158 |
| 2 | **Critical** | Any member can **add themselves to a DM or private-group room** that has no room_members rows yet, and then read the whole conversation. Every member can see room_members (`using (true)`). | schema.sql:1435-1443 (self-add if room empty; select all), :1537-1544 (read rule trusts room_members) | Allow self-add only for custom group rooms, and only the room's creator adds people. Limit room_members reads to your own rooms. | Lúthien read :1435-1443, :1537-1544. *Whether DM rooms have rows today needs a live check.* |
| 3 | **Critical** | The **video/live-stream function has no caller check**. Anyone holding the public key (it ships inside the app) can create uploads and live streams billed to ESix10's Cloudflare account. | supabase/functions/cloudflare/index.ts:8-60; media.jsx:9-21 sends the public key | Require a signed-in staff token inside the function. | Lúthien read index.ts |
| 4 | High | Members can **post into any chat**, including other people's DMs. The send rule never checks room membership. | schema.sql:1313 | Use the same membership test as the read rule. | Lúthien read :1313 |
| 5 | High | Members can **edit their own group list** and unlock any group chat. The guard only protects role and status. (This is the real version of the old "group_ids" note.) | schema.sql:143-158, :1447, :1541 | Make group_ids, group_id, avatar_url and the agreement columns staff-only. | Lúthien read :143-158, :1447 |
| 6 | High | **Every member can read the live-stream key** and broadcast as ESix10. | schema.sql:446, :1574; media.jsx:124 | Staff-only column or table. | review |
| 7 | High | **"Anonymous" prayers aren't anonymous** to members: user_id and author name are readable. | schema.sql:1552 | A view that hides the author when anonymous. | review |
| 8 | High | **Private-chat and survivor-group photos are public links** (stored in the public avatars bucket). | App.jsx:215-218, :766-768 | Private bucket + short-lived signed links. | review |
| 9 | High | **Removed or denied members aren't locked out**, and **pending members can read group chats** by calling the database directly. The "under review" limit is on screen only. | App.jsx:1250-1290; permissions.js:9; auth.jsx:258 | Require approved status in the read rules; show a blocked screen. | review |
| 10 | High | Unsafe website links on recommendations (`javascript:` links run code). | events.jsx:279 | Allow only http/https links. | review |
| 11 | High | **Critical iOS library flaw**: @capacitor/ios 8.4.1 has a critical advisory (remote content at the app origin, GHSA-rvm3-566m-v7fv). | npm audit 11-26 | Update to 8.6.3. | script ran npm audit |
| 12 | Medium | Members can mark their own private groups, events and recommendations as **approved**. | schema.sql:1285-1363 | Trigger keeps `approved` staff-only. | review |
| 13 | Medium | Strangers can inflate reaction counts (functions runnable with the public key). | schema.sql:164-189, :1818-1832 | Remove anon access; fixed emoji list. | review |
| 14 | Medium | `staff_emails()` gives any moderator **every member's email**. | schema.sql:266-271 | Admin-only, staff rows only. | review |
| 15 | Medium | Marital status, city, state and last-seen are visible to every member. Creators can add people to recovery groups without consent. Walk notes are open to all. | schema.sql:2053-2121, :1305-1307, :1578 | Owner/staff-only columns; invites need consent. | review |
| 16 | Low | Accounts can't be fully deleted (sign-in account, photos and room rows remain; some deletes fail). Password minimum is 6. Email HTML doesn't escape names. New functions are runnable by anon by default. | various | Part of the "Delete my account" build. | review |

**Verified OK:** RLS is on for all 26 tables (counted). The anon read leak is closed (`20260818170000`). Member emails are hidden. All definer functions pin `search_path`. No secrets are in the app bundle and no `.env` file was ever committed (checked). The send-email gate holds. Chat text is plain text, with no `dangerouslySetInnerHTML` anywhere in src (searched). The legal re-accept works.

---

## B. How it's built, against the Six10 standard (10 rules)

| Rule | Score | Gap |
|---|---|---|
| 1 Settled stack | Meets | (moving Vercel to Cloudflare on Dec 1 is planned) |
| 2 Database is code | Meets, with a caveat | 3 migrations. The baseline is a raw dump, so **rebuilding a fresh DB from it is untested**. 15 old loose files remain in `sql/`. |
| 3 Default-deny security | Partly | See section A |
| 4 Gate on function, not labels | Partly | Admin checks use `role ===` in 9 files (counted). `permissions.js` exists but isn't used everywhere. |
| 5 Branch → PR → verify | Partly | PR habit is good (#8–#15). No CI to gate them. |
| 6 CI | **Missing** | No `.github/workflows` |
| 7 Structure | Partly | App.jsx is down to 1,555 lines; Messages and PrivateGroups are still inside it |
| 8 Crash records + recovery | **Missing** | No ErrorBoundary, no client_errors, no soft delete; backups unverified |
| 9 Legal + consent | Meets | Text is a draft and needs a lawyer; it must name ESix10 Initiative and Cloudflare |
| 10 Built to scale | **Missing** | No organizations layer yet (0 org tables in the schema, checked) |

**Other build gaps:**
- **Not in git (loss risk):** `ios/`, `capacitor.config.json`, `assets/`, `TASKS.md`, `HANDOFF.md` and 8 docs, including the move and launch plans (checked with `git status`).
- **No security headers** in `vercel.json`, and no `public/_headers` for Cloudflare.
- `.gitignore` doesn't cover `.env` or signing keys.
- The edge functions `generate` and `forge-autopilot` aren't in the repo.
- Older React 18 and Vite 5 (RhinoScore is on 19 and 8).

**Copy from RhinoScore first:** CI workflow · ErrorBoundary + errorReporting + client_errors · security headers · the `.gitignore` secrets block · an RLS test (public key can't read; member can't read another's DM).

---

## C. Premium look & feel (ranked by impact)

1. **Chat freezes after 50 messages.** It loads the *oldest* 50, never scrolls to the newest, and reloads after sending. (App.jsx:184, :235, :661) · S
2. **Choosing a photo can crash the iPhone app.** Info.plist has no camera or photo permission text, which also risks App Store rejection. · S
3. **The iPhone app is the live website in a frame.** It shows a blank screen with no signal, and Apple may reject it under rule 4.2. Ship the built files inside the app. (capacitor.config.json:5-7) · M
4. **Push on iPhone says "Add to Home Screen"**, which doesn't work in an App Store app. Native push is installed but not wired. · M
5. **Missing Apple requirements: Delete account and Block user.** · M
6. **Grey browser pop-ups** (prompt/alert/confirm) are used about 14 times. Replace with in-app sheets, confirm dialogs and toasts. · M
7. **No design system.** About 11 greys, 5+ oranges, 3 backgrounds and ~16 font sizes are all hand-typed. The feed draws initials instead of profile photos. · M
8. **Loading looks unfinished:** plain "Loading..." text, full-feed reloads, and a blank screen on any crash. · S–M
9. **Tiny tap targets and text:** 10px delete links, 9px nav labels, ~26pt reaction chips. One input is 14px, so iPhone zooms in. · S
10. **Gets heavier as it grows:** no code splitting, fonts loaded twice, 50 extra badge lookups per feed, full-size photos, no "load more". · M

Next tier: notch/safe areas (check on a phone), landscape allowed, no screen or sheet animations, no haptics, dates instead of "2h ago", 5 onboarding screens (username asked twice), low-contrast greys, unlabeled icon buttons, dark mode only.

**Already good:** a real brand and dark theme, line icons, the floating tab bar with a create sheet, the daily hero card, 16px shared inputs, self-updating, friendly empty states, moderation flows, and the app icon plus splash screens.

**Shared premium kit (to agree with Idril, then one proposal to Kora):** one tokens file (≈8 neutrals, 2 brand colors, status colors, spacing 4–32, radius 8/12/20, type 12–28, fonts loaded once; each app swaps only its brand values) · one small component kit (Button, IconButton, Card, Input, Avatar, Sheet, ConfirmDialog, Toast, Skeleton, EmptyState, ErrorBoundary, ListRow, Badge) · motion rules (150 ms taps + haptic, 250 ms screens, respect reduce-motion, skeletons, pull-to-refresh, instant updates) · a native shell checklist (built files in the app, safe areas, native push, permission text, delete account, block user, offline screen).

---

## D. Suggested order (all on branches; nothing goes live without Michael's yes)
1. **First (Michael 11-26: hardening before design):** security fixes A1–A11 as migrations, tested on the local test server, then Tauriel's pass. Dec 1 moves the accounts only; the app stays paused. Commit the untracked files (after a secrets check). CI. Security headers (`public/_headers`). ErrorBoundary.
2. **Before the App Store:** Delete account, Block user, photo permission text, built-in files instead of the live-site wrapper, native push, the Capacitor update.
3. **Premium pass:** chat fixes, then the shared tokens and kit, then loading, tap targets, motion and speed.
