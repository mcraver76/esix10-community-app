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

## Baseline (Michael 11-26 8:00): "The aesthetics of the Alliance app look way better than the community app."
The Alliance's current look is the STARTING point for the shared foundations. The community app gets brought up to it first, then both go above it toward "hyper premium". Brand colors and logos stay separate per app; the community app's new name and logo are with Varda. **What makes the Alliance look better (Idril 11-26 8:15).** Source: `six10-alliance/src/App.jsx` 14–33 (color tokens), ~112–135 (styles), `src/index.css` 1–8. We copy the structure and swap in the community app's brand values.

1. **Palette:**
   - Near-black, slightly cool layers: bg #08080A, surface #111114, surface2 #18181C, border #26262C.
   - Warm off-white text #F4F1EA; cool-gray muted #9FB0C2 (faint = muted at 70%).
   - ONE accent, used only for primary buttons, links, active states and highlights, with dark text on it. Community = its orange in place of Alliance gold.
   - Red is not brand: danger #FF4D5E for errors and destructive actions only; success #10B981.
2. **Depth:**
   - Cards: 145° gradient surface2→surface, a hairline border at 7% white, radius 14.
   - Featured card: a 30%-accent border plus a soft accent shadow.
   - Glow only on the main button and the logo.
   - Dividers: a line that fades out at both ends.
3. **Type:**
   - Inter 400–900 for everything. h1 28/800/−0.02em; h2 20/700/−0.01em.
   - A wide display font only for short all-caps kickers.
   - Labels: 13px/600, uppercase, +0.06em, muted.
   - Body 15px; inputs 16px; antialiased.
4. **Controls:**
   - Corner radius: 9 on buttons and inputs, 14 on cards, 20 on pills.
   - Primary button: accent fill, 700 weight, padding 11/22.
   - Ghost button: transparent with a 15% white border.
   - Danger button: 12% red tint with red text.
   - Inputs: 5% white fill with a 10% white border.
5. **Restraint:** lots of dark space, the accent used sparingly.

**Neither app has these yet (shared-kit upgrades):** a spacing scale, motion, skeletons, a real icon set, a component kit.

**Community app, first step after hardening:** replace its ~11 greys, 5+ oranges and 3 backgrounds with this token set (orange accent), switch to Inter + the type scale, and restyle the cards, buttons and inputs to the Alliance rules. Show it on the local test server for Michael's likes and changes.

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
