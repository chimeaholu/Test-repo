import type { Metadata } from "next";
import Link from "next/link";

import { PublicPageShell } from "@/components/public/public-page-shell";
import { JsonLd } from "@/components/seo/json-ld";
import {
  buildItemListJsonLd,
  buildPageMetadata,
  buildWebPageJsonLd,
} from "@/lib/seo";

const featuresTitle = "Features";
const featuresDescription =
  "Explore Agrodomain's eight integrated modules: AgroMarket, AgroFund, AgroFarm, AgroWallet, AgroShield, AgroTrucker, AgroWeather, and AgroGuide.";

export const metadata: Metadata = buildPageMetadata({
  title: featuresTitle,
  description: featuresDescription,
  path: "/features",
  keywords: [
    "Agrodomain features",
    "agriculture marketplace",
    "farm financing tools",
    "crop insurance technology",
    "agricultural weather alerts",
    "farm advisory platform",
  ],
});

interface Module {
  id: string;
  name: string;
  headline: string;
  subtitle: string;
  features: string[];
  useCase: {
    quote: string;
    attribution: string;
  };
}

const modules: Module[] = [
  {
    id: "agromarket",
    name: "AgroMarket",
    headline: "The Marketplace That Puts Farmers First",
    subtitle:
      "A transparent digital marketplace connecting smallholder farmers with verified buyers. Real-time prices, quality grading, and secure transactions.",
    features: [
      "Real-time commodity prices updated daily from local markets",
      "Create crop listings with photos, quantity, quality grade, and desired price",
      "Verified buyer profiles with ratings and transaction history",
      "Escrow-based payments — funds released only on delivery confirmation",
      "Bulk order matching for cooperatives and large buyers",
      "Price comparison across regions and historical price trends",
    ],
    useCase: {
      quote:
        "Ama used to sell her maize to a middleman for GH\u20B5200 per bag. After listing on AgroMarket, she received bids from three verified buyers and sold at GH\u20B5340 — a 70% increase. The escrow system meant she was paid within 24 hours of delivery.",
      attribution: "Ama, Maize Farmer, Northern Region, Ghana",
    },
  },
  {
    id: "agrofund",
    name: "AgroFund",
    headline: "Financing That Understands Farming",
    subtitle:
      "Micro-loans, grants, and investment products designed around agricultural seasons — not bank calendars.",
    features: [
      "Micro-loan applications processed in under 48 hours",
      "Flexible repayment schedules aligned to harvest seasons",
      "No collateral required — creditworthiness based on farming history and platform data",
      "Grant discovery engine that matches farmers to available programs",
      "Investor marketplace connecting funders with vetted farming operations",
      "Real-time loan tracking and repayment dashboard",
    ],
    useCase: {
      quote:
        "Chidi needed GH\u20B52,000 for improved cassava cuttings. Banks wanted collateral he didn't have. AgroFund approved his loan in 36 hours based on his two-season trading history. His yield doubled, and he repaid two weeks early.",
      attribution: "Chidi, Cassava Farmer, Abia State, Nigeria",
    },
  },
  {
    id: "agrofarm",
    name: "AgroFarm",
    headline: "Your AI-Powered Farm Manager",
    subtitle:
      "From planting to harvest — AI that helps you make better decisions every day.",
    features: [
      "Crop calendar with planting, fertilizer, and harvest reminders",
      "AI-powered yield prediction based on weather, soil, and historical data",
      "Input tracking — log seeds, fertilizer, pesticide usage and costs",
      "Pest and disease identification via photo upload (AI image analysis)",
      "Soil health recommendations based on regional data",
      "Season-end profitability reports with cost breakdowns",
    ],
    useCase: {
      quote:
        "Grace uploaded a photo of yellowing leaves and AgroFarm identified nitrogen deficiency within seconds. It recommended the exact amount of urea to apply and the nearest input dealer. Her maize recovered fully.",
      attribution: "Grace, Maize & Pepper Farmer, Ashanti Region, Ghana",
    },
  },
  {
    id: "agrowallet",
    name: "AgroWallet",
    headline: "Money That Moves at the Speed of Harvest",
    subtitle:
      "A digital wallet designed for agricultural economies — mobile-money integrated, no minimum balance, instant transfers.",
    features: [
      "Instant deposits and withdrawals via mobile money (MTN MoMo, Vodafone Cash, AirtelTigo)",
      "Escrow sub-wallets for marketplace transactions",
      "Transaction history with downloadable receipts and statements",
      "Cooperative group wallets with multi-signatory approval",
      "Automated disbursement splits for cooperative member payouts",
      "Zero-fee farmer-to-farmer transfers within the platform",
    ],
    useCase: {
      quote:
        "Kwame's cooperative used to spend two days distributing payments by hand. With AgroWallet's automated splits, 87 members received their share within minutes of the sale confirmation.",
      attribution: "Kwame, Cooperative Manager, Volta Region, Ghana",
    },
  },
  {
    id: "agroshield",
    name: "AgroShield",
    headline: "Insurance That Pays When It Matters",
    subtitle:
      "Index-based crop insurance powered by satellite data — no inspectors, no paperwork, no delays.",
    features: [
      "Parametric insurance triggered automatically by weather events",
      "Affordable premiums starting from GH\u20B52 per acre per season",
      "Satellite-verified claims — no field inspectors needed",
      "Multi-peril coverage: drought, flood, pest outbreak, disease",
      "Instant payout via AgroWallet within 48 hours of trigger event",
      "Group insurance policies for cooperatives with volume discounts",
    ],
    useCase: {
      quote:
        "When the late rains destroyed 40% of Abena's rice crop, AgroShield detected the anomaly via satellite data and automatically deposited GH\u20B51,200 into her AgroWallet — before she even filed a claim.",
      attribution: "Abena, Rice Farmer, Upper East Region, Ghana",
    },
  },
  {
    id: "agrotrucker",
    name: "AgroTrucker",
    headline: "Logistics That Close the Last Mile",
    subtitle:
      "Connecting farmers with transporters to move produce from farm gate to market — reliably and affordably.",
    features: [
      "On-demand transport booking with real-time driver matching",
      "Price estimates before booking based on distance, load, and vehicle type",
      "GPS tracking of shipments from pickup to delivery",
      "Cold chain monitoring for perishable goods",
      "Cooperative bulk transport scheduling with route optimization",
      "Driver ratings and verification for safety and reliability",
    ],
    useCase: {
      quote:
        "Yaw's tomatoes used to rot waiting for transport. With AgroTrucker, he books a refrigerated pickup the same day of harvest. His post-harvest loss dropped from 35% to under 5%.",
      attribution: "Yaw, Tomato Farmer, Bono Region, Ghana",
    },
  },
  {
    id: "agroweather",
    name: "AgroWeather",
    headline: "Forecasts Built for the Field",
    subtitle:
      "Hyper-local, farm-level weather intelligence that speaks the language of planting, spraying, and harvesting.",
    features: [
      "7-day hyper-local forecasts at 1km resolution for your exact farm location",
      "Actionable advisories: 'Good day to spray', 'Delay planting 48 hours'",
      "Historical rainfall and temperature trends for seasonal planning",
      "Severe weather alerts (flood, heatwave, harmattan) via SMS and push",
      "Integration with AgroFarm for automated crop calendar adjustments",
      "Seasonal outlook reports to inform input purchasing decisions",
    ],
    useCase: {
      quote:
        "Fatima received a 72-hour heavy rain alert from AgroWeather and moved her drying groundnuts to shelter. Neighboring farmers who didn't have the alert lost nearly half their harvest to moisture damage.",
      attribution: "Fatima, Groundnut Farmer, Northern Region, Ghana",
    },
  },
  {
    id: "agroguide",
    name: "AgroGuide",
    headline: "Expert Advice at Your Fingertips",
    subtitle:
      "AI-powered agronomic advisory with human expert validation — available in local languages via chat, voice, or SMS.",
    features: [
      "AI chatbot trained on West African crop science and best practices",
      "Photo-based pest and disease diagnosis with treatment recommendations",
      "Advice available in English, French, Twi, Hausa, Yoruba, and Ewe",
      "Human expert review for complex or high-stakes recommendations",
      "SMS-based advisory for farmers without smartphones",
      "Seasonal tips and reminders aligned to regional growing calendars",
    ],
    useCase: {
      quote:
        "Emeka's pepper plants had an unfamiliar leaf curl. He described the symptoms in Yoruba via SMS, and AgroGuide identified whitefly infestation and recommended neem-based treatment available at his nearest agro-dealer.",
      attribution: "Emeka, Pepper Farmer, Oyo State, Nigeria",
    },
  },
];

