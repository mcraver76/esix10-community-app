// The home feed: hero, activity ticker, personal header and the post list.
import React, { useState, useEffect, useRef } from "react";
import { Award, Camera, Eye, Flag, Flame, Footprints, MapPin } from "lucide-react";
import { S } from "./styles";
import { GROUPS, REACTIONS, VERSES, CHARGES } from "./constants";
import { supabase } from "./supabaseClient";
import { formatName, localDateStr } from "./helpers";
import { LevelIcon } from "./icons";
import { displayName, fetchProfileStats, getLevel, getXP } from "./stats";
import { isStaff, requireApproved } from "./permissions";
import { Badges } from "./profile";
import { getTodaysDevotion } from "./dailyDevotions";

export const getTodayVerse = () => {
  const day = new Date().getDay();
  return VERSES[day % VERSES.length];
};

export const getTodayCharge = () => CHARGES[new Date().getDate() % CHARGES.length];

export function isVideoUrl(url) {
  if (!url) return false;
  return /\.(mp4|mov|webm|m4v|avi|mkv)(\?|$)/i.test(url);
}

// ─── Activity Ticker ──────────────────────────────────────────────────────────
export function ActivityTicker({ profile }) {
  const [activities, setActivities] = useState([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => { loadActivity(); }, []);
  useEffect(() => {
    if (activities.length === 0) return;
    const timer = setInterval(() => setIdx(i => (i + 1) % activities.length), 4000);
    return () => clearInterval(timer);
  }, [activities]);

  async function loadActivity() {
    const items = [];
    // Recent walks
    const { data: walks } = await supabase.from("forge_walks").select("*, profiles(username, full_name)").eq("date", localDateStr()).order("created_at", { ascending: false }).limit(5);
    (walks || []).forEach(w => {
      const name = w.profiles?.username ? `@${w.profiles.username}` : formatName(w.profiles?.full_name);
      items.push(`🚶 ${name} logged ${w.distance_miles ? w.distance_miles + " mi" : "a walk"} today`);
    });
    // Recent posts
    const { data: posts } = await supabase.from("posts").select("*, profiles(username, full_name)").eq("group_id", profile.group_id).order("created_at", { ascending: false }).limit(3);
    (posts || []).forEach(p => {
      const name = p.profiles?.username ? `@${p.profiles.username}` : formatName(p.profiles?.full_name);
      items.push(`📋 ${name} posted in ${profile.group_id}`);
    });
    // Recent challenge completions
    const { data: challenges } = await supabase.from("forge_challenge_completions").select("*, profiles(username, full_name)").order("created_at", { ascending: false }).limit(5);
    (challenges || []).forEach(c => {
      const name = c.profiles?.username ? `@${c.profiles.username}` : formatName(c.profiles?.full_name);
      items.push(`⚡ ${name} completed today's challenge`);
    });
    // Recent WOD completions
    const { data: wods } = await supabase.from("forge_wod_completions").select("*, profiles(username, full_name)").order("created_at", { ascending: false }).limit(5);
    (wods || []).forEach(w => {
      const name = w.profiles?.username ? `@${w.profiles.username}` : formatName(w.profiles?.full_name);
      items.push(`🏋️ ${name} crushed today's WOD`);
    });
    if (items.length === 0) items.push("🔥 Be the first to log activity today");
    setActivities(items);
  }

  if (activities.length === 0) return null;

  return (
    <div className="activity-ticker">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#FF7E33", flexShrink: 0 }}>Live</span>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#51cf66", flexShrink: 0, animation: "pulse 1.5s infinite" }} />
        <span style={{ color: "#FFFFFF", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} className="activity-item">
          {activities[idx]}
        </span>
      </div>
    </div>
  );
}

// ─── Personal Feed Header ─────────────────────────────────────────────────────
export function PersonalHeader({ profile }) {
  const [localCount, setLocalCount] = useState(0);
  const [lastVisitSummary, setLastVisitSummary] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => { loadPersonalData(); }, [profile?.id, profile?.state]);

  async function loadPersonalData() {
    const cachedStats = await fetchProfileStats(profile.id);
    setStats(cachedStats);

    if (profile.state) {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("state", profile.state)
        .eq("status", "approved");

      setLocalCount(count || 0);
    }

    const lastVisit = localStorage.getItem(`esix10_lastvisit_${profile.id}`);
    if (lastVisit) {
      const { count: newPosts } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .gt("created_at", lastVisit)
        .in("group_id", profile.group_ids || [profile.group_id]);

      const { count: newPrayers } = await supabase
        .from("prayers")
        .select("*", { count: "exact", head: true })
        .gt("created_at", lastVisit)
        .eq("group_id", profile.group_id);

      if (newPosts > 0 || newPrayers > 0) {
        setLastVisitSummary({ posts: newPosts || 0, prayers: newPrayers || 0 });
      }
    }

    localStorage.setItem(`esix10_lastvisit_${profile.id}`, new Date().toISOString());
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = profile.full_name?.split(" ")[0] || profile.username || "Warrior";
  const xp = stats?.xp ?? getXP(profile);
  const level = getLevel(xp);
  const walkStreak = stats?.walkStreak || 0;
  const kudosCount = stats?.kudosCount || 0;

  return (
    <div style={{ marginBottom: 20, animation: "fadeIn 0.4s ease" }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 400, color: "#fff", marginBottom: 2 }}>
          {greeting}, {firstName}.
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span className="level-badge" style={{ background: `${level.color}20`, color: level.color, border: `1px solid ${level.color}40`, fontSize: 11 }}>
            <LevelIcon level={level} size={13} /> {level.name}
          </span>
          {profile.state && localCount > 0 && (
            <span style={{ color: "#8A8A8A", fontSize: 12 }}><MapPin size={11} style={{ verticalAlign: "-1px", marginRight: 2 }} /> {localCount} members in {profile.state}</span>
          )}
        </div>
      </div>

      {lastVisitSummary && (lastVisitSummary.posts > 0 || lastVisitSummary.prayers > 0) && (
        <div style={{ background: "linear-gradient(135deg, rgba(255,102,0,0.08), rgba(192,154,47,0.06))", border: "1px solid rgba(255,102,0,0.2)", borderRadius: 10, padding: "10px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <Eye size={15} color="#FF7E33" strokeWidth={1.75} />
          <p style={{ color: "#FFFFFF", fontSize: 13 }}>
            Since your last visit:
            {lastVisitSummary.posts > 0 && <span style={{ color: "#FF7E33" }}> {lastVisitSummary.posts} new post{lastVisitSummary.posts !== 1 ? "s" : ""}</span>}
            {lastVisitSummary.posts > 0 && lastVisitSummary.prayers > 0 && <span style={{ color: "#8A8A8A" }}> · </span>}
            {lastVisitSummary.prayers > 0 && <span style={{ color: "#FF7E33" }}> {lastVisitSummary.prayers} prayer request{lastVisitSummary.prayers !== 1 ? "s" : ""}</span>}
          </p>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
        {walkStreak > 0 && (
          <div style={{ background: "rgba(255,102,0,0.06)", border: "1px solid rgba(255,102,0,0.15)", borderRadius: 10, padding: "10px 16px", flexShrink: 0, textAlign: "center", minWidth: 80 }}>
            <div style={{ marginBottom: 2, display: "flex", justifyContent: "center" }}><Flame size={20} color="#FF7E33" strokeWidth={1.75} /></div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, color: "#FF7E33", lineHeight: 1 }}>{walkStreak}</div>
            <div style={{ color: "#8A8A8A", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>Streak</div>
          </div>
        )}

        {kudosCount > 0 && (
          <div style={{ background: "rgba(255,102,0,0.06)", border: "1px solid rgba(255,102,0,0.15)", borderRadius: 10, padding: "10px 16px", flexShrink: 0, textAlign: "center", minWidth: 80 }}>
            <div style={{ marginBottom: 2, display: "flex", justifyContent: "center" }}><Award size={20} color="#FF7E33" strokeWidth={1.75} /></div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, color: "#FF7E33", lineHeight: 1 }}>{kudosCount}</div>
            <div style={{ color: "#8A8A8A", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>Kudos</div>
          </div>
        )}

        <div style={{ background: "rgba(255,102,0,0.06)", border: "1px solid rgba(255,102,0,0.15)", borderRadius: 10, padding: "10px 16px", flexShrink: 0, textAlign: "center", minWidth: 80 }}>
          <div style={{ marginBottom: 2, display: "flex", justifyContent: "center" }}><LevelIcon level={level} size={20} style={{ marginRight: 0 }} /></div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: level.color, lineHeight: 1 }}>{level.name}</div>
          <div style={{ color: "#8A8A8A", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>{xp} XP</div>
        </div>

        {stats?.totalMiles > 0 && (
          <div style={{ background: "rgba(255,102,0,0.06)", border: "1px solid rgba(255,102,0,0.15)", borderRadius: 10, padding: "10px 16px", flexShrink: 0, textAlign: "center", minWidth: 80 }}>
            <div style={{ marginBottom: 2, display: "flex", justifyContent: "center" }}><Footprints size={20} color="#FF7E33" strokeWidth={1.75} /></div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, color: "#FF7E33", lineHeight: 1 }}>{stats.totalMiles.toFixed(1)}</div>
            <div style={{ color: "#8A8A8A", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>Miles</div>
          </div>
        )}

        {profile.state && localCount > 1 && (
          <div style={{ background: "rgba(255,102,0,0.06)", border: "1px solid rgba(255,102,0,0.15)", borderRadius: 10, padding: "10px 16px", flexShrink: 0, textAlign: "center", minWidth: 80 }}>
            <div style={{ marginBottom: 2, display: "flex", justifyContent: "center" }}><MapPin size={20} color="#FF7E33" strokeWidth={1.75} /></div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, color: "#FF7E33", lineHeight: 1 }}>{localCount}</div>
            <div style={{ color: "#8A8A8A", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>{profile.state}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export function HomeHero({ onNavigate }) {
  const [event, setEvent] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [i, setI] = useState(0);
  const touch = useRef(null);
  useEffect(() => {
    (async () => {
      const { data: ev } = await supabase.from("events").select("*").eq("approved", true).gte("event_date", new Date().toISOString()).order("event_date", { ascending: true }).limit(1);
      if (ev && ev[0]) setEvent(ev[0]);
      const { data: ch } = await supabase.from("forge_challenges").select("*").eq("scheduled_date", localDateStr()).limit(1);
      if (ch && ch[0]) setChallenge(ch[0]);
    })();
  }, []);
  const verse = getTodayVerse();
  const dev = getTodaysDevotion(new Date());
  const slides = [
    { eyebrow: "Word for Today", title: `"${verse.text}"`, sub: verse.ref.toUpperCase() },
    { eyebrow: "Daily Devotion", title: dev.title, sub: dev.body, cta: { label: "Read devotion", to: "devotion" } },
    { eyebrow: "Daily Charge", title: getTodayCharge(), sub: "Steadfast. Unmovable." },
    { eyebrow: "Stand in the Gap", title: "Someone here needs prayer today.", sub: "Lift a brother or sister up.", cta: { label: "Open Prayer Wall", to: "prayer" } },
    { eyebrow: "The Movement", title: "Prepared. Equipped. Unshaken.", sub: "Bring someone with you.", cta: { label: "Invite & Share", to: "share" } },
  ];
  if (event) slides.push({ eyebrow: "Upcoming Event", title: event.title, sub: event.event_date ? new Date(event.event_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "", cta: { label: "View event", to: "events" } });
  if (challenge) slides.push({ eyebrow: "Today's Challenge", title: challenge.title, sub: challenge.description || "Take it on today.", cta: { label: "Go to The Forge", to: "forge" } });
  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setI(p => (p + 1) % slides.length), 6500);
    return () => clearInterval(t);
  }, [slides.length]);
  const idx = Math.min(i, slides.length - 1);
  const s = slides[idx];
  const go = (d) => setI(p => (p + d + slides.length) % slides.length);
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        onTouchStart={e => { touch.current = e.touches[0].clientX; }}
        onTouchEnd={e => { if (touch.current == null) return; const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); touch.current = null; }}
        style={{ position: "relative", borderRadius: 18, overflow: "hidden", background: "linear-gradient(135deg,#FF6600 0%,#b8430a 48%,#1a1206 100%)", minHeight: 190 }}>
        <img src="/esix10logo.png" alt="" style={{ position: "absolute", right: -28, bottom: -24, width: 190, opacity: 0.12, filter: "brightness(0) invert(1)", pointerEvents: "none" }} />
        <div key={idx} style={{ position: "relative", padding: "20px 22px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 190, boxSizing: "border-box", animation: "fadeIn 0.45s ease" }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#ffe9d6" }}>{s.eyebrow}</span>
          <div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 22, lineHeight: 1.32, color: "#fff", fontWeight: 600, maxWidth: 330, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.title}</div>
            {s.sub && <div style={{ marginTop: 8, fontSize: 13, fontWeight: 500, color: "#ffd9b8", letterSpacing: "0.02em", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.sub}</div>}
            {s.cta && <button onClick={() => onNavigate && onNavigate(s.cta.to)} style={{ marginTop: 12, background: "rgba(255,255,255,0.92)", color: "#b8430a", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{s.cta.label} →</button>}
          </div>
        </div>
      </div>
      {slides.length > 1 && (
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 12 }}>
          {slides.map((_, k) => (
            <span key={k} onClick={() => setI(k)} style={{ width: k === idx ? 18 : 7, height: 7, borderRadius: 4, background: k === idx ? "#FF6600" : "rgba(255,255,255,0.25)", cursor: "pointer", transition: "width .2s" }} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Feed({ profile, activeGroup, setActiveGroup, isNewMember, onNavigate }) {
  const [posts, setPosts] = useState([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postReactions, setPostReactions] = useState({});
  const [showWelcome, setShowWelcome] = useState(isNewMember);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const photoRef = useRef();
  const bottomRef = useRef(null);
  const verse = getTodayVerse();
  const memberGroups = profile.group_ids && profile.group_ids.length > 0 ? profile.group_ids : [profile.group_id];
  const canPost = true;
  const [selectedPostGroup, setSelectedPostGroup] = useState(profile.group_id);
  const postTarget = selectedPostGroup;

  // When the top filter switches to a specific group, default the composer to it —
  // but the composer's own group tabs can still override where you post.
  useEffect(() => {
    if (activeGroup && activeGroup !== "all") setSelectedPostGroup(activeGroup);
  }, [activeGroup]);

  useEffect(() => {
    loadPosts();
    const channel = supabase.channel("posts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => loadPosts())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [activeGroup]);

  async function loadPosts() {
    setLoading(true);
    let q = supabase.from("posts").select("*, profiles(full_name, username, avatar_url, group_id, role)").order("created_at", { ascending: false }).limit(50);
    if (profile.role !== "admin") {
      if (activeGroup && activeGroup !== "all" && activeGroup !== profile.group_id) {
        // Specific group selected
        q = q.eq("group_id", activeGroup);
      } else {
        // Show all groups the member belongs to
        const memberGroups = profile.group_ids && profile.group_ids.length > 0 ? profile.group_ids : [profile.group_id];
        q = q.in("group_id", memberGroups);
      }
    } else if (activeGroup && activeGroup !== "all") {
      q = q.eq("group_id", activeGroup);
    }
    const { data } = await q;
    setPosts(data || []);
    const reactionMap = {};
    (data || []).forEach(p => { reactionMap[p.id] = p.reactions || {}; });
    setPostReactions(reactionMap);
    setLoading(false);
  }

  function handlePhotoSelect(e) {
    const file = e.target.files[0];
    e.target.value = ""; // allow re-selecting the same file after removing it
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please choose an image file (JPG, PNG, etc.)."); return; }
    if (file.size > 5 * 1024 * 1024) { alert("Photo must be under 5MB"); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function submitPost() {
    if (!requireApproved(profile)) return;
    if (!body.trim() || !canPost) return;
    setPosting(true);
    setUploading(true);
    let photoUrl = null;
    if (photoFile) {
      const ext = photoFile.name.split(".").pop();
      const path = `${profile.id}/post_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, photoFile);
      if (upErr) {
        setUploading(false); setPosting(false);
        alert("Your photo couldn't upload — your post was not sent. Please try again.");
        return;
      }
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      photoUrl = data.publicUrl;
    }
    setUploading(false);
    const target = postTarget;
    const { error } = await supabase.from("posts").insert({ user_id: profile.id, group_id: target, body: body.trim(), photo_url: photoUrl, photo_approved: photoUrl ? false : true, reactions: {} });
    if (error) {
      setPosting(false);
      alert(`Your post didn't send: ${error.message}. Please try again.`);
      return;
    }
    setBody(""); setPhotoFile(null); setPhotoPreview(null); setPosting(false);
    // If the feed is filtered to a different group than the one just posted to,
    // switch the filter to follow the post so the user sees it land.
    if (setActiveGroup && activeGroup && activeGroup !== "all" && activeGroup !== target) {
      setActiveGroup(target); // this triggers loadPosts via the activeGroup effect
    } else {
      loadPosts();
    }
  }

  async function approvePhoto(id) {
    await supabase.from("posts").update({ photo_approved: true }).eq("id", id);
    loadPosts();
  }

  async function deletePost(id) {
    if (!window.confirm("Delete this post?")) return;
    await supabase.from("posts").delete().eq("id", id);
    loadPosts();
  }

  async function sendKudos(toUserId) {
    if (!requireApproved(profile)) return;
    if (toUserId === profile.id) return; // no self-kudos
    const { error } = await supabase.from("kudos").insert({ from_user_id: profile.id, to_user_id: toUserId });
    if (error) return; // silently skip (e.g. duplicate) — don't show a false "Sent!"
    // Show brief confirmation
    const btn = document.getElementById(`kudos_${toUserId}`);
    if (btn) { btn.textContent = "👊 Sent!"; btn.style.color = "#FF6600"; setTimeout(() => { btn.textContent = "👊"; btn.style.color = "#555"; }, 2000); }
  }

  async function flagPost(id) {
    const reason = window.prompt("Why are you flagging this post? (optional)");
    if (reason === null) return; // cancelled
    await supabase.from("post_flags").insert({
      post_id: id,
      flagged_by: profile.id,
      reason: reason || "No reason provided"
    });
    alert("Post flagged. Our team will review it shortly. Thank you.");
  }

  async function addReaction(postId, emoji) {
    // Atomic per-emoji increment server-side (no lost-update race between users).
    const { error } = await supabase.rpc("increment_post_reaction", { post_id: postId, emoji });
    if (error) { console.log("reaction error:", error.message); return; }
    // Optimistic local bump for instant feedback; real count syncs on next load.
    setPostReactions(prev => {
      const current = prev[postId] || {};
      return { ...prev, [postId]: { ...current, [emoji]: (current[emoji] || 0) + 1 } };
    });
  }

  const groupName = GROUPS.find(g => g.id === postTarget)?.label || "Your Group";
  const activeGroupData = activeGroup && activeGroup !== "all" ? GROUPS.find(g => g.id === activeGroup) : null;

  return (
    <div className="tab-content">
      <PersonalHeader profile={profile} />
      <ActivityTicker profile={profile} />
      {showWelcome && (
        <div style={{ background: "linear-gradient(135deg, rgba(255,102,0,0.15), rgba(192,154,47,0.1))", border: "1px solid rgba(255,102,0,0.3)", borderRadius: 6, padding: "20px 24px", marginBottom: 20, position: "relative" }}>
          <button onClick={() => setShowWelcome(false)} style={{ position: "absolute", top: 12, right: 16, background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 18 }}>x</button>
          <span style={S.eyebrow}>Welcome to ESix10</span>
          <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, color: "#fff", marginBottom: 8 }}>You are in. Now stand firm.</h3>
          <p style={{ color: "#FFFFFF", fontSize: 14, lineHeight: 1.7 }}>You have joined the <strong style={{ color: "#FF7E33" }}>{GROUPS.find(g => g.id === profile.group_id)?.label}</strong>{GROUPS.find(g => g.id === profile.group_id)?.subtitle ? ` — ${GROUPS.find(g => g.id === profile.group_id).subtitle}` : ""} Introduce yourself, engage with the community, and stand firm. Ephesians 6:10</p>
        </div>
      )}
      <HomeHero onNavigate={onNavigate} />
      <div style={S.card}>
        {memberGroups.length > 1 && (
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {memberGroups.map(gid => {
              const g = GROUPS.find(x => x.id === gid);
              return (
                <button key={gid} onClick={() => setSelectedPostGroup(gid)}
                  style={{ ...S.tab(selectedPostGroup === gid), padding: "6px 14px", fontSize: 11, border: "none", cursor: "pointer", flexShrink: 0 }}>
                  {g?.icon} {g?.label}
                </button>
              );
            })}
          </div>
        )}
        <label style={S.label}>Share with {GROUPS.find(g => g.id === postTarget)?.label || "Your Group"}</label>
        {!canPost && profile.role !== "admin" ? (
          <p style={{ ...S.muted, padding: "16px 0" }}>You can only post to your own group.</p>
        ) : (
          <>
            <textarea style={{ ...S.input, minHeight: 90, resize: "vertical" }} placeholder="Share a win, ask a question, encourage someone..." value={body} onChange={e => setBody(e.target.value)} />
            {photoPreview && (
              <div style={{ position: "relative", marginTop: 10, display: "inline-block" }}>
                <img src={photoPreview} alt="preview" style={{ maxHeight: 200, maxWidth: "100%", borderRadius: 8, objectFit: "cover" }} />
                <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
              <div>
                <input ref={photoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoSelect} />
                <button onClick={() => photoRef.current.click()} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "8px 14px", color: "#BBBBBB", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  <Camera size={15} /> Photo
                </button>
              </div>
              <button style={S.btn} onClick={submitPost} disabled={posting || uploading || !body.trim()}>{uploading ? "Uploading..." : posting ? "Posting..." : "Post"}</button>
            </div>
          </>
        )}
      </div>
      <div style={{ marginTop: 20 }}>
        {loading && <p style={{ ...S.muted, textAlign: "center", padding: 40 }}>Loading...</p>}
        {!loading && posts.length === 0 && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <p style={{ ...S.grey, fontSize: 18, fontFamily: "'Inter', sans-serif", marginBottom: 8 }}>No posts yet.</p>
            <p style={S.muted}>Be the first to post in {groupName}.</p>
          </div>
        )}
        {posts.map(post => {
          const reactions = postReactions[post.id] || (typeof post.reactions === "object" && post.reactions !== null ? post.reactions : {});
          return (
            <div key={post.id} className="post-card" style={{ ...S.post, marginBottom: 12 }}>
              <div style={{ ...S.flexBetween, flexWrap: "wrap", gap: 6 }}>
                <div style={S.flex}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, rgba(255,102,0,0.3), rgba(192,154,47,0.2))", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF7E33", fontFamily: "'Inter', sans-serif", fontSize: 17, fontWeight: 600, border: "1px solid rgba(255,102,0,0.2)" }}>
                    {(post.profiles?.username || post.profiles?.full_name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <span style={S.postAuthor}>{displayName(post.profiles)}</span>
                    {post.profiles?.role === "admin" && <span style={{ ...S.badge, marginLeft: 8, fontSize: 10 }}>Admin</span>}
                    <span style={S.postTime}>{new Date(post.created_at).toLocaleDateString()}</span>
                    <div style={{ marginTop: 4 }}><Badges userId={post.user_id} size="small" /></div>
                  </div>
                </div>
                <div style={S.flex}>
                  <span style={{ ...S.badge, fontSize: 10 }}>{GROUPS.find(g => g.id === post.group_id)?.label}</span>
                  {profile.id !== post.user_id && (
                    <>
                      <button id={`kudos_${post.user_id}`} onClick={() => sendKudos(post.user_id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8A8A8A", fontSize: 13, padding: "4px 8px", borderRadius: 4 }} title="Send anonymous kudos">
                        👊
                      </button>
                      <button onClick={() => flagPost(post.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8A8A8A", fontSize: 11, padding: "4px 8px", borderRadius: 4 }} title="Flag this post">
                        <Flag size={13} />
                      </button>
                    </>
                  )}
                  {(profile.role === "admin" || profile.id === post.user_id) && (
                    <button style={{ ...S.btnDanger, padding: "4px 8px", fontSize: 11 }} onClick={() => deletePost(post.id)}>✕</button>
                  )}
                </div>
              </div>
              <p style={S.postBody}>{post.body}</p>
              {post.photo_url && (
                (post.photo_approved !== false || post.user_id === profile?.id || isStaff(profile)) ? (
                  <div style={{ marginTop: 12, borderRadius: 10, overflow: "hidden", position: "relative" }}>
                    {isVideoUrl(post.photo_url)
                      ? <video src={post.photo_url} controls style={{ width: "100%", maxHeight: 320, display: "block", background: "#000" }} />
                      : <img src={post.photo_url} alt="post" onClick={() => setLightbox(post.photo_url)} style={{ width: "100%", maxHeight: 320, objectFit: "cover", display: "block", cursor: "pointer" }} />
                    }
                    {post.photo_approved === false && (
                      <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.7)", color: "#FF7E33", fontSize: 11, padding: "3px 8px", borderRadius: 6 }}>⏳ Pending approval</div>
                    )}
                    {isStaff(profile) && post.photo_approved === false && (
                      <button onClick={() => approvePhoto(post.id)} style={{ position: "absolute", bottom: 8, right: 8, ...S.btnSm, fontSize: 11, padding: "6px 12px", background: "#51cf66" }}>✓ Approve photo</button>
                    )}
                  </div>
                ) : (
                  <div style={{ marginTop: 12, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.15)", padding: "28px 16px", textAlign: "center", color: "#8A8A8A", fontSize: 13 }}>📷 Photo pending admin approval</div>
                )
              )}
              <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                {REACTIONS.map(emoji => (
                  <button key={emoji} className="reaction-btn btn-press" onClick={() => addReaction(post.id, emoji)}
                    style={{ background: reactions[emoji] ? "rgba(255,102,0,0.12)" : "rgba(255,255,255,0.03)", border: reactions[emoji] ? "1px solid rgba(255,102,0,0.3)" : "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "4px 10px", cursor: "pointer", fontSize: 13, color: reactions[emoji] ? "#FF6600" : "#666", display: "flex", alignItems: "center", gap: 4 }}>
                    {emoji}{reactions[emoji] ? <span style={{ fontSize: 11 }}>{reactions[emoji]}</span> : null}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div ref={bottomRef} />
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          <img src={lightbox} alt="full size" style={{ maxWidth: "95vw", maxHeight: "90vh", borderRadius: 10, objectFit: "contain" }} />
          <button onClick={() => setLightbox(null)} style={{ position: "fixed", top: 20, right: 24, background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", fontSize: 22, width: 44, height: 44, borderRadius: "50%", cursor: "pointer" }}>✕</button>
        </div>
      )}
    </div>
  );
}
