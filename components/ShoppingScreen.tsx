"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ShoppingGroup, ShoppingList } from "@/lib/meal/shopping";

export default function ShoppingScreen({ viewerId, list, hideQuantities = false }: { viewerId: string; list: ShoppingList; hideQuantities?: boolean }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [newItem, setNewItem] = useState("");
  const [newQty, setNewQty] = useState("");

  async function post(path: string, body: Record<string, unknown>, key: string) {
    setError(null); setBusy(key);
    try {
      const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId: viewerId, ...body }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Something went wrong. Try again.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(null);
      startTransition(() => router.refresh());
    }
  }

  const toggleHave = (g: ShoppingGroup) => post("/api/shopping/have", { item: g.item, haveAtHome: !g.haveAtHome }, `have-${g.key}`);
  const toggleBought = (g: ShoppingGroup) => post("/api/shopping/bought", { item: g.item, bought: !g.bought }, `bought-${g.key}`);
  const addManual = async () => {
    if (!newItem.trim()) return;
    await post("/api/shopping/add", { item: newItem.trim(), qty: hideQuantities ? null : (newQty.trim() || null) }, "add");
    setNewItem(""); setNewQty("");
  };

  const toBuy = list.groups.filter((g) => !g.haveAtHome);
  const haveAtHome = list.groups.filter((g) => g.haveAtHome);
  const allBought = toBuy.length > 0 && toBuy.every((g) => g.bought);

  function occurrenceText(g: ShoppingGroup): string {
    if (hideQuantities) return g.occurrences.map((o) => o.label).join("; ");
    return g.occurrences.map((o) => (o.qty ? `${o.label} (${o.qty})` : o.label)).join("; ");
  }

  async function share() {
    const lines = toBuy.filter((g) => !g.bought).map((g) => {
      if (hideQuantities) return g.item;
      const qtys = g.occurrences.filter((o) => o.qty).map((o) => o.qty).join(", ");
      return qtys ? `${g.item} (${qtys})` : g.item;
    });
    const text = lines.length ? `Kal Kya? shopping list\n\n${lines.join("\n")}` : "Kal Kya? shopping list\n\nNothing left to buy.";
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        setShareMsg("Copied to clipboard.");
      }
    } catch {
      // cancelled share sheet - not an error
    }
  }

  const manualForm = (
    <section className="panel" aria-label="Add an item">
      <h3>Add an item</h3>
      <div className="rules-add">
        <label className="field">Item
          <input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="e.g. milk" />
        </label>
        {!hideQuantities && (
          <label className="field">Quantity (optional)
            <input value={newQty} onChange={(e) => setNewQty(e.target.value)} placeholder="e.g. 1 litre" />
          </label>
        )}
        <button className="btn btn-saffron" onClick={addManual} disabled={busy === "add" || !newItem.trim()}>
          {busy === "add" ? "Adding..." : "Add"}
        </button>
      </div>
    </section>
  );

  if (list.groups.length === 0) {
    return (
      <div className="stack">
        <section className="state state-empty">
          <span className="state-emoji" aria-hidden="true">{"\uD83D\uDED2"}</span>
          <h3>Nothing on the list yet</h3>
          <p>It fills in once a day is locked, or add something yourself below.</p>
        </section>
        {manualForm}
      </div>
    );
  }

  return (
    <div className="stack">
      {list.noIngredientDays.map((d) => (
        <p key={d.dayLabel + d.dishName} className="alert">{d.dishName} ({d.dayLabel}) has no ingredients listed yet, so nothing was added for it.</p>
      ))}

      <section className="panel" aria-label="To buy">
        <div className="shopping-head">
          <h3>To buy</h3>
          <button className="btn btn-quiet" onClick={share}>Share list</button>
        </div>
        {hideQuantities && <p className="note">Amounts depend on you.</p>}
        {shareMsg && <p className="alert" role="status">{shareMsg}</p>}
        {allBought && <p className="note">Everything's bought. Nice.</p>}
        {toBuy.length === 0 && <p className="note">Nothing to buy - it's all marked as already at home.</p>}
        <ul className="shopping-list">
          {toBuy.map((g) => (
            <li key={g.key} className="shopping-row" data-bought={g.bought ? "true" : undefined}>
              <button className="shopping-check" aria-pressed={g.bought} onClick={() => toggleBought(g)} disabled={busy === `bought-${g.key}`}>
                {g.bought ? "\u2713" : ""}
              </button>
              <span className="shopping-text">
                <span className="shopping-item">{g.item}</span>
                <span className="note">{occurrenceText(g)}</span>
                {g.bought && g.boughtByName && <span className="note">Bought by {g.boughtByName}</span>}
              </span>
              <button className="btn btn-quiet" onClick={() => toggleHave(g)} disabled={busy === `have-${g.key}`}>Have at home</button>
            </li>
          ))}
        </ul>
      </section>

      {haveAtHome.length > 0 && (
        <section className="panel" aria-label="Already have">
          <h3>Already have</h3>
          <ul className="shopping-list">
            {haveAtHome.map((g) => (
              <li key={g.key} className="shopping-row">
                <span className="shopping-text"><span className="shopping-item">{g.item}</span></span>
                <button className="btn btn-quiet" onClick={() => toggleHave(g)} disabled={busy === `have-${g.key}`}>Move to buy list</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {manualForm}
      {error && <p className="alert" role="alert">{error}</p>}
    </div>
  );
}
