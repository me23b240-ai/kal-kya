"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function PlanWindowButton({ viewerId }: { viewerId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function run() {
    setBusy(true); setError(null); setDone(false);
    try {
      const res = await fetch("/api/plan-window", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: viewerId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not plan the week. Try again.");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not plan the week. Try again.");
    } finally {
      setBusy(false);
      startTransition(() => router.refresh());
    }
  }

  return (
    <div className="plan-window">
      <button className="btn btn-quiet" onClick={run} disabled={busy}>
        {busy ? "Planning..." : "Plan the next days"}
      </button>
      {done && <p className="note">{"Done \u2014 check the day strip above. (Already-planned days are never touched.)"}</p>}
      {error && <p className="alert" role="alert">{error}</p>}
    </div>
  );
}
