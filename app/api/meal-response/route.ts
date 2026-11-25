import { admin, getDayContext } from "@/lib/meal/server";
import { dislikedByMemberIds, type DishRow, type RuleRow } from "@/lib/meal/options";
import { dayEndMs } from "@/lib/meal/time";
import { done, fail, readBody, str } from "@/lib/meal/api";

export async function POST(req: Request) {
  const b = await readBody(req);
  const memberId = str(b.memberId);
  const planDayId = str(b.planDayId);
  const response = str(b.response);
  if (!memberId || !planDayId || (response !== "eating" && response !== "out")) return fail(400, "Missing or invalid fields.");

  const db = admin();
  const ctx = await getDayContext(db, planDayId);
  if (!ctx) return fail(404, "That day doesn't exist.");
  if (!ctx.members.some((m) => m.id === memberId)) return fail(403, "Only household members can do this.");
  if (ctx.plan.status !== "locked" || !ctx.plan.locked_dish) return fail(409, "This day isn't decided yet.");
  if (Date.now() >= dayEndMs(ctx.plan.day)) return fail(409, "Too late to change this for that day.");

  const { data: dish } = await db.from("dishes").select("contains").eq("id", ctx.plan.locked_dish).maybeSingle();
  const { data: dislikeRows } = await db.from("rules").select("member_id,kind,value").eq("household_id", ctx.household.id).eq("kind", "dislike");
  const dislikedIds = dislikedByMemberIds(
    { id: ctx.plan.locked_dish, name: "", name_hi: null, contains: ((dish as { contains: string[] } | null)?.contains) ?? [] } as DishRow,
    (dislikeRows as RuleRow[]) ?? [],
  );
  if (!dislikedIds.includes(memberId)) return fail(403, "This prompt isn't for you.");

  const { error } = await db.from("meal_responses")
    .upsert({ plan_day_id: planDayId, member_id: memberId, response, responded_at: new Date().toISOString() }, { onConflict: "plan_day_id,member_id" });
  if (error) return fail(500, "Couldn't save that. Try again.");
  return done();
}
