// Admin / moderator dashboard — the pending queues.
import React, { useState, useEffect } from "react";
import { S } from "./styles";
import { GROUPS, PROFILE_COLS } from "./constants";
import { supabase } from "./supabaseClient";
import { formatName } from "./helpers";
import { displayName } from "./stats";
import { fetchStaffEmails } from "./permissions";
import { sendMemberEmail, notifyMembers } from "./notify";

// ─── Main App ──────────────────────────────────────────────────────────────────
export function AdminDashboard({ profile }) {
  const [pendingMembers, setPendingMembers] = useState([]);
  const [flags, setFlags] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [pendingRecs, setPendingRecs] = useState([]);
  const [memberFlags, setMemberFlags] = useState([]);
  const [groupRequests, setGroupRequests] = useState([]);
  const [pendingPrivateGroups, setPendingPrivateGroups] = useState([]);
  const [pendingAvatars, setPendingAvatars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [broadcast, setBroadcast] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastPhoto, setBroadcastPhoto] = useState(null);
  const [broadcastPhotoPreview, setBroadcastPhotoPreview] = useState("");
  const [broadcastMediaIsVideo, setBroadcastMediaIsVideo] = useState(false);
  const [cgName, setCgName] = useState("");
  const [cgDesc, setCgDesc] = useState("");
  const [cgPolicy, setCgPolicy] = useState("approval");
  const [cgSaving, setCgSaving] = useState(false);
  const [cgMsg, setCgMsg] = useState("");

  useEffect(() => { loadAll(); }, []);

  async function createCommunityGroup() {
    const name = cgName.trim();
    if (!name) return;
    setCgSaving(true); setCgMsg("");
    const { data, error } = await supabase.from("private_groups").insert({
      name, description: cgDesc.trim(), created_by: profile.id, approved: true, member_count: 1, join_policy: cgPolicy,
    }).select().single();
    if (error || !data) { setCgMsg(`Couldn't create: ${error?.message || "unknown error"}`); setCgSaving(false); return; }
    await supabase.from("private_group_members").insert({ group_id: data.id, user_id: profile.id, role: "creator" });
    setCgName(""); setCgDesc(""); setCgPolicy("approval");
    setCgMsg(`✓ "${name}" is live — members will find it under Community Groups.`);
    setCgSaving(false);
  }

  async function sendBroadcast() {
    const text = broadcast.trim();
    if (!text && !broadcastPhoto) return;
    if (!window.confirm(`Send this announcement to ALL group chats (Brotherhood, Sisterhood, Family)?\n\n"${text.slice(0, 140)}${text.length > 140 ? "…" : ""}"`)) return;
    setBroadcasting(true);
    setBroadcastMsg("");
    let photoUrl = "";
    if (broadcastPhoto) {
      const maxBytes = 500 * 1024 * 1024;
      if (broadcastPhoto.size > maxBytes) {
        setBroadcastMsg("File too large — max 500 MB. Trim the video or use a shorter clip.");
        setBroadcasting(false); return;
      }
      const ext = broadcastPhoto.name.split('.').pop();
      const path = `${profile.id}/broadcast_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, broadcastPhoto);
      if (upErr) {
        const msg = upErr.message?.toLowerCase().includes("size") || upErr.message?.toLowerCase().includes("limit")
          ? "File too large for storage. Go to Supabase → Storage → avatars bucket → increase the file size limit."
          : `Upload failed: ${upErr.message}`;
        setBroadcastMsg(msg); setBroadcasting(false); return;
      }
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      photoUrl = data.publicUrl;
    }
    const senderName = profile.username ? `@${profile.username}` : formatName(profile.full_name);
    const rows = GROUPS.map(g => ({ room_id: `group_${g.id}`, user_id: profile.id, body: text ? `📢 ${text}` : "📢", sender_name: senderName, ...(photoUrl && { photo_url: photoUrl }) }));
    const { error } = await supabase.from("messages").insert(rows);
    if (error) { setBroadcastMsg(`Couldn't send: ${error.message}`); setBroadcasting(false); return; }
    const postRows = GROUPS.map(g => ({ user_id: profile.id, group_id: g.id, body: text ? `📢 ${text}` : "📢", ...(photoUrl && { photo_url: photoUrl }), photo_approved: true, reactions: {} }));
    await supabase.from("posts").insert(postRows);
    GROUPS.forEach(g => notifyMembers({ kind: "message", room_id: `group_${g.id}`, actor_id: profile.id, preview: text || "📷 Photo" }));
    setBroadcast("");
    setBroadcastPhoto(null);
    setBroadcastPhotoPreview("");
    setBroadcastMediaIsVideo(false);
    setBroadcastMsg(`✓ Sent to all ${GROUPS.length} group chats.`);
    setBroadcasting(false);
  }

  async function loadAll() {
    setLoading(true);
    const [m, f, e, r, mf, gr, pg, av] = await Promise.all([
      supabase.from("profiles").select(PROFILE_COLS).eq("status", "pending").order("created_at", { ascending: true }),
      supabase.from("post_flags").select("*, posts(body, user_id, group_id)").eq("reviewed", false).order("created_at", { ascending: false }),
      supabase.from("events").select("*").eq("approved", false).order("created_at", { ascending: false }),
      supabase.from("local_recommendations").select("*, profiles(username, full_name)").eq("approved", false).order("created_at", { ascending: false }),
      supabase.from("member_flags").select("*").eq("reviewed", false).order("created_at", { ascending: false }),
      supabase.from("profiles").select(PROFILE_COLS).not("requested_group_id", "is", null).order("requested_group_at", { ascending: true }),
      supabase.from("private_groups").select("*, profiles(username, full_name)").eq("approved", false).order("created_at", { ascending: false }),
      supabase.from("profiles").select(PROFILE_COLS).not("avatar_pending", "is", null).order("updated_at", { ascending: false }),
    ]);
    setPendingPrivateGroups(pg.data || []);
    setPendingAvatars(av.data || []);
    setGroupRequests((gr.data || []).filter(x => x.requested_group_id));
    const flagRows = mf.data || [];
    const ids = [...new Set(flagRows.flatMap(x => [x.flagged_user_id, x.flagged_by]))];
    const nameMap = {};
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, username").in("id", ids);
      (profs || []).forEach(p => { nameMap[p.id] = p; });
    }
    setMemberFlags(flagRows.map(x => ({ ...x, reported: nameMap[x.flagged_user_id], reporter: nameMap[x.flagged_by] })));
    const pendEmails = await fetchStaffEmails();
    setPendingMembers((m.data || []).map(x => ({ ...x, email: pendEmails[x.id] })));
    setFlags(f.data || []);
    setPendingEvents(e.data || []);
    setPendingRecs(r.data || []);
    setLoading(false);
  }

  async function approveMember(mem) {
    const { error } = await supabase.from("profiles").update({ status: "approved" }).eq("id", mem.id);
    if (error) { alert(`Couldn't approve this member: ${error.message}`); return; }
    if (mem.email) {
      sendMemberEmail({ to: mem.email, name: mem.full_name, type: "approval" });
    }
    loadAll();
  }
  async function denyMember(id) {
    const { error } = await supabase.from("profiles").update({ status: "denied" }).eq("id", id);
    if (error) { alert(`Couldn't update this member: ${error.message}`); return; }
    loadAll();
  }
  async function removeFlaggedPost(flagId, postId) {
    if (postId) await supabase.from("posts").delete().eq("id", postId);
    await supabase.from("post_flags").update({ reviewed: true }).eq("id", flagId);
    loadAll();
  }
  async function dismissFlag(flagId) {
    await supabase.from("post_flags").update({ reviewed: true }).eq("id", flagId);
    loadAll();
  }
  async function approveEvent(id) {
    await supabase.from("events").update({ approved: true }).eq("id", id);
    notifyMembers({ kind: "event", item_id: id, actor_id: profile.id, preview: "New event" });
    loadAll();
  }
  async function removeEvent(id) {
    await supabase.from("events").delete().eq("id", id);
    loadAll();
  }
  async function approveRec(id) {
    await supabase.from("local_recommendations").update({ approved: true }).eq("id", id);
    loadAll();
  }
  async function removeRec(id) {
    await supabase.from("local_recommendations").delete().eq("id", id);
    loadAll();
  }
  async function removeFlaggedMember(flag) {
    await supabase.from("profiles").update({ status: "removed" }).eq("id", flag.flagged_user_id);
    await supabase.from("member_flags").update({ reviewed: true }).eq("id", flag.id);
    loadAll();
  }
  async function dismissMemberFlag(id) {
    await supabase.from("member_flags").update({ reviewed: true }).eq("id", id);
    loadAll();
  }
  async function approvePrivateGroup(id) {
    await supabase.from("private_groups").update({ approved: true }).eq("id", id);
    loadAll();
  }
  async function denyPrivateGroup(id) {
    if (!window.confirm("Deny and delete this private group request?")) return;
    await supabase.from("private_groups").delete().eq("id", id);
    loadAll();
  }
  async function approveGroupChange(mem) {
    await supabase.from("profiles").update({ group_id: mem.requested_group_id, group_ids: [mem.requested_group_id], requested_group_id: null, requested_group_at: null }).eq("id", mem.id);
    loadAll();
  }
  async function denyGroupChange(id) {
    await supabase.from("profiles").update({ requested_group_id: null, requested_group_at: null }).eq("id", id);
    loadAll();
  }

  const total = pendingMembers.length + flags.length + pendingEvents.length + pendingRecs.length + memberFlags.length + groupRequests.length + pendingPrivateGroups.length + pendingAvatars.length;

  async function approveAvatar(m) {
    await supabase.from("profiles").update({ avatar_url: m.avatar_pending, avatar_pending: null }).eq("id", m.id);
    loadAll();
  }
  async function rejectAvatar(m) {
    if (!window.confirm("Reject this photo? The member keeps their current picture.")) return;
    await supabase.from("profiles").update({ avatar_pending: null }).eq("id", m.id);
    loadAll();
  }

  const Section = ({ title, icon, count, children }) => (
    <div style={{ ...S.card, marginTop: 16 }}>
      <div style={S.flexBetween}>
        <span style={S.eyebrow}>{icon} {title}</span>
        <span style={{ ...S.badge, background: count ? "rgba(255,102,0,0.15)" : "rgba(255,255,255,0.06)", color: count ? "#FF6600" : "#888" }}>{count}</span>
      </div>
      {count === 0 ? <p style={{ ...S.muted, marginTop: 10 }}>Nothing pending.</p> : <div style={{ marginTop: 12 }}>{children}</div>}
    </div>
  );

  const Row = ({ main, sub, actions }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{main}</div>
        {sub && <div style={{ ...S.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>}
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>{actions}</div>
    </div>
  );

  return (
    <div>
      <div style={S.flexBetween}>
        <h2 style={{ ...S.h2, margin: 0 }}>Admin Dashboard</h2>
        <button style={S.btnGhost} onClick={loadAll}>Refresh</button>
      </div>
      <p style={S.muted}>{loading ? "Loading…" : total === 0 ? "All clear — nothing needs your attention." : `${total} item${total === 1 ? "" : "s"} need your attention.`}</p>

      <div style={{ ...S.card, marginTop: 16, borderColor: "rgba(255,102,0,0.3)" }}>
        <span style={S.eyebrow}>📢 Broadcast to All Groups</span>
        <p style={{ ...S.muted, marginTop: 4, marginBottom: 12 }}>Post one announcement to every group chat at once — Brotherhood · Sisterhood · Family. Members get notified by email/push.</p>
        <textarea
          value={broadcast}
          onChange={e => setBroadcast(e.target.value)}
          placeholder="Type your announcement to all groups…"
          rows={3}
          style={{ ...S.input, resize: "vertical", fontSize: 15 }}
        />
        {broadcastPhotoPreview && (
          <div style={{ position: "relative", display: "inline-block", marginTop: 10 }}>
            {broadcastMediaIsVideo
              ? <video src={broadcastPhotoPreview} controls style={{ maxWidth: 220, maxHeight: 160, borderRadius: 8, display: "block" }} />
              : <img src={broadcastPhotoPreview} alt="preview" style={{ maxWidth: 220, maxHeight: 160, borderRadius: 8, objectFit: "cover", display: "block" }} />
            }
            <button onClick={() => { setBroadcastPhoto(null); setBroadcastPhotoPreview(""); setBroadcastMediaIsVideo(false); }} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", fontSize: 12, lineHeight: "22px", textAlign: "center" }}>✕</button>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
          <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "#FF6600", fontWeight: 600, fontSize: 14, padding: "8px 14px", border: "1px solid rgba(255,102,0,0.4)", borderRadius: 8 }}>
            📷 Add Photo / Video
            <input type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={e => {
              const f = e.target.files[0];
              if (!f) return;
              setBroadcastPhoto(f);
              setBroadcastPhotoPreview(URL.createObjectURL(f));
              setBroadcastMediaIsVideo(f.type.startsWith("video/"));
            }} />
          </label>
          <button style={{ ...S.btn, opacity: (broadcasting || (!broadcast.trim() && !broadcastPhoto)) ? 0.5 : 1 }} disabled={broadcasting || (!broadcast.trim() && !broadcastPhoto)} onClick={sendBroadcast}>
            {broadcasting ? "Sending…" : "Send to All Groups"}
          </button>
          {broadcastMsg && <span style={{ color: broadcastMsg.startsWith("✓") ? "#5BD08A" : "#ff6b6b", fontSize: 13, fontWeight: 600 }}>{broadcastMsg}</span>}
        </div>
      </div>

      <div style={{ ...S.card, marginTop: 16, borderColor: "rgba(255,102,0,0.3)" }}>
        <span style={S.eyebrow}>👥 Create Community Group</span>
        <p style={{ ...S.muted, marginTop: 4, marginBottom: 12 }}>Create a group for the community (e.g. Veterans &amp; First Responders) and choose how members join. It appears under Community Groups for everyone to discover.</p>
        <input style={{ ...S.input, marginBottom: 10 }} placeholder="Group name (e.g. Veterans & First Responders)" value={cgName} onChange={e => setCgName(e.target.value)} />
        <textarea style={{ ...S.input, resize: "vertical", fontSize: 15, marginBottom: 10 }} rows={2} placeholder="Short description of who it's for…" value={cgDesc} onChange={e => setCgDesc(e.target.value)} />
        <label style={S.label}>Who can join?</label>
        <select style={{ ...S.input, marginBottom: 12 }} value={cgPolicy} onChange={e => setCgPolicy(e.target.value)}>
          <option value="open">🌐 Open to all — any member joins instantly (unlimited)</option>
          <option value="approval">✋ By request — members request, you approve each (unlimited)</option>
          <option value="private">🔒 Private — invite only, you add members (max 15)</option>
        </select>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <button style={{ ...S.btn, opacity: (cgSaving || !cgName.trim()) ? 0.5 : 1 }} disabled={cgSaving || !cgName.trim()} onClick={createCommunityGroup}>
            {cgSaving ? "Creating…" : "Create Group"}
          </button>
          {cgMsg && <span style={{ color: cgMsg.startsWith("✓") ? "#5BD08A" : "#ff6b6b", fontSize: 13, fontWeight: 600 }}>{cgMsg}</span>}
        </div>
      </div>

      <Section title="Pending Members" icon="👤" count={pendingMembers.length}>
        {pendingMembers.map(m => (
          <Row key={m.id}
            main={displayName(m)}
            sub={`${m.email || ""} · ${GROUPS.find(g => g.id === m.group_id)?.label || "—"}`}
            actions={<>
              <button style={S.btnSm} onClick={() => approveMember(m)}>Approve</button>
              <button style={S.btnDanger} onClick={() => denyMember(m.id)}>Deny</button>
            </>}
          />
        ))}
      </Section>

      <Section title="Pending Profile Photos" icon="🖼️" count={pendingAvatars.length}>
        {pendingAvatars.map(m => (
          <Row key={m.id}
            main={<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img src={m.avatar_pending} alt="pending" style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", border: "2px solid #FF6600" }} />
              <div>
                <div style={{ fontWeight: 600, color: "#fff" }}>{displayName(m)}</div>
                <div style={{ fontSize: 12, color: "#8A8A8A" }}>New profile photo</div>
              </div>
            </div>}
            actions={<>
              <button style={S.btnSm} onClick={() => approveAvatar(m)}>Approve</button>
              <button style={S.btnDanger} onClick={() => rejectAvatar(m)}>Reject</button>
            </>}
          />
        ))}
      </Section>

      <Section title="Group Change Requests" icon="🔀" count={groupRequests.length}>
        {groupRequests.map(m => (
          <Row key={m.id}
            main={displayName(m)}
            sub={`${GROUPS.find(g => g.id === m.group_id)?.label || "—"} → ${GROUPS.find(g => g.id === m.requested_group_id)?.label || m.requested_group_id}`}
            actions={<>
              <button style={S.btnSm} onClick={() => approveGroupChange(m)}>Approve</button>
              <button style={S.btnDanger} onClick={() => denyGroupChange(m.id)}>Deny</button>
            </>}
          />
        ))}
      </Section>

      <Section title="Pending Private Groups" icon="🔒" count={pendingPrivateGroups.length}>
        {pendingPrivateGroups.map(g => (
          <Row key={g.id}
            main={g.name}
            sub={`${g.description || "No description"} · by ${g.profiles?.username ? "@" + g.profiles.username : formatName(g.profiles?.full_name)}`}
            actions={<>
              <button style={S.btnSm} onClick={() => approvePrivateGroup(g.id)}>Approve</button>
              <button style={S.btnDanger} onClick={() => denyPrivateGroup(g.id)}>Deny</button>
            </>}
          />
        ))}
      </Section>

      <Section title="Flagged Posts" icon="🚩" count={flags.length}>
        {flags.map(f => (
          <Row key={f.id}
            main={f.posts?.body ? `"${f.posts.body.slice(0, 60)}${f.posts.body.length > 60 ? "…" : ""}"` : "(post deleted)"}
            sub={`Reason: ${f.reason || "—"}`}
            actions={<>
              <button style={S.btnDanger} onClick={() => removeFlaggedPost(f.id, f.post_id)}>Remove Post</button>
              <button style={S.btnGhost} onClick={() => dismissFlag(f.id)}>Dismiss</button>
            </>}
          />
        ))}
      </Section>

      <Section title="Flagged Members" icon="🚩" count={memberFlags.length}>
        {memberFlags.map(mf => (
          <Row key={mf.id}
            main={mf.reported ? formatName(mf.reported.full_name) : "(unknown member)"}
            sub={`Reason: ${mf.reason || "—"} · reported by ${mf.reporter ? formatName(mf.reporter.full_name) : "—"}`}
            actions={<>
              <button style={S.btnDanger} onClick={() => removeFlaggedMember(mf)}>Remove Member</button>
              <button style={S.btnGhost} onClick={() => dismissMemberFlag(mf.id)}>Dismiss</button>
            </>}
          />
        ))}
      </Section>

      <Section title="Pending Events" icon="📅" count={pendingEvents.length}>
        {pendingEvents.map(ev => (
          <Row key={ev.id}
            main={ev.title}
            sub={`${ev.event_date ? new Date(ev.event_date).toLocaleDateString() : ""} · ${ev.location || ""}`}
            actions={<>
              <button style={S.btnSm} onClick={() => approveEvent(ev.id)}>Approve</button>
              <button style={S.btnDanger} onClick={() => removeEvent(ev.id)}>Remove</button>
            </>}
          />
        ))}
      </Section>

      <Section title="Pending Local Recommendations" icon="📍" count={pendingRecs.length}>
        {pendingRecs.map(rec => (
          <Row key={rec.id}
            main={rec.name}
            sub={`${rec.category || ""} · ${rec.city || ""}, ${rec.state || ""}`}
            actions={<>
              <button style={S.btnSm} onClick={() => approveRec(rec.id)}>Approve</button>
              <button style={S.btnDanger} onClick={() => removeRec(rec.id)}>Remove</button>
            </>}
          />
        ))}
      </Section>
    </div>
  );
}
