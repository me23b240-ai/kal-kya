import { admin, getDayContext } from "@/lib/meal/server";
import { checkVote } from "@/lib/meal/lock";
import { lockAtMs } from "@/lib/meal/time";
import { done, fail, readBody, str } from "@/lib/meal/api";

export async function POST(req: Request) {
  const b = await readBody(req);
  const memberId = str(b.memberId), planDayId = str(b.planDayId), dishId = str(b.dishId);
  if (!memberId || !planDayId || !dishId) return fail(400, "Missing member, day or dish.");

  const db = admin();
  const ctx = await getDayContext(db, planDayId); // locks the day first if its time has passed
  if (!ctx) return fail(404, "That day doesn't exist.");

  const check = checkVote({
    status: ctx.plan.status, nowMs: Date.now(), lockAtMs: lockAtMs(ctx.plan.day, ctx.household.lock_time),
    memberIds: ctx.members.map((m) => m.id), memberId, dishId, optionA: ctx.plan.option_a, optionB: ctx.plan.option_b,
  });
  if (!check.ok) return fail(check.code === "not_member" ? 403 : 409, check.message);

  // Primary key (plan_day_id, member_id) means this is one vote per member per day; changing replaces it.
  const { error } = await db.from("votes").upsert({ plan_day_id: planDayId, member_id: memberId, dish_id: dishId }, { onConflict: "plan_day_id,member_id" });
  if (error) return fail(500, "Couldn't save your vote. Try again.");
  return done();
}
