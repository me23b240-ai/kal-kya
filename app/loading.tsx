export default function Loading() {
  return (
    <main className="wrap" aria-busy="true" aria-label="Loading">
      <header className="head">
        <div className="head-top"><h1 className="brand">Kal Kya</h1></div>
        <div className="chips">{[0, 1, 2, 3].map((i) => <span key={i} className="chip skel" />)}</div>
      </header>
      <div className="stack">
        <span className="skel skel-line" />
        <span className="skel skel-banner" />
        <span className="skel skel-card" />
        <span className="skel skel-card" />
      </div>
    </main>
  );
}
