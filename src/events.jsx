// Events and the local chapter page.
import React, { useState, useEffect } from "react";
import { MapPin } from "lucide-react";
import { S } from "./styles";
import { GROUPS, PROFILE_COLS } from "./constants";
import { supabase } from "./supabaseClient";
import { formatName } from "./helpers";
import { Avatar, LevelBadgeForUser } from "./icons";
import { TabCarousel } from "./ui";
import { displayName } from "./stats";
import { requireApproved } from "./permissions";
import { notifyMembers } from "./notify";

export const EVENT_SLIDES = [
  { eyebrow: "Events", title: "Show up in person.", sub: "Community is built face to face." },
  { eyebrow: "Gather", title: "Not neglecting to meet together.", sub: "Hebrews 10:25" },
  { eyebrow: "Find your next", title: "See what's coming up.", sub: "Then put it on your calendar." },
  { eyebrow: "Host", title: "Got an event? Submit it.", sub: "Admins review and post it." },
  { eyebrow: "Together", title: "Iron sharpens iron — most of all in person.", sub: "Be there." },
];

export function Events({ profile }) {
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

// ─── Local Chapter ────────────────────────────────────────────────────────────
export function LocalChapter({ profile }) {
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
