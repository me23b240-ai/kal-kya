import Link from "next/link";
import Header from "@/components/Header";
import ShoppingScreen from "@/components/ShoppingScreen";
import { admin, currentWindowDays, loadHousehold, loadMembers, loadSingleHousehold } from "@/lib/meal/server";
import { loadShoppingList } from "@/lib/meal/shopping";
import { tintFor } from "@/lib/meal/visual";

export const dynamic = "force-dynamic";

export default async function ShoppingPage({ searchParams }: { searchParams: Promise<{ as?: string; household?: string }> }) {
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
  const nameOf = (id: string) => rawMembers.find((m) => m.id === id)?.name ?? "Someone";

  const list = await loadShoppingList(db, household.id, currentWindowDays(household), nameOf);

  return (
    <main className="wrap" data-theme={isSolo ? "single" : undefined}>
      <Header household={household.name} members={isSolo ? undefined : members} viewerId={isSolo ? undefined : viewer.id} />
      <p className="lede"><Link href={isSolo ? "/solo" : `/?as=${viewer.id}`}>{"\u2190"} Back</Link></p>
      <h2 className="day">Shopping list</h2>
      <ShoppingScreen viewerId={viewer.id} list={list} hideQuantities={isSolo} />
    </main>
  );
}
