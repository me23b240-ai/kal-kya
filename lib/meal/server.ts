import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { askGeminiForDay } from "@/lib/ai/gemini";
import { currentTapper, resolveLock, tallyVotes } from "./lock";
import { dislikedByMemberIds, eligibleDishes, weightedPickOne, weightedPickTwo, type DishRow, type RuleRow } from "./options";
import { addDays, dayLabel, lockAtMs, todayInZone } from "./time";
import { dishEmoji, tintFor } from "./visual";
import type { DayStripItem, DishView, MemberView, SingleViewData, ViewData } from "./types";

type Admin = SupabaseClient;
export type MealGoal = "none" | "quick" | "protein";
export type Household = {
  id: string; name: string; lock_time: string; no_repeat_days: number;
  turn_member_id: string | null; planning_window_days: number; nudge_every_days: number;
  use_ai_picker: boolean; meal_goal: MealGoal;
};
export type Member = { id: string; name: string; is_cook: boolean; turn_order: number | null; avatar_url: string | null };
export type PlanDay = {
  id: string; household_id: string; day: string; status: "open" | "locked" | "eating_out";
  option_a: string | null; option_b: string | null; locked_dish: string | null; locked_by: "votes" | "turn" | "default" | null;
  option_a_reason: string | null; option_b_reason: string | null;
};

export const admin = () => createAdminClient();

const HOUSEHOLD_COLS = "id,name,lock_time,no_repeat_days,turn_member_id,planning_window_days,nudge_every_days,use_ai_picker,meal_goal";
const DISH_DISPLAY_COLS = "id,name,name_hi,image_url,meal_style,contains,hands_on_minutes,total_minutes,protein_g,protein_basis,ingredients,recipe_steps";
const DISH_DISPLAY_COLS_SOLO = "id,name,name_hi,image_url,meal_style,hands_on_minutes,total_minutes,protein_g,protein_basis,ingredients,recipe_steps";
const DISH_POOL_COLS = "id,name,name_hi,contains,total_minutes,protein_g";

export async function loadHousehold(db: Admin): Promise<Household | null> {
  const { data } = await db.from("households").select(HOUSEHOLD_COLS)
    .eq("mode", "family").order("created_at").limit(1).maybeSingle();
  return (data as Household) ?? null;
}

export async function loadMembers(db: Admin, householdId: string): Promise<Member[]> {
  const { data } = await db.from("members").select("id,name,is_cook,turn_order,avatar_url")
    .eq("household_id", householdId).order("turn_order");
  return (data as Member[]) ?? [];
}

export async function loadRules(db: Admin, householdId: string) {
  const { data } = await db.from("rules").select("id,member_id,kind,value").eq("household_id", householdId).order("kind");
  return (data as { id: string; member_id: string | null; kind: "allergy" | "dislike"; value: string }[]) ?? [];
}

export async function loadContainsSuggestions(db: Admin): Promise<string[]> {
  const { data } = await db.from("dishes").select("contains");
  const set = new Set<string>();
  for (const row of (data as { contains: string[] }[]) ?? []) for (const c of row.contains ?? []) set.add(c.toLowerCase());
  return [...set].sort();
}

export async function loadAllDishes(db: Admin): Promise<{ id: string; name: string }[]> {
  const { data } = await db.from("dishes").select("id,name").order("name");
  return (data as { id: string; name: string }[]) ?? [];
}

export async function loadFlaggedDishIds(db: Admin, householdId: string): Promise<string[]> {
  const { data } = await db.from("household_dish_flags").select("dish_id").eq("household_id", householdId);
  return ((data as { dish_id: string }[]) ?? []).map((r) => r.dish_id);
}

export const tomorrowKey = (nowMs = Date.now()) => addDays(todayInZone(nowMs), 1);
const windowDays = (start: string, n: number) => Array.from({ length: n }, (_, i) => addDays(start, i));

export function currentWindowDays(h: Household): string[] {
  const n = Math.min(7, Math.max(1, h.planning_window_days));
  return windowDays(tomorrowKey(), n);
}

function weightFor(goal: MealGoal) {
  if (goal === "quick") return (d: DishRow) => Math.max(1, 40 - (d.total_minutes ?? 25));
  if (goal === "protein") return (d: DishRow) => Math.max(1, d.protein_g ?? 6);
  return () => 1;
}

