// The Forge — walks, challenges, workouts and the training log.
import React, { useState, useEffect } from "react";
import { CheckCircle2, Dumbbell, Flame, Footprints, NotebookPen, Unlock, Zap } from "lucide-react";
import { S, FORGE_CSS } from "./styles";
import { supabase, SUPABASE_ANON_KEY } from "./supabaseClient";
import { TabCarousel } from "./ui";
import { formatName, localDateStr, cleanWodTitle } from "./helpers";

export const FORGE_SLIDES = [
  { eyebrow: "The Forge", title: "Comfort never built anything worth keeping.", sub: "Show up. Do the work." },
  { eyebrow: "Discipline", title: "Motivation quits. Discipline shows up to the funeral.", sub: "Win the small things." },
  { eyebrow: "Strength", title: "He gives strength to the weary.", sub: "Isaiah 40:29" },
  { eyebrow: "Iron", title: "As iron sharpens iron, so one sharpens another.", sub: "Proverbs 27:17" },
  { eyebrow: "Move", title: "Honor God with your body.", sub: "Log a walk or a workout today." },
  { eyebrow: "Stand", title: "You weren't saved to sit down.", sub: "Take on today's challenge." },
];

export const CHALLENGE_CATEGORIES = ['Scripture', 'Physical', 'Mental', 'Preparedness', 'Leadership'];

export const CATEGORY_ICONS = { Scripture: '✝️', Physical: '💪', Mental: '🧠', Preparedness: '◈', Leadership: '⚔️' };

