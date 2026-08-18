// Global CSS and the shared inline-style object `S`. Extracted from App.jsx.

// ─── Global CSS ───────────────────────────────────────────────────────────────
export const GLOBAL_CSS = `
/* Crisp text rendering (fixes fuzzy light-on-dark text on Mac/Retina) */
html, body, #root, * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
body { text-rendering: optimizeLegibility; }
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

/* Premium animations */
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
@keyframes scaleIn { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }

/* Post cards animate in */
.post-card { animation: fadeIn 0.3s ease forwards; }

/* Skeleton loader */
.skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 6px; }

/* Button press effect */
.btn-press { transition: transform 0.1s ease, opacity 0.1s ease; }
.btn-press:active { transform: scale(0.97); opacity: 0.9; }

/* Premium card */
.premium-card { background: linear-gradient(145deg, rgba(26,26,36,0.98), rgba(18,18,26,0.98)); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px; transition: border-color 0.2s, transform 0.2s; }
.premium-card:hover { border-color: rgba(255,102,0,0.2); }

/* Gold gradient text */
.gold-text { background: linear-gradient(135deg, #FF6600, #C09A2F); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

/* Tab active gradient */
.tab-active { background: linear-gradient(135deg, rgba(255,102,0,0.25), rgba(192,154,47,0.15)) !important; border-color: rgba(255,102,0,0.4) !important; }

/* Section divider */
.section-divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(255,102,0,0.3), transparent); margin: 24px 0; }

/* Online indicator pulse */
.online-dot { width: 8px; height: 8px; border-radius: 50%; background: #51cf66; display: inline-block; animation: pulse 2s infinite; box-shadow: 0 0 6px rgba(81,207,102,0.5); }

/* Reaction button hover */
.reaction-btn { transition: transform 0.15s, background 0.15s !important; }
.reaction-btn:hover { transform: scale(1.25) !important; }
.reaction-btn:active { transform: scale(0.95) !important; }

/* Input focus glow */
input:focus, textarea:focus, select:focus { outline: none; border-color: rgba(255,102,0,0.5) !important; box-shadow: 0 0 0 2px rgba(255,102,0,0.1) !important; }

/* Nav gradient border */
.nav-premium { border-bottom: 1px solid rgba(255,102,0,0.15) !important; background: linear-gradient(180deg, rgba(13,17,23,0.99) 0%, rgba(10,12,18,0.99) 100%) !important; }

/* Premium badge */
.premium-badge { background: linear-gradient(135deg, #C09A2F, #FF6600); color: #fff; border-radius: 4px; padding: "2px 8px"; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; }

.verse-banner { background: linear-gradient(135deg, rgba(255,102,0,0.1) 0%, rgba(192,154,47,0.1) 100%); border: 1px solid rgba(255,102,0,0.25); border-radius:12px; padding:20px; margin-bottom:20px; box-shadow: 0 4px 20px rgba(255,102,0,0.08); }
.activity-item { animation: slideIn 0.3s ease forwards; }
.level-badge { display: inline-flex; align-items: center; gap: 4px; border-radius: 20px; padding: 3px 10px; font-size: 11px; font-weight: 600; letter-spacing: 0.05em; }
.xp-bar { height: 4px; border-radius: 2px; background: rgba(255,255,255,0.06); overflow: hidden; }
.xp-fill { height: 100%; border-radius: 2px; background: linear-gradient(90deg, #FF6600, #C09A2F); transition: width 0.8s ease; }
.forge-hero { background: linear-gradient(135deg, rgba(255,102,0,0.12) 0%, rgba(10,10,10,0.8) 60%); border: 1px solid rgba(255,102,0,0.2); border-radius: 12px; padding: 28px 24px; margin-bottom: 20px; position: relative; overflow: hidden; }
.forge-hero::before { content: ""; }
.streak-fire { animation: pulse 1.5s infinite; display: inline-block; }
@keyframes celebrate { 0%{transform:scale(1)} 50%{transform:scale(1.3)} 100%{transform:scale(1)} }
.celebrate { animation: celebrate 0.5s ease; }
.activity-ticker { background: rgba(255,102,0,0.04); border: 1px solid rgba(255,102,0,0.1); border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; overflow: hidden; }
`;

