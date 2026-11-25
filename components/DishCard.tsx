import type { DishView } from "@/lib/meal/types";

type Props = { dish: DishView; mine?: boolean; busy?: boolean; onPick?: () => void; cta?: string };

export function DishFace({ dish }: { dish: DishView }) {
  return (
    <>
      <span className="tile" style={{ background: dish.tint }} aria-hidden="true">{dish.emoji}</span>
      <span className="dish-text">
        <span className="dish-name">{dish.name}</span>
        {dish.nameHi && <span className="dish-hi" lang="hi">{dish.nameHi}</span>}
      </span>
    </>
  );
}

export default function DishCard({ dish, mine, busy, onPick, cta = "Vote for this" }: Props) {
  return (
    <button type="button" className="dish" data-mine={mine ? "true" : undefined} aria-pressed={!!mine} disabled={busy} onClick={onPick}>
      <span className="dish-row"><DishFace dish={dish} /></span>
      <span className="dish-cta">{mine ? "✓ Your vote" : cta}</span>
    </button>
  );
}
