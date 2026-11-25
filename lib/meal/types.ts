import type { LockedBy, SkipReason } from "./lock";

export type DishView = { id: string; name: string; nameHi: string | null; emoji: string; tint: string };
export type MemberView = { id: string; name: string; tint: string; isCook: boolean; voted: boolean };

export type ViewData = {
  householdName: string;
  lockTime: string;
  dayLabel: string;
  members: MemberView[];
  viewerId: string;
  viewerIsCook: boolean;
  state: "open" | "locked" | "eating_out" | "not_enough";
  planDayId: string | null;
  lockAtMs: number | null;
  options: DishView[]; // [A, B] while open
  myVote: string | null;
  tie: null | { tapperName: string; viewerIsTapper: boolean; myPick: string | null };
  result: null | {
    winner: DishView;
    lockedBy: LockedBy;
    tally: { a: number; b: number };
    deciderName: string | null;
    skipped: { name: string; reason: SkipReason }[];
  };
};
