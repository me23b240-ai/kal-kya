import Header from "@/components/Header";
import VoteScreen from "@/components/VoteScreen";
import { buildView } from "@/lib/meal/server";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const { as } = await searchParams;
  const view = await buildView(as);

  if (!view) {
    return (
      <main className="wrap">
        <Header />
        <section className="state state-empty">
          <span className="state-emoji" aria-hidden="true">🍳</span>
          <h3>No household yet</h3>
          <p>Run supabase/seed.sql in the Supabase SQL Editor, then reload.</p>
        </section>
      </main>
    );
  }
  return (
    <main className="wrap">
      <Header household={view.householdName} members={view.members} viewerId={view.viewerId} />
      <VoteScreen data={view} />
    </main>
  );
}