export function ForgeWalk({ profile }) {
  const [todayWalk, setTodayWalk] = useState(null);
  const [streak, setStreak] = useState(0);
  const [totalToday, setTotalToday] = useState(0);
  const [form, setForm] = useState({ distance_miles: '', duration_minutes: '', notes: '', shareToFeed: true });
  const [logging, setLogging] = useState(false);
  const today = localDateStr();

  useEffect(() => { loadWalkData(); }, []);

  async function loadWalkData() {
    const { data: walks } = await supabase.from('forge_walks').select('*').eq('user_id', profile.id).order('date', { ascending: false }).limit(60);
    if (!walks) return;
    const todayEntry = walks.find(w => w.date === today);
    setTodayWalk(todayEntry || null);
    let s = 0;
    let checkDate = new Date();
    for (let i = 0; i < 60; i++) {
      const d = localDateStr(checkDate);
      if (walks.find(w => w.date === d)) { s++; checkDate.setDate(checkDate.getDate() - 1); }
      else break;
    }
    setStreak(s);
    const { count } = await supabase.from('forge_walks').select('*', { count: 'exact', head: true }).eq('date', today);
    setTotalToday(count || 0);
  }

  async function logWalk() {
    setLogging(true);
    const { error } = await supabase.from('forge_walks').insert({ user_id: profile.id, date: today, distance_miles: form.distance_miles ? parseFloat(form.distance_miles) : null, duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null, notes: form.notes || null });
    if (error) {
      setLogging(false);
      alert(`Couldn't log your walk: ${error.message}. Please try again.`);
      return;
    }
    // Share to feed if checked
    if (form.shareToFeed) {
      const name = profile.username ? `@${profile.username}` : formatName(profile.full_name);
      const details = [form.distance_miles && `${form.distance_miles} mi`, form.duration_minutes && `${form.duration_minutes} min`].filter(Boolean).join(' · ');
      const msg = `🚶 ${name} logged a walk today${details ? ` — ${details}` : ''}${form.notes ? ` · "${form.notes}"` : ''}`;
      await supabase.from('posts').insert({ user_id: profile.id, group_id: profile.group_id, body: msg, reactions: {} });
    }
    setLogging(false);
    // Check for streak milestone and celebrate
    const newStreak = streak + 1;
    if ([7, 14, 30, 60, 100, 365].includes(newStreak)) {
      const milestoneMsg = `🔥 Just hit a ${newStreak}-day walk streak! "${newStreak >= 30 ? "Iron sharpens iron." : "One day at a time."}" — Ephesians 6:10`;
      await supabase.from("posts").insert({
        user_id: profile.id,
        group_id: profile.group_id,
        body: milestoneMsg,
        reactions: {}
      });
    }
    loadWalkData();
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div className="streak-badge">
          <Flame size={20} color="#FF7E33" strokeWidth={1.75} />
          <div><div style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, color: '#FF6600', lineHeight: 1 }}>{streak}</div><div style={{ fontSize: 10, color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Day Streak</div></div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Footprints size={18} color="#aaa" strokeWidth={1.75} />
          <div><div style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, color: '#fff', lineHeight: 1 }}>{totalToday}</div><div style={{ fontSize: 10, color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Walked Today</div></div>
        </div>
      </div>
      {todayWalk ? (
        <div style={{ ...S.card, borderTop: '3px solid #51cf66', textAlign: 'center', padding: 32 }}>
          <div style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}><CheckCircle2 size={40} color="#51cf66" strokeWidth={1.75} /></div>
          <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, color: '#fff', marginBottom: 8 }}>You walked today.</h3>
          <p style={{ color: '#888', fontSize: 14 }}>{todayWalk.distance_miles && `${todayWalk.distance_miles} miles`}{todayWalk.distance_miles && todayWalk.duration_minutes && ' · '}{todayWalk.duration_minutes && `${todayWalk.duration_minutes} minutes`}</p>
          {todayWalk.notes && <p style={{ color: '#AAAAAA', fontSize: 14, marginTop: 8, fontStyle: 'italic' }}>"{todayWalk.notes}"</p>}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16 }}>
          <Flame size={22} color="#FF7E33" strokeWidth={1.75} style={{ animation: "pulse 1.5s infinite" }} />
          <p style={{ color: '#FF6600', fontSize: 12, letterSpacing: '0.1em' }}>{streak} day streak — keep it going tomorrow</p>
        </div>
        </div>
      ) : (
        <div style={S.card}>
          <span style={S.eyebrow}>Daily Walk for Sanity</span>
          <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, color: '#fff', marginBottom: 8 }}>Did you walk today?</h3>
          <p style={{ color: '#888', fontSize: 14, marginBottom: 24, lineHeight: 1.7 }}>One walk. Every day. Not for performance — for your mind, your body, and your soul.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div><label style={S.label}>Distance (miles)</label><input style={S.input} type="number" step="0.1" placeholder="1.5" value={form.distance_miles} onChange={e => setForm({...form, distance_miles: e.target.value})} /></div>
            <div><label style={S.label}>Duration (minutes)</label><input style={S.input} type="number" placeholder="30" value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: e.target.value})} /></div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Notes (optional)</label>
            <input style={S.input} placeholder="Where did you walk? How did you feel?" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, background: 'rgba(255,102,0,0.05)', border: '1px solid rgba(255,102,0,0.15)', borderRadius: 8, padding: '12px 16px' }}>
            <input type="checkbox" checked={form.shareToFeed} onChange={e => setForm({...form, shareToFeed: e.target.checked})} style={{ accentColor: '#FF6600', width: 16, height: 16 }} />
            <label style={{ color: '#AAAAAA', fontSize: 13 }}>Share this walk to the group feed</label>
          </div>
          <button style={{ ...S.btn, width: '100%', padding: 16 }} onClick={logWalk} disabled={logging}>{logging ? 'Logging...' : '✓ I Walked Today'}</button>
        </div>
      )}
    </div>
  );
}

