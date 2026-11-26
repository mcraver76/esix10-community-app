# One premium approach for both ESix10 Initiative apps (Lúthien + Idril, 2026-11-26)

For Kora. Michael's goal (7:24): "hyper premium, like Facebook, Instagram or LinkedIn… not something someone built in their garage." Those apps are the quality bar only; we copy none of their branding. Rule (7:28): all of it gets built and shown on **local test servers with fake data**. Nothing goes live without his yes.

**What the two audits found, the same in both apps** (checked by reading the code; the databases are paused):
- Styling is typed by hand. Alliance has 1,607 inline styles, 19 font sizes and 18 corner sizes. Community has about 11 greys, 5+ oranges and ~16 font sizes.
- The iPhone app is the live website in a frame, which Apple may reject.
- No loading skeletons, no screen transitions, and grey browser pop-ups.
- No in-app Delete account or Block user (Apple requires both).
- No crash catcher.

Source reports:
- `esix10-community-app/docs/BASELINE_AUDIT_2026-11-26.md` §C
- `six10-alliance/docs/baseline-audit-2026-11-26/PREMIUM_FINDINGS.md`

## The 12 shared foundations, built once and used by both
1. **Design tokens:** one file per brand with the same names (colors, spacing, corners, shadows, type sizes, motion speeds). Alliance = Electric Gold; Community = its orange. Screens never type a color by hand.
2. **Component kit:** Button, IconButton (44pt), Card, ListRow, Input, Sheet, Header, TabBar, Avatar, Badge, Toast, ConfirmSheet.
3. **State pieces on every list:** Skeleton, EmptyState, ErrorState (with Retry), OfflineBanner.
4. **One icon set** (line icons) in place of emoji icons. The Alliance has 232.
5. **A crash catcher on every screen**, so one broken screen never blanks the whole app.
6. **Motion rules:** 150 ms taps plus a light haptic, 250 ms slide for screens and sheets, and respect for the phone's "reduce motion" setting.
7. **One navigation pattern:** screen stack, slide transitions, tabs that remember where you were, and the same Back on iPhone and Android.
8. **One data layer:** cached lists that show instantly and refresh quietly, instant updates (send and react show right away), and paged "load more".
9. **One image pipeline:** shrink before upload, thumbnails, lazy loading, blur placeholders.
10. **Real phone apps:** the app code is shipped *inside* the app with a controlled update channel and offline start, and the same native extras (push, haptics, share, status bar, splash, back button, deep links).
11. **App Store kit:** Delete account, Block + Report with reasons, permission text plus a friendly "why we ask" screen, privacy manifest.
12. **Quality gates:** automatic checks that block new hand-typed colors, cap the app size and run an accessibility scan, plus phone screenshots as proof before "done".

## Order
1. **Security fixes first.** Both audits found member-privacy holes (Community has 3 Critical). These go in as tested fixes before Dec 1, with Tauriel's pass.
2. **Then 1–6** (the look): tokens, kit, icons, states, crash catcher, motion. These are shown to Michael on the local test servers for his likes and changes.
3. **Then 7–9** (feel and speed), then **10–11** (real phone apps + App Store), then **12**.

## Needs Michael (one item, through Kora)
- **Item 10 changes how the iPhone apps work.** The app code would live inside the app, with updates through a controlled channel, instead of loading the live website. This is how RhinoScore's app already works, and it's the main fix for Apple's "just a website" risk. **Recommendation: yes.**
- Everything else serves the premium goal he already set, so the elves just do it. Each look gets his likes and changes on the test server before anything goes live.
