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
  { id: "family", label: "Family", subtitle: "Rooted. United. Unshaken.", icon: "◈", color: "#FF6600" },
];

const ADMIN_EMAIL = "michael@esix10.com";

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



// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  app: { minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: "'Lato', sans-serif", fontSize: 15 },
  nav: { position: "fixed", top: 0, left: 0, right: 0, height: 60, background: "rgba(10,10,10,0.98)", borderBottom: "1px solid rgba(255,102,0,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", zIndex: 100 },
  navLogo: { fontFamily: "'Cinzel', serif", fontSize: 16, fontWeight: 600, color: "#fff", letterSpacing: "0.08em" },
  navLogoSub: { color: "#FF6600", fontSize: 9, display: "block", letterSpacing: "0.35em", marginTop: -2 },
  navRight: { display: "flex", alignItems: "center", gap: 16 },
  badge: { background: "rgba(255,102,0,0.15)", color: "#FF6600", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" },
  btn: { background: "#FF6600", color: "#fff", border: "none", borderRadius: 3, padding: "10px 24px", fontFamily: "'Lato', sans-serif", fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", transition: "background 0.2s" },
  btnGhost: { background: "transparent", color: "#AAAAAA", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 3, padding: "10px 24px", fontFamily: "'Lato', sans-serif", fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer" },
  btnSm: { background: "#FF6600", color: "#fff", border: "none", borderRadius: 3, padding: "8px 16px", fontFamily: "'Lato', sans-serif", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer" },
  btnDanger: { background: "transparent", color: "#ff4444", border: "1px solid #ff4444", borderRadius: 3, padding: "6px 12px", fontSize: 11, cursor: "pointer" },
  page: { paddingTop: 90, maxWidth: 1100, margin: "0 auto", padding: "90px 24px 60px" },
  card: { background: "rgba(26,26,26,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: 28 },
  input: { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "12px 16px", color: "#fff", fontFamily: "'Lato', sans-serif", fontSize: 15, outline: "none", boxSizing: "border-box" },
  label: { fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#FF6600", marginBottom: 6, display: "block" },
  divider: { width: 50, height: 2, background: "#FF6600", margin: "16px 0" },
  eyebrow: { fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#FF6600", display: "block", marginBottom: 10 },
  h1: { fontFamily: "'Cinzel', serif", fontSize: 36, fontWeight: 400, color: "#fff", marginBottom: 8 },
  h2: { fontFamily: "'Cinzel', serif", fontSize: 26, fontWeight: 400, color: "#fff", marginBottom: 8 },
  h3: { fontFamily: "'Cinzel', serif", fontSize: 20, fontWeight: 400, color: "#fff", marginBottom: 8 },
  muted: { color: "#666", fontSize: 13 },
  grey: { color: "#AAAAAA" },
  orange: { color: "#FF6600" },
  error: { color: "#ff6b6b", fontSize: 13, marginTop: 6 },
  success: { color: "#51cf66", fontSize: 13, marginTop: 6 },
  flex: { display: "flex", alignItems: "center", gap: 12 },
  flexBetween: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 },
  post: { background: "rgba(26,26,26,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: 20, marginBottom: 12 },
  postAuthor: { fontFamily: "'Cinzel', serif", fontSize: 14, fontWeight: 600, color: "#fff" },
  postTime: { fontSize: 11, color: "#555", marginLeft: 8 },
  postBody: { color: "#AAAAAA", fontSize: 15, lineHeight: 1.7, marginTop: 10 },
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
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: 28, fontWeight: 600, color: "#fff" }}>ESix10</span>
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
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 28, fontWeight: 600, color: "#fff", letterSpacing: "0.08em" }}>ESix10</span>
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
              <div style={{ marginBottom: 16, background: "rgba(255,102,0,0.04)", border: "1px solid rgba(255,102,0,0.15)", borderRadius: 4, padding: 16 }}>
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
              <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 18, fontWeight: 400, color: "#fff", marginBottom: 6 }}>{g.label}</h3>
              <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>{g.subtitle}</p>
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

function Feed({ profile, activeGroup }) {
  const [posts, setPosts] = useState([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const bottomRef = useRef(null);

  // Determine what groups this member can see
  const canSeeGroup = (groupId) => {
    if (profile.role === "admin") return true;
    if (activeGroup === "all") return groupId === profile.group_id;
    return groupId === profile.group_id || groupId === activeGroup;
  };

  // Can only post to own group
  const canPost = activeGroup === "all" || activeGroup === profile.group_id;
  const postTarget = activeGroup === "all" ? profile.group_id : activeGroup;

  useEffect(() => {
    loadPosts();
    const channel = supabase
      .channel("posts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => loadPosts())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [activeGroup]);

  async function loadPosts() {
    setLoading(true);
    let q = supabase.from("posts").select("*, profiles(full_name, group_id, role)").order("created_at", { ascending: false }).limit(50);
    
    // Non-admins can only see their own group
    if (profile.role !== "admin") {
      q = q.eq("group_id", profile.group_id);
    } else if (activeGroup !== "all") {
      q = q.eq("group_id", activeGroup);
    }
    
    const { data } = await q;
    setPosts(data || []);
    setLoading(false);
  }

  async function submitPost() {
    if (!body.trim() || !canPost) return;
    setPosting(true);
    await supabase.from("posts").insert({ user_id: profile.id, group_id: postTarget, body: body.trim() });
    setBody("");
    setPosting(false);
    loadPosts();
  }

  async function deletePost(id) {
    await supabase.from("posts").delete().eq("id", id);
    loadPosts();
  }

  const groupName = GROUPS.find(g => g.id === (postTarget))?.label || "Your Group";

  return (
    <div>
      <div style={S.card}>
        <label style={S.label}>Share with {groupName}</label>
        {!canPost && profile.role !== "admin" ? (
          <p style={{ ...S.muted, padding: "16px 0" }}>You can only post to your own group — {GROUPS.find(g => g.id === profile.group_id)?.label}.</p>
        ) : (
          <>
            <textarea
              style={{ ...S.input, minHeight: 90, resize: "vertical" }}
              placeholder="What's on your mind? Share a win, ask a question, encourage someone..."
              value={body}
              onChange={e => setBody(e.target.value)}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <button style={S.btn} onClick={submitPost} disabled={posting || !body.trim()}>
                {posting ? "Posting..." : "Post"}
              </button>
            </div>
          </>
        )}
      </div>
      <div style={{ marginTop: 20 }}>
        {loading && <p style={{ ...S.muted, textAlign: "center", padding: 40 }}>Loading posts...</p>}
        {!loading && posts.length === 0 && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <p style={{ ...S.grey, fontSize: 18, fontFamily: "'Cinzel', serif", marginBottom: 8 }}>No posts yet.</p>
            <p style={S.muted}>Be the first to post in {groupName}.</p>
          </div>
        )}
        {posts.map(post => (
          <div key={post.id} style={S.post}>
            <div style={S.flexBetween}>
              <div style={S.flex}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,102,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF6600", fontFamily: "'Cinzel', serif", fontSize: 14, fontWeight: 600 }}>
                  {(post.profiles?.full_name || "?")[0].toUpperCase()}
                </div>
                <div>
                  <span style={S.postAuthor}>{displayName(post.profiles)}</span>
                  {post.profiles?.role === "admin" && <span style={{ ...S.badge, marginLeft: 8, fontSize: 10 }}>Admin</span>}
                  <span style={S.postTime}>{new Date(post.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div style={S.flex}>
                <span style={{ ...S.badge, fontSize: 10 }}>{GROUPS.find(g => g.id === post.group_id)?.label || post.group_id}</span>
                {(profile.role === "admin" || profile.id === post.user_id) && (
                  <button style={S.btnDanger} onClick={() => deletePost(post.id)}>Delete</button>
                )}
              </div>
            </div>
            <p style={S.postBody}>{post.body}</p>
          </div>
        ))}
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
      <div style={S.flexBetween}>
        <h2 style={{ ...S.h2, margin: 0 }}>
          {profile.role === "admin" ? `Members (${filtered.length})` : `${myGroup?.label} (${filtered.length})`}
        </h2>
        {profile.role === "admin" && (
          <div style={S.flex}>
            {["all", ...GROUPS.map(g => g.id)].map(f => (
              <button key={f} style={S.tab(filter === f)} onClick={() => setFilter(f)}>
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
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,102,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF6600", fontFamily: "'Cinzel', serif", fontWeight: 600 }}>
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
          <div key={m.id} style={{ ...S.card, padding: "16px 20px" }}>
            <div style={S.flexBetween}>
              <div style={S.flex}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,102,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF6600", fontFamily: "'Cinzel', serif", fontWeight: 600 }}>
                  {(m.full_name || m.email || "?")[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ color: "#fff", fontFamily: "'Cinzel', serif", fontSize: 15 }}>{formatName(m.full_name)}</div>
                  <div style={S.muted}>{m.email}</div>
                  {(m.city || m.state) && (
                    <div style={{ color: "#FF6600", fontSize: 12, marginTop: 2 }}>
                      📍 {[m.city, m.state].filter(Boolean).join(", ")}
                    </div>
                  )}
                </div>
              </div>
              <div style={S.flex}>
                <span style={S.badge}>{GROUPS.find(g => g.id === m.group_id)?.label || "No Group"}</span>
                <span style={{ ...S.badge, background: m.role === "admin" ? "rgba(255,102,0,0.3)" : "rgba(255,255,255,0.05)", color: m.role === "admin" ? "#FF6600" : "#666" }}>{m.role}</span>
                {profile.role === "admin" && m.id !== profile.id && (
                  <div style={S.flex}>
                    <button style={S.btnSm} onClick={() => updateRole(m.id, m.role === "admin" ? "member" : "admin")}>
                      {m.role === "admin" ? "Remove Admin" : "Make Admin"}
                    </button>
                    <button style={S.btnDanger} onClick={() => removeMember(m.id)}>Remove</button>
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

  return (
    <div style={{ display: "flex", gap: 0, height: "calc(100vh - 130px)", minHeight: 500 }}>
      <div style={{ width: 220, borderRight: "1px solid rgba(255,255,255,0.05)", flexShrink: 0, overflowY: "auto" }}>
        <div style={{ padding: "16px 12px" }}>
          <p style={{ ...S.eyebrow, marginBottom: 12 }}>Group Chats</p>
          {GROUP_ROOMS.map(room => (
            <div key={room.id} onClick={() => selectRoom(room.id)}
              style={{ padding: "10px 12px", borderRadius: 4, cursor: "pointer", marginBottom: 2, background: activeRoom === room.id ? "rgba(255,102,0,0.1)" : "transparent", color: activeRoom === room.id ? "#FF6600" : "#888", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              <span>{room.icon}</span> {room.label}
            </div>
          ))}
        </div>
        <div style={{ padding: "0 12px 16px" }}>
          <p style={{ ...S.eyebrow, marginBottom: 12 }}>Direct Messages</p>
          {dmRooms.length === 0 && <p style={{ ...S.muted, fontSize: 12 }}>No members yet</p>}
          {dmRooms.map(room => (
            <div key={room.id} onClick={() => selectRoom(room.id)}
              style={{ padding: "10px 12px", borderRadius: 4, cursor: "pointer", marginBottom: 2, background: activeRoom === room.id ? "rgba(255,102,0,0.1)" : "transparent", color: activeRoom === room.id ? "#FF6600" : "#888", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(255,102,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF6600", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                {(room.member.username || room.member.full_name || "?")[0].toUpperCase()}
              </div>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{room.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {!activeRoom ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
            <span style={{ fontSize: 40 }}>💬</span>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: "#fff" }}>Select a conversation</p>
            <p style={S.muted}>Choose a group chat or direct message</p>
          </div>
        ) : (
          <>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>{currentRoom?.icon}</span>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: "#fff" }}>{currentRoom?.label}</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
              {messages.length === 0 && <div style={{ textAlign: "center", padding: 40 }}><p style={S.muted}>No messages yet. Start the conversation.</p></div>}
              {messages.map(msg => {
                const isOwn = msg.user_id === profile.id;
                const senderName = msg.sender_name || "Member";
                return (
                  <div key={msg.id} style={{ display: "flex", flexDirection: isOwn ? "row-reverse" : "row", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: isOwn ? "rgba(255,102,0,0.3)" : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", color: isOwn ? "#FF6600" : "#666", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                      {(msg.sender_name || "?")[0].toUpperCase()}
                    </div>
                    <div style={{ maxWidth: "70%" }}>
                      <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textAlign: isOwn ? "right" : "left" }}>
                        {senderName} · {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div style={{ background: isOwn ? "rgba(255,102,0,0.15)" : "rgba(255,255,255,0.05)", border: isOwn ? "1px solid rgba(255,102,0,0.2)" : "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14, lineHeight: 1.6, wordBreak: "break-word" }}>
                        {msg.body}
                      </div>
                      {(isOwn || profile.role === "admin") && (
                        <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#555", marginTop: 2, textAlign: isOwn ? "right" : "left", display: "block", width: "100%" }} onClick={() => deleteMessage(msg.id)}>delete</button>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 10 }}>
              <input style={{ ...S.input, flex: 1 }} placeholder="Type a message..." value={body} onChange={e => setBody(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }}} />
              <button style={{ ...S.btn, padding: "10px 20px", flexShrink: 0 }} onClick={send} disabled={posting || !body.trim()}>Send</button>
            </div>
          </>
        )}
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

  useEffect(() => {
    if (profile?.id) {
      let q = supabase.from("profiles").select("*").eq("status", "approved");
      if (profile.role !== "admin") q = q.eq("group_id", profile.group_id);
      q.then(({ data }) => setAllMembers(data || []));
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
    { id: "prayer", label: "Prayer", icon: "🙏" },
    { id: "devotion", label: "Devotion", icon: "📖" },
    { id: "messages", label: "Chat", icon: "💬" },
    { id: "members", label: "Members", icon: "👥" },
  ];

  const CONTENT = (
    <div style={{ flex: 1, padding: isMobile ? "16px 16px 80px" : "32px 32px 60px", maxWidth: isMobile ? "100%" : 800, overflow: "hidden" }}>
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
      {tab === "prayer" && <PrayerRequests profile={profile} />}
      {tab === "devotion" && <Devotion profile={profile} />}
      {tab === "events" && <Events profile={profile} />}
      {tab === "messages" && <Messages profile={profile} members={allMembers} />}
      {tab === "members" && <Members profile={profile} />}
      {tab === "profile" && <Profile profile={profile} onUpdate={setProfile} onSignOut={signOut} />}
    </div>
  );

  return (
    <div style={{ ...S.app, paddingBottom: isMobile ? 60 : 0 }}>
      <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Lato:wght@300;400;700&display=swap" rel="stylesheet" />

      {/* NAV */}
      <nav style={{ ...S.nav, height: isMobile ? 56 : 70, padding: isMobile ? "0 12px" : "0 32px" }}>
        <span style={{ ...S.navLogo, fontSize: isMobile ? 16 : 20 }}>ESix10<span style={S.navLogoSub}>Community</span></span>
        <div style={S.navRight}>
          <span style={{ ...S.badge, fontSize: 10 }}>{myGroup?.icon} {isMobile ? "" : myGroup?.label}</span>
          {isAdmin && !isMobile && <span style={{ ...S.badge, background: "rgba(255,102,0,0.3)", color: "#FF6600" }}>Admin</span>}
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,102,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF6600", fontFamily: "'Cinzel', serif", fontWeight: 600, cursor: "pointer", fontSize: 13 }} onClick={() => setTab("profile")}>
            {(profile.username || profile.full_name || "?")[0].toUpperCase()}
          </div>
        </div>
      </nav>

      {isMobile ? (
        <div style={{ paddingTop: 56 }}>
          {CONTENT}
          {/* BOTTOM TAB BAR */}
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 60, background: "rgba(10,10,10,0.98)", borderTop: "1px solid rgba(255,102,0,0.15)", display: "flex", zIndex: 100 }}>
            {NAV_ITEMS.map(item => (
              <div key={item.id} onClick={() => setTab(item.id)}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, cursor: "pointer", color: tab === item.id ? "#FF6600" : "#555", fontSize: 9, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", paddingTop: 70 }}>
          {/* SIDEBAR */}
          <div style={{ width: 200, minHeight: "calc(100vh - 70px)", borderRight: "1px solid rgba(255,255,255,0.05)", padding: "24px 12px", position: "sticky", top: 70, flexShrink: 0 }}>
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
              {NAV_ITEMS.filter(i => i.id !== "feed").concat([{ id: "events", label: "Events", icon: "📅" }, { id: "profile", label: "My Profile", icon: "👤" }]).map(item => (
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
