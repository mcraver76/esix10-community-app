// XP, levels, badges and the profile_stats read path.
import { supabase } from "./supabaseClient";
import { LEVELS, BADGE_DEFS } from "./constants";
import { formatName } from "./helpers";

export function getLevel(xp = 0) {
  return LEVELS.find(l => xp >= l.min && xp <= l.max) || LEVELS[0];
}

export function getXP(profile) {
  // Fallback XP calculation for places that do not have cached profile_stats yet.
  const posts = profile?.post_count || 0;
  const walks = profile?.walk_count || 0;
  const challenges = profile?.challenge_count || 0;
  const wods = profile?.wod_count || 0;
  const days = Math.floor((new Date() - new Date(profile?.created_at || Date.now())) / 86400000);
  return (posts * 5) + (walks * 10) + (challenges * 8) + (wods * 12) + Math.min(days * 2, 100);
}

export async function fetchProfileStats(userId) {
  if (!userId) return normalizeProfileStats(null);
  const { data, error } = await supabase
    .from("profile_stats")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("profile_stats fetch error:", error);
    return normalizeProfileStats(null);
  }

  return normalizeProfileStats(data);
}

export function normalizeProfileStats(row) {
  const safe = row || {};
  return {
    userId: safe.user_id || null,
    postCount: safe.post_count || 0,
    kudosCount: safe.kudos_count || 0,
    prayerCount: safe.prayer_count || 0,
    walkCount: safe.walk_count || 0,
    challengeCount: safe.challenge_count || 0,
    wodCount: safe.wod_count || 0,
    walkStreak: safe.walk_streak || 0,
    challengeStreak: safe.challenge_streak || 0,
    wodStreak: safe.wod_streak || 0,
    totalMiles: Number(safe.total_miles || 0),
    xp: safe.xp || 0,
    updatedAt: safe.updated_at || null,
  };
}

export function getEarnedBadges(stats) {
  return BADGE_DEFS.filter(b => b.check(stats));
}

export function statsForBadges(stats) {
  return {
    postCount: stats?.postCount || 0,
    kudosCount: stats?.kudosCount || 0,
    prayerCount: stats?.prayerCount || 0,
    walkStreak: stats?.walkStreak || 0,
    challengeStreak: stats?.challengeStreak || 0,
    wodStreak: stats?.wodStreak || 0,
  };
}

// Display name — username if set, otherwise first + last initial
export const displayName = (profile) => {
  if (profile?.username) return `@${profile.username}`;
  return formatName(profile?.full_name);
};
