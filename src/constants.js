// Shared constants for the ESix10 community app.
// Pure data only — no React, no Supabase, no styling. Extracted from App.jsx.

export const GROUPS = [
  { id: "brotherhood", label: "Brotherhood", subtitle: "Steadfast. Unmovable.", icon: "⚔", color: "#FF7E33" },
  { id: "sisterhood", label: "Sisterhood", subtitle: "Fierce. Faithful.", icon: "✦", color: "#FF7E33" },
  { id: "family", label: "Family", subtitle: "Rooted. Together. Unbreakable.", icon: "◈", color: "#FF7E33" },
];

export const ADMIN_EMAIL = "admin@esix10.com";

// Every profile column EXCEPT email — used everywhere we read profiles, so the
// email column is never pulled to the client (it's walled off at the DB too).
export const PROFILE_COLS = "id, full_name, group_id, role, city, bio, created_at, state, status, last_seen, username, avatar_url, group_ids, updated_at, requested_group_id, requested_group_at, marital_status, avatar_pending, terms_accepted_at, terms_version, mod_agreement_at, email_prefs";

export const REACTIONS = ["🔥", "💪", "🙏", "❤️", "✝️"];

export const VERSES = [
  { text: "Be strong in the Lord and in his mighty power.", ref: "Ephesians 6:10" },
  { text: "Iron sharpens iron, so one person sharpens another.", ref: "Proverbs 27:17" },
  { text: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" },
  { text: "For God has not given us a spirit of fear, but of power and of love and of a sound mind.", ref: "2 Timothy 1:7" },
  { text: "The Lord is my strength and my shield; my heart trusts in him.", ref: "Psalm 28:7" },
  { text: "Be watchful, stand firm in the faith, act like men, be strong.", ref: "1 Corinthians 16:13" },
  { text: "No weapon formed against you shall prosper.", ref: "Isaiah 54:17" },
];

export const CHARGES = [
  "You weren't saved to sit down.",
  "Discipline is just love for your future self.",
  "Comfort never built anything worth keeping.",
  "The enemy doesn't fear your potential. He fears your obedience.",
  "Kneel before God so you can stand before anything.",
  "Faith isn't the absence of fear. It's marching anyway.",
  "Your scars are proof you survived what was sent to bury you.",
];

// Preset ESix10 avatars
// Level system
export const LEVELS = [
  { name: "Recruit", min: 0, max: 49, icon: "🛡️", color: "#BBBBBB" },
  { name: "Soldier", min: 50, max: 149, icon: "⚔️", color: "#51cf66" },
  { name: "Warrior", min: 150, max: 349, icon: "🔥", color: "#FF7E33" },
  { name: "Guardian", min: 350, max: 699, icon: "🦁", color: "#fcc419" },
  { name: "Iron", min: 700, max: 99999, icon: "👑", color: "#C09A2F" },
];

// ─── Consistency Badges ────────────────────────────────────────────────────
export const BADGE_DEFS = [
  { id: "walk_7", icon: "🚶", label: "7-Day Walker", desc: "Walked 7 days in a row", check: s => s.walkStreak >= 7 },
  { id: "walk_30", icon: "🏃", label: "30-Day Walker", desc: "Walked 30 days in a row", check: s => s.walkStreak >= 30 },
  { id: "walk_100", icon: "🦅", label: "100-Day Walker", desc: "Walked 100 days in a row", check: s => s.walkStreak >= 100 },
  { id: "challenge_7", icon: "⚡", label: "Week of Discipline", desc: "7-day challenge streak", check: s => s.challengeStreak >= 7 },
  { id: "challenge_30", icon: "🛡️", label: "Iron Will", desc: "30-day challenge streak", check: s => s.challengeStreak >= 30 },
  { id: "wod_7", icon: "🏋️", label: "Week of WODs", desc: "7-day WOD streak", check: s => s.wodStreak >= 7 },
  { id: "wod_30", icon: "👑", label: "WOD Master", desc: "30-day WOD streak", check: s => s.wodStreak >= 30 },
  { id: "first_post", icon: "📋", label: "Welcome Voice", desc: "Made your first post", check: s => s.postCount >= 1 },
  { id: "active_poster", icon: "📢", label: "Active Voice", desc: "10+ posts shared", check: s => s.postCount >= 10 },
  { id: "kudos_5", icon: "👊", label: "Respected", desc: "Received 5+ kudos", check: s => s.kudosCount >= 5 },
  { id: "kudos_25", icon: "🌟", label: "Pillar of the Community", desc: "Received 25+ kudos", check: s => s.kudosCount >= 25 },
  { id: "prayer_warrior", icon: "🙏", label: "Prayer Warrior", desc: "Shared 5+ prayer requests", check: s => s.prayerCount >= 5 },
];
