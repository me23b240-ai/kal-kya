"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function ResetDemoButton() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function run() {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/reset-demo", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Couldn't reset. Try again.");
      setDone(true);
      setConfirm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't reset. Try again.");
    } finally {
      setBusy(false);
      startTransition(() => router.refresh());
    }
  }

  return (
    <section className="panel demo-tools" aria-label="Demo tools">
      <h3>Demo tools</h3>
      <p className="note">Shared demo: other visitors may see your changes.</p>
      {confirm ? (
        <div className="confirm">
          <p>This clears votes, locks, rules and shopping items for the demo family.</p>
          <div className="row">
            <button className="btn btn-quiet" onClick={() => setConfirm(false)} disabled={busy}>Cancel</button>
            <button className="btn btn-ink" onClick={run} disabled={busy}>{busy ? "Resetting..." : "Yes, reset"}</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-dashed" onClick={() => { setConfirm(true); setDone(false); }}>
          Reset demo <span className="tag">demo only</span>
        </button>
      )}
      {done && <p className="alert" role="status">Reset done.</p>}
      {error && <p className="alert" role="alert">{error}</p>}
    </section>
  );
}
