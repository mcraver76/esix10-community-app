import React, { useState, useEffect, useRef } from "react";
import {
  LayoutGrid, Newspaper, Swords, Sparkles, Gem, Flame, HeartHandshake,
  MessageCircle, Menu, User, BarChart3, Users, BookOpen, Smartphone, Share2,
  CalendarDays, Lock, MapPin, Cross, HandHeart, Tv, Shield, Sword, PawPrint,
  Bird, Mountain, Anchor, Star, Dumbbell, Crown, Footprints, Award,
  Zap, Megaphone, Activity, Camera, Flag, Archive, Hourglass, Medal,
  NotebookPen, Unlock, CheckCircle2, Eye, Pencil, Pin, ShoppingBag,
} from "lucide-react";
import { getTodaysDevotion } from "./dailyDevotions";
import { LEGAL_VERSION, LEGAL_EFFECTIVE, TERMS, PRIVACY, MOD_AGREEMENT } from "./legalContent";
import { GROUPS, ADMIN_EMAIL, PROFILE_COLS, REACTIONS, VERSES, CHARGES, LEVELS, BADGE_DEFS } from "./constants";
import { GLOBAL_CSS, S, FORGE_CSS } from "./styles";
import { supabase, SUPABASE_ANON_KEY } from "./supabaseClient";
import { formatName, localDateStr, cleanWodTitle } from "./helpers";
import { TabCarousel } from "./ui";
import { FORGE_SLIDES, TheForge } from "./forge";
import { Media } from "./media";
import { getLevel, getXP, fetchProfileStats, displayName } from "./stats";
import { NavIcon, LevelIcon, Avatar, LevelBadgeForUser } from "./icons";
import { Badges, StatsDashboard, ProfileLevelSummary, Profile } from "./profile";
import { isApproved, requireApproved, isStaff } from "./permissions";
import { sendMemberEmail, notifyMembers } from "./notify";
import { Members } from "./members";
import { AdminDashboard } from "./admin";
import { Devotion, PrayerRequests, StatementOfFaith, PlanOfSalvation } from "./faith";
import { isVideoUrl, Feed } from "./feed";
import { Events, LocalChapter } from "./events";
import { SocialFeed, ShareESix10, WelcomeModal } from "./social";
import { SetupModal, AuthScreen, GroupSelect, PasswordResetScreen, LegalAndPrivacy, AgreementGate, ProfileCompletionGate } from "./auth";


// Mobile detection hook
function useMobile() {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}


// Message timestamps come back from Postgres WITHOUT a timezone
// (e.g. "2026-06-14T14:01:51.8"), which new Date() interprets as LOCAL time.
// Our "last read" values are UTC (Date.toISOString → trailing "Z"). Comparing
// the two directly breaks for anyone not on UTC (e.g. US users), making chats
// look permanently unread. Read the DB value as UTC by appending "Z" if it has
// no timezone marker.
const msgTime = (s) => new Date(/[Zz]$|[+-]\d{2}:?\d{2}$/.test(s || "") ? s : (s || "") + "Z");


const CHAT_SLIDES = [
  { eyebrow: "Chat", title: "Sharpen each other — don't tear each other down.", sub: "Proverbs 27:17" },
  { eyebrow: "Keep it sacred", title: "What's said here, stays here.", sub: "Trust is built on confidence." },
  { eyebrow: "Your crew", title: "Start a casual group with your buddies.", sub: "Tap Group to create one." },
  { eyebrow: "Safe space", title: "Need something private and regulated?", sub: "Request a Private Group." },
  { eyebrow: "In season", title: "A word in season — how good it is!", sub: "Proverbs 15:23" },
  { eyebrow: "Keep it clean", title: "See something off? Flag it.", sub: "We protect this house." },
];


