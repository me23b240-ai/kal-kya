"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SavedIdea } from "@/lib/meal/ideas";

const effortLabel: Record<string, string> = { low: "Low effort", medium: "Medium effort", high: "High effort" };
const CATEGORY_SUGGESTIONS = ["rice", "curry", "sabji", "dal", "pasta", "snack", "dessert", "soup", "salad", "bread", "drink"];

export default function SavedIdeas({
  viewerId, ideas, isSolo = false, memberNameOf,
}: { viewerId: string; ideas: SavedIdea[]; isSolo?: boolean; memberNameOf: (id: string | null) => string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [effort, setEffort] = useState("");
  const [timeMinutes, setTimeMinutes] = useState("");
  const [category, setCategory] = useState("");

  const householdField = isSolo ? "single" : "family";

  async function post(method: string, body: Record<string, unknown>, key: string) {
    setError(null); setBusy(key);
    try {
      const res = await fetch("/api/ideas", {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: viewerId, household: householdField, ...body }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Something went wrong. Try again.");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      return false;
    } finally {
      setBusy(null);
      startTransition(() => router.refresh());
    }
  }

  async function add() {
    if (!name.trim()) return;
    const ok = await post("POST", {
      name: name.trim(), link: link.trim() || null, effort: effort || null,
      timeMinutes: timeMinutes ? Number(timeMinutes) : null, category: category.trim() || null,
    }, "add");
    if (ok) { setName(""); setLink(""); setEffort(""); setTimeMinutes(""); setCategory(""); }
  }

  const remove = (ideaId: string) => post("DELETE", { ideaId }, ideaId);
  const toggleCooked = (idea: SavedIdea) => post("PATCH", { ideaId: idea.id, cooked: !idea.cooked_at }, `cooked-${idea.id}`);

  return (
    <section className="panel" aria-label="Saved ideas">
      <h3>Saved ideas</h3>
      <p className="note">Bookmark a dish idea from Instagram, YouTube, wherever - with a rough sense of effort, time and category, so it's easy to pick up later.</p>

      {ideas.length === 0 ? (
        <p className="note">Nothing saved yet.</p>
      ) : (
        <ul className="ideas-list">
          {ideas.map((idea) => (
            <li key={idea.id} className="ideas-row" data-cooked={idea.cooked_at ? "true" : undefined}>
              <div className="ideas-text">
                <span className="ideas-name">{idea.name}</span>
                <span className="note">
                  {[idea.category, idea.effort ? effortLabel[idea.effort] : null, idea.time_minutes ? `${idea.time_minutes} min` : null]
                    .filter(Boolean).join(" \u00b7 ")}
                  {idea.added_by ? ` \u00b7 Added by ${memberNameOf(idea.added_by)}` : ""}
                </span>
                {idea.link && (
                  <a href={idea.link} target="_blank" rel="noopener noreferrer">Open link</a>
                )}
              </div>
              <div className="ideas-actions">
                <button className="btn btn-quiet" onClick={() => toggleCooked(idea)} disabled={busy === `cooked-${idea.id}`}>
                  {idea.cooked_at ? "Cooked" : "Mark cooked"}
                </button>
                <button className="btn btn-quiet" onClick={() => remove(idea.id)} disabled={busy === idea.id}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="rules-add">
        <label className="field">Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hyderabadi Dum Biryani" />
        </label>
        <label className="field">Link (optional)
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="e.g. an Instagram reel link" />
        </label>
        <label className="field">Effort
          <select value={effort} onChange={(e) => setEffort(e.target.value)}>
            <option value="">Not sure</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="field">Time to make (minutes)
          <input type="number" min={0} value={timeMinutes} onChange={(e) => setTimeMinutes(e.target.value)} placeholder="e.g. 40" />
        </label>
        <label className="field">Category
          <input list="idea-categories" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. rice, curry, pasta" />
          <datalist id="idea-categories">
            {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
          </datalist>
        </label>
        <button className="btn btn-saffron" onClick={add} disabled={busy === "add" || !name.trim()}>
          {busy === "add" ? "Saving..." : "Save idea"}
        </button>
      </div>
      {error && <p className="alert" role="alert">{error}</p>}
    </section>
  );
}
