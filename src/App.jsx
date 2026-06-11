import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

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

const SUPABASE_URL = "https://bffcrhjdibxqfmdreksi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmZmNyaGpkaWJ4cWZtZHJla3NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNjkwMzgsImV4cCI6MjA5NjY0NTAzOH0.yZ7IunHcwTlMKu0uDvKnBnBLBpdDCsPLVWTygmaveEo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const GROUPS = [
  { id: "brotherhood", label: "Brotherhood", subtitle: "Steadfast. Unmovable.", icon: "⚔", color: "#FF6600" },
  { id: "sisterhood", label: "Sisterhood", subtitle: "Fierce. Faithful.", icon: "✦", color: "#FF6600" },
  { id: "family", label: "Family", subtitle: "Rooted. Together. Unbreakable.", icon: "◈", color: "#FF6600" },
];

const ADMIN_EMAIL = "michael@esix10.com";

const REACTIONS = ["🔥", "💪", "🙏", "❤️", "✝️"];

const VERSES = [
  { text: "Be strong in the Lord and in his mighty power.", ref: "Ephesians 6:10" },
  { text: "Iron sharpens iron, so one person sharpens another.", ref: "Proverbs 27:17" },
  { text: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" },
  { text: "For God has not given us a spirit of fear, but of power and of love and of a sound mind.", ref: "2 Timothy 1:7" },
  { text: "The Lord is my strength and my shield; my heart trusts in him.", ref: "Psalm 28:7" },
  { text: "Be watchful, stand firm in the faith, act like men, be strong.", ref: "1 Corinthians 16:13" },
  { text: "No weapon formed against you shall prosper.", ref: "Isaiah 54:17" },
];

const getTodayVerse = () => {
  const day = new Date().getDay();
  return VERSES[day % VERSES.length];
};

// Format name as First name + Last initial
const formatName = (fullName) => {
  if (!fullName) return "Member";
  const parts = fullName.trim().split(" ");
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
};

// Display name — username if set, otherwise first + last initial
const displayName = (profile) => {
  if (profile?.username) return `@${profile.username}`;
  return formatName(profile?.full_name);
};



// ─── Global CSS ───────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
@keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
@keyframes slideIn { from { opacity:0; transform:translateX(-12px); } to { opacity:1; transform:translateX(0); } }
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.fade-up { animation: fadeUp 0.4s ease forwards; }
.slide-in { animation: slideIn 0.3s ease forwards; }
.tab-content { animation: fadeUp 0.3s ease forwards; }
.reaction-btn:hover { transform: scale(1.2); transition: transform 0.15s; }
.post-card:hover { border-color: rgba(255,102,0,0.2) !important; transition: border-color 0.2s; }
.online-dot { width:8px; height:8px; border-radius:50%; background:#51cf66; display:inline-block; animation: pulse 2s infinite; }
.verse-banner { background: linear-gradient(135deg, rgba(255,102,0,0.08) 0%, rgba(192,154,47,0.08) 100%); border: 1px solid rgba(255,102,0,0.2); border-radius:10px; padding:18px 20px; margin-bottom:20px; }
`;

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  app: { minHeight: "100vh", background: "#0d1117", color: "#fff", fontFamily: "'Lato', sans-serif", fontSize: 15 },
  nav: { position: "fixed", top: 0, left: 0, right: 0, height: 80, background: "rgba(13,17,23,0.99)", borderBottom: "1px solid rgba(255,102,0,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", zIndex: 100 },
  navLogo: { fontFamily: "'Cinzel', serif", fontSize: 16, fontWeight: 600, color: "#fff", letterSpacing: "0.08em" },
  navLogoSub: { color: "#FF6600", fontSize: 9, display: "block", letterSpacing: "0.35em", marginTop: -2 },
  navRight: { display: "flex", alignItems: "center", gap: 16 },
  badge: { background: "rgba(255,102,0,0.15)", color: "#FF6600", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" },
  btn: { background: "#FF6600", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontFamily: "'Lato', sans-serif", fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", transition: "background 0.2s" },
  btnGhost: { background: "transparent", color: "#AAAAAA", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "10px 24px", fontFamily: "'Lato', sans-serif", fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer" },
  btnSm: { background: "#FF6600", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontFamily: "'Lato', sans-serif", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer" },
  btnDanger: { background: "transparent", color: "#ff4444", border: "1px solid #ff4444", borderRadius: 3, padding: "6px 12px", fontSize: 11, cursor: "pointer" },
  page: { paddingTop: 90, maxWidth: 1100, margin: "0 auto", padding: "90px 24px 60px" },
  card: { background: "rgba(22,27,34,0.98)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 24 },
  input: { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "12px 16px", color: "#fff", fontFamily: "'Lato', sans-serif", fontSize: 15, outline: "none", boxSizing: "border-box" },
  label: { fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#FF6600", marginBottom: 6, display: "block" },
  divider: { width: 50, height: 2, background: "#FF6600", margin: "16px 0" },
  eyebrow: { fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#FF6600", display: "block", marginBottom: 10 },
  h1: { fontFamily: "'Cinzel', serif", fontSize: 36, fontWeight: 400, color: "#fff", marginBottom: 8 },
  h2: { fontFamily: "'Cinzel', serif", fontSize: 26, fontWeight: 400, color: "#fff", marginBottom: 8 },
  h3: { fontFamily: "'Cinzel', serif", fontSize: 20, fontWeight: 400, color: "#fff", marginBottom: 8 },
  muted: { color: "#888", fontSize: 13 },
  grey: { color: "#CCCCCC" },
  orange: { color: "#FF6600" },
  error: { color: "#ff6b6b", fontSize: 13, marginTop: 6 },
  success: { color: "#51cf66", fontSize: 13, marginTop: 6 },
  flex: { display: "flex", alignItems: "center", gap: 12 },
  flexBetween: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 },
  post: { background: "rgba(22,27,34,0.98)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 20, marginBottom: 12 },
  postAuthor: { fontFamily: "'Cinzel', serif", fontSize: 14, fontWeight: 600, color: "#fff" },
  postTime: { fontSize: 11, color: "#555", marginLeft: 8 },
  postBody: { color: "#CCCCCC", fontSize: 15, lineHeight: 1.7, marginTop: 10 },
  tab: (active) => ({ padding: "10px 20px", background: active ? "#FF6600" : "transparent", color: active ? "#fff" : "#888", border: active ? "none" : "1px solid rgba(255,255,255,0.1)", borderRadius: 3, cursor: "pointer", fontFamily: "'Lato',sans-serif", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }),
  groupCard: (selected) => ({ border: selected ? "2px solid #FF6600" : "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "24px 20px", cursor: "pointer", background: selected ? "rgba(255,102,0,0.08)" : "rgba(26,26,26,0.6)", textAlign: "center", transition: "all 0.2s" }),
};

// ─── SQL Setup Instructions ────────────────────────────────────────────────────
const SQL_SETUP = `-- Run this in Supabase SQL Editor
-- Table: profiles
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  username text unique,
  group_id text,
  role text default 'member',
  status text default 'pending',
  city text,
  state text,
  bio text,
  created_at timestamp default now()
);
alter table profiles enable row level security;
create policy "Users can view all profiles" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Table: posts
create table if not exists posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  group_id text,
  body text not null,
  created_at timestamp default now()
);
alter table posts enable row level security;
create policy "Anyone can view posts" on posts for select using (true);
create policy "Members can insert posts" on posts for insert with check (auth.uid() = user_id);
create policy "Users can delete own posts" on posts for delete using (auth.uid() = user_id);

-- Table: events
create table if not exists events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  group_id text,
  event_date timestamp,
  location text,
  created_by uuid references profiles(id),
  created_at timestamp default now()
);
alter table events enable row level security;
create policy "Anyone can view events" on events for select using (true);
create policy "Admins can manage events" on events for all using (true);

-- Table: messages
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  room_id text not null,
  user_id uuid references profiles(id) on delete cascade,
  body text not null,
  created_at timestamp default now()
);
alter table messages enable row level security;
create policy "view messages" on messages for select using (true);
create policy "insert messages" on messages for insert with check (auth.uid() = user_id);
create policy "delete own messages" on messages for delete using (auth.uid() = user_id);

-- Enable realtime
alter publication supabase_realtime add table posts;

-- The Forge tables
create table if not exists forge_walks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  date date not null default current_date,
  distance_miles numeric(4,2),
  duration_minutes int,
  notes text,
  created_at timestamp default now()
);
alter table forge_walks enable row level security;
create policy "view walks" on forge_walks for select using (true);
create policy "insert walks" on forge_walks for insert with check (auth.uid() = user_id);
create policy "delete walks" on forge_walks for delete using (auth.uid() = user_id);

create table if not exists forge_challenges (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  category text default 'Scripture',
  scheduled_date date not null,
  created_by uuid references profiles(id),
  created_at timestamp default now()
);
alter table forge_challenges enable row level security;
create policy "view challenges" on forge_challenges for select using (true);
create policy "manage challenges" on forge_challenges for all using ((select role from profiles where id = auth.uid()) = 'admin');

create table if not exists forge_challenge_completions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  challenge_id uuid references forge_challenges(id) on delete cascade,
  note text,
  created_at timestamp default now(),
  unique(user_id, challenge_id)
);
alter table forge_challenge_completions enable row level security;
create policy "view completions" on forge_challenge_completions for select using (true);
create policy "insert completions" on forge_challenge_completions for insert with check (auth.uid() = user_id);
create policy "delete completions" on forge_challenge_completions for delete using (auth.uid() = user_id);

create table if not exists forge_wods (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  warmup text,
  main_work text,
  cooldown text,
  coaching_notes text,
  estimated_minutes int,
  difficulty int default 3,
  scheduled_date date not null,
  created_by uuid references profiles(id),
  created_at timestamp default now()
);
alter table forge_wods enable row level security;
create policy "view wods" on forge_wods for select using (true);
create policy "manage wods" on forge_wods for all using ((select role from profiles where id = auth.uid()) = 'admin');

