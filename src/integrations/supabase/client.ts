import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Gracefully handle missing config (Cloud still initializing)
export const supabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient = supabaseConfigured
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)
  : (new Proxy({} as SupabaseClient, {
      get: () => () => {
        console.warn("Supabase not configured yet. Cloud is still initializing.");
        return Promise.resolve({ data: null, error: new Error("Supabase not configured") });
      },
    }) as unknown as SupabaseClient);
