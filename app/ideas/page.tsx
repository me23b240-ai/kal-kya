import Link from "next/link";
import Header from "@/components/Header";
import SavedIdeas from "@/components/SavedIdeas";
import TabBar from "@/components/TabBar";
import { admin, loadHousehold, loadMembers, loadSingleHousehold } from "@/lib/meal/server";
import { loadSavedIdeas } from "@/lib/meal/ideas";
import { tintFor } from "@/lib/meal/visual";

export const dynamic = "force-dynamic";

export default async function IdeasPage({ searchParams }: { searchParams: Promise<{ as?: string; household?: string }> }) {
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
  const nameOf = (id: string | null) => (id ? rawMembers.find((m) => m.id === id)?.name ?? "Someone" : "Someone");
  const ideas = await loadSavedIdeas(db, household.id);

  return (
    <main className="wrap" data-theme={isSolo ? "single" : undefined}>
      <Header household={household.name} members={isSolo ? undefined : members} viewerId={isSolo ? undefined : viewer.id} />
      <p className="lede"><Link href={isSolo ? "/solo" : `/?as=${viewer.id}`}>{"\u2190"} Back</Link></p>
      <h2 className="day">Saved ideas</h2>
      <SavedIdeas viewerId={viewer.id} ideas={ideas} isSolo={isSolo} memberNameOf={nameOf} />
      <TabBar mode={isSolo ? "single" : "family"} viewerId={isSolo ? undefined : viewer.id} />
    </main>
  );
}