// ─── Messaging ────────────────────────────────────────────────────────────────
function Messages({ profile, members, onRead }) {
  const defaultRoom = `group_${profile.group_id}`;
  const [activeRoom, setActiveRoom] = useState(
    localStorage.getItem(`esix10_room_${profile.id}`) || defaultRoom
  );
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  async function flagChatMessage(msg) {
    if (!requireApproved(profile)) return;
    if (msg.user_id === profile.id) return;
    const what = msg.photo_url ? "photo" : "message";
    const reason = window.prompt(`Report this chat ${what} to the admins. What's the issue? (optional)`);
    if (reason === null) return;
    await supabase.from("member_flags").insert({ flagged_user_id: msg.user_id, flagged_by: profile.id, reason: `[chat ${what}] ${reason || (msg.body || "").slice(0, 80) || "no reason given"}` });
    alert("Reported. An admin will review it shortly. Thank you.");
  }
  const [showNewDM, setShowNewDM] = useState(false);
  const [dmSearch, setDmSearch] = useState("");
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMembers, setNewGroupMembers] = useState([]);
  const [groupMemberSearch, setGroupMemberSearch] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [customRooms, setCustomRooms] = useState([]);
  const [roomMembers, setRoomMembers] = useState([]);
  const [showGroupMembers, setShowGroupMembers] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState("");
  const msgPhotoRef = useRef();
  const bottomRef = useRef(null);

  // Every group this member belongs to gets its own chat (not just the primary one).
  const myGroupIds = (profile.group_ids && profile.group_ids.length ? profile.group_ids : [profile.group_id]).filter(Boolean);
  const GROUP_ROOMS = [
    ...myGroupIds.map(gid => ({ id: `group_${gid}`, label: `${GROUPS.find(g => g.id === gid)?.label} Chat`, subtitle: GROUPS.find(g => g.id === gid)?.subtitle, icon: "💬", type: "group" })),
    ...(profile.role === "admin" ? GROUPS.filter(g => !myGroupIds.includes(g.id)).map(g => ({ id: `group_${g.id}`, label: `${g.label} Chat`, subtitle: g.subtitle, icon: "💬", type: "group" })) : []),
    ...(profile.role === "admin" ? [{ id: "group_all", label: "Leadership Chat", icon: "📢", type: "group" }] : []),
  ];

  const dmRooms = members
    .filter(m => m.id !== profile.id && m.status === "approved")
    .map(m => ({
      id: `dm_${[profile.id, m.id].sort().join("_")}`,
      label: m.username ? `@${m.username}` : formatName(m.full_name),
      icon: "👤",
      type: "dm",
      member: m
    }));

  function selectRoom(roomId) {
    setActiveRoom(roomId);
    localStorage.setItem(`esix10_room_${profile.id}`, roomId);
    // Mark as read
    const lastRead = JSON.parse(localStorage.getItem(`esix10_lastread_${profile.id}`) || "{}");
    lastRead[roomId] = new Date().toISOString();
    localStorage.setItem(`esix10_lastread_${profile.id}`, JSON.stringify(lastRead));
    if (onRead) onRead();
  }

  async function loadCustomRooms() {
    // Casual groups are visible only to their members (room_members).
    const { data: mem } = await supabase.from("room_members").select("room_id").eq("user_id", profile.id);
    const ids = [...new Set((mem || []).map(r => r.room_id))];
    if (!ids.length) { setCustomRooms([]); return; }
    const { data } = await supabase.from("messages").select("room_id, body").in("room_id", ids).order("created_at", { ascending: false });
    const roomMap = {};
    ids.forEach(id => { roomMap[id] = { id, label: "Group Chat", icon: "👥", type: "custom_group" }; });
    (data || []).forEach(m => { if (m.body && m.body.startsWith("📢 [GROUP:") && roomMap[m.room_id]) roomMap[m.room_id].label = m.body.split("[GROUP:")[1].split("]")[0]; });
    setCustomRooms(Object.values(roomMap));
  }
  async function loadRoomMembers(roomId) {
    const { data } = await supabase.from("room_members").select("*").eq("room_id", roomId);
    const rows = data || [];
    const ids = rows.map(r => r.user_id);
    const profMap = {};
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, username, avatar_url").in("id", ids);
      (profs || []).forEach(p => { profMap[p.id] = p; });
    }
    setRoomMembers(rows.map(r => ({ ...r, profiles: profMap[r.user_id] })));
  }
  async function addRoomMember(m) {
    await supabase.from("room_members").insert({ room_id: activeRoom, user_id: m.id, added_by: profile.id });
    setAddMemberSearch("");
    loadRoomMembers(activeRoom);
  }
  async function removeRoomMember(userId) {
    await supabase.from("room_members").delete().eq("room_id", activeRoom).eq("user_id", userId);
    if (userId === profile.id) { setShowGroupMembers(false); setActiveRoom(`group_${profile.group_id}`); loadCustomRooms(); return; }
    loadRoomMembers(activeRoom);
  }
  useEffect(() => { loadCustomRooms(); }, []);
  useEffect(() => {
    if (activeRoom?.startsWith("group_custom_")) loadRoomMembers(activeRoom);
    else setShowGroupMembers(false);
  }, [activeRoom]);

  useEffect(() => {
    if (!activeRoom) return;
    loadMessages();
    const channel = supabase
      .channel(`messages-${activeRoom}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${activeRoom}` }, () => {
        loadMessages();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [activeRoom]);

  async function loadMessages() {
    if (!activeRoom) return;
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", activeRoom)
      .order("created_at", { ascending: true })
      .limit(50);
    if (error) { console.error("Messages error:", error); return; }
    setMessages(data || []);
    // Only mark the room read when its conversation is actually ON SCREEN.
    // On mobile the list and the conversation share this component and activeRoom
    // is restored from the last session, so without this guard just viewing the
    // chat LIST would auto-dismiss new messages in the last-opened room. We read
    // the view state from a ref so the realtime callback never uses a stale value.
    const viewingConversation = !isMobileChat || !showRoomListRef.current;
    if (viewingConversation) {
      try {
        const lr = JSON.parse(localStorage.getItem(`esix10_lastread_${profile.id}`) || "{}");
        lr[activeRoom] = new Date().toISOString();
        localStorage.setItem(`esix10_lastread_${profile.id}`, JSON.stringify(lr));
      } catch(e) {}
      // Clear the unread dot for the room being viewed.
      setUnreadRooms(prev => { if (!prev.has(activeRoom)) return prev; const n = new Set(prev); n.delete(activeRoom); return n; });
    }
  }

  async function send() {
    if (!requireApproved(profile)) return;
    if (!body.trim() && !photoFile) return;
    if (!activeRoom) return;
    setPosting(true);
    let photoUrl = null;
    if (photoFile) {
      setUploading(true);
      const ext = photoFile.name.split(".").pop();
      const path = `${profile.id}/msg_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, photoFile);
      if (!uploadError) {
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        photoUrl = data.publicUrl;
      }
      setUploading(false);
    }
    const senderName = profile.username ? `@${profile.username}` : formatName(profile.full_name);
    const { error } = await supabase.from("messages").insert({ 
      room_id: activeRoom, 
      user_id: profile.id, 
      body: body.trim() || "📷",
      sender_name: senderName,
      photo_url: photoUrl
    });
    if (error) {
      alert(`Message failed: ${error.message}`);
    } else {
      notifyMembers({ kind: "message", room_id: activeRoom, actor_id: profile.id, preview: body.trim() || "📷" });
      setBody(""); setPhotoFile(null); setPhotoPreview(null);
      setTimeout(() => loadMessages(), 300);
    }
    setPosting(false);
  }

  async function deleteMessage(id) {
    if (!window.confirm("Delete this message?")) return;
    await supabase.from("messages").delete().eq("id", id);
    loadMessages();
  }

  const currentRoom = [...GROUP_ROOMS, ...dmRooms, ...customRooms].find(r => r.id === activeRoom);
  const isMobileChat = useMobile();
  const [showRoomList, setShowRoomList] = useState(() => {
    // If we arrived here from a "Message" button, open straight into the chat.
    if (localStorage.getItem(`esix10_open_room_${profile.id}`)) {
      localStorage.removeItem(`esix10_open_room_${profile.id}`);
      return false;
    }
    return true;
  });
  // Always-current view state, so loadMessages (called from a realtime callback
  // captured when activeRoom last changed) never reads a stale showRoomList.
  const showRoomListRef = useRef(showRoomList);
  showRoomListRef.current = showRoomList;

  function selectRoomMobile(roomId) {
    selectRoom(roomId);
    setShowRoomList(false);
  }

  // Per-room unread tracking — drives the orange dot on chats with new messages.
  const [unreadRooms, setUnreadRooms] = useState(() => new Set());
  async function refreshUnread() {
    try {
      const lastRead = JSON.parse(localStorage.getItem(`esix10_lastread_${profile.id}`) || "{}");
      const { data } = await supabase.from("messages").select("room_id, created_at, user_id").order("created_at", { ascending: false }).limit(200);
      if (!data) return;
      const byRoom = {};
      data.forEach(m => { (byRoom[m.room_id] = byRoom[m.room_id] || []).push(m); });
      const next = new Set();
      Object.entries(byRoom).forEach(([roomId, msgs]) => {
        const lastFromOther = msgs.find(m => m.user_id !== profile.id); // newest-first
        if (!lastFromOther) return;
        const lrt = lastRead[roomId] || "2000-01-01";
        if (msgTime(lastFromOther.created_at) > new Date(lrt)) next.add(roomId);
      });
      setUnreadRooms(next);
    } catch (e) {}
  }

  // Track which DM conversations actually exist + their latest message time, so
  // the DM list shows only real conversations, newest first (instead of listing
  // every member — which won't scale to hundreds of people).
  const [dmLatest, setDmLatest] = useState({});
  async function loadDmThreads() {
    try {
      const { data } = await supabase.from("messages")
        .select("room_id, created_at")
        .like("room_id", "dm_%")
        .order("created_at", { ascending: false })
        .limit(400);
      if (!data) return;
      const latest = {};
      for (const m of data) {
        if (!m.room_id.slice(3).split("_").includes(profile.id)) continue; // only my DMs
        if (!latest[m.room_id]) latest[m.room_id] = m.created_at; // first hit = newest
      }
      setDmLatest(latest);
    } catch (e) {}
  }

  useEffect(() => {
    refreshUnread();
    loadDmThreads();
    const ch = supabase
      .channel(`messages-unread-${profile.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => { refreshUnread(); loadDmThreads(); })
      .subscribe();
    const iv = setInterval(() => { refreshUnread(); loadDmThreads(); }, 45000);
    return () => { supabase.removeChannel(ch); clearInterval(iv); };
  }, []);

  // Only show DMs that actually have a conversation, newest message first.
  // (New conversations are started from the "DM" search button above.)
  const activeDmRooms = dmRooms
    .filter(r => dmLatest[r.id])
    .sort((a, b) => new Date(dmLatest[b.id]) - new Date(dmLatest[a.id]));

  // A room is "unread" (show a clear new-message indicator) when it has unseen
  // messages and you're not CURRENTLY VIEWING that conversation. On mobile the
  // list shares this component with the conversation, so the remembered
  // activeRoom must still show a dot while you're looking at the list.
  const viewingConversation = !isMobileChat || !showRoomList;
  const isUnread = (id) => unreadRooms.has(id) && !(viewingConversation && activeRoom === id);
  const UnreadDot = () => <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#FF6600", flexShrink: 0, boxShadow: "0 0 8px rgba(255,102,0,0.9)" }} />;

  const ROOM_LIST = (
    <div style={{ width: isMobileChat ? "100%" : 230, borderRight: isMobileChat ? "none" : "1px solid rgba(255,255,255,0.06)", flexShrink: 0, overflowY: "auto", height: isMobileChat ? "calc(100dvh - 72px)" : "auto", paddingBottom: isMobileChat ? 116 : 0, background: "rgba(255,255,255,0.015)" }}>
      {isMobileChat && <div style={{ padding: "12px 12px 0" }}><TabCarousel slides={CHAT_SLIDES} /></div>}
      <div style={{ padding: "16px 12px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <p style={{ ...S.eyebrow, margin: 0 }}>Chats</p>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => { setShowNewDM(!showNewDM); setShowNewGroup(false); }} style={{ background: showNewDM ? "rgba(255,102,0,0.2)" : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,102,0,0.2)", borderRadius: 6, padding: "4px 8px", color: "#FF7E33", cursor: "pointer", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}><Pencil size={12} /> DM</button>
            <button onClick={() => { setShowNewGroup(!showNewGroup); setShowNewDM(false); }} style={{ background: showNewGroup ? "rgba(192,154,47,0.2)" : "rgba(255,255,255,0.05)", border: "1px solid rgba(192,154,47,0.2)", borderRadius: 6, padding: "4px 8px", color: "#C09A2F", cursor: "pointer", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}><Users size={12} /> Group</button>
          </div>
        </div>

        {showNewDM && (
          <div style={{ marginBottom: 12 }}>
            <input style={{ ...S.input, fontSize: 12, padding: "8px 12px", marginBottom: 4 }} placeholder="Search members..." value={dmSearch} onChange={e => setDmSearch(e.target.value)} />
            {dmSearch.length > 1 && (
              <div style={{ background: "rgba(10,10,10,0.98)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, maxHeight: 180, overflowY: "auto" }}>
                {(members || []).filter(m => m.id !== profile.id && m.status === "approved" && ((m.full_name||"").toLowerCase().includes(dmSearch.toLowerCase()) || (m.username||"").toLowerCase().includes(dmSearch.toLowerCase()))).slice(0, 8).map(m => (
                  <div key={m.id} onClick={() => { const roomId = `dm_${[profile.id, m.id].sort().join("_")}`; isMobileChat ? selectRoomMobile(roomId) : selectRoom(roomId); setShowNewDM(false); setDmSearch(""); }}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    onMouseOver={e => e.currentTarget.style.background = "rgba(255,102,0,0.08)"}
                    onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                    <Avatar profile={m} size={28} />
                    <div>
                      <div style={{ color: "#fff", fontSize: 12 }}>{m.username ? `@${m.username}` : formatName(m.full_name)}</div>
                      <div style={{ color: "#8A8A8A", fontSize: 10 }}>{GROUPS.find(g => g.id === m.group_id)?.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {showNewGroup && (
          <div style={{ marginBottom: 12, background: "rgba(192,154,47,0.05)", border: "1px solid rgba(192,154,47,0.15)", borderRadius: 6, padding: 10 }}>
            <input style={{ ...S.input, fontSize: 12, padding: "8px 12px", marginBottom: 6 }} placeholder="Group name..." value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
            <input style={{ ...S.input, fontSize: 12, padding: "8px 12px", marginBottom: 6 }} placeholder="Add members..." value={groupMemberSearch} onChange={e => setGroupMemberSearch(e.target.value)} />
            {groupMemberSearch.length > 1 && (
              <div style={{ background: "rgba(10,10,10,0.98)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, maxHeight: 150, overflowY: "auto", marginBottom: 6 }}>
                {(members || []).filter(m => m.id !== profile.id && m.status === "approved" && !newGroupMembers.find(x => x.id === m.id) && ((m.full_name||"").toLowerCase().includes(groupMemberSearch.toLowerCase()) || (m.username||"").toLowerCase().includes(groupMemberSearch.toLowerCase()))).slice(0, 5).map(m => (
                  <div key={m.id} onClick={() => { setNewGroupMembers([...newGroupMembers, m]); setGroupMemberSearch(""); }}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", cursor: "pointer" }}
                    onMouseOver={e => e.currentTarget.style.background = "rgba(255,102,0,0.08)"}
                    onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                    <Avatar profile={m} size={24} />
                    <span style={{ color: "#fff", fontSize: 12 }}>{m.username ? `@${m.username}` : formatName(m.full_name)}</span>
                  </div>
                ))}
              </div>
            )}
            {newGroupMembers.length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                {newGroupMembers.map(m => (
                  <span key={m.id} style={{ background: "rgba(255,102,0,0.1)", border: "1px solid rgba(255,102,0,0.2)", borderRadius: 20, padding: "2px 8px", fontSize: 10, color: "#FF7E33", cursor: "pointer" }} onClick={() => setNewGroupMembers(newGroupMembers.filter(x => x.id !== m.id))}>
                    {m.username ? `@${m.username}` : formatName(m.full_name)} ✕
                  </span>
                ))}
              </div>
            )}
            <button style={{ ...S.btn, width: "100%", padding: "8px", fontSize: 11, opacity: !newGroupName.trim() || newGroupMembers.length === 0 ? 0.4 : 1 }}
              disabled={!newGroupName.trim() || newGroupMembers.length === 0 || creatingGroup}
              onClick={async () => {
                setCreatingGroup(true);
                const roomId = `group_custom_${Date.now()}`;
                const senderName = profile.username ? `@${profile.username}` : formatName(profile.full_name);
                await supabase.from("messages").insert({ room_id: roomId, user_id: profile.id, body: `📢 [GROUP:${newGroupName}] Members: ${newGroupMembers.map(m => m.username ? `@${m.username}` : formatName(m.full_name)).join(", ")}`, sender_name: senderName });
                // Insert the creator first (establishes the room), then the invited members —
                // this lets the security rule verify "you created this room" before adding others.
                await supabase.from("room_members").insert({ room_id: roomId, user_id: profile.id, added_by: profile.id, is_creator: true });
                if (newGroupMembers.length) await supabase.from("room_members").insert(newGroupMembers.map(m => ({ room_id: roomId, user_id: m.id, added_by: profile.id })));
                await loadCustomRooms();
                isMobileChat ? selectRoomMobile(roomId) : selectRoom(roomId);
                setShowNewGroup(false); setNewGroupName(""); setNewGroupMembers([]); setCreatingGroup(false);
              }}>
              {creatingGroup ? "Creating..." : `Create (${newGroupMembers.length + 1})`}
            </button>
          </div>
        )}

        {customRooms.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <p style={{ ...S.eyebrow, marginBottom: 8 }}>My Groups</p>
            {customRooms.map(room => (
              <div key={room.id} style={{ display: "flex", alignItems: "center", marginBottom: 4, gap: 4 }}>
                <div onClick={() => isMobileChat ? selectRoomMobile(room.id) : selectRoom(room.id)}
                  style={{ flex: 1, padding: "10px 12px", borderRadius: 8, cursor: "pointer", background: activeRoom === room.id ? "rgba(255,102,0,0.1)" : "rgba(255,255,255,0.02)", color: activeRoom === room.id ? "#FF6600" : "#CCCCCC", fontSize: 14, display: "flex", alignItems: "center", gap: 10, border: "1px solid rgba(255,255,255,0.04)" }}>
                  <Users size={18} color="#aaa" strokeWidth={1.75} />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: isUnread(room.id) ? 700 : 400, color: isUnread(room.id) ? "#fff" : undefined }}>{room.label}</span>
                  {isUnread(room.id) && <UnreadDot />}
                </div>
                <button onClick={async () => {
                  if (!window.confirm(`Delete "${room.label}"?`)) return;
                  await supabase.from("messages").delete().eq("room_id", room.id);
                  await supabase.from("room_members").delete().eq("room_id", room.id);
                  setCustomRooms(prev => prev.filter(r => r.id !== room.id));
                  if (activeRoom === room.id) setActiveRoom(`group_${profile.group_id}`);
                }} style={{ background: "none", border: "none", color: "#8A8A8A", cursor: "pointer", fontSize: 14, padding: "6px 8px", borderRadius: 6, flexShrink: 0 }} title="Delete group">✕</button>
              </div>
            ))}
          </div>
        )}
        <p style={{ ...S.eyebrow, marginBottom: 8 }}>Group Chats</p>
        {GROUP_ROOMS.map(room => (
          <div key={room.id} onClick={() => isMobileChat ? selectRoomMobile(room.id) : selectRoom(room.id)}
            style={{ padding: "12px 16px", borderRadius: 4, cursor: "pointer", marginBottom: 4, background: activeRoom === room.id ? "rgba(255,102,0,0.1)" : "rgba(255,255,255,0.02)", color: activeRoom === room.id ? "#FF6600" : "#CCCCCC", fontSize: 14, display: "flex", alignItems: "center", gap: 12, border: "1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ fontSize: 20 }}>{room.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: isUnread(room.id) ? 700 : 400, color: isUnread(room.id) ? "#fff" : undefined }}>{room.label}</div>
              {room.subtitle && <div style={{ color: "#FF7E33", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, marginTop: 1 }}>{room.subtitle}</div>}
            </div>
            {isUnread(room.id) && <UnreadDot />}
            {isMobileChat && <span style={{ color: "#8A8A8A", fontSize: 16 }}>›</span>}
          </div>
        ))}
      </div>
      <div style={{ padding: "0 12px 16px" }}>
        <p style={{ ...S.eyebrow, marginBottom: 12 }}>Direct Messages</p>
        {activeDmRooms.length === 0 && <p style={{ ...S.muted, fontSize: 12 }}>No conversations yet. Tap "DM" above to message someone.</p>}
        {activeDmRooms.map(room => (
          <div key={room.id} onClick={() => isMobileChat ? selectRoomMobile(room.id) : selectRoom(room.id)}
            style={{ padding: "12px 16px", borderRadius: 4, cursor: "pointer", marginBottom: 4, background: activeRoom === room.id ? "rgba(255,102,0,0.1)" : "rgba(255,255,255,0.02)", color: activeRoom === room.id ? "#FF6600" : "#CCCCCC", fontSize: 14, display: "flex", alignItems: "center", gap: 12, border: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,102,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF7E33", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
              {(room.member.username || room.member.full_name || "?")[0].toUpperCase()}
            </div>
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: isUnread(room.id) ? 700 : 400, color: isUnread(room.id) ? "#fff" : undefined }}>{room.label}</span>
            {isUnread(room.id) && <UnreadDot />}
            {isMobileChat && <span style={{ color: "#8A8A8A", fontSize: 16 }}>›</span>}
          </div>
        ))}
      </div>
    </div>
  );

  const CHAT_VIEW = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: isMobileChat ? "calc(100dvh - 72px)" : "auto", paddingBottom: isMobileChat ? 116 : 0, minWidth: 0 }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.02)" }}>
        {isMobileChat && (
          <>
            <button onClick={() => setShowRoomList(true)} style={{ background: "none", border: "none", color: "#FF7E33", fontSize: 20, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>‹</button>
            <button onClick={() => loadMessages()} style={{ background: "none", border: "none", color: "#8A8A8A", fontSize: 16, cursor: "pointer", padding: "0 4px", lineHeight: 1 }} title="Refresh">↻</button>
          </>
        )}
        <span style={{ fontSize: 20 }}>{currentRoom?.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: "#fff", fontWeight: 600 }}>{currentRoom?.label}</div>
          {currentRoom?.subtitle && <div style={{ color: "#FF7E33", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700 }}>{currentRoom.subtitle}</div>}
        </div>
        {currentRoom?.type === "custom_group" && (
          <button onClick={() => setShowGroupMembers(v => !v)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 12px", color: "#BBBBBB", cursor: "pointer", fontSize: 12, flexShrink: 0 }}>👥 {roomMembers.length}</button>
        )}
      </div>
      {currentRoom?.type === "custom_group" && showGroupMembers && (() => {
        const mine = roomMembers.find(r => r.user_id === profile.id);
        const amCreator = mine?.is_creator;
        return (
          <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "10px 16px", background: "rgba(255,255,255,0.02)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {roomMembers.map(rm => (
                <span key={rm.user_id} style={{ background: "rgba(255,102,0,0.1)", border: "1px solid rgba(255,102,0,0.2)", borderRadius: 20, padding: "4px 10px", fontSize: 12, color: "#FF7E33", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {rm.profiles?.username ? `@${rm.profiles.username}` : formatName(rm.profiles?.full_name)}{rm.is_creator ? " ★" : ""}
                  {amCreator && rm.user_id !== profile.id && <span onClick={() => removeRoomMember(rm.user_id)} style={{ cursor: "pointer", color: "#ff6b6b", fontWeight: 700 }}>✕</span>}
                </span>
              ))}
            </div>
            {amCreator && (
              <>
                <input style={{ ...S.input, fontSize: 12, padding: "8px 12px" }} placeholder="Add a member..." value={addMemberSearch} onChange={e => setAddMemberSearch(e.target.value)} />
                {addMemberSearch.length > 1 && (
                  <div style={{ background: "rgba(10,10,10,0.98)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, marginTop: 4, maxHeight: 150, overflowY: "auto" }}>
                    {(members || []).filter(m => m.status === "approved" && !roomMembers.find(x => x.user_id === m.id) && ((m.full_name || "").toLowerCase().includes(addMemberSearch.toLowerCase()) || (m.username || "").toLowerCase().includes(addMemberSearch.toLowerCase()))).slice(0, 5).map(m => (
                      <div key={m.id} onClick={() => addRoomMember(m)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", cursor: "pointer", color: "#fff", fontSize: 12 }}>
                        <Avatar profile={m} size={22} /> {m.username ? `@${m.username}` : formatName(m.full_name)}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            <button onClick={() => removeRoomMember(profile.id)} style={{ background: "none", border: "none", color: "#8A8A8A", fontSize: 11, cursor: "pointer", marginTop: 6 }}>Leave group</button>
          </div>
        );
      })()}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.filter(m => !m.body?.startsWith('📢 [GROUP:')).length === 0 && <div style={{ textAlign: "center", padding: 40 }}><p style={S.muted}>No messages yet. Start the conversation.</p></div>}
        {messages.filter(m => !m.body?.startsWith('📢 [GROUP:')).map(msg => {
          const isOwn = msg.user_id === profile.id;
          const senderName = msg.sender_name || "Member";
          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: isOwn ? "row-reverse" : "row", alignItems: "flex-start", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: isOwn ? "rgba(255,102,0,0.3)" : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", color: isOwn ? "#FF6600" : "#666", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                {(msg.sender_name || "?")[0].toUpperCase()}
              </div>
              <div style={{ maxWidth: "75%" }}>
                <div style={{ fontSize: 10, color: "#8A8A8A", marginBottom: 3, textAlign: isOwn ? "right" : "left" }}>
                  {senderName} · {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
                {msg.body && (
                  <div style={{ background: isOwn ? "rgba(255,102,0,0.15)" : "rgba(255,255,255,0.05)", border: isOwn ? "1px solid rgba(255,102,0,0.2)" : "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 14, lineHeight: 1.6, wordBreak: "break-word" }}>
                    {msg.body}
                  </div>
                )}
                {msg.photo_url && (
                  isVideoUrl(msg.photo_url)
                    ? <video src={msg.photo_url} controls style={{ marginTop: 6, maxWidth: 220, borderRadius: 8, display: "block", marginLeft: isOwn ? "auto" : 0 }} />
                    : <img src={msg.photo_url} alt="shared photo" onClick={() => setLightbox(msg.photo_url)} style={{ marginTop: 6, maxWidth: 220, maxHeight: 220, borderRadius: 8, objectFit: "cover", cursor: "pointer", display: "block", marginLeft: isOwn ? "auto" : 0 }} />
                )}
                <div style={{ display: "flex", gap: 12, justifyContent: isOwn ? "flex-end" : "flex-start", marginTop: 2 }}>
                  {(isOwn || profile.role === "admin") && (
                    <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "#8A8A8A" }} onClick={() => deleteMessage(msg.id)}>delete</button>
                  )}
                  {!isOwn && (
                    <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "#8A8A8A" }} onClick={() => flagChatMessage(msg)}>⚑ report</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          <img src={lightbox} alt="full size" style={{ maxWidth: "92vw", maxHeight: "92vh", borderRadius: 8 }} />
          <button onClick={() => setLightbox(null)} style={{ position: "fixed", top: 20, right: 24, background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", fontSize: 22, width: 44, height: 44, borderRadius: "50%", cursor: "pointer" }}>✕</button>
        </div>
      )}
      {photoPreview && (
        <div style={{ padding: "8px 12px 0", position: "relative", display: "inline-block", marginLeft: 12 }}>
          <img src={photoPreview} alt="preview" style={{ maxHeight: 100, maxWidth: 160, borderRadius: 8, objectFit: "cover" }} />
          <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} style={{ position: "absolute", top: 14, right: 6, background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
      )}
      <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 8, alignItems: "center" }}>
        <input ref={msgPhotoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files[0]; e.target.value = ""; if (!f) return; if (!f.type.startsWith("image/")) { alert("Please choose an image."); return; } if (f.size > 5*1024*1024) { alert("Max 5MB"); return; } setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); }} />
        <button onClick={() => msgPhotoRef.current.click()} style={{ background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 10px", color: "#BBBBBB", cursor: "pointer", fontSize: 16, flexShrink: 0 }}><Camera size={16} /></button>
        <input style={{ ...S.input, flex: 1, fontSize: 16, padding: "10px 14px" }} placeholder="Type a message..." value={body} onChange={e => setBody(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }}} />
        <button style={{ ...S.btn, padding: "10px 16px", flexShrink: 0 }} onClick={send} disabled={posting || uploading || (!body.trim() && !photoFile)}>{uploading ? "⏳" : "Send"}</button>
      </div>
    </div>
  );

  if (isMobileChat) {
    return (
      <div style={{ margin: 0 }}>
        {showRoomList || !activeRoom ? ROOM_LIST : CHAT_VIEW}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 0, height: isMobileChat ? "calc(100dvh - 165px)" : "calc(100vh - 150px)", minHeight: isMobileChat ? 0 : 480, background: "#161b24", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
      {ROOM_LIST}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {!activeRoom ? (
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14 }}>
            <div style={{ width: "100%", maxWidth: 520 }}><TabCarousel slides={CHAT_SLIDES} /></div>
            <MessageCircle size={40} color="#555" strokeWidth={1.5} />
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, color: "#fff" }}>Select a conversation</p>
            <p style={S.muted}>Choose a group chat or direct message</p>
          </div>
        ) : CHAT_VIEW}
      </div>
    </div>
  );
}


// ─── Private Groups ───────────────────────────────────────────────────────────
const GROUP_POLICY = {
  open:     { label: "Open to all", icon: "🌐", color: "#5BD08A" },
  approval: { label: "By request",  icon: "✋", color: "#FF9E33" },
  private:  { label: "Private",     icon: "🔒", color: "#9AA0A6" },
};
const groupPolicy = (g) => GROUP_POLICY[g?.join_policy] || GROUP_POLICY.approval;
function PolicyBadge({ g }) {
  const m = groupPolicy(g);
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.06)", color: m.color, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>{m.icon} {m.label}</span>;
}

function PrivateGroups({ profile, allMembers }) {
  const [groups, setGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [members, setMembers] = useState([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [requests, setRequests] = useState([]);
  const bottomRef = useRef();
  const msgPhotoRef = useRef();
  const isMobile = useMobile();
  const [showList, setShowList] = useState(true);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  async function flagPGMessage(msg) {
    if (msg.user_id === profile.id) return;
    const what = msg.photo_url ? "photo" : "message";
    const reason = window.prompt(`Report this ${what} to the admins. What's the issue? (optional)`);
    if (reason === null) return;
    await supabase.from("member_flags").insert({ flagged_user_id: msg.user_id, flagged_by: profile.id, reason: `[private group ${what}] ${reason || (msg.body || "").slice(0, 80) || "no reason given"}` });
    alert("Reported. An admin will review it shortly.");
  }

  useEffect(() => { loadGroups(); }, []);
  useEffect(() => { if (activeGroup) { loadMessages(); loadMembers(); loadRequests(); } }, [activeGroup]);

  async function loadGroups() {
    // Membership rows are readable only for groups you belong to (see
    // sql/fix_anon_exposure.sql), so we ask for OUR OWN memberships directly
    // instead of pulling every group's member list down and filtering here.
    // The member counts on screen come from private_groups.member_count.
    const [{ data: all }, { data: mineRows }] = await Promise.all([
      supabase.from('private_groups').select('*').eq('approved', true).order('created_at', { ascending: false }),
      supabase.from('private_group_members').select('group_id').eq('user_id', profile.id),
    ]);
    const myIds = new Set((mineRows || []).map(r => r.group_id));
    setGroups(all || []);
    setMyGroups((all || []).filter(g => myIds.has(g.id)));
  }

  async function loadMessages() {
    const { data } = await supabase.from('messages').select('*').eq('room_id', `private_${activeGroup.id}`).order('created_at', { ascending: true }).limit(50);
    setMessages(data || []);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  async function loadMembers() {
    const { data } = await supabase.from('private_group_members').select('*, profiles(full_name, username, avatar_url, group_id)').eq('group_id', activeGroup.id);
    setMembers(data || []);
  }

  async function loadRequests() {
    if (activeGroup.created_by !== profile.id && profile.role !== 'admin') return;
    const { data } = await supabase.from('private_group_requests').select('*, profiles(full_name, username)').eq('group_id', activeGroup.id).eq('status', 'pending');
    setRequests(data || []);
  }

  async function createGroup() {
    if (!requireApproved(profile)) return;
    if (!form.name.trim()) return;
    setSaving(true);
    const { data } = await supabase.from('private_groups').insert({ name: form.name.trim(), description: form.description.trim(), created_by: profile.id, approved: profile.role === 'admin', member_count: 1 }).select().single();
    if (data) {
      await supabase.from('private_group_members').insert({ group_id: data.id, user_id: profile.id, role: 'creator' });
      if (profile.role !== 'admin') {
        // Notify admin
        await supabase.from('posts').insert({ user_id: profile.id, group_id: profile.group_id, body: `🔒 ${profile.username ? `@${profile.username}` : formatName(profile.full_name)} requested a new private group: "${form.name}"`, reactions: {} });
      }
    }
    setSaving(false);
    setShowCreate(false);
    setForm({ name: '', description: '' });
    loadGroups();
  }

  async function requestJoin(groupId) {
    if (!requireApproved(profile)) return;
    const { error } = await supabase.from('private_group_requests').insert({ group_id: groupId, user_id: profile.id, status: 'pending' });
    if (error) {
      alert(`Couldn't send your request: ${error.message}. Please try again.`);
      return;
    }
    alert('Request sent. The group creator will review it.');
    loadGroups();
  }

  // Open community groups: any approved member joins instantly (no request).
  async function joinOpenGroup(groupId) {
    if (!requireApproved(profile)) return;
    const { error } = await supabase.from('private_group_members').insert({ group_id: groupId, user_id: profile.id, role: 'member' });
    if (error) { alert(`Couldn't join: ${error.message}. Please try again.`); return; }
    await syncGroupCount(groupId);
    await loadGroups();
    if (activeGroup && activeGroup.id === groupId) loadMembers();
  }

  // Recompute member_count from the real DB count so it never drifts (and so
  // removals actually decrement it).
  async function syncGroupCount(groupId) {
    const { count } = await supabase.from('private_group_members').select('id', { count: 'exact', head: true }).eq('group_id', groupId);
    if (typeof count === 'number') await supabase.from('private_groups').update({ member_count: count }).eq('id', groupId);
  }

  async function approveRequest(reqId, userId, groupId) {
    await supabase.from('private_group_requests').update({ status: 'approved' }).eq('id', reqId);
    await supabase.from('private_group_members').insert({ group_id: groupId, user_id: userId, role: 'member' });
    await syncGroupCount(groupId);
    loadRequests(); loadMembers();
  }

  async function denyRequest(reqId) {
    await supabase.from('private_group_requests').update({ status: 'denied' }).eq('id', reqId);
    loadRequests();
  }

  async function addMember(userId) {
    const cap = activeGroup?.join_policy === 'private' ? 15 : null;
    if (cap && members.length >= cap) { alert(`This private group is limited to ${cap} members.`); return; }
    const exists = members.find(m => m.user_id === userId);
    if (exists) return;
    await supabase.from('private_group_members').insert({ group_id: activeGroup.id, user_id: userId, role: 'member' });
    await syncGroupCount(activeGroup.id);
    setMemberSearch('');
    loadMembers();
  }

  async function removeMemberFromGroup(userId) {
    await supabase.from('private_group_members').delete().eq('group_id', activeGroup.id).eq('user_id', userId);
    await syncGroupCount(activeGroup.id);
    loadMembers();
  }

  async function toggleModerator(m) {
    const newRole = m.role === 'moderator' ? 'member' : 'moderator';
    await supabase.from('private_group_members').update({ role: newRole }).eq('group_id', activeGroup.id).eq('user_id', m.user_id);
    loadMembers();
  }

  async function sendMessage() {
    if (!requireApproved(profile)) return;
    if ((!body.trim() && !photoFile) || !activeGroup) return;
    setSending(true);
    let photoUrl = null;
    if (photoFile) {
      setUploading(true);
      const ext = photoFile.name.split('.').pop();
      const path = `${profile.id}/pg_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, photoFile);
      if (!error) { const { data } = supabase.storage.from('avatars').getPublicUrl(path); photoUrl = data.publicUrl; }
      setUploading(false);
    }
    const senderName = profile.username ? `@${profile.username}` : formatName(profile.full_name);
    await supabase.from('messages').insert({ room_id: `private_${activeGroup.id}`, user_id: profile.id, body: body.trim(), sender_name: senderName, photo_url: photoUrl });
    notifyMembers({ kind: "message", room_id: `private_${activeGroup.id}`, actor_id: profile.id, preview: body.trim() || "📷" });
    setBody(''); setPhotoFile(null); setPhotoPreview(null);
    setSending(false);
    loadMessages();
  }

  async function approveGroup(id) {
    await supabase.from('private_groups').update({ approved: true }).eq('id', id);
    loadGroups();
  }

  async function deleteGroup(id) {
    if (!confirm('Delete this group?')) return;
    await supabase.from('private_groups').delete().eq('id', id);
    setActiveGroup(null);
    loadGroups();
  }

  const isMember = activeGroup && members.some(m => m.user_id === profile.id);
  const isCreator = activeGroup && activeGroup.created_by === profile.id;
  const myPGRole = activeGroup ? members.find(m => m.user_id === profile.id)?.role : null;
  const isPGMod = myPGRole === 'moderator';
  const canManage = isCreator || isPGMod || profile.role === 'admin';
  const pendingGroups = groups.filter(g => !g.approved);

  // GROUP LIST VIEW
  const GROUP_LIST = (
    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <span style={S.eyebrow}>Community</span>
          <h2 style={{ ...S.h2, margin: 0 }}>Community Groups</h2>
        </div>
        <button style={S.btn} onClick={() => setShowCreate(!showCreate)}>+ Create Group</button>
      </div>

      {showCreate && (
        <div style={{ ...S.card, marginBottom: 20, overflow: "hidden" }}>
          <span style={S.eyebrow}>New Private Group</span>
          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>Group Name</label>
            <input style={S.input} placeholder="Accountability Circle, Atlanta Brotherhood..." value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Description</label>
            <textarea style={{ ...S.input, minHeight: 60 }} placeholder="What is this group for?" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>
          <p style={{ color: '#555', fontSize: 12, marginBottom: 12 }}>{profile.role === 'admin' ? 'Group will be created immediately.' : 'Group requires admin approval before going live.'}</p>
          <button style={S.btn} onClick={createGroup} disabled={saving || !form.name.trim()}>{saving ? 'Submitting...' : 'Submit Request'}</button>
        </div>
      )}

      {profile.role === 'admin' && pendingGroups.length > 0 && (
        <div style={{ ...S.card, marginBottom: 20, borderTop: '3px solid #FF6600' }}>
          <span style={{ ...S.eyebrow, color: '#FF6600' }}>Pending Approval ({pendingGroups.length})</span>
          {pendingGroups.map(g => (
            <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <div style={{ color: '#fff', fontSize: 14 }}>{g.name}</div>
                <div style={{ color: '#888', fontSize: 12 }}>{g.description}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ ...S.btnSm, background: '#51cf66' }} onClick={() => approveGroup(g.id)}>Approve</button>
                <button style={S.btnDanger} onClick={() => deleteGroup(g.id)}>Deny</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {myGroups.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <span style={S.eyebrow}>My Groups</span>
          {myGroups.map(g => (
            <div key={g.id} style={{ ...S.card, marginBottom: 8, cursor: 'pointer', borderLeft: '3px solid #FF6600' }}
              onClick={() => { setActiveGroup(g); if (isMobile) setShowList(false); }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: '#fff', fontFamily: "'Inter', sans-serif", fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>{g.name} <PolicyBadge g={g} /></div>
                  {g.description && <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>{g.description}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#555', fontSize: 12 }}>{g.member_count || 1} members</span>
                  <span style={{ color: '#FF6600', fontSize: 18 }}>›</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <span style={S.eyebrow}>Discover Groups</span>
        {groups.filter(g => g.approved && !myGroups.find(m => m.id === g.id)).length === 0 && (
          <p style={S.muted}>No other groups to discover yet.</p>
        )}
        {groups.filter(g => g.approved && !myGroups.find(m => m.id === g.id)).map(g => {
          const open = g.join_policy === 'open';
          const priv = g.join_policy === 'private';
          return (
          <div key={g.id} style={{ ...S.card, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#fff', fontFamily: "'Inter', sans-serif", fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>{g.name} <PolicyBadge g={g} /></div>
                {g.description && <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>{g.description}</div>}
                <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>{g.member_count || 1} members</div>
              </div>
              {priv
                ? <span style={{ color: '#888', fontSize: 12, whiteSpace: 'nowrap' }}>Invite only</span>
                : <button style={S.btnSm} onClick={() => open ? joinOpenGroup(g.id) : requestJoin(g.id)}>{open ? 'Join' : 'Request'}</button>}
            </div>
          </div>
        );})}
      </div>
    </div>
  );

  // CHAT VIEW
  const CHAT_VIEW = activeGroup && (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: isMobile ? 'calc(100vh - 200px)' : '100%' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 12 }}>
        {isMobile && <button onClick={() => setShowList(true)} style={{ background: 'none', border: 'none', color: '#FF6600', cursor: 'pointer', fontSize: 20, padding: 0 }}>←</button>}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: '#fff' }}>{groupPolicy(activeGroup).icon} {activeGroup.name}</div>
          <div style={{ color: '#555', fontSize: 11 }}>{members.length} members · {groupPolicy(activeGroup).label}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {canManage && (
            <button style={{ ...S.btnSm, background: 'rgba(255,102,0,0.1)', color: '#FF6600', fontSize: 11 }} onClick={() => setShowAddMember(!showAddMember)}>+ Add</button>
          )}
          {profile.role === 'admin' && (
            <button style={S.btnDanger} onClick={() => deleteGroup(activeGroup.id)}>Delete</button>
          )}
        </div>
      </div>

      {showAddMember && canManage && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,102,0,0.04)' }}>
          <input style={{ ...S.input, marginBottom: 8, fontSize: 13 }} placeholder="Search members to add..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)} />
          {memberSearch.length > 1 && allMembers.filter(m => m.status === 'approved' && !members.find(x => x.user_id === m.id) && ((m.full_name||'').toLowerCase().includes(memberSearch.toLowerCase()) || (m.username||'').toLowerCase().includes(memberSearch.toLowerCase()))).slice(0,5).map(m => (
            <div key={m.id} onClick={() => addMember(m.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer' }}>
              <Avatar profile={m} size={26} />
              <span style={{ color: '#fff', fontSize: 13 }}>{m.username ? `@${m.username}` : formatName(m.full_name)}</span>
              <span style={{ color: '#FF6600', fontSize: 11, marginLeft: 'auto' }}>+ Add</span>
            </div>
          ))}
          <div style={{ marginTop: 8 }}>
            <span style={{ color: '#555', fontSize: 11 }}>Members ({members.length}{activeGroup?.join_policy === 'private' ? '/15' : ''}): </span>
            {members.map(m => (
              <span key={m.id} style={{ color: '#888', fontSize: 11, marginRight: 8 }}>
                {m.profiles?.username ? `@${m.profiles.username}` : formatName(m.profiles?.full_name)}
                {m.role === 'creator' ? ' ★' : m.role === 'moderator' ? ' (mod)' : ''}
                {(isCreator || profile.role === 'admin') && m.role !== 'creator' && m.user_id !== profile.id && (
                  <span onClick={() => toggleModerator(m)} style={{ color: '#C09A2F', cursor: 'pointer', marginLeft: 4 }} title={m.role === 'moderator' ? 'Remove moderator' : 'Make moderator'}>{m.role === 'moderator' ? '↓mod' : '↑mod'}</span>
                )}
                {canManage && m.role !== 'creator' && m.user_id !== profile.id && (
                  <span onClick={() => removeMemberFromGroup(m.user_id)} style={{ color: '#ff4444', cursor: 'pointer', marginLeft: 3 }}>✕</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {requests.length > 0 && canManage && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,102,0,0.04)' }}>
          <span style={{ color: '#FF6600', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Join Requests ({requests.length})</span>
          {requests.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
              <span style={{ color: '#fff', fontSize: 13 }}>{r.profiles?.username ? `@${r.profiles.username}` : formatName(r.profiles?.full_name)}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={{ ...S.btnSm, background: '#51cf66', padding: '4px 10px', fontSize: 11 }} onClick={() => approveRequest(r.id, r.user_id, r.group_id)}>✓</button>
                <button style={{ ...S.btnDanger, padding: '4px 10px', fontSize: 11 }} onClick={() => denyRequest(r.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isMember && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 32 }}>
          <span style={{ fontSize: 40 }}>🔒</span>
          <p style={{ color: '#888', textAlign: 'center' }}>You are not a member of this group.</p>
          {activeGroup.join_policy === 'private'
            ? <p style={{ color: '#666', fontSize: 13, textAlign: 'center' }}>This group is invite only.</p>
            : <button style={S.btn} onClick={() => activeGroup.join_policy === 'open' ? joinOpenGroup(activeGroup.id) : requestJoin(activeGroup.id)}>{activeGroup.join_policy === 'open' ? 'Join Group' : 'Request to Join'}</button>}
        </div>
      )}

      {isMember && (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.map(msg => {
              const isOwn = msg.user_id === profile.id;
              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                  {!isOwn && <div style={{ color: '#FF6600', fontSize: 11, marginBottom: 3, letterSpacing: '0.05em' }}>{msg.sender_name}</div>}
                  {msg.body && (
                    <div style={{ background: isOwn ? 'rgba(255,102,0,0.15)' : 'rgba(255,255,255,0.05)', border: isOwn ? '1px solid rgba(255,102,0,0.2)' : '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 14px', maxWidth: '75%', color: '#fff', fontSize: 14, lineHeight: 1.6 }}>
                      {msg.body}
                    </div>
                  )}
                  {msg.photo_url && (
                    isVideoUrl(msg.photo_url)
                      ? <video src={msg.photo_url} controls style={{ marginTop: 4, maxWidth: 220, borderRadius: 8, display: 'block' }} />
                      : <img src={msg.photo_url} alt="shared photo" onClick={() => setLightbox(msg.photo_url)} style={{ marginTop: 4, maxWidth: 220, maxHeight: 220, borderRadius: 8, objectFit: 'cover', cursor: 'pointer' }} />
                  )}
                  {!isOwn && (
                    <button onClick={() => flagPGMessage(msg)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: '#8A8A8A', marginTop: 2 }}>⚑ report</button>
                  )}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          {lightbox && (
            <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
              <img src={lightbox} alt="full size" style={{ maxWidth: '92vw', maxHeight: '92vh', borderRadius: 8 }} />
              <button onClick={() => setLightbox(null)} style={{ position: 'fixed', top: 20, right: 24, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', fontSize: 22, width: 44, height: 44, borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            </div>
          )}
          {photoPreview && (
            <div style={{ padding: '8px 12px 0' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={photoPreview} alt="preview" style={{ maxHeight: 90, maxWidth: 140, borderRadius: 8, objectFit: 'cover' }} />
                <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12 }}>✕</button>
              </div>
            </div>
          )}
          <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <input ref={msgPhotoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; if (!f.type.startsWith('image/')) { alert('Please choose an image.'); return; } if (f.size > 5 * 1024 * 1024) { alert('Max 5MB'); return; } setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); }} />
            <button onClick={() => msgPhotoRef.current.click()} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 10px', color: '#BBBBBB', cursor: 'pointer', flexShrink: 0 }}><Camera size={16} /></button>
            <input style={{ ...S.input, flex: 1, fontSize: 14, padding: '10px 14px' }} placeholder="Message..." value={body} onChange={e => setBody(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }}} />
            <button style={{ ...S.btn, padding: '10px 16px', flexShrink: 0 }} onClick={sendMessage} disabled={sending || uploading || (!body.trim() && !photoFile)}>{uploading ? '...' : 'Send'}</button>
          </div>
        </>
      )}
    </div>
  );

  if (isMobile) {
    return <div style={{ margin: '-16px -16px 0' }}>{showList || !activeGroup ? GROUP_LIST : CHAT_VIEW}</div>;
  }

  return (
    <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 130px)', minHeight: 400 }}>
      <div style={{ width: 280, borderRight: '1px solid rgba(255,255,255,0.05)', overflowY: 'auto' }}>{GROUP_LIST}</div>
      <div style={{ flex: 1 }}>{activeGroup ? CHAT_VIEW : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12 }}><span style={{ fontSize: 40 }}>🔒</span><p style={{ color: '#888' }}>Select a group or create one</p></div>}</div>
    </div>
  );
}


export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("feed");
  const [feedGroup, setFeedGroup] = useState("all");
  const [showSetup, setShowSetup] = useState(false);
  const [allMembers, setAllMembers] = useState([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [adminPending, setAdminPending] = useState(0);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!isStaff(profile)) { setAdminPending(0); return; }
    let active = true;
    async function loadAdminCount() {
      const [pm, pf, mf, pe, pr] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("post_flags").select("id", { count: "exact", head: true }).eq("reviewed", false),
        supabase.from("member_flags").select("id", { count: "exact", head: true }).eq("reviewed", false),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("approved", false),
        supabase.from("local_recommendations").select("id", { count: "exact", head: true }).eq("approved", false),
      ]);
      if (active) setAdminPending((pm.count || 0) + (pf.count || 0) + (mf.count || 0) + (pe.count || 0) + (pr.count || 0));
    }
    loadAdminCount();
    const interval = setInterval(loadAdminCount, 60000);
    return () => { active = false; clearInterval(interval); };
  }, [profile?.role, tab]);

  useEffect(() => {
    if (profile?.id) {
      let q = supabase.from("profiles").select(PROFILE_COLS).eq("status", "approved");
      if (profile.role !== "admin") {
        // Show everyone who shares ANY group with me (not just my primary group),
        // so multi-group members can find and DM each other.
        if (profile.group_ids?.length) q = q.overlaps("group_ids", profile.group_ids);
        else q = q.eq("group_id", profile.group_id);
      }
      q.then(({ data }) => setAllMembers(data || []));
      // Update last seen
      supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", profile.id);
      // Update every 2 minutes
      const interval = setInterval(() => {
        supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", profile.id);
      }, 120000);
      return () => clearInterval(interval);
    }
  }, [profile?.id]);

  // Keep the nav "Chat (N)" badge fresh: recompute on any new message, on a
  // timer, and when the tab regains focus. Previously it only ran once at login,
  // so incoming DMs/messages never showed up until a manual refresh.
  useEffect(() => {
    if (!profile?.id) return;
    checkUnread(profile);
    const ch = supabase
      .channel(`nav-unread-${profile.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => checkUnread(profile))
      .subscribe();
    const iv = setInterval(() => checkUnread(profile), 45000);
    const onFocus = () => checkUnread(profile);
    window.addEventListener("focus", onFocus);
    return () => { supabase.removeChannel(ch); clearInterval(iv); window.removeEventListener("focus", onFocus); };
  }, [profile?.id]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) loadProfile(data.session.user);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      else if (event === "SIGNED_IN") { if (session?.user) loadProfile(session.user); }
      else if (event === "SIGNED_OUT") { setUser(null); setProfile(null); setLoading(false); }
      // Ignore TOKEN_REFRESHED / USER_UPDATED / INITIAL_SESSION: getSession() above
      // handles the initial load, and re-fetching on every periodic token refresh
      // would overwrite in-memory (just-saved) profile edits with a stale DB read.
    });
    return () => subscription.unsubscribe();
  }, []);

  // Auto-update: phones (especially home-screen apps) cache the old bundle and
  // keep running stale code. Each Vite build produces a uniquely-hashed entry
  // file in index.html. We note the hash we loaded with, then on focus / every
  // few minutes fetch a fresh index.html; if its entry hash changed, a new
  // version is live, so reload to pick it up. One reload per version (guarded in
  // sessionStorage) so it can never loop.
  useEffect(() => {
    if (!import.meta.env || !import.meta.env.PROD) return; // dev uses HMR
    const entryRe = /assets\/[\w.-]*index[\w.-]*\.js/;
    const runningTag = (document.querySelector('script[type="module"][src*="assets/"]')?.getAttribute("src") || "").match(entryRe)?.[0];
    if (!runningTag) return;
    const check = async () => {
      try {
        const res = await fetch("/?_=" + Date.now(), { cache: "no-store" });
        const html = await res.text();
        const deployedTag = html.match(entryRe)?.[0];
        if (!deployedTag || deployedTag === runningTag) return;
        if (sessionStorage.getItem("esix10_reloaded_for") === deployedTag) return; // already reloaded for this version
        sessionStorage.setItem("esix10_reloaded_for", deployedTag);
        window.location.reload();
      } catch (e) {}
    };
    const onFocus = () => check();
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const iv = setInterval(check, 5 * 60 * 1000);
    check();
    return () => { window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onVisible); clearInterval(iv); };
  }, []);

  async function loadProfile(u) {
    setUser(u);
    try {
      const { data, error } = await supabase.from("profiles").select(PROFILE_COLS).eq("id", u.id).single();
      if (error && error.code === "PGRST116") {
        const isAdmin = u.email === ADMIN_EMAIL;
        const md = u.user_metadata || {};
        await supabase.from("profiles").insert({
          id: u.id,
          email: u.email,
          full_name: md.full_name || "",
          username: md.username || null,
          role: isAdmin ? "admin" : "member",
          status: isAdmin ? "approved" : "pending",
          terms_accepted_at: md.terms_accepted_at || null,
          terms_version: md.terms_version || null
        });
        const { data: newProfile } = await supabase.from("profiles").select(PROFILE_COLS).eq("id", u.id).single();
        if (newProfile) newProfile.email = u.email;   // own email from session, not the DB
        setProfile(newProfile);
        // NOTE: the admin "new member" text is sent once from GroupSelect.confirm()
        // when the member picks their group. We intentionally do NOT notify here —
        // loadProfile can run several times across auth events (getSession +
        // onAuthStateChange firing SIGNED_IN/TOKEN_REFRESHED/etc.), which was
        // sending the admin multiple texts for a single signup.
      } else if (error) {
        // Not "no row" (that's PGRST116, handled above) — a transient/network/RLS
        // error loading an EXISTING profile. Retry once; only fall back to setup if
        // there's genuinely no profile, so a blip never strands a real member.
        const { data: retry } = await supabase.from("profiles").select(PROFILE_COLS).eq("id", u.id).maybeSingle();
        if (retry) { retry.email = u.email; setProfile(retry); checkUnread(retry); }
        else if (!profile) { setShowSetup(true); }
      } else {
        if (u.email === ADMIN_EMAIL && (data.role !== "admin" || data.status !== "approved")) {
          await supabase.from("profiles").update({ role: "admin", status: "approved" }).eq("id", u.id);
          data.role = "admin";
          data.status = "approved";
        }
        data.email = u.email;   // own email from session, not the DB
        setProfile(data);
        // Check for unread messages
        checkUnread(data);
        // Show welcome modal on first login
        const welcomeKey = `esix10_welcomed_${u.id}`;
        if (!localStorage.getItem(welcomeKey) && data.status === "approved" && data.group_id) {
          setShowWelcome(true);
          localStorage.setItem(welcomeKey, "true");
        }
      }
    } catch(e) {
      // Network/unexpected error — don't strand an already-loaded member; only
      // show setup if we have no profile at all.
      if (!profile) setShowSetup(true);
    }
    setLoading(false);
  }

  async function checkUnread(p) {
    try {
      const userId = typeof p === "string" ? p : p?.id;
      if (!userId) return;
      const lastRead = JSON.parse(localStorage.getItem(`esix10_lastread_${userId}`) || "{}");

      // Build the set of rooms this user actually belongs to. Without this we'd
      // count other people's DMs and group chats the user isn't in — rooms they
      // can never open to clear, so the badge gets stuck.
      const myRooms = new Set();
      if (p && typeof p === "object") {
        myRooms.add(`group_${p.group_id}`);
        (p.group_ids || []).forEach(g => myRooms.add(`group_${g}`));
        if (p.role === "admin") {
          GROUPS.forEach(g => myRooms.add(`group_${g.id}`));
          myRooms.add("group_all");
        }
      }
      // Private/casual rooms the user has been added to.
      const { data: memRows } = await supabase.from("room_members").select("room_id").eq("user_id", userId);
      (memRows || []).forEach(r => myRooms.add(r.room_id));

      const isMine = (roomId) =>
        myRooms.has(roomId) ||
        (roomId.startsWith("dm_") && roomId.slice(3).split("_").includes(userId));

      const { data: messages } = await supabase.from("messages").select("room_id, created_at, user_id").order("created_at", { ascending: false }).limit(200);
      if (!messages) return;
      let unread = 0;
      const rooms = [...new Set(messages.map(m => m.room_id))];
      rooms.forEach(roomId => {
        if (!isMine(roomId)) return; // skip conversations that aren't this user's
        const roomMessages = messages.filter(m => m.room_id === roomId);
        // only the latest message from someone OTHER than me counts — your own messages never show as unread
        const lastFromOther = roomMessages.find(m => m.user_id !== userId);
        if (!lastFromOther) return;
        const lastReadTime = lastRead[roomId] || "2000-01-01";
        if (msgTime(lastFromOther.created_at) > new Date(lastReadTime)) unread++;
      });
      setUnreadCount(unread);
    } catch(e) {}
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null); setProfile(null);
  }

  const isMobile = useMobile();

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 24, color: "#FF7E33" }}>ESix10</span>
        <p style={{ color: "#8A8A8A", marginTop: 8, fontSize: 13 }}>Loading...</p>
      </div>
    </div>
  );

  if (recovering) return <PasswordResetScreen onDone={() => setRecovering(false)} />;
  if (!user) return <AuthScreen onAuth={(u) => loadProfile(u)} />;
  if (showSetup) return <SetupModal onClose={() => { setShowSetup(false); loadProfile(user); }} />;
  if (!profile?.group_id) return <GroupSelect user={user} onSelect={(g, groups) => { setProfile({ ...profile, group_id: g, group_ids: groups }); setFeedGroup(g); }} />;
  if (profile && profile.terms_version !== LEGAL_VERSION) return (
    <AgreementGate
      title="Terms of Use & Privacy"
      intro={`Please read and accept to continue. Effective ${LEGAL_EFFECTIVE}.`}
      sections={[...TERMS, { h: "— Privacy Policy —", p: "" }, ...PRIVACY]}
      agreeLabel="I have read and agree to the Terms of Use and Privacy Policy."
      onAgree={async () => { const ts = new Date().toISOString(); await supabase.from("profiles").update({ terms_accepted_at: ts, terms_version: LEGAL_VERSION }).eq("id", profile.id); setProfile({ ...profile, terms_accepted_at: ts, terms_version: LEGAL_VERSION }); }}
      onDecline={signOut}
    />
  );
  if (isStaff(profile) && !profile.mod_agreement_at) return (
    <AgreementGate
      title="Moderator Agreement"
      intro="You have moderator access. Please read and accept before continuing."
      sections={MOD_AGREEMENT}
      agreeLabel="I have read and agree to the Moderator Agreement."
      onAgree={async () => { const ts = new Date().toISOString(); await supabase.from("profiles").update({ mod_agreement_at: ts }).eq("id", profile.id); setProfile({ ...profile, mod_agreement_at: ts }); }}
      onDecline={signOut}
    />
  );
  if (profile && (!profile.username || profile.username.length < 3 || !profile.state || !profile.state.trim())) {
    return <ProfileCompletionGate profile={profile} onDone={(p) => setProfile(p)} onSignOut={signOut} />;
  }
  if (showWelcome && profile?.group_id) return <WelcomeModal profile={profile} onClose={() => setShowWelcome(false)} />;
  if (showShare) return <ShareESix10 profile={profile} onClose={() => setShowShare(false)} />;

  const myGroup = GROUPS.find(g => g.id === profile.group_id);
  const isAdmin = profile?.role === "admin";

  const NAV_ITEMS = [
    { id: "feed", label: "Feed", icon: "📋" },
    { id: "forge", label: "Forge", icon: "🔥" },
    { id: "create", label: "", fab: true },
    { id: "messages", label: unreadCount > 0 ? `Chat (${unreadCount})` : "Chat", icon: "💬" },
    { id: "more", label: "More", icon: "☰" },
  ];

  const MORE_GROUPS = [
    ...(isStaff(profile) ? [{ section: null, items: [{ id: "admin", label: adminPending > 0 ? `Admin (${adminPending})` : "Admin" }] }] : []),
    { section: "My Account", items: [
      { id: "profile", label: "My Profile" },
      { id: "stats", label: "Stats Dashboard" },
    ] },
    { section: "Community", items: [
      { id: "members", label: "Members" },
      { id: "prayer", label: "Prayer Wall" },
      { id: "events", label: "Events" },
      { id: "local", label: "Local Community" },
      { id: "privategroups", label: "Community Groups" },
      { id: "social", label: "Social Media" },
    ] },
    { section: "Faith & Growth", items: [
      { id: "devotion", label: "Daily Devotion" },
      { id: "faith", label: "Statement of Faith" },
      { id: "salvation", label: "Do You Know Him?" },
    ] },
    { section: "Media", items: [
      { id: "media", label: "Media" },
    ] },
    { section: "ESix10", items: [
      { id: "shop", label: "Shop", external: "https://esix10.com/shop/" },
      { id: "share", label: "Share ESix10" },
    ] },
    { section: "Info", items: [
      { id: "legal", label: "Legal & Privacy" },
    ] },
  ];
  const MORE_ITEMS = MORE_GROUPS.flatMap(g => g.items);

  const CONTENT = (
    <div style={{ flex: 1, padding: isMobile ? (tab === "messages" ? "0px" : "20px 16px 110px") : "32px 32px 60px", maxWidth: isMobile ? "100%" : 800, overflow: "hidden", boxSizing: "border-box" }}>
      {!isApproved(profile) && (
        <div style={{ background: "rgba(252,196,25,0.1)", border: "1px solid rgba(252,196,25,0.3)", color: "#fcc419", padding: "12px 16px", borderRadius: 8, marginBottom: 16, fontSize: 13, lineHeight: 1.5 }}>
          ⏳ <strong>Your profile is under review.</strong> You can browse and react now — posting, messaging, kudos, and joining groups unlock once an admin approves you (usually within 24–48 hours).
        </div>
      )}
      {tab === "feed" && (
        <div>
          {isMobile && (
            <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
              {[{ id: "all", label: "All" }, ...(profile.role === "admin" ? GROUPS : GROUPS.filter(g => (profile.group_ids && profile.group_ids.length > 0 ? profile.group_ids : [profile.group_id]).includes(g.id)))].map(g => (
                <button key={g.id} onClick={() => setFeedGroup(g.id)}
                  style={{ ...S.tab(feedGroup === g.id), padding: "8px 14px", fontSize: 11, whiteSpace: "nowrap", flexShrink: 0, border: "none", cursor: "pointer" }}>
                  {g.label || "All"}
                </button>
              ))}
            </div>
          )}
          {isMobile && GROUPS.find(g => g.id === feedGroup)?.subtitle && (
            <p style={{ color: "#FF7E33", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700, margin: "-6px 0 16px 2px" }}>{GROUPS.find(g => g.id === feedGroup).subtitle}</p>
          )}
          <Feed profile={profile} activeGroup={feedGroup} setActiveGroup={setFeedGroup} onNavigate={setTab} />
        </div>
      )}
      {tab === "forge" && <TheForge profile={profile} />}
      {tab === "prayer" && <PrayerRequests profile={profile} />}
      {tab === "devotion" && <Devotion profile={profile} />}
      {tab === "events" && <Events profile={profile} />}
      {tab === "messages" && <Messages profile={profile} members={allMembers} onRead={() => checkUnread(profile)} />}
      {tab === "members" && <Members profile={profile} onNavigate={setTab} />}
      {tab === "media" && <Media profile={profile} />}
      {tab === "local" && <LocalChapter profile={profile} />}
      {tab === "social" && <SocialFeed profile={profile} />}
      {tab === "share" && <div style={{ textAlign: "center", padding: 60 }}><div style={{ fontSize: 48, marginBottom: 16 }}>📤</div><button style={S.btn} onClick={() => setShowShare(true)}>Open Share Screen</button></div>}
      {tab === "privategroups" && <PrivateGroups profile={profile} allMembers={allMembers} />}
      {tab === "legal" && <LegalAndPrivacy onBack={() => setTab("more")} />}
      {tab === "faith" && <StatementOfFaith onBack={() => setTab("more")} />}
      {tab === "salvation" && <PlanOfSalvation onBack={() => setTab("more")} profile={profile} />}
      {tab === "profile" && <Profile profile={profile} onUpdate={setProfile} onSignOut={signOut} />}
      {tab === "stats" && <StatsDashboard profile={profile} />}
      {tab === "admin" && <AdminDashboard profile={profile} />}
    </div>
  );

  return (
    <div style={{ ...S.app, paddingBottom: isMobile ? 60 : 0 }}>
      <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{GLOBAL_CSS}</style>

      {/* NAV */}
      <nav style={{ ...S.nav, height: isMobile ? 60 : 72, padding: isMobile ? "0 12px" : "0 32px" }}>
        <img src="/esix10logo-dark.png" alt="ESix10" style={{ height: isMobile ? 60 : 88, width: "auto", objectFit: "contain" }} />
        <div style={S.navRight}>
          <button onClick={() => window.location.reload()} style={{ background: "none", border: "none", color: "#BBBBBB", fontSize: 18, cursor: "pointer", padding: "4px 6px", lineHeight: 1, display: "flex", alignItems: "center" }} title="Refresh">↻</button>
          <span style={{ ...S.badge, fontSize: 10 }}>
            {(profile.group_ids && profile.group_ids.length > 1) 
              ? profile.group_ids.map(id => GROUPS.find(g => g.id === id)?.icon).join(" ")
              : `${myGroup?.icon} ${myGroup?.label}`}
          </span>
          {isAdmin && !isMobile && <span style={{ ...S.badge, background: "rgba(255,102,0,0.3)", color: "#FF7E33" }}>Admin</span>}
          {profile?.role === "moderator" && !isMobile && <span style={{ ...S.badge, background: "rgba(192,154,47,0.25)", color: "#C09A2F" }}>Mod</span>}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {!isMobile && <LevelBadgeForUser profile={profile} fontSize={10} />}
            <Avatar profile={profile} size={36} onClick={() => setTab("profile")} />
          </div>
        </div>
      </nav>

      {isMobile ? (
        <div style={{ paddingTop: 72 }}>
          {CONTENT}
          {/* MORE OVERLAY */}
          {tab === "more" && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,10,0.97)", zIndex: 200, display: "flex", flexDirection: "column", overflowY: "auto", paddingBottom: 90 }}>
              <div style={{ padding: "18px 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div onClick={() => setTab("feed")} style={{ color: "#FF7E33", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>‹ Back</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, letterSpacing: "0.3em", color: "#FF7E33", textTransform: "uppercase" }}>More</div>
                <div onClick={() => setTab("feed")} style={{ color: "#9aa4b2", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>✕</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "0 20px" }}>
                {MORE_GROUPS.map(group => (
                  <div key={group.section || "pinned"}>
                    {group.section && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, letterSpacing: "0.2em", color: "#8A8A8A", textTransform: "uppercase", margin: "0 4px 10px" }}>{group.section}</div>}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {group.items.map(item => (
                        <div key={item.id} onClick={() => { if (item.external) { window.open(item.external, "_blank", "noopener,noreferrer"); } else if (item.id === "share") { setShowShare(true); } else { setTab(item.id); } }}
                          style={{ padding: "16px 20px", background: "rgba(255,102,0,0.05)", border: "1px solid rgba(255,102,0,0.15)", borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                          <NavIcon id={item.id} size={24} color="#FF7E33" />
                          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, color: "#fff" }}>{item.label}</span>
                          <span style={{ marginLeft: "auto", color: "#8A8A8A", fontSize: 18 }}>›</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: "24px 20px", textAlign: "center" }}>
                <div onClick={() => setTab("feed")} style={{ color: "#8A8A8A", fontSize: 13, cursor: "pointer" }}>← Back to Feed</div>
                <div style={{ color: "#555", fontSize: 10, marginTop: 14 }}>
                  Build {(typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : "dev").replace("T", " ").slice(0, 16)} UTC
                </div>
              </div>
            </div>
          )}

          {/* FLOATING BOTTOM NAV */}
          {showCreate && (
            <div onClick={() => setShowCreate(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 350, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
              <div onClick={e => e.stopPropagation()} style={{ background: "#161b24", borderTopLeftRadius: 20, borderTopRightRadius: 20, width: "100%", maxWidth: 480, padding: "14px 16px 30px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, margin: "0 auto 14px" }} />
                <p style={{ ...S.eyebrow, marginBottom: 8 }}>Create</p>
                {[
                  { label: "Share to the Feed", sub: "Post a win, a thought, a photo", icon: "📋", to: "feed" },
                  { label: "Prayer Request", sub: "Ask the community to lift you up", icon: "🙏", to: "prayer" },
                  { label: "Log a Walk or Workout", sub: "The Forge", icon: "🔥", to: "forge" },
                  { label: "Submit an Event", sub: "Gather in person", icon: "📅", to: "events" },
                ].map(a => (
                  <div key={a.to} onClick={() => { setShowCreate(false); setTab(a.to); }} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 8px", cursor: "pointer", borderRadius: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(255,102,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{a.icon}</div>
                    <div><div style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>{a.label}</div><div style={{ color: "#9aa4b2", fontSize: 12 }}>{a.sub}</div></div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ position: "fixed", bottom: 16, left: 12, right: 12, zIndex: 300 }}>
            <div style={{
              background: "rgba(13,17,23,0.97)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,102,0,0.2)", 
              borderRadius: 24, 
              padding: "10px 8px",
              display: "flex",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,102,0,0.1), inset 0 1px 0 rgba(255,255,255,0.05)"
            }}>
              {NAV_ITEMS.map(item => {
                if (item.fab) {
                  return (
                    <div key="create" style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                      <div onClick={() => setShowCreate(true)} aria-label="Create" style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#FF6600,#E55A00)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 30, fontWeight: 300, marginTop: -30, boxShadow: "0 6px 18px rgba(255,102,0,0.5)", cursor: "pointer", lineHeight: 1, border: "3px solid #0d1117" }}>+</div>
                    </div>
                  );
                }
                const isActive = tab === item.id || (item.id === "more" && MORE_ITEMS.some(m => m.id === tab));
                return (
                  <div key={item.id} onClick={() => setTab(item.id)}
                    style={{ 
                      flex: 1, 
                      display: "flex", 
                      flexDirection: "column", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      gap: 3,
                      cursor: "pointer", 
                      padding: "6px 4px",
                      borderRadius: 16,
                      background: isActive ? "linear-gradient(135deg, rgba(255,102,0,0.2), rgba(192,154,47,0.1))" : "transparent",
                      transition: "all 0.2s ease"
                    }}>
                    <div style={{ position: "relative", display: "inline-block" }}>
                      <span style={{
                        filter: isActive ? "drop-shadow(0 0 6px rgba(255,102,0,0.6))" : "none",
                        transition: "filter 0.2s",
                        display: "flex"
                      }}><NavIcon id={item.id} size={22} color={isActive ? "#FF6600" : "#c8cdd6"} /></span>
                      {item.id === "messages" && unreadCount > 0 && (
                        <span style={{ position: "absolute", top: -4, right: -6, background: "#ff4444", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, border: "2px solid rgba(10,12,18,1)" }}>
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </div>
                    <span style={{ 
                      fontSize: 9, 
                      letterSpacing: "0.08em", 
                      textTransform: "uppercase",
                      color: isActive ? "#FF6600" : "#c8cdd6",
                      fontWeight: isActive ? 700 : 400,
                      transition: "color 0.2s"
                    }}>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", paddingTop: 80 }}>
          {/* SIDEBAR */}
          <div style={{ width: 200, minHeight: "calc(100vh - 70px)", borderRight: "1px solid rgba(255,255,255,0.04)", padding: "24px 12px", position: "sticky", top: 70, flexShrink: 0, background: "rgba(13,17,23,0.5)" }}>
            <div style={{ marginBottom: 24 }}>
              <p style={{ ...S.eyebrow, marginBottom: 12 }}>Feed</p>
              {[{ id: "all", label: "My Feed", icon: "◎" }, ...(profile.role === "admin" ? GROUPS : GROUPS.filter(g => (profile.group_ids && profile.group_ids.length > 0 ? profile.group_ids : [profile.group_id]).includes(g.id)))].map(g => (
                <div key={g.id} onClick={() => { setTab("feed"); setFeedGroup(g.id); }}
                  style={{ padding: "10px 12px", borderRadius: 4, cursor: "pointer", marginBottom: 2, background: tab === "feed" && feedGroup === g.id ? "rgba(255,102,0,0.1)" : "transparent", color: tab === "feed" && feedGroup === g.id ? "#FF6600" : "#c8cdd6", fontSize: 13, display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <NavIcon id={g.id} size={18} style={{ marginTop: 1, flexShrink: 0 }} />
                  <div>
                    <div>{g.label || "My Feed"}</div>
                    {g.subtitle && <div style={{ fontSize: 9, color: "#FF7E33", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, opacity: 0.85, marginTop: 1 }}>{g.subtitle}</div>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 24 }}>
              <p style={{ ...S.eyebrow, marginBottom: 12 }}>Navigation</p>
              {[...(isStaff(profile) ? [{ id: "admin", label: adminPending > 0 ? `Admin (${adminPending})` : "Admin", icon: "🛡️" }] : []), { id: "forge", label: "The Forge", icon: "🔥" }, { id: "prayer", label: "Prayer", icon: "🙏" }, { id: "messages", label: unreadCount > 0 ? `Chat (${unreadCount})` : "Chat", icon: "💬" }, { id: "profile", label: "My Profile", icon: "👤" }, { id: "stats", label: "Stats", icon: "📊" }, { id: "members", label: "Members", icon: "👥" }, { id: "devotion", label: "Devotion", icon: "📖" }, { id: "social", label: "Social", icon: "📱" }, { id: "share", label: "Share ESix10", icon: "📤" }, { id: "events", label: "Events", icon: "📅" }, { id: "privategroups", label: "Community Groups", icon: "🔒" }, { id: "local", label: "Local", icon: "📍" }, { id: "faith", label: "Statement of Faith", icon: "✝️" }, { id: "salvation", label: "Do You Know Him?", icon: "🙏" }, { id: "media", label: "Media", icon: "📺" }].map(item => (
                <div key={item.id} onClick={() => { if (item.id === "share") { setShowShare(true); } else { setTab(item.id); } }}
                  style={{ padding: "10px 12px", borderRadius: 4, cursor: "pointer", marginBottom: 2, background: tab === item.id ? "rgba(255,102,0,0.1)" : "transparent", color: tab === item.id ? "#FF6600" : "#888", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  <NavIcon id={item.id} size={18} /> {item.label}
                </div>
              ))}
            </div>
            <div style={{ paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: 12, color: "#8A8A8A", marginBottom: 2 }}>{profile.username ? `@${profile.username}` : formatName(profile.full_name)}</div>
              <div style={{ fontSize: 11, color: "#444" }}>{profile.email}</div>
            </div>
          </div>
          {CONTENT}
        </div>
      )}
    </div>
  );
}
