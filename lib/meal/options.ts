// Rules-only option selection. Pure: pass in the data and a random function.

export type DishRow = {
  id: string; name: string; name_hi: string | null; contains: string[];
  total_minutes?: number | null; protein_g?: number | null;
};
export type RuleRow = { member_id: string | null; kind: "allergy" | "dislike"; value: string };

const norm = (s: string) => s.trim().toLowerCase();

/** Hard filter: drops recently locked dishes and any dish matching a household/member ALLERGY.
 *  Dislikes never exclude a dish - they're informational only (shown on the card; the vote decides). */
export function eligibleDishes(dishes: DishRow[], allergyValues: string[], recentDishIds: string[]): DishRow[] {
  const blocked = new Set(allergyValues.map(norm));
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

/** Picks one item, weighted. Items with higher weight are proportionally more likely, but anything
 *  with weight > 0 can still be picked - this nudges, it never hard-excludes (unlike allergies). */
export function weightedPickOne<T>(items: T[], weightOf: (item: T) => number, rng: () => number = Math.random): T | undefined {
  if (items.length === 0) return undefined;
  const weights = items.map((it) => Math.max(0.0001, weightOf(it)));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function weightedPickTwo<T>(items: T[], weightOf: (item: T) => number, rng: () => number = Math.random): [T, T] | null {
  if (items.length < 2) return null;
  const first = weightedPickOne(items, weightOf, rng)!;
  const rest = items.filter((it) => it !== first);
  const second = weightedPickOne(rest, weightOf, rng)!;
  return [first, second];
}

/** Which members (by id) dislike this dish, based on their dislike rule values matching its `contains` tags. */
export function dislikedByMemberIds(dish: DishRow, dislikeRules: RuleRow[]): string[] {
  const tags = new Set(dish.contains.map(norm));
  const ids = new Set<string>();
  for (const r of dislikeRules) {
    if (r.member_id && tags.has(norm(r.value))) ids.add(r.member_id);
  }
  return [...ids];
}
