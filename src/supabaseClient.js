// The Supabase client, shared by every module.
// The anon key is public by design — it ships in the bundle. The service_role key
// must never appear here or anywhere else in src/.
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://bffcrhjdibxqfmdreksi.supabase.co";

export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmZmNyaGpkaWJ4cWZtZHJla3NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNjkwMzgsImV4cCI6MjA5NjY0NTAzOH0.yZ7IunHcwTlMKu0uDvKnBnBLBpdDCsPLVWTygmaveEo";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
