import { admin, loadMembers, loadSingleHousehold, pickOptionsForSingleDay } from "@/lib/meal/server";
import { dayEndMs } from "@/lib/meal/time";
import { done, fail, readBody, str } from "@/lib/meal/api";

export async function POST(req: Request) {
  const b = await readBody(req);
  const memberId = str(b.memberId);
  const planDayId = str(b.planDayId);
  if (!memberId || !planDayId) return fail(400, "Missing fields.");

  const db = admin();
  const household = await loadSingleHousehold(db);
  if (!household) return fail(404, "No household found.");
  if (!(await loadMembers(db, household.id)).some((m) => m.id === memberId)) return fail(403, "Only household members can do this.");

  const { data: pd } = await db.from("plan_days").select("id,day,status,shown_dish_ids").eq("id", planDayId).maybeSingle();
  const plan = pd as { id: string; day: string; status: string; shown_dish_ids: string[] | null } | null;
  if (!plan) return fail(404, "That day doesn't exist.");
  if (plan.status === "eating_out") return fail(409, "This day is marked as eating out.");
  if (Date.now() >= dayEndMs(plan.day)) return fail(409, "Too late to change this for that day.");

  const seen = plan.shown_dish_ids ?? [];
  const two = await pickOptionsForSingleDay(db, household, plan.day, memberId, seen);
  if (!two) return fail(409, "No other dishes match the current rules.");

  const { error } = await db.from("plan_days").update({
    option_a: two[0].id, option_b: two[1].id, status: "open", locked_dish: null, locked_by: null,
    shown_dish_ids: [...seen, two[0].id, two[1].id],
  }).eq("id", planDayId);
  if (error) return fail(500, "Couldn't refresh the options. Try again.");
  return done();
}
