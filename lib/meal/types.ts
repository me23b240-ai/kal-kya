import type { LockedBy, SkipReason } from "./lock";

export type DishIngredient = { item: string; qty?: string };

export type DishView = {
  id: string;
  name: string;
  nameHi: string | null;
  emoji: string;
  tint: string;
  imageUrl: string | null;
  mealStyle: "with_staples" | "complete";
  handsOnMinutes: number | null;
  totalMinutes: number | null;
  proteinG: number | null;
  proteinBasis: string | null;
  ingredients: DishIngredient[];
  recipeSteps: string[] | null;
  dislikedBy: string[];
  pickedByName: string | null;
  aiReason: string | null;
};
export type MemberView = { id: string; name: string; tint: string; isCook: boolean; voted: boolean; avatarUrl: string | null };

export type DayStripState = "unplanned" | "open" | "locked" | "eating_out" | "not_enough";
export type DayStripItem = { day: string; label: string; state: DayStripState };

export type ViewData = {
  householdName: string;
  lockTime: string;
  day: string;
  dayLabel: string;
  planningWindowDays: number;
  strip: DayStripItem[];
  members: MemberView[];
  viewerId: string;
  viewerIsCook: boolean;
  state: "open" | "locked" | "eating_out" | "not_enough";
  planDayId: string | null;
  lockAtMs: number | null;
  options: DishView[];
  myVote: string | null;
  shortageReason: string | null;
  tie: null | { tapperName: string; viewerIsTapper: boolean; myPick: string | null };
  result: null | {
    winner: DishView;
    lockedBy: LockedBy;
    tally: { a: number; b: number };
    deciderName: string | null;
    skipped: { name: string; reason: SkipReason }[];
    headcount: { eatingIds: string[]; outIds: string[] };
    myMealPrompt: null | { response: "eating" | "out" | null };
  };
};

export type SingleViewData = {
  householdName: string;
  day: string;
  dayLabel: string;
  planningWindowDays: number;
  strip: DayStripItem[];
  viewerId: string;
  state: "open" | "picked" | "eating_out" | "not_enough";
  planDayId: string | null;
  options: DishView[];
  myPick: string | null;
  shortageReason: string | null;
};
