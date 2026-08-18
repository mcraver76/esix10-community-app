// Web Push (VAPID) subscription helpers.
import { supabase } from "./supabaseClient";

// ── Web Push ────────────────────────────────────────────────────────────────
// Public VAPID key (safe to ship). The matching private key lives only in the
// Supabase send function as a secret.
export const VAPID_PUBLIC_KEY = "BD4U8hOdNy1T-MTOC_6BUK7-4dMOow5R62aS1FRlotr5rGZgVY9yxNG7_qx-YOVS12OfeKLWARdwYpbt4phZ71Q";

export function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

// Ask permission, subscribe this device, save the subscription to Supabase.
// Returns a short status string for the UI. Safe no-op until the table/function exist.
export async function enablePush(profile) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  if (isIOS() && !isStandalone()) return "ios-needs-install";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "denied";
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    const json = sub.toJSON();
    try {
      await supabase.from("push_subscriptions").upsert(
        { user_id: profile.id, endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth },
        { onConflict: "endpoint" }
      );
    } catch (e) { console.log("save push sub error:", e); }
    return "enabled";
  } catch (e) {
    console.log("push subscribe error:", e);
    return "error";
  }
}
