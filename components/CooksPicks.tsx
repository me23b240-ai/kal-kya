"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type DishLite = { id: string; name: string };

export default function CooksPicks({
  viewerId, viewerIsCook, dishes, flaggedIds, nudgeEveryDays,
}: { viewerId: string; viewerIsCook: boolean; dishes: DishLite[]; flaggedIds: string[]; nudgeEveryDays: number }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const flagged = new Set(flaggedIds);

  async function toggle(dishId: string, on: boolean) {
    setBusy(dishId); setError(null);
    try {
      const res = await fetch("/api/cooks-picks", {
        method: on ? "POST" : "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: viewerId, dishId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Couldn't save that. Try again.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that. Try again.");
    } finally {
      setBusy(null);
      startTransition(() => router.refresh());
    }
  }

  if (!viewerIsCook) {
    const names = dishes.filter((d) => flagged.has(d.id)).map((d) => d.name);
    return (
      <section className="panel" aria-label="Cook's picks">
        <h3>Cook's picks</h3>
        <p className="note">{names.length ? `The cook makes sure ${names.join(", ")} comes up for a vote at least every ${nudgeEveryDays} days.` : "The cook hasn't picked anything yet."}</p>
      </section>
    );
  }

  return (
    <section className="panel" aria-label="Cook's picks">
      <h3>Cook's picks</h3>
      <p className="note">Flag a dish to make sure it gets offered for a vote at least every {nudgeEveryDays} days. It still has to win - this doesn't skip voting.</p>
      <ul className="picks-list">
        {dishes.map((d) => (
          <li key={d.id} className="picks-row">
            <label>
              <input type="checkbox" checked={flagged.has(d.id)} disabled={busy === d.id} onChange={(e) => toggle(d.id, e.target.checked)} />
              {d.name}
            </label>
          </li>
        ))}
      </ul>
      {error && <p className="alert" role="alert">{error}</p>}
    </section>
  );
}
