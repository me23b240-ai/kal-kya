// Rules-only option selection. Pure: pass in the data and a random function.

export type DishRow = { id: string; name: string; name_hi: string | null; contains: string[] };

const norm = (s: string) => s.trim().toLowerCase();

/** Drops recently locked dishes and any dish whose `contains` matches a rule value (allergy or dislike). */
export function eligibleDishes(dishes: DishRow[], ruleValues: string[], recentDishIds: string[]): DishRow[] {
  const blocked = new Set(ruleValues.map(norm));
  const recent = new Set(recentDishIds);
  return dishes.filter((d) => !recent.has(d.id) && !d.contains.some((c) => blocked.has(norm(c))));
}

export function pickTwo<T>(items: T[], rng: () => number = Math.random): [T, T] | null {
  if (items.length < 2) return null;
  const pool = [...items];
  const out: T[] = [];
  for (let n = 0; n < 2; n++) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return [out[0], out[1]];
}
