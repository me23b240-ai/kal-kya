import { admin, getDayContext, lockDay } from "@/lib/meal/server";
import { done, fail, readBody, str } from "@/lib/meal/api";

// DEMO ONLY: lets you lock a day before lock_time to test the rules.
export async function POST(req: Request) {
  const b = await readBody(req);
  const memberId = str(b.memberId), planDayId = str(b.planDayId);
  if (!memberId || !planDayId) return fail(400, "Missing member or day.");

  const db = admin();
  const ctx = await getDayContext(db, planDayId);
  if (!ctx) return fail(404, "That day doesn't exist.");
  if (!ctx.members.some((m) => m.id === memberId)) return fail(403, "Only household members can do this.");
  if (ctx.plan.status !== "open") return fail(409, "This day is already decided.");
  await lockDay(db, planDayId);
  return done();
}
