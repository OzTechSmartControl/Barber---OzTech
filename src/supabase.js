import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  "https://kqjzontxfwlwmvbddbnv.supabase.co";

const SUPABASE_ANON =
  "sb_publishable_cTk8su9HL7LcXoPQE-bqVQ_5Idjyf1a";

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