export async function buildCandidatePool(db: Admin, h: Household, day: string) {
  const since = addDays(day, -h.no_repeat_days);
  const [{ data: recent }, { data: rules }, { data: dishes }, { data: flags }] = await Promise.all([
    db.from("plan_days").select("locked_dish").eq("household_id", h.id).eq("status", "locked")
      .not("locked_dish", "is", null).gte("day", since).lt("day", day),
    db.from("rules").select("member_id,kind,value").eq("household_id", h.id),
    db.from("dishes").select(DISH_POOL_COLS),
    db.from("household_dish_flags").select("dish_id").eq("household_id", h.id),
  ]);
  const allRules = (rules as RuleRow[]) ?? [];
  const allergyValues = allRules.filter((r) => r.kind === "allergy").map((r) => r.value);
  const dislikeRules = allRules.filter((r) => r.kind === "dislike");
  const recentIds = ((recent as { locked_dish: string }[]) ?? []).map((r) => r.locked_dish);
  const allDishes = (dishes as DishRow[]) ?? [];
  const pool = eligibleDishes(allDishes, allergyValues, recentIds);
  const flaggedIds = ((flags as { dish_id: string }[]) ?? []).map((f) => f.dish_id);
  return { allDishes, pool, recentIds, allergyValues, dislikeRules, flaggedIds };
}

export async function shortageReason(db: Admin, h: Household, day: string): Promise<string> {
  const { allDishes, pool, recentIds, allergyValues } = await buildCandidatePool(db, h, day);
  if (allDishes.length === 0) return "There are no dishes on the kitchen board yet.";
  const afterRecent = allDishes.filter((d) => !recentIds.includes(d.id)).length;
  const excludedByRecent = allDishes.length - afterRecent;
  const excludedByAllergy = afterRecent - pool.length;
  const parts: string[] = [];
  if (excludedByRecent > 0) parts.push(`${excludedByRecent} cooked too recently`);
  if (excludedByAllergy > 0) parts.push(`${excludedByAllergy} blocked by an allergy rule${allergyValues.length ? ` (${[...new Set(allergyValues.map((v) => v.toLowerCase()))].join(", ")})` : ""}`);
  if (parts.length === 0) return `Only ${pool.length} dish${pool.length === 1 ? "" : "es"} exist in total. Add more to the kitchen board.`;
  return `${parts.join(" and ")} left only ${pool.length} dish${pool.length === 1 ? "" : "es"} to choose from.`;
}

async function flaggedOfferedRecently(db: Admin, h: Household, day: string, flaggedIds: string[]): Promise<boolean> {
  if (flaggedIds.length === 0) return true;
  const since = addDays(day, -h.nudge_every_days);
  const { data } = await db.from("plan_days").select("option_a,option_b")
    .eq("household_id", h.id).gte("day", since).lt("day", day);
  return ((data as { option_a: string | null; option_b: string | null }[]) ?? [])
    .some((d) => (d.option_a && flaggedIds.includes(d.option_a)) || (d.option_b && flaggedIds.includes(d.option_b)));
}