export function ForgeChallenge({ profile }) {
  const [challenge, setChallenge] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [note, setNote] = useState('');
  const [completionCount, setCompletionCount] = useState(0);
  const [completions, setCompletions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [shareChallenge, setShareChallenge] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'Scripture', scheduled_date: '' });
  const [queue, setQueue] = useState([]);
  const [showQueue, setShowQueue] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [streak, setStreak] = useState(0);
  const today = localDateStr();
  const autoStocked = React.useRef(false);

  useEffect(() => { loadChallenge(); loadStreak(); }, []);

  async function loadStreak() {
    // Get my completions joined with challenge scheduled_date
    const { data: myCompletions } = await supabase.from('forge_challenge_completions').select('challenge_id, forge_challenges(scheduled_date)').eq('user_id', profile.id);
    if (!myCompletions) return;
    const dates = new Set(myCompletions.map(c => c.forge_challenges?.scheduled_date).filter(Boolean));
    let s = 0;
    let checkDate = new Date();
    for (let i = 0; i < 60; i++) {
      const d = localDateStr(checkDate);
      if (dates.has(d)) { s++; checkDate.setDate(checkDate.getDate() - 1); }
      else break;
    }
    setStreak(s);
  }

  async function loadChallenge() {
    const { data } = await supabase.from('forge_challenges').select('*').eq('scheduled_date', today).maybeSingle();
    setChallenge(data || null);
    if (data) {
      const { count } = await supabase.from('forge_challenge_completions').select('*', { count: 'exact', head: true }).eq('challenge_id', data.id);
      setCompletionCount(count || 0);
      const { data: myCompletion } = await supabase.from('forge_challenge_completions').select('*').eq('challenge_id', data.id).eq('user_id', profile.id).maybeSingle();
      setCompleted(!!myCompletion);
      const { data: allCompletions } = await supabase.from('forge_challenge_completions').select('*, profiles(full_name, username)').eq('challenge_id', data.id).order('created_at', { ascending: false }).limit(10);
      setCompletions(allCompletions || []);
    }
    if (profile.role === 'admin') {
      const { data: upcoming } = await supabase.from('forge_challenges').select('*').gte('scheduled_date', today).order('scheduled_date', { ascending: true }).limit(14);
      setQueue(upcoming || []);
      // Auto-scheduling: if fewer than 7 days are queued ahead, quietly top up a week.
      // Runs at most once per app-open; appends after the last date (never doubles up).
      if ((upcoming?.length || 0) < 7 && !autoStocked.current) {
        autoStocked.current = true;
        generateChallenges(true);
      }
    }
  }

  async function complete() {
    if (completed || !challenge) return;
    setSubmitting(true);
    const { error } = await supabase.from('forge_challenge_completions').insert({ user_id: profile.id, challenge_id: challenge.id, note: note.trim() || null });
    if (error) {
      setSubmitting(false);
      alert(`Couldn't log your challenge: ${error.message}. Please try again.`);
      return;
    }
    if (shareChallenge) {
      const name = profile.username ? `@${profile.username}` : formatName(profile.full_name);
      const msg = `⚡ ${name} completed today's challenge — "${challenge.title}"${note.trim() ? ` · "${note.trim()}"` : ''}`;
      await supabase.from('posts').insert({ user_id: profile.id, group_id: profile.group_id, body: msg, reactions: {} });
    }
    setCompleted(true); setSubmitting(false); setNote(''); loadChallenge(); loadStreak();
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

  async function generateChallenges(silent) {
    if (!silent) setGenerating(true);
    try {
      // Fill from the day AFTER the last scheduled date; if nothing is scheduled
      // for today or later, start from TODAY (so today never ends up empty).
      const { data: last } = await supabase.from('forge_challenges').select('scheduled_date').order('scheduled_date', { ascending: false }).limit(1).maybeSingle();
      const hasFuture = last && last.scheduled_date >= today;
      const base = hasFuture ? new Date(last.scheduled_date + 'T12:00:00') : new Date(today + 'T12:00:00');
      const off = hasFuture ? 1 : 0;
      const response = await fetch('https://bffcrhjdibxqfmdreksi.supabase.co/functions/v1/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          prompt: 'Generate 7 daily challenges for ESix10 — a faith-based community of everyday people built on Ephesians 6:10. Mix categories: Scripture (priority), Physical, Mental, Preparedness, Leadership. RULES: each challenge must be a CLEAR, SPECIFIC, one-day action anyone can do and understand immediately — plain everyday language, no vague spiritual jargon or insider church terms. Title = short and motivating. Description = exactly what to do today, in one or two simple, concrete sentences. Faith-forward but accessible to newcomers. Return ONLY a JSON array, no markdown: [{"title":"","description":"","category":"Scripture|Physical|Mental|Preparedness|Leadership"}]',
          max_tokens: 2000
        })
      });
      const data = await response.json();
      if (!data.content) throw new Error(data.error || 'No content returned');
      const text = data.content.replace(/```json|```/g, '').trim();
      const challenges = JSON.parse(text);
      const insertData = challenges.map((c, i) => {
        const d = new Date(base); d.setDate(d.getDate() + i + off);
        return { ...c, scheduled_date: localDateStr(d), created_by: profile.id };
      });
      const { error: insErr } = await supabase.from('forge_challenges').insert(insertData);
      if (insErr) { if (!silent) alert("Generated, but couldn't save: " + insErr.message); }
      else loadChallenge();
    } catch(e) { console.error('Generate error:', e); if (!silent) alert("Couldn't generate challenges — please try again."); }
    if (!silent) setGenerating(false);
  }

  return (
    <div>
      {streak > 0 && (
        <div className="streak-badge" style={{ marginBottom: 16 }}>
          <Flame size={18} color="#FF7E33" strokeWidth={1.75} />
          <div><div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, color: '#FF6600', lineHeight: 1 }}>{streak}</div><div style={{ fontSize: 9, color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Day Streak</div></div>
        </div>
      )}
      <div style={S.flexBetween}>
        <div><span style={S.eyebrow}>Daily Challenge</span><h2 style={{ ...S.h2, margin: 0 }}>Today</h2></div>
        {profile.role === 'admin' && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button style={{ ...S.btnSm, background: 'rgba(255,102,0,0.15)', color: '#FF6600', border: '1px solid rgba(255,102,0,0.3)' }} onClick={() => setShowQueue(!showQueue)}>📅 {queue.length}</button>
            <button style={S.btnSm} onClick={() => generateChallenges()} disabled={generating}>{generating ? '⏳' : '✨ AI Week'}</button>
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
            <span style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Zap size={40} color="#FF7E33" strokeWidth={1.5} /></span>
            <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, color: '#fff', marginBottom: 8 }}>No challenge posted today.</h3>
            <p style={S.muted}>{profile.role === 'admin' ? 'Use AI Generate to schedule a week.' : 'Check back soon.'}</p>
          </div>
        ) : (
          <div style={{ ...S.card, borderTop: `3px solid ${completed ? '#51cf66' : '#FF6600'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 24 }}>{CATEGORY_ICONS[challenge.category]}</span>
              <span style={{ background: 'rgba(255,102,0,0.1)', border: '1px solid rgba(255,102,0,0.2)', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: '#FF6600', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{challenge.category}</span>
            </div>
            <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, color: '#fff', marginBottom: 12 }}>{challenge.title}</h3>
            {challenge.description && <p style={{ color: '#CCCCCC', fontSize: 15, lineHeight: 1.8, marginBottom: 20 }}>{challenge.description}</p>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <CheckCircle2 size={18} color="#51cf66" strokeWidth={1.75} />
              <span style={{ color: '#888', fontSize: 14 }}><strong style={{ color: '#fff' }}>{completionCount}</strong> completed today</span>
            </div>
            {!completed ? (
              <div>
                <div style={{ marginBottom: 12 }}><label style={S.label}>Note (optional)</label><input style={S.input} placeholder="How did it go?" value={note} onChange={e => setNote(e.target.value)} /></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, background: 'rgba(255,102,0,0.05)', border: '1px solid rgba(255,102,0,0.15)', borderRadius: 8, padding: '10px 14px' }}>
                  <input type="checkbox" checked={shareChallenge} onChange={e => setShareChallenge(e.target.checked)} style={{ accentColor: '#FF6600', width: 16, height: 16 }} />
                  <label style={{ color: '#AAAAAA', fontSize: 13 }}>Share completion to the group feed</label>
                </div>
                <button className={`complete-btn`} onClick={complete} disabled={submitting}>{submitting ? 'Marking...' : '✓ Mark Complete'}</button>
              </div>
            ) : (
              <div style={{ background: 'rgba(81,207,102,0.08)', border: '1px solid rgba(81,207,102,0.2)', borderRadius: 6, padding: '16px 20px', textAlign: 'center' }}>
                <span style={{ color: '#51cf66', fontFamily: "'Inter', sans-serif", fontSize: 16 }}>Challenge Complete ✓</span>
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

export function ForgeWOD({ profile }) {
  const [wod, setWod] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [result, setResult] = useState('');
  const [completionCount, setCompletionCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [shareWOD, setShareWOD] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', warmup: '', main_work: '', cooldown: '', coaching_notes: '', estimated_minutes: '', difficulty: 3, scheduled_date: '' });
  const [queue, setQueue] = useState([]);
  const [showQueue, setShowQueue] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [streak, setStreak] = useState(0);
  const today = localDateStr();
  const autoStocked = React.useRef(false);

  useEffect(() => { loadWOD(); loadStreak(); }, []);

  async function loadStreak() {
    const { data: myCompletions } = await supabase.from('forge_wod_completions').select('wod_id, forge_wods(scheduled_date)').eq('user_id', profile.id);
    if (!myCompletions) return;
    const dates = new Set(myCompletions.map(c => c.forge_wods?.scheduled_date).filter(Boolean));
    let s = 0;
    let checkDate = new Date();
    for (let i = 0; i < 60; i++) {
      const d = localDateStr(checkDate);
      if (dates.has(d)) { s++; checkDate.setDate(checkDate.getDate() - 1); }
      else break;
    }
    setStreak(s);
  }

  async function loadWOD() {
    const { data: wodList } = await supabase.from('forge_wods').select('*').eq('scheduled_date', today).order('created_at', { ascending: true }).limit(1);
    const data = wodList?.[0] || null;
    setWod(data || null);
    if (data) {
      const { count } = await supabase.from('forge_wod_completions').select('*', { count: 'exact', head: true }).eq('wod_id', data.id);
      setCompletionCount(count || 0);
      const { data: myComp } = await supabase.from('forge_wod_completions').select('*').eq('wod_id', data.id).eq('user_id', profile.id).maybeSingle();
      setCompleted(!!myComp);
    }
    if (profile.role === 'admin') {
      const { data: upcoming } = await supabase.from('forge_wods').select('*').gte('scheduled_date', today).order('scheduled_date', { ascending: true }).limit(14);
      setQueue(upcoming || []);
      // Auto-scheduling: top up a week silently when the queue runs low (≤7 days),
      // once per app-open, appended after the last date so nothing doubles up.
      if ((upcoming?.length || 0) < 7 && !autoStocked.current) {
        autoStocked.current = true;
        generateWODs(true);
      }
    }
  }

  async function completeWOD() {
    if (completed || !wod) return;
    setSubmitting(true);
    const { error } = await supabase.from('forge_wod_completions').insert({ user_id: profile.id, wod_id: wod.id, result: result.trim() || null });
    if (error) {
      setSubmitting(false);
      alert(`Couldn't log your WOD: ${error.message}. Please try again.`);
      return;
    }
    if (shareWOD) {
      const name = profile.username ? `@${profile.username}` : formatName(profile.full_name);
      const msg = `💪 ${name} crushed today's WOD — "${cleanWodTitle(wod.title)}"${result.trim() ? ` · ${result.trim()}` : ''}`;
      await supabase.from('posts').insert({ user_id: profile.id, group_id: profile.group_id, body: msg, reactions: {} });
    }
    setCompleted(true); setSubmitting(false); loadWOD(); loadStreak();
  }

  async function createWOD() {
    if (!form.title || !form.scheduled_date) return;
    await supabase.from('forge_wods').insert({ ...form, estimated_minutes: form.estimated_minutes ? parseInt(form.estimated_minutes) : null, difficulty: parseInt(form.difficulty), created_by: profile.id });
    setShowForm(false); setForm({ title: '', warmup: '', main_work: '', cooldown: '', coaching_notes: '', estimated_minutes: '', difficulty: 3, scheduled_date: '' }); loadWOD();
  }

  async function deleteWOD(id) {
    await supabase.from('forge_wods').delete().eq('id', id);
    loadWOD();
  }

  async function generateWODs(silent) {
    if (!silent) setGenerating(true);
    try {
      const { data: last } = await supabase.from('forge_wods').select('scheduled_date').order('scheduled_date', { ascending: false }).limit(1).maybeSingle();
      const hasFuture = last && last.scheduled_date >= today;
      const base = hasFuture ? new Date(last.scheduled_date + 'T12:00:00') : new Date(today + 'T12:00:00');
      const off = hasFuture ? 1 : 0;
      const response = await fetch('https://bffcrhjdibxqfmdreksi.supabase.co/functions/v1/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          prompt: 'Generate 7 bodyweight workouts for a faith-based fitness community of EVERYDAY people of all ages and fitness levels (NOT athletes or CrossFitters). CRITICAL RULE: use ONLY plain, common movement names that anyone instantly understands — push-ups, squats, lunges, planks, jumping jacks, sit-ups, wall sits, mountain climbers, glute bridges, calf raises, high knees, marching in place, arm circles, etc. Do NOT use gym jargon or acronyms (no AMRAP, EMOM, RFT, "thrusters", "burpees over bar", etc.) and do NOT use cryptic codename titles or movements. If you ever include a less-common move, explain it in one short plain sentence right where it appears so nobody has to look it up. Titles must be clear and motivating (e.g. "Foundation Strength", "Steady and Strong"), never codenames, and must NOT include any day of the week or time of day (no "Monday", "Morning", etc.). Vary the difficulty across the week. Keep each field concise and beginner-friendly; coaching_notes may add a brief faith encouragement. Return ONLY a JSON array, no markdown: [{"title":"","warmup":"","main_work":"","cooldown":"","coaching_notes":"","estimated_minutes":30,"difficulty":3}]. difficulty 1-5 (1=very easy, 5=hard).',
          max_tokens: 2500
        })
      });
      const data = await response.json();
      if (!data.content) throw new Error(data.error || 'No content returned');
      const text = data.content.replace(/```json|```/g, '').trim();
      const wods = JSON.parse(text);
      const insertData = wods.map((w, i) => {
        const d = new Date(base); d.setDate(d.getDate() + i + off);
        return { ...w, scheduled_date: localDateStr(d), created_by: profile.id };
      });
      const { error: insErr } = await supabase.from('forge_wods').insert(insertData);
      if (insErr) { if (!silent) alert("Generated, but couldn't save: " + insErr.message); }
      else loadWOD();
    } catch(e) { console.error(e); if (!silent) alert("Couldn't generate workouts — please try again."); }
    if (!silent) setGenerating(false);
  }

  const diffLabel = ['', 'Beginner', 'Easy', 'Moderate', 'Hard', 'Elite'];
  const diffColor = ['', '#51cf66', '#94d82d', '#fcc419', '#ff922b', '#ff4444'];

  return (
    <div>
      {streak > 0 && (
        <div className="streak-badge" style={{ marginBottom: 16 }}>
          <Flame size={18} color="#FF7E33" strokeWidth={1.75} />
          <div><div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, color: '#FF6600', lineHeight: 1 }}>{streak}</div><div style={{ fontSize: 9, color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Day Streak</div></div>
        </div>
      )}
      <div style={S.flexBetween}>
        <div><span style={S.eyebrow}>Workout of the Day</span><h2 style={{ ...S.h2, margin: 0 }}>Today</h2></div>
        {profile.role === 'admin' && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button style={{ ...S.btnSm, background: 'rgba(255,102,0,0.15)', color: '#FF6600', border: '1px solid rgba(255,102,0,0.3)' }} onClick={() => setShowQueue(!showQueue)}>📅 {queue.length}</button>
            <button style={S.btnSm} onClick={() => generateWODs()} disabled={generating}>{generating ? '⏳' : '✨ AI Week'}</button>
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
              <span style={{ color: '#fff', fontSize: 13 }}><span style={{ color: diffColor[q.difficulty] }}>●</span> {cleanWodTitle(q.title)} <span style={{ color: '#555', fontSize: 11 }}>{q.scheduled_date} · {q.estimated_minutes}min</span></span>
              <button style={S.btnDanger} onClick={() => deleteWOD(q.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 20 }}>
        {!wod ? (
          <div style={{ ...S.card, textAlign: 'center', padding: 48 }}>
            <span style={{ fontSize: 40, display: 'block', marginBottom: 16 }}>🏋️</span>
            <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, color: '#fff', marginBottom: 8 }}>No WOD today.</h3>
            <p style={S.muted}>{profile.role === 'admin' ? 'Use AI Generate to schedule a week.' : 'Rest day. Check back tomorrow.'}</p>
          </div>
        ) : (
          <div style={{ ...S.card, borderTop: `3px solid ${completed ? '#51cf66' : '#FF6600'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, color: '#fff' }}>{cleanWodTitle(wod.title)}</h3>
              <div style={S.flex}>
                {wod.estimated_minutes && <span style={S.badge}>⏱ {wod.estimated_minutes}min</span>}
                {(() => { const d = Math.max(0, Math.min(5, parseInt(wod.difficulty) || 0)); return d ? <span style={{ ...S.badge, background: `${diffColor[d]}20`, color: diffColor[d] }}>{'●'.repeat(d)} {diffLabel[d]}</span> : null; })()}
              </div>
            </div>
            {wod.warmup && <div style={{ marginBottom: 16 }}><span style={S.eyebrow}>Warm Up</span><p style={{ color: '#CCCCCC', fontSize: 15, lineHeight: 1.8, whiteSpace: 'pre-line' }}>{wod.warmup}</p></div>}
            {wod.main_work && <div style={{ background: 'rgba(255,102,0,0.05)', border: '1px solid rgba(255,102,0,0.15)', borderRadius: 4, padding: '16px 20px', marginBottom: 16 }}><span style={S.eyebrow}>Main Work</span><p style={{ color: '#fff', fontSize: 15, lineHeight: 2, whiteSpace: 'pre-line' }}>{wod.main_work}</p></div>}
            {wod.cooldown && <div style={{ marginBottom: 16 }}><span style={S.eyebrow}>Cool Down</span><p style={{ color: '#CCCCCC', fontSize: 15, lineHeight: 1.8, whiteSpace: 'pre-line' }}>{wod.cooldown}</p></div>}
            {wod.coaching_notes && <div style={{ background: 'rgba(192,154,47,0.06)', border: '1px solid rgba(192,154,47,0.15)', borderRadius: 4, padding: '12px 16px', marginBottom: 20 }}><span style={{ ...S.eyebrow, color: '#C09A2F' }}>Coaching Notes</span><p style={{ color: '#AAAAAA', fontSize: 13, lineHeight: 1.8 }}>{wod.coaching_notes}</p></div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <CheckCircle2 size={16} color="#51cf66" strokeWidth={1.75} /><span style={{ color: '#888', fontSize: 14 }}><strong style={{ color: '#fff' }}>{completionCount}</strong> completed today</span>
            </div>
            {!completed ? (
              <div>
                <div style={{ marginBottom: 12 }}><label style={S.label}>Log Result (optional)</label><input style={S.input} placeholder="Time, rounds, notes" value={result} onChange={e => setResult(e.target.value)} /></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, background: 'rgba(255,102,0,0.05)', border: '1px solid rgba(255,102,0,0.15)', borderRadius: 8, padding: '10px 14px' }}>
                  <input type="checkbox" checked={shareWOD} onChange={e => setShareWOD(e.target.checked)} style={{ accentColor: '#FF6600', width: 16, height: 16 }} />
                  <label style={{ color: '#AAAAAA', fontSize: 13 }}>Share completion to the group feed</label>
                </div>
                <button style={{ ...S.btn, width: '100%', padding: 16 }} onClick={completeWOD} disabled={submitting}>{submitting ? 'Logging...' : '✓ WOD Complete'}</button>
              </div>
            ) : (
              <div style={{ background: 'rgba(81,207,102,0.08)', border: '1px solid rgba(81,207,102,0.2)', borderRadius: 6, padding: '16px 20px', textAlign: 'center' }}>
                <span style={{ color: '#51cf66', fontFamily: "'Inter', sans-serif", fontSize: 16 }}>WOD Complete ✓</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ForgeLog({ profile }) {
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
    const { error } = await supabase.from('forge_walks').insert({ user_id: profile.id, date: form.date, duration_minutes: form.duration ? parseInt(form.duration) : null, notes: `[${form.type}] ${form.notes}`.trim() });
    if (error) {
      setSaving(false);
      alert(`Couldn't save your workout: ${error.message}. Please try again.`);
      return;
    }
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
        {Object.keys(grouped).length === 0 && <div style={{ textAlign: 'center', padding: 60 }}><span style={{ fontSize: 40, display: 'block', marginBottom: 16 }}>📓</span><h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, color: '#fff', marginBottom: 8 }}>No activity logged yet.</h3><p style={S.muted}>Start logging your walks and workouts.</p></div>}
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

export const FORGE_QUOTES = [
  "Iron sharpens iron.",
  "Prepared. Equipped. Unshaken.",
  "The armor of God is put on daily.",
  "A man who cannot walk a mile cannot protect his family.",
  "Strength under control — not weakness.",
  "Stand firm. The Lord fights for you.",
  "Discipline is the highest form of self-respect.",
  "Be watchful, stand firm in the faith, act like men, be strong.",
];

export function TheForge({ profile }) {
  const [subTab, setSubTab] = useState('walk');
  const todayQuote = FORGE_QUOTES[new Date().getDay() % FORGE_QUOTES.length];
  const FORGE_TABS = [
    { id: 'walk', label: 'Walk', icon: Footprints },
    { id: 'challenge', label: 'Challenge', icon: Zap },
    { id: 'wod', label: 'WOD', icon: Dumbbell },
    { id: 'log', label: 'My Log', icon: NotebookPen },
  ];
  return (
    <div>
      <style>{FORGE_CSS}</style>
      <TabCarousel slides={FORGE_SLIDES} />
      <div className="forge-hero" style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <span style={{ ...S.eyebrow, marginBottom: 6 }}>The Forge</span>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 24, fontWeight: 400, color: "#fff", marginBottom: 8, lineHeight: 1.2 }}>Train. Pray. Prepare.</h2>
          <p style={{ color: "#FF7E33", fontSize: 13, fontStyle: "italic", letterSpacing: "0.05em" }}>"{todayQuote}"</p>
          <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
            <span style={{ background: "rgba(255,102,0,0.1)", border: "1px solid rgba(255,102,0,0.2)", borderRadius: 20, padding: "4px 12px", fontSize: 11, color: "#FF7E33", letterSpacing: "0.1em", display: "inline-flex", alignItems: "center", gap: 5 }}><Unlock size={11} /> Beta — Full Access Free</span>
          </div>
        </div>
        <div style={{ width: 80, height: 80, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", animation: "pulse 1.5s infinite" }}><Flame size={56} color="#FF7E33" strokeWidth={1.5} /></div>
      </div>
      <div className="forge-tab-bar">
        {FORGE_TABS.map(t => (
          <button key={t.id} className={`forge-tab ${subTab === t.id ? 'active' : 'inactive'}`} onClick={() => setSubTab(t.id)}>
            <span style={{ display: 'block', marginBottom: 3 }}><t.icon size={22} strokeWidth={1.75} /></span>
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
