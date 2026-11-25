"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  viewerId: string; viewerIsCook: boolean;
  planningWindowDays: number; noRepeatDays: number; lockTime: string; nudgeEveryDays: number; useAiPicker: boolean;
};

export default function SettingsForm({ viewerId, viewerIsCook, planningWindowDays, noRepeatDays, lockTime, nudgeEveryDays, useAiPicker }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [form, setForm] = useState({ planningWindowDays, noRepeatDays, lockTime, nudgeEveryDays, useAiPicker });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true); setError(null); setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: viewerId, ...form }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Couldn't save. Try again.");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save. Try again.");
    } finally {
      setBusy(false);
      startTransition(() => router.refresh());
    }
  }

  if (!viewerIsCook) {
    return (
      <section className="panel" aria-label="Household settings">
        <h3>Household settings</h3>
        <p className="note">
          Plans {planningWindowDays} day{planningWindowDays === 1 ? "" : "s"} ahead, avoids repeating a dish for {noRepeatDays} days,
          locks each day at {lockTime}, nudges a cook's pick in every {nudgeEveryDays} days, and uses {useAiPicker ? "the AI picker (with an automatic fallback)" : "the rules-only picker"}.
          Only the cook can change this.
        </p>
      </section>
    );
  }

  return (
    <section className="panel" aria-label="Household settings">
      <h3>Household settings</h3>
      <label className="field">
        Plan ahead (1 to 7 days)
        <input type="number" min={1} max={7} value={form.planningWindowDays}
          onChange={(e) => setForm((f) => ({ ...f, planningWindowDays: Number(e.target.value) }))} />
      </label>
      <label className="field">
        Don't repeat a dish for (0 to 14 days)
        <input type="number" min={0} max={14} value={form.noRepeatDays}
          onChange={(e) => setForm((f) => ({ ...f, noRepeatDays: Number(e.target.value) }))} />
      </label>
      <label className="field">
        Locks each day at
        <input type="time" value={form.lockTime}
          onChange={(e) => setForm((f) => ({ ...f, lockTime: e.target.value }))} />
      </label>
      <label className="field">
        Nudge a cook's pick in every (2 to 7 days)
        <input type="number" min={2} max={7} value={form.nudgeEveryDays}
          onChange={(e) => setForm((f) => ({ ...f, nudgeEveryDays: Number(e.target.value) }))} />
      </label>
      <label className="field field-row">
        <input type="checkbox" checked={form.useAiPicker} onChange={(e) => setForm((f) => ({ ...f, useAiPicker: e.target.checked }))} />
        Use the AI picker (falls back automatically if it's ever unavailable)
      </label>
      <button className="btn btn-saffron" onClick={save} disabled={busy}>{busy ? "Saving..." : "Save settings"}</button>
      {saved && <p className="alert" role="status">Saved.</p>}
      {error && <p className="alert" role="alert">{error}</p>}
    </section>
  );
}
