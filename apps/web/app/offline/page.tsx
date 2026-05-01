import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="page-shell offline-page" id="main-content">
      <section className="hero-card offline-card">
        <p className="eyebrow">Offline mode</p>
        <h1 className="display-title offline-title">You are offline, but your workspace is still available.</h1>
        <p className="lede">
          Agrodomain keeps the app shell, sign-in entry, and recently visited screens ready while the network
          stabilizes. Fresh API data, submissions, and sync replays resume automatically when connectivity returns.
        </p>
        <div className="offline-actions">
          <Link className="button-primary" href="/signin">
            Return to sign in
          </Link>
          <Link className="button-secondary" href="/">
            Open landing page
          </Link>
        </div>
        <dl className="offline-grid" aria-label="Offline support details">
          <div className="offline-detail">
            <dt>Available offline</dt>
            <dd>Install shell, manifest, recent static assets, and the fallback experience.</dd>
          </div>
          <div className="offline-detail">
            <dt>Queued locally</dt>
            <dd>Existing client-side queue snapshots and consent/session state already stored in the browser.</dd>
          </div>
          <div className="offline-detail">
            <dt>Requires network</dt>
            <dd>Live API reads, sign-in verification, and server-backed submissions.</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
