'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <div className="brand">
        TreasureTrove
        <span className="brand-dot" />
      </div>
      <h1>Your workbench is temporarily unavailable.</h1>
      <p>Check your connection and try again.</p>
      <button className="primary" onClick={reset}>
        Try again
      </button>
      <a href="/login">Go to sign in</a>
    </main>
  );
}
