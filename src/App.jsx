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


// Transactional email goes through /api/send-email, which since 18 Aug checks
// who is asking before it will send anything (see the note at the top of that
// file). Approval emails carry the staff member's sign-in token. The signup
// email carries the brand-new account's id instead, because at that moment
// nobody is signed in yet — email confirmation is on, so signUp() gives us a
// user but no session.
async function sendMemberEmail({ to, name, type, userId }) {
  try {
    const headers = { "Content-Type": "application/json" };
    if (type === "approval") {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    }
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers,
      body: JSON.stringify({ to, name, type, userId }),
    });
    if (!res.ok) console.error(`${type} email failed`, res.status, await res.text());
  } catch (e) {
    console.error(`${type} email failed`, e);
  }
}

// Fire-and-forget: ask the backend to email members about new activity.
// Wrapped so it can never break the action that triggered it (and is a
// safe no-op until the "notify-members" edge function is deployed).
async function notifyMembers(payload) {
  try { await supabase.functions.invoke("notify-members", { body: payload }); }
  catch (e) { console.log("notify-members error:", e); }
}


// Message timestamps come back from Postgres WITHOUT a timezone
// (e.g. "2026-06-14T14:01:51.8"), which new Date() interprets as LOCAL time.
// Our "last read" values are UTC (Date.toISOString → trailing "Z"). Comparing
// the two directly breaks for anyone not on UTC (e.g. US users), making chats
// look permanently unread. Read the DB value as UTC by appending "Z" if it has
// no timezone marker.
const msgTime = (s) => new Date(/[Zz]$|[+-]\d{2}:?\d{2}$/.test(s || "") ? s : (s || "") + "Z");

// New members are let into the app immediately but limited until an admin
// approves their profile. "Approved" = status 'approved' (admins always count).
const isApproved = (p) => p?.role === "admin" || p?.status === "approved";
function requireApproved(profile) {
  if (isApproved(profile)) return true;
  alert("Your profile is still under review. Posting, messaging, kudos, and joining unlock once an admin approves you — usually within 24–48 hours.");
  return false;
}

// "Staff" = admin or moderator. Both can use the Admin Dashboard / moderation
// actions; only admins can change roles or create official content.
const isStaff = (p) => p?.role === "admin" || p?.role === "moderator";


// Staff-only secure email lookup (DB function returns emails only to staff/admin).
async function fetchStaffEmails() {
  try {
    const { data } = await supabase.rpc("staff_emails");
    const map = {};
    (data || []).forEach(r => { map[r.id] = r.email; });
    return map;
  } catch { return {}; }
}


const getTodayVerse = () => {
  const day = new Date().getDay();
  return VERSES[day % VERSES.length];
};


const getTodayCharge = () => CHARGES[new Date().getDate() % CHARGES.length];


// ─── Components ───────────────────────────────────────────────────────────────

