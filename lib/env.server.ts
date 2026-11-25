import "server-only"; // build fails if a client component imports this

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const getSupabaseServiceKey = () => required("SUPABASE_SERVICE_ROLE_KEY");
export const getGeminiApiKey = () => required("GEMINI_API_KEY");