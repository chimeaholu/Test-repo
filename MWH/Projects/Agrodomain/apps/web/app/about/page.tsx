import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Handshake, ShieldCheck } from "lucide-react";

import { PublicPageShell } from "@/components/public/public-page-shell";
import { JsonLd } from "@/components/seo/json-ld";
import {
  buildOrganizationJsonLd,
  buildPageMetadata,
  buildWebPageJsonLd,
} from "@/lib/seo";

const aboutTitle = "Agriculture works better when trust is easier to see";
const aboutDescription =
  "Agrodomain helps agricultural businesses make fairer deals, move faster, and work with better visibility across the value chain.";

const pillars = [
  {
    title: "Fair market access",
    body: "The platform should make it easier to compare offers, understand what comes next, and move toward better deals.",
    icon: Handshake,
  },
  {
    title: "Practical resilience",
    body: "Weather, protection, and season planning should help people act earlier instead of reacting too late.",
    icon: ShieldCheck,
  },
  {
    title: "Connected operations",
    body: "Trade, payment, and movement decisions should stay linked so teams do not lose clarity between steps.",
    icon: BarChart3,
  },
] as const;

const teamCards = [
  {
    title: "Platform design",
    body: "Built by people who understand that the product has to stay clear on a phone in the middle of a working day.",
  },
  {
    title: "Agriculture context",
    body: "Shaped around the commercial pressure of farming, buying, transport, and support work across the chain.",
  },
  {
    title: "Systems and delivery",
    body: "Grounded in data, workflow design, and the practical discipline needed to keep operations moving.",
  },
] as const;

export const metadata: Metadata = buildPageMetadata({
  title: aboutTitle,
  description: aboutDescription,
  path: "/about",
  keywords: [
    "about Agrodomain",
    "agriculture platform mission",
    "farm business trust",
    "agriculture operations",
  ],
});

export default function AboutPage() {
  const structuredData = [
    buildOrganizationJsonLd(),
    buildWebPageJsonLd(aboutTitle, aboutDescription, "/about", "AboutPage"),
  ];

  return (
    <PublicPageShell>
      <main className="pub-route-main" id="main-content">
        <JsonLd data={structuredData} />

        <section className="pub-route-section pub-route-hero">
          <div className="pub-section-shell pub-center-intro">
            <p className="pub-overline">Why Agrodomain exists</p>
            <h1 className="pub-display">{aboutTitle}.</h1>
            <p className="pub-copy pub-copy-lg">
              Agrodomain was built to help agricultural businesses make fairer
              deals, move faster, and work with better visibility across the value chain.
            </p>
            <div className="pub-cta-row pub-cta-row-center">
              <Link href="/features" className="pub-button-primary">
                See the platform
              </Link>
            </div>
          </div>
        </section>

        <section className="pub-route-section">
          <div className="pub-section-shell">
            <div className="pub-section-intro">
              <p className="pub-overline">What we believe</p>
              <h2 className="pub-section-title">
                A better agriculture system depends on clearer trust, not more friction.
              </h2>
            </div>
            <div className="pub-card-grid pub-card-grid-three">
              {pillars.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <article key={pillar.title} className="pub-card pub-card-accent">
                    <span className="pub-icon-badge">
                      <Icon size={20} />
                    </span>
                    <h3>{pillar.title}</h3>
                    <p>{pillar.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="pub-route-section pub-route-section-soft">
          <div className="pub-section-shell">
            <div className="pub-section-intro">
              <h2 className="pub-section-title">
                Built by people who understand data, systems, and real operating pressure.
              </h2>
            </div>
            <div className="pub-card-grid pub-card-grid-three">
              {teamCards.map((card) => (
                <article key={card.title} className="pub-card pub-card-proof">
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="pub-route-section">
          <div className="pub-section-shell pub-callout-shell">
            <div className="pub-callout-copy">
              <h2 className="pub-section-title">
                If you work in farming, buying, logistics, or agricultural finance, Agrodomain is designed to help your team act with more clarity.
              </h2>
              <div className="pub-cta-row">
                <Link href="/signup" className="pub-button-primary">
                  Create your account
                </Link>
                <Link href="/contact" className="pub-button-secondary">
                  Talk to the team
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </PublicPageShell>
  );
}
