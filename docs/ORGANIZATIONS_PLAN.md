# Organizations (church hubs) — build plan

_Design agreed 18 Aug 2026. Target: Michael's church initiative launches **January 2027**._
_Status: **planning only — nothing built yet.**_
_Scale: 1,000+ weekly attendance; **~400 expected app users** in month one, **10–20 life groups**._

---

## What we're building

A church gets its **own hub inside the app** — its own feed, prayer, events, life groups and
discipleship content, walled off from every other organization at the database level. Members
sign in once with one profile, land in their church by default, and can **opt in** to the public
ESix10 community.

Not separate databases. One database where every piece of content carries an `org_id`, and
row-level security enforces the boundary — the same mechanism that now protects private groups.
**`org_id IS NULL` means the public ESix10 community**, so everything that exists today becomes
"the public side" with no data migration.

Michael's church is **comped** (free), but the whole thing is built as a normal multi-tenant
SaaS so a second church is a row in a table, not a code change.

---

## The decisions already made

| Decision | Answer |
|---|---|
| Separate DB per church? | **No** — one DB, `org_id` scoping + RLS |
| Public community for church members | **Opt-in.** Their church is the default context |
| Joining the church org | **Open** — anyone who says they attend |
| Joining a life group | **Invite code, or request-and-approve** |
| Discipleship content | **Multi-week study series** (sessions in order), not just a daily post |
| The Forge | **Not for the church** — per-org feature switch, not a code fork |
| Groups model | **Not** Brotherhood/Sisterhood/Family. Church defines its own life groups |

### ⚠️ The trust ladder (deliberate, not accidental)
Because the org is **self-attested open**, church-wide content is effectively **semi-public** —
anyone who clicks "I attend" can read it. Life groups are gated (code or approval), so that is
where sensitive conversation belongs. Say this plainly in the church-wide prayer UI so people
choose the right place to post.

---

## The real work: the fixed three groups

Brotherhood / Sisterhood / Family are **hardcoded**: the `GROUPS` constant is used in 9 files,
there are **179 references** to a member's `group_id`/`group_ids` across 11 files, and 12 places
build a chat room id from a group name. The app assumes every member has exactly one primary
group from a fixed list of three. A church can't use that.

**But life groups already exist.** Community Groups (`private_groups`) already support an
arbitrary name and description, open / by-request / invite-only joining, member roles (creator,
moderator), their own chat, photos, and a request-and-approve flow. That *is* a life group.

So the job is not "build life groups" — it is **stop hardcoding the other three.**

This is Architecture Law #8 applied: *gate on function, never on a label.* "Brotherhood" is a
label; the function is "a compartment that scopes your feed, chat and directory." Groups become
**data owned by each organization** — ESix10 keeps its three (seeded), the church defines its own.
Same doctrine as RhinoScore's multi-industry plan: **one engine, config profiles per org.**

**Conflict to resolve:** the 15-member cap on private groups is intentional for ESix10, but is a
hardcoded `15` (`App.jsx`, `cap = activeGroup?.join_policy === 'private' ? 15 : null`). A church's
"Parents of Toddlers" could be 40. It becomes a **per-organization setting** — ESix10 keeps 15
because Michael chose it; it just stops being everyone's rule.

---

## Phases

Order matters — each phase depends on the one before.

### Phase 0 — The organization layer (the core build)
- `organizations` — name, slug, branding (logo/colour), settings JSON (feature switches, group cap),
  billing status incl. **comped**.
- `organization_members` — user × org × role (`member` / `leader` / `org_admin`).
- `org_id` (nullable) added to every content table; `NULL` = public community.
- RLS: you read an org's content only if you are a member of that org.
- **Org-scoped admin.** Today `admin` is global and (per the 18 Aug decision) can read every
  conversation. That must split into **org admin** (church leaders, their org only) vs
  **platform owner** (Michael). Non-negotiable: a congregation's private conversations must not
  be readable by people outside the church. Much easier now than retrofitted.
- Scope switcher UI + a "current organization" context the whole app reads from.

