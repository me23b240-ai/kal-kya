import { admin, ensureWindow, loadHousehold, loadMembers } from "@/lib/meal/server";
import { done, fail, readBody, str } from "@/lib/meal/api";

export async function POST(req: Request) {
  const memberId = str((await readBody(req)).memberId);
  if (!memberId) return fail(400, "Missing member.");

  const db = admin();
  const household = await loadHousehold(db);
  if (!household) return fail(404, "No household found.");
  const members = await loadMembers(db, household.id);
  if (!members.some((m) => m.id === memberId)) return fail(403, "Only household members can do this.");

  await ensureWindow(db, household);
  return done();
}
