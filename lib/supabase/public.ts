import { createClient } from "@supabase/supabase-js";

// Uses ONLY the public URL + anon key, so it is safe anywhere.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);