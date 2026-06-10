import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://bffcrhjdibxqfmdreksi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmZmNyaGpkaWJ4cWZtZHJla3NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNjkwMzgsImV4cCI6MjA5NjY0NTAzOH0.yZ7IunHcwTlMKu0uDvKnBnBLBpdDCsPLVWTygmaveEo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const GROUPS = [
  { id: "brotherhood", label: "Brotherhood", subtitle: "Steadfast. Unmovable.", icon: "⚔", color: "#FF6600" },
  { id: "sisterhood", label: "Sisterhood", subtitle: "Fierce. Faithful.", icon: "✦", color: "#FF6600" },
  { id: "family", label: "Family", subtitle: "Rooted. United. Unshaken.", icon: "◈", color: "#FF6600" },
];

const ADMIN_EMAIL = "michael@esix10.com";

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  app: { minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: "'Lato', sans-serif", fontSize: 15 },
  nav: { position: "fixed", top: 0, left: 0, right: 0, height: 70, background: "rgba(10,10,10,0.95)", borderBottom: "1px solid rgba(255,102,0,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", zIndex: 100 },
  navLogo: { fontFamily: "'Cinzel', serif", fontSize: 20, fontWeight: 600, color: "#fff", letterSpacing: "0.08em" },
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
  group_id text,
  role text default 'member',
  city text,
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

