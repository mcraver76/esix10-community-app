// Quick Exit (Michael 2026-11-26): inside sensitive/private groups, one tap (or pressing Escape
// twice, like TheHotline.org) leaves instantly for a harmless page. No confirmation.
// - location.replace() swaps out this page, so the phone's "back" doesn't return to the group.
// - Clears what this device remembers about recent chats, so reopening the app lands on the feed.
// It does NOT sign the person out (they'd need their password to get back in); see the
// options paper for "also sign out" as a setting.
import { useEffect } from "react";

export const QUICK_EXIT_URL = "https://www.google.com/search?q=weather+today";

export function quickExit(userId) {
  try {
    if (userId) {
      localStorage.removeItem(`esix10_room_${userId}`);
      localStorage.removeItem(`esix10_open_room_${userId}`);
      const key = `esix10_lastread_${userId}`;
      const lr = JSON.parse(localStorage.getItem(key) || "{}");
      Object.keys(lr).forEach(k => { if (/^(private_|dm_|group_custom_)/.test(k)) delete lr[k]; });
      localStorage.setItem(key, JSON.stringify(lr));
    }
    sessionStorage.clear();
  } catch (_) { /* never block the exit */ }
  window.location.replace(QUICK_EXIT_URL);
}

// Escape pressed twice within a second = quick exit (only while `active`).
export function useQuickExitKey(active, userId) {
  useEffect(() => {
    if (!active) return;
    let last = 0;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      const now = Date.now();
      if (now - last < 1000) quickExit(userId);
      last = now;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, userId]);
}
