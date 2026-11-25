import { admin, loadHousehold, loadMembers } from "@/lib/meal/server";
import { done, fail, readBody, str } from "@/lib/meal/api";

async function authorizeCook(db: ReturnType<typeof admin>, memberId: string | null) {
  const household = await loadHousehold(db);
  if (!household) return { error: fail(404, "No household found.") } as const;
  const me = (await loadMembers(db, household.id)).find((m) => m.id === memberId);
  if (!me) return { error: fail(403, "Only household members can do this.") } as const;
  if (!me.is_cook) return { error: fail(403, "Only the cook can set cook's picks.") } as const;
  return { household, me } as const;
}

export async function POST(req: Request) {
  const b = await readBody(req);
  const memberId = str(b.memberId);
  const dishId = str(b.dishId);
  if (!memberId || !dishId) return fail(400, "Missing fields.");

  const db = admin();
  const auth = await authorizeCook(db, memberId);
  if ("error" in auth) return auth.error;

  const { error } = await db.from("household_dish_flags")
    .upsert({ household_id: auth.household.id, dish_id: dishId, flagged_by: memberId }, { onConflict: "household_id,dish_id" });
  if (error) return fail(500, "Couldn't save that. Try again.");
  return done();
}

export async function DELETE(req: Request) {
  const b = await readBody(req);
  const memberId = str(b.memberId);
  const dishId = str(b.dishId);
  if (!memberId || !dishId) return fail(400, "Missing fields.");

  const db = admin();
  const auth = await authorizeCook(db, memberId);
  if ("error" in auth) return auth.error;

  const { error } = await db.from("household_dish_flags").delete().eq("household_id", auth.household.id).eq("dish_id", dishId);
  if (error) return fail(500, "Couldn't remove that. Try again.");
  return done();
}
