import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceKey } from "@/lib/env.server";

// Server-only client with full access. Never import from a client component.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabaseServiceKey(),
    { auth: { persistSession: false } }
  );
}