"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import Countdown from "./Countdown";
import DishCard, { DishFace } from "./DishCard";
import type { ViewData } from "@/lib/meal/types";

const reasonText: Record<"pass" | "silent", string> = { pass: "passed", silent: "didn't answer" };

export default function VoteScreen({ data }: { data: ViewData }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localVote, setLocalVote] = useState<string | null>(data.myVote);
  const [confirmOut, setConfirmOut] = useState(false);

  useEffect(() => { setLocalVote(data.myVote); }, [data.myVote, data.viewerId]);

  async function post(path: string, body: Record<string, unknown>, key: string) {
    setError(null); setBusy(key);
    try {
      const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId: data.viewerId, planDayId: data.planDayId, ...body }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Something went wrong. Try again.");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      return false;
    } finally {
      setBusy(null);
      startTransition(() => router.refresh()); // always re-read, so a rejected vote shows the real state
    }
  }

  const vote = async (dishId: string) => {
    const prev = localVote;
    setLocalVote(dishId);
    if (!(await post("/api/vote", { dishId }, `vote-${dishId}`))) setLocalVote(prev);
  };
  const eatOut = async () => { setConfirmOut(false); await post("/api/eating-out", {}, "out"); };

  const voted = data.members.filter((m) => m.voted).length;

  const people = (
    <section className="panel" aria-label="Who has voted">
      <ul className="voters">
        {data.members.map((m) => (
          <li key={m.id} className="voter" data-done={m.voted ? "true" : undefined}>
            <Avatar name={m.name} tint={m.tint} tick={m.voted} size={44} />
            <span>{m.name}</span>
            <span className="sr">{m.voted ? "has voted" : "hasn't voted yet"}</span>
          </li>
        ))}
      </ul>
      <p className="note">{data.state === "open" ? `${voted} of ${data.members.length} have voted. Choices stay secret until it locks.` : `${voted} of ${data.members.length} voted.`}</p>
    </section>
  );

  const eatOutButton = data.viewerIsCook && (data.state === "open" || data.state === "not_enough") && (
    confirmOut ? (
      <div className="panel confirm" role="group" aria-label="Confirm eating out">
        <p>Mark tomorrow as eating out? Voting will close for everyone.</p>
        <div className="row">
          <button className="btn btn-quiet" onClick={() => setConfirmOut(false)}>Keep cooking</button>
          <button className="btn btn-ink" onClick={eatOut} disabled={busy === "out"}>Yes, eating out</button>
        </div>
      </div>
    ) : (
      <button className="btn btn-quiet" onClick={() => setConfirmOut(true)}>🍽️ We're eating out</button>
    )
  );

  const errorBox = error && <p className="alert" role="alert">{error}</p>;

  // ---- empty: fewer than two dishes qualify ----
  if (data.state === "not_enough") {
    return (
      <div className="stack">
        <h2 className="day">{data.dayLabel}</h2>
        <section className="state state-empty">
          <span className="state-emoji" aria-hidden="true">🫙</span>
          <h3>Not enough dishes to choose from</h3>
          <p>Dishes cooked recently, or ones that clash with an allergy or dislike, are left out. Fewer than two are left for tomorrow.</p>
        </section>
        {errorBox}
        {eatOutButton}
      </div>
    );
  }

  // ---- eating out ----
  if (data.state === "eating_out") {
    return (
      <div className="stack">
        <h2 className="day">{data.dayLabel}</h2>
        <p className="banner banner-out"><span aria-hidden="true">🍽️</span> Eating out</p>
        <section className="state settle">
          <span className="state-emoji" aria-hidden="true">🥡</span>
          <h3>No cooking tomorrow</h3>
          <p>The cook has marked this day as eating out, so there's nothing to vote on.</p>
        </section>
      </div>
    );
  }

  // ---- locked ----
  if (data.state === "locked" && data.result) {
    const { winner, lockedBy, tally, deciderName, skipped } = data.result;
    const hi = Math.max(tally.a, tally.b), lo = Math.min(tally.a, tally.b);
    const why =
      lockedBy === "votes" ? `Won on votes, ${hi} to ${lo}.`
      : lockedBy === "turn" ? `The votes tied ${hi} to ${lo}, so ${deciderName ?? "the turn holder"} chose.`
      : tally.a + tally.b === 0 ? "Nobody voted, so the first dish got it."
      : "The votes tied and nobody broke it, so the first dish got it.";
    return (
      <div className="stack settle">
        <h2 className="day">{data.dayLabel}</h2>
        <p className="banner banner-locked"><span aria-hidden="true">✓</span> Locked in</p>
        <section className="winner" aria-label="Tomorrow's dish">
          <span className="dish-row"><DishFace dish={winner} /></span>
          <p className="why">{why}</p>
          {skipped.length > 0 && <p className="why-small">Skipped for the tie-break: {skipped.map((s) => `${s.name} (${reasonText[s.reason]})`).join(", ")}.</p>}
        </section>
        {people}
      </div>
    );
  }

  // ---- open ----
  const [a, b] = data.options;
  return (
    <div className="stack">
      <h2 className="day">{data.dayLabel}</h2>
      <p className="banner banner-open">
        <span>Voting is open</span>
        {data.lockAtMs && <Countdown lockAtMs={data.lockAtMs} />}
      </p>
      <p className="lede">Pick tomorrow's dish. You can change your mind until it locks.</p>

      <div className="options">
        {[a, b].map((d) => (
          <DishCard key={d.id} dish={d} mine={localVote === d.id} busy={busy !== null} onPick={() => vote(d.id)} />
        ))}
      </div>
      {errorBox}

      {data.tie && (
        <section className="panel tie" aria-label="Tie-break">
          <h3>It's a tie</h3>
          {data.tie.viewerIsTapper ? (
            <>
              <p>It's your turn to break it. Pick one, or pass and the turn moves on.</p>
              <div className="tie-actions">
                {[a, b].map((d) => (
                  <button key={d.id} className="btn btn-ink" data-on={data.tie!.myPick === d.id ? "true" : undefined} disabled={busy !== null} onClick={() => post("/api/tiebreak", { choice: d.id }, `tie-${d.id}`)}>
                    {data.tie!.myPick === d.id ? "✓ " : ""}{d.name}
                  </button>
                ))}
                <button className="btn btn-quiet" disabled={busy !== null} onClick={() => post("/api/tiebreak", { choice: "pass" }, "tie-pass")}>Pass</button>
              </div>
            </>
          ) : (
            <p>If it stays tied at lock time, {data.tie.tapperName} breaks it.</p>
          )}
        </section>
      )}

      {people}
      {eatOutButton}

      <div className="demo">
        <button className="btn btn-dashed" disabled={busy !== null} onClick={() => post("/api/lock-now", {}, "lock")}>
          Lock now <span className="tag">demo only</span>
        </button>
      </div>
    </div>
  );
}
