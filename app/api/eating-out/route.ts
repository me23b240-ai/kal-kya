import { admin, loadHousehold, loadMembers, lockDueDays, tomorrowKey } from "@/lib/meal/server";
import { done, fail, readBody, str } from "@/lib/meal/api";

export async function POST(req: Request) {
  const memberId = str((await readBody(req)).memberId);
  if (!memberId) return fail(400, "Missing member.");

  const db = admin();
  const household = await loadHousehold(db);
  if (!household) return fail(404, "No household found.");
  const me = (await loadMembers(db, household.id)).find((m) => m.id === memberId);
  if (!me) return fail(403, "Only household members can do this.");
  if (!me.is_cook) return fail(403, "Only the cook can mark a day as eating out.");

  await lockDueDays(db, household);
  const day = tomorrowKey();
  const { data } = await db.from("plan_days").select("id,status").eq("household_id", household.id).eq("day", day).maybeSingle();
  const plan = data as { id: string; status: string } | null;

  if (!plan) {
    const { error } = await db.from("plan_days").insert({ household_id: household.id, day, status: "eating_out" });
    if (error && error.code !== "23505") return fail(500, "Couldn't save that. Try again.");
    return done();
  }
  if (plan.status !== "open") return fail(409, plan.status === "locked" ? "This day is already locked." : "This day is already marked as eating out.");
  const { error } = await db.from("plan_days").update({ status: "eating_out" }).eq("id", plan.id).eq("status", "open");
  if (error) return fail(500, "Couldn't save that. Try again.");
  return done();
}
