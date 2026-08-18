// Member directory, member cards and the profile modal.
import React, { useState, useEffect } from "react";
import { Archive, Flag, MapPin, MessageCircle } from "lucide-react";
import { S } from "./styles";
import { GROUPS, PROFILE_COLS } from "./constants";
import { supabase } from "./supabaseClient";
import { formatName } from "./helpers";
import { displayName } from "./stats";
import { Avatar } from "./icons";
import { TabCarousel } from "./ui";
import { Badges, ProfileLevelSummary } from "./profile";
import { isStaff, requireApproved, fetchStaffEmails } from "./permissions";
import { sendMemberEmail } from "./notify";

export const MEMBER_SLIDES = [
  { eyebrow: "The Movement", title: "One family. Three houses. One foundation.", sub: "Brotherhood · Sisterhood · Family" },
  { eyebrow: "Welcome", title: "New here? You belong.", sub: "Say hello in the Feed." },
  { eyebrow: "Connect", title: "Tap any member to see their story.", sub: "Reach out. Build something real." },
  { eyebrow: "Foundation", title: "We don't all look the same. We stand on the same Rock.", sub: "Ephesians 6:10" },
  { eyebrow: "Respect", title: "Real people. Real respect.", sub: "Treat everyone like family." },
  { eyebrow: "Grow", title: "Who needs this community?", sub: "Bring them in." },
];

export function MemberProfileModal({ m, me, onClose, onMessage }) {
  const groups = (m.group_ids && m.group_ids.length ? m.group_ids : [m.group_id]).map(id => GROUPS.find(g => g.id === id)?.label).filter(Boolean);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#161b24", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, maxWidth: 420, width: "100%", maxHeight: "86vh", overflowY: "auto", padding: 24, position: "relative" }}>
        <button onClick={onClose} aria-label="Close" style={{ position: "absolute", top: 12, right: 14, background: "none", border: "none", color: "#9aa4b2", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>✕</button>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <Avatar profile={m} size={92} />
          <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginTop: 12 }}>{m.username ? `@${m.username}` : formatName(m.full_name)}</div>
          <div style={{ fontSize: 14, color: "#9aa4b2", marginTop: 2 }}>{formatName(m.full_name)}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginTop: 12 }}>
            {groups.map(g => <span key={g} style={{ ...S.badge, fontSize: 10 }}>{g}</span>)}
            {m.role === "admin" && <span style={{ ...S.badge, background: "rgba(255,102,0,0.3)", color: "#FF7E33", fontSize: 10 }}>Admin</span>}
            {m.role === "moderator" && <span style={{ ...S.badge, background: "rgba(192,154,47,0.25)", color: "#C09A2F", fontSize: 10 }}>Mod</span>}
          </div>
          {GROUPS.find(g => g.id === m.group_id)?.subtitle && <p style={{ color: "#FF7E33", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, marginTop: 10 }}>{GROUPS.find(g => g.id === m.group_id).subtitle}</p>}
        </div>
        {onMessage && m.id !== me.id && (
          <button onClick={() => { onClose(); onMessage(m); }} style={{ width: "100%", marginTop: 18, background: "#FF6600", border: "none", borderRadius: 10, color: "#fff", fontSize: 15, fontWeight: 600, padding: "13px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <MessageCircle size={18} /> Message {m.username ? `@${m.username}` : formatName(m.full_name).split(" ")[0]}
          </button>
        )}
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
          {(m.city || m.state) && <div style={{ color: "#c8cdd6" }}><MapPin size={13} color="#FF7E33" style={{ verticalAlign: "-2px", marginRight: 6 }} />{[m.city, m.state].filter(Boolean).join(", ")}</div>}
          {m.marital_status && <div style={{ color: "#c8cdd6" }}><span style={{ color: "#9aa4b2" }}>Status:</span> {m.marital_status}</div>}
          {isStaff(me) && m.email && <div style={{ color: "#9aa4b2", fontSize: 13 }}>{m.email}</div>}
        </div>
        {m.bio && <p style={{ marginTop: 14, color: "#c8cdd6", fontSize: 14, lineHeight: 1.6, fontStyle: "italic" }}>"{m.bio}"</p>}
        <div style={{ marginTop: 16 }}><Badges userId={m.id} /></div>
        <ProfileLevelSummary profile={m} />
      </div>
    </div>
  );
}

