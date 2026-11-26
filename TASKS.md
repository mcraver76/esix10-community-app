# ESix10 / Rhinity — tasks (Lúthien)

## Waiting on Michael
- [ ] Pick priority: church org layer (Jan 2027) vs Rhinity rename.
- [ ] Rhinity: plain rename or "Rhinity — an ESix10 Initiative" lockup?
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel (branded signup emails return 503 without it) — his click.
- [ ] Lawyer review of legal text (`src/legalContent.js` is a draft template).

## Open
- [ ] ℹ️ (Michael 11-26 8:59) The app is FREE, a charitable program of ESix10 Initiative. Focus: disaster response + combating child trafficking, with a veterans tie-in (Nienna drafting the program plan). The media "Premium only" option is hidden and off (media.jsx SHOW_PREMIUM=false) unless he decides otherwise.
- [ ] ❓ Michael's call (asked 11-26): hidden/unlisted sensitive private groups (Tauriel recommends yes).
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