const aiCallLog = new Map<string, number[]>();
function aiRateLimited(householdId: string, max = 10, windowMs = 3600_000): boolean {
  const now = Date.now();
  const arr = (aiCallLog.get(householdId) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  aiCallLog.set(householdId, arr);
  return arr.length > max;
}

async function logPick(
  db: Admin, householdId: string, source: "gemini" | "rules" | "fallback",
  failureReason: string | null, latencyMs: number, candidateCount: number, chosenIds: string[],
) {
  await db.from("pick_logs").insert({
    household_id: householdId, source, failure_reason: failureReason, latency_ms: latencyMs,
    candidate_count: candidateCount, chosen_dish_ids: chosenIds,
  });
}

export type DayPick = { a: DishRow; b: DishRow; reasonA: string | null; reasonB: string | null };

export async function pickOptionsForDayLogged(db: Admin, h: Household, day: string): Promise<DayPick | null> {
  const { pool, flaggedIds } = await buildCandidatePool(db, h, day);
  if (pool.length < 2) return null;
  const weight = weightFor(h.meal_goal);

  if (flaggedIds.length > 0) {
    const eligibleFlagged = pool.filter((d) => flaggedIds.includes(d.id));
    if (eligibleFlagged.length > 0 && !(await flaggedOfferedRecently(db, h, day, flaggedIds))) {
      const forced = weightedPickOne(eligibleFlagged, weight) ?? eligibleFlagged[0];
      const others = pool.filter((d) => d.id !== forced.id);
      const other = weightedPickOne(others, weight) ?? others[0];
      await logPick(db, h.id, "rules", null, 0, pool.length, [forced.id, other.id]);
      return { a: forced, b: other, reasonA: null, reasonB: null };
    }
  }

  if (h.use_ai_picker && !aiRateLimited(h.id)) {
    const since = addDays(day, -3), until = addDays(day, 3);
    const { data: windowRows } = await db.from("plan_days").select("option_a,option_b,locked_dish")
      .eq("household_id", h.id).gte("day", since).lte("day", until).neq("day", day);
    const otherIds = [...new Set(
      ((windowRows as { option_a: string | null; option_b: string | null; locked_dish: string | null }[]) ?? [])
        .flatMap((r) => [r.option_a, r.option_b, r.locked_dish]).filter((x): x is string => !!x),
    )];

    const start = Date.now();
    const aiResult = await askGeminiForDay(
      pool.map((d) => ({
        id: d.id, name: d.name, mealStyle: "with_staples", ingredients: d.contains,
        totalMinutes: d.total_minutes ?? null, proteinG: d.protein_g ?? null,
      })),
      otherIds,
      h.meal_goal,
    );
    const latency = Date.now() - start;

    if (aiResult) {
      const a = pool.find((d) => d.id === aiResult.optionA)!;
      const b = pool.find((d) => d.id === aiResult.optionB)!;
      await logPick(db, h.id, "gemini", null, latency, pool.length, [a.id, b.id]);
      return { a, b, reasonA: aiResult.reasonA || null, reasonB: aiResult.reasonB || null };
    }
    const two = weightedPickTwo(pool, weight);
    if (!two) return null;
    await logPick(db, h.id, "fallback", "ai_unavailable_or_invalid", latency, pool.length, [two[0].id, two[1].id]);
    return { a: two[0], b: two[1], reasonA: null, reasonB: null };
  }

  const two = weightedPickTwo(pool, weight);
  if (!two) return null;
  await logPick(db, h.id, "rules", null, 0, pool.length, [two[0].id, two[1].id]);
  return { a: two[0], b: two[1], reasonA: null, reasonB: null };
}

export async function ensureDay(db: Admin, h: Household, day: string): Promise<boolean> {
  const { data: existing } = await db.from("plan_days").select("id").eq("household_id", h.id).eq("day", day).maybeSingle();
  if (existing) return true;

  const picked = await pickOptionsForDayLogged(db, h, day);
  if (!picked) return false;

  const { error } = await db.from("plan_days").insert({
    household_id: h.id, day, status: "open",
    option_a: picked.a.id, option_b: picked.b.id,
    option_a_reason: picked.reasonA, option_b_reason: picked.reasonB,
  });
  if (error && error.code !== "23505") throw new Error(error.message);
  return true;
}

export async function ensureWindow(db: Admin, h: Household): Promise<void> {
  const start = tomorrowKey();
  const n = Math.min(7, Math.max(1, h.planning_window_days));
  for (const day of windowDays(start, n)) {
    await ensureDay(db, h, day);
  }
}

export async function lockDay(db: Admin, planDayId: string): Promise<void> {
  const { data: pd } = await db.from("plan_days").select("*").eq("id", planDayId).maybeSingle();
  const plan = pd as PlanDay | null;
  if (!plan || plan.status !== "open" || !plan.option_a || !plan.option_b) return;

  const { data: hh } = await db.from("households").select("turn_member_id").eq("id", plan.household_id).single();
  const members = await loadMembers(db, plan.household_id);
  const [{ data: votes }, { data: picks }, { data: skips }] = await Promise.all([
    db.from("votes").select("member_id,dish_id").eq("plan_day_id", planDayId),
    db.from("tie_picks").select("member_id,dish_id").eq("plan_day_id", planDayId),
    db.from("turn_skips").select("member_id,reason").eq("plan_day_id", planDayId),
  ]);

  const r = resolveLock({
    optionA: plan.option_a, optionB: plan.option_b,
    votes: ((votes as { member_id: string; dish_id: string }[]) ?? []).map((v) => ({ memberId: v.member_id, dishId: v.dish_id })),
    memberOrder: members.map((m) => m.id),
    turnMemberId: (hh as { turn_member_id: string | null }).turn_member_id,
    tiePicks: Object.fromEntries(((picks as { member_id: string; dish_id: string }[]) ?? []).map((p) => [p.member_id, p.dish_id])),
    passed: ((skips as { member_id: string; reason: string }[]) ?? []).filter((s) => s.reason === "pass").map((s) => s.member_id),
  });

  const { data: updated } = await db.from("plan_days")
    .update({ status: "locked", locked_dish: r.winner, locked_by: r.lockedBy })
    .eq("id", planDayId).eq("status", "open").select("id");
  if (!updated?.length) return;

  if (r.skips.length) {
    await db.from("turn_skips").upsert(
      r.skips.map((s) => ({ plan_day_id: planDayId, member_id: s.memberId, reason: s.reason })),
      { onConflict: "plan_day_id,member_id", ignoreDuplicates: true },
    );
  }
  if (r.tied && r.nextTurnMemberId) {
    await db.from("households").update({ turn_member_id: r.nextTurnMemberId }).eq("id", plan.household_id);
  }
}

export async function lockDueDays(db: Admin, h: Household, nowMs = Date.now()): Promise<void> {
  const { data } = await db.from("plan_days").select("id,day").eq("household_id", h.id).eq("status", "open");
  for (const p of (data as { id: string; day: string }[]) ?? []) {
    if (lockAtMs(p.day, h.lock_time) <= nowMs) await lockDay(db, p.id);
  }
}

export async function getDayContext(db: Admin, planDayId: string) {
  const { data: pd } = await db.from("plan_days").select("*").eq("id", planDayId).maybeSingle();
  if (!pd) return null;
  const { data: hh } = await db.from("households").select(HOUSEHOLD_COLS).eq("id", (pd as PlanDay).household_id).single();
  const household = hh as Household;
  await lockDueDays(db, household);
  const { data: fresh } = await db.from("plan_days").select("*").eq("id", planDayId).single();
  return { plan: fresh as PlanDay, household, members: await loadMembers(db, household.id) };
}

function publicFileExists(url: string | null): url is string {
  if (!url) return false;
  try { return fs.existsSync(path.join(process.cwd(), "public", url)); } catch { return false; }
}

const visual = (
  d: {
    id: string; name: string; name_hi: string | null; image_url?: string | null; meal_style?: string | null;
    hands_on_minutes?: number | null; total_minutes?: number | null; protein_g?: number | null; protein_basis?: string | null;
    ingredients?: { item: string; qty?: string }[] | null; recipe_steps?: string[] | null;
  },
  dislikedBy: string[] = [],
  pickedByName: string | null = null,
  aiReason: string | null = null,
): DishView => ({
  id: d.id, name: d.name, nameHi: d.name_hi, emoji: dishEmoji(d.name), tint: tintFor(d.name),
  imageUrl: publicFileExists(d.image_url ?? null) ? (d.image_url as string) : null,
  mealStyle: (d.meal_style as "with_staples" | "complete") ?? "with_staples",
  handsOnMinutes: d.hands_on_minutes ?? null,
  totalMinutes: d.total_minutes ?? null,
  proteinG: d.protein_g ?? null,
  proteinBasis: d.protein_basis ?? null,
  ingredients: d.ingredients ?? [],
  recipeSteps: d.recipe_steps ?? null,
  dislikedBy, pickedByName, aiReason,
});

export async function buildView(asParam?: string, dayParam?: string): Promise<ViewData | null> {
  const db = admin();
  const household = await loadHousehold(db);
  if (!household) return null;
  const members = await loadMembers(db, household.id);
  if (members.length === 0) return null;
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "Someone";

  const tomorrow = tomorrowKey();
  const n = Math.min(7, Math.max(1, household.planning_window_days));
  const allDays = windowDays(tomorrow, n);
  const day = dayParam && allDays.includes(dayParam) ? dayParam : tomorrow;

  await ensureDay(db, household, day);
  await lockDueDays(db, household);

  const { data: windowRows } = await db.from("plan_days").select("day,status").eq("household_id", household.id).in("day", allDays);
  const statusByDay = new Map(((windowRows as { day: string; status: "open" | "locked" | "eating_out" }[]) ?? []).map((r) => [r.day, r.status]));
  const strip: DayStripItem[] = allDays.map((d) => ({
    day: d, label: dayLabel(d),
    state: statusByDay.get(d) ?? (d === day ? "not_enough" : "unplanned"),
  }));

  const { data: pd } = await db.from("plan_days").select("*").eq("household_id", household.id).eq("day", day).maybeSingle();
  const plan = pd as PlanDay | null;
  const viewer = members.find((m) => m.id === asParam) ?? members[0];
  const order = members.map((m) => m.id);

  const out: ViewData = {
    householdName: household.name, lockTime: household.lock_time.slice(0, 5),
    day, dayLabel: dayLabel(day), planningWindowDays: n, strip,
    members: members.map((m) => ({
      id: m.id, name: m.name, tint: tintFor(m.name), isCook: m.is_cook, voted: false,
      avatarUrl: publicFileExists(m.avatar_url) ? (m.avatar_url as string) : null,
    })),
    viewerId: viewer.id, viewerIsCook: viewer.is_cook,
    state: "not_enough", planDayId: plan?.id ?? null, lockAtMs: null, options: [], myVote: null, tie: null, result: null,
    shortageReason: null,
  };
  if (!plan) return { ...out, shortageReason: await shortageReason(db, household, day) };
  out.lockAtMs = lockAtMs(day, household.lock_time);
  if (plan.status === "eating_out") return { ...out, state: "eating_out" };
  if (!plan.option_a || !plan.option_b) return out;

  const [{ data: dishes }, { data: votes }, { data: picks }, { data: skips }, { data: dislikeRows }, { data: mealRows }, { data: flagRows }] = await Promise.all([
    db.from("dishes").select(DISH_DISPLAY_COLS).in("id", [plan.option_a, plan.option_b]),
    db.from("votes").select("member_id,dish_id").eq("plan_day_id", plan.id),
    db.from("tie_picks").select("member_id,dish_id").eq("plan_day_id", plan.id),
    db.from("turn_skips").select("member_id,reason").eq("plan_day_id", plan.id),
    db.from("rules").select("member_id,kind,value").eq("household_id", household.id).eq("kind", "dislike"),
    db.from("meal_responses").select("member_id,response").eq("plan_day_id", plan.id),
    db.from("household_dish_flags").select("dish_id,flagged_by").eq("household_id", household.id),
  ]);
  const dislikeRules = (dislikeRows as RuleRow[]) ?? [];
  const dislikedNames = (d: DishRow) => dislikedByMemberIds(d, dislikeRules).map(nameOf);
  const mealResponses = (mealRows as { member_id: string; response: "eating" | "out" }[]) ?? [];
  const outIds = new Set(mealResponses.filter((r) => r.response === "out").map((r) => r.member_id));
  const flagByDish = new Map(((flagRows as { dish_id: string; flagged_by: string | null }[]) ?? []).map((f) => [f.dish_id, f.flagged_by]));
  const pickedByName = (dishId: string) => {
    if (!flagByDish.has(dishId)) return null;
    const fb = flagByDish.get(dishId);
    return fb ? nameOf(fb) : "the cook";
  };
  const reasonFor = (dishId: string) =>
    dishId === plan.option_a ? plan.option_a_reason : dishId === plan.option_b ? plan.option_b_reason : null;

  type DishRowDisplay = DishRow & {
    image_url: string | null; meal_style: string | null; protein_basis: string | null;
    ingredients: { item: string; qty?: string }[]; recipe_steps: string[] | null;
  };
  const byId = new Map(((dishes as DishRowDisplay[]) ?? []).map((d) => [d.id, d]));
  const A = byId.get(plan.option_a), B = byId.get(plan.option_b);
  if (!A || !B) return out;
  out.options = [
    visual(A, dislikedNames(A), pickedByName(A.id), reasonFor(A.id)),
    visual(B, dislikedNames(B), pickedByName(B.id), reasonFor(B.id)),
  ];

  const v = (votes as { member_id: string; dish_id: string }[]) ?? [];
  const p = (picks as { member_id: string; dish_id: string }[]) ?? [];
  const s = (skips as { member_id: string; reason: "pass" | "silent" }[]) ?? [];
  const votedIds = new Set(v.map((x) => x.member_id));
  out.members = out.members.map((m) => ({ ...m, voted: votedIds.has(m.id) }));
  out.myVote = v.find((x) => x.member_id === viewer.id)?.dish_id ?? null;
  const tally = tallyVotes(plan.option_a, plan.option_b, v.map((x) => ({ memberId: x.member_id, dishId: x.dish_id })), order);

  if (plan.status === "locked" && plan.locked_dish && plan.locked_by) {
    const win = byId.get(plan.locked_dish) ?? A;
    const passed = new Set(s.filter((x) => x.reason === "pass").map((x) => x.member_id));
    const decider = plan.locked_by === "turn"
      ? p.find((x) => x.dish_id === plan.locked_dish && !passed.has(x.member_id))?.member_id ?? null : null;
    const winDislikedIds = dislikedByMemberIds(win, dislikeRules);
    const myResponse = mealResponses.find((r) => r.member_id === viewer.id)?.response ?? null;
    return {
      ...out, state: "locked",
      result: {
        winner: visual(win, dislikedNames(win), pickedByName(win.id), reasonFor(win.id)), lockedBy: plan.locked_by, tally,
        deciderName: decider ? nameOf(decider) : null,
        skipped: s.map((x) => ({ name: nameOf(x.member_id), reason: x.reason })),
        headcount: { eatingIds: order.filter((id) => !outIds.has(id)), outIds: [...outIds] },
        myMealPrompt: winDislikedIds.includes(viewer.id) ? { response: myResponse } : null,
      },
    };
  }

  if (tally.a > 0 && tally.a === tally.b) {
    const tapper = currentTapper(order, household.turn_member_id, s.filter((x) => x.reason === "pass").map((x) => x.member_id));
    if (tapper) {
      out.tie = {
        tapperName: nameOf(tapper), viewerIsTapper: tapper === viewer.id,
        myPick: p.find((x) => x.member_id === viewer.id)?.dish_id ?? null,
      };
    }
  }
  return { ...out, state: "open" };
}

// ---------------- Single mode ----------------

export async function loadSingleHousehold(db: Admin): Promise<Household | null> {
  const { data } = await db.from("households").select(HOUSEHOLD_COLS)
    .eq("mode", "single").order("created_at").limit(1).maybeSingle();
  return (data as Household) ?? null;
}

export async function buildSingleCandidatePool(db: Admin, h: Household, day: string, memberId: string, excludeIds: string[] = []) {
  const since = addDays(day, -h.no_repeat_days);
  const [{ data: recent }, { data: rules }, { data: dishes }] = await Promise.all([
    db.from("plan_days").select("locked_dish").eq("household_id", h.id).eq("status", "locked")
      .not("locked_dish", "is", null).gte("day", since).lt("day", day),
    db.from("rules").select("member_id,kind,value").eq("household_id", h.id),
    db.from("dishes").select(DISH_POOL_COLS),
  ]);
  const hardValues = ((rules as RuleRow[]) ?? [])
    .filter((r) => r.member_id === null || r.member_id === memberId)
    .map((r) => r.value);
  const recentIds = ((recent as { locked_dish: string }[]) ?? []).map((r) => r.locked_dish);
  const allDishes = ((dishes as DishRow[]) ?? []).filter((d) => !excludeIds.includes(d.id));
  const pool = eligibleDishes(allDishes, hardValues, recentIds);
  return { allDishes, pool, recentIds, hardValues };
}

export async function singleShortageReason(db: Admin, h: Household, day: string, memberId: string): Promise<string> {
  const { allDishes, pool, recentIds } = await buildSingleCandidatePool(db, h, day, memberId);
  if (allDishes.length === 0) return "There are no dishes on the kitchen board yet.";
  const afterRecent = allDishes.filter((d) => !recentIds.includes(d.id)).length;
  const excludedByRecent = allDishes.length - afterRecent;
  const excludedByRules = afterRecent - pool.length;
  const parts: string[] = [];
  if (excludedByRecent > 0) parts.push(`${excludedByRecent} cooked too recently`);
  if (excludedByRules > 0) parts.push(`${excludedByRules} blocked by an allergy or dislike`);
  if (parts.length === 0) return `Only ${pool.length} dish${pool.length === 1 ? "" : "es"} exist in total. Add more to the kitchen board.`;
  return `${parts.join(" and ")} left only ${pool.length} dish${pool.length === 1 ? "" : "es"} to choose from.`;
}

export async function pickOptionsForSingleDay(db: Admin, h: Household, day: string, memberId: string, excludeIds: string[] = []): Promise<[DishRow, DishRow] | null> {
  const { pool } = await buildSingleCandidatePool(db, h, day, memberId, excludeIds);
  return weightedPickTwo(pool, weightFor(h.meal_goal));
}

export async function ensureSingleDay(db: Admin, h: Household, day: string): Promise<boolean> {
  const { data: existing } = await db.from("plan_days").select("id").eq("household_id", h.id).eq("day", day).maybeSingle();
  if (existing) return true;
  const members = await loadMembers(db, h.id);
  const member = members[0];
  if (!member) return false;
  const two = await pickOptionsForSingleDay(db, h, day, member.id);
  if (!two) return false;
  const { error } = await db.from("plan_days").insert({
    household_id: h.id, day, status: "open", option_a: two[0].id, option_b: two[1].id,
    shown_dish_ids: [two[0].id, two[1].id],
  });
  if (error && error.code !== "23505") throw new Error(error.message);
  return true;
}

type SinglePlanDay = Omit<PlanDay, "locked_by"> & { locked_by: string | null };

export async function buildSingleView(dayParam?: string): Promise<SingleViewData | null> {
  const db = admin();
  const household = await loadSingleHousehold(db);
  if (!household) return null;
  const members = await loadMembers(db, household.id);
  const member = members[0];
  if (!member) return null;

  const tomorrow = tomorrowKey();
  const n = Math.min(7, Math.max(1, household.planning_window_days));
  const allDays = windowDays(tomorrow, n);
  const day = dayParam && allDays.includes(dayParam) ? dayParam : tomorrow;

  await ensureSingleDay(db, household, day);

  const { data: windowRows } = await db.from("plan_days").select("day,status").eq("household_id", household.id).in("day", allDays);
  const statusByDay = new Map(((windowRows as { day: string; status: "open" | "locked" | "eating_out" }[]) ?? []).map((r) => [r.day, r.status]));
  const strip: DayStripItem[] = allDays.map((d) => ({
    day: d, label: dayLabel(d),
    state: statusByDay.get(d) ?? (d === day ? "not_enough" : "unplanned"),
  }));

  const { data: pd } = await db.from("plan_days").select("*").eq("household_id", household.id).eq("day", day).maybeSingle();
  const plan = pd as SinglePlanDay | null;

  const out: SingleViewData = {
    householdName: household.name, day, dayLabel: dayLabel(day), planningWindowDays: n, strip,
    viewerId: member.id, state: "not_enough", planDayId: plan?.id ?? null, options: [], myPick: null, shortageReason: null,
  };
  if (!plan) return { ...out, shortageReason: await singleShortageReason(db, household, day, member.id) };
  if (plan.status === "eating_out") return { ...out, state: "eating_out" };
  if (!plan.option_a || !plan.option_b) return out;

  const { data: dishes } = await db.from("dishes").select(DISH_DISPLAY_COLS_SOLO).in("id", [plan.option_a, plan.option_b]);
  type DishRowDisplay = DishRow & {
    image_url: string | null; meal_style: string | null; protein_basis: string | null;
    ingredients: { item: string; qty?: string }[]; recipe_steps: string[] | null;
  };
  const byId = new Map(((dishes as unknown as DishRowDisplay[]) ?? []).map((d) => [d.id, d]));
  const A = byId.get(plan.option_a), B = byId.get(plan.option_b);
  if (!A || !B) return out;
  out.options = [visual(A), visual(B)];

  if (plan.locked_dish && plan.locked_by === "chosen") {
    return { ...out, state: "picked", myPick: plan.locked_dish };
  }
  return { ...out, state: "open" };
}
