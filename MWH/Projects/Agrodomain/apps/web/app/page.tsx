import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CloudSun,
  Coins,
  Handshake,
  ShieldCheck,
  ShoppingBasket,
  Truck,
} from "lucide-react";

import { PublicPageShell } from "@/components/public/public-page-shell";
import { JsonLd } from "@/components/seo/json-ld";
import {
  buildItemListJsonLd,
  buildOrganizationJsonLd,
  buildPageMetadata,
  buildWebPageJsonLd,
  buildWebsiteJsonLd,
} from "@/lib/seo";

const homeTitle = "Run your agriculture business with more control and less guesswork";
const homeDescription =
  "Agrodomain helps farmers, buyers, cooperatives, transporters, and investors sell produce, track payments, spot risk early, and keep business moving.";

const journeys = [
  {
    title: "Sell and get paid",
    body: "List produce, respond to offers, and follow payment progress from one place.",
    cta: "See the selling flow",
    icon: ShoppingBasket,
  },
  {
    title: "Protect your season",
    body: "Track weather, plan around field risks, and keep cover and advice close at hand.",
    cta: "See the protection flow",
    icon: ShieldCheck,
  },
  {
    title: "Move and scale trade",
    body: "Coordinate transport, discover buyers, and keep commercial decisions moving.",
    cta: "See the growth flow",
    icon: Truck,
  },
] as const;

const proofCards = [
  {
    title: "Better market access",
    body: "Bring produce, pricing, and buyer conversations into one clear place.",
    icon: Handshake,
  },
  {
    title: "Clearer payment visibility",
    body: "Follow offers, confirmations, and money movement without chasing updates.",
    icon: Coins,
  },
  {
    title: "Faster coordination across the chain",
    body: "Keep weather, logistics, and trade actions close enough to act on quickly.",
    icon: CloudSun,
  },
] as const;

const roleStarts = [
  { label: "Start as farmer", href: "/signup" },
  { label: "Start as buyer", href: "/signup" },
  { label: "Start as transporter", href: "/signup" },
] as const;

export const metadata: Metadata = buildPageMetadata({
  title: homeTitle,
  description: homeDescription,
  path: "/",
  keywords: [
    "Agrodomain",
    "agriculture business platform",
    "farmer marketplace",
    "farm payments",
    "agriculture logistics",
    "weather and farm planning",
  ],
});

export default function HomePage() {
  const structuredData = [
    buildOrganizationJsonLd(),
    buildWebsiteJsonLd(),
    buildWebPageJsonLd(homeTitle, homeDescription, "/"),
    buildItemListJsonLd(
      "Agrodomain journey paths",
      journeys.map((journey) => ({
        name: journey.title,
        url: "/features",
        description: journey.body,
      })),
    ),
  ];

  return (
    <PublicPageShell>
      <main className="pub-route-main" id="main-content">
        <JsonLd data={structuredData} />

        <section className="pub-home-stage">
          <div className="pub-section-shell pub-home-grid">
            <div className="pub-home-copy">
              <p className="pub-overline">
                One platform for selling, protecting, moving, and growing farm business
              </p>
              <h1 className="pub-display">{homeTitle}.</h1>
              <p className="pub-copy pub-copy-lg">
                Agrodomain helps farmers, buyers, cooperatives, transporters, and
                investors work from the same trusted system. Sell produce, track
                payments, spot risk early, and keep business moving.
              </p>
              <div className="pub-chip-row" aria-label="Trust signals">
                <span className="pub-chip">Built for Nigeria and Ghana</span>
                <span className="pub-chip">Mobile-first</span>
                <span className="pub-chip">Trusted trade and payment flows</span>
              </div>
              <div className="pub-cta-row">
                <Link href="/signup" className="pub-button-primary">
                  Create your account
                </Link>
                <Link href="/features" className="pub-button-secondary">
                  Explore the platform
                </Link>
              </div>
            </div>

            <div className="pub-home-visual" aria-hidden="true">
              <div className="pub-home-photo" />
              <div className="pub-home-panel pub-home-panel-top">
                <span className="pub-mini-kicker">Market</span>
                <strong>Offers moving</strong>
                <p>Produce, buyers, and payment next steps stay visible.</p>
              </div>
              <div className="pub-home-panel pub-home-panel-middle">
                <span className="pub-mini-kicker">Weather</span>
                <strong>Season planning close by</strong>
                <p>Forecasts and alerts stay next to farm decisions.</p>
              </div>
              <div className="pub-home-panel pub-home-panel-bottom">
                <span className="pub-mini-kicker">Transport</span>
                <strong>Trade keeps moving</strong>
                <p>Loads, handoffs, and delivery planning stay connected.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="pub-route-section">
          <div className="pub-section-shell">
            <div className="pub-section-intro">
              <p className="pub-overline">Choose the journey that fits you</p>
              <h2 className="pub-section-title">
                Start with the work you already do, then expand from there.
              </h2>
            </div>
            <div className="pub-card-grid pub-card-grid-three">
              {journeys.map((journey) => {
                const Icon = journey.icon;
                return (
                  <article key={journey.title} className="pub-card pub-card-accent">
                    <span className="pub-icon-badge">
                      <Icon size={20} />
                    </span>
                    <h3>{journey.title}</h3>
                    <p>{journey.body}</p>
                    <Link href="/features" className="pub-inline-link">
                      {journey.cta}
                      <ArrowRight size={16} />
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="pub-route-section pub-route-section-soft">
          <div className="pub-section-shell">
            <div className="pub-section-intro">
              <p className="pub-overline">Why teams use Agrodomain</p>
              <h2 className="pub-section-title">One operating picture instead of scattered updates.</h2>
            </div>
            <div className="pub-card-grid pub-card-grid-three">
              {proofCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article key={card.title} className="pub-card pub-card-proof">
                    <span className="pub-icon-badge pub-icon-badge-soft">
                      <Icon size={20} />
                    </span>
                    <h3>{card.title}</h3>
                    <p>{card.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="pub-route-section">
          <div className="pub-section-shell pub-callout-shell">
            <div className="pub-callout-copy">
              <p className="pub-overline">Start with the role you already play</p>
              <h2 className="pub-section-title">
                Set up your account, complete your workspace, and move straight into real work.
              </h2>
              <p className="pub-copy">
                Agrodomain is designed to feel like one connected platform instead of separate tools stitched together after the fact.
              </p>
            </div>
            <div className="pub-callout-actions">
              {roleStarts.map((role) => (
                <Link key={role.label} href={role.href} className="pub-role-link">
                  <BadgeCheck size={18} />
                  {role.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </PublicPageShell>
  );
}
