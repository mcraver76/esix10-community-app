# Anonymous invites for hidden groups: design (for Tauriel, before build)

**Michael:**
- 9:20: "a way for a moderator to invite someone but allow them to stay anonymous… a dummy email account… without publishing their actual information."
- 9:22: **YES, build it on TEST** with Tauriel's 4 must-haves.

Lúthien, 2026-11-26. Nothing goes live without Michael's yes.

## Who it's for
Someone who needs a sensitive circle (e.g. survivors of domestic violence) but can't risk being identified, even to other members. They are vouched for by the moderator who invites them.

## Flow
1. **Moderator issues a personal invite.** In a hidden group, the creator/moderator presses "Invite someone privately".
   - Server makes a **single-use code**: 128-bit random, stored only as a hash, expires in **72 h**, revocable, logged with the issuing moderator.
   - Rate limit: max 5 open invites per moderator, 10/day.
   - Shown once, as a link to pass on privately.
2. **The person opens the link** and sees "Join privately":
   - **No real name, photo, phone, city or marital status asked.** They pick a **group alias** (display name) and confirm 18+ (server-side check stays).
   - **Login:** an email they choose. A throwaway alias is fine, nothing checks it's "real", and it is never shown. Email confirmation stays on, so the address must work once.
   - Supabase's no-email "anonymous sign-in" is **not used**: it's off in config (`enable_anonymous_sign_ins = false`), and a lost session = a lost account.
   - **Recovery code shown once** at sign-up ("save this; it's the only way back in if you lose your email"). Stored hashed. **Never "recover through a moderator."**
3. **Redemption ≠ access.** It creates a pending request; the **creator or a second moderator approves** (keeps the 11-26 rule: nobody joins without approval).
4. **A limited account.** The account is approved **only for the groups it was invited into**:
   - not in Brotherhood/Sisterhood/Family feeds;
   - not in the Members directory;
   - no DMs except with members of the same hidden group;
   - no profile page beyond the alias.
5. **History from join date.** New members see messages only from when they joined (all hidden groups, not just anonymous members, so a newcomer can't scroll back through everyone's past).

## Must-haves (Tauriel 09:40), and how each is met
| Must-have | Design |
|---|---|
| Members never see the real `user_id` | Per-group alias table `group_aliases(group_id, user_id, alias_id uuid, alias_name)`, a different alias in each group. Inside hidden groups the app reads a view `hidden_messages` that returns `alias_id` + `alias_name`, never `user_id`. Realtime for hidden rooms goes through a **broadcast channel carrying alias ids** (not raw `postgres_changes`, which would include `user_id`). Reactions, read receipts and typing use alias ids. **File names:** uploads in hidden rooms use `<room>/<alias_id>_<random>` (today they start with the uid). The storage rule checks alias ownership through a definer function. |
| Single-use, 72 h, revocable, logged invites | `group_invites(id, group_id, code_hash, created_by, created_at, expires_at, revoked_at, used_by, used_at)`; redeem RPC checks all; revoke RPC for the issuer/admin; per-moderator limits in the RPC. |
| History only from join date | The `is_room_member` check for hidden rooms also compares `messages.created_at >= joined_at` (stored on `private_group_members`). |
| Recovery code or passkey | One-time recovery code (hashed), plus a reset flow that needs the code. Passkeys: later, if Supabase's passkey sign-in fits; unverified for primary login. |
| Only a platform admin can link alias ↔ account | `reveal_alias(group, alias)` = security definer, admin-only, writes to an audit table (who, when, why), and notifies Tauriel's log. |

## Risks + recommendation (for Tauriel to confirm)
- **An abuser posing as a survivor.** Mitigation:
  - personal single-use invites + vouching moderator + second approval;
  - history-from-join;
  - the creator can remove someone instantly;
  - aliases mean a newcomer can't map members to real people.
  - Residual risk stays: the moderator must actually know the person. Say so in the moderator's invite screen.
- **Ban evasion** (a removed person makes a new throwaway): every new entry needs a fresh personal invite + approval; the invite log shows which moderator vouched; an admin can see repeat patterns through the break-glass log.
- **A lost throwaway email:** the recovery code; if that's lost too, the account is gone. The moderator can invite them again as a new member, losing the alias history. That's accepted by design: no moderator-recovery backdoor.
- **Legal:** 18+ is self-attested; minimal data held; law-enforcement requests can only get what the platform owner holds. → Vairë attorney list (with A11).
- **Email visibility:** email stays hidden from everyone but the platform owner (`profiles.email` grant already revoked; `staff_emails()` → admin-only, on the Highs list). Never in notifications (11-26 notification rules).

## Tauriel review (11-26 09:50): GO for build steps 1–2 on test. Add these BEFORE step 3 (each would quietly un-anonymize people)
1. **Base table lock:** members can't SELECT hidden-room rows from `messages` directly. Hidden rooms are readable only through `hidden_messages` (security_barrier); posting goes through an RPC that stamps the alias.
2. **Rosters:** in hidden groups, `private_group_members` / `room_members` / `can_see_group_members` give members only alias_id + alias_name, never user_id.
3. **Requests:** for anonymous invites, the creator's request list shows the alias + "invited by <moderator>" only, not user_id.
4. **DM room ids:** alias DMs use opaque random room ids. Today's `dm_<uid>_<uid>` reveals both accounts.
5. **Realtime:** PRIVATE channels with Realtime Authorization (an RLS policy on `realtime.messages` using the hidden-room rule), plus a test that an outsider gets nothing. A plain broadcast channel can be joined by anyone who knows its name.
6. **Recovery-code reset** (step 4) is the most attack-prone part:
   - an edge function with a constant-time hash compare;
   - single use, with a new code issued after use;
   - rate limits per account + per IP;
   - generic errors (don't reveal whether an email exists);
   - a notice to the account email.
   **Separate review with Tauriel before it's built.**
7. **Limited accounts:** no username/full name required or shown anywhere. Sign-up currently writes username from metadata, so fix `handle_new_user` for anonymous sign-ups.

Each step gets a test as `authenticator` + Tauriel's PASS.

## Build order (test only)
1. Invites + redeem + approval + limited-account rules.
2. History-from-join.
3. Alias table + `hidden_messages` view + alias broadcast realtime + alias file names.
4. Recovery code.
5. Break-glass reveal + audit.

Every step gets a test in `supabase/tests/` and a browser check as fake members, then Tauriel's PASS.
