import { admin, loadHousehold, loadMembers } from "@/lib/meal/server";
import { done, fail, readBody, str } from "@/lib/meal/api";

export async function POST(req: Request) {
  const b = await readBody(req);
  const memberId = str(b.memberId);
  const item = str(b.item)?.trim();
  const qty = str(b.qty)?.trim() || null;
  if (!memberId || !item) return fail(400, "Missing fields.");

  const db = admin();
  const household = await loadHousehold(db);
  if (!household) return fail(404, "No household found.");
  if (!(await loadMembers(db, household.id)).some((m) => m.id === memberId)) return fail(403, "Only household members can do this.");

  const { error } = await db.from("shopping_items").insert({ household_id: household.id, plan_day_id: null, item, qty, is_manual: true });
  if (error) return fail(500, "Couldn't add that. Try again.");
  return done();
}
