import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentTapper, resolveLock, tallyVotes } from "./lock";
import { eligibleDishes, pickTwo, type DishRow } from "./options";
import { addDays, dayLabel, lockAtMs, todayInZone } from "./time";
import { dishEmoji, tintFor } from "./visual";
import type { DishView, MemberView, ViewData } from "./types";

type Admin = SupabaseClient;
export type Household = { id: string; name: string; lock_time: string; no_repeat_days: number; turn_member_id: string | null };
export type Member = { id: string; name: string; is_cook: boolean; turn_order: number | null };
export type PlanDay = {
  id: string; household_id: string; day: string; status: "open" | "locked" | "eating_out";
  option_a: string | null; option_b: string | null; locked_dish: string | null; locked_by: "votes" | "turn" | "default" | null;
};

export const admin = () => createAdminClient();

export async function loadHousehold(db: Admin): Promise<Household | null> {
  const { data } = await db.from("households").select("id,name,lock_time,no_repeat_days,turn_member_id")
    .eq("mode", "family").order("created_at").limit(1).maybeSingle();
  return (data as Household) ?? null;
}

export async function loadMembers(db: Admin, householdId: string): Promise<Member[]> {
  const { data } = await db.from("members").select("id,name,is_cook,turn_order")
    .eq("household_id", householdId).order("turn_order");
  return (data as Member[]) ?? [];
}

export const tomorrowKey = (nowMs = Date.now()) => addDays(todayInZone(nowMs), 1);

/** Creates the day with two rule-picked dishes. Returns false when fewer than two dishes qualify. */
export async function ensureDay(db: Admin, h: Household, day: string): Promise<boolean> {
  const { data: existing } = await db.from("plan_days").select("id").eq("household_id", h.id).eq("day", day).maybeSingle();
  if (existing) return true;

  const since = addDays(day, -h.no_repeat_days);
  const [{ data: recent }, { data: rules }, { data: dishes }] = await Promise.all([
    db.from("plan_days").select("locked_dish").eq("household_id", h.id).eq("status", "locked")
      .not("locked_dish", "is", null).gte("day", since).lt("day", day),
    db.from("rules").select("value").eq("household_id", h.id),
    db.from("dishes").select("id,name,name_hi,contains"),
  ]);
  const pool = eligibleDishes(
    (dishes as DishRow[]) ?? [],
    ((rules as { value: string }[]) ?? []).map((r) => r.value),
    ((recent as { locked_dish: string }[]) ?? []).map((r) => r.locked_dish),
  );
  const two = pickTwo(pool);
  if (!two) return false;

  const { error } = await db.from("plan_days").insert({
    household_id: h.id, day, status: "open", option_a: two[0].id, option_b: two[1].id,
  });
  if (error && error.code !== "23505") throw new Error(error.message); // 23505 = someone else created it first
  return true;
}

/** Resolves one open day. Safe to call twice: only the first caller's update goes through. */
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
  if (!updated?.length) return; // another request locked it first

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

/** Lazy locking: the first request after lock_time resolves every open day that is due. */
export async function lockDueDays(db: Admin, h: Household, nowMs = Date.now()): Promise<void> {
  const { data } = await db.from("plan_days").select("id,day").eq("household_id", h.id).eq("status", "open");
  for (const p of (data as { id: string; day: string }[]) ?? []) {
    if (lockAtMs(p.day, h.lock_time) <= nowMs) await lockDay(db, p.id);
  }
}

/** Loads a day for a write route, lazily locking it first if its time has passed. */
export async function getDayContext(db: Admin, planDayId: string) {
  const { data: pd } = await db.from("plan_days").select("*").eq("id", planDayId).maybeSingle();
  if (!pd) return null;
  const { data: hh } = await db.from("households").select("id,name,lock_time,no_repeat_days,turn_member_id").eq("id", (pd as PlanDay).household_id).single();
  const household = hh as Household;
  await lockDueDays(db, household);
  const { data: fresh } = await db.from("plan_days").select("*").eq("id", planDayId).single();
  return { plan: fresh as PlanDay, household, members: await loadMembers(db, household.id) };
}

