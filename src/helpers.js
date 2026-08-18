// Small pure helpers shared across features. No React, no Supabase.

// Format name as First name + Last initial
export const formatName = (fullName) => {
  if (!fullName) return "Member";
  const parts = fullName.trim().split(" ");
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
};

// Get YYYY-MM-DD in local timezone
export const localDateStr = (d = new Date()) => {
  const date = new Date(d);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().split("T")[0];
};

// Strip a leading weekday (and optional time-of-day) from a WOD title — we don't show the day on the card
export const cleanWodTitle = (t) => (t || "").replace(/^\s*(mon|tues|wednes|thurs|fri|satur|sun)day\s+(morning|afternoon|evening|night\s+)?/i, "").trim() || t;
