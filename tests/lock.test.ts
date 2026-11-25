import { describe, it, expect } from "vitest";
import { resolveLock, checkVote, tallyVotes, type LockInput } from "../lib/meal/lock";

const A = "dish-a";
const B = "dish-b";
const ORDER = ["mom", "dad", "sis", "me"]; // turn_order 1..4

const base = (over: Partial<LockInput> = {}): LockInput => ({
  optionA: A, optionB: B, votes: [], memberOrder: ORDER,
  turnMemberId: "mom", tiePicks: {}, passed: [], ...over,
});
const tie = [
  { memberId: "mom", dishId: A }, { memberId: "dad", dishId: A },
  { memberId: "sis", dishId: B }, { memberId: "me", dishId: B },
];

describe("resolveLock", () => {
  it("clear winner: most votes wins", () => {
    const r = resolveLock(base({ votes: [
      { memberId: "mom", dishId: B }, { memberId: "dad", dishId: B },
      { memberId: "sis", dishId: B }, { memberId: "me", dishId: A },
    ] }));
    expect(r).toMatchObject({ winner: B, lockedBy: "votes", tally: { a: 1, b: 3 }, tied: false });
    expect(r.nextTurnMemberId).toBeNull();
  });

  it("no votes: option A wins by default, turn does not move", () => {
    const r = resolveLock(base());
    expect(r).toMatchObject({ winner: A, lockedBy: "default", tied: false, nextTurnMemberId: null });
  });

  it("tie decided by the turn holder, then the turn moves to the next member", () => {
    const r = resolveLock(base({ votes: tie, tiePicks: { mom: B } }));
    expect(r).toMatchObject({ winner: B, lockedBy: "turn", deciderId: "mom", skips: [], nextTurnMemberId: "dad" });
  });

  it("silent turn holder is skipped, next member with a pick decides", () => {
    const r = resolveLock(base({ votes: tie, tiePicks: { dad: A } }));
    expect(r).toMatchObject({ winner: A, lockedBy: "turn", deciderId: "dad", nextTurnMemberId: "sis" });
    expect(r.skips).toEqual([{ memberId: "mom", reason: "silent" }]);
  });

  it("manual pass is recorded as 'pass' and the next member decides", () => {
    const r = resolveLock(base({ votes: tie, passed: ["mom"], tiePicks: { dad: B } }));
    expect(r).toMatchObject({ winner: B, lockedBy: "turn", deciderId: "dad" });
    expect(r.skips).toEqual([{ memberId: "mom", reason: "pass" }]);
  });

  it("everyone skips: option A wins by default, all skips recorded, turn moves one place", () => {
    const r = resolveLock(base({ votes: tie, passed: ["mom", "dad"] }));
    expect(r).toMatchObject({ winner: A, lockedBy: "default", tied: true, deciderId: null, nextTurnMemberId: "dad" });
    expect(r.skips).toEqual([
      { memberId: "mom", reason: "pass" }, { memberId: "dad", reason: "pass" },
      { memberId: "sis", reason: "silent" }, { memberId: "me", reason: "silent" },
    ]);
  });

  it("the turn wraps around the member list", () => {
    const r = resolveLock(base({ votes: tie, turnMemberId: "me", tiePicks: { me: A } }));
    expect(r).toMatchObject({ lockedBy: "turn", deciderId: "me", nextTurnMemberId: "mom" });
  });

  it("double vote is counted once (last vote wins)", () => {
    expect(tallyVotes(A, B, [{ memberId: "mom", dishId: A }, { memberId: "mom", dishId: A }])).toEqual({ a: 1, b: 0 });
    expect(tallyVotes(A, B, [{ memberId: "mom", dishId: A }, { memberId: "mom", dishId: B }])).toEqual({ a: 0, b: 1 });
  });

  it("votes for a dish not on offer, or from a non-member, are ignored", () => {
    const r = resolveLock(base({ votes: [{ memberId: "mom", dishId: "dish-z" }, { memberId: "stranger", dishId: B }] }));
    expect(r).toMatchObject({ winner: A, lockedBy: "default", tally: { a: 0, b: 0 } });
  });
});

describe("checkVote", () => {
  const ok = {
    status: "open" as const, nowMs: 1000, lockAtMs: 5000, memberIds: ORDER,
    memberId: "mom", dishId: A, optionA: A, optionB: B,
  };
  it("accepts a valid vote", () => expect(checkVote(ok)).toEqual({ ok: true }));
  it("rejects a vote for a dish not on offer", () =>
    expect(checkVote({ ...ok, dishId: "dish-z" })).toMatchObject({ ok: false, code: "not_on_offer" }));
  it("rejects a vote after lock (status locked)", () =>
    expect(checkVote({ ...ok, status: "locked" })).toMatchObject({ ok: false, code: "locked" }));
  it("rejects a vote after lock time even if not yet resolved", () =>
    expect(checkVote({ ...ok, nowMs: 5000 })).toMatchObject({ ok: false, code: "locked" }));
  it("rejects a non-member", () =>
    expect(checkVote({ ...ok, memberId: "stranger" })).toMatchObject({ ok: false, code: "not_member" }));
  it("rejects a vote on an eating-out day", () =>
    expect(checkVote({ ...ok, status: "eating_out" })).toMatchObject({ ok: false, code: "eating_out" }));
});
