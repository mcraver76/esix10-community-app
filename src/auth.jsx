// Sign-in / sign-up, onboarding and the consent gates.
import React, { useState } from "react";
import { S } from "./styles";
import { ADMIN_EMAIL, GROUPS } from "./constants";
import { supabase } from "./supabaseClient";
import { NavIcon } from "./icons";
import { sendMemberEmail } from "./notify";
import { StatementOfFaith } from "./faith";
import { LEGAL_VERSION, LEGAL_EFFECTIVE, TERMS, PRIVACY, MOD_AGREEMENT } from "./legalContent";

// ─── Components ───────────────────────────────────────────────────────────────

export function SetupModal({ onClose }) {
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

export function PendingScreen({ profile, onSignOut }) {
  const group = GROUPS.find(g => g.id === profile.group_id);
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <img src="/esix10logo-dark.png" alt="ESix10" style={{ height: 134, width: "auto", objectFit: "contain", marginBottom: 8 }} />
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

export function AuthScreen({ onAuth }) {
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
          <img src="/esix10logo-dark.png" alt="ESix10" style={{ height: 144, width: "auto", objectFit: "contain", marginBottom: 8 }} />
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

export function GroupSelect({ user, onSelect }) {
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

export function PasswordResetScreen({ onDone }) {
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
          <img src="/esix10logo-dark.png" alt="ESix10" style={{ height: 120, width: "auto", objectFit: "contain" }} />
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

export function LegalDoc({ sections }) {
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

export function LegalAndPrivacy({ onBack }) {
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

export function AgreementGate({ title, intro, sections, agreeLabel, onAgree, onDecline }) {
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

export function ProfileCompletionGate({ profile, onDone, onSignOut }) {
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
