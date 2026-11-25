"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import DishCard from "./DishCard";
import type { SingleViewData } from "@/lib/meal/types";

export default function PickScreen({ data }: { data: SingleViewData }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOut, setConfirmOut] = useState(false);

  async function post(path: string, body: Record<string, unknown>, key: string) {
    setError(null); setBusy(key);
    try {
      const res = await fetch(path, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: data.viewerId, planDayId: data.planDayId, day: data.day, mode: "single", ...body }),
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

  const pick = (dishId: string) => post("/api/single/pick", { dishId }, `pick-${dishId}`);
  const showOthers = () => post("/api/single/show-others", {}, "others");
  const eatOut = async () => { setConfirmOut(false); await post("/api/eating-out", {}, "out"); };

  const errorBox = error && <p className="alert" role="alert">{error}</p>;

  if (data.state === "not_enough") {
    return (
      <div className="stack">
        <h2 className="day">{data.dayLabel}</h2>
        <section className="state state-empty">
          <span className="state-emoji" aria-hidden="true">{"\uD83E\uDED9"}</span>
          <h3>Not enough dishes to choose from</h3>
          <p>{data.shortageReason ?? `Fewer than two dishes are left for ${data.dayLabel}.`}</p>
        </section>
        {errorBox}
      </div>
    );
  }

  if (data.state === "eating_out") {
    return (
      <div className="stack">
        <h2 className="day">{data.dayLabel}</h2>
        <p className="banner banner-out"><span aria-hidden="true">{"\uD83C\uDF7D\uFE0F"}</span> Eating out</p>
        <section className="state settle">
          <span className="state-emoji" aria-hidden="true">{"\uD83E\uDD61"}</span>
          <h3>No cooking that day</h3>
          <p>You've marked {data.dayLabel} as eating out.</p>
        </section>
      </div>
    );
  }

  const [a, b] = data.options;
  return (
    <div className="stack">
      <h2 className="day">{data.dayLabel}</h2>
      {data.state === "picked" ? (
        <p className="banner banner-locked"><span aria-hidden="true">{"\u2713"}</span> Picked</p>
      ) : (
        <p className="lede">What'll it be for {data.dayLabel}?</p>
      )}

      <div className="options">
        {[a, b].map((d) => (
          <DishCard key={d.id} dish={d} mine={data.myPick === d.id} busy={busy !== null} onPick={() => pick(d.id)} cta="Pick this" showProtein />
        ))}
      </div>
      {errorBox}

      <button className="btn btn-quiet" disabled={busy !== null} onClick={showOthers}>
        {busy === "others" ? "Finding more..." : "Show me two others"}
      </button>

      {confirmOut ? (
        <div className="panel confirm" role="group" aria-label="Confirm eating out">
          <p>Mark {data.dayLabel} as eating out?</p>
          <div className="row">
            <button className="btn btn-quiet" onClick={() => setConfirmOut(false)}>Keep cooking</button>
            <button className="btn btn-ink" onClick={eatOut} disabled={busy === "out"}>Yes, eating out</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-quiet" onClick={() => setConfirmOut(true)}>{"\uD83C\uDF7D\uFE0F"} Eating out</button>
      )}
    </div>
  );
}