function SetupModal({ onClose }) {
  // Shown when the app has a signed-in user but could not load their profile row.
  //
  // This used to print the whole database schema and ask the person to paste it into
  // Supabase. That made sense when the schema was applied by hand; it does not now
  // (supabase/migrations owns the schema), and the copy here had already drifted out of
  // date — so a member hitting a transient load error was being told to run stale SQL
  // against production, which they cannot do and must not do. It now offers a retry.
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ ...S.card, maxWidth: 460, width: "100%" }}>
        <span style={S.eyebrow}>Something went wrong</span>
        <h2 style={S.h2}>We couldn't load your profile</h2>
        <div style={S.divider} />
        <p style={{ ...S.grey, marginBottom: 20 }}>
          This is usually a temporary connection problem. Try again — if it keeps happening,
          contact {ADMIN_EMAIL} and we'll sort it out.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button style={S.btn} onClick={onClose}>Try again</button>
          <button style={S.btnGhost} onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>
    </div>
  );
}
function PendingScreen({ profile, onSignOut }) {
  const group = GROUPS.find(g => g.id === profile.group_id);
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <img src="/esix10logo.png" alt="ESix10" style={{ height: 134, width: "auto", objectFit: "contain", marginBottom: 8 }} />
        <span style={{ color: "#FF7E33", fontSize: 10, display: "block", letterSpacing: "0.35em", textTransform: "uppercase", marginBottom: 32 }}>Community</span>
        <div style={{ ...S.card, textAlign: "left" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(255,102,0,0.1)", border: "2px solid rgba(255,102,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24 }}>⏳</div>
            <span style={S.eyebrow}>Application Received</span>
            <h2 style={{ ...S.h2, fontSize: 22 }}>Pending Approval</h2>
          </div>
          <div style={S.divider} />
          <p style={{ ...S.grey, lineHeight: 1.8, marginBottom: 16 }}>
            Your application to join the <strong style={{ color: "#FF7E33" }}>{group?.label || "ESix10"} community</strong> has been received and is being reviewed.
          </p>
          <p style={{ ...S.grey, lineHeight: 1.8, marginBottom: 24 }}>
            You will receive an email confirmation once your application has been approved. This typically takes 24–48 hours.
          </p>
          <div style={{ background: "rgba(255,102,0,0.06)", border: "1px solid rgba(255,102,0,0.15)", borderRadius: 4, padding: "16px 20px", marginBottom: 24 }}>
            <p style={{ color: "#FFFFFF", fontSize: 14, fontStyle: "italic", lineHeight: 1.7 }}>
              "Iron sharpens iron, so one person sharpens another." — Proverbs 27:17
            </p>
          </div>
          <button style={{ ...S.btnGhost, width: "100%", textAlign: "center" }} onClick={onSignOut}>Sign Out</button>
        </div>
      </div>
    </div>
  );
}

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [legalView, setLegalView] = useState(null); // null | "faith" | "terms" | "privacy"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  async function handleSubmit() {
    setError(""); setMsg(""); setLoading(true);
    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuth(data.user);
      } else {
        if (!ageConfirmed) { setError("You must confirm you are 18 or older to join."); setLoading(false); return; }
        if (!agreed) { setError("You must agree to the Community Standards to join."); setLoading(false); return; }
        const cleanU = username.toLowerCase().replace(/[^a-z0-9_]/g, "");
        if (cleanU.length < 3) { setError("Pick a username — at least 3 letters, numbers, or underscores."); setLoading(false); return; }
        // Signed-out visitors cannot read the profiles table, so this check has
        // to go through username_available() — a function that answers yes/no
        // without handing out anyone's profile. See sql/fix_username_check.sql.
        const { data: available, error: uErr } = await supabase.rpc("username_available", { u: cleanU });
        if (uErr) { setError("Couldn't check that username right now — please try again."); setLoading(false); return; }
        if (available === false) { setError(`"${cleanU}" is already taken — try another username.`); setLoading(false); return; }
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name, username: cleanU, terms_version: LEGAL_VERSION, terms_accepted_at: new Date().toISOString() } } });
        if (error) throw error;
        if (data.user) {
          // We do NOT create the profiles row here: with email confirmation on,
          // there's no session yet, so RLS (correctly) blocks writing it. The
          // profile is created from this metadata on first authenticated login
          // (see loadProfile's "no profile yet" branch).
          if (email !== ADMIN_EMAIL) {
            sendMemberEmail({ to: email, name, type: "signup", userId: data.user.id });
          }
          setMsg("Account created! Check your email to confirm, then log in.");
          setMode("login");
        }
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function forgotPassword() {
    if (!email.trim()) { setError("Enter your email above first, then tap “Forgot password.”"); return; }
    setError(""); setMsg(""); setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
    if (error) setError(error.message);
    else setMsg("If an account exists for that email, a password reset link is on its way. Check your inbox (and spam).");
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <img src="/esix10logo.png" alt="ESix10" style={{ height: 144, width: "auto", objectFit: "contain", marginBottom: 8 }} />
          <span style={{ color: "#FF7E33", fontSize: 10, display: "block", letterSpacing: "0.35em", textTransform: "uppercase" }}>Community</span>
          <div style={{ width: 40, height: 2, background: "#FF6600", margin: "16px auto" }} />
          <p style={S.grey}>Prepared. Equipped. Unshaken.</p>
        </div>
        <div style={S.card}>
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            <button style={S.tab(mode === "login")} onClick={() => setMode("login")}>Sign In</button>
            <button style={S.tab(mode === "signup")} onClick={() => setMode("signup")}>Join</button>
          </div>
          {mode === "signup" && (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={S.label}>Full Name</label>
                <input style={S.input} placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={S.label}>Username</label>
                <input style={S.input} placeholder="Choose a username (e.g. warrior_dad)" value={username} onChange={e => setUsername(e.target.value)} />
                <p style={{ color: "#8A8A8A", fontSize: 11, marginTop: 4 }}>Letters, numbers, and underscores only. Shown publicly.</p>
              </div>
              <div style={{ marginBottom: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <input type="checkbox" checked={ageConfirmed} onChange={e => setAgeConfirmed(e.target.checked)} style={{ accentColor: "#FF6600", width: 18, height: 18, flexShrink: 0 }} />
                  <p style={{ color: "#FFFFFF", fontSize: 13, lineHeight: 1.7 }}>I confirm that I am <strong style={{ color: "#fff" }}>18 years of age or older</strong>.</p>
                </div>
              </div>
              <div style={{ marginBottom: 16, background: "rgba(255,102,0,0.04)", border: "1px solid rgba(255,102,0,0.15)", borderRadius: 8, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: 3, accentColor: "#FF6600", width: 16, height: 16, flexShrink: 0 }} />
                  <div>
                    <p style={{ color: "#FFFFFF", fontSize: 13, lineHeight: 1.7 }}>
                      I have read and agree to the <span style={{ color: "#FF7E33", cursor: "pointer", textDecoration: "underline" }} onClick={() => setShowTerms(!showTerms)}>ESix10 Community Standards</span>, <span style={{ color: "#FF7E33", cursor: "pointer", textDecoration: "underline" }} onClick={() => setLegalView("terms")}>Terms of Use</span>, and <span style={{ color: "#FF7E33", cursor: "pointer", textDecoration: "underline" }} onClick={() => setLegalView("privacy")}>Privacy Policy</span>.
                    </p>
                    {showTerms && (
                      <div style={{ marginTop: 12, padding: 12, background: "rgba(0,0,0,0.3)", borderRadius: 4 }}>
                        <p style={{ color: "#FFFFFF", fontSize: 12, lineHeight: 1.9 }}>
                          <strong style={{ color: "#FF7E33" }}>1. Real people. Real respect.</strong> Treat everyone the way you'd want to be treated in your own home.<br/><br/>
                          <strong style={{ color: "#FF7E33" }}>2. Language.</strong> We're adults. Real talk happens. But know your audience — keep it from becoming someone else's burden. If you wouldn't say it to someone's face at church, think twice.<br/><br/>
                          <strong style={{ color: "#FF7E33" }}>3. Confidentiality.</strong> What's shared here stays here. Someone's prayer request, struggle, or testimony is not yours to share outside these walls. Period.<br/><br/>
                          <strong style={{ color: "#FF7E33" }}>4. No harassment.</strong> We sharpen each other — we don't tear each other apart. Disagreement is fine. Disrespect is not.<br/><br/>
                          <strong style={{ color: "#FF7E33" }}>5. Faith-forward.</strong> This community was built on Ephesians 6:10. We don't all look the same or sound the same, but we stand on the same foundation. Honor that.<br/><br/>
                          <strong style={{ color: "#FF7E33" }}>6. Admin authority is final.</strong> The ESix10 team has the right to remove anyone who disrupts the community. This is someone's house — act accordingly.<br/><br/>
                          <strong style={{ color: "#FF7E33" }}>7. Membership is a privilege.</strong> It can be revoked at any time for conduct that goes against the spirit of this community.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Email Address</label>
            <input style={S.input} type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={S.label}>Password</label>
            <input style={S.input} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
          </div>
          {mode === "signup" && (
            <div style={{ marginBottom: 16, textAlign: "center" }}>
<span style={{ color: "#8A8A8A", fontSize: 12 }}>By joining you agree to our </span><span style={{ color: "#FF7E33", fontSize: 12, cursor: "pointer", textDecoration: "underline" }} onClick={() => setLegalView("faith")}>Statement of Faith</span>
            </div>
          )}
          {error && <p style={S.error}>{error}</p>}
          {msg && <p style={S.success}>{msg}</p>}
          <button style={{ ...S.btn, width: "100%", padding: "14px 24px" }} onClick={handleSubmit} disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
          {mode === "login" && (
            <p style={{ textAlign: "center", marginTop: 16 }}>
              <span style={{ color: "#FF7E33", fontSize: 13, cursor: "pointer", textDecoration: "underline" }} onClick={forgotPassword}>Forgot password?</span>
            </p>
          )}
        </div>
      </div>
      {legalView && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,10,0.97)", zIndex: 500, display: "flex", flexDirection: "column", overflowY: "auto" }}>
          <div style={{ padding: "18px 20px 0", display: "flex", justifyContent: "flex-end" }}>
            <div onClick={() => setLegalView(null)} style={{ color: "#9aa4b2", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>✕</div>
          </div>
          <div style={{ padding: "0 20px 40px", width: "100%", maxWidth: 640, margin: "0 auto", boxSizing: "border-box" }}>
            {legalView === "faith" ? <StatementOfFaith /> : (
              <div className="tab-content">
                <span style={S.eyebrow}>ESix10 Initiative</span>
                <h2 style={{ ...S.h2, margin: "0 0 4px" }}>{legalView === "terms" ? "Terms of Use" : "Privacy Policy"}</h2>
                <p style={{ ...S.muted, marginBottom: 16 }}>Effective {LEGAL_EFFECTIVE}</p>
                <div style={S.card}>
                  <LegalDoc sections={legalView === "terms" ? TERMS : PRIVACY} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GroupSelect({ user, onSelect }) {
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  function toggleGroup(id) {
    // Brotherhood and Sisterhood are mutually exclusive
    if (id === "brotherhood" && selected.includes("sisterhood")) {
      setSelected(prev => [...prev.filter(g => g !== "sisterhood"), id]);
      return;
    }
    if (id === "sisterhood" && selected.includes("brotherhood")) {
      setSelected(prev => [...prev.filter(g => g !== "brotherhood"), id]);
      return;
    }
    setSelected(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  }

  async function confirm() {
    if (selected.length === 0) return;
    setLoading(true);
    const primaryGroup = selected.includes("brotherhood") ? "brotherhood" : selected.includes("sisterhood") ? "sisterhood" : "family";
    const { error } = await supabase.from("profiles").upsert({ id: user.id, group_id: primaryGroup, group_ids: selected });
    if (error) {
      setLoading(false);
      alert(`We couldn't save your group selection: ${error.message}. Please try again.`);
      return;
    }
    // Notify admin of new member
    const { data: p } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    try {
      await supabase.functions.invoke("notify", {
        body: { full_name: p?.full_name || user.email, email: user.email, group_id: primaryGroup }
      });
    } catch(e) { console.log("Notify error:", e); }
    onSelect(primaryGroup, selected);
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 700, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <span style={S.eyebrow}>Welcome to ESix10</span>
          <h1 style={{ ...S.h1, fontSize: 32 }}>Choose Your Community</h1>
          <div style={{ ...S.divider, margin: "16px auto" }} />
          <p style={S.grey}>Select all groups that apply. Brotherhood and Sisterhood are separate — but Family is open to all.</p>
        </div>
        <div style={S.grid3}>
          {GROUPS.map(g => (
            <div key={g.id} style={S.groupCard(selected.includes(g.id))} onClick={() => toggleGroup(g.id)}>
              <div style={{ marginBottom: 12, color: "#FF7E33", display: "flex", justifyContent: "center" }}><NavIcon id={g.id} size={32} /></div>
              {selected.includes(g.id) && <div style={{ position: "absolute", top: 12, right: 12, background: "#FF6600", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12 }}>✓</div>}
              <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 400, color: "#fff", marginBottom: 8 }}>{g.label}</h3>
              <p style={{ fontSize: 13, color: "#FF7E33", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>{g.subtitle}</p>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", color: "#8A8A8A", fontSize: 12, marginTop: 16 }}>Brotherhood and Sisterhood cannot be selected together</p>
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button style={{ ...S.btn, padding: "14px 48px", opacity: selected.length > 0 ? 1 : 0.4 }} onClick={confirm} disabled={selected.length === 0 || loading}>
            {loading ? "Joining..." : `Join ${selected.length > 0 ? selected.length + " group" + (selected.length > 1 ? "s" : "") : "the Community"}`}
          </button>
        </div>
      </div>
    </div>
  );
}


// ─── Activity Ticker ──────────────────────────────────────────────────────────
function ActivityTicker({ profile }) {
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
function PersonalHeader({ profile }) {
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

function HomeHero({ onNavigate }) {
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


const PRAYER_SLIDES = [
  { eyebrow: "Prayer Wall", title: "Someone here is carrying something heavy.", sub: "Lift them up today." },
  { eyebrow: "Stand in the Gap", title: "Pray for one person by name — right now.", sub: "Then tell them you did." },
  { eyebrow: "Promise", title: "Cast all your anxiety on Him, because He cares for you.", sub: "1 Peter 5:7" },
  { eyebrow: "Promise", title: "The prayer of a righteous person is powerful and effective.", sub: "James 5:16" },
  { eyebrow: "Sacred", title: "What's shared here stays here.", sub: "This is holy ground." },
  { eyebrow: "You're not alone", title: "You don't have to carry it by yourself.", sub: "Post a request — we've got you." },
];
const MEMBER_SLIDES = [
  { eyebrow: "The Movement", title: "One family. Three houses. One foundation.", sub: "Brotherhood · Sisterhood · Family" },
  { eyebrow: "Welcome", title: "New here? You belong.", sub: "Say hello in the Feed." },
  { eyebrow: "Connect", title: "Tap any member to see their story.", sub: "Reach out. Build something real." },
  { eyebrow: "Foundation", title: "We don't all look the same. We stand on the same Rock.", sub: "Ephesians 6:10" },
  { eyebrow: "Respect", title: "Real people. Real respect.", sub: "Treat everyone like family." },
  { eyebrow: "Grow", title: "Who needs this community?", sub: "Bring them in." },
];
const CHAT_SLIDES = [
  { eyebrow: "Chat", title: "Sharpen each other — don't tear each other down.", sub: "Proverbs 27:17" },
  { eyebrow: "Keep it sacred", title: "What's said here, stays here.", sub: "Trust is built on confidence." },
  { eyebrow: "Your crew", title: "Start a casual group with your buddies.", sub: "Tap Group to create one." },
  { eyebrow: "Safe space", title: "Need something private and regulated?", sub: "Request a Private Group." },
  { eyebrow: "In season", title: "A word in season — how good it is!", sub: "Proverbs 15:23" },
  { eyebrow: "Keep it clean", title: "See something off? Flag it.", sub: "We protect this house." },
];
const EVENT_SLIDES = [
  { eyebrow: "Events", title: "Show up in person.", sub: "Community is built face to face." },
  { eyebrow: "Gather", title: "Not neglecting to meet together.", sub: "Hebrews 10:25" },
  { eyebrow: "Find your next", title: "See what's coming up.", sub: "Then put it on your calendar." },
  { eyebrow: "Host", title: "Got an event? Submit it.", sub: "Admins review and post it." },
  { eyebrow: "Together", title: "Iron sharpens iron — most of all in person.", sub: "Be there." },
];


function Feed({ profile, activeGroup, setActiveGroup, isNewMember, onNavigate }) {
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
function Events({ profile }) {
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", group_id: "all", event_date: "", location: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadEvents(); }, []);

  async function loadEvents() {
    const { data } = await supabase.from("events").select("*").order("event_date", { ascending: true });
    setEvents(data || []);
  }

  async function createEvent() {
    if (!requireApproved(profile)) return;
    setLoading(true);
    const { data: ev, error } = await supabase.from("events").insert({ ...form, created_by: profile.id, approved: profile.role === "admin" }).select("id, approved").single();
    if (error) {
      setLoading(false);
      alert(`Your event didn't save: ${error.message}. Please try again.`);
      return;
    }
    if (ev?.approved) notifyMembers({ kind: "event", item_id: ev.id, actor_id: profile.id, preview: form.title || "New event" });
    setShowForm(false);
    setForm({ title: "", description: "", group_id: "all", event_date: "", location: "" });
    loadEvents();
    setLoading(false);
  }

  async function approveEvent(id) {
    await supabase.from("events").update({ approved: true }).eq("id", id);
    notifyMembers({ kind: "event", item_id: id, actor_id: profile.id, preview: "New event" });
    loadEvents();
  }

  async function deleteEvent(id) {
    await supabase.from("events").delete().eq("id", id);
    loadEvents();
  }

  return (
    <div>
      <TabCarousel slides={EVENT_SLIDES} />
      <div style={S.flexBetween}>
        <h2 style={{ ...S.h2, margin: 0 }}>Upcoming Events</h2>
        <button style={S.btn} onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Add Event"}
        </button>
      </div>

      {showForm && (
        <div style={{ ...S.card, marginTop: 20 }}>
          <span style={S.eyebrow}>New Event</span>
          {profile.role !== "admin" && <p style={{ ...S.muted, marginTop: 6, marginBottom: 4 }}>Your event will be reviewed by an admin before it goes live.</p>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={S.label}>Title</label>
              <input style={S.input} placeholder="Event title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label style={S.label}>Group</label>
              <select style={{ ...S.input }} value={form.group_id} onChange={e => setForm({ ...form, group_id: e.target.value })}>
                <option value="all">All Groups</option>
                {GROUPS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Date & Time</label>
              <input style={S.input} type="datetime-local" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} />
            </div>
            <div>
              <label style={S.label}>Location</label>
              <input style={S.input} placeholder="Address or Online" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={S.label}>Description</label>
              <textarea style={{ ...S.input, minHeight: 80 }} placeholder="Event details..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <button style={S.btn} onClick={createEvent} disabled={loading || !form.title}>
            {loading ? "Creating..." : "Create Event"}
          </button>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        {events.length === 0 && <p style={{ ...S.muted, textAlign: "center", padding: 60 }}>No upcoming events. Check back soon.</p>}
        {events.map(ev => (
          <div key={ev.id} style={{ ...S.post, borderLeft: "3px solid #FF6600" }}>
            <div style={S.flexBetween}>
              <div>
                <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 400, color: "#fff", marginBottom: 6 }}>{ev.title}</h3>
                <div style={S.flex}>
                  {ev.event_date && <span style={S.muted}>📅 {new Date(ev.event_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
                  {ev.location && <span style={S.muted}><MapPin size={11} style={{ verticalAlign: "-1px", marginRight: 2 }} /> {ev.location}</span>}
                  <span style={S.badge}>{GROUPS.find(g => g.id === ev.group_id)?.label || "All Groups"}</span>
                </div>
              </div>
              <div style={S.flex}>
                {ev.approved === false && <span style={{ ...S.badge, background: "rgba(252,196,25,0.15)", color: "#fcc419", border: "1px solid rgba(252,196,25,0.3)" }}>Pending</span>}
                {profile.role === "admin" && ev.approved === false && (
                  <button style={S.btn} onClick={() => approveEvent(ev.id)}>Approve</button>
                )}
                {(profile.role === "admin" || ev.created_by === profile.id) && (
                  <button style={S.btnDanger} onClick={() => deleteEvent(ev.id)}>Remove</button>
                )}
              </div>
            </div>
            {ev.description && <p style={{ ...S.postBody, marginTop: 10 }}>{ev.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function MemberProfileModal({ m, me, onClose, onMessage }) {
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

function Members({ profile, onNavigate }) {
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

// ─── Prayer Requests ──────────────────────────────────────────────────────────
function PrayerRequests({ profile }) {
  const [prayers, setPrayers] = useState([]);
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => { loadPrayers(); }, []);

  async function loadPrayers() {
    const { data } = await supabase.from("prayers").select("*").eq("group_id", profile.group_id).order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(50);
    setPrayers(data || []);
  }

  async function submitPrayer() {
    if (!requireApproved(profile)) return;
    if (!body.trim()) return;
    setPosting(true);
    const authorName = anonymous ? "Anonymous" : (profile.username ? `@${profile.username}` : formatName(profile.full_name));
    const { data: pr, error } = await supabase.from("prayers").insert({ user_id: profile.id, group_id: profile.group_id, body: body.trim(), anonymous, author_name: authorName, reactions: 0, pinned: false }).select("id").single();
    if (error) {
      setPosting(false);
      alert(`Your prayer request didn't post: ${error.message}. Please try again.`);
      return;
    }
    notifyMembers({ kind: "prayer", item_id: pr?.id, actor_id: profile.id, preview: anonymous ? "A new prayer request was posted" : body.trim().slice(0, 80) });
    setBody(""); setPosting(false); loadPrayers();
  }

  async function react(id, current) {
    // Atomic server-side increment — prevents the lost-update race where two
    // people praying at once overwrite each other's count.
    const { error } = await supabase.rpc("increment_prayer_reactions", { prayer_id: id });
    if (error) { console.log("prayer reaction error:", error.message); return; }
    loadPrayers();
  }

  async function pin(id, pinned) {
    await supabase.from("prayers").update({ pinned: !pinned }).eq("id", id);
    loadPrayers();
  }

  async function deletePrayer(id) {
    await supabase.from("prayers").delete().eq("id", id);
    loadPrayers();
  }

  return (
    <div>
      <TabCarousel slides={PRAYER_SLIDES} />
      <span style={S.eyebrow}>Prayer Requests</span>
      <h2 style={{ ...S.h2, marginBottom: 20 }}>Lift Each Other Up</h2>
      <div style={S.card}>
        <label style={S.label}>Share a Prayer Request</label>
        <textarea style={{ ...S.input, minHeight: 80, resize: "vertical" }} placeholder="Share what's on your heart. This community stands with you." value={body} onChange={e => setBody(e.target.value)} />
        <div style={{ ...S.flexBetween, marginTop: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "#BBBBBB", fontSize: 13 }}>
            <input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} style={{ accentColor: "#FF6600" }} />
            Post anonymously
          </label>
          <button style={S.btn} onClick={submitPrayer} disabled={posting || !body.trim()}>{posting ? "Posting..." : "Submit Request"}</button>
        </div>
      </div>
      <div style={{ marginTop: 20 }}>
        {prayers.length === 0 && (
          <div style={{ textAlign: "center", padding: 40 }}>
  <div style={{ fontSize: 64, marginBottom: 16, animation: "fadeUp 1s ease" }}>🙏</div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, color: "#fff", marginBottom: 8 }}>No prayer requests yet.</p>
            <p style={S.muted}>Be the first to share. This community stands with you.</p>
          </div>
        )}
        {prayers.map(p => (
          <div key={p.id} style={{ ...S.post, borderLeft: p.pinned ? "3px solid #FF6600" : "none", marginBottom: 12 }}>
            <div style={S.flexBetween}>
              <div style={S.flex}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,102,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF7E33", fontSize: 16 }}>{p.anonymous ? "🙏" : (p.author_name || "?")[0].toUpperCase()}</div>
                <div>
                  <span style={S.postAuthor}>{p.author_name || "Member"}</span>
                  {p.pinned && <span style={{ ...S.badge, marginLeft: 8, fontSize: 10 }}><Pin size={10} style={{ verticalAlign: "-1px", marginRight: 2 }} /> Pinned</span>}
                  <span style={S.postTime}>{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div style={S.flex}>
                {profile.role === "admin" && <button style={S.btnSm} onClick={() => pin(p.id, p.pinned)}>{p.pinned ? "Unpin" : "📌 Pin"}</button>}
                {(profile.role === "admin" || profile.id === p.user_id) && <button style={S.btnDanger} onClick={() => deletePrayer(p.id)}>Remove</button>}
              </div>
            </div>
            <p style={S.postBody}>{p.body}</p>
            <button onClick={() => react(p.id, p.reactions)} style={{ background: "rgba(255,102,0,0.08)", border: "1px solid rgba(255,102,0,0.2)", borderRadius: 20, padding: "6px 16px", color: "#FF7E33", cursor: "pointer", fontSize: 13, marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
              🙏 {p.reactions || 0} {p.reactions === 1 ? "praying" : "praying"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Daily Devotion ────────────────────────────────────────────────────────────
function Devotion({ profile }) {
  const [devotions, setDevotions] = useState([]);
  const [form, setForm] = useState({ title: "", scripture: "", scripture_ref: "", body: "" });
  const [showForm, setShowForm] = useState(false);
  const [posting, setPosting] = useState(false);
  const [comment, setComment] = useState({});
  const [comments, setComments] = useState({});
  const [dayOffset, setDayOffset] = useState(0);

  useEffect(() => { loadDevotions(); }, []);

  async function loadDevotions() {
    const { data } = await supabase.from("devotions").select("*").order("created_at", { ascending: false }).limit(7);
    setDevotions(data || []);
    if (data?.length > 0) loadComments(data[0].id);
  }

  async function loadComments(devotionId) {
    const { data } = await supabase.from("devotion_comments").select("*").eq("devotion_id", devotionId).order("created_at", { ascending: true });
    setComments(prev => ({ ...prev, [devotionId]: data || [] }));
  }

  async function postDevotion() {
    if (!form.title || !form.body) return;
    setPosting(true);
    await supabase.from("devotions").insert({ ...form, author_name: "ESix10 Admin", reactions: 0 });
    setForm({ title: "", scripture: "", scripture_ref: "", body: "" });
    setShowForm(false); loadDevotions(); setPosting(false);
  }

  async function react(id, current) {
    const { error } = await supabase.rpc("increment_devotion_reactions", { devotion_id: id });
    if (error) { console.log("devotion reaction error:", error.message); return; }
    loadDevotions();
  }

  async function postComment(devotionId) {
    if (!requireApproved(profile)) return;
    if (!comment[devotionId]?.trim()) return;
    const authorName = profile.username ? `@${profile.username}` : formatName(profile.full_name);
    await supabase.from("devotion_comments").insert({ devotion_id: devotionId, user_id: profile.id, author_name: authorName, body: comment[devotionId].trim() });
    setComment(prev => ({ ...prev, [devotionId]: "" }));
    loadComments(devotionId);
  }

  async function deleteDevotion(id) {
    await supabase.from("devotions").delete().eq("id", id);
    loadDevotions();
  }

  // Daily devotion auto-rotates from the library by date (same for everyone, changes each day).
  // An admin post for *today* takes precedence (keeps reactions + comments).
  const today = new Date();
  const todaysDevotion = getTodaysDevotion(today);
  const dbToday = devotions[0] && new Date(devotions[0].created_at).toDateString() === today.toDateString();
  const viewDate = new Date(today); viewDate.setDate(today.getDate() - dayOffset);
  const viewDevotion = getTodaysDevotion(viewDate);

  return (
    <div>
      <div style={S.flexBetween}>
        <div><span style={S.eyebrow}>Daily Devotion</span><h2 style={{ ...S.h2, margin: 0 }}>Word for Today</h2></div>
        {profile.role === "admin" && <button style={S.btn} onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "+ Post Devotion"}</button>}
      </div>
      {showForm && profile.role === "admin" && (
        <div style={{ ...S.card, marginTop: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div style={{ gridColumn: "1/-1" }}><label style={S.label}>Title</label><input style={S.input} placeholder="Devotion title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><label style={S.label}>Scripture</label><input style={S.input} placeholder="Scripture text" value={form.scripture} onChange={e => setForm({ ...form, scripture: e.target.value })} /></div>
            <div><label style={S.label}>Reference</label><input style={S.input} placeholder="e.g. Ephesians 6:10" value={form.scripture_ref} onChange={e => setForm({ ...form, scripture_ref: e.target.value })} /></div>
            <div style={{ gridColumn: "1/-1" }}><label style={S.label}>Reflection</label><textarea style={{ ...S.input, minHeight: 120 }} placeholder="Today's devotional reflection..." value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} /></div>
          </div>
          <button style={S.btn} onClick={postDevotion} disabled={posting || !form.title || !form.body}>{posting ? "Posting..." : "Post Devotion"}</button>
        </div>
      )}
      <div style={{ marginTop: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 8 }}>
          <button style={{ ...S.btnGhost, padding: "6px 14px", fontSize: 12 }} onClick={() => setDayOffset(d => d + 1)}>← Previous</button>
          <span style={{ color: "#9aa4b2", fontSize: 12, fontWeight: 600 }}>{dayOffset === 0 ? "Today" : viewDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
          <button style={{ ...S.btnGhost, padding: "6px 14px", fontSize: 12, opacity: dayOffset === 0 ? 0.4 : 1 }} disabled={dayOffset === 0} onClick={() => setDayOffset(d => Math.max(0, d - 1))}>Today →</button>
        </div>
        {dayOffset > 0 && (
          <div style={{ ...S.card, marginBottom: 16, borderTop: "3px solid #C09A2F" }}>
            <span style={{ ...S.badge, marginBottom: 8, display: "inline-block", background: "rgba(192,154,47,0.2)", color: "#C09A2F" }}>{viewDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
            <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 400, color: "#fff", marginBottom: 8 }}>{viewDevotion.title}</h3>
            <div style={{ background: "rgba(255,102,0,0.06)", border: "1px solid rgba(255,102,0,0.15)", borderRadius: 4, padding: "12px 16px", marginBottom: 12 }}><p style={{ color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: 14, fontStyle: "italic", lineHeight: 1.7 }}>"{viewDevotion.verse}"</p><p style={{ color: "#FF7E33", fontSize: 12, marginTop: 4, letterSpacing: "0.1em" }}>— {viewDevotion.ref}</p></div>
            <span style={{ ...S.eyebrow, display: "block", marginBottom: 6 }}>Reflection</span>
            <p style={{ ...S.postBody }}>{viewDevotion.body}</p>
          </div>
        )}
        {dayOffset === 0 && !dbToday && (
          <div style={{ ...S.card, marginBottom: 16, borderTop: "3px solid #FF6600" }}>
            <span style={{ ...S.badge, marginBottom: 8, display: "inline-block" }}>Today — {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
            <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 400, color: "#fff", marginBottom: 8 }}>{todaysDevotion.title}</h3>
            <div style={{ background: "rgba(255,102,0,0.06)", border: "1px solid rgba(255,102,0,0.15)", borderRadius: 4, padding: "12px 16px", marginBottom: 12 }}><p style={{ color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: 14, fontStyle: "italic", lineHeight: 1.7 }}>"{todaysDevotion.verse}"</p><p style={{ color: "#FF7E33", fontSize: 12, marginTop: 4, letterSpacing: "0.1em" }}>— {todaysDevotion.ref}</p></div>
            <span style={{ ...S.eyebrow, display: "block", marginBottom: 6 }}>Reflection</span>
            <p style={{ ...S.postBody }}>{todaysDevotion.body}</p>
          </div>
        )}
        {dayOffset === 0 && dbToday && devotions.map((d, idx) => (
          <div key={d.id} style={{ ...S.card, marginBottom: 16, borderTop: idx === 0 ? "3px solid #FF6600" : "1px solid rgba(255,255,255,0.06)" }}>
            <div style={S.flexBetween}>
              <div>
                {idx === 0 && <span style={{ ...S.badge, marginBottom: 8, display: "inline-block" }}>Today</span>}
                <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 400, color: "#fff", marginBottom: 8 }}>{d.title}</h3>
                {d.scripture && <div style={{ background: "rgba(255,102,0,0.06)", border: "1px solid rgba(255,102,0,0.15)", borderRadius: 4, padding: "12px 16px", marginBottom: 12 }}><p style={{ color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: 14, fontStyle: "italic", lineHeight: 1.7 }}>"{d.scripture}"</p>{d.scripture_ref && <p style={{ color: "#FF7E33", fontSize: 12, marginTop: 4, letterSpacing: "0.1em" }}>— {d.scripture_ref}</p>}</div>}
              </div>
              {profile.role === "admin" && <button style={S.btnDanger} onClick={() => deleteDevotion(d.id)}>Remove</button>}
            </div>
            <p style={{ ...S.postBody, marginBottom: 12 }}>{d.body}</p>
            <div style={S.flexBetween}>
              <button onClick={() => react(d.id, d.reactions)} style={{ background: "rgba(255,102,0,0.08)", border: "1px solid rgba(255,102,0,0.2)", borderRadius: 20, padding: "6px 14px", color: "#FF7E33", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>❤️ {d.reactions || 0}</button>
              <span style={S.muted}>{new Date(d.created_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
            </div>
            {idx === 0 && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16, marginTop: 16 }}>
                <p style={{ ...S.eyebrow, marginBottom: 12 }}>Responses</p>
                {(comments[d.id] || []).map(c => (
                  <div key={c.id} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,102,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF7E33", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{(c.author_name || "?")[0].toUpperCase()}</div>
                    <div><span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{c.author_name}</span><p style={{ color: "#FFFFFF", fontSize: 14, marginTop: 4, lineHeight: 1.6 }}>{c.body}</p></div>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <input style={{ ...S.input, flex: 1, padding: "10px 14px" }} placeholder="Share a reflection..." value={comment[d.id] || ""} onChange={e => setComment(prev => ({ ...prev, [d.id]: e.target.value }))} onKeyDown={e => e.key === "Enter" && postComment(d.id)} />
                  <button style={{ ...S.btnSm, flexShrink: 0 }} onClick={() => postComment(d.id)}>Post</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


// ─── Local Chapter ────────────────────────────────────────────────────────────
function LocalChapter({ profile }) {
  const [localMembers, setLocalMembers] = React.useState([]);
  const [localEvents, setLocalEvents] = React.useState([]);
  const [localPosts, setLocalPosts] = React.useState([]);
  const [recommendations, setRecommendations] = React.useState([]);
  const [showAddRec, setShowAddRec] = React.useState(false);
  const [recForm, setRecForm] = React.useState({ name: "", category: "Gym", address: "", description: "", website: "" });
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState("members");
  const REC_CATEGORIES = [
    { id: "Gym", icon: "💪", label: "Gym / CrossFit" },
    { id: "Coffee", icon: "☕", label: "Coffee Shop" },
    { id: "Running", icon: "🏃", label: "Running Club" },
    { id: "Church", icon: "✝️", label: "Church" },
    { id: "Range", icon: "🎯", label: "Gun Range" },
    { id: "Restaurant", icon: "🍖", label: "Restaurant" },
    { id: "Outdoor", icon: "🌲", label: "Outdoor / Trails" },
    { id: "Business", icon: "🤝", label: "Veteran / Faith Business" },
    { id: "Other", icon: "⭐", label: "Other" },
  ];
  React.useEffect(() => { loadLocal(); }, []);
  async function loadLocal() {
    setLoading(true);
    if (!profile.state) { setLoading(false); return; }
    const [{ data: members }, { data: events }, { data: posts }, { data: recs }] = await Promise.all([
      supabase.from("profiles").select(PROFILE_COLS).eq("state", profile.state).eq("status", "approved").neq("id", profile.id).order("city", { ascending: true }),
      supabase.from("events").select("*").ilike("location", `%${profile.state}%`).gte("event_date", new Date().toISOString()).order("event_date", { ascending: true }).limit(10),
      supabase.from("posts").select("*, profiles(full_name, username, avatar_url, group_id)").in("group_id", profile.group_ids || [profile.group_id]).order("created_at", { ascending: false }).limit(20),
      supabase.from("local_recommendations").select("*, profiles(username, full_name)").eq("state", profile.state).eq("approved", true).order("created_at", { ascending: false })
    ]);
    const stateMemberIds = (members || []).map(m => m.id);
    setLocalMembers(members || []); setLocalEvents(events || []);
    setLocalPosts((posts || []).filter(p => stateMemberIds.includes(p.user_id) || p.user_id === profile.id));
    setRecommendations(recs || []); setLoading(false);
  }
  async function saveRec() {
    if (!recForm.name) return;
    await supabase.from("local_recommendations").insert({ ...recForm, state: profile.state, city: profile.city, added_by: profile.id, approved: profile.role === "admin" });
    setShowAddRec(false); setRecForm({ name: "", category: "Gym", address: "", description: "", website: "" }); loadLocal();
  }
  async function deleteRec(id) {
    if (!confirm("Remove?")) return;
    await supabase.from("local_recommendations").delete().eq("id", id); loadLocal();
  }
  if (!profile.state) return (
    <div style={{ textAlign: "center", padding: 60 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📍</div>
      <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, color: "#fff", marginBottom: 8 }}>Add your state to your profile</h3>
      <p style={{ color: "#BBBBBB", fontSize: 14 }}>We will show you members and events in your area.</p>
    </div>
  );
  const city = profile.city ? `${profile.city}, ${profile.state}` : profile.state;
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <span style={S.eyebrow}>Local Community</span>
        <h2 style={{ ...S.h2, margin: 0 }}>📍 {city}</h2>
        <p style={{ color: "#BBBBBB", fontSize: 13, marginTop: 4 }}>{localMembers.length} member{localMembers.length !== 1 ? "s" : ""} in your area</p>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: 4 }}>
        {[{id:"members",label:"Members",icon:"👥"},{id:"posts",label:"Local Feed",icon:"📋"},{id:"events",label:"Events",icon:"📅"},{id:"recs",label:"Places",icon:"🗺️"}].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flex: 1, padding: "10px 8px", border: "none", borderRadius: 4, cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", background: activeTab === t.id ? "#FF6600" : "transparent", color: activeTab === t.id ? "#fff" : "#666" }}>
            <span style={{ fontSize: 18, display: "block", marginBottom: 2 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>
      {loading && <p style={S.muted}>Loading...</p>}
      {!loading && activeTab === "members" && (
        <div>
          {localMembers.length === 0 && <div style={{ textAlign: "center", padding: 40 }}><div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div><h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, color: "#fff", marginBottom: 8 }}>You are the first in {profile.state}.</h3><p style={{ color: "#BBBBBB", fontSize: 13 }}>Share the app — build your local chapter.</p></div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {localMembers.map(m => (
              <div key={m.id} style={{ ...S.card, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                <Avatar profile={m} size={44} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: 14 }}>{m.username ? `@${m.username}` : formatName(m.full_name)}</div>
                  <div style={{ color: "#8A8A8A", fontSize: 12, marginTop: 2 }}>{m.city && <span>📍 {m.city} · </span>}<span>{GROUPS.find(g => g.id === m.group_id)?.label}</span></div>
                </div>
                <LevelBadgeForUser profile={m} fontSize={10} />
              </div>
            ))}
          </div>
        </div>
      )}
      {!loading && activeTab === "posts" && (
        <div>
          {localPosts.length === 0 && <div style={{ textAlign: "center", padding: 40 }}><div style={{ fontSize: 40, marginBottom: 12 }}>📋</div><p style={{ color: "#BBBBBB", fontSize: 14 }}>No local posts yet.</p></div>}
          {localPosts.map(post => (
            <div key={post.id} style={{ ...S.post, marginBottom: 12 }}>
              <div style={S.flex}><Avatar profile={post.profiles} size={38} /><div><span style={S.postAuthor}>{displayName(post.profiles)}</span><span style={S.postTime}>{new Date(post.created_at).toLocaleDateString()}</span></div></div>
              <p style={{ ...S.postBody, marginTop: 10 }}>{post.body}</p>
            </div>
          ))}
        </div>
      )}
      {!loading && activeTab === "events" && (
        <div>
          {localEvents.length === 0 && <div style={{ textAlign: "center", padding: 40 }}><div style={{ fontSize: 40, marginBottom: 12 }}>📅</div><p style={{ color: "#BBBBBB", fontSize: 14 }}>No local events yet.</p></div>}
          {localEvents.map(ev => (
            <div key={ev.id} style={{ ...S.card, marginBottom: 12 }}>
              <div style={{ color: "#FF7E33", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{new Date(ev.event_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
              <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, color: "#fff", marginBottom: 6 }}>{ev.title}</h3>
              {ev.location && <p style={{ color: "#BBBBBB", fontSize: 13 }}>📍 {ev.location}</p>}
              {ev.description && <p style={{ color: "#FFFFFF", fontSize: 14, marginTop: 8, lineHeight: 1.7 }}>{ev.description}</p>}
            </div>
          ))}
        </div>
      )}
      {!loading && activeTab === "recs" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <p style={{ color: "#BBBBBB", fontSize: 13 }}>ESix10 vetted places in {profile.state}</p>
            <button style={S.btn} onClick={() => setShowAddRec(!showAddRec)}>+ Add Place</button>
          </div>
          {showAddRec && (
            <div style={{ ...S.card, marginBottom: 16 }}>
              <span style={S.eyebrow}>Recommend a Place</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div style={{ gridColumn: "1/-1" }}><label style={S.label}>Name</label><input style={S.input} value={recForm.name} onChange={e => setRecForm({...recForm, name: e.target.value})} placeholder="Business name" /></div>
                <div><label style={S.label}>Category</label><select style={S.input} value={recForm.category} onChange={e => setRecForm({...recForm, category: e.target.value})}>{REC_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select></div>
                <div><label style={S.label}>City</label><input style={S.input} value={recForm.address} onChange={e => setRecForm({...recForm, address: e.target.value})} placeholder="City" /></div>
                <div style={{ gridColumn: "1/-1" }}><label style={S.label}>Why recommend it?</label><textarea style={{ ...S.input, minHeight: 60 }} value={recForm.description} onChange={e => setRecForm({...recForm, description: e.target.value})} /></div>
                <div style={{ gridColumn: "1/-1" }}><label style={S.label}>Website (optional)</label><input style={S.input} value={recForm.website} onChange={e => setRecForm({...recForm, website: e.target.value})} placeholder="https://..." /></div>
              </div>
              {profile.role !== "admin" && <p style={{ color: "#8A8A8A", fontSize: 12, marginBottom: 10 }}>Requires admin approval before going live.</p>}
              <button style={S.btn} onClick={saveRec} disabled={!recForm.name}>Submit</button>
            </div>
          )}
          {recommendations.length === 0 && !showAddRec && <div style={{ textAlign: "center", padding: 40 }}><div style={{ fontSize: 40, marginBottom: 12 }}>🗺️</div><h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, color: "#fff", marginBottom: 8 }}>No places yet in {profile.state}</h3><p style={{ color: "#BBBBBB", fontSize: 13 }}>Know a great gym or coffee shop? Add it.</p></div>}
          {REC_CATEGORIES.filter(cat => recommendations.some(r => r.category === cat.id)).map(cat => (
            <div key={cat.id} style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><span style={{ fontSize: 18 }}>{cat.icon}</span><span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#FF7E33", letterSpacing: "0.1em", textTransform: "uppercase" }}>{cat.label}</span></div>
              {recommendations.filter(r => r.category === cat.id).map(rec => (
                <div key={rec.id} style={{ ...S.card, marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: "#fff", marginBottom: 4 }}>{rec.name}</h3>
                      {rec.address && <p style={{ color: "#FF7E33", fontSize: 12, marginBottom: 4 }}>📍 {rec.address}, {rec.state}</p>}
                      {rec.description && <p style={{ color: "#FFFFFF", fontSize: 13, lineHeight: 1.7, marginBottom: 6 }}>{rec.description}</p>}
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {rec.website && <a href={rec.website} target="_blank" rel="noreferrer" style={{ color: "#FF7E33", fontSize: 12, textDecoration: "none" }}>🌐 Website</a>}
                        <span style={{ color: "#444", fontSize: 11 }}>Added by {rec.profiles?.username ? `@${rec.profiles.username}` : formatName(rec.profiles?.full_name)}</span>
                      </div>
                    </div>
                    {profile.role === "admin" && <button style={{ ...S.btnDanger, padding: "4px 8px", fontSize: 11 }} onClick={() => deleteRec(rec.id)}>✕</button>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function isVideoUrl(url) {
  if (!url) return false;
  return /\.(mp4|mov|webm|m4v|avi|mkv)(\?|$)/i.test(url);
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


function StatementOfFaith({ onBack }) {
  return (
    <div className="tab-content">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        {onBack && <button onClick={onBack} style={{ background: "none", border: "none", color: "#FF7E33", cursor: "pointer", fontSize: 20, padding: 0 }}>←</button>}
        <div>
          <span style={S.eyebrow}>ESix10 Initiative</span>
          <h2 style={{ ...S.h2, margin: 0 }}>Statement of Faith</h2>
        </div>
      </div>

      {[
        { title: "Scripture", icon: "📖", body: "We believe the Bible is the inspired, authoritative Word of God — the final standard for faith, conduct, and truth. We build on it. We do not negotiate it." },
        { title: "God", icon: "✝️", body: "We believe in one God, eternally existing in three persons — Father, Son, and Holy Spirit. Creator of all things. Sovereign over all things." },
        { title: "Jesus Christ", icon: "✝️", body: "We believe Jesus Christ is the Son of God — fully God and fully man. Born of a virgin. Lived without sin. Crucified for the sins of humanity. Raised from the dead on the third day. Ascended to the right hand of the Father. He is coming again." },
        { title: "Salvation", icon: "🙏", body: "We believe salvation is by grace alone, through faith alone, in Christ alone. Not by works. Not by religion. Not by effort. By the finished work of Jesus Christ on the cross — received through repentant faith." },
        { title: "The Holy Spirit", icon: "🔥", body: "We believe the Holy Spirit indwells every believer at the moment of salvation — guiding, convicting, empowering, and transforming. The armor of God is put on by men and women who walk in the Spirit." },
        { title: "The Church", icon: "⚔️", body: "We believe in the local and universal church — the body of Christ, made up of all who have placed their faith in Him. ESix10 is not a church. We are a community that serves the church and strengthens the people in it." },
        { title: "Marriage and Family", icon: "◈", body: "We believe God designed marriage as a covenant between one man and one woman. We believe the family is the foundational institution of society — and that healthy families produce healthy communities. ESix10 exists in part to strengthen both." },
        { title: "Human Dignity", icon: "✦", body: "We believe every person is created in the image of God — male and female — and therefore carries inherent dignity and worth. We treat people accordingly." },
      ].map((item, i) => (
        <div key={i} style={{ ...S.card, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 400, color: "#FF7E33", margin: 0 }}>{item.title}</h3>
          </div>
          <p style={{ color: "#FFFFFF", fontSize: 14, lineHeight: 1.8 }}>{item.body}</p>
        </div>
      ))}

      <div style={{ ...S.card, marginBottom: 12, borderTop: "3px solid #FF6600" }}>
        <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 400, color: "#FF7E33", marginBottom: 10 }}>What We Don't Do</h3>
        <p style={{ color: "#FFFFFF", fontSize: 14, lineHeight: 1.8 }}>We do not take denominational positions on secondary theological issues where Bible-believing Christians disagree. ESix10 is not a Baptist organization, a Pentecostal organization, or any other denominational organization. We are a community of believers who stand on the essentials and extend grace on everything else.</p>
      </div>

      <div style={{ ...S.card, marginBottom: 12, background: "linear-gradient(135deg, rgba(255,102,0,0.08), rgba(192,154,47,0.06))", border: "1px solid rgba(255,102,0,0.2)" }}>
        <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 400, color: "#fff", marginBottom: 10 }}>A Word on Welcome</h3>
        <p style={{ color: "#FFFFFF", fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>ESix10 is a faith-based organization. We are clear about what we believe and we do not apologize for it. But we are equally clear about this — everyone is welcome here.</p>
        <p style={{ color: "#FFFFFF", fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>You do not have to share our faith to walk through this door. You do not have to have it all figured out. You do not have to clean yourself up before you show up.</p>
        <p style={{ color: "#FFFFFF", fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>We will not change our standard to make anyone comfortable. But we will never use our standard as a weapon against anyone either. That is not the way of Christ and it is not the way of ESix10.</p>
        <p style={{ color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: 14, fontStyle: "italic" }}>You are welcome here. Exactly as you are. Right now.</p>
      </div>

      <div style={{ background: "rgba(255,102,0,0.06)", border: "1px solid rgba(255,102,0,0.15)", borderRadius: 10, padding: "16px 20px", textAlign: "center", marginBottom: 24 }}>
        <p style={{ color: "#FFFFFF", fontSize: 14, fontStyle: "italic", lineHeight: 1.7 }}>"We love because He first loved us."</p>
        <p style={{ color: "#FF7E33", fontSize: 12, letterSpacing: "0.1em", marginTop: 6 }}>— 1 John 4:19</p>
      </div>
    </div>
  );
}

// ─── Plan of Salvation ────────────────────────────────────────────────────────
function PlanOfSalvation({ onBack, profile }) {
  const [prayed, setPrayed] = useState(false);
  const [showPrayer, setShowPrayer] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [note, setNote] = useState("");

  async function requestConnection() {
    setConnecting(true);
    await supabase.from("posts").insert({
      user_id: profile.id,
      group_id: profile.group_id,
      body: `🙏 I just prayed to receive Christ and would like to connect with someone in my area. ${note ? `Note: ${note}` : ""}`.trim()
    });
    setConnected(true);
    setConnecting(false);
  }

  return (
    <div className="tab-content">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        {onBack && <button onClick={onBack} style={{ background: "none", border: "none", color: "#FF7E33", cursor: "pointer", fontSize: 20, padding: 0 }}>←</button>}
        <div>
          <span style={S.eyebrow}>Do You Know Him?</span>
          <h2 style={{ ...S.h2, margin: 0 }}>The Plan of Salvation</h2>
        </div>
      </div>

      <div style={{ ...S.card, marginBottom: 12, borderTop: "3px solid #FF6600" }}>
        <p style={{ color: "#FFFFFF", fontSize: 15, lineHeight: 1.9 }}>Everything ESix10 is built on — the discipline, the brotherhood, the readiness, the standard — it all flows from one thing. A relationship with Jesus Christ. Not a religion. Not a set of rules. A relationship.</p>
      </div>

      {[
        {
          step: "The Problem",
          icon: "⚠️",
          scripture: "For all have sinned and fall short of the glory of God.",
          ref: "Romans 3:23",
          body: "Every one of us was born separated from God. Not because God is distant — but because we are broken. The Bible calls it sin. It is the condition of every human heart.",
          scripture2: "For the wages of sin is death.",
          ref2: "Romans 6:23a"
        },
        {
          step: "The Solution",
          icon: "✝️",
          scripture: "But God demonstrates his own love for us in this: While we were still sinners, Christ died for us.",
          ref: "Romans 5:8",
          body: "God did not leave us there. Jesus Christ — fully God, fully man — took the penalty for every sin you have ever committed or will ever commit. He died in your place. He was buried. And on the third day He rose from the dead.",
          scripture2: "For the wages of sin is death, but the gift of God is eternal life in Christ Jesus our Lord.",
          ref2: "Romans 6:23"
        },
        {
          step: "Your Response",
          icon: "🙏",
          scripture: "If you declare with your mouth, 'Jesus is Lord,' and believe in your heart that God raised him from the dead, you will be saved.",
          ref: "Romans 10:9",
          body: "This gift has to be received. It is not automatic. The Bible is clear about how.",
          scripture2: "For everyone who calls on the name of the Lord will be saved.",
          ref2: "Romans 10:13"
        },
      ].map((item, i) => (
        <div key={i} style={{ ...S.card, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>{item.icon}</span>
            <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 400, color: "#fff", margin: 0 }}>{item.step}</h3>
          </div>
          <div style={{ background: "rgba(255,102,0,0.06)", border: "1px solid rgba(255,102,0,0.15)", borderRadius: 6, padding: "12px 16px", marginBottom: 12 }}>
            <p style={{ color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: 14, fontStyle: "italic", lineHeight: 1.7, marginBottom: 4 }}>"{item.scripture}"</p>
            <p style={{ color: "#FF7E33", fontSize: 12, letterSpacing: "0.1em" }}>— {item.ref}</p>
          </div>
          <p style={{ color: "#FFFFFF", fontSize: 14, lineHeight: 1.8, marginBottom: item.scripture2 ? 12 : 0 }}>{item.body}</p>
          {item.scripture2 && (
            <div style={{ background: "rgba(255,102,0,0.06)", border: "1px solid rgba(255,102,0,0.15)", borderRadius: 6, padding: "12px 16px" }}>
              <p style={{ color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: 14, fontStyle: "italic", lineHeight: 1.7, marginBottom: 4 }}>"{item.scripture2}"</p>
              <p style={{ color: "#FF7E33", fontSize: 12, letterSpacing: "0.1em" }}>— {item.ref2}</p>
            </div>
          )}
        </div>
      ))}

      {/* Prayer Section */}
      <div style={{ ...S.card, marginBottom: 12, borderTop: prayed ? "3px solid #51cf66" : "3px solid #FF6600" }}>
        <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 400, color: "#fff", marginBottom: 12 }}>A Simple Prayer</h3>
        <p style={{ color: "#FFFFFF", fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>If you are ready to make that decision right now — you can. God is not waiting on a perfect moment. He is waiting on you.</p>

        {!showPrayer ? (
          <button style={{ ...S.btn, width: "100%", padding: 16 }} onClick={() => setShowPrayer(true)}>
            I'm Ready — Show Me the Prayer
          </button>
        ) : (
          <div>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 20, marginBottom: 20 }}>
              <p style={{ color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: 14, fontStyle: "italic", lineHeight: 2.1 }}>
                "God, I know I am a sinner. I know I cannot fix that on my own. I believe Jesus Christ died for my sins and rose from the dead. I am turning from my old life and placing my faith in Him. I receive the gift of salvation. Come into my life and make me new. Amen."
              </p>
            </div>
            {!prayed ? (
              <button style={{ ...S.btn, width: "100%", padding: 16, background: "#51cf66" }} onClick={() => setPrayed(true)}>
                🙏 I Prayed This Prayer
              </button>
            ) : (
              <div style={{ background: "rgba(81,207,102,0.08)", border: "1px solid rgba(81,207,102,0.2)", borderRadius: 8, padding: 20, textAlign: "center" }}>
                <span style={{ fontSize: 32, display: "block", marginBottom: 8 }}>🎉</span>
                <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, color: "#51cf66", marginBottom: 8 }}>Welcome to the Family.</h3>
                <p style={{ color: "#FFFFFF", fontSize: 14, lineHeight: 1.8 }}>That decision is the most important one you will ever make. Heaven is celebrating right now. So are we.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Connect Section */}
      {prayed && (
        <div style={{ ...S.card, marginBottom: 24 }}>
          <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 400, color: "#fff", marginBottom: 8 }}>Connect With Someone Near You</h3>
          <p style={{ color: "#FFFFFF", fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>You do not have to figure this out alone. Let us connect you with a real person in your area who can walk with you from here. No program. No pressure. Just a brother or sister who has been where you are.</p>
          {!connected ? (
            <div>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Anything you want to share (optional)</label>
                <input style={S.input} placeholder="City, questions, background..." value={note} onChange={e => setNote(e.target.value)} />
              </div>
              <button style={{ ...S.btn, width: "100%", padding: 16 }} onClick={requestConnection} disabled={connecting}>
                {connecting ? "Sending..." : "Connect Me With Someone"}
              </button>
            </div>
          ) : (
            <div style={{ background: "rgba(255,102,0,0.08)", border: "1px solid rgba(255,102,0,0.2)", borderRadius: 8, padding: 20, textAlign: "center" }}>
              <p style={{ color: "#FF7E33", fontFamily: "'Inter', sans-serif", fontSize: 15 }}>Request sent. Someone will reach out to you soon.</p>
              <p style={{ color: "#BBBBBB", fontSize: 13, marginTop: 8 }}>In the meantime — you are already part of this community. Start here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ─── Welcome Modal ────────────────────────────────────────────────────────────
function WelcomeModal({ profile, onClose }) {
  const group = GROUPS.find(g => g.id === profile.group_id);
  const groupMessages = {
    brotherhood: {
      headline: "Brother, you're in.",
      body: "You just joined a community of men who refuse to drift. Men who train together, pray together, and hold each other to a standard that doesn't move. This is the Brotherhood.",
      scripture: "Therefore, my beloved brothers, be steadfast, immovable, always abounding in the work of the Lord.",
      ref: "1 Corinthians 15:58"
    },
    sisterhood: {
      headline: "Sister, you're home.",
      body: "You just joined a community of women who refuse to quit. Women who are fierce enough to fight for their families and faithful enough to trust God with what they cannot control. This is the Sisterhood.",
      scripture: "She is clothed with strength and dignity, and she laughs without fear of the future.",
      ref: "Proverbs 31:25"
    },
    family: {
      headline: "Welcome, family.",
      body: "You just joined a community built around the most important institution on earth — the home. Together we study, grow, and build something that lasts. Boys and girls are watching. Give them something worth seeing.",
      scripture: "As for me and my house, we will serve the Lord.",
      ref: "Joshua 24:15"
    }
  };

  const msg = groupMessages[profile.group_id] || {
    headline: "Welcome to ESix10.",
    body: "You have joined a community built on faith, discipline, and readiness. Prepared. Equipped. Unshaken.",
    scripture: "Finally, be strong in the Lord and in his mighty power.",
    ref: "Ephesians 6:10"
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }} className="fade-up">
        <img src="/esix10logo.png" alt="ESix10" style={{ height: 80, width: "auto", objectFit: "contain", marginBottom: 16 }} />
        
        <div style={{ marginBottom: 24 }}>
          <span style={{ ...S.eyebrow, display: "block", marginBottom: 8 }}>{group?.label} — {group?.subtitle}</span>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 28, fontWeight: 400, color: "#fff", marginBottom: 16 }}>{msg.headline}</h2>
          <p style={{ color: "#FFFFFF", fontSize: 15, lineHeight: 1.9, marginBottom: 24 }}>{msg.body}</p>
        </div>

        <div style={{ background: "rgba(255,102,0,0.08)", border: "1px solid rgba(255,102,0,0.2)", borderRadius: 10, padding: "20px 24px", marginBottom: 32 }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontStyle: "italic", color: "#fff", lineHeight: 1.8, marginBottom: 8 }}>"{msg.scripture}"</p>
          <p style={{ color: "#FF7E33", fontSize: 12, letterSpacing: "0.1em" }}>— {msg.ref}</p>
        </div>

        <div style={{ marginBottom: 24 }}>
          <p style={{ color: "#BBBBBB", fontSize: 13, lineHeight: 1.8 }}>
            Here's where to start:<br/>
            <span style={{ color: "#FF7E33" }}>📋 Feed</span> — introduce yourself to the community<br/>
            <span style={{ color: "#FF7E33" }}>🙏 Prayer</span> — share what's on your heart<br/>
            <span style={{ color: "#FF7E33" }}>🔥 The Forge</span> — log your first walk today<br/>
            <span style={{ color: "#FF7E33" }}>👤 Profile</span> — set your avatar and bio
          </p>
        </div>

        <button style={{ ...S.btn, width: "100%", padding: 16, fontSize: 13, letterSpacing: "0.2em" }} onClick={onClose}>
          Enter the Community
        </button>

        <p style={{ color: "#444", fontSize: 11, marginTop: 16, letterSpacing: "0.05em" }}>
          Ephesians 6:10 — Prepared. Equipped. Unshaken.
        </p>
      </div>
    </div>
  );
}


// ─── Kudos ────────────────────────────────────────────────────────────────────


// ─── Social Feed ──────────────────────────────────────────────────────────────
function SocialFeed({ profile }) {
  const [activeTab, setActiveTab] = useState('instagram');

  const FB_PAGE_ID = '61590756660019';
  const IG_USERNAME = 'esix10initiative';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <span style={S.eyebrow}>ESix10 Social</span>
          <h2 style={{ ...S.h2, margin: 0 }}>Follow Along</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={`https://instagram.com/${IG_USERNAME}`} target="_blank" rel="noreferrer"
            style={{ ...S.btnSm, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)', border: 'none' }}>
            📸 Follow
          </a>
          <a href={`https://facebook.com/profile.php?id=${FB_PAGE_ID}`} target="_blank" rel="noreferrer"
            style={{ ...S.btnSm, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, background: '#1877f2', border: 'none' }}>
            👍 Like
          </a>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: 4 }}>
        {[{id: 'instagram', label: 'Instagram', icon: '📸'}, {id: 'facebook', label: 'Facebook', icon: '📘'}].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ flex: 1, padding: '10px 8px', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', background: activeTab === t.id ? '#FF6600' : 'transparent', color: activeTab === t.id ? '#fff' : '#666' }}>
            <span style={{ fontSize: 18, display: 'block', marginBottom: 2 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Instagram embed */}
      {activeTab === 'instagram' && (
        <div>
          <div style={{ ...S.card, marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📸</div>
            <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, color: '#fff', marginBottom: 8 }}>@{IG_USERNAME}</h3>
            <p style={{ color: '#888', fontSize: 14, lineHeight: 1.8, marginBottom: 20 }}>Follow ESix10 on Instagram for daily content, behind the scenes, and community highlights.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href={`https://instagram.com/${IG_USERNAME}`} target="_blank" rel="noreferrer"
                style={{ ...S.btn, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)', boxShadow: 'none' }}>
                📸 Open Instagram
              </a>
            </div>
          </div>

          {/* Instagram embed widget */}
          <div style={{ ...S.card, overflow: 'hidden', padding: 0 }}>
            <iframe
              src={`https://www.instagram.com/${IG_USERNAME}/embed`}
              style={{ width: '100%', height: 500, border: 'none', borderRadius: 12 }}
              scrolling="no"
              allowTransparency="true"
              title="ESix10 Instagram"
            />
          </div>
        </div>
      )}

      {/* Facebook embed */}
      {activeTab === 'facebook' && (
        <div>
          <div style={{ ...S.card, marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📘</div>
            <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, color: '#fff', marginBottom: 8 }}>ESix10 Initiative</h3>
            <p style={{ color: '#888', fontSize: 14, lineHeight: 1.8, marginBottom: 20 }}>Like our Facebook page for updates, events, and community news.</p>
            <a href={`https://facebook.com/profile.php?id=${FB_PAGE_ID}`} target="_blank" rel="noreferrer"
              style={{ ...S.btn, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1877f2', boxShadow: 'none' }}>
              📘 Open Facebook
            </a>
          </div>

          {/* Facebook page plugin embed */}
          <div style={{ ...S.card, overflow: 'hidden', padding: 0, borderRadius: 12 }}>
            <iframe
              src={`https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2Fprofile.php%3Fid%3D${FB_PAGE_ID}&tabs=timeline&width=380&height=500&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=true&appId`}
              style={{ width: '100%', height: 500, border: 'none', borderRadius: 12, overflow: 'hidden' }}
              scrolling="no"
              allowFullScreen
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              title="ESix10 Facebook"
            />
          </div>
        </div>
      )}

      {/* Share section */}
      <div style={{ ...S.card, marginTop: 20, textAlign: 'center', background: 'linear-gradient(135deg, rgba(255,102,0,0.08), rgba(192,154,47,0.06))' }}>
        <p style={{ color: '#CCCCCC', fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>
          Help grow the community — follow us on social and share with someone who needs this.
        </p>
        <p style={{ color: '#FF6600', fontFamily: "'Inter', sans-serif", fontSize: 13, fontStyle: 'italic' }}>
          "Iron sharpens iron." — Proverbs 27:17
        </p>
      </div>
    </div>
  );
}

// ─── Share ESix10 ─────────────────────────────────────────────────────────────
function ShareESix10({ profile, onClose }) {
  const [copied, setCopied] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  const appUrl = "https://community.esix10.com";
  const inviteMsg = `I joined ESix10 — a faith-based community built on Ephesians 6:10. Brotherhood, Sisterhood, and Family groups with daily devotions, prayer requests, and The Forge fitness section. Come check it out: ${appUrl}`;

  function copyLink() {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyMessage() {
    navigator.clipboard.writeText(inviteMsg);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
  }

  function shareNative() {
    if (navigator.share) {
      navigator.share({ title: "ESix10 Community", text: inviteMsg, url: appUrl });
    }
  }

  function shareSMS() {
    window.open(`sms:?body=${encodeURIComponent(inviteMsg)}`);
  }

  function shareFacebook() {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(appUrl)}`, "_blank");
  }

  function shareInstagram() {
    // Instagram doesn't have a direct share URL — copy message and open Instagram
    navigator.clipboard.writeText(inviteMsg);
    window.open("https://instagram.com", "_blank");
    alert("Message copied! Paste it in your Instagram story or post.");
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 440, width: "100%", animation: "scaleIn 0.2s ease" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <span style={S.eyebrow}>Spread the Word</span>
            <h2 style={{ ...S.h2, margin: 0 }}>Share ESix10</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#FF7E33", fontSize: 24, cursor: "pointer" }}>✕</button>
        </div>

        {/* App URL */}
        <div style={{ ...S.card, marginBottom: 16 }}>
          <span style={S.eyebrow}>App Link</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 14px", color: "#FF7E33", fontSize: 14, fontFamily: "'Inter', sans-serif" }}>
              community.esix10.com
            </div>
            <button style={{ ...S.btn, padding: "10px 16px", flexShrink: 0 }} onClick={copyLink}>
              {copied ? "✓ Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Share buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {navigator.share && (
            <button onClick={shareNative} style={{ ...S.card, border: "1px solid rgba(255,102,0,0.2)", cursor: "pointer", textAlign: "center", padding: 16 }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📤</div>
              <div style={{ color: "#fff", fontSize: 13, fontFamily: "'Inter', sans-serif" }}>Share</div>
              <div style={{ color: "#BBBBBB", fontSize: 11, marginTop: 2 }}>Native share</div>
            </button>
          )}
          <button onClick={shareSMS} style={{ ...S.card, border: "1px solid rgba(255,102,0,0.2)", cursor: "pointer", textAlign: "center", padding: 16 }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>💬</div>
            <div style={{ color: "#fff", fontSize: 13, fontFamily: "'Inter', sans-serif" }}>Text</div>
            <div style={{ color: "#BBBBBB", fontSize: 11, marginTop: 2 }}>Send via SMS</div>
          </button>
          <button onClick={shareFacebook} style={{ ...S.card, border: "1px solid rgba(255,102,0,0.2)", cursor: "pointer", textAlign: "center", padding: 16 }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📘</div>
            <div style={{ color: "#fff", fontSize: 13, fontFamily: "'Inter', sans-serif" }}>Facebook</div>
            <div style={{ color: "#BBBBBB", fontSize: 11, marginTop: 2 }}>Share to page</div>
          </button>
          <button onClick={shareInstagram} style={{ ...S.card, border: "1px solid rgba(255,102,0,0.2)", cursor: "pointer", textAlign: "center", padding: 16 }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📸</div>
            <div style={{ color: "#fff", fontSize: 13, fontFamily: "'Inter', sans-serif" }}>Instagram</div>
            <div style={{ color: "#BBBBBB", fontSize: 11, marginTop: 2 }}>Copy & post</div>
          </button>
        </div>

        {/* Invite message */}
        <div style={S.card}>
          <span style={S.eyebrow}>Invite Message</span>
          <p style={{ color: "#FFFFFF", fontSize: 14, lineHeight: 1.8, marginBottom: 12, fontStyle: "italic" }}>"{inviteMsg}"</p>
          <button style={{ ...S.btn, width: "100%" }} onClick={copyMessage}>
            {copiedMsg ? "✓ Message Copied!" : "Copy Invite Message"}
          </button>
        </div>

        <p style={{ color: "#444", fontSize: 12, textAlign: "center", marginTop: 16 }}>
          "Iron sharpens iron." — Proverbs 27:17
        </p>
      </div>
    </div>
  );
}


// ─── Main App ──────────────────────────────────────────────────────────────────
function AdminDashboard({ profile }) {
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

function PasswordResetScreen({ onDone }) {
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  async function submit() {
    if (pass.length < 6) { setErr("Password must be at least 6 characters."); return; }
    setBusy(true); setErr("");
    const { error } = await supabase.auth.updateUser({ password: pass });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setDone(true);
  }
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/esix10logo.png" alt="ESix10" style={{ height: 120, width: "auto", objectFit: "contain" }} />
        </div>
        <div style={S.card}>
          <h2 style={{ ...S.h2, marginTop: 0 }}>Set a New Password</h2>
          {done ? (
            <>
              <p style={S.success}>Password updated. You're all set.</p>
              <button style={{ ...S.btn, width: "100%", padding: "14px 24px", marginTop: 12 }} onClick={onDone}>Continue to ESix10</button>
            </>
          ) : (
            <>
              <p style={{ color: "#FFFFFF", fontSize: 14, marginBottom: 16 }}>Enter a new password for your account.</p>
              <input style={S.input} type="password" placeholder="New password (at least 6 characters)" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
              {err && <p style={S.error}>{err}</p>}
              <button style={{ ...S.btn, width: "100%", padding: "14px 24px", marginTop: 16 }} onClick={submit} disabled={busy}>{busy ? "Saving..." : "Update Password"}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LegalDoc({ sections }) {
  return (
    <div>
      {sections.map((s, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          <div style={{ color: "#FF7E33", fontFamily: "'Inter', sans-serif", fontSize: 15, marginBottom: 4 }}>{s.h}</div>
          {s.p && <p style={{ color: "#CCCCCC", fontSize: 14, lineHeight: 1.7 }}>{s.p}</p>}
        </div>
      ))}
    </div>
  );
}

function LegalAndPrivacy({ onBack }) {
  const [view, setView] = useState("terms");
  return (
    <div style={{ maxWidth: 720 }}>
      <button style={{ ...S.btnGhost, marginBottom: 16 }} onClick={onBack}>← Back</button>
      <h2 style={S.h2}>Legal &amp; Privacy</h2>
      <p style={S.muted}>Effective {LEGAL_EFFECTIVE}</p>
      <div style={{ display: "flex", gap: 8, margin: "16px 0", flexWrap: "wrap" }}>
        <button style={S.tab(view === "terms")} onClick={() => setView("terms")}>Terms of Use</button>
        <button style={S.tab(view === "privacy")} onClick={() => setView("privacy")}>Privacy Policy</button>
        <button style={S.tab(view === "mod")} onClick={() => setView("mod")}>Moderator Agreement</button>
      </div>
      <div style={S.card}>
        <LegalDoc sections={view === "terms" ? TERMS : view === "privacy" ? PRIVACY : MOD_AGREEMENT} />
      </div>
    </div>
  );
}

function AgreementGate({ title, intro, sections, agreeLabel, onAgree, onDecline }) {
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", display: "flex", justifyContent: "center", padding: "28px 16px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 640, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <h1 style={{ ...S.h2, marginBottom: 4 }}>{title}</h1>
          {intro && <p style={S.muted}>{intro}</p>}
        </div>
        <div style={{ ...S.card, maxHeight: "55vh", overflowY: "auto", marginBottom: 16 }}>
          <LegalDoc sections={sections} />
        </div>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", marginBottom: 14 }}>
          <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} style={{ marginTop: 3, accentColor: "#FF6600", width: 18, height: 18, flexShrink: 0 }} />
          <span style={{ color: "#fff", fontSize: 14, lineHeight: 1.5 }}>{agreeLabel}</span>
        </label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={{ ...S.btn, opacity: checked && !saving ? 1 : 0.4 }} disabled={!checked || saving} onClick={async () => { setSaving(true); await onAgree(); setSaving(false); }}>{saving ? "Saving…" : "I Agree"}</button>
          <button style={S.btnGhost} onClick={onDecline}>Decline &amp; Sign Out</button>
        </div>
      </div>
    </div>
  );
}

function ProfileCompletionGate({ profile, onDone, onSignOut }) {
  const [username, setUsername] = useState(profile.username || "");
  const [state, setState] = useState(profile.state || "");
  const [city, setCity] = useState(profile.city || "");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  async function save() {
    const clean = username.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (clean.length < 3) { setErr("Pick a username — at least 3 letters, numbers, or underscores."); return; }
    if (!state.trim()) { setErr("Please enter your state."); return; }
    setSaving(true);
    if (clean !== profile.username) {
      const { data: taken } = await supabase.from("profiles").select("id").ilike("username", clean).neq("id", profile.id).maybeSingle();
      if (taken) { setErr(`"${clean}" is already taken — try another.`); setSaving(false); return; }
    }
    const upd = { username: clean, state: state.trim(), city: city.trim() };
    await supabase.from("profiles").update(upd).eq("id", profile.id);
    onDone({ ...profile, ...upd });
    setSaving(false);
  }
  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", display: "flex", justifyContent: "center", padding: "28px 16px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 460, width: "100%", marginTop: 16 }}>
        <h1 style={{ ...S.h2, textAlign: "center", marginBottom: 4 }}>Finish your profile</h1>
        <p style={{ ...S.muted, textAlign: "center", marginBottom: 20 }}>Just a couple things before you jump in.</p>
        <div style={S.card}>
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Username (required)</label>
            <input style={S.input} placeholder="your_username" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} />
            <p style={{ color: "#8A8A8A", fontSize: 11, marginTop: 4 }}>Shown publicly. Letters, numbers, underscores. No repeats.</p>
          </div>
          <div style={S.grid2}>
            <div style={{ marginBottom: 16 }}><label style={S.label}>State (required)</label><input style={S.input} placeholder="State" value={state} onChange={e => setState(e.target.value)} /></div>
            <div style={{ marginBottom: 16 }}><label style={S.label}>City (optional)</label><input style={S.input} placeholder="City" value={city} onChange={e => setCity(e.target.value)} /></div>
          </div>
          {err && <p style={S.error}>{err}</p>}
          <div style={S.flex}>
            <button style={S.btn} onClick={save} disabled={saving}>{saving ? "Saving…" : "Continue"}</button>
            <button style={S.btnGhost} onClick={onSignOut}>Sign Out</button>
          </div>
        </div>
      </div>
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
        <img src="/esix10logo.png" alt="ESix10" style={{ height: isMobile ? 60 : 88, width: "auto", objectFit: "contain" }} />
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
