// Member profile, stats dashboard and badges.
import React, { useState, useEffect } from "react";
import {
  Award, BarChart3, CalendarDays, Dumbbell, Flame, Footprints, HeartHandshake,
  Hourglass, Medal, Newspaper, Star, User, Users, Zap,
} from "lucide-react";
import { S } from "./styles";
import { GROUPS, LEVELS } from "./constants";
import { supabase } from "./supabaseClient";
import { AVATAR_ICONS, BADGE_ICONS, PRESET_AVATARS, Avatar, LevelIcon, NavIcon } from "./icons";
import { displayName, fetchProfileStats, getEarnedBadges, getLevel, getXP, normalizeProfileStats, statsForBadges } from "./stats";
import { enablePush, isIOS } from "./push";

export function Badges({ userId, size = "normal" }) {
  const [stats, setStats] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;
    async function loadStats() {
      const cached = await fetchProfileStats(userId);
      if (mounted) setStats(cached);
    }
    loadStats();
    return () => { mounted = false; };
  }, [userId]);

  if (!stats) return null;

  const earned = getEarnedBadges(statsForBadges(stats));
  if (earned.length === 0) return null;

  const iconSize = size === "small" ? 16 : 22;
  const padding = size === "small" ? "3px 8px" : "6px 12px";

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {earned.map(b => (
        <div key={b.id} title={`${b.label} — ${b.desc}`} style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,102,0,0.08)", border: "1px solid rgba(255,102,0,0.2)", borderRadius: 20, padding, cursor: "default" }}>
          {(() => { const I = BADGE_ICONS[b.id] || Star; return <I size={iconSize} color="#FF7E33" strokeWidth={1.75} />; })()}
          {size !== "small" && <span style={{ color: "#FF7E33", fontSize: 11, letterSpacing: "0.05em" }}>{b.label}</span>}
        </div>
      ))}
    </div>
  );
}

export function KudosCount({ userId }) {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    let mounted = true;
    fetchProfileStats(userId).then(stats => {
      if (mounted) setCount(stats.kudosCount || 0);
    });
    return () => { mounted = false; };
  }, [userId]);

  if (count === 0) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,102,0,0.06)", border: "1px solid rgba(255,102,0,0.15)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, marginTop: 8 }}>
      <span style={{ fontSize: 24 }}>👊</span>
      <div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, color: "#fff" }}>{count} {count === 1 ? "Kudos" : "Kudos"} received</div>
        <div style={{ color: "#BBBBBB", fontSize: 12 }}>Anonymous encouragement from your community</div>
      </div>
    </div>
  );
}

