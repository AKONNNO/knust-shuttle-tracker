// Supabase client (browser-safe — only publishable keys live here).
import { createClient } from "@supabase/supabase-js";

// Vite exposes env vars prefixed with VITE_. Fallbacks keep the preview
// working with the connected KNUST project even without a local .env.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? "https://gzmwitfkfsxhnsqocgvs.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  "sb_publishable_zYBXnTve7SrTsd0S8D37HA_bhHJmzsw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
