// Line-icon maps and the avatar components.
import React from "react";
import {
  Activity, Anchor, Award, BarChart3, Bird, BookOpen, CalendarDays, Cross, Crown,
  Dumbbell, Flame, Footprints, Gem, HandHeart, HeartHandshake, LayoutGrid, Lock,
  MapPin, Megaphone, Menu, MessageCircle, Mountain, Newspaper, PawPrint, Share2,
  Shield, ShoppingBag, Smartphone, Sparkles, Star, Sword, Swords, Tv, User, Users, Zap,
} from "lucide-react";
import { getLevel, getXP, fetchProfileStats } from "./stats";

// Map nav/group ids -> line icons (replaces emoji UI icons).
export const NAV_ICONS = {
  all: LayoutGrid, feed: Newspaper,
  brotherhood: Swords, sisterhood: Sparkles, family: Gem,
  forge: Flame, prayer: HeartHandshake, messages: MessageCircle, more: Menu,
  profile: User, stats: BarChart3, members: Users, devotion: BookOpen,
  social: Smartphone, share: Share2, events: CalendarDays, privategroups: Lock,
  local: MapPin, faith: Cross, salvation: HandHeart, media: Tv, admin: Shield,
  shop: ShoppingBag,
};

export function NavIcon({ id, size = 18, color }) {
  const I = NAV_ICONS[id];
  return I ? <I size={size} color={color} strokeWidth={1.75} style={{ flexShrink: 0 }} /> : null;
}

// Preset avatar id -> line icon.
export const AVATAR_ICONS = {
  shield: Shield, sword: Sword, cross: Cross, fire: Flame, lion: PawPrint,
  eagle: Bird, mountain: Mountain, anchor: Anchor, star: Star, fist: Dumbbell,
  pray: HandHeart, crown: Crown,
};

// Level rank -> line icon.
export const LEVEL_ICONS = { Recruit: Shield, Soldier: Swords, Warrior: Flame, Guardian: PawPrint, Iron: Crown };

export function LevelIcon({ level, size = 16, style }) {
  const I = LEVEL_ICONS[level?.name] || Shield;
  return <I size={size} color={level?.color} strokeWidth={1.75} style={{ flexShrink: 0, verticalAlign: "middle", marginRight: 4, ...style }} />;
}

// Consistency-badge id -> line icon.
export const BADGE_ICONS = {
  walk_7: Footprints, walk_30: Activity, walk_100: Bird,
  challenge_7: Zap, challenge_30: Shield, wod_7: Dumbbell, wod_30: Crown,
  first_post: MessageCircle, active_poster: Megaphone,
  kudos_5: Award, kudos_25: Star, prayer_warrior: HandHeart,
};

export const PRESET_AVATARS = [
  { id: "shield", emoji: "🛡️", label: "Shield" },
  { id: "sword", emoji: "⚔️", label: "Sword" },
  { id: "cross", emoji: "✝️", label: "Cross" },
  { id: "fire", emoji: "🔥", label: "Fire" },
  { id: "lion", emoji: "🦁", label: "Lion" },
  { id: "eagle", emoji: "🦅", label: "Eagle" },
  { id: "mountain", emoji: "⛰️", label: "Mountain" },
  { id: "anchor", emoji: "⚓", label: "Anchor" },
  { id: "star", emoji: "⭐", label: "Star" },
  { id: "fist", emoji: "✊", label: "Fist" },
  { id: "pray", emoji: "🙏", label: "Prayer" },
  { id: "crown", emoji: "👑", label: "Crown" },
];

// Avatar display component
export function Avatar({ profile, size = 38, onClick }) {
  const style = {
    width: size, height: size, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, cursor: onClick ? "pointer" : "default",
    overflow: "hidden", border: "1px solid rgba(255,102,0,0.2)"
  };

  if (profile?.avatar_url && profile.avatar_url.startsWith("http")) {
    return (
      <div style={style} onClick={onClick}>
        <img src={profile.avatar_url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }

  const preset = PRESET_AVATARS.find(a => a.id === profile?.avatar_url);
  if (preset) {
    return (
      <div style={{ ...style, background: "linear-gradient(135deg, rgba(255,102,0,0.2), rgba(192,154,47,0.15))" }} onClick={onClick}>
        {(() => { const I = AVATAR_ICONS[preset.id] || User; return <I size={Math.round(size * 0.5)} color="#FF7E33" strokeWidth={1.75} />; })()}
      </div>
    );
  }

  return (
    <div style={{ ...style, background: "linear-gradient(135deg, rgba(255,102,0,0.3), rgba(192,154,47,0.2))", color: "#FF7E33", fontFamily: "'Inter', sans-serif", fontSize: size * 0.4, fontWeight: 600 }} onClick={onClick}>
      {(profile?.username || profile?.full_name || "?")[0].toUpperCase()}
    </div>
  );
}

export function LevelBadgeForUser({ profile, fontSize = 10 }) {
  const [stats, setStats] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;
    fetchProfileStats(profile?.id).then(s => {
      if (mounted) setStats(s);
    });
    return () => { mounted = false; };
  }, [profile?.id]);

  const xp = stats?.xp ?? getXP(profile);
  const level = getLevel(xp);

  return (
    <span className="level-badge" style={{ background: `${level.color}20`, color: level.color, border: `1px solid ${level.color}40`, fontSize }}>
      <LevelIcon level={level} size={Number(fontSize) + 2} /> {level.name}
    </span>
  );
}
