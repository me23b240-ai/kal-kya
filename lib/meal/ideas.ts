import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

type Admin = SupabaseClient;

export type SavedIdea = {
  id: string;
  name: string;
  link: string | null;
  effort: "low" | "medium" | "high" | null;
  time_minutes: number | null;
  category: string | null;
  added_by: string | null;
  created_at: string;
  cooked_at: string | null;
};

export async function loadSavedIdeas(db: Admin, householdId: string): Promise<SavedIdea[]> {
  const { data } = await db.from("saved_ideas")
    .select("id,name,link,effort,time_minutes,category,added_by,created_at,cooked_at")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false });
  return (data as SavedIdea[]) ?? [];
}
