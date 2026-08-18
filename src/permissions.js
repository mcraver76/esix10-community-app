// Who is allowed to do what.
// Gate on these, not on a role string spelled out at the call site.
import { supabase } from "./supabaseClient";

// New members are let into the app immediately but limited until an admin
// approves their profile. "Approved" = status 'approved' (admins always count).
export const isApproved = (p) => p?.role === "admin" || p?.status === "approved";

export function requireApproved(profile) {
  if (isApproved(profile)) return true;
  alert("Your profile is still under review. Posting, messaging, kudos, and joining unlock once an admin approves you — usually within 24–48 hours.");
  return false;
}

// "Staff" = admin or moderator. Both can use the Admin Dashboard / moderation
// actions; only admins can change roles or create official content.
export const isStaff = (p) => p?.role === "admin" || p?.role === "moderator";

// Staff-only secure email lookup (DB function returns emails only to staff/admin).
export async function fetchStaffEmails() {
  try {
    const { data } = await supabase.rpc("staff_emails");
    const map = {};
    (data || []).forEach(r => { map[r.id] = r.email; });
    return map;
  } catch { return {}; }
}
