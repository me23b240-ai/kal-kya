import Link from "next/link";
import Header from "@/components/Header";
import SettingsForm from "@/components/SettingsForm";
import RulesManager from "@/components/RulesManager";
import CooksPicks from "@/components/CooksPicks";
import MealGoalPicker from "@/components/MealGoalPicker";
import TabBar from "@/components/TabBar";
import { admin, loadAllDishes, loadContainsSuggestions, loadFlaggedDishIds, loadHousehold, loadMembers, loadRules, loadSingleHousehold } from "@/lib/meal/server";
import { tintFor } from "@/lib/meal/visual";

export const dynamic = "force-dynamic";

export default async function RulesPage({ searchParams }: { searchParams: Promise<{ as?: string; household?: string }> }) {
  const { as, household: householdParam } = await searchParams;
  const isSolo = householdParam === "single";
  const db = admin();
  const household = isSolo ? await loadSingleHousehold(db) : await loadHousehold(db);
  if (!household) {
    return (
      <main className="wrap" data-theme={isSolo ? "single" : undefined}>
        <Header />
        <section className="state state-empty">
          <span className="state-emoji" aria-hidden="true">{"\uD83C\uDFE0"}</span>
          <h3>No household yet</h3>
          <p>Run the seed SQL in the Supabase SQL Editor, then reload.</p>
        </section>
      </main>
    );
  }
  const rawMembers = await loadMembers(db, household.id);
  const members = rawMembers.map((m) => ({ id: m.id, name: m.name, tint: tintFor(m.name), isCook: m.is_cook, voted: false, avatarUrl: null }));
  const viewer = rawMembers.find((m) => m.id === as) ?? rawMembers[0];
  const [rules, suggestions, allDishes, flaggedIds] = await Promise.all([
    loadRules(db, household.id), loadContainsSuggestions(db), loadAllDishes(db), loadFlaggedDishIds(db, household.id),
  ]);

  return (
    <main className="wrap" data-theme={isSolo ? "single" : undefined}>
      <Header household={household.name} members={isSolo ? undefined : members} viewerId={isSolo ? undefined : viewer.id} />
      <p className="lede"><Link href={isSolo ? "/solo" : `/?as=${viewer.id}`}>{"\u2190"} Back</Link></p>
      <h2 className="day">Settings &amp; rules</h2>

      <MealGoalPicker viewerId={viewer.id} currentGoal={household.meal_goal} isSolo={isSolo} />

      {!isSolo && (
        <SettingsForm
          viewerId={viewer.id}
          viewerIsCook={viewer.is_cook}
          planningWindowDays={household.planning_window_days}
          noRepeatDays={household.no_repeat_days}
          lockTime={household.lock_time.slice(0, 5)}
          nudgeEveryDays={household.nudge_every_days}
          useAiPicker={household.use_ai_picker}
        />
      )}

      <RulesManager
        viewerId={viewer.id}
        viewerIsCook={viewer.is_cook}
        members={rawMembers.map((m) => ({ id: m.id, name: m.name }))}
        rules={rules}
        suggestions={suggestions}
        isSolo={isSolo}
      />

      {!isSolo && (
        <CooksPicks
          viewerId={viewer.id}
          viewerIsCook={viewer.is_cook}
          dishes={allDishes}
          flaggedIds={flaggedIds}
          nudgeEveryDays={household.nudge_every_days}
        />
      )}
      <TabBar mode={isSolo ? "single" : "family"} viewerId={isSolo ? undefined : viewer.id} />
    </main>
  );
}
