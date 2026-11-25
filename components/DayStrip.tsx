import Link from "next/link";
import type { DayStripItem, DayStripState } from "@/lib/meal/types";

const labelFor: Record<DayStripState, string> = {
  unplanned: "Not planned",
  open: "Open",
  locked: "Locked",
  eating_out: "Eating out",
  not_enough: "Needs attention",
};

export default function DayStrip({
  items, selectedDay, viewerId, basePath = "/",
}: { items: DayStripItem[]; selectedDay: string; viewerId?: string; basePath?: string }) {
  return (
    <nav className="daystrip" aria-label="Days">
      {items.map((it) => (
        <Link
          key={it.day}
          href={viewerId ? `${basePath}?as=${viewerId}&day=${it.day}` : `${basePath}?day=${it.day}`}
          className="day-chip"
          data-state={it.state}
          aria-current={it.day === selectedDay ? "true" : undefined}
        >
          <span className="day-chip-label">{it.label}</span>
          <span className="day-chip-state">{labelFor[it.state]}</span>
        </Link>
      ))}
    </nav>
  );
}