### Phase 0.5 — Make it hold 400 people
The church has **1,000+ weekly attendance; expect ~400 app users in month one and
10–20 life groups.** The app has run at roughly a dozen members until now, so a few
things need attention before January. Measured, not assumed:

- **`profile_stats` is a live VIEW** — 98 lines, 16 sub-queries, scanning posts, prayers,
  kudos, walks, challenge completions and WOD completions — recomputed **on every read**,
  and the Profile screen reads it (leaderboard included). Convert to a **stored table
  updated on write**. The urgency is not the 400 rows; it is that the view's cost also
  grows with accumulated *content*, so it gets slower every month.
- **Nothing paginates.** The member directory selects every approved+pending profile with
  no limit, and there are **zero `.range()` calls in the codebase**. 400 profiles plus 400
  avatars in one request, on a core tab. Add paging + search.
- **Email fan-out.** 400 recipients per announcement needs batching and a paid Resend plan.
  Also unblocks the still-unset `SUPABASE_SERVICE_ROLE_KEY`, which currently leaves branded
  signup emails off — and January is a signup spike.
- **Write the org RLS policies with helpers wrapped as `(select fn())`** so Postgres
  init-plans them once rather than per row. Free to do now; miserable to retrofit on a live
  400-person org. (Lesson carried from RhinoScore.)

**Deliberately NOT doing:** group browse/filter (10–20 groups is a list), a push queue (400
sends is survivable), feed pagination beyond the current 50 (add "load more" when they
outgrow it).

**Scale note on the trust ladder:** with hundreds of self-attested members, church-wide
prayer is effectively a public bulletin board. The open-join decision is still right, but it
makes the trust ladder load-bearing — sensitive things belong in gated life groups, and the
church-wide prayer box should say so in plain words.

### Phase 1 — Groups become data
- Org-owned groups table; seed ESix10's three so nothing changes for existing members.
- Unpick the 179 hardcoded references; a member's primary group becomes optional and org-defined.
- Per-org member cap setting.
- Life groups = Community Groups scoped to an org, with **invite code** added alongside the
  existing request-and-approve.

### Phase 2 — Scope the surfaces that already exist
Feed, prayer, events, member directory, messages → all org-scoped. Per-org feature switches
(Forge hidden for the church). This is where most of the 179-reference tax gets paid.

### Phase 3 — Study series (the one genuinely new feature)
`study_series` → ordered `study_sessions` (title, scripture, body, optional video, discussion
questions). Assignable to the whole org or to one life group. Per-session discussion thread.
Optional: per-member progress. Reuses the existing media/attachment plumbing.

### Phase 4 — The SaaS shell
Org creation/onboarding, org settings + branding screens, comped flag. **Billing is deliberately
deferred** — build it when church #2 asks, not for a free customer.

---

## Timeline & risk

~4.5 months to January. Phases 0–2 are the bulk; Phase 3 is self-contained and can run late.
Phase 0.5 is four contained fixes, one of which (RLS phrasing) is free if done from the start.

**What makes this feasible now** (and would not have been three weeks ago): the database has real
migrations, so schema changes are safe and reversible; and `App.jsx` went from one 6,600-line file
to twelve feature modules, so "scope the feed to an org" is a change to `feed.jsx`, not archaeology.

**Risks**
1. **ESix10 is live with real members.** `org_id IS NULL = public` protects existing data, but the
   RLS changes are the dangerous part. Every phase ships behind the normal branch → PR → verify
   flow, and RLS changes get tested against a seeded **test church org first** — never against
   Michael's real church until proven.
2. **The 179 references** are the schedule risk, not the org model itself.
3. **Scope creep.** Model it properly as multi-tenant so church #2 is easy, but only build the
   surfaces this church needs by January. Do not build a general-purpose church platform.

---

## Open questions

- Does a church member need a **primary life group** at signup (like ESix10's group-select), or do
  they join groups later from a directory? (Affects onboarding.)
- Should study series be **visible to the public community**, or org-only always?
- Does the church want its **own devotions**, or is the shared 366-day library fine?