export function Members({ profile, onNavigate }) {
  const [members, setMembers] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [viewMember, setViewMember] = useState(null);
  const [filter, setFilter] = useState(profile.role === "admin" ? "all" : profile.group_id);
  const [stateFilter, setStateFilter] = useState("");

  useEffect(() => { loadMembers(); }, []);

  async function loadMembers() {
    let q = supabase.from("profiles").select(PROFILE_COLS).in("status", ["approved", "pending"]).order("state", { ascending: true });
    if (profile.role !== "admin") {
      q = q.eq("status", "approved");
      // Members who share ANY of my groups (multi-group aware), not just my primary.
      if (profile.group_ids?.length) q = q.overlaps("group_ids", profile.group_ids);
      else q = q.eq("group_id", profile.group_id);
    }
    const { data } = await q;
    let rows = data || [];
    if (isStaff(profile)) { const em = await fetchStaffEmails(); rows = rows.map(m => ({ ...m, email: em[m.id] })); }
    setMembers(rows);
  }

  async function flagMember(m) {
    if (!requireApproved(profile)) return;
    if (m.id === profile.id) return;
    const reason = window.prompt(`Report ${formatName(m.full_name)} to the admins. What's the issue? (optional)`);
    if (reason === null) return;
    await supabase.from("member_flags").insert({ flagged_user_id: m.id, flagged_by: profile.id, reason: reason || "No reason provided" });
    alert("Member reported. An admin will review it shortly. Thank you.");
  }

  async function sendKudosMember(toUserId) {
    if (!requireApproved(profile)) return;
    if (toUserId === profile.id) return; // no self-kudos
    const { error } = await supabase.from("kudos").insert({ from_user_id: profile.id, to_user_id: toUserId });
    if (error) return; // don't show a false "Sent!"
    const btn = document.getElementById(`kudos_${toUserId}`);
    if (btn) { btn.textContent = "👊 Sent!"; setTimeout(() => { btn.textContent = "👊 Kudos"; }, 2000); }
  }

  // Open a direct message with this member and jump straight to the Chat tab.
  // The Chat tab restores its active room from localStorage on open, so we set
  // the DM room here, then navigate.
  function messageMember(m) {
    if (!requireApproved(profile)) return;
    if (m.id === profile.id) return;
    const roomId = `dm_${[profile.id, m.id].sort().join("_")}`;
    localStorage.setItem(`esix10_room_${profile.id}`, roomId);
    // One-time signal so the Chat tab opens straight into the conversation
    // (on mobile it otherwise lands on the room list).
    localStorage.setItem(`esix10_open_room_${profile.id}`, "1");
    // Mark the DM as read so it doesn't show as unread when we open it.
    const lastRead = JSON.parse(localStorage.getItem(`esix10_lastread_${profile.id}`) || "{}");
    lastRead[roomId] = new Date().toISOString();
    localStorage.setItem(`esix10_lastread_${profile.id}`, JSON.stringify(lastRead));
    if (onNavigate) onNavigate("messages");
  }

  async function removeMember(id) {
    if (!window.confirm("Remove this member? They will be moved to the removed list.")) return;
    await supabase.from("profiles").update({ status: "removed", updated_at: new Date().toISOString() }).eq("id", id);
    loadMembers();
    loadRemoved();
  }

  async function approveAvatar(m) {
    await supabase.from("profiles").update({ avatar_url: m.avatar_pending, avatar_pending: null }).eq("id", m.id);
    loadMembers();
  }

  async function rejectAvatar(m) {
    if (!window.confirm("Reject this profile photo? The member keeps their current icon.")) return;
    await supabase.from("profiles").update({ avatar_pending: null }).eq("id", m.id);
    loadMembers();
  }

  async function restoreMember(id) {
    await supabase.from("profiles").update({ status: "approved", updated_at: new Date().toISOString() }).eq("id", id);
    loadMembers();
    loadRemoved();
  }

  async function permanentlyDelete(id) {
    if (!window.confirm("Permanently delete this member? This cannot be undone.")) return;
    await supabase.from("profiles").delete().eq("id", id);
    loadRemoved();
  }

  async function updateRole(id, role) {
    if (profile.role !== "admin") return; // only admins change roles (mods can't)
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (error) { alert(`Couldn't update role: ${error.message}`); return; }
    loadMembers();
  }

  async function adminChangeUsername(m) {
    const u = window.prompt(`Set username for ${formatName(m.full_name)}:`, m.username || "");
    if (u === null) return;
    const clean = u.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!clean) { alert("Username can't be empty."); return; }
    const { data: taken } = await supabase.from("profiles").select("id").ilike("username", clean).neq("id", m.id).maybeSingle();
    if (taken) { alert(`"${clean}" is already taken by another member. Pick a different one.`); return; }
    await supabase.from("profiles").update({ username: clean }).eq("id", m.id);
    loadMembers();
  }

  async function adminChangeGroup(m) {
    const opts = GROUPS.map((g, i) => `${i + 1} = ${g.label}`).join("   ");
    const pick = window.prompt(`Move ${formatName(m.full_name)} to which group?\n${opts}\n(current: ${GROUPS.find(g => g.id === m.group_id)?.label || m.group_id})`, "");
    if (!pick) return;
    const g = GROUPS[parseInt(pick.trim()) - 1];
    if (!g) { alert("Enter 1, 2, or 3."); return; }
    await supabase.from("profiles").update({ group_id: g.id, group_ids: [g.id], requested_group_id: null, requested_group_at: null }).eq("id", m.id);
    loadMembers();
  }

  async function adminResetPassword(m) {
    if (!m.email) { alert("This member has no email on file."); return; }
    if (!window.confirm(`Send a password reset email to ${m.email}?\nThey'll get a link to set a new password themselves.`)) return;
    const { error } = await supabase.auth.resetPasswordForEmail(m.email, { redirectTo: window.location.origin });
    alert(error ? ("Could not send: " + error.message) : `Password reset email sent to ${m.email}.`);
  }

  async function approve(id) {
    const { error } = await supabase.from("profiles").update({ status: "approved" }).eq("id", id);
    if (error) { alert(`Couldn't approve this member: ${error.message}`); return; }
    const m = members.find(x => x.id === id);
    if (m?.email) {
      sendMemberEmail({ to: m.email, name: m.full_name, type: "approval" });
    }
    loadMembers();
  }

  async function deny(id) {
    const { error } = await supabase.from("profiles").update({ status: "denied" }).eq("id", id);
    if (error) { alert(`Couldn't update this member: ${error.message}`); return; }
    loadMembers();
  }

  const [flags, setFlags] = useState([]);
  const [showFlags, setShowFlags] = useState(false);
  const [removed, setRemoved] = useState([]);
  const [showRemoved, setShowRemoved] = useState(false);

  useEffect(() => {
    if (profile.role === "admin") { loadFlags(); loadRemoved(); }
  }, []);

  async function loadRemoved() {
    const { data } = await supabase.from("profiles").select(PROFILE_COLS).in("status", ["denied", "removed"]).order("updated_at", { ascending: false });
    const em = await fetchStaffEmails();
    setRemoved((data || []).map(m => ({ ...m, email: em[m.id] })));
  }

  async function loadFlags() {
    const { data: flagData } = await supabase
      .from("post_flags")
      .select("*, posts(body, user_id, group_id)")
      .eq("reviewed", false)
      .order("created_at", { ascending: false });
    
    // Fetch flaggers separately
    const enrichedFlags = await Promise.all((flagData || []).map(async f => {
      const { data: flagger } = await supabase.from("profiles").select("username, full_name").eq("id", f.flagged_by).maybeSingle();
      return { ...f, profiles: flagger };
    }));
    setFlags(enrichedFlags);
  }

  async function dismissFlag(flagId) {
    await supabase.from("post_flags").update({ reviewed: true }).eq("id", flagId);
    loadFlags();
  }

  async function removeFlaggedPost(flagId, postId) {
    await supabase.from("posts").delete().eq("id", postId);
    await supabase.from("post_flags").update({ reviewed: true }).eq("id", flagId);
    loadFlags();
  }

  const pending = members.filter(m => m.status === "pending");

  let filtered = profile.role === "admin" && filter !== "all"
    ? members.filter(m => m.group_id === filter || (m.group_ids && m.group_ids.includes(filter)))
    : members;

  if (stateFilter) {
    filtered = filtered.filter(m => m.state?.toLowerCase().includes(stateFilter.toLowerCase()));
  }

  const approved = filtered.filter(m => m.status === "approved" || m.role === "admin");
  const states = [...new Set(members.map(m => m.state).filter(Boolean))].sort();
  const myGroup = GROUPS.find(g => g.id === profile.group_id);

  return (
    <div>
      <TabCarousel slides={MEMBER_SLIDES} />
      <div style={{ marginBottom: 8 }}>
        {(() => {
          const shownGroup = profile.role === "admin" ? (filter && filter !== "all" ? GROUPS.find(g => g.id === filter) : null) : myGroup;
          return (<>
            <h2 style={{ ...S.h2, margin: "0 0 2px 0" }}>
              {profile.role === "admin" ? (shownGroup ? `${shownGroup.label} (${filtered.length})` : `Members (${filtered.length})`) : `${myGroup?.label} (${filtered.length})`}
            </h2>
            <p style={{ color: "#FF7E33", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, margin: "0 0 12px 0" }}>{shownGroup?.subtitle || "Brotherhood. Sisterhood. Family."}</p>
          </>);
        })()}
        {profile.role === "admin" && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["all", ...GROUPS.map(g => g.id)].map(f => (
              <button key={f} style={{ ...S.tab(filter === f), padding: "8px 14px", fontSize: 11 }} onClick={() => setFilter(f)}>
                {f === "all" ? "All" : GROUPS.find(g => g.id === f)?.label}
              </button>
            ))}
            <button onClick={() => setShowFlags(!showFlags)} style={{ ...S.btnSm, background: flags.length > 0 ? "#ff4444" : "rgba(255,255,255,0.1)", color: "#fff" }}>
              <Flag size={13} style={{ verticalAlign: "-2px", marginRight: 3 }} /> {flags.length > 0 ? flags.length : ""} Flagged
            </button>
            <button onClick={() => setShowRemoved(!showRemoved)} style={{ ...S.btnSm, background: removed.length > 0 ? "rgba(136,136,136,0.3)" : "rgba(255,255,255,0.1)", color: "#fff" }}>
              <Archive size={13} style={{ verticalAlign: "-2px", marginRight: 3 }} /> {removed.length > 0 ? removed.length : ""} Removed
            </button>
          </div>
        )}
      </div>

      {/* FLAGGED POSTS */}
      {showFlags && profile.role === "admin" && (
        <div style={{ ...S.card, marginBottom: 16, borderTop: "3px solid #ff4444" }}>
          <span style={{ ...S.eyebrow, color: "#ff4444" }}>Flagged Posts</span>
          {flags.length === 0 && <p style={S.muted}>No flagged posts.</p>}
          {flags.map(f => (
            <div key={f.id} style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#BBBBBB", fontSize: 12, marginBottom: 4 }}>Flagged by {f.profiles?.username ? `@${f.profiles.username}` : formatName(f.profiles?.full_name)} · Reason: {f.reason}</div>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "8px 12px" }}>
                    <p style={{ color: "#FFFFFF", fontSize: 13 }}>{f.posts?.body}</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button style={{ ...S.btnSm, background: "#51cf66" }} onClick={() => dismissFlag(f.id)}>Dismiss</button>
                  <button style={S.btnDanger} onClick={() => removeFlaggedPost(f.id, f.post_id)}>Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* REMOVED / DENIED */}
      {showRemoved && profile.role === "admin" && (
        <div style={{ ...S.card, marginBottom: 16, borderTop: "3px solid #888" }}>
          <span style={{ ...S.eyebrow, color: "#BBBBBB" }}>Removed & Denied Members</span>
          {removed.length === 0 && <p style={S.muted}>No removed or denied members.</p>}
          {removed.map(m => (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ color: "#fff", fontSize: 14 }}>{m.full_name || m.email}</div>
                <div style={{ color: "#8A8A8A", fontSize: 12 }}>
                  {m.email} · {GROUPS.find(g => g.id === m.group_id)?.label || m.group_id} · 
                  <span style={{ color: m.status === "removed" ? "#ff4444" : "#888", marginLeft: 4 }}>{m.status}</span>
                  {m.updated_at && ` · ${new Date(m.updated_at).toLocaleDateString()}`}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ ...S.btnSm, background: "#51cf66" }} onClick={() => restoreMember(m.id)}>Restore</button>
                <button style={S.btnDanger} onClick={() => permanentlyDelete(m.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 16, marginBottom: 4, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <input
            style={{ ...S.input, padding: "10px 14px", fontSize: 13 }}
            placeholder="Filter by state..."
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value)}
          />
        </div>
        {states.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {states.map(s => (
              <button key={s} style={{ ...S.tab(stateFilter === s), padding: "6px 12px", fontSize: 11 }} onClick={() => setStateFilter(stateFilter === s ? "" : s)}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ marginTop: 20, display: "grid", gap: 8 }}>

        {/* PENDING APPROVALS — admin only */}
        {profile.role === "admin" && pending.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, color: "#fff" }}>Pending Approval</span>
              <span style={{ background: "#FF6600", color: "#fff", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>{pending.length}</span>
            </div>
            {pending.map(m => (
              <div key={m.id} style={{ ...S.card, padding: "16px 20px", marginBottom: 8, borderLeft: "3px solid #FF6600" }}>
                <div style={S.flexBetween}>
                  <div style={S.flex}>
                    <Avatar profile={m} size={48} />
                    <div>
                      <div style={{ color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: 15 }}>{formatName(m.full_name)}</div>
                      <div style={S.muted}>{profile.role === "admin" ? m.email : ""}</div>
                      {(m.city || m.state) && <div style={{ color: "#FF7E33", fontSize: 12, marginTop: 2 }}><MapPin size={11} style={{ verticalAlign: "-1px", marginRight: 2 }} /> {[m.city, m.state].filter(Boolean).join(", ")}</div>}
                    </div>
                  </div>
                  <div style={S.flex}>
                    <span style={S.badge}>{(m.group_ids && m.group_ids.length > 1 ? m.group_ids : [m.group_id]).map(id => GROUPS.find(g => g.id === id)?.label).filter(Boolean).join(" · ") || "No Group"}</span>
                    <button style={{ ...S.btnSm, background: "#51cf66" }} onClick={() => approve(m.id)}>✓ Approve</button>
                    <button style={S.btnDanger} onClick={() => deny(m.id)}>✕ Deny</button>
                  </div>
                </div>
                {m.bio && <p style={{ ...S.muted, fontSize: 13, marginTop: 10, fontStyle: "italic" }}>{m.bio}</p>}
              </div>
            ))}
            <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "20px 0" }} />
          </div>
        )}

        {/* APPROVED MEMBERS */}
        {approved.map(m => (
          <div key={m.id} style={{ ...S.card, padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div onClick={() => setViewMember(m)} style={{ cursor: "pointer", flexShrink: 0 }}>
                <Avatar profile={m} size={48} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <span onClick={() => setViewMember(m)} style={{ color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer" }} title="View profile">{displayName(m)}</span>
                  <span style={{ ...S.badge, fontSize: 10 }}>{(m.group_ids && m.group_ids.length > 1 ? m.group_ids : [m.group_id]).map(id => GROUPS.find(g => g.id === id)?.label).filter(Boolean).join(" · ") || "No Group"}</span>
                  {m.role === "admin" && <span style={{ ...S.badge, background: "rgba(255,102,0,0.3)", color: "#FF7E33", fontSize: 10 }}>Admin</span>}
                  {m.role === "moderator" && <span style={{ ...S.badge, background: "rgba(192,154,47,0.25)", color: "#C09A2F", fontSize: 10 }}>Mod</span>}
                </div>
                {expandedId === m.id && (
                  <div style={{ ...S.muted, fontSize: 13, marginTop: 2 }}>
                    {formatName(m.full_name)}
                    {m.marital_status && <span> · {m.marital_status}</span>}
                    {profile.role === "admin" && m.email && <span style={{ color: "#8A8A8A" }}> · {m.email}</span>}
                  </div>
                )}
                {(m.city || m.state) && <div style={{ color: "#FF7E33", fontSize: 12, marginTop: 2 }}><MapPin size={11} style={{ verticalAlign: "-1px", marginRight: 2 }} /> {[m.city, m.state].filter(Boolean).join(", ")}</div>}
                <div style={{ marginTop: 6 }}><Badges userId={m.id} size="small" /></div>
                {m.id !== profile.id && (
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8, flexWrap: "wrap" }}>
                    <button onClick={() => messageMember(m)} style={{ background: "rgba(255,102,0,0.12)", border: "1px solid rgba(255,102,0,0.35)", borderRadius: 8, cursor: "pointer", color: "#FF7E33", fontSize: 12, fontWeight: 600, padding: "7px 14px", display: "inline-flex", alignItems: "center", gap: 6 }} title={`Message ${displayName(m)}`}><MessageCircle size={14} /> Message</button>
                    <button onClick={() => flagMember(m)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8A8A8A", fontSize: 11, padding: "4px 0" }} title="Report this member"><Flag size={12} style={{ verticalAlign: "-2px", marginRight: 3 }} /> Report</button>
                  </div>
                )}
                {isStaff(profile) && m.avatar_pending && (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: "rgba(255,102,0,0.06)", border: "1px solid rgba(255,102,0,0.2)", borderRadius: 8, padding: 8 }}>
                    <img src={m.avatar_pending} alt="pending photo" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid #FF6600" }} />
                    <span style={{ color: "#FF7E33", fontSize: 12 }}>New profile photo — pending</span>
                    <button style={{ ...S.btnSm, fontSize: 10, padding: "6px 12px", background: "#51cf66" }} onClick={() => approveAvatar(m)}>✓ Approve</button>
                    <button style={{ ...S.btnDanger, fontSize: 10, padding: "6px 10px" }} onClick={() => rejectAvatar(m)}>Reject</button>
                  </div>
                )}
                {profile.role === "admin" && m.id !== profile.id && (
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    {["member", "moderator", "admin"].filter(r => r !== m.role).map(r => (
                      <button key={r} style={{ ...S.btnSm, fontSize: 10, padding: "6px 12px" }} onClick={() => updateRole(m.id, r)}>
                        {r === "member" ? "Set Member" : r === "moderator" ? "Make Mod" : "Make Admin"}
                      </button>
                    ))}
                    <button style={{ ...S.btnSm, fontSize: 10, padding: "6px 12px" }} onClick={() => adminChangeUsername(m)}>Username</button>
                    <button style={{ ...S.btnSm, fontSize: 10, padding: "6px 12px" }} onClick={() => adminChangeGroup(m)}>Group</button>
                    <button style={{ ...S.btnSm, fontSize: 10, padding: "6px 12px" }} onClick={() => adminResetPassword(m)}>Reset PW</button>
                    <button style={{ ...S.btnDanger, fontSize: 10, padding: "6px 10px" }} onClick={() => removeMember(m.id)}>Remove</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {viewMember && <MemberProfileModal m={viewMember} me={profile} onClose={() => setViewMember(null)} onMessage={messageMember} />}
    </div>
  );
}
