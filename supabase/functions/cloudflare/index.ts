import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  const API_TOKEN  = Deno.env.get("CLOUDFLARE_API_TOKEN");

  if (!ACCOUNT_ID || !API_TOKEN) {
    return new Response(JSON.stringify({ error: "Cloudflare credentials not configured." }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const { action, data } = await req.json();
  const base = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}`;
  const headers = { "Authorization": `Bearer ${API_TOKEN}`, "Content-Type": "application/json" };

  if (action === "create_upload") {
    const res = await fetch(`${base}/stream/direct_upload`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        maxDurationSeconds: 7200,
        requireSignedURLs: false,
        meta: { name: data.title || "Untitled" },
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.result) {
      return new Response(JSON.stringify({ error: json.errors?.[0]?.message || "Upload URL creation failed." }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ uploadURL: json.result.uploadURL, uid: json.result.uid }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  if (action === "create_livestream") {
    const res = await fetch(`${base}/stream/live_inputs`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        meta: { name: data.title || "ESix10 Live" },
        recording: { mode: "automatic", timeoutSeconds: 0 },
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.result) {
      return new Response(JSON.stringify({ error: json.errors?.[0]?.message || "Live stream creation failed." }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({
      uid: json.result.uid,
      streamKey: json.result.rtmps?.streamKey,
      rtmpsUrl: json.result.rtmps?.url,
    }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Unknown action." }), {
    status: 400, headers: { ...CORS, "Content-Type": "application/json" },
  });
});
