# SIX10 COMMUNITY (was ESix10 / Rhinity) — tasks (Lúthien)

## New from Michael 11-26 9:38–9:50 (via Kora, all in DECISIONS)
- [ ] ⭐ **GO-LIVE GATE (9:39):** nothing goes live until Apple + Google approve the app (ESix10 Initiative's own developer accounts), on top of the design lock, Tauriel's full PASS, the safety-layer prerequisites and attorney sign-off. **Store readiness to build in:**
  - app code bundled inside the phone apps (premium item 10, Michael YES 9:40, after hardening; Elanor/Eärwen advise);
  - privacy labels;
  - reviewer demo login;
  - report/block/moderation for user content (Apple 1.2);
  - in-app account deletion;
  - 18+ rating.
  Read `~/claude/mobile/store/STORE-REVIEW-LESSONS-for-nonprofit-apps.md`. Google Play: a new account may need a closed test with 12+ testers for 14 days (unverified; plan a 12-tester pool).
- [ ] **P0-6 sign-in security (9:38):**
  - 10+ character passwords plus a leaked-password check;
  - 2-step sign-in by authenticator/passkey, not SMS, required for admins/moderators/safety officers and offered to all;
  - secure email change and reset, sign-in alerts, recovery codes.
  Tracked in docs/HARDENING_STATUS.md #6.
- [ ] **Chats (9:49):**
  - label them honestly as "private, not end-to-end encrypted" in the app and the Terms, and point to Signal for the most sensitive details;
  - ADD a disappearing-messages option. Messages stay reportable before they vanish; reported or matched content is preserved per the safety rules.
- [x] Video uploads in chats OFF until a video scanner exists (9:49); links stay. Done 11-26 on test.
- [ ] Church videos play from YouTube/Facebook links, not self-hosted (9:49).
- [ ] **App name = "SIX10 COMMUNITY" (9:50).**
  - Update name strings on test.
  - The ESix10 Initiative logo comes out of the app; Varda designs the Six10 Community logo.
  - "Rhinity" is dropped. six10community.com/.org = Michael buys them.
- [x] Server-role table-access test (Idril/Tauriel 10:32): done 11-26.
- [ ] Messaging-plan schema migration: move `messages.created_at` + `private_group_members.joined_at` to timestamptz (Tauriel 11-26, scale + time zones). Update `room_history_start()` to return timestamptz in the same migration.

## Waiting on Michael
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel (branded signup emails return 503 without it) — his click.
- [ ] Lawyer review of legal text (`src/legalContent.js` is a draft template).

## Open
- [ ] ℹ️ (Michael 11-26 8:59) The app is FREE, a charitable program of ESix10 Initiative. Focus: disaster response + combating child trafficking, with a veterans tie-in (Nienna drafting the program plan). The media "Premium only" option is hidden and off (media.jsx SHOW_PREMIUM=false) unless he decides otherwise.
- [ ] LATER, parked (Michael 11-26 9:12, "likes it"): neutral app name/icon option, so the app doesn't look like a support app on someone's home screen (DV safety). Needs the real phone app shell (premium item 10) first.
- [ ] Panic button / reach-out: OPTIONS PAPER first, no build (Michael 11-26 9:12). docs/PANIC_BUTTON_OPTIONS_DRAFT.md → Tauriel + Melian → Vairë (attorney) before any build.
- [x] Quick Exit now FULLY SIGNS OUT (Michael 11-26 9:57 "Both sign out and then lock option"). Built on test 11-26. Proof: Maria's server sessions 1 → 0, and the app reopens on the sign-in screen.
- [ ] LATER (Michael 9:57): an optional PIN/passkey lock on private rooms, once P0-6 passkeys exist.
- [ ] Phone app (later, Elanor/Eärwen): privacy screen that hides private rooms in the app switcher.
- [x] Quick Exit in private groups (Michael 11-26 9:12): red ✕ EXIT button + Esc twice → harmless page, no "back", clears this device's recent-chat memory. Local/test only.
- [x] Hidden private groups: Michael said yes (11-26 9:08). Built + tested on the security branch (2316dd3); Tauriel reviewing.
- [ ] ⭐ PRIORITY (Michael 11-26 7:33): security hardening per docs/HARDENING_STATUS.md (Tauriel's checklist), local test server only. Premium design comes after.
- [ ] LATER, parked (Michael 11-26 7:34): youth / teen version. Needs its own design + Tauriel + attorney review (parent consent, no adult-to-minor DMs, under-13 rules). v1 = adults only.
- [ ] Church orgs live ONLY in the Community app (Michael 11-26 7:32). No data sharing or login with Alliance. Build org_id locks, the org-admin vs platform-owner split, per-org switches and a cross-org isolation test (checklist P1 5–6, 11).
- [ ] After launch: send Varda real app screens (no real member names) for the parked ESix10 Initiative post (Varda 11-16).
- [ ] Build in-app "Delete my account" (Apple requires it; see docs/LAUNCH_PLAN_2026-11-16.md).
- [ ] ⏰ **DUE BEFORE 2026-12-31 (from Cora/Celebrían 11-05):** Six10 Digital LLC becomes a partnership on 2027-01-01. Move ESix10/Rhinity (code, GitHub repo, Supabase/Vercel/Resend/domain accounts) OUT of Six10 Digital to Michael or a separate LLC before then, per the "RhinoScore stays, others move out" plan (10-27). Michael said no attorney is needed while he's sole member: move the accounts plus an optional 1-page self-signed assignment. Tell Galadriel if any shared code or accounts with RhinoScore would move. **Plan: `docs/MOVE_OUT_OF_SIX10_DIGITAL.md` (11-05).** Galadriel + Cora told 11-05. Tauriel OK'd per step with conditions (in plan). **New owner = ESix10 Initiative 501(c)(3) for BOTH apps (Michael 11-05, corrected 10:00)**; one shared set of accounts with the Six10 Alliance app (coordinate with Idril). Legal name ESix10 Initiative Inc., EIN 42-1895018; D-U-N-S requested 11-05. Step 1 accounts per `docs/STEP1_ACCOUNT_CLICK_LISTS.md` (Vercel → likely Cloudflare, pending Tauriel + Idril). **Send Celebrían the real first bills** (sponsorship cap $1,500/yr).
- [ ] Church organizations, Phase 0 → 4 (`docs/ORGANIZATIONS_PLAN.md`), incl. Phase 0.5 performance fixes for ~400 users.
- [ ] Split admin into org-admin vs platform owner (must happen before any church joins).
- [ ] Rhinity rename in the app (icons, names, titles, user-facing strings, emails).
- [ ] Finish the App.jsx split (Messages + PrivateGroups).
- [ ] Finish Web Push backend (push_subscriptions table, function secrets, combined notify function).
- [ ] Put edge functions (`generate`, `forge-autopilot`) into the repo.
- [ ] Fix latent `messages` policy (checks `group_ids` but not `group_id`).
- [ ] Add tests / CI / an error boundary.
- [ ] Review uncommitted local files (Rhinity master plan, PCO integration doc, assets).

## Other elves own
- esix10.com WordPress retirement + plugin vulnerabilities → Tauriel (security) / Cora (task list).
