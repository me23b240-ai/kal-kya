import { admin, getDayContext, pickOptionsForDayLogged } from "@/lib/meal/server";
import { done, fail, readBody, str } from "@/lib/meal/api";

export async function POST(req: Request) {
  const b = await readBody(req);
  const memberId = str(b.memberId);
  const planDayId = str(b.planDayId);
  if (!memberId || !planDayId) return fail(400, "Missing member or day.");

  const db = admin();
  const ctx = await getDayContext(db, planDayId);
  if (!ctx) return fail(404, "That day doesn't exist.");
  if (!ctx.members.some((m) => m.id === memberId)) return fail(403, "Only household members can do this.");
  if (ctx.plan.status !== "open") return fail(409, "This day is already decided.");

  const { count } = await db.from("votes").select("member_id", { count: "exact", head: true }).eq("plan_day_id", planDayId);
  if ((count ?? 0) > 0) return fail(409, "Someone has already voted, so the options can't change now.");

  const picked = await pickOptionsForDayLogged(db, ctx.household, ctx.plan.day);
  if (!picked) return fail(409, "Not enough dishes match the current rules to offer two options.");

  const { error } = await db.from("plan_days").update({
    option_a: picked.a.id, option_b: picked.b.id,
    option_a_reason: picked.reasonA, option_b_reason: picked.reasonB,
  }).eq("id", planDayId).eq("status", "open");
  if (error) return fail(500, "Couldn't refresh the options. Try again.");
  return done();
}
