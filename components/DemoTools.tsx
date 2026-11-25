"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function DemoTools({
  viewerId, planDayId, day, mode = "family",
}: { viewerId: string; planDayId: string | null; day: string; mode?: "family" | "single" }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    if (!resetDone) return;
    const t = setTimeout(() => setResetDone(false), 3000);
    return () => clearTimeout(t);
  }, [resetDone]);

  async function lockNow() {
    setBusy("lock"); setError(null);
    try {
      const res = await fetch("/api/lock-now", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: viewerId, planDayId, day }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Couldn't lock. Try again.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't lock. Try again.");
    } finally {
      setBusy(null);
      startTransition(() => router.refresh());
    }
  }

  async function resetDemo() {
    setBusy("reset"); setError(null);
    try {
      const res = await fetch("/api/reset-demo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ household: mode }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Couldn't reset. Try again.");
      setResetDone(true);
      setConfirmReset(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't reset. Try again.");
    } finally {
      setBusy(null);
      startTransition(() => router.refresh());
    }
  }

  return (
    <details className="demo-disclosure">
      <summary>Demo tools</summary>
      <div className="demo-disclosure-body">
        <p className="note">Shared demo: other visitors may see your changes.</p>
        {mode === "family" && planDayId && (
          <button className="btn btn-dashed" onClick={lockNow} disabled={busy !== null}>
            {busy === "lock" ? "Locking..." : "Lock now"} <span className="tag">demo only</span>
          </button>
        )}
        {confirmReset ? (
          <div className="confirm">
            <p>This clears votes, locks, rules and shopping items for this demo household.</p>
            <div className="row">
              <button className="btn btn-quiet" onClick={() => setConfirmReset(false)} disabled={busy !== null}>Cancel</button>
              <button className="btn btn-ink" onClick={resetDemo} disabled={busy !== null}>{busy === "reset" ? "Resetting..." : "Yes, reset"}</button>
            </div>
          </div>
        ) : (
          <button className="btn btn-dashed" onClick={() => setConfirmReset(true)} disabled={busy !== null}>
            Reset demo <span className="tag">demo only</span>
          </button>
        )}
        {resetDone && <p className="alert" role="status">Reset done.</p>}
        {error && <p className="alert" role="alert">{error}</p>}
      </div>
    </details>
  );
}
