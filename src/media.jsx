// Media — Watch (Cloudflare VOD), Listen (audio/podcast) and Live streams.
import React from "react";
import { S } from "./styles";
import { supabase, SUPABASE_ANON_KEY } from "./supabaseClient";

// ─── Statement of Faith ───────────────────────────────────────────────────────

// ─── Media ────────────────────────────────────────────────────────────────────
export const CF_FUNCTION_URL = 'https://bffcrhjdibxqfmdreksi.supabase.co/functions/v1/cloudflare';

export async function callCloudflare(action, data = {}) {
  try {
    const response = await fetch(CF_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ action, data })
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) return { error: json.error || json.message || `Cloudflare request failed (${response.status})` };
    return json;
  } catch (e) {
    return { error: e.message || "Network error reaching Cloudflare." };
  }
}

export function formatDuration(seconds) {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VideoPlayer({ video, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.97)', zIndex: 500, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, color: '#fff', margin: 0 }}>{video.title}</h3>
          <span style={{ color: '#FF6600', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{video.category}</span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#FF6600', fontSize: 24, cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 900 }}>
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 10, overflow: 'hidden' }}>
            <iframe
              src={`https://iframe.cloudflarestream.com/${video.cloudflare_uid}?autoplay=true&primaryColor=FF6600`}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
          {video.description && <p style={{ color: '#CCCCCC', fontSize: 15, lineHeight: 1.8, marginTop: 16 }}>{video.description}</p>}
        </div>
      </div>
    </div>
  );
}

export function AudioPlayer({ episode }) {
  const audioRef = React.useRef();
  const [playing, setPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [duration, setDuration] = React.useState(0);

  function toggle() {
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  }

  return (
    <div style={{ background: 'rgba(255,102,0,0.06)', border: '1px solid rgba(255,102,0,0.2)', borderRadius: 10, padding: 16 }}>
      <audio ref={audioRef} src={episode.audio_url}
        onTimeUpdate={() => setProgress(audioRef.current.currentTime)}
        onLoadedMetadata={() => setDuration(audioRef.current.duration)}
        onEnded={() => setPlaying(false)} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={toggle} style={{ width: 44, height: 44, borderRadius: '50%', background: '#FF6600', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {playing ? '⏸' : '▶'}
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontSize: 14, fontFamily: "'Inter', sans-serif", marginBottom: 6 }}>{episode.title}</div>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 4, cursor: 'pointer' }}
            onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); const pct = (e.clientX - rect.left) / rect.width; audioRef.current.currentTime = pct * duration; }}>
            <div style={{ width: duration ? `${(progress/duration)*100}%` : '0%', height: '100%', background: '#FF6600', borderRadius: 4, transition: 'width 0.5s' }} />
          </div>
        </div>
        <span style={{ color: '#888', fontSize: 12, flexShrink: 0 }}>{formatDuration(Math.floor(progress))} / {formatDuration(Math.floor(duration))}</span>
      </div>
    </div>
  );
}

