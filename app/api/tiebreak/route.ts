import { admin, getDayContext } from "@/lib/meal/server";
import { currentTapper, tallyVotes } from "@/lib/meal/lock";
import { done, fail, readBody, str } from "@/lib/meal/api";

export async function POST(req: Request) {
  const b = await readBody(req);
  const memberId = str(b.memberId), planDayId = str(b.planDayId), choice = str(b.choice); // choice = dish id or "pass"
  if (!memberId || !planDayId || !choice) return fail(400, "Missing member, day or choice.");

  const db = admin();
  const ctx = await getDayContext(db, planDayId);
  if (!ctx) return fail(404, "That day doesn't exist.");
  const { plan, household, members } = ctx;
  if (!members.some((m) => m.id === memberId)) return fail(403, "Only household members can do this.");
  if (plan.status !== "open") return fail(409, "This day is already decided.");

  const order = members.map((m) => m.id);
  const [{ data: votes }, { data: skips }] = await Promise.all([
    db.from("votes").select("member_id,dish_id").eq("plan_day_id", planDayId),
    db.from("turn_skips").select("member_id,reason").eq("plan_day_id", planDayId),
  ]);
  const t = tallyVotes(plan.option_a!, plan.option_b!, ((votes as { member_id: string; dish_id: string }[]) ?? []).map((v) => ({ memberId: v.member_id, dishId: v.dish_id })), order);
  if (!(t.a > 0 && t.a === t.b)) return fail(409, "There's no tie right now.");

  const passed = ((skips as { member_id: string; reason: string }[]) ?? []).filter((s) => s.reason === "pass").map((s) => s.member_id);
  if (currentTapper(order, household.turn_member_id, passed) !== memberId) return fail(403, "It's not your turn to break the tie.");

  if (choice === "pass") {
    await db.from("tie_picks").delete().eq("plan_day_id", planDayId).eq("member_id", memberId);
    const { error } = await db.from("turn_skips").upsert({ plan_day_id: planDayId, member_id: memberId, reason: "pass" }, { onConflict: "plan_day_id,member_id" });
    if (error) return fail(500, "Couldn't save that. Try again.");
    return done();
  }
  if (choice !== plan.option_a && choice !== plan.option_b) return fail(409, "That dish isn't one of today's two options.");
  const { error } = await db.from("tie_picks").upsert({ plan_day_id: planDayId, member_id: memberId, dish_id: choice }, { onConflict: "plan_day_id,member_id" });
  if (error) return fail(500, "Couldn't save that. Try again.");
  return done();
}
