import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, ShoppingBasket, Sprout, Truck } from "lucide-react";

import { PublicPageShell } from "@/components/public/public-page-shell";

const previewJourneys = [
  {
    title: "Farmer journey",
    body: "See how a grower moves from first listing to follow-up and payment visibility.",
    icon: Sprout,
  },
  {
    title: "Buyer journey",
    body: "See how a buyer compares produce, stays oriented, and keeps offers moving.",
    icon: ShoppingBasket,
  },
  {
    title: "Logistics journey",
    body: "See how transport and handoff steps stay connected to the trade.",
    icon: Truck,
  },
  {
    title: "Operations journey",
    body: "See how support teams review movement across the platform without exposing private access.",
    icon: BriefcaseBusiness,
  },
] as const;

export default function PreviewPage() {
  return (
    <PublicPageShell>
      <main className="pub-route-main" id="main-content">
        <section className="pub-route-section pub-route-hero">
          <div className="pub-section-shell pub-center-intro">
            <p className="pub-overline">Guided product preview</p>
            <h1 className="pub-display">Explore Agrodomain before you create an account</h1>
            <p className="pub-copy pub-copy-lg">
              Walk through the product with guided sample journeys for farming,
              buying, logistics, and operations.
            </p>
            <div className="pub-cta-row pub-cta-row-center">
              <Link href="#preview-journeys" className="pub-button-primary">
                Start preview
              </Link>
              <Link href="/contact" className="pub-button-secondary">
                Contact us for a live walkthrough
              </Link>
            </div>
          </div>
        </section>

        <section className="pub-route-section" id="preview-journeys">
          <div className="pub-section-shell">
            <div className="pub-card-grid pub-card-grid-two">
              {previewJourneys.map((journey) => {
                const Icon = journey.icon;
                return (
                  <article key={journey.title} className="pub-card pub-card-accent">
                    <span className="pub-icon-badge">
                      <Icon size={20} />
                    </span>
                    <h2>{journey.title}</h2>
                    <p>{journey.body}</p>
                    <span className="pub-inline-link">
                      See how this role uses the platform from first action to follow-up.
                      <ArrowRight size={16} />
                    </span>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="pub-route-section pub-route-section-soft">
          <div className="pub-section-shell pub-callout-shell">
            <div className="pub-callout-copy">
              <h2 className="pub-section-title">What this preview includes</h2>
              <p className="pub-copy">
                This preview uses guided sample data to show the experience clearly.
              </p>
            </div>
          </div>
        </section>
      </main>
    </PublicPageShell>
  );
}
