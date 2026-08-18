// Share / invite surfaces and the welcome modal.
import React, { useState } from "react";
import { S } from "./styles";
import { GROUPS } from "./constants";

// ─── Kudos ────────────────────────────────────────────────────────────────────


// ─── Social Feed ──────────────────────────────────────────────────────────────
export function SocialFeed({ profile }) {
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
export function ShareESix10({ profile, onClose }) {
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

// ─── Welcome Modal ────────────────────────────────────────────────────────────
export function WelcomeModal({ profile, onClose }) {
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
        <img src="/esix10logo-dark.png" alt="ESix10" style={{ height: 80, width: "auto", objectFit: "contain", marginBottom: 16 }} />
        
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
