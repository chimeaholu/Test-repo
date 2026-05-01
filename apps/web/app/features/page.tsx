import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  CloudSun,
  Coins,
  ShieldCheck,
  ShoppingBasket,
  Sprout,
  Truck,
  Wallet,
} from "lucide-react";

import { PublicPageShell } from "@/components/public/public-page-shell";
import { JsonLd } from "@/components/seo/json-ld";
import {
  buildItemListJsonLd,
  buildPageMetadata,
  buildWebPageJsonLd,
} from "@/lib/seo";

const featuresTitle = "See how Agrodomain supports the full agriculture workflow";
const featuresDescription =
  "Compare Agrodomain product areas across trade, payments, protection, planning, logistics, and growth.";

const featureGroups = [
  {
    id: "trade-payments",
    label: "Trade and payments",
    modules: [
      {
        title: "AgroMarket",
        help: "List produce, compare offers, and keep buyer conversations moving.",
        first: "A marketplace view with produce listings, offer updates, and trusted trade signals.",
        bestFor: "Farmers, buyers, and cooperatives moving produce into market.",
        icon: ShoppingBasket,
      },
      {
        title: "AgroWallet",
        help: "Track payments, confirmations, and money movement connected to trade.",
        first: "Payment status, recent movement, and the next money step tied to the work.",
        bestFor: "Teams that need clearer visibility after an offer is accepted.",
        icon: Wallet,
      },
      {
        title: "AgroFund",
        help: "Review funding options connected to real agricultural timing.",
        first: "Open opportunities, readiness signals, and simple next steps for funding.",
        bestFor: "Farmers, cooperatives, and investors looking to plan growth.",
        icon: Coins,
      },
    ],
  },
  {
    id: "protection-planning",
    label: "Protection and planning",
    modules: [
      {
        title: "AgroFarm",
        help: "Keep farm details, crop context, and planning decisions organized.",
        first: "A practical workspace for field details, crops, and season context.",
        bestFor: "Farmers and advisors who need one place to keep the season clear.",
        icon: Sprout,
      },
      {
        title: "AgroWeather",
        help: "Watch local weather and act earlier when conditions start to shift.",
        first: "Forecasts, alert windows, and field-focused planning guidance.",
        bestFor: "Farmers and field teams planning around rainfall, heat, and timing.",
        icon: CloudSun,
      },
      {
        title: "AgroShield",
        help: "Keep protection and follow-up close when the season carries risk.",
        first: "Coverage, status, and support points tied to the current season.",
        bestFor: "Teams that want practical resilience rather than separate paperwork trails.",
        icon: ShieldCheck,
      },
    ],
  },
  {
    id: "logistics-growth",
    label: "Logistics and growth",
    modules: [
      {
        title: "AgroTrucker",
        help: "Coordinate transport, handoff timing, and shipment follow-up.",
        first: "Load movement, shipment tracking, and next delivery action.",
        bestFor: "Transporters, cooperatives, and trade teams moving produce at speed.",
        icon: Truck,
      },
      {
        title: "AgroGuide",
        help: "Keep advice, learning, and support close to the work itself.",
        first: "Guidance requests, practical recommendations, and learning pathways.",
        bestFor: "Farmers and support teams who need decisions explained clearly.",
        icon: BookOpen,
      },
      {
        title: "Platform overview",
        help: "See how sales, payments, protection, and movement connect without starting over.",
        first: "A joined-up view of the main platform paths and where each one begins.",
        bestFor: "Leads deciding which part of Agrodomain to open first.",
        icon: BriefcaseBusiness,
      },
    ],
  },
] as const;

export const metadata: Metadata = buildPageMetadata({
  title: featuresTitle,
  description: featuresDescription,
  path: "/features",
  keywords: [
    "Agrodomain features",
    "farm marketplace",
    "agriculture payments",
    "weather and farm planning",
    "agriculture logistics",
  ],
});

export default function FeaturesPage() {
  const structuredData = [
    buildWebPageJsonLd(featuresTitle, featuresDescription, "/features", "CollectionPage"),
    buildItemListJsonLd(
      "Agrodomain feature groups",
      featureGroups.map((group) => ({
        name: group.label,
        url: `/features#${group.id}`,
        description: `${group.label} on Agrodomain`,
      })),
    ),
  ];

  return (
    <PublicPageShell>
      <main className="pub-route-main" id="main-content">
        <JsonLd data={structuredData} />

        <section className="pub-route-section pub-route-hero">
          <div className="pub-section-shell pub-center-intro">
            <p className="pub-overline">Everything in the platform, organized by real work</p>
            <h1 className="pub-display">{featuresTitle}.</h1>
            <p className="pub-copy pub-copy-lg">
              Each product area is designed to help you make a decision, move
              work forward, and keep trust visible.
            </p>
            <div className="pub-cta-row pub-cta-row-center">
              <Link href="#trade-payments" className="pub-button-primary">
                Compare product areas
              </Link>
              <Link href="/signup" className="pub-button-secondary">
                Create your account
              </Link>
            </div>
          </div>
        </section>

        {featureGroups.map((group) => (
          <section key={group.id} className="pub-route-section" id={group.id}>
            <div className="pub-section-shell">
              <div className="pub-section-intro">
                <p className="pub-overline">{group.label}</p>
                <h2 className="pub-section-title">What you can do first in this part of the platform.</h2>
              </div>
              <div className="pub-card-grid pub-card-grid-three">
                {group.modules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <article key={module.title} className="pub-card pub-feature-card">
                      <span className="pub-icon-badge">
                        <Icon size={20} />
                      </span>
                      <h3>{module.title}</h3>
                      <dl className="pub-feature-meta">
                        <div>
                          <dt>What it helps you do</dt>
                          <dd>{module.help}</dd>
                        </div>
                        <div>
                          <dt>What you see first</dt>
                          <dd>{module.first}</dd>
                        </div>
                        <div>
                          <dt>Best for</dt>
                          <dd>{module.bestFor}</dd>
                        </div>
                      </dl>
                      <Link href="/preview" className="pub-inline-link">
                        Open module preview
                        <ArrowRight size={16} />
                      </Link>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        ))}

        <section className="pub-route-section pub-route-section-soft">
          <div className="pub-section-shell pub-callout-shell">
            <div className="pub-callout-copy">
              <h2 className="pub-section-title">
                The platform works best when the modules work together.
              </h2>
              <p className="pub-copy">
                A sale can become a payment, a shipment, a record, and a future
                opportunity without forcing you to start over in a different system.
              </p>
            </div>
          </div>
        </section>
      </main>
    </PublicPageShell>
  );
}
