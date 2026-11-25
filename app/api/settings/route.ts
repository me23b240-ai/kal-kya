import { admin, loadHousehold, loadMembers } from "@/lib/meal/server";
import { done, fail, readBody, str } from "@/lib/meal/api";

function num(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export async function POST(req: Request) {
  const b = await readBody(req);
  const memberId = str(b.memberId);
  if (!memberId) return fail(400, "Missing member.");

  const db = admin();
  const household = await loadHousehold(db);
  if (!household) return fail(404, "No household found.");
  const me = (await loadMembers(db, household.id)).find((m) => m.id === memberId);
  if (!me) return fail(403, "Only household members can do this.");
  if (!me.is_cook) return fail(403, "Only the cook can change household settings.");

  const planningWindowDays = num(b.planningWindowDays, 1, 7);
  const noRepeatDays = num(b.noRepeatDays, 0, 14);
  const nudgeEveryDays = num(b.nudgeEveryDays, 2, 7);
  const lockTime = str(b.lockTime);
  const useAiPicker = typeof b.useAiPicker === "boolean" ? b.useAiPicker : null;
  const patch: Record<string, unknown> = {};
  if (planningWindowDays !== null) patch.planning_window_days = planningWindowDays;
  if (noRepeatDays !== null) patch.no_repeat_days = noRepeatDays;
  if (nudgeEveryDays !== null) patch.nudge_every_days = nudgeEveryDays;
  if (lockTime && /^\d{2}:\d{2}$/.test(lockTime)) patch.lock_time = lockTime + ":00";
  if (useAiPicker !== null) patch.use_ai_picker = useAiPicker;
  if (Object.keys(patch).length === 0) return fail(400, "Nothing to update.");

  const { error } = await db.from("households").update(patch).eq("id", household.id);
  if (error) return fail(500, "Couldn't save settings. Try again.");
  return done();
}
