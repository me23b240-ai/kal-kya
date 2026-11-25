import { admin, loadHousehold, loadMembers, loadSingleHousehold } from "@/lib/meal/server";
import { done, fail, readBody, str } from "@/lib/meal/api";

type Admin = ReturnType<typeof admin>;

async function resolveHousehold(db: Admin, mode: "family" | "single") {
  return mode === "single" ? loadSingleHousehold(db) : loadHousehold(db);
}

async function authorize(db: Admin, mode: "family" | "single", memberId: string | null, targetMemberId: string | null) {
  const household = await resolveHousehold(db, mode);
  if (!household) return { error: fail(404, "No household found.") } as const;
  const members = await loadMembers(db, household.id);
  const me = members.find((m) => m.id === memberId);
  if (!me) return { error: fail(403, "Only household members can do this.") } as const;
  if (targetMemberId !== me.id && !me.is_cook) {
    return { error: fail(403, targetMemberId ? "Only the cook can set rules for someone else." : "Only the cook can set household-wide rules.") } as const;
  }
  return { household, me } as const;
}

export async function POST(req: Request) {
  const b = await readBody(req);
  const memberId = str(b.memberId);
  const targetMemberId = str(b.targetMemberId);
  const kind = str(b.kind);
  const value = str(b.value)?.trim().toLowerCase();
  const mode = str(b.household) === "single" ? "single" : "family";
  if (!memberId || !kind || !value || (kind !== "allergy" && kind !== "dislike")) return fail(400, "Missing or invalid fields.");

  const db = admin();
  const auth = await authorize(db, mode, memberId, targetMemberId);
  if ("error" in auth) return auth.error;

  const { error } = await db.from("rules").insert({ household_id: auth.household.id, member_id: targetMemberId, kind, value });
  if (error) return fail(500, "Couldn't save that rule. Try again.");
  return done();
}

export async function DELETE(req: Request) {
  const b = await readBody(req);
  const memberId = str(b.memberId);
  const ruleId = str(b.ruleId);
  const mode = str(b.household) === "single" ? "single" : "family";
  if (!memberId || !ruleId) return fail(400, "Missing fields.");

  const db = admin();
  const household = await resolveHousehold(db, mode);
  if (!household) return fail(404, "No household found.");
  const members = await loadMembers(db, household.id);
  const me = members.find((m) => m.id === memberId);
  if (!me) return fail(403, "Only household members can do this.");

  const { data: rule } = await db.from("rules").select("id,member_id,household_id").eq("id", ruleId).eq("household_id", household.id).maybeSingle();
  if (!rule) return fail(404, "That rule is gone already.");
  const r = rule as { id: string; member_id: string | null };
  if (r.member_id !== me.id && !me.is_cook) return fail(403, "Only the cook can remove that rule.");

  const { error } = await db.from("rules").delete().eq("id", ruleId);
  if (error) return fail(500, "Couldn't remove that rule. Try again.");
  return done();
}
