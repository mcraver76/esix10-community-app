// Private photos/videos for chats and group posts (security, 2026-11-26).
// Files go to the PRIVATE "private-media" bucket under a folder the database checks:
//   <room_id>/...           chat photos (DMs, private groups, group chats): room members only
//   posts/<group_id>/...    group post photos: that group's members only
//   broadcast/...           admin broadcasts to every group: any approved member
// The row stores "pm:<path>", never a public link. Showing it asks the server for a
// short-lived signed link, which the server only grants to people allowed to see it.
import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const BUCKET = "private-media";
const PREFIX = "pm:";
const TTL_SECONDS = 60 * 60;
const cache = new Map(); // path -> { url, expires }

export async function uploadPrivate(folder, file, userId) {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${folder}/${userId}_${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) return { error };
  return { ref: PREFIX + path };
}

export async function resolveMedia(ref) {
  if (!ref) return null;
  if (!ref.startsWith(PREFIX)) return ref; // older public links (before 11-26)
  const path = ref.slice(PREFIX.length);
  const hit = cache.get(path);
  if (hit && hit.expires > Date.now() + 60_000) return hit.url;
  // DMs, private groups and casual groups: 10-minute links, so a forwarded link dies fast (Tauriel 11-26).
  const ttl = /^(dm_|private_|group_custom_)/.test(path) ? 10 * 60 : TTL_SECONDS;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, ttl);
  if (error || !data?.signedUrl) return null;
  cache.set(path, { url: data.signedUrl, expires: Date.now() + ttl * 1000 });
  return data.signedUrl;
}

export function isVideoRef(ref) {
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(ref || "");
}

// <PrivateMedia src={row.photo_url} style={...} onOpen={url => setLightbox(url)} />
export function PrivateMedia({ src, style, videoStyle, alt = "shared photo", onOpen }) {
  const [url, setUrl] = useState(src && !src.startsWith(PREFIX) ? src : null);
  useEffect(() => {
    let live = true;
    resolveMedia(src).then(u => { if (live) setUrl(u); });
    return () => { live = false; };
  }, [src]);
  if (!url) return null;
  if (isVideoRef(src)) return React.createElement("video", { src: url, controls: true, style: videoStyle || style });
  return React.createElement("img", { src: url, alt, onClick: onOpen ? () => onOpen(url) : undefined, style });
}
