// Devotion, prayer wall, and the faith pages.
import React, { useState, useEffect } from "react";
import { Pin } from "lucide-react";
import { S } from "./styles";
import { supabase } from "./supabaseClient";
import { formatName } from "./helpers";
import { TabCarousel } from "./ui";
import { requireApproved } from "./permissions";
import { notifyMembers } from "./notify";
import { getTodaysDevotion } from "./dailyDevotions";

export const PRAYER_SLIDES = [
  { eyebrow: "Prayer Wall", title: "Someone here is carrying something heavy.", sub: "Lift them up today." },
  { eyebrow: "Stand in the Gap", title: "Pray for one person by name — right now.", sub: "Then tell them you did." },
  { eyebrow: "Promise", title: "Cast all your anxiety on Him, because He cares for you.", sub: "1 Peter 5:7" },
  { eyebrow: "Promise", title: "The prayer of a righteous person is powerful and effective.", sub: "James 5:16" },
  { eyebrow: "Sacred", title: "What's shared here stays here.", sub: "This is holy ground." },
  { eyebrow: "You're not alone", title: "You don't have to carry it by yourself.", sub: "Post a request — we've got you." },
];

// ─── Daily Devotion ────────────────────────────────────────────────────────────
export function Devotion({ profile }) {
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

// ─── Prayer Requests ──────────────────────────────────────────────────────────
export function PrayerRequests({ profile }) {
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

export function StatementOfFaith({ onBack }) {
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
export function PlanOfSalvation({ onBack, profile }) {
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
