import { admin, loadHousehold, loadMembers, loadSingleHousehold, lockDueDays } from "@/lib/meal/server";
import { done, fail, readBody, str } from "@/lib/meal/api";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

// DEMO ONLY: trusts "memberId" from the client (no login yet), same as every other route here.
export async function POST(req: Request) {
  const b = await readBody(req);
  const memberId = str(b.memberId);
  const day = str(b.day);
  const mode = str(b.mode) === "single" ? "single" : "family";
  if (!memberId || !day || !DAY_RE.test(day)) return fail(400, "Missing member or day.");

  const db = admin();
  const household = mode === "single" ? await loadSingleHousehold(db) : await loadHousehold(db);
  if (!household) return fail(404, "No household found.");
  const me = (await loadMembers(db, household.id)).find((m) => m.id === memberId);
  if (!me) return fail(403, "Only household members can do this.");
  if (!me.is_cook) return fail(403, "Only the cook can mark a day as eating out.");

  if (mode === "family") await lockDueDays(db, household); // single mode has no vote deadline to resolve

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
