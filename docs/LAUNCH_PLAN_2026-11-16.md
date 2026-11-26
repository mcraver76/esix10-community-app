# ESix10 Initiative apps: launch plan (Lúthien, 2026-11-16, for Cora)

> **UPDATED 2026-11-26 (Michael 7:28 / 7:33 / 7:34):** the dates below are SUPERSEDED. Dec 1 is the account and ownership move to ESix10 Initiative ONLY. The apps stay paused: no go-live, no real members, nothing public until Michael says a design is locked in and Tauriel has passed the hardening checklist (`docs/HARDENING_STATUS.md`). All work happens on the local test server (`LOCAL_TEST_SERVER.md`). Order: security hardening, then premium design. v1 is adults only (18+).

The D-U-N-S came in 11-16. Michael wants the community app public "sooner than later". Idril's chat isn't open, so the Alliance app lines below come from her PLAN.md (~/Downloads/six10-alliance/PLAN.md). She should confirm them when her chat is back.

## 1. Apple, now that we have the D-U-N-S
| # | Step | Who |
|---|---|---|
| 1 | Open D&B's email and check that the record reads exactly **ESix10 Initiative Inc.** with the PMB address (1870 The Exchange SE Ste 220 PMB 858736). Apple rejects a mismatch. Vairë noted on 11-12 that it may show his home address. If so, fix it in D&B first. | **Michael** (Vairë guides) |
| 2 | Tauriel picks the Apple Account to enroll with. My recommendation: michael@esix10.com, with 2-step on. Michael is the only owner. No elf joins. | Tauriel's call, **Michael's sign-in** |
| 3 | Ask Apple for the **nonprofit fee waiver** *before* paying. Apple needs the D-U-N-S, the IRS 501(c)(3) letter (already in documents/esix10-initiative/), and proof that Michael can act for the org. He is the only active director (11-12). If Apple says no, the $99/yr goes on the Six10 Digital card as part of the sponsorship. | **Michael** submits; Lúthien drafts the answers |
| 4 | Apple approves the enrollment and the waiver. *Apple's timing is unverified; it's often 1–2 weeks.* | wait |
| 5 | Lúthien and Idril set up the new app IDs (bundle IDs), the App Store Connect app records and the push keys. Tauriel checks. | elves; Michael pastes any keys |

## 2. What's left before the community app can go public
Its database is paused in the Six10 Digital org. Nobody is using the app, so it starts fresh.
1. **Fresh database** in the ESix10 Initiative Supabase org (Pro, on the Six10 Digital card), then the migrations, then **Tauriel's security pass**: the anon-leak check plus a fix for the old `messages` rule gap I noted in TASKS. *Michael: one approval for the Pro card charge.*
2. **Hosting** on the nonprofit's Cloudflare. The email code is already ported (branch ready, 6/6 tests pass). Then the community.esix10.com address switch (written into the run sheet 11-11). *Michael: DNS clicks, plus the §D test run of the switch that's still open.*
3. **Email** (Resend): one sending key limited to esix10.com. *Michael pastes it.*
4. **Must-build for Apple:** **in-app "Delete my account"**. Apple requires it, and the app doesn't have it today; the terms only mention it. The build is mine.
5. **Legal text:** the Terms and Privacy pages are draft templates. They need to name ESix10 Initiative Inc., and the Privacy page has to say Cloudflare instead of Vercel. Vairë checks the wording; the attorney reviews it later. Apple also requires a privacy-policy link.
6. **Store listing:** screenshots, description, support link, privacy "nutrition label", and a reviewer demo login (kept in Michael's password manager).
7. **Name at launch:** "ESix10 Community" or the Rhinity rename. *This is Michael's call; it's been open since before 11-05.* My recommendation: launch as ESix10 Community and rename later, so the rename doesn't hold up the date.
8. Not needed for the public launch: church organizations, the org-admin split (that's needed before a church joins), and web push.

## 3. Earliest honest public date
- **Website app (community.esix10.com): about Dec 3.** That's after the Dec 1 sitting plus Tauriel's pass. It moves earlier only if we hold a community-only sitting the week of **Nov 23**, which needs Vairë's answer below.
- **iPhone: mid-December at the earliest.** That's unverified and depends on how fast Apple handles the enrollment, the waiver and App Review. Late December or January is realistic. Saying "the web app now, the iPhone app soon" is honest.
- **Alliance app (Idril):** same path. The fresh database and security checks are at the Dec 1 sitting; then a new iPhone build under the new org; an optional pentest; and "Manually release" on launch day.

## 4. The partnership post (asked of Vairë 11-16 7:40, waiting)
Draft wording: "Six10 Digital is proud to support ESix10 Initiative, a Georgia 501(c)(3), with technology for its community apps." It doesn't mention an ownership transfer, any dollar amounts, or a legal "partnership". Vairë decides what's safe to say before the attorney visit. It's public content, so it needs Michael's yes on the final post.

## 5. Vairë's answers (7:35, drafting guidance, not legal advice)
- The post line is OK. Varda is the ONE owner of it. Leave out: owns, sponsors, board names, dollar amounts, donation asks, dates, the EIN and the mailbox address. The post was PARKED by Michael 11-16.
- The attorney hold covers SIGNING only. Moving the accounts and data is OK, and the Apple enrollment is OK now (it's Michael's click, as director). Launching under the nonprofit's name before signing is Michael's call. Vairë's safer wording until then: "ESix10 community app, built by Six10 Digital for ESix10 Initiative."
- That means a community-only sitting the week of Nov 23 is legally fine. Scheduling it is Cora's call.
- Live check 8:05 (curl): community.esix10.com, esix10.com and www.six10alliance.org load, BUT both app databases are paused, so sign-in fails. **Neither app is live for users.** The iPhone apps are NOT live.

## (original question to Vairë)
Does "hold for attorney review" cover only signing the app assignment, or also moving the accounts and data and launching under the nonprofit's name? Can the Apple enrollment go ahead now?