create table if not exists forge_wod_completions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  wod_id uuid references forge_wods(id) on delete cascade,
  result text,
  created_at timestamp default now(),
  unique(user_id, wod_id)
);
alter table forge_wod_completions enable row level security;
create policy "view wod completions" on forge_wod_completions for select using (true);
create policy "insert wod completions" on forge_wod_completions for insert with check (auth.uid() = user_id);
alter publication supabase_realtime add table messages;`;

// ─── Components ───────────────────────────────────────────────────────────────

function SetupModal({ onClose }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ ...S.card, maxWidth: 700, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <span style={S.eyebrow}>One-time setup required</span>
        <h2 style={S.h2}>Set Up Your Database</h2>
        <div style={S.divider} />
        <p style={{ ...S.grey, marginBottom: 16 }}>Run this SQL in your Supabase dashboard to create the required tables:</p>
        <ol style={{ ...S.grey, paddingLeft: 20, marginBottom: 20, lineHeight: 2 }}>
          <li>Go to <strong style={{ color: "#fff" }}>Supabase Dashboard → SQL Editor</strong></li>
          <li>Click <strong style={{ color: "#fff" }}>New Query</strong></li>
          <li>Paste the SQL below and click <strong style={{ color: "#fff" }}>Run</strong></li>
          <li>Come back here and refresh</li>
        </ol>
        <pre style={{ background: "#111", border: "1px solid rgba(255,102,0,0.2)", borderRadius: 4, padding: 16, fontSize: 12, color: "#AAAAAA", overflowX: "auto", whiteSpace: "pre-wrap", marginBottom: 20 }}>{SQL_SETUP}</pre>
        <div style={{ display: "flex", gap: 12 }}>
          <button style={S.btn} onClick={() => { navigator.clipboard.writeText(SQL_SETUP); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
            {copied ? "✓ Copied!" : "Copy SQL"}
          </button>
          <button style={S.btnGhost} onClick={onClose}>I've already done this</button>
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
        <img src="https://esix10.com/wp-content/uploads/2026/06/esix10logo.png" alt="ESix10" style={{ height: 112, width: "auto", objectFit: "contain", marginBottom: 8 }} />
        <span style={{ color: "#FF6600", fontSize: 10, display: "block", letterSpacing: "0.35em", textTransform: "uppercase", marginBottom: 32 }}>Community</span>
        <div style={{ ...S.card, textAlign: "left" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(255,102,0,0.1)", border: "2px solid rgba(255,102,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24 }}>⏳</div>
            <span style={S.eyebrow}>Application Received</span>
            <h2 style={{ ...S.h2, fontSize: 22 }}>Pending Approval</h2>
          </div>
          <div style={S.divider} />
          <p style={{ ...S.grey, lineHeight: 1.8, marginBottom: 16 }}>
            Your application to join the <strong style={{ color: "#FF6600" }}>{group?.label || "ESix10"} community</strong> has been received and is being reviewed.
          </p>
          <p style={{ ...S.grey, lineHeight: 1.8, marginBottom: 24 }}>
            You will receive an email confirmation once your application has been approved. This typically takes 24–48 hours.
          </p>
          <div style={{ background: "rgba(255,102,0,0.06)", border: "1px solid rgba(255,102,0,0.15)", borderRadius: 4, padding: "16px 20px", marginBottom: 24 }}>
            <p style={{ color: "#AAAAAA", fontSize: 14, fontStyle: "italic", lineHeight: 1.7 }}>
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
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
        if (error) throw error;
        if (data.user) {
          await supabase.from("profiles").upsert({ id: data.user.id, email, full_name: name, username: username.toLowerCase().replace(/[^a-z0-9_]/g, ""), role: email === ADMIN_EMAIL ? "admin" : "member" });
          setMsg("Account created! Check your email to confirm, then log in.");
          setMode("login");
        }
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <img src="https://esix10.com/wp-content/uploads/2026/06/esix10logo.png" alt="ESix10" style={{ height: 120, width: "auto", objectFit: "contain", marginBottom: 8 }} />
          <span style={{ color: "#FF6600", fontSize: 10, display: "block", letterSpacing: "0.35em", textTransform: "uppercase" }}>Community</span>
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
                <p style={{ color: "#555", fontSize: 11, marginTop: 4 }}>Letters, numbers, and underscores only. Shown publicly.</p>
              </div>
              <div style={{ marginBottom: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <input type="checkbox" checked={ageConfirmed} onChange={e => setAgeConfirmed(e.target.checked)} style={{ accentColor: "#FF6600", width: 18, height: 18, flexShrink: 0 }} />
                  <p style={{ color: "#AAAAAA", fontSize: 13, lineHeight: 1.7 }}>I confirm that I am <strong style={{ color: "#fff" }}>18 years of age or older</strong>.</p>
                </div>
              </div>
              <div style={{ marginBottom: 16, background: "rgba(255,102,0,0.04)", border: "1px solid rgba(255,102,0,0.15)", borderRadius: 8, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: 3, accentColor: "#FF6600", width: 16, height: 16, flexShrink: 0 }} />
                  <div>
                    <p style={{ color: "#AAAAAA", fontSize: 13, lineHeight: 1.7 }}>
                      I have read and agree to the <span style={{ color: "#FF6600", cursor: "pointer", textDecoration: "underline" }} onClick={() => setShowTerms(!showTerms)}>ESix10 Community Standards</span>.
                    </p>
                    {showTerms && (
                      <div style={{ marginTop: 12, padding: 12, background: "rgba(0,0,0,0.3)", borderRadius: 4 }}>
                        <p style={{ color: "#AAAAAA", fontSize: 12, lineHeight: 1.9 }}>
                          <strong style={{ color: "#FF6600" }}>1. Real people. Real respect.</strong> Treat everyone the way you'd want to be treated in your own home.<br/><br/>
                          <strong style={{ color: "#FF6600" }}>2. Language.</strong> We're adults. Real talk happens. But know your audience — keep it from becoming someone else's burden. If you wouldn't say it to someone's face at church, think twice.<br/><br/>
                          <strong style={{ color: "#FF6600" }}>3. Confidentiality.</strong> What's shared here stays here. Someone's prayer request, struggle, or testimony is not yours to share outside these walls. Period.<br/><br/>
                          <strong style={{ color: "#FF6600" }}>4. No harassment.</strong> We sharpen each other — we don't tear each other apart. Disagreement is fine. Disrespect is not.<br/><br/>
                          <strong style={{ color: "#FF6600" }}>5. Faith-forward.</strong> This community was built on Ephesians 6:10. We don't all look the same or sound the same, but we stand on the same foundation. Honor that.<br/><br/>
                          <strong style={{ color: "#FF6600" }}>6. Admin authority is final.</strong> The ESix10 team has the right to remove anyone who disrupts the community. This is someone's house — act accordingly.<br/><br/>
                          <strong style={{ color: "#FF6600" }}>7. Membership is a privilege.</strong> It can be revoked at any time for conduct that goes against the spirit of this community.
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
<span style={{ color: "#555", fontSize: 12 }}>By joining you agree to our </span><span style={{ color: "#FF6600", fontSize: 12 }}>Statement of Faith</span>
            </div>
          )}
          {error && <p style={S.error}>{error}</p>}
          {msg && <p style={S.success}>{msg}</p>}
          <button style={{ ...S.btn, width: "100%", padding: "14px 24px" }} onClick={handleSubmit} disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GroupSelect({ user, onSelect }) {
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  async function confirm() {
    if (!selected) return;
    setLoading(true);
    await supabase.from("profiles").upsert({ id: user.id, group_id: selected });
    onSelect(selected);
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 700, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <span style={S.eyebrow}>Welcome to ESix10</span>
          <h1 style={{ ...S.h1, fontSize: 32 }}>Choose Your Community</h1>
          <div style={{ ...S.divider, margin: "16px auto" }} />
          <p style={S.grey}>Select the group that fits where you are right now. You can always change this later.</p>
        </div>
        <div style={S.grid3}>
          {GROUPS.map(g => (
            <div key={g.id} style={S.groupCard(selected === g.id)} onClick={() => setSelected(g.id)}>
              <div style={{ fontSize: 32, marginBottom: 12, color: "#FF6600" }}>{g.icon}</div>
              <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 20, fontWeight: 400, color: "#fff", marginBottom: 8 }}>{g.label}</h3>
              <p style={{ fontSize: 13, color: "#FF6600", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>{g.subtitle}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <button style={{ ...S.btn, padding: "14px 48px", opacity: selected ? 1 : 0.4 }} onClick={confirm} disabled={!selected || loading}>
            {loading ? "Joining..." : "Join the Community"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Feed({ profile, activeGroup, isNewMember }) {
  const [posts, setPosts] = useState([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postReactions, setPostReactions] = useState({});
  const [showWelcome, setShowWelcome] = useState(isNewMember);
  const bottomRef = useRef(null);
  const verse = getTodayVerse();
  const canPost = activeGroup === "all" || activeGroup === profile.group_id;
  const postTarget = activeGroup === "all" ? profile.group_id : activeGroup;

  useEffect(() => {
    loadPosts();
    const channel = supabase.channel("posts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => loadPosts())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [activeGroup]);

  async function loadPosts() {
    setLoading(true);
    let q = supabase.from("posts").select("*, profiles(full_name, username, group_id, role)").order("created_at", { ascending: false }).limit(50);
    if (profile.role !== "admin") q = q.eq("group_id", profile.group_id);
    else if (activeGroup !== "all") q = q.eq("group_id", activeGroup);
    const { data } = await q;
    setPosts(data || []);
    const reactionMap = {};
    (data || []).forEach(p => { reactionMap[p.id] = p.reactions || {}; });
    setPostReactions(reactionMap);
    setLoading(false);
  }

  async function submitPost() {
    if (!body.trim() || !canPost) return;
    setPosting(true);
    await supabase.from("posts").insert({ user_id: profile.id, group_id: postTarget, body: body.trim(), reactions: {} });
    setBody(""); setPosting(false); loadPosts();
  }

  async function deletePost(id) {
    await supabase.from("posts").delete().eq("id", id);
    loadPosts();
  }

  async function addReaction(postId, emoji) {
    const current = postReactions[postId] || {};
    const updated = { ...current, [emoji]: (current[emoji] || 0) + 1 };
    await supabase.from("posts").update({ reactions: updated }).eq("id", postId);
    setPostReactions(prev => ({ ...prev, [postId]: updated }));
  }

  const groupName = GROUPS.find(g => g.id === postTarget)?.label || "Your Group";
  const activeGroupData = GROUPS.find(g => g.id === (activeGroup === "all" ? profile.group_id : activeGroup));

  return (
    <div className="tab-content">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 22, fontWeight: 400, color: "#fff", marginBottom: 4 }}>{activeGroupData?.label || "Community"}</h2>
        <p style={{ color: "#FF6600", fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700 }}>{activeGroupData?.subtitle || ""}</p>
      </div>
      {showWelcome && (
        <div style={{ background: "linear-gradient(135deg, rgba(255,102,0,0.15), rgba(192,154,47,0.1))", border: "1px solid rgba(255,102,0,0.3)", borderRadius: 6, padding: "20px 24px", marginBottom: 20, position: "relative" }}>
          <button onClick={() => setShowWelcome(false)} style={{ position: "absolute", top: 12, right: 16, background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 18 }}>x</button>
          <span style={S.eyebrow}>Welcome to ESix10</span>
          <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 20, color: "#fff", marginBottom: 8 }}>You are in. Now stand firm.</h3>
          <p style={{ color: "#AAAAAA", fontSize: 14, lineHeight: 1.7 }}>You have joined the {GROUPS.find(g => g.id === profile.group_id)?.label}. Introduce yourself, engage with the community, and stand firm. Ephesians 6:10</p>
        </div>
      )}
      <div className="verse-banner" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span style={{ fontSize: 20 }}>✝️</span>
          <div>
            <span style={{ ...S.eyebrow, marginBottom: 4 }}>Verse of the Day</span>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: 14, fontStyle: "italic", color: "#fff", lineHeight: 1.7, marginBottom: 4 }}>"{verse.text}"</p>
            <p style={{ color: "#FF6600", fontSize: 12, letterSpacing: "0.1em" }}>— {verse.ref}</p>
          </div>
        </div>
      </div>
      <div style={S.card}>
        <label style={S.label}>Share with {groupName}</label>
        {!canPost && profile.role !== "admin" ? (
          <p style={{ ...S.muted, padding: "16px 0" }}>You can only post to your own group.</p>
        ) : (
          <>
            <textarea style={{ ...S.input, minHeight: 90, resize: "vertical" }} placeholder="Share a win, ask a question, encourage someone..." value={body} onChange={e => setBody(e.target.value)} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <button style={S.btn} onClick={submitPost} disabled={posting || !body.trim()}>{posting ? "Posting..." : "Post"}</button>
            </div>
          </>
        )}
      </div>
      <div style={{ marginTop: 20 }}>
        {loading && <p style={{ ...S.muted, textAlign: "center", padding: 40 }}>Loading...</p>}
        {!loading && posts.length === 0 && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <p style={{ ...S.grey, fontSize: 18, fontFamily: "'Cinzel', serif", marginBottom: 8 }}>No posts yet.</p>
            <p style={S.muted}>Be the first to post in {groupName}.</p>
          </div>
        )}
        {posts.map(post => {
          const reactions = postReactions[post.id] || post.reactions || {};
          return (
            <div key={post.id} className="post-card" style={{ ...S.post, marginBottom: 12 }}>
              <div style={S.flexBetween}>
                <div style={S.flex}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, rgba(255,102,0,0.3), rgba(192,154,47,0.2))", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF6600", fontFamily: "'Cinzel', serif", fontSize: 17, fontWeight: 600, border: "1px solid rgba(255,102,0,0.2)" }}>
                    {(post.profiles?.username || post.profiles?.full_name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <span style={S.postAuthor}>{displayName(post.profiles)}</span>
                    {post.profiles?.role === "admin" && <span style={{ ...S.badge, marginLeft: 8, fontSize: 10 }}>Admin</span>}
                    <span style={S.postTime}>{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div style={S.flex}>
                  <span style={{ ...S.badge, fontSize: 10 }}>{GROUPS.find(g => g.id === post.group_id)?.label}</span>
                  {(profile.role === "admin" || profile.id === post.user_id) && (
                    <button style={S.btnDanger} onClick={() => deletePost(post.id)}>Delete</button>
                  )}
                </div>
              </div>
              <p style={S.postBody}>{post.body}</p>
              <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                {REACTIONS.map(emoji => (
                  <button key={emoji} className="reaction-btn" onClick={() => addReaction(post.id, emoji)}
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
    setLoading(true);
    await supabase.from("events").insert({ ...form, created_by: profile.id });
    setShowForm(false);
    setForm({ title: "", description: "", group_id: "all", event_date: "", location: "" });
    loadEvents();
    setLoading(false);
  }

  async function deleteEvent(id) {
    await supabase.from("events").delete().eq("id", id);
    loadEvents();
  }

  return (
    <div>
      <div style={S.flexBetween}>
        <h2 style={{ ...S.h2, margin: 0 }}>Upcoming Events</h2>
        {profile.role === "admin" && (
          <button style={S.btn} onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "+ Add Event"}
          </button>
        )}
      </div>

      {showForm && (
        <div style={{ ...S.card, marginTop: 20 }}>
          <span style={S.eyebrow}>New Event</span>
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
                <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 18, fontWeight: 400, color: "#fff", marginBottom: 6 }}>{ev.title}</h3>
                <div style={S.flex}>
                  {ev.event_date && <span style={S.muted}>📅 {new Date(ev.event_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
                  {ev.location && <span style={S.muted}>📍 {ev.location}</span>}
                  <span style={S.badge}>{GROUPS.find(g => g.id === ev.group_id)?.label || "All Groups"}</span>
                </div>
              </div>
              {profile.role === "admin" && (
                <button style={S.btnDanger} onClick={() => deleteEvent(ev.id)}>Remove</button>
              )}
            </div>
            {ev.description && <p style={{ ...S.postBody, marginTop: 10 }}>{ev.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Members({ profile }) {
  const [members, setMembers] = useState([]);
  const [filter, setFilter] = useState(profile.role === "admin" ? "all" : profile.group_id);
  const [stateFilter, setStateFilter] = useState("");

  useEffect(() => { loadMembers(); }, []);

  async function loadMembers() {
    let q = supabase.from("profiles").select("*").order("state", { ascending: true });
    if (profile.role !== "admin") {
      q = q.eq("group_id", profile.group_id);
    }
    const { data } = await q;
    setMembers(data || []);
  }

  async function removeMember(id) {
    if (!window.confirm("Are you sure you want to remove this member? This cannot be undone.")) return;
    await supabase.from("profiles").delete().eq("id", id);
    loadMembers();
  }

  async function updateRole(id, role) {
    await supabase.from("profiles").update({ role }).eq("id", id);
    loadMembers();
  }

  async function approve(id) {
    await supabase.from("profiles").update({ status: "approved" }).eq("id", id);
    loadMembers();
  }

  async function deny(id) {
    await supabase.from("profiles").update({ status: "denied" }).eq("id", id);
    loadMembers();
  }

  const pending = members.filter(m => m.status === "pending");

  let filtered = profile.role === "admin" && filter !== "all"
    ? members.filter(m => m.group_id === filter)
    : members;

  if (stateFilter) {
    filtered = filtered.filter(m => m.state?.toLowerCase().includes(stateFilter.toLowerCase()));
  }

  const approved = filtered.filter(m => m.status === "approved" || m.role === "admin");
  const states = [...new Set(members.map(m => m.state).filter(Boolean))].sort();
  const myGroup = GROUPS.find(g => g.id === profile.group_id);

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <h2 style={{ ...S.h2, margin: "0 0 12px 0" }}>
          {profile.role === "admin" ? `Members (${filtered.length})` : `${myGroup?.label} (${filtered.length})`}
        </h2>
        {profile.role === "admin" && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["all", ...GROUPS.map(g => g.id)].map(f => (
              <button key={f} style={{ ...S.tab(filter === f), padding: "8px 14px", fontSize: 11 }} onClick={() => setFilter(f)}>
                {f === "all" ? "All" : GROUPS.find(g => g.id === f)?.label}
              </button>
            ))}
          </div>
        )}
      </div>

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
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: "#fff" }}>Pending Approval</span>
              <span style={{ background: "#FF6600", color: "#fff", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>{pending.length}</span>
            </div>
            {pending.map(m => (
              <div key={m.id} style={{ ...S.card, padding: "16px 20px", marginBottom: 8, borderLeft: "3px solid #FF6600" }}>
                <div style={S.flexBetween}>
                  <div style={S.flex}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,102,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF6600", fontFamily: "'Cinzel', serif", fontWeight: 600 }}>
                      {(m.full_name || m.email || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ color: "#fff", fontFamily: "'Cinzel', serif", fontSize: 15 }}>{formatName(m.full_name)}</div>
                      <div style={S.muted}>{profile.role === "admin" ? m.email : ""}</div>
                      {(m.city || m.state) && <div style={{ color: "#FF6600", fontSize: 12, marginTop: 2 }}>📍 {[m.city, m.state].filter(Boolean).join(", ")}</div>}
                    </div>
                  </div>
                  <div style={S.flex}>
                    <span style={S.badge}>{GROUPS.find(g => g.id === m.group_id)?.label || "No Group"}</span>
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
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,102,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF6600", fontFamily: "'Cinzel', serif", fontWeight: 600, flexShrink: 0 }}>
                {(m.full_name || m.email || "?")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <span style={{ color: "#fff", fontFamily: "'Cinzel', serif", fontSize: 14 }}>{formatName(m.full_name)}</span>
                  <span style={{ ...S.badge, fontSize: 10 }}>{GROUPS.find(g => g.id === m.group_id)?.label || "No Group"}</span>
                  {m.role === "admin" && <span style={{ ...S.badge, background: "rgba(255,102,0,0.3)", color: "#FF6600", fontSize: 10 }}>Admin</span>}
                </div>
                {profile.role === "admin" && <div style={{ ...S.muted, fontSize: 12 }}>{m.email}</div>}
                {(m.city || m.state) && <div style={{ color: "#FF6600", fontSize: 12, marginTop: 2 }}>📍 {[m.city, m.state].filter(Boolean).join(", ")}</div>}
                {profile.role === "admin" && m.id !== profile.id && (
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <button style={{ ...S.btnSm, fontSize: 10, padding: "6px 12px" }} onClick={() => updateRole(m.id, m.role === "admin" ? "member" : "admin")}>
                      {m.role === "admin" ? "Remove Admin" : "Make Admin"}
                    </button>
                    <button style={{ ...S.btnDanger, fontSize: 10, padding: "6px 10px" }} onClick={() => removeMember(m.id)}>Remove</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Messaging ────────────────────────────────────────────────────────────────
function Messages({ profile, members }) {
  const defaultRoom = `group_${profile.group_id}`;
  const [activeRoom, setActiveRoom] = useState(
    localStorage.getItem(`esix10_room_${profile.id}`) || defaultRoom
  );
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const bottomRef = useRef(null);

  const GROUP_ROOMS = [
    { id: `group_${profile.group_id}`, label: `${GROUPS.find(g => g.id === profile.group_id)?.label} Chat`, icon: "💬", type: "group" },
    ...(profile.role === "admin" ? GROUPS.filter(g => g.id !== profile.group_id).map(g => ({ id: `group_${g.id}`, label: `${g.label} Chat`, icon: "💬", type: "group" })) : []),
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
    if (window.innerWidth <= 768) setShowRoomList(false);
  }

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
  }

  async function send() {
    if (!body.trim() || !activeRoom) return;
    setPosting(true);
    const senderName = profile.username ? `@${profile.username}` : formatName(profile.full_name);
    const { error } = await supabase.from("messages").insert({ 
      room_id: activeRoom, 
      user_id: profile.id, 
      body: body.trim(),
      sender_name: senderName
    });
    if (error) {
      alert(`Message failed: ${error.message}`);
      console.error("Message error:", error);
    } else {
      setBody("");
      setTimeout(() => loadMessages(), 300);
    }
    setPosting(false);
  }

  async function deleteMessage(id) {
    await supabase.from("messages").delete().eq("id", id);
    loadMessages();
  }

  const currentRoom = [...GROUP_ROOMS, ...dmRooms].find(r => r.id === activeRoom);
  const isMobileChat = useMobile();
  const [showRoomList, setShowRoomList] = useState(!activeRoom);

  function selectRoomMobile(roomId) {
    selectRoom(roomId);
    setShowRoomList(false);
  }

  const ROOM_LIST = (
    <div style={{ width: isMobileChat ? "100%" : 220, borderRight: isMobileChat ? "none" : "1px solid rgba(255,255,255,0.05)", flexShrink: 0, overflowY: "auto", height: isMobileChat ? "calc(100vh - 200px)" : "auto" }}>
      <div style={{ padding: "16px 12px" }}>
        <p style={{ ...S.eyebrow, marginBottom: 12 }}>Group Chats</p>
        {GROUP_ROOMS.map(room => (
          <div key={room.id} onClick={() => isMobileChat ? selectRoomMobile(room.id) : selectRoom(room.id)}
            style={{ padding: "12px 16px", borderRadius: 4, cursor: "pointer", marginBottom: 4, background: activeRoom === room.id ? "rgba(255,102,0,0.1)" : "rgba(255,255,255,0.02)", color: activeRoom === room.id ? "#FF6600" : "#CCCCCC", fontSize: 14, display: "flex", alignItems: "center", gap: 12, border: "1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ fontSize: 20 }}>{room.icon}</span>
            <span>{room.label}</span>
            {isMobileChat && <span style={{ marginLeft: "auto", color: "#555", fontSize: 16 }}>›</span>}
          </div>
        ))}
      </div>
      <div style={{ padding: "0 12px 16px" }}>
        <p style={{ ...S.eyebrow, marginBottom: 12 }}>Direct Messages</p>
        {dmRooms.length === 0 && <p style={{ ...S.muted, fontSize: 12 }}>No members yet</p>}
        {dmRooms.map(room => (
          <div key={room.id} onClick={() => isMobileChat ? selectRoomMobile(room.id) : selectRoom(room.id)}
            style={{ padding: "12px 16px", borderRadius: 4, cursor: "pointer", marginBottom: 4, background: activeRoom === room.id ? "rgba(255,102,0,0.1)" : "rgba(255,255,255,0.02)", color: activeRoom === room.id ? "#FF6600" : "#CCCCCC", fontSize: 14, display: "flex", alignItems: "center", gap: 12, border: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,102,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF6600", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
              {(room.member.username || room.member.full_name || "?")[0].toUpperCase()}
            </div>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{room.label}</span>
            {isMobileChat && <span style={{ marginLeft: "auto", color: "#555", fontSize: 16 }}>›</span>}
          </div>
        ))}
      </div>
    </div>
  );

  const CHAT_VIEW = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: isMobileChat ? "calc(100vh - 200px)" : "auto" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 12 }}>
        {isMobileChat && (
          <button onClick={() => setShowRoomList(true)} style={{ background: "none", border: "none", color: "#FF6600", fontSize: 20, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>‹</button>
        )}
        <span style={{ fontSize: 20 }}>{currentRoom?.icon}</span>
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: 15, color: "#fff" }}>{currentRoom?.label}</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.length === 0 && <div style={{ textAlign: "center", padding: 40 }}><p style={S.muted}>No messages yet. Start the conversation.</p></div>}
        {messages.map(msg => {
          const isOwn = msg.user_id === profile.id;
          const senderName = msg.sender_name || "Member";
          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: isOwn ? "row-reverse" : "row", alignItems: "flex-start", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: isOwn ? "rgba(255,102,0,0.3)" : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", color: isOwn ? "#FF6600" : "#666", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                {(msg.sender_name || "?")[0].toUpperCase()}
              </div>
              <div style={{ maxWidth: "75%" }}>
                <div style={{ fontSize: 10, color: "#555", marginBottom: 3, textAlign: isOwn ? "right" : "left" }}>
                  {senderName} · {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div style={{ background: isOwn ? "rgba(255,102,0,0.15)" : "rgba(255,255,255,0.05)", border: isOwn ? "1px solid rgba(255,102,0,0.2)" : "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 14, lineHeight: 1.6, wordBreak: "break-word" }}>
                  {msg.body}
                </div>
                {(isOwn || profile.role === "admin") && (
                  <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "#555", marginTop: 2, textAlign: isOwn ? "right" : "left", display: "block", width: "100%" }} onClick={() => deleteMessage(msg.id)}>delete</button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 8 }}>
        <input style={{ ...S.input, flex: 1, fontSize: 14, padding: "10px 14px" }} placeholder="Type a message..." value={body} onChange={e => setBody(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }}} />
        <button style={{ ...S.btn, padding: "10px 16px", flexShrink: 0 }} onClick={send} disabled={posting || !body.trim()}>Send</button>
      </div>
    </div>
  );

  if (isMobileChat) {
    return (
      <div style={{ margin: "-16px -16px 0" }}>
        {showRoomList || !activeRoom ? ROOM_LIST : CHAT_VIEW}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 0, height: "calc(100vh - 130px)", minHeight: 500 }}>
      {ROOM_LIST}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {!activeRoom ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
            <span style={{ fontSize: 40 }}>💬</span>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: "#fff" }}>Select a conversation</p>
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
    if (!body.trim()) return;
    setPosting(true);
    const authorName = anonymous ? "Anonymous" : (profile.username ? `@${profile.username}` : formatName(profile.full_name));
    await supabase.from("prayers").insert({ user_id: profile.id, group_id: profile.group_id, body: body.trim(), anonymous, author_name: authorName, reactions: 0, pinned: false });
    setBody(""); setPosting(false); loadPrayers();
  }

  async function react(id, current) {
    await supabase.from("prayers").update({ reactions: (current || 0) + 1 }).eq("id", id);
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
      <span style={S.eyebrow}>Prayer Requests</span>
      <h2 style={{ ...S.h2, marginBottom: 20 }}>Lift Each Other Up</h2>
      <div style={S.card}>
        <label style={S.label}>Share a Prayer Request</label>
        <textarea style={{ ...S.input, minHeight: 80, resize: "vertical" }} placeholder="Share what's on your heart. This community stands with you." value={body} onChange={e => setBody(e.target.value)} />
        <div style={{ ...S.flexBetween, marginTop: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "#888", fontSize: 13 }}>
            <input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} style={{ accentColor: "#FF6600" }} />
            Post anonymously
          </label>
          <button style={S.btn} onClick={submitPrayer} disabled={posting || !body.trim()}>{posting ? "Posting..." : "Submit Request"}</button>
        </div>
      </div>
      <div style={{ marginTop: 20 }}>
        {prayers.length === 0 && <div style={{ textAlign: "center", padding: 60 }}><p style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: "#fff", marginBottom: 8 }}>No prayer requests yet.</p><p style={S.muted}>Be the first to share.</p></div>}
        {prayers.map(p => (
          <div key={p.id} style={{ ...S.post, borderLeft: p.pinned ? "3px solid #FF6600" : "none", marginBottom: 12 }}>
            <div style={S.flexBetween}>
              <div style={S.flex}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,102,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF6600", fontSize: 16 }}>{p.anonymous ? "🙏" : (p.author_name || "?")[0].toUpperCase()}</div>
                <div>
                  <span style={S.postAuthor}>{p.author_name || "Member"}</span>
                  {p.pinned && <span style={{ ...S.badge, marginLeft: 8, fontSize: 10 }}>📌 Pinned</span>}
                  <span style={S.postTime}>{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div style={S.flex}>
                {profile.role === "admin" && <button style={S.btnSm} onClick={() => pin(p.id, p.pinned)}>{p.pinned ? "Unpin" : "📌 Pin"}</button>}
                {(profile.role === "admin" || profile.id === p.user_id) && <button style={S.btnDanger} onClick={() => deletePrayer(p.id)}>Remove</button>}
              </div>
            </div>
            <p style={S.postBody}>{p.body}</p>
            <button onClick={() => react(p.id, p.reactions)} style={{ background: "rgba(255,102,0,0.08)", border: "1px solid rgba(255,102,0,0.2)", borderRadius: 20, padding: "6px 16px", color: "#FF6600", cursor: "pointer", fontSize: 13, marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
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
    await supabase.from("devotions").update({ reactions: (current || 0) + 1 }).eq("id", id);
    loadDevotions();
  }

  async function postComment(devotionId) {
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
        {devotions.length === 0 && <div style={{ textAlign: "center", padding: 60 }}><p style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: "#fff", marginBottom: 8 }}>No devotions yet.</p>{profile.role === "admin" && <p style={S.muted}>Post the first devotion for the community.</p>}</div>}
        {devotions.map((d, idx) => (
          <div key={d.id} style={{ ...S.card, marginBottom: 16, borderTop: idx === 0 ? "3px solid #FF6600" : "1px solid rgba(255,255,255,0.06)" }}>
            <div style={S.flexBetween}>
              <div>
                {idx === 0 && <span style={{ ...S.badge, marginBottom: 8, display: "inline-block" }}>Today</span>}
                <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 20, fontWeight: 400, color: "#fff", marginBottom: 8 }}>{d.title}</h3>
                {d.scripture && <div style={{ background: "rgba(255,102,0,0.06)", border: "1px solid rgba(255,102,0,0.15)", borderRadius: 4, padding: "12px 16px", marginBottom: 12 }}><p style={{ color: "#fff", fontFamily: "'Cinzel', serif", fontSize: 14, fontStyle: "italic", lineHeight: 1.7 }}>"{d.scripture}"</p>{d.scripture_ref && <p style={{ color: "#FF6600", fontSize: 12, marginTop: 4, letterSpacing: "0.1em" }}>— {d.scripture_ref}</p>}</div>}
              </div>
              {profile.role === "admin" && <button style={S.btnDanger} onClick={() => deleteDevotion(d.id)}>Remove</button>}
            </div>
            <p style={{ ...S.postBody, marginBottom: 12 }}>{d.body}</p>
            <div style={S.flexBetween}>
              <button onClick={() => react(d.id, d.reactions)} style={{ background: "rgba(255,102,0,0.08)", border: "1px solid rgba(255,102,0,0.2)", borderRadius: 20, padding: "6px 14px", color: "#FF6600", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>❤️ {d.reactions || 0}</button>
              <span style={S.muted}>{new Date(d.created_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
            </div>
            {idx === 0 && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16, marginTop: 16 }}>
                <p style={{ ...S.eyebrow, marginBottom: 12 }}>Responses</p>
                {(comments[d.id] || []).map(c => (
                  <div key={c.id} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,102,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF6600", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{(c.author_name || "?")[0].toUpperCase()}</div>
                    <div><span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{c.author_name}</span><p style={{ color: "#AAAAAA", fontSize: 14, marginTop: 4, lineHeight: 1.6 }}>{c.body}</p></div>
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


// ─── The Forge ────────────────────────────────────────────────────────────────
const FORGE_CSS = `
.forge-tab-bar { display: flex; gap: 4px; margin-bottom: 24px; background: rgba(255,255,255,0.03); border-radius: 6px; padding: 4px; }
.forge-tab { flex: 1; padding: 12px 8px; border: none; border-radius: 6px; cursor: pointer; font-family: 'Lato', sans-serif; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; transition: all 0.2s; }
.forge-tab.active { background: #FF6600; color: #fff; }
.forge-tab.inactive { background: transparent; color: #666; }
.forge-tab.inactive:hover { color: #FF6600; }
.streak-badge { display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg, rgba(255,102,0,0.2), rgba(192,154,47,0.15)); border: 1px solid rgba(255,102,0,0.3); border-radius: 20px; padding: 6px 16px; }
.complete-btn { width: 100%; padding: 16px; border: 2px solid #FF6600; border-radius: 6px; background: transparent; color: #FF6600; font-family: 'Lato', sans-serif; font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; }
.complete-btn:hover, .complete-btn.done { background: #FF6600; color: #fff; }
.beta-banner { background: linear-gradient(135deg, rgba(255,102,0,0.1), rgba(192,154,47,0.08)); border: 1px solid rgba(255,102,0,0.2); border-radius: 6px; padding: 12px 20px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
`;

const CHALLENGE_CATEGORIES = ['Scripture', 'Physical', 'Mental', 'Preparedness', 'Leadership'];
const CATEGORY_ICONS = { Scripture: '✝️', Physical: '💪', Mental: '🧠', Preparedness: '◈', Leadership: '⚔️' };

function ForgeWalk({ profile }) {
  const [todayWalk, setTodayWalk] = useState(null);
  const [streak, setStreak] = useState(0);
  const [totalToday, setTotalToday] = useState(0);
  const [form, setForm] = useState({ distance_miles: '', duration_minutes: '', notes: '' });
  const [logging, setLogging] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => { loadWalkData(); }, []);

  async function loadWalkData() {
    const { data: walks } = await supabase.from('forge_walks').select('*').eq('user_id', profile.id).order('date', { ascending: false }).limit(60);
    if (!walks) return;
    const todayEntry = walks.find(w => w.date === today);
    setTodayWalk(todayEntry || null);
    let s = 0;
    let checkDate = new Date();
    for (let i = 0; i < 60; i++) {
      const d = checkDate.toISOString().split('T')[0];
      if (walks.find(w => w.date === d)) { s++; checkDate.setDate(checkDate.getDate() - 1); }
      else break;
    }
    setStreak(s);
    const { count } = await supabase.from('forge_walks').select('*', { count: 'exact', head: true }).eq('date', today);
    setTotalToday(count || 0);
  }

  async function logWalk() {
    setLogging(true);
    await supabase.from('forge_walks').insert({ user_id: profile.id, date: today, distance_miles: form.distance_miles ? parseFloat(form.distance_miles) : null, duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null, notes: form.notes || null });
    setLogging(false); loadWalkData();
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div className="streak-badge">
          <span style={{ fontSize: 20 }}>🔥</span>
          <div><div style={{ fontFamily: "'Cinzel', serif", fontSize: 22, color: '#FF6600', lineHeight: 1 }}>{streak}</div><div style={{ fontSize: 10, color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Day Streak</div></div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🚶</span>
          <div><div style={{ fontFamily: "'Cinzel', serif", fontSize: 22, color: '#fff', lineHeight: 1 }}>{totalToday}</div><div style={{ fontSize: 10, color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Walked Today</div></div>
        </div>
      </div>
      {todayWalk ? (
        <div style={{ ...S.card, borderTop: '3px solid #51cf66', textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 20, color: '#fff', marginBottom: 8 }}>You walked today.</h3>
          <p style={{ color: '#888', fontSize: 14 }}>{todayWalk.distance_miles && `${todayWalk.distance_miles} miles`}{todayWalk.distance_miles && todayWalk.duration_minutes && ' · '}{todayWalk.duration_minutes && `${todayWalk.duration_minutes} minutes`}</p>
          {todayWalk.notes && <p style={{ color: '#AAAAAA', fontSize: 14, marginTop: 8, fontStyle: 'italic' }}>"{todayWalk.notes}"</p>}
          <p style={{ color: '#FF6600', fontSize: 12, marginTop: 16, letterSpacing: '0.1em' }}>🔥 {streak} day streak — keep it going tomorrow</p>
        </div>
      ) : (
        <div style={S.card}>
          <span style={S.eyebrow}>Daily Walk for Sanity</span>
          <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 20, color: '#fff', marginBottom: 8 }}>Did you walk today?</h3>
          <p style={{ color: '#888', fontSize: 14, marginBottom: 24, lineHeight: 1.7 }}>One walk. Every day. Not for performance — for your mind, your body, and your soul.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div><label style={S.label}>Distance (miles)</label><input style={S.input} type="number" step="0.1" placeholder="1.5" value={form.distance_miles} onChange={e => setForm({...form, distance_miles: e.target.value})} /></div>
            <div><label style={S.label}>Duration (minutes)</label><input style={S.input} type="number" placeholder="30" value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: e.target.value})} /></div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={S.label}>Notes (optional)</label>
            <input style={S.input} placeholder="Where did you walk? How did you feel?" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          </div>
          <button style={{ ...S.btn, width: '100%', padding: 16 }} onClick={logWalk} disabled={logging}>{logging ? 'Logging...' : '✓ I Walked Today'}</button>
        </div>
      )}
    </div>
  );
}

function ForgeChallenge({ profile }) {
  const [challenge, setChallenge] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [note, setNote] = useState('');
  const [completionCount, setCompletionCount] = useState(0);
  const [completions, setCompletions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'Scripture', scheduled_date: '' });
  const [queue, setQueue] = useState([]);
  const [showQueue, setShowQueue] = useState(false);
  const [generating, setGenerating] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => { loadChallenge(); }, []);

  async function loadChallenge() {
    const { data } = await supabase.from('forge_challenges').select('*').eq('scheduled_date', today).maybeSingle();
    setChallenge(data || null);
    if (data) {
      const { count } = await supabase.from('forge_challenge_completions').select('*', { count: 'exact', head: true }).eq('challenge_id', data.id);
      setCompletionCount(count || 0);
      const { data: myCompletion } = await supabase.from('forge_challenge_completions').select('*').eq('challenge_id', data.id).eq('user_id', profile.id).single();
      setCompleted(!!myCompletion);
      const { data: allCompletions } = await supabase.from('forge_challenge_completions').select('*, profiles(full_name, username)').eq('challenge_id', data.id).order('created_at', { ascending: false }).limit(10);
      setCompletions(allCompletions || []);
    }
    if (profile.role === 'admin') {
      const { data: upcoming } = await supabase.from('forge_challenges').select('*').gte('scheduled_date', today).order('scheduled_date', { ascending: true }).limit(14);
      setQueue(upcoming || []);
    }
  }

  async function complete() {
    if (completed || !challenge) return;
    setSubmitting(true);
    await supabase.from('forge_challenge_completions').insert({ user_id: profile.id, challenge_id: challenge.id, note: note.trim() || null });
    setCompleted(true); setSubmitting(false); setNote(''); loadChallenge();
  }

  async function createChallenge() {
    if (!form.title || !form.scheduled_date) return;
    await supabase.from('forge_challenges').insert({ ...form, created_by: profile.id });
    setShowForm(false); setForm({ title: '', description: '', category: 'Scripture', scheduled_date: '' }); loadChallenge();
  }

  async function deleteChallenge(id) {
    await supabase.from('forge_challenges').delete().eq('id', id);
    loadChallenge();
  }

  async function generateChallenges() {
    setGenerating(true);
    try {
      const response = await fetch('https://bffcrhjdibxqfmdreksi.supabase.co/functions/v1/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          prompt: 'Generate 7 daily challenges for ESix10 Initiative — a faith-based community built on Ephesians 6:10. Mix categories: Scripture (priority), Physical, Mental, Preparedness, Leadership. Each challenge doable in one day, direct faith-forward voice. Return ONLY JSON array, no markdown: [{"title":"","description":"","category":"Scripture|Physical|Mental|Preparedness|Leadership"}]',
          max_tokens: 2000
        })
      });
      const data = await response.json();
      if (!data.content) throw new Error(data.error || 'No content returned');
      const text = data.content.replace(/```json|```/g, '').trim();
      const challenges = JSON.parse(text);
      const insertData = challenges.map((c, i) => {
        const d = new Date(); d.setDate(d.getDate() + i + 1);
        return { ...c, scheduled_date: d.toISOString().split('T')[0], created_by: profile.id };
      });
      await supabase.from('forge_challenges').insert(insertData);
      loadChallenge();
    } catch(e) { console.error('Generate error:', e); }
    setGenerating(false);
  }

  return (
    <div>
      <div style={S.flexBetween}>
        <div><span style={S.eyebrow}>Daily Challenge</span><h2 style={{ ...S.h2, margin: 0 }}>Today</h2></div>
        {profile.role === 'admin' && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button style={{ ...S.btnSm, background: 'rgba(255,102,0,0.15)', color: '#FF6600', border: '1px solid rgba(255,102,0,0.3)' }} onClick={() => setShowQueue(!showQueue)}>📅 {queue.length}</button>
            <button style={S.btnSm} onClick={generateChallenges} disabled={generating}>{generating ? '⏳' : '✨ AI Week'}</button>
            <button style={S.btnSm} onClick={() => setShowForm(!showForm)}>+ Add</button>
          </div>
        )}
      </div>
      {showForm && profile.role === 'admin' && (
        <div style={{ ...S.card, marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={{ gridColumn: '1/-1' }}><label style={S.label}>Title</label><input style={S.input} placeholder="Challenge title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
            <div><label style={S.label}>Category</label><select style={S.input} value={form.category} onChange={e => setForm({...form, category: e.target.value})}>{CHALLENGE_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
            <div><label style={S.label}>Date</label><input style={S.input} type="date" value={form.scheduled_date} onChange={e => setForm({...form, scheduled_date: e.target.value})} /></div>
            <div style={{ gridColumn: '1/-1' }}><label style={S.label}>Description</label><textarea style={{ ...S.input, minHeight: 80 }} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
          </div>
          <button style={S.btn} onClick={createChallenge}>Schedule</button>
        </div>
      )}
      {showQueue && queue.length > 0 && (
        <div style={{ ...S.card, marginTop: 12 }}>
          <span style={S.eyebrow}>Queue</span>
          {queue.map(q => (
            <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: '#fff', fontSize: 13 }}>{CATEGORY_ICONS[q.category]} {q.title} <span style={{ color: '#555', fontSize: 11 }}>{q.scheduled_date}</span></span>
              <button style={S.btnDanger} onClick={() => deleteChallenge(q.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 20 }}>
        {!challenge ? (
          <div style={{ ...S.card, textAlign: 'center', padding: 48 }}>
            <span style={{ fontSize: 40, display: 'block', marginBottom: 16 }}>⚡</span>
            <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: '#fff', marginBottom: 8 }}>No challenge posted today.</h3>
            <p style={S.muted}>{profile.role === 'admin' ? 'Use AI Generate to schedule a week.' : 'Check back soon.'}</p>
          </div>
        ) : (
          <div style={{ ...S.card, borderTop: `3px solid ${completed ? '#51cf66' : '#FF6600'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 24 }}>{CATEGORY_ICONS[challenge.category]}</span>
              <span style={{ background: 'rgba(255,102,0,0.1)', border: '1px solid rgba(255,102,0,0.2)', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: '#FF6600', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{challenge.category}</span>
            </div>
            <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 22, color: '#fff', marginBottom: 12 }}>{challenge.title}</h3>
            {challenge.description && <p style={{ color: '#CCCCCC', fontSize: 15, lineHeight: 1.8, marginBottom: 20 }}>{challenge.description}</p>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <span style={{ fontSize: 18 }}>✅</span>
              <span style={{ color: '#888', fontSize: 14 }}><strong style={{ color: '#fff' }}>{completionCount}</strong> completed today</span>
            </div>
            {!completed ? (
              <div>
                <div style={{ marginBottom: 12 }}><label style={S.label}>Note (optional)</label><input style={S.input} placeholder="How did it go?" value={note} onChange={e => setNote(e.target.value)} /></div>
                <button className={`complete-btn`} onClick={complete} disabled={submitting}>{submitting ? 'Marking...' : '✓ Mark Complete'}</button>
              </div>
            ) : (
              <div style={{ background: 'rgba(81,207,102,0.08)', border: '1px solid rgba(81,207,102,0.2)', borderRadius: 6, padding: '16px 20px', textAlign: 'center' }}>
                <span style={{ color: '#51cf66', fontFamily: "'Cinzel', serif", fontSize: 16 }}>Challenge Complete ✓</span>
              </div>
            )}
            {completions.length > 0 && (
              <div style={{ marginTop: 20, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
                <span style={S.eyebrow}>Who Completed This</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {completions.map(c => <div key={c.id} style={{ background: 'rgba(255,102,0,0.08)', border: '1px solid rgba(255,102,0,0.15)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: '#FF6600' }}>{c.profiles?.username ? `@${c.profiles.username}` : formatName(c.profiles?.full_name)}</div>)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ForgeWOD({ profile }) {
  const [wod, setWod] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [result, setResult] = useState('');
  const [completionCount, setCompletionCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', warmup: '', main_work: '', cooldown: '', coaching_notes: '', estimated_minutes: '', difficulty: 3, scheduled_date: '' });
  const [queue, setQueue] = useState([]);
  const [showQueue, setShowQueue] = useState(false);
  const [generating, setGenerating] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => { loadWOD(); }, []);

  async function loadWOD() {
    const { data } = await supabase.from('forge_wods').select('*').eq('scheduled_date', today).maybeSingle();
    setWod(data || null);
    if (data) {
      const { count } = await supabase.from('forge_wod_completions').select('*', { count: 'exact', head: true }).eq('wod_id', data.id);
      setCompletionCount(count || 0);
      const { data: myComp } = await supabase.from('forge_wod_completions').select('*').eq('wod_id', data.id).eq('user_id', profile.id).single();
      setCompleted(!!myComp);
    }
    if (profile.role === 'admin') {
      const { data: upcoming } = await supabase.from('forge_wods').select('*').gte('scheduled_date', today).order('scheduled_date', { ascending: true }).limit(14);
      setQueue(upcoming || []);
    }
  }

  async function completeWOD() {
    if (completed || !wod) return;
    setSubmitting(true);
    await supabase.from('forge_wod_completions').insert({ user_id: profile.id, wod_id: wod.id, result: result.trim() || null });
    setCompleted(true); setSubmitting(false); loadWOD();
  }

  async function createWOD() {
    if (!form.title || !form.scheduled_date) return;
    await supabase.from('forge_wods').insert({ ...form, estimated_minutes: form.estimated_minutes ? parseInt(form.estimated_minutes) : null, difficulty: parseInt(form.difficulty), created_by: profile.id });
    setShowForm(false); setForm({ title: '', warmup: '', main_work: '', cooldown: '', coaching_notes: '', estimated_minutes: '', difficulty: 3, scheduled_date: '' }); loadWOD();
  }

  async function generateWODs() {
    setGenerating(true);
    try {
      const response = await fetch('https://bffcrhjdibxqfmdreksi.supabase.co/functions/v1/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          prompt: 'Generate 7 bodyweight WODs for a faith-based fitness community. Return ONLY a JSON array, no markdown: [{"title":"","warmup":"","main_work":"","cooldown":"","coaching_notes":"","estimated_minutes":30,"difficulty":3}]. difficulty 1-5. Keep each field concise.',
          max_tokens: 2000
        })
      });
      const data = await response.json();
      if (!data.content) throw new Error(data.error || 'No content returned');
      const text = data.content.replace(/```json|```/g, '').trim();
      const wods = JSON.parse(text);
      const insertData = wods.map((w, i) => {
        const d = new Date(); d.setDate(d.getDate() + i + 1);
        return { ...w, scheduled_date: d.toISOString().split('T')[0], created_by: profile.id };
      });
      await supabase.from('forge_wods').insert(insertData);
      loadWOD();
    } catch(e) { console.error(e); }
    setGenerating(false);
  }

  const diffLabel = ['', 'Beginner', 'Easy', 'Moderate', 'Hard', 'Elite'];
  const diffColor = ['', '#51cf66', '#94d82d', '#fcc419', '#ff922b', '#ff4444'];

  return (
    <div>
      <div style={S.flexBetween}>
        <div><span style={S.eyebrow}>Workout of the Day</span><h2 style={{ ...S.h2, margin: 0 }}>Today</h2></div>
        {profile.role === 'admin' && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button style={{ ...S.btnSm, background: 'rgba(255,102,0,0.15)', color: '#FF6600', border: '1px solid rgba(255,102,0,0.3)' }} onClick={() => setShowQueue(!showQueue)}>📅 {queue.length}</button>
            <button style={S.btnSm} onClick={generateWODs} disabled={generating}>{generating ? '⏳' : '✨ AI Week'}</button>
            <button style={S.btnSm} onClick={() => setShowForm(!showForm)}>+ Add</button>
          </div>
        )}
      </div>
      {showForm && profile.role === 'admin' && (
        <div style={{ ...S.card, marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={{ gridColumn: '1/-1' }}><label style={S.label}>Title</label><input style={S.input} value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
            <div><label style={S.label}>Date</label><input style={S.input} type="date" value={form.scheduled_date} onChange={e => setForm({...form, scheduled_date: e.target.value})} /></div>
            <div><label style={S.label}>Minutes</label><input style={S.input} type="number" placeholder="30" value={form.estimated_minutes} onChange={e => setForm({...form, estimated_minutes: e.target.value})} /></div>
            <div><label style={S.label}>Difficulty (1-5)</label><input style={S.input} type="number" min="1" max="5" value={form.difficulty} onChange={e => setForm({...form, difficulty: e.target.value})} /></div>
            <div style={{ gridColumn: '1/-1' }}><label style={S.label}>Warm Up</label><textarea style={{ ...S.input, minHeight: 60 }} value={form.warmup} onChange={e => setForm({...form, warmup: e.target.value})} /></div>
            <div style={{ gridColumn: '1/-1' }}><label style={S.label}>Main Work</label><textarea style={{ ...S.input, minHeight: 100 }} value={form.main_work} onChange={e => setForm({...form, main_work: e.target.value})} /></div>
            <div style={{ gridColumn: '1/-1' }}><label style={S.label}>Cool Down</label><textarea style={{ ...S.input, minHeight: 60 }} value={form.cooldown} onChange={e => setForm({...form, cooldown: e.target.value})} /></div>
            <div style={{ gridColumn: '1/-1' }}><label style={S.label}>Coaching Notes</label><textarea style={{ ...S.input, minHeight: 60 }} value={form.coaching_notes} onChange={e => setForm({...form, coaching_notes: e.target.value})} /></div>
          </div>
          <button style={S.btn} onClick={createWOD}>Schedule WOD</button>
        </div>
      )}
      {showQueue && queue.length > 0 && (
        <div style={{ ...S.card, marginTop: 12 }}>
          <span style={S.eyebrow}>Queue</span>
          {queue.map(q => (
            <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: '#fff', fontSize: 13 }}><span style={{ color: diffColor[q.difficulty] }}>●</span> {q.title} <span style={{ color: '#555', fontSize: 11 }}>{q.scheduled_date} · {q.estimated_minutes}min</span></span>
              <button style={S.btnDanger} onClick={() => deleteWOD(q.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 20 }}>
        {!wod ? (
          <div style={{ ...S.card, textAlign: 'center', padding: 48 }}>
            <span style={{ fontSize: 40, display: 'block', marginBottom: 16 }}>🏋️</span>
            <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: '#fff', marginBottom: 8 }}>No WOD today.</h3>
            <p style={S.muted}>{profile.role === 'admin' ? 'Use AI Generate to schedule a week.' : 'Rest day. Check back tomorrow.'}</p>
          </div>
        ) : (
          <div style={{ ...S.card, borderTop: `3px solid ${completed ? '#51cf66' : '#FF6600'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 22, color: '#fff' }}>{wod.title}</h3>
              <div style={S.flex}>
                {wod.estimated_minutes && <span style={S.badge}>⏱ {wod.estimated_minutes}min</span>}
                {wod.difficulty && <span style={{ ...S.badge, background: `${diffColor[wod.difficulty]}20`, color: diffColor[wod.difficulty] }}>{'●'.repeat(wod.difficulty)} {diffLabel[wod.difficulty]}</span>}
              </div>
            </div>
            {wod.warmup && <div style={{ marginBottom: 16 }}><span style={S.eyebrow}>Warm Up</span><p style={{ color: '#AAAAAA', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-line' }}>{wod.warmup}</p></div>}
            {wod.main_work && <div style={{ background: 'rgba(255,102,0,0.05)', border: '1px solid rgba(255,102,0,0.15)', borderRadius: 4, padding: '16px 20px', marginBottom: 16 }}><span style={S.eyebrow}>Main Work</span><p style={{ color: '#fff', fontSize: 15, lineHeight: 2, whiteSpace: 'pre-line' }}>{wod.main_work}</p></div>}
            {wod.cooldown && <div style={{ marginBottom: 16 }}><span style={S.eyebrow}>Cool Down</span><p style={{ color: '#AAAAAA', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-line' }}>{wod.cooldown}</p></div>}
            {wod.coaching_notes && <div style={{ background: 'rgba(192,154,47,0.06)', border: '1px solid rgba(192,154,47,0.15)', borderRadius: 4, padding: '12px 16px', marginBottom: 20 }}><span style={{ ...S.eyebrow, color: '#C09A2F' }}>Coaching Notes</span><p style={{ color: '#AAAAAA', fontSize: 13, lineHeight: 1.8 }}>{wod.coaching_notes}</p></div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span>✅</span><span style={{ color: '#888', fontSize: 14 }}><strong style={{ color: '#fff' }}>{completionCount}</strong> completed today</span>
            </div>
            {!completed ? (
              <div>
                <div style={{ marginBottom: 12 }}><label style={S.label}>Log Result (optional)</label><input style={S.input} placeholder="Time, rounds, notes" value={result} onChange={e => setResult(e.target.value)} /></div>
                <button style={{ ...S.btn, width: '100%', padding: 16 }} onClick={completeWOD} disabled={submitting}>{submitting ? 'Logging...' : '✓ WOD Complete'}</button>
              </div>
            ) : (
              <div style={{ background: 'rgba(81,207,102,0.08)', border: '1px solid rgba(81,207,102,0.2)', borderRadius: 6, padding: '16px 20px', textAlign: 'center' }}>
                <span style={{ color: '#51cf66', fontFamily: "'Cinzel', serif", fontSize: 16 }}>WOD Complete ✓</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ForgeLog({ profile }) {
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'Strength', duration: '', notes: '', date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);
  const WORKOUT_TYPES = ['Strength', 'Cardio', 'HIIT', 'Walk/Run', 'Mobility', 'Sports', 'Other'];

  useEffect(() => { loadLog(); }, []);

  async function loadLog() {
    const { data } = await supabase.from('forge_walks').select('*').eq('user_id', profile.id).order('date', { ascending: false }).limit(30);
    setEntries(data || []);
  }

  async function saveEntry() {
    setSaving(true);
    await supabase.from('forge_walks').insert({ user_id: profile.id, date: form.date, duration_minutes: form.duration ? parseInt(form.duration) : null, notes: `[${form.type}] ${form.notes}`.trim() });
    setShowForm(false); setForm({ type: 'Strength', duration: '', notes: '', date: new Date().toISOString().split('T')[0] });
    setSaving(false); loadLog();
  }

  const grouped = entries.reduce((acc, e) => { if (!acc[e.date]) acc[e.date] = []; acc[e.date].push(e); return acc; }, {});

  return (
    <div>
      <div style={S.flexBetween}>
        <div><span style={S.eyebrow}>The Forge</span><h2 style={{ ...S.h2, margin: 0 }}>My Log</h2></div>
        <button style={S.btn} onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Log Activity'}</button>
      </div>
      {showForm && (
        <div style={{ ...S.card, marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div><label style={S.label}>Type</label><select style={S.input} value={form.type} onChange={e => setForm({...form, type: e.target.value})}>{WORKOUT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
            <div><label style={S.label}>Date</label><input style={S.input} type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
            <div><label style={S.label}>Duration (min)</label><input style={S.input} type="number" placeholder="45" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} /></div>
            <div style={{ gridColumn: '1/-1' }}><label style={S.label}>Notes</label><input style={S.input} placeholder="What did you do?" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
          </div>
          <button style={S.btn} onClick={saveEntry} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      )}
      <div style={{ marginTop: 20 }}>
        {Object.keys(grouped).length === 0 && <div style={{ textAlign: 'center', padding: 60 }}><span style={{ fontSize: 40, display: 'block', marginBottom: 16 }}>📓</span><h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: '#fff', marginBottom: 8 }}>No activity logged yet.</h3><p style={S.muted}>Start logging your walks and workouts.</p></div>}
        {Object.keys(grouped).map(date => (
          <div key={date} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
              {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            {grouped[date].map(e => (
              <div key={e.id} style={{ ...S.post, padding: '14px 18px', marginBottom: 6 }}>
                <div style={S.flex}>
                  <span style={{ fontSize: 18 }}>{e.notes?.includes('[Walk') ? '🚶' : '💪'}</span>
                  <div>
                    <div style={{ color: '#fff', fontSize: 14 }}>{e.notes || 'Activity'}</div>
                    <div style={S.muted}>{e.distance_miles && `${e.distance_miles} mi`}{e.distance_miles && e.duration_minutes && ' · '}{e.duration_minutes && `${e.duration_minutes} min`}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TheForge({ profile }) {
  const [subTab, setSubTab] = useState('walk');
  const FORGE_TABS = [
    { id: 'walk', label: 'Walk', icon: '🚶' },
    { id: 'challenge', label: 'Challenge', icon: '⚡' },
    { id: 'wod', label: 'WOD', icon: '🏋️' },
    { id: 'log', label: 'My Log', icon: '📓' },
  ];
  return (
    <div>
      <style>{FORGE_CSS}</style>
      <div className="beta-banner">
        <span style={{ fontSize: 20 }}>🔥</span>
        <div>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 15, color: '#fff' }}>The Forge</span>
          <span style={{ color: '#FF6600', fontSize: 11, marginLeft: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Beta — Full Access Free</span>
        </div>
      </div>
      <div className="forge-tab-bar">
        {FORGE_TABS.map(t => (
          <button key={t.id} className={`forge-tab ${subTab === t.id ? 'active' : 'inactive'}`} onClick={() => setSubTab(t.id)}>
            <span style={{ fontSize: 22, display: 'block', marginBottom: 3 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
      {subTab === 'walk' && <ForgeWalk profile={profile} />}
      {subTab === 'challenge' && <ForgeChallenge profile={profile} />}
      {subTab === 'wod' && <ForgeWOD profile={profile} />}
      {subTab === 'log' && <ForgeLog profile={profile} />}
    </div>
  );
}



// ─── Statement of Faith ───────────────────────────────────────────────────────
function StatementOfFaith({ onBack }) {
  return (
    <div className="tab-content">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        {onBack && <button onClick={onBack} style={{ background: "none", border: "none", color: "#FF6600", cursor: "pointer", fontSize: 20, padding: 0 }}>←</button>}
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
            <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 16, fontWeight: 400, color: "#FF6600", margin: 0 }}>{item.title}</h3>
          </div>
          <p style={{ color: "#CCCCCC", fontSize: 14, lineHeight: 1.8 }}>{item.body}</p>
        </div>
      ))}

      <div style={{ ...S.card, marginBottom: 12, borderTop: "3px solid #FF6600" }}>
        <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 16, fontWeight: 400, color: "#FF6600", marginBottom: 10 }}>What We Don't Do</h3>
        <p style={{ color: "#CCCCCC", fontSize: 14, lineHeight: 1.8 }}>We do not take denominational positions on secondary theological issues where Bible-believing Christians disagree. ESix10 is not a Baptist organization, a Pentecostal organization, or any other denominational organization. We are a community of believers who stand on the essentials and extend grace on everything else.</p>
      </div>

      <div style={{ ...S.card, marginBottom: 12, background: "linear-gradient(135deg, rgba(255,102,0,0.08), rgba(192,154,47,0.06))", border: "1px solid rgba(255,102,0,0.2)" }}>
        <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 16, fontWeight: 400, color: "#fff", marginBottom: 10 }}>A Word on Welcome</h3>
        <p style={{ color: "#CCCCCC", fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>ESix10 is a faith-based organization. We are clear about what we believe and we do not apologize for it. But we are equally clear about this — everyone is welcome here.</p>
        <p style={{ color: "#CCCCCC", fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>You do not have to share our faith to walk through this door. You do not have to have it all figured out. You do not have to clean yourself up before you show up.</p>
        <p style={{ color: "#CCCCCC", fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>We will not change our standard to make anyone comfortable. But we will never use our standard as a weapon against anyone either. That is not the way of Christ and it is not the way of ESix10.</p>
        <p style={{ color: "#fff", fontFamily: "'Cinzel', serif", fontSize: 14, fontStyle: "italic" }}>You are welcome here. Exactly as you are. Right now.</p>
      </div>

      <div style={{ background: "rgba(255,102,0,0.06)", border: "1px solid rgba(255,102,0,0.15)", borderRadius: 10, padding: "16px 20px", textAlign: "center", marginBottom: 24 }}>
        <p style={{ color: "#AAAAAA", fontSize: 14, fontStyle: "italic", lineHeight: 1.7 }}>"We love because He first loved us."</p>
        <p style={{ color: "#FF6600", fontSize: 12, letterSpacing: "0.1em", marginTop: 6 }}>— 1 John 4:19</p>
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
        {onBack && <button onClick={onBack} style={{ background: "none", border: "none", color: "#FF6600", cursor: "pointer", fontSize: 20, padding: 0 }}>←</button>}
        <div>
          <span style={S.eyebrow}>Do You Know Him?</span>
          <h2 style={{ ...S.h2, margin: 0 }}>The Plan of Salvation</h2>
        </div>
      </div>

      <div style={{ ...S.card, marginBottom: 12, borderTop: "3px solid #FF6600" }}>
        <p style={{ color: "#CCCCCC", fontSize: 15, lineHeight: 1.9 }}>Everything ESix10 is built on — the discipline, the brotherhood, the readiness, the standard — it all flows from one thing. A relationship with Jesus Christ. Not a religion. Not a set of rules. A relationship.</p>
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
            <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 18, fontWeight: 400, color: "#fff", margin: 0 }}>{item.step}</h3>
          </div>
          <div style={{ background: "rgba(255,102,0,0.06)", border: "1px solid rgba(255,102,0,0.15)", borderRadius: 6, padding: "12px 16px", marginBottom: 12 }}>
            <p style={{ color: "#fff", fontFamily: "'Cinzel', serif", fontSize: 14, fontStyle: "italic", lineHeight: 1.7, marginBottom: 4 }}>"{item.scripture}"</p>
            <p style={{ color: "#FF6600", fontSize: 12, letterSpacing: "0.1em" }}>— {item.ref}</p>
          </div>
          <p style={{ color: "#CCCCCC", fontSize: 14, lineHeight: 1.8, marginBottom: item.scripture2 ? 12 : 0 }}>{item.body}</p>
          {item.scripture2 && (
            <div style={{ background: "rgba(255,102,0,0.06)", border: "1px solid rgba(255,102,0,0.15)", borderRadius: 6, padding: "12px 16px" }}>
              <p style={{ color: "#fff", fontFamily: "'Cinzel', serif", fontSize: 14, fontStyle: "italic", lineHeight: 1.7, marginBottom: 4 }}>"{item.scripture2}"</p>
              <p style={{ color: "#FF6600", fontSize: 12, letterSpacing: "0.1em" }}>— {item.ref2}</p>
            </div>
          )}
        </div>
      ))}

      {/* Prayer Section */}
      <div style={{ ...S.card, marginBottom: 12, borderTop: prayed ? "3px solid #51cf66" : "3px solid #FF6600" }}>
        <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 18, fontWeight: 400, color: "#fff", marginBottom: 12 }}>A Simple Prayer</h3>
        <p style={{ color: "#CCCCCC", fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>If you are ready to make that decision right now — you can. God is not waiting on a perfect moment. He is waiting on you.</p>

        {!showPrayer ? (
          <button style={{ ...S.btn, width: "100%", padding: 16 }} onClick={() => setShowPrayer(true)}>
            I'm Ready — Show Me the Prayer
          </button>
        ) : (
          <div>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 20, marginBottom: 20 }}>
              <p style={{ color: "#fff", fontFamily: "'Cinzel', serif", fontSize: 14, fontStyle: "italic", lineHeight: 2.1 }}>
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
                <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 20, color: "#51cf66", marginBottom: 8 }}>Welcome to the Family.</h3>
                <p style={{ color: "#CCCCCC", fontSize: 14, lineHeight: 1.8 }}>That decision is the most important one you will ever make. Heaven is celebrating right now. So are we.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Connect Section */}
      {prayed && (
        <div style={{ ...S.card, marginBottom: 24 }}>
          <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 18, fontWeight: 400, color: "#fff", marginBottom: 8 }}>Connect With Someone Near You</h3>
          <p style={{ color: "#CCCCCC", fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>You do not have to figure this out alone. Let us connect you with a real person in your area who can walk with you from here. No program. No pressure. Just a brother or sister who has been where you are.</p>
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
              <p style={{ color: "#FF6600", fontFamily: "'Cinzel', serif", fontSize: 15 }}>Request sent. Someone will reach out to you soon.</p>
              <p style={{ color: "#888", fontSize: 13, marginTop: 8 }}>In the meantime — you are already part of this community. Start here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Profile({ profile, onUpdate, onSignOut }) {
  const [form, setForm] = useState({ full_name: profile.full_name || "", username: profile.username || "", city: profile.city || "", state: profile.state || "", bio: profile.bio || "", group_id: profile.group_id || "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setSaving(true);
    await supabase.from("profiles").update(form).eq("id", profile.id);
    setMsg("Profile saved.");
    onUpdate({ ...profile, ...form });
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={S.h2}>Your Profile</h2>
      <div style={S.divider} />
      <div style={{ ...S.card, marginTop: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Full Name</label>
          <input style={S.input} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Username</label>
          <input style={S.input} placeholder="your_username" value={form.username || ""} onChange={e => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} />
          <p style={{ color: "#555", fontSize: 11, marginTop: 4 }}>Shown publicly in posts and member list.</p>
        </div>
        <div style={S.grid2}>
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>City</label>
            <input style={S.input} placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>State</label>
            <input style={S.input} placeholder="State" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Your Group</label>
          <select style={S.input} value={form.group_id} onChange={e => setForm({ ...form, group_id: e.target.value })}>
            {GROUPS.map(g => <option key={g.id} value={g.id}>{g.label} — {g.subtitle}</option>)}
          </select>
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
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("feed");
  const [feedGroup, setFeedGroup] = useState("all");
  const [showSetup, setShowSetup] = useState(false);
  const [allMembers, setAllMembers] = useState([]);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      let q = supabase.from("profiles").select("*").eq("status", "approved");
      if (profile.role !== "admin") q = q.eq("group_id", profile.group_id);
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) loadProfile(data.session.user);
      else setLoading(false);
    });
    supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) loadProfile(session.user);
      else { setUser(null); setProfile(null); setLoading(false); }
    });
  }, []);

  async function loadProfile(u) {
    setUser(u);
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", u.id).single();
      if (error && error.code === "PGRST116") {
        // Profile doesn't exist yet — create it as pending
        const isAdmin = u.email === ADMIN_EMAIL;
        await supabase.from("profiles").insert({ 
          id: u.id, 
          email: u.email, 
          full_name: u.user_metadata?.full_name || "", 
          role: isAdmin ? "admin" : "member",
          status: isAdmin ? "approved" : "pending"
        });
        const { data: newProfile } = await supabase.from("profiles").select("*").eq("id", u.id).single();
        setProfile(newProfile);
      } else if (error) {
        setShowSetup(true);
      } else {
        // Auto-approve and set admin role for admin email
        if (u.email === ADMIN_EMAIL && (data.role !== "admin" || data.status !== "approved")) {
          await supabase.from("profiles").update({ role: "admin", status: "approved" }).eq("id", u.id);
          data.role = "admin";
          data.status = "approved";
        }
        setProfile(data);
      }
    } catch(e) {
      setShowSetup(true);
    }
    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null); setProfile(null);
  }

  const isMobile = useMobile();

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: 24, color: "#FF6600" }}>ESix10</span>
        <p style={{ color: "#555", marginTop: 8, fontSize: 13 }}>Loading...</p>
      </div>
    </div>
  );

  if (!user) return <AuthScreen onAuth={(u) => loadProfile(u)} />;
  if (showSetup) return <SetupModal onClose={() => { setShowSetup(false); loadProfile(user); }} />;
  if (!profile?.group_id) return <GroupSelect user={user} onSelect={(g) => { setProfile({ ...profile, group_id: g }); setFeedGroup(g); }} />;
  if (profile?.status === "pending") return <PendingScreen profile={profile} onSignOut={signOut} />;

  const myGroup = GROUPS.find(g => g.id === profile.group_id);
  const isAdmin = profile?.role === "admin";

  const NAV_ITEMS = [
    { id: "feed", label: "Feed", icon: "📋" },
    { id: "forge", label: "Forge", icon: "🔥" },
    { id: "prayer", label: "Prayer", icon: "🙏" },
    { id: "messages", label: "Chat", icon: "💬" },
    { id: "more", label: "More", icon: "☰" },
  ];

  const MORE_ITEMS = [
    { id: "devotion", label: "Daily Devotion", icon: "📖" },
    { id: "events", label: "Events", icon: "📅" },
    { id: "members", label: "Members", icon: "👥" },
    { id: "faith", label: "Statement of Faith", icon: "✝️" },
    { id: "salvation", label: "Do You Know Him?", icon: "🙏" },
    { id: "profile", label: "My Profile", icon: "👤" },
  ];

  const CONTENT = (
    <div style={{ flex: 1, padding: isMobile ? "20px 16px 88px" : "32px 32px 60px", maxWidth: isMobile ? "100%" : 800, overflow: "hidden" }}>
      {tab === "feed" && (
        <div>
          {isMobile && (
            <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
              {[{ id: "all", label: "All" }, ...(profile.role === "admin" ? GROUPS : GROUPS.filter(g => g.id === profile.group_id))].map(g => (
                <button key={g.id} onClick={() => setFeedGroup(g.id)}
                  style={{ ...S.tab(feedGroup === g.id), padding: "8px 14px", fontSize: 11, whiteSpace: "nowrap", flexShrink: 0, border: "none", cursor: "pointer" }}>
                  {g.label || "All"}
                </button>
              ))}
            </div>
          )}
          <Feed profile={profile} activeGroup={feedGroup} />
        </div>
      )}
      {tab === "forge" && <TheForge profile={profile} />}
      {tab === "prayer" && <PrayerRequests profile={profile} />}
      {tab === "devotion" && <Devotion profile={profile} />}
      {tab === "events" && <Events profile={profile} />}
      {tab === "messages" && <Messages profile={profile} members={allMembers} />}
      {tab === "members" && <Members profile={profile} />}
      {tab === "faith" && <StatementOfFaith onBack={() => setTab("more")} />}
      {tab === "salvation" && <PlanOfSalvation onBack={() => setTab("more")} profile={profile} />}
      {tab === "profile" && <Profile profile={profile} onUpdate={setProfile} onSignOut={signOut} />}
    </div>
  );

  return (
    <div style={{ ...S.app, paddingBottom: isMobile ? 60 : 0 }}>
      <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Lato:wght@300;400;700&display=swap" rel="stylesheet" />
      <style>{GLOBAL_CSS}</style>

      {/* NAV */}
      <nav style={{ ...S.nav, height: isMobile ? 80 : 96, padding: isMobile ? "0 12px" : "0 32px" }}>
        <img src="https://esix10.com/wp-content/uploads/2026/06/esix10logo.png" alt="ESix10" style={{ height: isMobile ? 72 : 88, width: "auto", objectFit: "contain" }} />
        <div style={S.navRight}>
          <span style={{ ...S.badge, fontSize: 10 }}>{myGroup?.icon} {myGroup?.label}</span>
          {isAdmin && !isMobile && <span style={{ ...S.badge, background: "rgba(255,102,0,0.3)", color: "#FF6600" }}>Admin</span>}
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,102,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF6600", fontFamily: "'Cinzel', serif", fontWeight: 600, cursor: "pointer", fontSize: 13 }} onClick={() => setTab("profile")}>
            {(profile.username || profile.full_name || "?")[0].toUpperCase()}
          </div>
        </div>
      </nav>

      {isMobile ? (
        <div style={{ paddingTop: 96 }}>
          {CONTENT}
          {/* MORE OVERLAY */}
          {tab === "more" && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,10,0.97)", zIndex: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 11, letterSpacing: "0.3em", color: "#FF6600", textTransform: "uppercase", marginBottom: 24 }}>More</div>
              {MORE_ITEMS.map(item => (
                <div key={item.id} onClick={() => setTab(item.id)}
                  style={{ width: 280, padding: "16px 24px", background: "rgba(255,102,0,0.05)", border: "1px solid rgba(255,102,0,0.15)", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                  <span style={{ fontSize: 24 }}>{item.icon}</span>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: "#fff" }}>{item.label}</span>
                </div>
              ))}
              <div style={{ marginTop: 24 }}>
                <div onClick={() => setTab("feed")} style={{ color: "#555", fontSize: 13, cursor: "pointer", textAlign: "center" }}>← Back</div>
              </div>
            </div>
          )}

          {/* BOTTOM TAB BAR */}
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 72, background: "rgba(13,17,23,0.99)", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", zIndex: 100 }}>
            {NAV_ITEMS.map(item => (
              <div key={item.id} onClick={() => setTab(item.id)}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, cursor: "pointer", color: (tab === item.id || (item.id === "more" && MORE_ITEMS.some(m => m.id === tab))) ? "#FF6600" : "#555", fontSize: 9, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                <span style={{ fontSize: 24 }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", paddingTop: 70 }}>
          {/* SIDEBAR */}
          <div style={{ width: 200, minHeight: "calc(100vh - 70px)", borderRight: "1px solid rgba(255,255,255,0.04)", padding: "24px 12px", position: "sticky", top: 70, flexShrink: 0, background: "rgba(13,17,23,0.5)" }}>
            <div style={{ marginBottom: 24 }}>
              <p style={{ ...S.eyebrow, marginBottom: 12 }}>Feed</p>
              {[{ id: "all", label: "My Feed", icon: "◎" }, ...(profile.role === "admin" ? GROUPS : GROUPS.filter(g => g.id === profile.group_id))].map(g => (
                <div key={g.id} onClick={() => { setTab("feed"); setFeedGroup(g.id); }}
                  style={{ padding: "10px 12px", borderRadius: 4, cursor: "pointer", marginBottom: 2, background: tab === "feed" && feedGroup === g.id ? "rgba(255,102,0,0.1)" : "transparent", color: tab === "feed" && feedGroup === g.id ? "#FF6600" : "#888", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>{g.icon || "◎"}</span> {g.label || "My Feed"}
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 24 }}>
              <p style={{ ...S.eyebrow, marginBottom: 12 }}>Navigation</p>
              {[{ id: "forge", label: "The Forge 🔥", icon: "🔥" }, { id: "prayer", label: "Prayer", icon: "🙏" }, { id: "devotion", label: "Devotion", icon: "📖" }, { id: "messages", label: "Chat", icon: "💬" }, { id: "events", label: "Events", icon: "📅" }, { id: "members", label: "Members", icon: "👥" }, { id: "faith", label: "Statement of Faith", icon: "✝️" }, { id: "salvation", label: "Do You Know Him?", icon: "🙏" }, { id: "profile", label: "My Profile", icon: "👤" }].map(item => (
                <div key={item.id} onClick={() => setTab(item.id)}
                  style={{ padding: "10px 12px", borderRadius: 4, cursor: "pointer", marginBottom: 2, background: tab === item.id ? "rgba(255,102,0,0.1)" : "transparent", color: tab === item.id ? "#FF6600" : "#888", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>{item.icon}</span> {item.label}
                </div>
              ))}
            </div>
            <div style={{ paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: 12, color: "#555", marginBottom: 2 }}>{profile.username ? `@${profile.username}` : formatName(profile.full_name)}</div>
              <div style={{ fontSize: 11, color: "#444" }}>{profile.email}</div>
            </div>
          </div>
          {CONTENT}
        </div>
      )}
    </div>
  );
}
