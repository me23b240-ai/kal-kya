"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Goal = "none" | "quick" | "protein";
const labels: Record<Goal, string> = { none: "No preference", quick: "Quicker meals", protein: "More protein" };

export default function MealGoalPicker({
  viewerId, currentGoal, isSolo = false,
}: { viewerId: string; currentGoal: Goal; isSolo?: boolean }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setGoal(goal: Goal) {
    if (goal === currentGoal) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/meal-goal", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: viewerId, goal, household: isSolo ? "single" : "family" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Couldn't save that. Try again.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that. Try again.");
    } finally {
      setBusy(false);
      startTransition(() => router.refresh());
    }
  }

  return (
    <section className="panel" aria-label="What matters most">
      <h3>What matters most right now?</h3>
      <p className="note">
        Nudges which dish tends to get offered - it never overrides an allergy, and it never hides a dish
        the way an allergy does. "More protein" only has real numbers for some dishes so far (from IFCT 2017
        food values), not guesses, so dishes without a number aren't penalised.
      </p>
      <div className="goal-options">
        {(Object.keys(labels) as Goal[]).map((g) => (
          <button
            key={g} type="button" className="btn btn-ink"
            data-on={currentGoal === g ? "true" : undefined}
            disabled={busy} onClick={() => setGoal(g)}
          >
            {labels[g]}
          </button>
        ))}
      </div>
      {error && <p className="alert" role="alert">{error}</p>}
    </section>
  );
}
