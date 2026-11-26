// The Supabase client, shared by every module.
// The anon key is public by design — it ships in the bundle. The service_role key
// must never appear here or anywhere else in src/.
import { createClient } from "@supabase/supabase-js";

const LIVE_URL = "https://bffcrhjdibxqfmdreksi.supabase.co";
const LIVE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmZmNyaGpkaWJ4cWZtZHJla3NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNjkwMzgsImV4cCI6MjA5NjY0NTAzOH0.yZ7IunHcwTlMKu0uDvKnBnBLBpdDCsPLVWTygmaveEo";

// Michael 2026-11-26: all design/feature work runs on a LOCAL test server with fake data.
// Local runs (npm run dev) NEVER talk to the live database: the start script
// (~/claude/esix10/scripts/start-local.sh) passes the local URL + key. If they are
// missing in dev, we stop loudly instead of falling back to live.
const env = import.meta.env || {};
if (env.DEV && !env.VITE_SUPABASE_URL) {
  throw new Error("Local dev needs the local test database. Start it with: zsh ~/claude/esix10/scripts/start-local.sh");
}
export const SUPABASE_URL = env.VITE_SUPABASE_URL || LIVE_URL;
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || LIVE_ANON_KEY;
export const IS_LOCAL_TEST = !!env.VITE_SUPABASE_URL;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
