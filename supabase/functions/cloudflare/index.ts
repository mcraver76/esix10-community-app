// Cloudflare Stream: create video uploads and live inputs.
// Security P0-3 (Lúthien 2026-11-26): callers must be SIGNED-IN, APPROVED staff (admin/moderator),
// checked here on the server, and each person is capped per day. The anon key alone gets 401.
// Before any real redeploy: Michael rotates CLOUDFLARE_API_TOKEN to a new Stream-only token (Tauriel).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.1";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const DAILY_CAP = 20; // uploads + live inputs per person per day

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  // ---- who is asking? --------------------------------------------------------
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY) return reply({ error: "Server not configured." }, 500);
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return reply({ error: "Sign in required." }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: who, error: whoErr } = await admin.auth.getUser(token);
  if (whoErr || !who?.user?.id) return reply({ error: "Sign in required." }, 401);
  const uid = who.user.id;

  const { data: prof } = await admin.from("profiles").select("role,status").eq("id", uid).maybeSingle();
  if (!prof || prof.status !== "approved" || !["admin", "moderator"].includes(prof.role)) {
    return reply({ error: "Only approved staff can create videos or live streams." }, 403);
  }

  // ---- daily cap (server-only table) -----------------------------------------
  const { data: used, error: capErr } = await admin.rpc("bump_function_usage", { p_user: uid, p_fn: "cloudflare", p_cap: DAILY_CAP });
  if (capErr) return reply({ error: "Usage check failed." }, 500);
  if (used === false) return reply({ error: `Daily limit reached (${DAILY_CAP}). Try again tomorrow.` }, 429);

  // ---- the actual work -------------------------------------------------------
  const ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  const API_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
  if (!ACCOUNT_ID || !API_TOKEN) return reply({ error: "Cloudflare credentials not configured." }, 500);

  let action = "", data: Record<string, unknown> = {};
  try { ({ action, data = {} } = await req.json()); } catch { return reply({ error: "Bad request." }, 400); }
  const title = String(data?.title ?? "").slice(0, 120);
  const base = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}`;
  const headers = { "Authorization": `Bearer ${API_TOKEN}`, "Content-Type": "application/json" };

  if (action === "create_upload") {
    const res = await fetch(`${base}/stream/direct_upload`, {
      method: "POST", headers,
      body: JSON.stringify({ maxDurationSeconds: 7200, requireSignedURLs: false, meta: { name: title || "Untitled", created_by: uid } }),
    });
    const json = await res.json();
    if (!res.ok || !json.result) return reply({ error: json.errors?.[0]?.message || "Upload URL creation failed." }, 502);
    return reply({ uploadURL: json.result.uploadURL, uid: json.result.uid });
  }

  if (action === "create_livestream") {
    const res = await fetch(`${base}/stream/live_inputs`, {
      method: "POST", headers,
      body: JSON.stringify({ meta: { name: title || "ESix10 Live", created_by: uid }, recording: { mode: "automatic", timeoutSeconds: 0 } }),
    });
    const json = await res.json();
    if (!res.ok || !json.result) return reply({ error: json.errors?.[0]?.message || "Live stream creation failed." }, 502);
    return reply({ uid: json.result.uid, streamKey: json.result.rtmps?.streamKey, rtmpsUrl: json.result.rtmps?.url });
  }

  return reply({ error: "Unknown action." }, 400);
});