export default function FeaturesPage() {
  const structuredData = [
    buildWebPageJsonLd(
      "Agrodomain Features",
      featuresDescription,
      "/features",
      "CollectionPage",
    ),
    buildItemListJsonLd(
      "Agrodomain modules",
      modules.map((module) => ({
        name: module.name,
        url: `/features#${module.id}`,
        description: module.subtitle,
      })),
    ),
  ];

  return (
    <PublicPageShell>
      <main className="page-shell" id="main-content">
      <JsonLd data={structuredData} />
      {/* Hero */}
      <section
        style={{
          background: "var(--color-brand-900, #1a2f1e)",
          padding: "80px 24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <p
            style={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--color-accent-400, #e5a94e)",
              marginBottom: 12,
            }}
          >
            Platform
          </p>
          <h1
            style={{
              fontFamily: "var(--font-dm-sans)",
              fontWeight: 700,
              fontSize: "clamp(2.25rem, 5vw, 3.25rem)",
              lineHeight: 1.15,
              color: "#fff",
              marginBottom: 20,
            }}
          >
            Eight Modules. One Platform. Zero Gaps.
          </h1>
          <p
            style={{
              fontSize: "1.25rem",
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.80)",
              maxWidth: 680,
              margin: "0 auto",
            }}
          >
            Every tool a farmer, buyer, transporter, or investor needs — integrated,
            intelligent, and built for Africa.
          </p>
        </div>
      </section>

      {/* Module Sub-Nav */}
      <nav
        style={{
          position: "sticky",
          top: "var(--pub-nav-height, 72px)",
          zIndex: 900,
          height: 52,
          background: "#fff",
          borderBottom: "1px solid var(--color-neutral-200, #e2e0dc)",
          boxShadow: "0 2px 8px rgba(26,47,30,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflowX: "auto",
          gap: 28,
          padding: "0 24px",
        }}
        aria-label="Module navigation"
      >
        {modules.map((mod) => (
          <a
            key={mod.id}
            href={`#${mod.id}`}
            style={{
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "var(--ink-muted)",
              textDecoration: "none",
              whiteSpace: "nowrap",
              padding: "4px 0",
              transition: "color 150ms",
            }}
          >
            {mod.name}
          </a>
        ))}
      </nav>

      {/* Module Sections */}
      {modules.map((mod, i) => {
        const isEven = i % 2 === 1;
        const bgColor = isEven
          ? "var(--color-neutral-50, #f8f3ea)"
          : "#fff";
        const useCaseBg = isEven
          ? "rgba(255,255,255,0.80)"
          : "rgba(26,47,30,0.04)";

        return (
          <section
            key={mod.id}
            id={mod.id}
            style={{ background: bgColor, padding: "96px 24px" }}
          >
            <div
              style={{
                maxWidth: 1200,
                margin: "0 auto",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 64,
                alignItems: "center",
              }}
            >
              {/* Screenshot placeholder */}
              <div
                style={{
                  order: isEven ? 2 : 1,
                  width: "100%",
                  maxWidth: 560,
                  aspectRatio: "4/3",
                  borderRadius: 16,
                  background: "var(--color-neutral-100, #f0ece4)",
                  border: "1px solid var(--color-neutral-200, #e2e0dc)",
                  boxShadow: "0 8px 32px rgba(26,47,30,0.10)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--ink-muted)",
                  fontSize: "0.875rem",
                }}
              >
                {mod.name} Interface Preview
              </div>

              {/* Text block */}
              <div style={{ order: isEven ? 1 : 2 }}>
                <p
                  style={{
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--color-accent-700, #c17b2a)",
                    marginBottom: 12,
                  }}
                >
                  {mod.name}
                </p>
                <h2
                  style={{
                    fontFamily: "var(--font-dm-sans)",
                    fontWeight: 700,
                    fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
                    lineHeight: 1.2,
                    color: "var(--ink)",
                    marginBottom: 12,
                  }}
                >
                  {mod.headline}
                </h2>
                <p
                  style={{
                    fontSize: "1.0625rem",
                    lineHeight: 1.6,
                    color: "var(--ink-muted)",
                    marginBottom: 28,
                  }}
                >
                  {mod.subtitle}
                </p>

                {/* Feature list */}
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px" }}>
                  {mod.features.map((feat) => (
                    <li
                      key={feat}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        marginBottom: 14,
                        fontSize: "0.9375rem",
                        lineHeight: 1.5,
                        color: "var(--ink)",
                      }}
                    >
                      <span
                        style={{
                          color: "var(--color-brand-500, #3d8c5a)",
                          fontWeight: 700,
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        ✓
                      </span>
                      {feat}
                    </li>
                  ))}
                </ul>

                {/* Use case box */}
                <div
                  style={{
                    background: useCaseBg,
                    borderRadius: 12,
                    padding: 24,
                    borderLeft: "4px solid var(--color-accent-700, #c17b2a)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.9375rem",
                      fontStyle: "italic",
                      lineHeight: 1.6,
                      color: "var(--ink-muted)",
                      marginBottom: 8,
                    }}
                  >
                    &ldquo;{mod.useCase.quote}&rdquo;
                  </p>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "var(--ink)",
                    }}
                  >
                    — {mod.useCase.attribution}
                  </p>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* Final CTA */}
      <section
        style={{
          background: "var(--color-brand-600, #2d5a3d)",
          padding: "80px 24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: "var(--font-dm-sans)",
              fontWeight: 700,
              fontSize: "clamp(1.5rem, 3vw, 2rem)",
              color: "#fff",
              marginBottom: 16,
            }}
          >
            Ready to experience all eight modules?
          </h2>
          <p
            style={{
              fontSize: "1rem",
              color: "rgba(255,255,255,0.80)",
              marginBottom: 28,
            }}
          >
            Create your free account and start using Agrodomain today.
          </p>
          <Link href="/signup" className="ds-btn ds-btn-primary ds-btn-lg">
            Start for Free
          </Link>
        </div>
      </section>
      </main>
    </PublicPageShell>
  );
}