export function Media({ profile }) {
  const [subTab, setSubTab] = React.useState('watch');
  const [videos, setVideos] = React.useState([]);
  const [audio, setAudio] = React.useState([]);
  const [livestreams, setLivestreams] = React.useState([]);
  const [category, setCategory] = React.useState('All');
  const [activeVideo, setActiveVideo] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [showAddVideo, setShowAddVideo] = React.useState(false);
  const [showAddAudio, setShowAddAudio] = React.useState(false);
  const [showAddLive, setShowAddLive] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState('');
  const [videoForm, setVideoForm] = React.useState({ title: '', description: '', category: 'Teaching', premium: false });
  const [audioForm, setAudioForm] = React.useState({ title: '', description: '', episode_number: '', premium: false });
  const [liveForm, setLiveForm] = React.useState({ title: '', description: '', scheduled_at: '' });
  const videoFileRef = React.useRef();
  const audioFileRef = React.useRef();

  React.useEffect(() => { loadMedia(); }, []);

  async function loadMedia() {
    setLoading(true);
    const [{ data: vids }, { data: aud }, { data: live }] = await Promise.all([
      supabase.from('media_videos').select('*').eq('published', true).order('created_at', { ascending: false }),
      supabase.from('media_audio').select('*').eq('published', true).order('episode_number', { ascending: false }),
      supabase.from('media_livestreams').select('*').order('created_at', { ascending: false }).limit(5)
    ]);
    setVideos(vids || []);
    setAudio(aud || []);
    setLivestreams(live || []);
    setLoading(false);
  }

  async function uploadVideo(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!videoForm.title) { alert('Add a title first'); return; }
    setUploading(true);
    setUploadProgress('Getting upload URL...');
    try {
      const { uploadURL, uid } = await callCloudflare('create_upload', { title: videoForm.title });
      if (!uploadURL) throw new Error('Could not get upload URL');
      setUploadProgress('Uploading to Cloudflare...');
      const formData = new FormData();
      formData.append('file', file);
      await fetch(uploadURL, { method: 'POST', body: formData });
      setUploadProgress('Saving...');
      await supabase.from('media_videos').insert({ ...videoForm, cloudflare_uid: uid, published: true, created_by: profile.id });
      setUploadProgress('');
      setUploading(false);
      setShowAddVideo(false);
      setVideoForm({ title: '', description: '', category: 'Teaching', premium: false });
      loadMedia();
    } catch(err) {
      setUploadProgress('Error: ' + err.message);
      setUploading(false);
    }
  }

  async function uploadAudio(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('audio/')) { alert('Please choose an audio file (MP3, M4A, WAV, etc.).'); return; }
    if (!audioForm.title) { alert('Add a title first'); return; }
    setUploading(true);
    setUploadProgress('Uploading audio...');
    const path = `audio/${profile.id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file);
    if (error) { setUploadProgress(''); setUploading(false); alert(`Audio upload failed: ${error.message}`); return; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const { error: insErr } = await supabase.from('media_audio').insert({ ...audioForm, audio_url: data.publicUrl, episode_number: parseInt(audioForm.episode_number) || 1, published: true, created_by: profile.id });
    setUploadProgress('');
    setUploading(false);
    if (insErr) { alert(`Audio uploaded but couldn't be saved: ${insErr.message}`); return; }
    setShowAddAudio(false);
    setAudioForm({ title: '', description: '', episode_number: '', premium: false });
    loadMedia();
  }

  async function createLivestream() {
    if (!liveForm.title) return;
    setUploading(true);
    const result = await callCloudflare('create_livestream', { title: liveForm.title });
    if (!result || result.error || !result.streamKey || !result.uid) {
      setUploading(false);
      alert(`Couldn't create the live stream: ${result?.error || "Cloudflare didn't return stream details — check the Cloudflare setup."}`);
      return;
    }
    const { error } = await supabase.from('media_livestreams').insert({ ...liveForm, stream_key: result.streamKey, playback_id: result.uid, status: 'offline', created_by: profile.id });
    setUploading(false);
    if (error) { alert(`Stream created on Cloudflare but couldn't be saved: ${error.message}`); return; }
    setShowAddLive(false);
    setLiveForm({ title: '', description: '', scheduled_at: '' });
    loadMedia();
    alert(`✅ Live stream created!\n\nRTMPS URL:\n${result.rtmpsUrl}\n\nStream Key:\n${result.streamKey}\n\nPaste these into StreamYard / Restream (as a "Custom RTMP" destination) — alongside Facebook & LinkedIn — or into OBS. Then tap "Go Live" here to show it to members.`);
  }

  const filteredVideos = category === 'All' ? videos : videos.filter(v => v.category === category);
  const liveStream = livestreams.find(l => l.status === 'live');

  return (
    <div>
      {activeVideo && <VideoPlayer video={activeVideo} onClose={() => setActiveVideo(null)} />}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: 4 }}>
        {[{id:'watch',label:'Watch',icon:'📺'},{id:'listen',label:'Listen',icon:'🎙️'},{id:'live',label:'Live',icon:'🔴'}].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            style={{ flex: 1, padding: '10px 8px', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', background: subTab === t.id ? '#FF6600' : 'transparent', color: subTab === t.id ? '#fff' : '#666' }}>
            <span style={{ fontSize: 20, display: 'block', marginBottom: 2 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {subTab === 'watch' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ ...S.h2, margin: 0 }}>Video Library</h2>
            {profile.role === 'admin' && <button style={S.btn} onClick={() => setShowAddVideo(!showAddVideo)}>+ Upload Video</button>}
          </div>
          {showAddVideo && (
            <div style={{ ...S.card, marginBottom: 20, overflow: "hidden" }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div style={{ gridColumn: '1/-1' }}><label style={S.label}>Title</label><input style={S.input} value={videoForm.title} onChange={e => setVideoForm({...videoForm, title: e.target.value})} placeholder="Video title" /></div>
                <div><label style={S.label}>Category</label><select style={S.input} value={videoForm.category} onChange={e => setVideoForm({...videoForm, category: e.target.value})}>{['Teaching','Forge','Devotion','Training'].map(c => <option key={c}>{c}</option>)}</select></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}><input type="checkbox" checked={videoForm.premium} onChange={e => setVideoForm({...videoForm, premium: e.target.checked})} style={{ accentColor: '#FF6600' }} /><label style={{ color: '#888', fontSize: 13 }}>Premium only</label></div>
                <div style={{ gridColumn: '1/-1' }}><label style={S.label}>Description</label><textarea style={{ ...S.input, minHeight: 60 }} value={videoForm.description} onChange={e => setVideoForm({...videoForm, description: e.target.value})} /></div>
              </div>
              {uploadProgress && <p style={{ color: '#FF6600', fontSize: 13, marginBottom: 12 }}>{uploadProgress}</p>}
              <label style={{ ...S.btn, display: 'inline-block', cursor: uploading || !videoForm.title ? 'not-allowed' : 'pointer', opacity: uploading || !videoForm.title ? 0.5 : 1 }}>
                {uploading ? uploadProgress || 'Uploading...' : 'Choose Video & Upload'}
                <input type="file" accept="video/*" style={{ display: 'none' }} onChange={uploadVideo} disabled={uploading || !videoForm.title} />
              </label>
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
            {['All','Teaching','Forge','Devotion','Training'].map(c => <button key={c} onClick={() => setCategory(c)} style={{ ...S.tab(category === c), padding: '6px 14px', fontSize: 11 }}>{c}</button>)}
          </div>
          {loading && (
      <div>
        {[1,2,3].map(i => (
          <div key={i} style={{ ...S.post, marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div className="skeleton" style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: 14, width: "40%", marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 12, width: "25%" }} />
              </div>
            </div>
            <div className="skeleton" style={{ height: 14, width: "90%", marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 14, width: "70%", marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 14, width: "50%" }} />
          </div>
        ))}
      </div>
    )}
          {!loading && filteredVideos.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📺</div>
              <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, color: '#fff', marginBottom: 8 }}>No videos yet.</h3>
              <p style={S.muted}>{profile.role === 'admin' ? 'Upload your first video above.' : 'Content coming soon.'}</p>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {filteredVideos.map(v => (
              <div key={v.id} style={{ ...S.card, padding: 0, overflow: 'hidden', cursor: 'pointer' }} onClick={() => setActiveVideo(v)}>
                <div style={{ position: 'relative', paddingBottom: '56.25%', background: 'rgba(255,102,0,0.08)' }}>
                  {v.cloudflare_uid && <img src={`https://videodelivery.net/${v.cloudflare_uid}/thumbnails/thumbnail.jpg`} alt={v.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,102,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>▶</div>
                  </div>
                  {v.premium && <div style={{ position: 'absolute', top: 8, right: 8, background: '#C09A2F', borderRadius: 4, padding: '2px 8px', fontSize: 10, color: '#fff' }}>PREMIUM</div>}
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ color: '#FF6600', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>{v.category}</div>
                  <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 400, color: '#fff', marginBottom: 4 }}>{v.title}</h3>
                  {v.description && <p style={{ color: '#888', fontSize: 12, lineHeight: 1.6 }}>{v.description.slice(0, 80)}{v.description.length > 80 ? '...' : ''}</p>}
                  {profile.role === 'admin' && <button style={{ ...S.btnDanger, marginTop: 8, fontSize: 11, padding: '4px 10px' }} onClick={e => { e.stopPropagation(); supabase.from('media_videos').delete().eq('id', v.id).then(loadMedia); }}>Delete</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === 'listen' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ ...S.h2, margin: 0 }}>Episodes</h2>
            {profile.role === 'admin' && <button style={S.btn} onClick={() => setShowAddAudio(!showAddAudio)}>+ Add Episode</button>}
          </div>
          {showAddAudio && (
            <div style={{ ...S.card, marginBottom: 20, overflow: "hidden" }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div style={{ gridColumn: '1/-1' }}><label style={S.label}>Title</label><input style={S.input} value={audioForm.title} onChange={e => setAudioForm({...audioForm, title: e.target.value})} /></div>
                <div><label style={S.label}>Episode #</label><input style={S.input} type="number" value={audioForm.episode_number} onChange={e => setAudioForm({...audioForm, episode_number: e.target.value})} /></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}><input type="checkbox" checked={audioForm.premium} onChange={e => setAudioForm({...audioForm, premium: e.target.checked})} style={{ accentColor: '#FF6600' }} /><label style={{ color: '#888', fontSize: 13 }}>Premium only</label></div>
                <div style={{ gridColumn: '1/-1' }}><label style={S.label}>Description</label><textarea style={{ ...S.input, minHeight: 60 }} value={audioForm.description} onChange={e => setAudioForm({...audioForm, description: e.target.value})} /></div>
              </div>
              {uploadProgress && <p style={{ color: '#FF6600', fontSize: 13, marginBottom: 12 }}>{uploadProgress}</p>}
              <label style={{ ...S.btn, display: 'inline-block', cursor: uploading || !audioForm.title ? 'not-allowed' : 'pointer', opacity: uploading || !audioForm.title ? 0.5 : 1 }}>
                {uploading ? uploadProgress || 'Uploading...' : 'Choose Audio & Upload'}
                <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={uploadAudio} disabled={uploading || !audioForm.title} />
              </label>
            </div>
          )}
          {audio.length === 0 && <div style={{ textAlign: 'center', padding: 60 }}><div style={{ fontSize: 48, marginBottom: 16 }}>🎙️</div><h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, color: '#fff', marginBottom: 8 }}>No episodes yet.</h3><p style={S.muted}>{profile.role === 'admin' ? 'Upload your first episode above.' : 'Episodes coming soon.'}</p></div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {audio.map(ep => (
              <div key={ep.id} style={S.card}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 8, background: 'linear-gradient(135deg, rgba(255,102,0,0.3), rgba(192,154,47,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🎙️</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#FF6600', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>Episode {ep.episode_number}</div>
                    <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 400, color: '#fff', marginBottom: 4 }}>{ep.title}</h3>
                    {ep.description && <p style={{ color: '#888', fontSize: 13, lineHeight: 1.7 }}>{ep.description}</p>}
                  </div>
                </div>
                {ep.audio_url && <AudioPlayer episode={ep} />}
                {profile.role === 'admin' && <button style={{ ...S.btnDanger, marginTop: 10, fontSize: 11, padding: '4px 10px' }} onClick={() => supabase.from('media_audio').delete().eq('id', ep.id).then(loadMedia)}>Delete</button>}
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === 'live' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ ...S.h2, margin: 0 }}>Live Stream</h2>
            {profile.role === 'admin' && (
              <div style={{ display: 'flex', gap: 8 }}>
                {liveStream ? (
                  <button style={{ ...S.btn, background: '#ff4444' }} onClick={async () => { await supabase.from('media_livestreams').update({ status: 'offline' }).eq('id', liveStream.id); loadMedia(); }}>End Stream</button>
                ) : (
                  <>
                    <button style={S.btn} onClick={() => setShowAddLive(!showAddLive)}>+ Create Stream</button>
                    {livestreams.length > 0 && <button style={{ ...S.btn, background: '#51cf66' }} onClick={async () => { await supabase.from('media_livestreams').update({ status: 'live' }).eq('id', livestreams[0].id); loadMedia(); }}>🔴 Go Live</button>}
                  </>
                )}
              </div>
            )}
          </div>
          {showAddLive && (
            <div style={{ ...S.card, marginBottom: 20, overflow: "hidden" }}>
              <div style={{ display: 'grid', gap: 12, marginBottom: 12 }}>
                <div><label style={S.label}>Stream Title</label><input style={S.input} value={liveForm.title} onChange={e => setLiveForm({...liveForm, title: e.target.value})} /></div>
                <div><label style={S.label}>Scheduled Date/Time</label><input style={S.input} type="datetime-local" value={liveForm.scheduled_at} onChange={e => setLiveForm({...liveForm, scheduled_at: e.target.value})} /></div>
                <div><label style={S.label}>Description</label><textarea style={{ ...S.input, minHeight: 60 }} value={liveForm.description} onChange={e => setLiveForm({...liveForm, description: e.target.value})} /></div>
              </div>
              <button style={S.btn} onClick={createLivestream} disabled={uploading || !liveForm.title}>{uploading ? 'Creating...' : 'Create Stream'}</button>
            </div>
          )}
          {liveStream ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#51cf66', animation: 'pulse 1.5s infinite', display: 'inline-block' }} />
                <span style={{ color: '#51cf66', fontFamily: "'Inter', sans-serif", fontSize: 16 }}>Live Now — {liveStream.title}</span>
              </div>
              <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 10, overflow: 'hidden', background: '#000' }}>
                <iframe src={`https://iframe.cloudflarestream.com/live_input/${liveStream.playback_id}?autoplay=true&primaryColor=FF6600`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} allow="autoplay; encrypted-media" allowFullScreen />
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔴</div>
              <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, color: '#fff', marginBottom: 8 }}>No live stream right now.</h3>
              {livestreams[0]?.scheduled_at && <p style={{ color: '#FF6600', fontSize: 14, marginBottom: 8 }}>Next: {new Date(livestreams[0].scheduled_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
              <p style={S.muted}>Check the feed for announcements.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
