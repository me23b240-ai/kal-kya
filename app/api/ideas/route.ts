import { admin, loadHousehold, loadMembers, loadSingleHousehold } from "@/lib/meal/server";
import { done, fail, readBody, str } from "@/lib/meal/api";

type Admin = ReturnType<typeof admin>;

async function resolveHousehold(db: Admin, mode: "family" | "single") {
  return mode === "single" ? loadSingleHousehold(db) : loadHousehold(db);
}

export async function POST(req: Request) {
  const b = await readBody(req);
  const memberId = str(b.memberId);
  const name = str(b.name)?.trim();
  const link = str(b.link)?.trim() || null;
  const effort = str(b.effort);
  const timeMinutesRaw = b.timeMinutes;
  const timeMinutes = typeof timeMinutesRaw === "number" ? timeMinutesRaw : (timeMinutesRaw ? Number(timeMinutesRaw) : null);
  const category = str(b.category)?.trim() || null;
  const mode = str(b.household) === "single" ? "single" : "family";
  if (!memberId || !name) return fail(400, "Missing fields.");
  if (effort && !["low", "medium", "high"].includes(effort)) return fail(400, "Invalid effort.");

  const db = admin();
  const household = await resolveHousehold(db, mode);
  if (!household) return fail(404, "No household found.");
  if (!(await loadMembers(db, household.id)).some((m) => m.id === memberId)) return fail(403, "Only household members can do this.");

  const normalisedLink = link ? (/^https?:\/\//i.test(link) ? link : `https://${link}`) : null;

  const { error } = await db.from("saved_ideas").insert({
    household_id: household.id, added_by: memberId, name,
    link: normalisedLink,
    effort: effort || null,
    time_minutes: Number.isFinite(timeMinutes) ? timeMinutes : null,
    category,
  });
  if (error) return fail(500, "Couldn't save that. Try again.");
  return done();
}

export async function DELETE(req: Request) {
  const b = await readBody(req);
  const memberId = str(b.memberId);
  const ideaId = str(b.ideaId);
  const mode = str(b.household) === "single" ? "single" : "family";
  if (!memberId || !ideaId) return fail(400, "Missing fields.");

  const db = admin();
  const household = await resolveHousehold(db, mode);
  if (!household) return fail(404, "No household found.");
  if (!(await loadMembers(db, household.id)).some((m) => m.id === memberId)) return fail(403, "Only household members can do this.");

  const { error } = await db.from("saved_ideas").delete().eq("id", ideaId).eq("household_id", household.id);
  if (error) return fail(500, "Couldn't remove that. Try again.");
  return done();
}

export async function PATCH(req: Request) {
  const b = await readBody(req);
  const memberId = str(b.memberId);
  const ideaId = str(b.ideaId);
  const cooked = b.cooked === true;
  const mode = str(b.household) === "single" ? "single" : "family";
  if (!memberId || !ideaId) return fail(400, "Missing fields.");

  const db = admin();
  const household = await resolveHousehold(db, mode);
  if (!household) return fail(404, "No household found.");
  if (!(await loadMembers(db, household.id)).some((m) => m.id === memberId)) return fail(403, "Only household members can do this.");

  const { error } = await db.from("saved_ideas")
    .update({ cooked_at: cooked ? new Date().toISOString() : null })
    .eq("id", ideaId).eq("household_id", household.id);
  if (error) return fail(500, "Couldn't update that. Try again.");
  return done();
}
