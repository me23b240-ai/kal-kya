import { admin, loadHousehold, loadMembers, loadSingleHousehold } from "@/lib/meal/server";
import { done, fail, readBody, str } from "@/lib/meal/api";

export async function POST(req: Request) {
  const b = await readBody(req);
  const memberId = str(b.memberId);
  const goal = str(b.goal);
  const mode = str(b.household) === "single" ? "single" : "family";
  if (!memberId || !goal || !["none", "quick", "protein"].includes(goal)) return fail(400, "Missing or invalid fields.");

  const db = admin();
  const household = mode === "single" ? await loadSingleHousehold(db) : await loadHousehold(db);
  if (!household) return fail(404, "No household found.");
  if (!(await loadMembers(db, household.id)).some((m) => m.id === memberId)) return fail(403, "Only household members can do this.");

  const { error } = await db.from("households").update({ meal_goal: goal }).eq("id", household.id);
  if (error) return fail(500, "Couldn't save that. Try again.");
  return done();
}
