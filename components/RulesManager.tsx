"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Rule = { id: string; member_id: string | null; kind: "allergy" | "dislike"; value: string };
type MemberLite = { id: string; name: string };

export default function RulesManager({
  viewerId, viewerIsCook, members, rules, suggestions, isSolo = false,
}: {
  viewerId: string; viewerIsCook: boolean; members: MemberLite[]; rules: Rule[]; suggestions: string[]; isSolo?: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<string>(viewerId);
  const [kind, setKind] = useState<"allergy" | "dislike">("dislike");
  const [value, setValue] = useState("");

  const nameOf = (id: string | null) => (id ? members.find((m) => m.id === id)?.name ?? "Someone" : "Whole household");
  const canEdit = (r: Rule) => r.member_id === viewerId || viewerIsCook;
  const householdField = isSolo ? "single" : "family";

  async function add() {
    const v = value.trim().toLowerCase();
    if (!v) return;
    setBusy("add"); setError(null);
    try {
      const res = await fetch("/api/rules", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: viewerId, targetMemberId: target || null, kind, value: v, household: householdField }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Couldn't save that. Try again.");
      setValue("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that. Try again.");
    } finally {
      setBusy(null);
      startTransition(() => router.refresh());
    }
  }

  async function remove(ruleId: string) {
    setBusy(ruleId); setError(null);
    try {
      const res = await fetch("/api/rules", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: viewerId, ruleId, household: householdField }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Couldn't remove that. Try again.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't remove that. Try again.");
    } finally {
      setBusy(null);
      startTransition(() => router.refresh());
    }
  }

  return (
    <section className="panel" aria-label="Allergies and dislikes">
      <h3>Allergies and dislikes</h3>
      <p className="note">
        {isSolo
          ? "Allergies and dislikes both keep a dish off your list entirely in single mode."
          : "Allergies keep a dish off the table entirely. Dislikes never hide a dish - they just show who isn't keen, and the vote still decides."}
      </p>

      {rules.length === 0 ? (
        <p className="note">No allergies or dislikes added yet.</p>
      ) : (
        <ul className="rules-list">
          {rules.map((r) => (
            <li key={r.id} className="rules-row">
              <span className={`tag ${r.kind === "allergy" ? "tag-allergy" : "tag-dislike"}`}>{r.kind}</span>
              <span className="rules-value">{r.value}</span>
              <span className="note">{nameOf(r.member_id)}</span>
              {canEdit(r) && (
                <button className="btn btn-quiet" onClick={() => remove(r.id)} disabled={busy === r.id}>
                  {busy === r.id ? "..." : "Remove"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="rules-add">
        <label className="field">
          For
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value={viewerId}>Me</option>
            {viewerIsCook && members.filter((m) => m.id !== viewerId).map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
            {viewerIsCook && !isSolo && <option value="">Whole household</option>}
          </select>
        </label>
        <label className="field">
          Kind
          <select value={kind} onChange={(e) => setKind(e.target.value as "allergy" | "dislike")}>
            <option value="dislike">Dislike</option>
            <option value="allergy">Allergy</option>
          </select>
        </label>
        <label className="field">
          Ingredient
          <input list="rule-suggestions" value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. aloo" />
          <datalist id="rule-suggestions">
            {suggestions.map((s) => <option key={s} value={s} />)}
          </datalist>
        </label>
        <button className="btn btn-saffron" onClick={add} disabled={busy === "add" || !value.trim()}>
          {busy === "add" ? "Adding..." : "Add"}
        </button>
      </div>
      {error && <p className="alert" role="alert">{error}</p>}
    </section>
  );
}
