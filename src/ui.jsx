// Shared presentational components.
import React, { useState, useEffect, useRef } from "react";

export function TabCarousel({ slides }) {
  const [i, setI] = useState(0);
  const touch = useRef(null);
  useEffect(() => {
    if (!slides || slides.length <= 1) return;
    const t = setInterval(() => setI(p => (p + 1) % slides.length), 6500);
    return () => clearInterval(t);
  }, [slides]);
  if (!slides || !slides.length) return null;
  const idx = i % slides.length;
  const s = slides[idx];
  const go = (d) => setI(p => (p + d + slides.length) % slides.length);
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        onTouchStart={e => { touch.current = e.touches[0].clientX; }}
        onTouchEnd={e => { if (touch.current == null) return; const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); touch.current = null; }}
        style={{ position: "relative", borderRadius: 18, overflow: "hidden", background: "linear-gradient(135deg,#FF6600 0%,#b8430a 48%,#1a1206 100%)", minHeight: 148 }}>
        <img src="/esix10logo.png" alt="" style={{ position: "absolute", right: -24, bottom: -20, width: 150, opacity: 0.12, filter: "brightness(0) invert(1)", pointerEvents: "none" }} />
        <div key={idx} style={{ position: "relative", padding: "18px 20px", minHeight: 148, display: "flex", flexDirection: "column", justifyContent: "space-between", boxSizing: "border-box", animation: "fadeIn 0.45s ease" }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#ffe9d6" }}>{s.eyebrow}</span>
          <div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, lineHeight: 1.3, color: "#fff", fontWeight: 600, maxWidth: 340 }}>{s.title}</div>
            {s.sub && <div style={{ marginTop: 6, fontSize: 13, fontWeight: 500, color: "#ffd9b8" }}>{s.sub}</div>}
          </div>
        </div>
      </div>
      {slides.length > 1 && <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 10 }}>{slides.map((_, k) => <span key={k} onClick={() => setI(k)} style={{ width: k === idx ? 16 : 6, height: 6, borderRadius: 3, background: k === idx ? "#FF6600" : "rgba(255,255,255,0.25)", cursor: "pointer", transition: "width .2s" }} />)}</div>}
    </div>
  );
}