// ─── Stats Dashboard ────────────────────────────────────────────────────────
export function StatsDashboard({ profile }) {
  const [myStats, setMyStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [communityStats, setCommunityStats] = useState(null);
  const [leaderboardMetric, setLeaderboardMetric] = useState("xp");
  const [loading, setLoading] = useState(true);
  const isAdmin = profile.role === "admin";

  useEffect(() => { loadAll(); }, [profile?.id, profile?.group_id, profile?.role]);

  async function loadAll() {
    setLoading(true);
    await Promise.all([
      loadMyStats(),
      loadLeaderboard(),
      isAdmin ? loadCommunityStats() : Promise.resolve()
    ]);
    setLoading(false);
  }

  async function loadMyStats() {
    const stats = await fetchProfileStats(profile.id);
    setMyStats({
      postCount: stats.postCount,
      kudosCount: stats.kudosCount,
      prayerCount: stats.prayerCount,
      walkCount: stats.walkCount,
      challengeCount: stats.challengeCount,
      wodCount: stats.wodCount,
      walkStreak: stats.walkStreak,
      challengeStreak: stats.challengeStreak,
      wodStreak: stats.wodStreak,
      totalMiles: stats.totalMiles.toFixed(1),
      xp: stats.xp,
      updatedAt: stats.updatedAt,
    });
  }

  async function loadLeaderboard() {
    const myGroups = profile.group_ids && profile.group_ids.length > 0 ? profile.group_ids : [profile.group_id];

    let q = supabase
      .from("profiles")
      .select("*")
      .eq("status", "approved");

    if (profile.role !== "admin") {
      q = q.or(myGroups.map(g => `group_id.eq.${g}`).join(","));
    }

    const { data: members, error: memberError } = await q;
    if (memberError) {
      console.error("Leaderboard profiles error:", memberError);
      setLeaderboard([]);
      return;
    }

    const memberIds = (members || []).map(m => m.id);
    if (memberIds.length === 0) {
      setLeaderboard([]);
      return;
    }

    const { data: statRows, error: statsError } = await supabase
      .from("profile_stats")
      .select("*")
      .in("user_id", memberIds);

    if (statsError) {
      console.error("Leaderboard profile_stats error:", statsError);
    }

    const statsByUser = new Map((statRows || []).map(row => [row.user_id, normalizeProfileStats(row)]));

    const enriched = (members || []).map(m => {
      const stats = statsByUser.get(m.id) || normalizeProfileStats(null);
      return {
        ...m,
        postCount: stats.postCount,
        kudosCount: stats.kudosCount,
        prayerCount: stats.prayerCount,
        walkCount: stats.walkCount,
        challengeCount: stats.challengeCount,
        wodCount: stats.wodCount,
        walkStreak: stats.walkStreak,
        totalMiles: stats.totalMiles,
        xp: stats.xp || getXP(m),
      };
    });

    setLeaderboard(enriched);
  }

  async function loadCommunityStats() {
    const [
      { count: totalMembers },
      { count: pendingMembers },
      { count: profileStatsRows },
      { data: statsRows },
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("profile_stats").select("*", { count: "exact", head: true }),
      supabase.from("profile_stats").select("post_count, walk_count, prayer_count, kudos_count, challenge_count, wod_count, total_miles, xp"),
    ]);

    const totals = (statsRows || []).reduce((acc, row) => {
      acc.totalPosts += row.post_count || 0;
      acc.totalWalks += row.walk_count || 0;
      acc.totalPrayers += row.prayer_count || 0;
      acc.totalKudos += row.kudos_count || 0;
      acc.totalChallenges += row.challenge_count || 0;
      acc.totalWods += row.wod_count || 0;
      acc.totalMiles += Number(row.total_miles || 0);
      acc.totalXp += row.xp || 0;
      return acc;
    }, { totalPosts: 0, totalWalks: 0, totalPrayers: 0, totalKudos: 0, totalChallenges: 0, totalWods: 0, totalMiles: 0, totalXp: 0 });

    setCommunityStats({
      totalMembers: totalMembers || 0,
      pendingMembers: pendingMembers || 0,
      profileStatsRows: profileStatsRows || 0,
      ...totals,
    });
  }

  const sortedLeaderboard = [...leaderboard].sort((a, b) => (b[leaderboardMetric] || 0) - (a[leaderboardMetric] || 0)).slice(0, 10);
  const METRICS = [
    { id: "xp", label: "XP", icon: Star },
    { id: "walkCount", label: "Walks", icon: Footprints },
    { id: "kudosCount", label: "Kudos", icon: Award },
    { id: "postCount", label: "Posts", icon: Newspaper },
  ];

  if (loading) return <p style={{ ...S.muted, textAlign: "center", padding: 60 }}>Loading stats...</p>;

  return (
    <div>
      <span style={S.eyebrow}>Stats Dashboard</span>
      <h2 style={{ ...S.h2, marginBottom: 20 }}>Your Progress</h2>

      {myStats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10, marginBottom: 24 }}>
          {[
            { label: "Total XP", value: myStats.xp, icon: Star },
            { label: "Walk Streak", value: myStats.walkStreak, icon: Flame },
            { label: "Total Miles", value: myStats.totalMiles, icon: Footprints },
            { label: "Walks Logged", value: myStats.walkCount, icon: CalendarDays },
            { label: "Challenges", value: myStats.challengeCount, icon: Zap },
            { label: "WODs", value: myStats.wodCount, icon: Dumbbell },
            { label: "Posts", value: myStats.postCount, icon: Newspaper },
            { label: "Kudos Received", value: myStats.kudosCount, icon: Award },
            { label: "Prayers Shared", value: myStats.prayerCount, icon: HeartHandshake },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(255,102,0,0.06)", border: "1px solid rgba(255,102,0,0.15)", borderRadius: 10, padding: "14px 12px", textAlign: "center" }}>
              <div style={{ marginBottom: 4, display: "flex", justifyContent: "center" }}><s.icon size={22} color="#FF7E33" strokeWidth={1.75} /></div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, color: "#FF7E33", lineHeight: 1 }}>{s.value}</div>
              <div style={{ color: "#BBBBBB", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <span style={S.eyebrow}>Earned Badges</span>
        <div style={{ ...S.card, marginTop: 8 }}>
          <Badges userId={profile.id} />
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
          <span style={S.eyebrow}>Leaderboard</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {METRICS.map(m => (
              <button key={m.id} onClick={() => setLeaderboardMetric(m.id)} style={{ ...S.tab(leaderboardMetric === m.id), padding: "6px 12px", fontSize: 11 }}>
                <m.icon size={13} style={{ verticalAlign: "-2px", marginRight: 3 }} /> {m.label}
              </button>
            ))}
          </div>
        </div>
        <div style={S.card}>
          {sortedLeaderboard.length === 0 && <p style={S.muted}>No data yet.</p>}
          {sortedLeaderboard.map((m, idx) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: idx < sortedLeaderboard.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <div style={{ width: 28, textAlign: "center", fontFamily: "'Inter', sans-serif", fontSize: 16, color: idx === 0 ? "#C09A2F" : idx === 1 ? "#AAAAAA" : idx === 2 ? "#FF6600" : "#555" }}>
                {idx < 3 ? <Medal size={18} color={idx === 0 ? "#C09A2F" : idx === 1 ? "#AAAAAA" : "#FF6600"} strokeWidth={1.75} /> : idx + 1}
              </div>
              <Avatar profile={m} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ color: m.id === profile.id ? "#FF6600" : "#fff", fontSize: 14 }}>{displayName(m)}{m.id === profile.id ? " (You)" : ""}</div>
                <div style={{ marginTop: 4 }}><Badges userId={m.id} size="small" /></div>
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, color: "#FF7E33" }}>{m[leaderboardMetric] || 0}</div>
            </div>
          ))}
        </div>
      </div>

      {isAdmin && communityStats && (
        <div>
          <span style={S.eyebrow}>Community Overview</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10, marginTop: 8 }}>
            {[
              { label: "Total Members", value: communityStats.totalMembers, icon: Users },
              { label: "Pending", value: communityStats.pendingMembers, icon: Hourglass },
              { label: "Cached Profiles", value: communityStats.profileStatsRows, icon: BarChart3 },
              { label: "Total XP", value: communityStats.totalXp, icon: Star },
              { label: "Total Posts", value: communityStats.totalPosts, icon: Newspaper },
              { label: "Total Walks", value: communityStats.totalWalks, icon: Footprints },
              { label: "Total Miles", value: communityStats.totalMiles.toFixed(1), icon: Footprints },
              { label: "Prayer Requests", value: communityStats.totalPrayers, icon: HeartHandshake },
              { label: "Kudos", value: communityStats.totalKudos, icon: Award },
            ].map(s => (
              <div key={s.label} style={{ background: "rgba(192,154,47,0.06)", border: "1px solid rgba(192,154,47,0.15)", borderRadius: 10, padding: "14px 12px", textAlign: "center" }}>
                <div style={{ marginBottom: 4, display: "flex", justifyContent: "center" }}><s.icon size={22} color="#C09A2F" strokeWidth={1.75} /></div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, color: "#C09A2F", lineHeight: 1 }}>{s.value}</div>
                <div style={{ color: "#BBBBBB", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ProfileLevelSummary({ profile }) {
  const [stats, setStats] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;
    fetchProfileStats(profile?.id).then(s => {
      if (mounted) setStats(s);
    });
    return () => { mounted = false; };
  }, [profile?.id]);

  const xp = stats?.xp ?? getXP(profile);
  const lvl = getLevel(xp);
  const nextLvl = LEVELS[LEVELS.indexOf(lvl) + 1];
  const progress = nextLvl ? ((xp - lvl.min) / (nextLvl.min - lvl.min)) * 100 : 100;

  return (
    <div style={{ ...S.card, marginBottom: 16, marginTop: 20, background: `linear-gradient(135deg, ${lvl.color}15, rgba(22,27,34,0.98))`, border: `1px solid ${lvl.color}30` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <span className="level-badge" style={{ background: `${lvl.color}20`, color: lvl.color, border: `1px solid ${lvl.color}40`, fontSize: 13, padding: "4px 14px", display: "inline-flex", alignItems: "center" }}><LevelIcon level={lvl} size={14} /> {lvl.name}</span>
          <div style={{ color: "#BBBBBB", fontSize: 12, marginTop: 6 }}>{xp} XP total{nextLvl ? ` · ${Math.max(nextLvl.min - xp, 0)} XP to ${nextLvl.name}` : " · Max Level"}</div>
          {stats?.updatedAt && <div style={{ color: "#444", fontSize: 11, marginTop: 4 }}>Stats updated {new Date(stats.updatedAt).toLocaleString()}</div>}
        </div>
        <Avatar profile={profile} size={56} />
      </div>
      <div className="xp-bar"><div className="xp-fill" style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }} /></div>
    </div>
  );
}

export function Profile({ profile, onUpdate, onSignOut }) {
  const [form, setForm] = useState({ full_name: profile.full_name || "", username: profile.username || "", city: profile.city || "", state: profile.state || "", marital_status: profile.marital_status || "", bio: profile.bio || "", group_id: profile.group_id || "", group_ids: profile.group_ids || [profile.group_id].filter(Boolean) });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [avatarMode, setAvatarMode] = useState("preset"); // "preset" or "upload"
  const [uploading, setUploading] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState(profile.avatar_url || "");
  const fileRef = React.useRef();
  const [groupReq, setGroupReq] = useState("");
  const [pendingGroup, setPendingGroup] = useState(profile.requested_group_id || null);
  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [acctMsg, setAcctMsg] = useState("");
  const [emailPrefs, setEmailPrefs] = useState(profile.email_prefs || { dm: true, group: true, events: true, prayers: true });

  async function toggleEmailPref(key) {
    const next = { ...emailPrefs, [key]: !emailPrefs[key] };
    setEmailPrefs(next);
    await supabase.from("profiles").update({ email_prefs: next }).eq("id", profile.id);
    onUpdate({ ...profile, email_prefs: next });
  }

  const [pushMsg, setPushMsg] = useState("");
  const [pushBusy, setPushBusy] = useState(false);
  async function handleEnablePush() {
    setPushBusy(true); setPushMsg("");
    const r = await enablePush(profile);
    const map = {
      enabled: "✓ Push enabled on this device — you'll get lock-screen alerts when the app is closed.",
      denied: "Notifications are blocked. Turn them on in your browser/site settings, then try again.",
      "ios-needs-install": "On iPhone, first add ESix10 to your Home Screen: tap the Share button → 'Add to Home Screen', open it from there, then come back and enable push.",
      unsupported: "This browser doesn't support push notifications.",
      error: "Couldn't enable push — please try again.",
    };
    setPushMsg(map[r] || "");
    setPushBusy(false);
  }

  async function save() {
    setSaving(true);
    const cleanU = (form.username || "").toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (cleanU.length < 3) { setMsg("Pick a username — at least 3 letters, numbers, or underscores."); setSaving(false); setTimeout(() => setMsg(""), 5000); return; }
    if (cleanU !== profile.username) {
      const { data: taken } = await supabase.from("profiles").select("id").ilike("username", cleanU).neq("id", profile.id).maybeSingle();
      if (taken) { setMsg(`"${cleanU}" is already taken — try another username.`); setSaving(false); setTimeout(() => setMsg(""), 5000); return; }
    }
    // group is managed via request/admin approval — don't overwrite it here
    const { group_id, group_ids, ...rest } = form;
    rest.username = cleanU;
    // Uploaded photos need admin approval; preset icons / clearing don't.
    const isPhoto = currentAvatar && currentAvatar.startsWith("http");
    const photoPending = isPhoto && currentAvatar !== profile.avatar_url;
    const avatarFields = photoPending ? { avatar_pending: currentAvatar } : { avatar_url: currentAvatar, avatar_pending: null };
    const { error } = await supabase.from("profiles").update({ ...rest, ...avatarFields }).eq("id", profile.id);
    if (error) {
      setMsg(`Couldn't save: ${error.message}. Please try again.`);
      setSaving(false);
      setTimeout(() => setMsg(""), 5000);
      return;
    }
    setMsg(photoPending ? "Profile saved. Your new photo is pending admin approval." : "Profile saved.");
    onUpdate({ ...profile, ...rest, ...avatarFields });
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  }

  async function uploadPhoto(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please choose an image file (JPG, PNG, etc.)."); return; }
    if (file.size > 2 * 1024 * 1024) { alert("Photo must be under 2MB"); return; }
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${profile.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      setUploading(false);
      alert(`Photo upload failed: ${error.message}. Please try again.`);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setCurrentAvatar(data.publicUrl + "?t=" + Date.now());
    setUploading(false);
  }

  async function requestGroupChange() {
    if (!groupReq) return;
    await supabase.from("profiles").update({ requested_group_id: groupReq, requested_group_at: new Date().toISOString() }).eq("id", profile.id);
    setPendingGroup(groupReq);
    setGroupReq("");
    setMsg("Group change requested — an admin will review it.");
    setTimeout(() => setMsg(""), 4000);
  }

  async function cancelGroupRequest() {
    await supabase.from("profiles").update({ requested_group_id: null, requested_group_at: null }).eq("id", profile.id);
    setPendingGroup(null);
  }

  async function changeEmail() {
    if (!newEmail.trim()) return;
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    if (error) { setAcctMsg("Could not update email: " + error.message); setTimeout(() => setAcctMsg(""), 6000); return; }
    await supabase.from("profiles").update({ email: newEmail.trim() }).eq("id", profile.id);
    setAcctMsg("Almost done — check your NEW inbox for a confirmation link to finish the email change.");
    setNewEmail("");
    setTimeout(() => setAcctMsg(""), 8000);
  }

  async function changePassword() {
    if (newPass.length < 6) { setAcctMsg("Password must be at least 6 characters."); setTimeout(() => setAcctMsg(""), 5000); return; }
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) { setAcctMsg("Could not update password: " + error.message); setTimeout(() => setAcctMsg(""), 6000); return; }
    setAcctMsg("Password updated.");
    setNewPass("");
    setTimeout(() => setAcctMsg(""), 5000);
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={S.h2}>Your Profile</h2>
      <div style={S.divider} />
      <KudosCount userId={profile.id} />
      <div style={{ marginBottom: 16 }}>
        <Badges userId={profile.id} />
      </div>
      <ProfileLevelSummary profile={profile} />
      <div style={{ ...S.card, marginTop: 0 }}>

        {/* AVATAR SECTION */}
        <div style={{ marginBottom: 24 }}>
          <label style={S.label}>Profile Avatar</label>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
            <Avatar profile={{ ...profile, avatar_url: currentAvatar }} size={72} />
            <div>
              <p style={{ color: "#BBBBBB", fontSize: 13, marginBottom: 8 }}>Choose a preset icon or upload a photo</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ ...S.tab(avatarMode === "preset"), padding: "6px 14px", fontSize: 11 }} onClick={() => setAvatarMode("preset")}>Choose Icon</button>
                <button style={{ ...S.tab(avatarMode === "upload"), padding: "6px 14px", fontSize: 11 }} onClick={() => setAvatarMode("upload")}>Upload Photo</button>
                {currentAvatar && <button style={{ ...S.btnDanger, padding: "6px 12px", fontSize: 11 }} onClick={() => setCurrentAvatar("")}>Remove</button>}
              </div>
            </div>
          </div>

          {avatarMode === "preset" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
              {PRESET_AVATARS.map(a => (
                <div key={a.id} onClick={() => setCurrentAvatar(a.id)}
                  style={{ aspectRatio: "1", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", background: currentAvatar === a.id ? "rgba(255,102,0,0.15)" : "rgba(255,255,255,0.03)", border: currentAvatar === a.id ? "2px solid #FF6600" : "1px solid rgba(255,255,255,0.08)", gap: 4 }}>
                  {(() => { const I = AVATAR_ICONS[a.id] || User; return <I size={22} color={currentAvatar === a.id ? "#FF6600" : "#aaa"} strokeWidth={1.75} />; })()}
                  <span style={{ fontSize: 9, color: "#666", letterSpacing: "0.05em" }}>{a.label}</span>
                </div>
              ))}
            </div>
          )}

          {avatarMode === "upload" && (
            <div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={uploadPhoto} />
              <button style={{ ...S.btn, marginBottom: 8 }} onClick={() => fileRef.current.click()} disabled={uploading}>
                {uploading ? "Uploading..." : "Choose Photo"}
              </button>
              <p style={{ color: "#8A8A8A", fontSize: 12 }}>JPG or PNG. Max 2MB. Square photos work best.</p>
            </div>
          )}
        </div>

        {profile.avatar_pending && (
          <div style={{ background: "rgba(255,102,0,0.08)", border: "1px solid rgba(255,102,0,0.25)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#FF7E33", fontSize: 13 }}>⏳ Your uploaded photo is pending admin approval. Others see your current icon until it's approved.</div>
        )}
        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 20 }} />

        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Full Name</label>
          <input style={S.input} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Username</label>
          <input style={S.input} placeholder="your_username" value={form.username || ""} onChange={e => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} />
          <p style={{ color: "#8A8A8A", fontSize: 11, marginTop: 4 }}>Shown publicly in posts and member list.</p>
        </div>
        <div style={S.grid2}>
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>City (optional)</label>
            <input style={S.input} placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>State (optional)</label>
            <input style={S.input} placeholder="State" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Marital Status (optional)</label>
          <select style={S.input} value={form.marital_status || ""} onChange={e => setForm({ ...form, marital_status: e.target.value })}>
            <option value="">Select…</option>
            <option value="Single">Single</option>
            <option value="In a relationship">In a relationship</option>
            <option value="Engaged">Engaged</option>
            <option value="Married">Married</option>
            <option value="Divorced">Divorced</option>
            <option value="Widowed">Widowed</option>
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Your Group</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4, marginBottom: 12 }}>
            {((profile.group_ids && profile.group_ids.length) ? profile.group_ids : [profile.group_id]).filter(Boolean).map(gid => (
              <div key={gid} style={{ background: "rgba(255,102,0,0.12)", border: "1px solid rgba(255,102,0,0.3)", borderRadius: 8, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                <NavIcon id={gid} size={18} color="#FF7E33" />
                <div>
                  <div style={{ color: "#FF7E33", fontSize: 13, fontWeight: 600 }}>{GROUPS.find(g => g.id === gid)?.label || gid}</div>
                  {GROUPS.find(g => g.id === gid)?.subtitle && <div style={{ color: "#FF7E33", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.85 }}>{GROUPS.find(g => g.id === gid).subtitle}</div>}
                </div>
              </div>
            ))}
          </div>
          {pendingGroup ? (
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "12px 16px" }}>
              <p style={{ color: "#fff", fontSize: 13, marginBottom: 8 }}>Pending: request to join <strong style={{ color: "#FF7E33" }}>{GROUPS.find(g => g.id === pendingGroup)?.label}</strong> — waiting on admin approval.</p>
              <button style={{ ...S.btnGhost, padding: "6px 14px", fontSize: 12 }} onClick={cancelGroupRequest}>Cancel Request</button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select style={{ ...S.input, maxWidth: 240 }} value={groupReq} onChange={e => setGroupReq(e.target.value)}>
                <option value="">Request a different group…</option>
                {GROUPS.filter(g => !(((profile.group_ids && profile.group_ids.length) ? profile.group_ids : [profile.group_id]).includes(g.id))).map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
              <button style={{ ...S.btn, padding: "10px 18px" }} disabled={!groupReq} onClick={requestGroupChange}>Submit Request</button>
            </div>
          )}
          <p style={{ color: "#8A8A8A", fontSize: 11, marginTop: 8 }}>Group changes are reviewed and approved by an admin.</p>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={S.label}>Bio</label>
          <textarea style={{ ...S.input, minHeight: 80 }} placeholder="Tell the community a little about yourself..." value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} />
        </div>
        {msg && <p style={S.success}>{msg}</p>}
        <div style={S.flex}>
          <button style={S.btn} onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Profile"}</button>
          <button style={S.btnGhost} onClick={onSignOut}>Sign Out</button>
        </div>
      </div>

      {/* Email notifications — per-member on/off */}
      <div style={{ ...S.card, marginTop: 16 }}>
        <span style={S.eyebrow}>Email Notifications</span>
        <p style={{ color: "#8A8A8A", fontSize: 12, margin: "8px 0 14px", lineHeight: 1.5 }}>
          Get an email when there's new activity while the app is closed. Busy chats are throttled so your inbox won't get flooded.
        </p>
        {[
          { key: "dm", label: "Direct messages" },
          { key: "group", label: "Group & community chats" },
          { key: "events", label: "Events & announcements" },
          { key: "prayers", label: "Prayer requests" },
        ].map(row => {
          const on = emailPrefs[row.key] !== false;
          return (
            <div key={row.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#fff" }}>{row.label}</span>
              <button aria-label={`Toggle ${row.label}`} onClick={() => toggleEmailPref(row.key)}
                style={{ width: 46, height: 26, borderRadius: 13, border: "none", cursor: "pointer", position: "relative", flexShrink: 0, background: on ? "#FF6600" : "rgba(255,255,255,0.15)", transition: "background .15s" }}>
                <span style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
              </button>
            </div>
          );
        })}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#fff", marginBottom: 4 }}>Lock-screen push (beta)</div>
          <p style={{ color: "#8A8A8A", fontSize: 12, margin: "0 0 12px", lineHeight: 1.5 }}>
            Get instant banner alerts on this device, even when the app is closed.{isIOS() ? " On iPhone you must add ESix10 to your Home Screen first (Share → Add to Home Screen)." : ""}
          </p>
          <button onClick={handleEnablePush} disabled={pushBusy} style={S.btnGhost}>
            {pushBusy ? "Enabling…" : "Enable push on this device"}
          </button>
          {pushMsg && <p style={{ color: "#BBBBBB", fontSize: 12, marginTop: 10, lineHeight: 1.5 }}>{pushMsg}</p>}
        </div>
      </div>

      {/* Account & Login — self-service email/password */}
      <div style={{ ...S.card, marginTop: 16 }}>
        <span style={S.eyebrow}>Account &amp; Login</span>
        <div style={{ marginTop: 12, marginBottom: 16 }}>
          <label style={S.label}>Change Email</label>
          <input style={S.input} type="email" placeholder={profile.email || "new@email.com"} value={newEmail} onChange={e => setNewEmail(e.target.value)} />
          <p style={{ color: "#8A8A8A", fontSize: 11, marginTop: 4 }}>You'll get a confirmation link at the new address to finish the change.</p>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Change Password</label>
          <input style={S.input} type="password" placeholder="New password (at least 6 characters)" value={newPass} onChange={e => setNewPass(e.target.value)} />
        </div>
        {acctMsg && <p style={S.success}>{acctMsg}</p>}
        <div style={S.flex}>
          <button style={S.btnGhost} disabled={!newEmail} onClick={changeEmail}>Update Email</button>
          <button style={S.btnGhost} disabled={!newPass} onClick={changePassword}>Update Password</button>
        </div>
      </div>
    </div>
  );
}