const visual = (d: { id: string; name: string; name_hi: string | null }): DishView => ({
  id: d.id, name: d.name, nameHi: d.name_hi, emoji: dishEmoji(d.name), tint: tintFor(d.name),
});

export async function buildView(asParam?: string): Promise<ViewData | null> {
  const db = admin();
  const household = await loadHousehold(db);
  if (!household) return null;
  const members = await loadMembers(db, household.id);
  if (members.length === 0) return null;

  const day = tomorrowKey();
  await ensureDay(db, household, day);
  await lockDueDays(db, household);

  const { data: pd } = await db.from("plan_days").select("*").eq("household_id", household.id).eq("day", day).maybeSingle();
  const plan = pd as PlanDay | null;
  const viewer = members.find((m) => m.id === asParam) ?? members[0];
  const order = members.map((m) => m.id);

  const out: ViewData = {
    householdName: household.name, lockTime: household.lock_time.slice(0, 5), dayLabel: dayLabel(day),
    members: members.map((m) => ({ id: m.id, name: m.name, tint: tintFor(m.name), isCook: m.is_cook, voted: false })),
    viewerId: viewer.id, viewerIsCook: viewer.is_cook,
    state: "not_enough", planDayId: plan?.id ?? null, lockAtMs: null, options: [], myVote: null, tie: null, result: null,
  };
  if (!plan) return out;
  out.lockAtMs = lockAtMs(day, household.lock_time);
  if (plan.status === "eating_out") return { ...out, state: "eating_out" };
  if (!plan.option_a || !plan.option_b) return out;

  const [{ data: dishes }, { data: votes }, { data: picks }, { data: skips }] = await Promise.all([
    db.from("dishes").select("id,name,name_hi").in("id", [plan.option_a, plan.option_b]),
    db.from("votes").select("member_id,dish_id").eq("plan_day_id", plan.id),
    db.from("tie_picks").select("member_id,dish_id").eq("plan_day_id", plan.id),
    db.from("turn_skips").select("member_id,reason").eq("plan_day_id", plan.id),
  ]);
  const byId = new Map(((dishes as { id: string; name: string; name_hi: string | null }[]) ?? []).map((d) => [d.id, d]));
  const A = byId.get(plan.option_a), B = byId.get(plan.option_b);
  if (!A || !B) return out;
  out.options = [visual(A), visual(B)];

  const v = (votes as { member_id: string; dish_id: string }[]) ?? [];
  const p = (picks as { member_id: string; dish_id: string }[]) ?? [];
  const s = (skips as { member_id: string; reason: "pass" | "silent" }[]) ?? [];
  const votedIds = new Set(v.map((x) => x.member_id)); // who voted, never what
  out.members = out.members.map((m) => ({ ...m, voted: votedIds.has(m.id) }));
  out.myVote = v.find((x) => x.member_id === viewer.id)?.dish_id ?? null;
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "Someone";
  const tally = tallyVotes(plan.option_a, plan.option_b, v.map((x) => ({ memberId: x.member_id, dishId: x.dish_id })), order);

  if (plan.status === "locked" && plan.locked_dish && plan.locked_by) {
    const win = byId.get(plan.locked_dish) ?? A;
    const passed = new Set(s.filter((x) => x.reason === "pass").map((x) => x.member_id));
    const decider = plan.locked_by === "turn"
      ? p.find((x) => x.dish_id === plan.locked_dish && !passed.has(x.member_id))?.member_id ?? null : null;
    return {
      ...out, state: "locked",
      result: {
        winner: visual(win), lockedBy: plan.locked_by, tally,
        deciderName: decider ? nameOf(decider) : null,
        skipped: s.map((x) => ({ name: nameOf(x.member_id), reason: x.reason })),
      },
    };
  }

  // Open. A tie shows the tie-break tap to whoever holds it, but never reveals the counts.
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
