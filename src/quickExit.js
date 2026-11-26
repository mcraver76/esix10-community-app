// Quick Exit (Michael 2026-11-26): inside sensitive/private groups, one tap (or pressing Escape
// twice, like TheHotline.org) leaves instantly for a harmless page. No confirmation.
// - location.replace() swaps out this page, so the phone's "back" doesn't return to the group.
// - Clears what this device remembers about recent chats.
// - SIGNS THE PERSON OUT (Michael 11-26 9:57: "Both sign out and then lock option"): the sign-in
//   saved on this device is wiped at once, so someone who picks up the phone can't reopen the app
//   into the group. The server ends this session too (best effort, at most ~0.4 s, never blocks).
//   Later, after passkeys (P0-6): an optional PIN/passkey lock on private rooms instead.
import { useEffect } from "react";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabaseClient";

export const QUICK_EXIT_URL = "https://www.google.com/search?q=weather+today";

let exiting = false;
export async function quickExit(userId) {
  if (exiting) return;
  exiting = true;
  let session = null;
  try {
    // grab the session before wiping it, so the server can end it
    session = (await Promise.race([supabase.auth.getSession(), new Promise(r => setTimeout(() => r(null), 100))]))?.data?.session || null;
  } catch (_) { /* never block the exit */ }
  try {
    if (userId) {
      localStorage.removeItem(`esix10_room_${userId}`);
      localStorage.removeItem(`esix10_open_room_${userId}`);
      const key = `esix10_lastread_${userId}`;
      const lr = JSON.parse(localStorage.getItem(key) || "{}");
      Object.keys(lr).forEach(k => { if (/^(private_|dm_|group_custom_)/.test(k)) delete lr[k]; });
      localStorage.setItem(key, JSON.stringify(lr));
    }
    // sign-out on this device, right now: remove the saved sign-in (Supabase keeps it under sb-*)
    Object.keys(localStorage).filter(k => k.startsWith("sb-")).forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();
  } catch (_) { /* never block the exit */ }
  try {
    // end this session on the server too (its refresh token stops working); don't wait long
    if (session?.access_token) {
      const done = fetch(`${SUPABASE_URL}/auth/v1/logout?scope=local`, { method: "POST", keepalive: true,
        headers: { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_ANON_KEY } }).catch(() => {});
      await Promise.race([done, new Promise(r => setTimeout(r, 300))]);
    }
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