// ─── Styles ───────────────────────────────────────────────────────────────────
export const S = {
  app: { minHeight: "100vh", background: "#0d1117", color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: 15 },
  nav: { position: "fixed", top: 0, left: 0, right: 0, height: 60, background: "linear-gradient(180deg, rgba(10,12,18,0.99) 0%, rgba(13,17,23,0.97) 100%)", borderBottom: "1px solid rgba(255,102,0,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", zIndex: 100 },
  navLogo: { fontFamily: "'Cinzel', serif", fontSize: 16, fontWeight: 600, color: "#fff", letterSpacing: "0.08em" },
  navLogoSub: { color: "#FF7E33", fontSize: 9, display: "block", letterSpacing: "0.35em", marginTop: -2 },
  navRight: { display: "flex", alignItems: "center", gap: 16 },
  badge: { background: "rgba(255,102,0,0.15)", color: "#FF7E33", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" },
  btn: { background: "linear-gradient(135deg, #FF6600, #E55A00)", color: "#fff", border: "none", borderRadius: 8, boxShadow: "0 2px 12px rgba(255,102,0,0.25)", padding: "10px 24px", fontFamily: "'Inter', sans-serif", fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", transition: "background 0.2s" },
  btnGhost: { background: "transparent", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "10px 24px", fontFamily: "'Inter', sans-serif", fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer" },
  btnSm: { background: "linear-gradient(135deg, #FF6600, #E55A00)", color: "#fff", border: "none", borderRadius: 8, boxShadow: "0 2px 8px rgba(255,102,0,0.2)", padding: "8px 16px", fontFamily: "'Inter', sans-serif", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer" },
  btnDanger: { background: "transparent", color: "#ff4444", border: "1px solid #ff4444", borderRadius: 8, padding: "6px 12px", fontSize: 11, cursor: "pointer" },
  page: { paddingTop: 90, maxWidth: 1100, margin: "0 auto", padding: "90px 24px 60px" },
  card: { background: "linear-gradient(145deg, rgba(22,27,36,0.98), rgba(16,20,28,0.98))", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 24, transition: "border-color 0.2s" },
  input: { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "12px 16px", color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: 16, outline: "none", boxSizing: "border-box" },
  label: { fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#FF7E33", marginBottom: 6, display: "block" },
  divider: { width: 50, height: 2, background: "#FF6600", margin: "16px 0" },
  eyebrow: { fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#FF7E33", display: "block", marginBottom: 10 },
  h1: { fontFamily: "'Cinzel', serif", fontSize: 34, fontWeight: 600, color: "#fff", marginBottom: 8, letterSpacing: "0.01em" },
  h2: { fontFamily: "'Cinzel', serif", fontSize: 24, fontWeight: 600, color: "#fff", marginBottom: 8, letterSpacing: "0.01em" },
  h3: { fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 400, color: "#fff", marginBottom: 8 },
  muted: { color: "#BBBBBB", fontSize: 13 },
  grey: { color: "#FFFFFF" },
  orange: { color: "#FF7E33" },
  error: { color: "#ff6b6b", fontSize: 13, marginTop: 6 },
  success: { color: "#51cf66", fontSize: 13, marginTop: 6 },
  flex: { display: "flex", alignItems: "center", gap: 12 },
  flexBetween: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 },
  post: { background: "linear-gradient(145deg, rgba(22,27,36,0.98), rgba(16,20,28,0.98))", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 20, marginBottom: 12, transition: "border-color 0.2s" },
  postAuthor: { fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: "#fff" },
  postTime: { fontSize: 11, color: "#8A8A8A", marginLeft: 8 },
  postBody: { color: "#FFFFFF", fontSize: 15, lineHeight: 1.7, marginTop: 10 },
  tab: (active) => ({ padding: "10px 20px", background: active ? "#FF6600" : "transparent", color: active ? "#fff" : "#888", border: active ? "none" : "1px solid rgba(255,255,255,0.1)", borderRadius: 8, cursor: "pointer", fontFamily: "'Inter',sans-serif", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }),
  groupCard: (selected) => ({ border: selected ? "2px solid #FF6600" : "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "24px 20px", cursor: "pointer", background: selected ? "rgba(255,102,0,0.08)" : "rgba(26,26,26,0.6)", textAlign: "center", transition: "all 0.2s" }),
};

// ─── The Forge ────────────────────────────────────────────────────────────────
export const FORGE_CSS = `
.forge-tab-bar { display: flex; gap: 4px; margin-bottom: 24px; background: rgba(255,255,255,0.03); border-radius: 6px; padding: 4px; }
.forge-tab { flex: 1; padding: 12px 8px; border: none; border-radius: 6px; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; transition: all 0.2s; }
.forge-tab.active { background: #FF6600; color: #fff; }
.forge-tab.inactive { background: transparent; color: #666; }
.forge-tab.inactive:hover { color: #FF6600; }
.streak-badge { display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg, rgba(255,102,0,0.2), rgba(192,154,47,0.15)); border: 1px solid rgba(255,102,0,0.3); border-radius: 20px; padding: 6px 16px; }
.complete-btn { width: 100%; padding: 16px; border: 2px solid #FF6600; border-radius: 6px; background: transparent; color: #FF6600; font-family: 'Inter', sans-serif; font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; }
.complete-btn:hover, .complete-btn.done { background: #FF6600; color: #fff; }
.beta-banner { background: linear-gradient(135deg, rgba(255,102,0,0.1), rgba(192,154,47,0.08)); border: 1px solid rgba(255,102,0,0.2); border-radius: 6px; padding: 12px 20px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
`;
