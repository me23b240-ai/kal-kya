import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dayLabel } from "./time";

type Admin = SupabaseClient;
export type Ingredient = { item: string; qty?: string };

export type ShoppingRow = {
  id: string; household_id: string; plan_day_id: string | null;
  item: string; qty: string | null; bought: boolean; bought_at: string | null;
  bought_by: string | null; have_at_home: boolean; is_manual: boolean;
};

export type ShoppingOccurrence = { rowId: string; qty: string | null; label: string };
export type ShoppingGroup = {
  key: string; item: string; haveAtHome: boolean; bought: boolean;
  boughtByName: string | null; occurrences: ShoppingOccurrence[];
};
export type ShoppingList = {
  groups: ShoppingGroup[];
  hasAnyLockedDay: boolean;
  noIngredientDays: { dayLabel: string; dishName: string }[];
};

const norm = (s: string) => s.trim().toLowerCase();

/** Builds shopping_items from every locked day in the window. Idempotent even under concurrent calls:
 *  each ingredient is inserted individually, and a unique index on (plan_day_id, lower(trim(item)))
 *  rejects a duplicate at the database level (code 23505), which we simply ignore. */
export async function syncShoppingList(db: Admin, householdId: string, windowDays: string[]): Promise<void> {
  const { data: days } = await db.from("plan_days")
    .select("id,status,locked_dish").eq("household_id", householdId).in("day", windowDays);
  const dayRows = (days as { id: string; status: string; locked_dish: string | null }[]) ?? [];

  const lockedWithDish = dayRows.filter((d) => d.status === "locked" && d.locked_dish);
  const eatingOutIds = dayRows.filter((d) => d.status === "eating_out").map((d) => d.id);

  if (lockedWithDish.length) {
    const dishIds = [...new Set(lockedWithDish.map((d) => d.locked_dish as string))];
    const { data: dishes } = await db.from("dishes").select("id,ingredients").in("id", dishIds);
    const ingredientsById = new Map(((dishes as { id: string; ingredients: Ingredient[] }[]) ?? []).map((d) => [d.id, d.ingredients ?? []]));

    for (const day of lockedWithDish) {
      const ingredients = ingredientsById.get(day.locked_dish as string) ?? [];
      if (ingredients.length === 0) continue;
      const { data: existing } = await db.from("shopping_items").select("item").eq("plan_day_id", day.id);
      const existingNames = new Set(((existing as { item: string }[]) ?? []).map((r) => norm(r.item)));

      for (const ing of ingredients) {
        if (!ing.item || existingNames.has(norm(ing.item))) continue;
        const { error } = await db.from("shopping_items").insert({
          household_id: householdId, plan_day_id: day.id, item: ing.item, qty: ing.qty ?? null, is_manual: false,
        });
        if (error && error.code !== "23505") {
          console.error("shopping item insert failed:", error);
        }
      }
    }
  }

  if (eatingOutIds.length) {
    await db.from("shopping_items").delete().in("plan_day_id", eatingOutIds).eq("bought", false);
  }
}

export async function loadShoppingList(
  db: Admin, householdId: string, windowDays: string[], memberNameOf: (id: string) => string,
): Promise<ShoppingList> {
  await syncShoppingList(db, householdId, windowDays);

  const { data: lockedDays } = await db.from("plan_days").select("id,day,locked_dish")
    .eq("household_id", householdId).eq("status", "locked").in("day", windowDays).not("locked_dish", "is", null);
  const lockedList = (lockedDays as { id: string; day: string; locked_dish: string }[]) ?? [];
  const dishIds = [...new Set(lockedList.map((d) => d.locked_dish))];
  const { data: dishMeta } = dishIds.length
    ? await db.from("dishes").select("id,name,ingredients").in("id", dishIds)
    : { data: [] as { id: string; name: string; ingredients: Ingredient[] }[] };
  const dishMetaById = new Map(((dishMeta as { id: string; name: string; ingredients: Ingredient[] }[]) ?? []).map((d) => [d.id, d]));
  const dishNameByDayId = new Map(lockedList.map((d) => [d.id, dishMetaById.get(d.locked_dish)?.name ?? "a dish"]));
  const dayLabelByDayId = new Map(lockedList.map((d) => [d.id, dayLabel(d.day)]));
  const noIngredientDays = lockedList
    .filter((d) => (dishMetaById.get(d.locked_dish)?.ingredients?.length ?? 0) === 0)
    .map((d) => ({ dayLabel: dayLabel(d.day), dishName: dishMetaById.get(d.locked_dish)?.name ?? "That dish" }));

  const { data: rows } = await db.from("shopping_items")
    .select("id,plan_day_id,item,qty,bought,bought_at,bought_by,have_at_home,is_manual")
    .eq("household_id", householdId);
  const items = (rows as ShoppingRow[]) ?? [];

  const groups = new Map<string, ShoppingGroup>();
  for (const r of items) {
    const key = norm(r.item);
    const label = r.plan_day_id
      ? `${dishNameByDayId.get(r.plan_day_id) ?? "a dish"} \u00b7 ${dayLabelByDayId.get(r.plan_day_id) ?? ""}`
      : `Added by ${r.bought_by ? memberNameOf(r.bought_by) : "someone"}`;
    const g = groups.get(key) ?? { key, item: r.item.trim(), haveAtHome: false, bought: false, boughtByName: null, occurrences: [] as ShoppingOccurrence[] };
    g.occurrences.push({ rowId: r.id, qty: r.qty, label });
    if (r.have_at_home) g.haveAtHome = true;
    if (r.bought) { g.bought = true; g.boughtByName = r.bought_by ? memberNameOf(r.bought_by) : g.boughtByName; }
    groups.set(key, g);
  }

  return {
    groups: [...groups.values()].sort((a, b) => a.item.localeCompare(b.item)),
    hasAnyLockedDay: lockedList.length > 0,
    noIngredientDays,
  };
}
