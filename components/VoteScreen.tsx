"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Avatar from "./Avatar";
import Countdown from "./Countdown";
import DishCard, { DishFace } from "./DishCard";
import DishDetailModal from "./DishDetailModal";
import type { ViewData } from "@/lib/meal/types";

const reasonText: Record<"pass" | "silent", string> = { pass: "passed", silent: "didn't answer" };

export default function VoteScreen({ data }: { data: ViewData }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localVote, setLocalVote] = useState<string | null>(data.myVote);
  const [confirmOut, setConfirmOut] = useState(false);
  const [winnerDetailOpen, setWinnerDetailOpen] = useState(false);

  useEffect(() => { setLocalVote(data.myVote); }, [data.myVote, data.viewerId, data.day]);

  async function post(path: string, body: Record<string, unknown>, key: string) {
    setError(null); setBusy(key);
    try {
      const res = await fetch(path, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: data.viewerId, planDayId: data.planDayId, day: data.day, ...body }),
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

  const vote = async (dishId: string) => {
    const prev = localVote;
    setLocalVote(dishId);
    if (!(await post("/api/vote", { dishId }, `vote-${dishId}`))) setLocalVote(prev);
  };
  const eatOut = async () => { setConfirmOut(false); await post("/api/eating-out", {}, "out"); };

  const voted = data.members.filter((m) => m.voted).length;

  const people = (
    <section className="panel panel-quiet" aria-label="Who has voted">
      <ul className="voters">
        {data.members.map((m) => (
          <li key={m.id} className="voter" data-done={m.voted ? "true" : undefined}>
            <Avatar name={m.name} tint={m.tint} tick={m.voted} size={44} avatarUrl={m.avatarUrl} />
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
        <p>Mark {data.dayLabel} as eating out? Voting will close for everyone.</p>
        <div className="row">
          <button className="btn btn-quiet" onClick={() => setConfirmOut(false)}>Keep cooking</button>
          <button className="btn btn-ink" onClick={eatOut} disabled={busy === "out"}>Yes, eating out</button>
        </div>
      </div>
    ) : (
      <button className="btn btn-quiet" onClick={() => setConfirmOut(true)}>{"\uD83C\uDF7D\uFE0F"} We're eating out</button>
    )
  );

  const errorBox = error && <p className="alert" role="alert">{error}</p>;

  if (data.state === "not_enough") {
    return (
      <div className="stack settle">
        <section className="state state-empty settle">
          <span className="state-emoji" aria-hidden="true">{"\uD83E\uDED9"}</span>
          <h3>Not enough dishes to choose from</h3>
          <p>{data.shortageReason ?? `Fewer than two dishes are left for ${data.dayLabel}.`}</p>
          <Link href={`/rules?as=${data.viewerId}`}>Adjust allergies and dislikes</Link>
        </section>
        {errorBox}
        {eatOutButton}
      </div>
    );
  }

  if (data.state === "eating_out") {
    return (
      <div className="stack settle">
        <p className="banner banner-out"><span aria-hidden="true">{"\uD83C\uDF7D\uFE0F"}</span> Eating out on {data.dayLabel}</p>
        <section className="state settle">
          <span className="state-emoji" aria-hidden="true">{"\uD83E\uDD61"}</span>
          <h3>No cooking that day</h3>
          <p>The cook has marked {data.dayLabel} as eating out, so there's nothing to vote on.</p>
        </section>
      </div>
    );
  }

  if (data.state === "locked" && data.result) {
    const { winner, lockedBy, tally, deciderName, skipped, headcount, myMealPrompt } = data.result;
    const hi = Math.max(tally.a, tally.b), lo = Math.min(tally.a, tally.b);
    const why =
      lockedBy === "votes" ? `Won on votes, ${hi} to ${lo}.`
      : lockedBy === "turn" ? `The votes tied ${hi} to ${lo}, so ${deciderName ?? "the turn holder"} chose.`
      : tally.a + tally.b === 0 ? "Nobody voted, so the first dish got it."
      : "The votes tied and nobody broke it, so the first dish got it.";
    const eatingMembers = data.members.filter((m) => headcount.eatingIds.includes(m.id));
    const outMembers = data.members.filter((m) => headcount.outIds.includes(m.id));
    return (
      <div className="stack settle">
        <p className="banner banner-locked"><span aria-hidden="true">{"\u2713"}</span> {data.dayLabel} locked in</p>
        <section className="winner" aria-label={`${data.dayLabel}'s dish`}>
          <span className="dish-row"><DishFace dish={winner} /></span>
          <button type="button" className="dish-details-btn" onClick={() => setWinnerDetailOpen(true)}>Ingredients &amp; steps</button>
          {winnerDetailOpen && <DishDetailModal dish={winner} onClose={() => setWinnerDetailOpen(false)} />}
          <p className="why">{why}</p>
          {skipped.length > 0 && <p className="why-small">Skipped for the tie-break: {skipped.map((s) => `${s.name} (${reasonText[s.reason]})`).join(", ")}.</p>}
        </section>

        <section className="panel panel-quiet" aria-label="Who's eating">
          <h3>Who's eating</h3>
          <p className="note">{eatingMembers.length} eating{outMembers.length > 0 ? `, ${outMembers.length} out` : ""}.</p>
          <div className="headcount-row">
            {eatingMembers.map((m) => <Avatar key={m.id} name={m.name} tint={m.tint} avatarUrl={m.avatarUrl} size={32} />)}
          </div>
          {outMembers.length > 0 && (
            <div className="headcount-row">
              {outMembers.map((m) => <Avatar key={m.id} name={m.name} tint={m.tint} avatarUrl={m.avatarUrl} size={32} />)}
            </div>
          )}
        </section>

        {myMealPrompt && (
          <section className="panel meal-prompt" aria-label="Your meal">
            <p>{myMealPrompt.response ? "You can still change your mind:" : "You'd rather skip this one?"}</p>
            <div className="row">
              <button className="btn btn-ink" data-on={myMealPrompt.response === "eating" ? "true" : undefined} disabled={busy !== null} onClick={() => post("/api/meal-response", { response: "eating" }, "meal-eating")}>I'll eat it</button>
              <button className="btn btn-ink" data-on={myMealPrompt.response === "out" ? "true" : undefined} disabled={busy !== null} onClick={() => post("/api/meal-response", { response: "out" }, "meal-out")}>I'll eat out</button>
            </div>
          </section>
        )}
        {errorBox}

        {people}
      </div>
    );
  }

  const [a, b] = data.options;
  return (
    <div className="stack settle">
      <p className="banner banner-open">
        <span>Voting open for {data.dayLabel}</span>
        {data.lockAtMs && <Countdown lockAtMs={data.lockAtMs} />}
      </p>
      <p className="lede">Pick the dish. You can change your mind until it locks.</p>

      <div className="options">
        {[a, b].map((d) => (
          <DishCard key={d.id} dish={d} mine={localVote === d.id} busy={busy !== null} onPick={() => vote(d.id)} />
        ))}
      </div>
      {errorBox}

      {voted === 0 && (
        <button className="btn btn-quiet" disabled={busy !== null} onClick={() => post("/api/refresh-options", {}, "refresh")}>
          {busy === "refresh" ? "Refreshing..." : "\u21BB Refresh options"}
        </button>
      )}

      {data.tie && (
        <section className="panel tie" aria-label="Tie-break">
          <h3>It's a tie</h3>
          {data.tie.viewerIsTapper ? (
            <>
              <p>It's your turn to break it. Pick one, or pass and the turn moves on.</p>
              <div className="tie-actions">
                {[a, b].map((d) => (
                  <button key={d.id} className="btn btn-ink" data-on={data.tie!.myPick === d.id ? "true" : undefined} disabled={busy !== null} onClick={() => post("/api/tiebreak", { choice: d.id }, `tie-${d.id}`)}>
                    {data.tie!.myPick === d.id ? "\u2713 " : ""}{d.name}
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
    </div>
  );
}
