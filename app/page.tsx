import { supabase } from "@/lib/supabase/public";

export const dynamic = "force-dynamic"; // always read fresh from the DB

type Member = { id: string; name: string; is_cook: boolean; turn_order: number | null };

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const { as } = await searchParams;

  const { data: household, error: hErr } = await supabase
    .from("households")
    .select("id, name, mode, lock_time")
    .eq("mode", "family")
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (hErr || !household) {
    return (
      <main className="wrap">
        <h1>Could not load household</h1>
        <p>{hErr?.message ?? "No household found. Did you run seed.sql?"}</p>
      </main>
    );
  }

  const { data } = await supabase
    .from("members")
    .select("id, name, is_cook, turn_order")
    .eq("household_id", household.id)
    .order("turn_order");

  const members: Member[] = data ?? [];
  const current = members.find((m) => m.id === as) ?? members[0];

  return (
    <main className="wrap">
      <h1>{household.name}</h1>
      <p className="muted">
        Mode: {household.mode} · Locks at {household.lock_time}
      </p>

      <h2>View as</h2>
      <nav className="switch">
        {members.map((m) => (
          <a
            key={m.id}
            href={`/?as=${m.id}`}
            aria-current={m.id === current?.id ? "true" : undefined}
          >
            {m.name}
          </a>
        ))}
      </nav>
      <p>Viewing as: <strong>{current?.name}</strong></p>

      <h2>Members</h2>
      <ul className="list">
        {members.map((m) => (
          <li key={m.id}>
            {m.name}
            {m.is_cook ? " (cook)" : ""}
          </li>
        ))}
      </ul>
    </main>
  );
}