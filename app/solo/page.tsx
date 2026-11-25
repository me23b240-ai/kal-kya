import Header from "@/components/Header";
import ModeToggle from "@/components/ModeToggle";
import DayStrip from "@/components/DayStrip";
import PickScreen from "@/components/PickScreen";
import TabBar from "@/components/TabBar";
import { buildSingleView } from "@/lib/meal/server";

export const dynamic = "force-dynamic";

export default async function SoloHome({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const { day } = await searchParams;
  const view = await buildSingleView(day);

  if (!view) {
    return (
      <main className="wrap" data-theme="single">
        <Header modeToggle={<ModeToggle current="single" />} />
        <section className="state state-empty">
          <span className="state-emoji" aria-hidden="true">{"\uD83C\uDFE0"}</span>
          <h3>No solo household yet</h3>
          <p>Run the single-mode SQL in the Supabase SQL Editor, then reload.</p>
        </section>
      </main>
    );
  }
  return (
    <main className="wrap" data-theme="single">
      <Header household={view.householdName} modeToggle={<ModeToggle current="single" />} />
      <DayStrip items={view.strip} selectedDay={view.day} basePath="/solo" />
      <PickScreen data={view} />
      <TabBar mode="single" />
    </main>
  );
}
