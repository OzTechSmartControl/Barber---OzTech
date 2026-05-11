import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  "https://kqjzontxfwlwmvbddbnv.supabase.co";

const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);