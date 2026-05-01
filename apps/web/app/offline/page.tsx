import Link from "next/link";

import { PublicPageShell } from "@/components/public/public-page-shell";
import { offlineBoundarySections } from "@/lib/offline/policy";

export default function OfflinePage() {
  return (
    <PublicPageShell>
      <main className="pub-route-main" id="main-content">
        <section className="pub-route-section pub-route-hero">
          <div className="pub-section-shell pub-center-intro">
            <p className="pub-overline">You&apos;re offline</p>
            <h1 className="pub-display">You can still view saved work and finish some tasks.</h1>
            <p className="pub-copy pub-copy-lg">
              Agrodomain keeps important information available on your device so
              you can stay oriented even when signal drops.
            </p>
            <div className="pub-cta-row pub-cta-row-center">
              <Link href="/signin" className="pub-button-primary">
                Open saved work
              </Link>
              <Link href="/" className="pub-button-secondary">
                Back to workspace
              </Link>
            </div>
          </div>
        </section>

        <section className="pub-route-section">
          <div className="pub-section-shell">
            <div className="pub-card-grid pub-card-grid-three">
              <article className="pub-card pub-card-accent">
                <h2>Still available</h2>
                <p>Saved pages, recent activity, and some drafts.</p>
              </article>
              <article className="pub-card pub-card-accent">
                <h2>Waiting for signal</h2>
                <p>New updates that need an internet connection to finish.</p>
              </article>
              <article className="pub-card pub-card-accent">
                <h2>Best next step</h2>
                <p>Review saved work, finish drafts, and sync when coverage returns.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="pub-route-section pub-route-section-soft">
          <div className="pub-section-shell">
            <div className="pub-section-intro">
              <h2 className="pub-section-title">Saved areas you can return to quickly</h2>
            </div>
            <div className="pub-card-grid pub-card-grid-two">
              {offlineBoundarySections.map((section) => (
                <article key={section.module} className="pub-card pub-card-proof">
                  <h3>{section.module}</h3>
                  <p>Saved for reading: {section.offlineReads.join(", ")}.</p>
                  <p>Needs signal to finish: {section.onlineOnly.join(", ")}.</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </PublicPageShell>
  );
}
