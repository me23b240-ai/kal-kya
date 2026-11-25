// Pure rules for voting and locking. No database, no clock, no randomness in here.

export type LockedBy = "votes" | "turn" | "default";
export type SkipReason = "pass" | "silent";

export type Vote = { memberId: string; dishId: string };

export type LockInput = {
  optionA: string;
  optionB: string;
  votes: Vote[];
  /** member ids sorted by turn_order */
  memberOrder: string[];
  /** households.turn_member_id */
  turnMemberId: string | null;
  /** tie-break picks: memberId -> dishId */
  tiePicks: Record<string, string>;
  /** members who tapped "pass" during this tie */
  passed: string[];
};

export type LockResult = {
  winner: string;
  lockedBy: LockedBy;
  tally: { a: number; b: number };
  tied: boolean;
  deciderId: string | null;
  skips: { memberId: string; reason: SkipReason }[];
  /** new households.turn_member_id, only set when there was a tie */
  nextTurnMemberId: string | null;
};

/** One vote per member (last one wins), ignoring non-members and dishes not on offer. */
export function tallyVotes(optionA: string, optionB: string, votes: Vote[], memberOrder?: string[]) {
  const latest = new Map<string, string>();
  for (const v of votes) {
    if (memberOrder && !memberOrder.includes(v.memberId)) continue;
    if (v.dishId !== optionA && v.dishId !== optionB) continue;
    latest.set(v.memberId, v.dishId);
  }
  let a = 0;
  let b = 0;
  for (const dishId of latest.values()) dishId === optionA ? a++ : b++;
  return { a, b };
}

/** Member order starting at the turn holder and wrapping around. */
export function rotateFrom(memberOrder: string[], turnMemberId: string | null): string[] {
  const i = turnMemberId ? memberOrder.indexOf(turnMemberId) : -1;
  const start = i === -1 ? 0 : i;
  return [...memberOrder.slice(start), ...memberOrder.slice(0, start)];
}

export function memberAfter(memberOrder: string[], id: string | null): string | null {
  if (memberOrder.length === 0) return null;
  const i = id ? memberOrder.indexOf(id) : -1;
  return memberOrder[(i + 1) % memberOrder.length];
}

/** Who currently holds the tie-break tap: first member from the turn holder who has not passed. */
export function currentTapper(memberOrder: string[], turnMemberId: string | null, passed: string[]): string | null {
  return rotateFrom(memberOrder, turnMemberId).find((id) => !passed.includes(id)) ?? null;
}

export function resolveLock(input: LockInput): LockResult {
  const { optionA, optionB, memberOrder, turnMemberId } = input;
  const tally = tallyVotes(optionA, optionB, input.votes, memberOrder);
  const base = { tally, deciderId: null, skips: [], nextTurnMemberId: null };

  if (tally.a + tally.b === 0) return { ...base, winner: optionA, lockedBy: "default", tied: false };
  if (tally.a !== tally.b) {
    return { ...base, winner: tally.a > tally.b ? optionA : optionB, lockedBy: "votes", tied: false };
  }

  // Tie: walk the members from the turn holder. First one with a pick decides.
  const skips: LockResult["skips"] = [];
  for (const id of rotateFrom(memberOrder, turnMemberId)) {
    if (input.passed.includes(id)) {
      skips.push({ memberId: id, reason: "pass" });
      continue;
    }
    const pick = input.tiePicks[id];
    if (pick === optionA || pick === optionB) {
      return { tally, tied: true, winner: pick, lockedBy: "turn", deciderId: id, skips, nextTurnMemberId: memberAfter(memberOrder, id) };
    }
    skips.push({ memberId: id, reason: "silent" });
  }
  // Everyone skipped: option A, and the turn moves one place on from the original holder.
  return {
    tally, tied: true, winner: optionA, lockedBy: "default", deciderId: null, skips,
    nextTurnMemberId: memberAfter(memberOrder, turnMemberId ?? memberOrder[0] ?? null),
  };
}

export type VoteCheck =
  | { ok: true }
  | { ok: false; code: "not_member" | "eating_out" | "locked" | "not_on_offer"; message: string };

/** Server-side gate for every vote. The UI is never trusted. */
export function checkVote(i: {
  status: "open" | "locked" | "eating_out";
  nowMs: number;
  lockAtMs: number;
  memberIds: string[];
  memberId: string;
  dishId: string;
  optionA: string | null;
  optionB: string | null;
}): VoteCheck {
  if (!i.memberIds.includes(i.memberId)) return { ok: false, code: "not_member", message: "Only household members can vote." };
  if (i.status === "eating_out") return { ok: false, code: "eating_out", message: "This day is marked as eating out. No voting." };
  if (i.status === "locked" || i.nowMs >= i.lockAtMs) return { ok: false, code: "locked", message: "Voting has closed for this day." };
  if (i.dishId !== i.optionA && i.dishId !== i.optionB) return { ok: false, code: "not_on_offer", message: "That dish isn't one of today's two options." };
  return { ok: true };
}
