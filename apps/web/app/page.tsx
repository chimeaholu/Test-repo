import Link from "next/link";
import { InfoList, InsightCallout, SurfaceCard } from "@/components/ui-primitives";
import { landingCopy } from "@/lib/content/route-copy";

export default function HomePage() {
  return (
    <main className="page-shell" id="main-content">
      <section className="hero-card">
        <p className="eyebrow">{landingCopy.eyebrow}</p>
        <h1 className="display-title">{landingCopy.title}</h1>
        <p className="lede">{landingCopy.body}</p>
        <div className="actions-row">
          <Link className="button-primary" href="/signin">
            {landingCopy.primaryActionLabel}
          </Link>
          <Link className="button-secondary" href="/app/offline/outbox">
            {landingCopy.secondaryActionLabel}
          </Link>
        </div>
        <div className="hero-grid">
          <div className="content-stack">
            <div className="hero-kpi-grid" aria-label="Platform overview">
              <article className="hero-kpi">
                <span className="metric-label">Primary journeys</span>
                <strong>Onboarding, marketplace, dispatch, finance</strong>
                <p className="muted">Each journey keeps a single dominant next action visible.</p>
              </article>
              <article className="hero-kpi">
                <span className="metric-label">Access model</span>
                <strong>Role-based with explicit consent</strong>
                <p className="muted">Protected work stays blocked until policy capture is complete.</p>
              </article>
              <article className="hero-kpi">
                <span className="metric-label">Recovery posture</span>
                <strong>Offline queue and replay controls</strong>
                <p className="muted">Teams can see what is pending, conflicted, or ready to resume.</p>
              </article>
            </div>
            <InfoList
              items={[
                { label: "Audience fit", value: "Farmers, buyers, cooperatives, advisors, finance, admins" },
                { label: "Primary assurance", value: "Evidence, consent, and recovery stay in view" },
                { label: "Device posture", value: "Thumb-safe mobile and evidence-rich desktop" },
              ]}
            />
          </div>
          <div className="content-stack">
            <SurfaceCard className="hero-subcard">
              <strong className="state-title">What teams can do here</strong>
              <p className="muted measure">
                Move from sign-in to production work quickly, then keep evidence, approvals, and recovery options visible as conditions change.
              </p>
            </SurfaceCard>
            <SurfaceCard className="hero-subcard">
              <strong className="state-title">Why the entry flow matters</strong>
              <p className="muted measure">
                The public route makes the operating model legible before anyone commits to a sign-in flow, which reduces route confusion and sets expectations for consent and recovery.
              </p>
            </SurfaceCard>
          </div>
        </div>
      </section>

      <section className="journey-grid" aria-label="Key product promises">
        {landingCopy.highlights.map((highlight) => (
          <article className="journey-card" key={highlight.title}>
            <p className="eyebrow">Marketplace product promise</p>
            <h2>{highlight.title}</h2>
            <p className="muted">{highlight.body}</p>
          </article>
        ))}
      </section>

      <section className="grid-two">
        <InsightCallout
          title={landingCopy.designCallout.title}
          body={landingCopy.designCallout.body}
          tone="brand"
        />
        <InsightCallout
          title={landingCopy.mobileCallout.title}
          body={landingCopy.mobileCallout.body}
          tone="accent"
        />
      </section>

      <section className="grid-two" aria-label="Entry journey summary">
        <article className="panel">
          <h2>Public to protected, without hidden jumps</h2>
          <p className="muted measure">
            Users start with the product promise, identify themselves with their working role, then review consent before any regulated workspace action is unlocked.
          </p>
        </article>
        <article className="panel">
          <h2>Recovery is part of the main product, not a support path</h2>
          <p className="muted measure">
            Queue review, conflict handling, and resumption cues are reachable from the start because connectivity loss is a normal operating condition.
          </p>
        </article>
      </section>
    </main>
  );
}
