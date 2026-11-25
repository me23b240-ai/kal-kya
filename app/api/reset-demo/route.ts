import { admin, loadHousehold, loadMembers } from "@/lib/meal/server";
import { done, fail } from "@/lib/meal/api";

// Very simple per-process rate limit (resets on cold start) — fine for a single-instance demo.
const hits = new Map<string, number[]>();
function rateLimited(key: string, max = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > max;
}

// DEMO ONLY: only works when DEMO_MODE=true. Resets just the demo family household, never dishes/members.
export async function POST() {
  if (process.env.DEMO_MODE !== "true") return fail(404, "Demo reset isn't enabled.");

  const db = admin();
  const household = await loadHousehold(db);
  if (!household) return fail(404, "No household found.");
  if (rateLimited(household.id)) return fail(429, "Too many resets. Wait a minute and try again.");

  const members = await loadMembers(db, household.id);
  const firstMember = [...members].sort((a, b) => (a.turn_order ?? 0) - (b.turn_order ?? 0))[0];

  const { data: days } = await db.from("plan_days").select("id").eq("household_id", household.id);
  const dayIds = ((days as { id: string }[]) ?? []).map((d) => d.id);

  if (dayIds.length) {
    await db.from("votes").delete().in("plan_day_id", dayIds);
    await db.from("tie_picks").delete().in("plan_day_id", dayIds);
    await db.from("turn_skips").delete().in("plan_day_id", dayIds);
    await db.from("shopping_items").delete().in("plan_day_id", dayIds);
  }
  await db.from("plan_days").delete().eq("household_id", household.id);
  await db.from("rules").delete().eq("household_id", household.id);
  if (firstMember) await db.from("households").update({ turn_member_id: firstMember.id }).eq("id", household.id);

  return done();
}