-- Enable realtime
alter publication supabase_realtime add table posts;`;

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

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
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
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
        if (error) throw error;
        if (data.user) {
          await supabase.from("profiles").upsert({ id: data.user.id, email, full_name: name, role: email === ADMIN_EMAIL ? "admin" : "member" });
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
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Full Name</label>
              <input style={S.input} placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} />
            </div>
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

  useEffect(() => {
    loadPosts();
    const channel = supabase
      .channel("posts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts", filter: activeGroup !== "all" ? `group_id=eq.${activeGroup}` : undefined }, () => loadPosts())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [activeGroup]);

  async function loadPosts() {
    setLoading(true);
    let q = supabase.from("posts").select("*, profiles(full_name, group_id, role)").order("created_at", { ascending: false }).limit(50);
    if (activeGroup !== "all") q = q.eq("group_id", activeGroup);
    const { data } = await q;
    setPosts(data || []);
    setLoading(false);
  }

  async function submitPost() {
    if (!body.trim()) return;
    setPosting(true);
    await supabase.from("posts").insert({ user_id: profile.id, group_id: activeGroup === "all" ? profile.group_id : activeGroup, body: body.trim() });
    setBody("");
    setPosting(false);
    loadPosts();
  }

  async function deletePost(id) {
    await supabase.from("posts").delete().eq("id", id);
    loadPosts();
  }

  const groupName = GROUPS.find(g => g.id === activeGroup)?.label || "All Groups";

  return (
    <div>
      <div style={S.card}>
        <label style={S.label}>Share with {groupName}</label>
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
                  <span style={S.postAuthor}>{post.profiles?.full_name || "Member"}</span>
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
  const [filter, setFilter] = useState("all");

  useEffect(() => { loadMembers(); }, []);

  async function loadMembers() {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setMembers(data || []);
  }

  async function updateRole(id, role) {
    await supabase.from("profiles").update({ role }).eq("id", id);
    loadMembers();
  }

  const filtered = filter === "all" ? members : members.filter(m => m.group_id === filter);

  return (
    <div>
      <div style={S.flexBetween}>
        <h2 style={{ ...S.h2, margin: 0 }}>Members ({filtered.length})</h2>
        <div style={S.flex}>
          {["all", ...GROUPS.map(g => g.id)].map(f => (
            <button key={f} style={S.tab(filter === f)} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : GROUPS.find(g => g.id === f)?.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 20, display: "grid", gap: 8 }}>
        {filtered.map(m => (
          <div key={m.id} style={{ ...S.card, padding: "16px 20px" }}>
            <div style={S.flexBetween}>
              <div style={S.flex}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,102,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF6600", fontFamily: "'Cinzel', serif", fontWeight: 600 }}>
                  {(m.full_name || m.email || "?")[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ color: "#fff", fontFamily: "'Cinzel', serif", fontSize: 15 }}>{m.full_name || "Unnamed"}</div>
                  <div style={S.muted}>{m.email} {m.city && `· ${m.city}`}</div>
                </div>
              </div>
              <div style={S.flex}>
                <span style={S.badge}>{GROUPS.find(g => g.id === m.group_id)?.label || "No Group"}</span>
                <span style={{ ...S.badge, background: m.role === "admin" ? "rgba(255,102,0,0.3)" : "rgba(255,255,255,0.05)", color: m.role === "admin" ? "#FF6600" : "#666" }}>{m.role}</span>
                {profile.role === "admin" && m.id !== profile.id && (
                  <button style={S.btnSm} onClick={() => updateRole(m.id, m.role === "admin" ? "member" : "admin")}>
                    {m.role === "admin" ? "Remove Admin" : "Make Admin"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Profile({ profile, onUpdate, onSignOut }) {
  const [form, setForm] = useState({ full_name: profile.full_name || "", city: profile.city || "", bio: profile.bio || "", group_id: profile.group_id || "" });
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
          <label style={S.label}>City & State</label>
          <input style={S.input} placeholder="City, State" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
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
        // Profile doesn't exist yet — create it
        await supabase.from("profiles").insert({ 
          id: u.id, 
          email: u.email, 
          full_name: u.user_metadata?.full_name || "", 
          role: u.email === ADMIN_EMAIL ? "admin" : "member" 
        });
        const { data: newProfile } = await supabase.from("profiles").select("*").eq("id", u.id).single();
        setProfile(newProfile);
      } else if (error) {
        // Table doesn't exist
        setShowSetup(true);
      } else {
        // Update role if admin email
        if (u.email === ADMIN_EMAIL && data.role !== "admin") {
          await supabase.from("profiles").update({ role: "admin" }).eq("id", u.id);
          data.role = "admin";
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

  const myGroup = GROUPS.find(g => g.id === profile.group_id);
  const isAdmin = profile.role === "admin";

  return (
    <div style={S.app}>
      <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Lato:wght@300;400;700&display=swap" rel="stylesheet" />

      {/* NAV */}
      <nav style={S.nav}>
        <div>
          <span style={S.navLogo}>ESix10<span style={S.navLogoSub}>Community</span></span>
        </div>
        <div style={S.navRight}>
          <span style={S.badge}>{myGroup?.icon} {myGroup?.label}</span>
          {isAdmin && <span style={{ ...S.badge, background: "rgba(255,102,0,0.3)", color: "#FF6600" }}>Admin</span>}
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,102,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF6600", fontFamily: "'Cinzel', serif", fontWeight: 600, cursor: "pointer" }} onClick={() => setTab("profile")}>
            {(profile.full_name || profile.email || "?")[0].toUpperCase()}
          </div>
        </div>
      </nav>

      {/* MAIN */}
      <div style={{ display: "flex", paddingTop: 70 }}>

        {/* SIDEBAR */}
        <div style={{ width: 220, minHeight: "calc(100vh - 70px)", borderRight: "1px solid rgba(255,255,255,0.05)", padding: "24px 16px", position: "sticky", top: 70, flexShrink: 0 }}>
          <div style={{ marginBottom: 24 }}>
            <p style={{ ...S.eyebrow, marginBottom: 12 }}>Feed</p>
            {[{ id: "all", label: "All Groups", icon: "◎" }, ...GROUPS].map(g => (
              <div key={g.id}
                onClick={() => { setTab("feed"); setFeedGroup(g.id); }}
                style={{ padding: "10px 12px", borderRadius: 4, cursor: "pointer", marginBottom: 2, background: tab === "feed" && feedGroup === g.id ? "rgba(255,102,0,0.1)" : "transparent", color: tab === "feed" && feedGroup === g.id ? "#FF6600" : "#888", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                <span>{g.icon || "◎"}</span> {g.label || "All Groups"}
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 24 }}>
            <p style={{ ...S.eyebrow, marginBottom: 12 }}>Navigation</p>
            {[
              { id: "events", label: "Events", icon: "📅" },
              ...(isAdmin ? [{ id: "members", label: "Members", icon: "👥" }] : []),
              { id: "profile", label: "My Profile", icon: "👤" },
            ].map(item => (
              <div key={item.id}
                onClick={() => setTab(item.id)}
                style={{ padding: "10px 12px", borderRadius: 4, cursor: "pointer", marginBottom: 2, background: tab === item.id ? "rgba(255,102,0,0.1)" : "transparent", color: tab === item.id ? "#FF6600" : "#888", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                <span>{item.icon}</span> {item.label}
              </div>
            ))}
          </div>
          <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>{profile.full_name}</div>
            <div style={{ fontSize: 11, color: "#444" }}>{profile.email}</div>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1, padding: "32px 32px 60px", maxWidth: 800 }}>
          {tab === "feed" && <Feed profile={profile} activeGroup={feedGroup} />}
          {tab === "events" && <Events profile={profile} />}
          {tab === "members" && isAdmin && <Members profile={profile} />}
          {tab === "profile" && <Profile profile={profile} onUpdate={setProfile} onSignOut={signOut} />}
        </div>
      </div>
    </div>
  );
}
