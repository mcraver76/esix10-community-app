// Forge content generator: 7 daily challenges or 7 workouts, written by Claude.
// SEC-117 (Lúthien 2026-11-26): rebuilt in the repo. The old live-only version took its
// instructions from the browser with the public key, so anyone could use the AI key for anything.
// Now: the instructions live HERE (the app only picks "challenges" or "wods"), callers must be
// signed-in APPROVED staff, and each person is capped per day.
// Before any real redeploy: Michael rotates ANTHROPIC_API_KEY (Tauriel SEC-117).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.1";
import Anthropic from "npm:@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const DAILY_CAP = 10;

const PROMPTS: Record<string, string> = {
  challenges:
    'Generate 7 daily challenges for ESix10 — a faith-based community of everyday people built on Ephesians 6:10. Mix categories: Scripture (priority), Physical, Mental, Preparedness, Leadership. RULES: each challenge must be a CLEAR, SPECIFIC, one-day action anyone can do and understand immediately — plain everyday language, no vague spiritual jargon or insider church terms. Title = short and motivating. Description = exactly what to do today, in one or two simple, concrete sentences. Faith-forward but accessible to newcomers. Return ONLY a JSON array, no markdown: [{"title":"","description":"","category":"Scripture|Physical|Mental|Preparedness|Leadership"}]',
  wods:
    'Generate 7 bodyweight workouts for a faith-based fitness community of EVERYDAY people of all ages and fitness levels (NOT athletes or CrossFitters). CRITICAL RULE: use ONLY plain, common movement names that anyone instantly understands — push-ups, squats, lunges, planks, jumping jacks, sit-ups, wall sits, mountain climbers, glute bridges, calf raises, high knees, marching in place, arm circles, etc. Do NOT use gym jargon or acronyms (no AMRAP, EMOM, RFT, "thrusters", "burpees over bar", etc.) and do NOT use cryptic codename titles or movements. If you ever include a less-common move, explain it in one short plain sentence right where it appears so nobody has to look it up. Titles must be clear and motivating (e.g. "Foundation Strength", "Steady and Strong"), never codenames, and must NOT include any day of the week or time of day (no "Monday", "Morning", etc.). Vary the difficulty across the week. Keep each field concise and beginner-friendly; coaching_notes may add a brief faith encouragement. Return ONLY a JSON array, no markdown: [{"title":"","warmup":"","main_work":"","cooldown":"","coaching_notes":"","estimated_minutes":30,"difficulty":3}]. difficulty 1-5 (1=very easy, 5=hard).',
};

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
    return reply({ error: "Only approved staff can generate Forge content." }, 403);
  }

  // ---- which fixed prompt? (the browser can't send its own) ------------------
  let kind = "";
  try { ({ kind = "" } = await req.json()); } catch { return reply({ error: "Bad request." }, 400); }
  const prompt = PROMPTS[kind];
  if (!prompt) return reply({ error: "Unknown kind (use 'challenges' or 'wods')." }, 400);

  // ---- daily cap -------------------------------------------------------------
  const { data: under, error: capErr } = await admin.rpc("bump_function_usage", { p_user: uid, p_fn: "generate", p_cap: DAILY_CAP });
  if (capErr) return reply({ error: "Usage check failed." }, 500);
  if (under === false) return reply({ error: `Daily limit reached (${DAILY_CAP}). Try again tomorrow.` }, 429);

  // ---- ask Claude ------------------------------------------------------------
  if (!Deno.env.get("ANTHROPIC_API_KEY")) return reply({ error: "AI not configured." }, 500);
  try {
    const client = new Anthropic();
    const msg = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [{ role: "user", content: prompt }],
    });
    if (msg.stop_reason === "refusal") return reply({ error: "The AI declined this request. Try again." }, 502);
    const text = msg.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    if (!text) return reply({ error: "No content returned." }, 502);
    return reply({ content: text });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return reply({ error: "AI is busy. Try again in a minute." }, 429);
    if (e instanceof Anthropic.APIError) return reply({ error: `AI error ${e.status}.` }, 502);
    return reply({ error: "AI request failed." }, 502);
  }
});
