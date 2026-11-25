"use client";
import { useState } from "react";
import { Utensils } from "lucide-react";
import type { DishView } from "@/lib/meal/types";
import DishDetailModal from "./DishDetailModal";

type Props = { dish: DishView; mine?: boolean; busy?: boolean; onPick?: () => void; cta?: string; showProtein?: boolean };

const styleLabel: Record<DishView["mealStyle"], string> = {
  with_staples: "With rice and rotis",
  complete: "Complete meal",
};

function metaLine(dish: DishView): string | null {
  const parts: string[] = [];
  if (dish.pickedByName) parts.push(`Picked by ${dish.pickedByName}`);
  if (dish.dislikedBy.length > 0) parts.push(`Not a favourite of ${dish.dislikedBy.join(", ")}`);
  if (dish.aiReason) parts.push(dish.aiReason);
  return parts.length ? parts.join(" \u00b7 ") : null;
}

export function DishFace({ dish }: { dish: DishView }) {
  const meta = metaLine(dish);
  return (
    <>
      {dish.imageUrl ? (
        <span className="tile tile-photo" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dish.imageUrl} alt="" loading="lazy" decoding="async" />
        </span>
      ) : (
        <span className="tile" style={{ background: dish.tint }} aria-hidden="true">
          <Utensils size={40} strokeWidth={1.75} color="var(--ink)" />
        </span>
      )}
      <span className="dish-text">
        <span className="dish-name">{dish.name}</span>
        {dish.nameHi && <span className="dish-hi" lang="hi">{dish.nameHi}</span>}
        <span className="dish-style">{styleLabel[dish.mealStyle]}</span>
        {meta && <span className="dish-meta">{meta}</span>}
      </span>
    </>
  );
}

export default function DishCard({ dish, mine, busy, onPick, cta = "Vote for this", showProtein = false }: Props) {
  const [detailOpen, setDetailOpen] = useState(false);
  return (
    <div className="dish" data-mine={mine ? "true" : undefined}>
      <button type="button" className="dish-main" aria-pressed={!!mine} disabled={busy} onClick={onPick}>
        <span className="dish-row"><DishFace dish={dish} /></span>
        <span className="dish-cta">{mine ? "\u2713 Your vote" : cta}</span>
      </button>
      <button type="button" className="dish-details-btn" onClick={() => setDetailOpen(true)}>
        Ingredients &amp; steps
      </button>
      {detailOpen && <DishDetailModal dish={dish} onClose={() => setDetailOpen(false)} showProtein={showProtein} />}
    </div>
  );
}
