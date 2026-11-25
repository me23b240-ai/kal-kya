import Link from "next/link";
import Header from "@/components/Header";
import ModeToggle from "@/components/ModeToggle";
import DayStrip from "@/components/DayStrip";
import PlanWindowButton from "@/components/PlanWindowButton";
import ResetDemoButton from "@/components/ResetDemoButton";
import VoteScreen from "@/components/VoteScreen";
import { buildView } from "@/lib/meal/server";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ as?: string; day?: string }>;
}) {
  const { as, day } = await searchParams;
  const view = await buildView(as, day);

  if (!view) {
    return (
      <main className="wrap">
        <Header modeToggle={<ModeToggle current="family" />} />
        <section className="state state-empty">
          <span className="state-emoji" aria-hidden="true">{"\uD83C\uDFE0"}</span>
          <h3>No household yet</h3>
          <p>Run supabase/seed.sql in the Supabase SQL Editor, then reload.</p>
        </section>
      </main>
    );
  }
  return (
    <main className="wrap">
      <Header household={view.householdName} members={view.members} viewerId={view.viewerId} modeToggle={<ModeToggle current="family" />} />
      <nav className="nav-links" aria-label="More">
        <Link href={`/rules?as=${view.viewerId}`}>Settings &amp; rules</Link>
        <Link href={`/shopping?as=${view.viewerId}`}>Shopping list</Link>
        <Link href={`/ideas?as=${view.viewerId}`}>Saved ideas</Link>
      </nav>
      <DayStrip items={view.strip} selectedDay={view.day} viewerId={view.viewerId} />
      <PlanWindowButton viewerId={view.viewerId} />
      <VoteScreen data={view} />
      {process.env.DEMO_MODE === "true" && <ResetDemoButton />}
    </main>
  );
}
