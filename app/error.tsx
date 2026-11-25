"use client";
export default function ErrorScreen({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="wrap">
      <header className="head"><div className="head-top"><h1 className="brand">Kal Kya</h1></div></header>
      <section className="state state-empty" role="alert">
        <span className="state-emoji" aria-hidden="true">🫖</span>
        <h3>Couldn't load tomorrow</h3>
        <p>The kitchen board didn't answer. Check that Supabase is reachable and your .env.local keys are right, then try again.</p>
        <button className="btn btn-saffron" onClick={reset}>Try again</button>
      </section>
    </main>
  );
}
