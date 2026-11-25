"use client";
import { useEffect, useRef } from "react";
import type { DishView } from "@/lib/meal/types";

function timeLine(dish: DishView): string | null {
  if (!dish.handsOnMinutes && !dish.totalMinutes) return null;
  const parts: string[] = [];
  if (dish.handsOnMinutes) parts.push(`${dish.handsOnMinutes} min hands-on`);
  if (dish.totalMinutes) parts.push(`${dish.totalMinutes} min total`);
  return `${parts.join(", ")} (estimate, not tested)`;
}

export default function DishDetailModal({
  dish, onClose, showProtein = false,
}: { dish: DishView; onClose: () => void; showProtein?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const time = timeLine(dish);
  const showProteinLine = showProtein && dish.proteinG != null;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!el.open) el.showModal();
    const onCancel = (e: Event) => { e.preventDefault(); onClose(); };
    el.addEventListener("cancel", onCancel);
    return () => el.removeEventListener("cancel", onCancel);
  }, [onClose]);

  return (
    <dialog ref={ref} className="dish-dialog" onClose={onClose}>
      <div className="dish-dialog-head">
        <h3 className="dish-name">{dish.name}</h3>
        {dish.nameHi && <p className="dish-hi" lang="hi">{dish.nameHi}</p>}
        {(time || showProteinLine) && (
          <p className="note">
            {[time, showProteinLine ? `about ${dish.proteinG} g protein per serving (estimate)` : null]
              .filter(Boolean).join(" \u00b7 ")}
          </p>
        )}
      </div>

      <section>
        <h4>Ingredients</h4>
        {dish.ingredients.length === 0 ? (
          <p className="note">No ingredients listed yet.</p>
        ) : (
          <ul className="dish-ingredients">
            {dish.ingredients.map((ing, i) => (
              <li key={i}>{ing.item}{ing.qty ? ` \u2014 ${ing.qty}` : ""}</li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h4>How to make it</h4>
        {dish.recipeSteps && dish.recipeSteps.length > 0 ? (
          <>
            <p className="alert">AI-drafted steps, not tested in a real kitchen. Use your judgement and adjust salt and spice to taste.</p>
            <ol className="dish-steps">
              {dish.recipeSteps.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          </>
        ) : (
          <p className="note">No steps added yet.</p>
        )}
      </section>

      <button type="button" className="btn btn-quiet" onClick={onClose}>Close</button>
    </dialog>
  );
}
