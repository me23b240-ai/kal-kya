import { admin, loadMembers, loadSingleHousehold } from "@/lib/meal/server";
import { dayEndMs } from "@/lib/meal/time";
import { done, fail, readBody, str } from "@/lib/meal/api";

export async function POST(req: Request) {
  const b = await readBody(req);
  const memberId = str(b.memberId);
  const planDayId = str(b.planDayId);
  const dishId = str(b.dishId);
  if (!memberId || !planDayId || !dishId) return fail(400, "Missing fields.");

  const db = admin();
  const household = await loadSingleHousehold(db);
  if (!household) return fail(404, "No household found.");
  if (!(await loadMembers(db, household.id)).some((m) => m.id === memberId)) return fail(403, "Only household members can do this.");

  const { data: pd } = await db.from("plan_days").select("id,day,status,option_a,option_b,locked_by").eq("id", planDayId).maybeSingle();
  const plan = pd as { id: string; day: string; status: string; option_a: string | null; option_b: string | null; locked_by: string | null } | null;
  if (!plan) return fail(404, "That day doesn't exist.");
  if (plan.status === "eating_out") return fail(409, "This day is marked as eating out.");
  if (plan.locked_by && plan.locked_by !== "chosen") return fail(409, "This day was already decided.");
  if (Date.now() >= dayEndMs(plan.day)) return fail(409, "Too late to change this for that day.");
  if (dishId !== plan.option_a && dishId !== plan.option_b) return fail(400, "That dish isn't one of today's two options.");

  const { error } = await db.from("plan_days").update({ status: "locked", locked_dish: dishId, locked_by: "chosen" }).eq("id", planDayId);
  if (error) return fail(500, "Couldn't save that. Try again.");
  return done();
}
