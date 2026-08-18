// Outbound member email and in-app notifications.
import { supabase } from "./supabaseClient";

// Transactional email goes through /api/send-email, which since 18 Aug checks
// who is asking before it will send anything (see the note at the top of that
// file). Approval emails carry the staff member's sign-in token. The signup
// email carries the brand-new account's id instead, because at that moment
// nobody is signed in yet — email confirmation is on, so signUp() gives us a
// user but no session.
export async function sendMemberEmail({ to, name, type, userId }) {
  try {
    const headers = { "Content-Type": "application/json" };
    if (type === "approval") {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    }
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers,
      body: JSON.stringify({ to, name, type, userId }),
    });
    if (!res.ok) console.error(`${type} email failed`, res.status, await res.text());
  } catch (e) {
    console.error(`${type} email failed`, e);
  }
}

// Fire-and-forget: ask the backend to email members about new activity.
// Wrapped so it can never break the action that triggered it (and is a
// safe no-op until the "notify-members" edge function is deployed).
export async function notifyMembers(payload) {
  try { await supabase.functions.invoke("notify-members", { body: payload }); }
  catch (e) { console.log("notify-members error:", e); }
}
