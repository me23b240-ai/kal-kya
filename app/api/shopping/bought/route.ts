import { admin, loadHousehold, loadMembers } from "@/lib/meal/server";
import { done, fail, readBody, str } from "@/lib/meal/api";

export async function POST(req: Request) {
  const b = await readBody(req);
  const memberId = str(b.memberId);
  const item = str(b.item);
  const bought = b.bought === true;
  if (!memberId || !item) return fail(400, "Missing fields.");

  const db = admin();
  const household = await loadHousehold(db);
  if (!household) return fail(404, "No household found.");
  if (!(await loadMembers(db, household.id)).some((m) => m.id === memberId)) return fail(403, "Only household members can do this.");

  const patch = bought
    ? { bought: true, bought_at: new Date().toISOString(), bought_by: memberId }
    : { bought: false, bought_at: null, bought_by: null };
  const { error } = await db.from("shopping_items").update(patch).eq("household_id", household.id).ilike("item", item.trim());
  if (error) return fail(500, "Couldn't save that. Try again.");
  return done();
}
