import type { Metadata } from "next";
import Link from "next/link";

import { PublicPageShell } from "@/components/public/public-page-shell";
import { JsonLd } from "@/components/seo/json-ld";
import {
  buildOrganizationJsonLd,
  buildPageMetadata,
  buildWebPageJsonLd,
} from "@/lib/seo";

const aboutTitle = "About";
const aboutDescription =
  "Learn about Agrodomain's mission to democratize access to agricultural markets, finance, insurance, and knowledge for every farmer in Africa and the Caribbean.";

export const metadata: Metadata = buildPageMetadata({
  title: aboutTitle,
  description: aboutDescription,
  path: "/about",
  keywords: [
    "about Agrodomain",
    "agritech mission",
    "smallholder farmer platform",
    "African agriculture innovation",
    "Caribbean agriculture technology",
  ],
});

const stats = [
  { value: "60%", label: "Post-harvest losses in Sub-Saharan Africa" },
  { value: "$48B", label: "Financing gap in African agriculture" },
  { value: "70%", label: "Farmers with no crop insurance" },
];

const focusAreas = [
  {
    title: "Smallholder Empowerment",
    body: "Giving smallholder farmers digital tools to manage crops, access markets, track finances, and make data-driven decisions regardless of farm size.",
  },
  {
    title: "Market Access & Price Transparency",
    body: "Connecting farmers directly to verified buyers with real-time pricing, eliminating exploitative middlemen and ensuring fair returns.",
  },
  {
    title: "Climate Resilience",
    body: "Delivering hyper-local weather data, AI-powered yield predictions, and index-based insurance to protect livelihoods against climate shocks.",
  },
  {
    title: "Financial Inclusion",
    body: "Providing micro-loans, grants, and investment products designed around agricultural seasons so every farmer can access the capital they need.",
  },
];

const team = [
  { name: "Don Aholu", title: "Founder & CEO", initials: "DA" },
  { name: "Engineering Team", title: "Platform Development", initials: "ET" },
  { name: "Agronomy Team", title: "Agricultural Science", initials: "AT" },
  { name: "Operations Team", title: "Field Operations", initials: "OT" },
];

export default function AboutPage() {
  const structuredData = [
    buildOrganizationJsonLd(),
    buildWebPageJsonLd("About Agrodomain", aboutDescription, "/about", "AboutPage"),
  ];

  return (
    <PublicPageShell>
      <main className="page-shell" id="main-content">
      <JsonLd data={structuredData} />
      {/* Hero */}
      <section
        style={{
          background: "var(--color-brand-900, #1a2f1e)",
          padding: "96px 24px",
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
              marginBottom: 16,
            }}
          >
            Our Story
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
            Building the Operating System for African Agriculture
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
            We believe every farmer deserves access to fair markets, affordable credit,
            reliable weather data, and modern tools — regardless of farm size or location.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section style={{ background: "#fff", padding: "80px 24px" }}>
        <div
          style={{
            maxWidth: 1080,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 40,
          }}
        >
          <article
            style={{
              background: "var(--color-neutral-50, #f8f3ea)",
              borderRadius: 16,
              padding: "40px 36px",
              border: "1px solid var(--color-neutral-200, #e2e0dc)",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "rgba(74,140,94,0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                fontSize: 24,
              }}
            >
              🎯
            </div>
            <h2
              style={{
                fontFamily: "var(--font-dm-sans)",
                fontWeight: 600,
                fontSize: "1.375rem",
                color: "var(--ink)",
                marginBottom: 12,
              }}
            >
              Our Mission
            </h2>
            <p style={{ fontSize: "1rem", lineHeight: 1.7, color: "var(--ink-muted)" }}>
              To democratize access to agricultural markets, finance, insurance, and
              knowledge for every farmer in Africa and the Caribbean.
            </p>
          </article>

          <article
            style={{
              background: "var(--color-neutral-50, #f8f3ea)",
              borderRadius: 16,
              padding: "40px 36px",
              border: "1px solid var(--color-neutral-200, #e2e0dc)",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "rgba(193,123,42,0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                fontSize: 24,
              }}
            >
              🔭
            </div>
            <h2
              style={{
                fontFamily: "var(--font-dm-sans)",
                fontWeight: 600,
                fontSize: "1.375rem",
                color: "var(--ink)",
                marginBottom: 12,
              }}
            >
              Our Vision
            </h2>
            <p style={{ fontSize: "1rem", lineHeight: 1.7, color: "var(--ink-muted)" }}>
              A connected African agricultural ecosystem where every farmer — from a
              quarter-acre plot to a 500-hectare estate — thrives through technology.
            </p>
          </article>
        </div>
      </section>

      {/* The Problem We Solve */}
      <section style={{ background: "var(--color-neutral-50, #f8f3ea)", padding: "80px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", textAlign: "center" }}>
          <p
            style={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--color-accent-700, #c17b2a)",
              marginBottom: 12,
            }}
          >
            Why We Exist
          </p>
          <h2
            style={{
              fontFamily: "var(--font-dm-sans)",
              fontWeight: 700,
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              lineHeight: 1.2,
              color: "var(--ink)",
              marginBottom: 20,
            }}
          >
            Agriculture Feeds Africa. But Africa Doesn&apos;t Feed Its Farmers.
          </h2>
          <p
            style={{
              fontSize: "1.0625rem",
              lineHeight: 1.7,
              color: "var(--ink-muted)",
              maxWidth: 720,
              margin: "0 auto 40px",
            }}
          >
            Across Sub-Saharan Africa, smallholder farmers produce over 80% of the food supply yet
            remain locked out of fair markets, formal financing, and modern agricultural tools. The
            result: massive post-harvest losses, chronic underinvestment, and a widening gap between
            agricultural potential and farmer prosperity.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 24,
            }}
          >
            {stats.map((s) => (
              <article
                key={s.label}
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  padding: "32px 24px",
                  border: "1px solid var(--color-neutral-200, #e2e0dc)",
                  textAlign: "center",
                }}
              >
                <strong
                  style={{
                    fontSize: "2.5rem",
                    fontWeight: 700,
                    color: "var(--color-brand-600, #2d5a3d)",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  {s.value}
                </strong>
                <span style={{ fontSize: "0.9375rem", color: "var(--ink-muted)" }}>
                  {s.label}
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Focus Areas */}
      <section style={{ background: "#fff", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <p
            style={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--color-accent-700, #c17b2a)",
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            Focus Areas
          </p>
          <h2
            style={{
              fontFamily: "var(--font-dm-sans)",
              fontWeight: 700,
              fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
              color: "var(--ink)",
              marginBottom: 40,
              textAlign: "center",
            }}
          >
            Where We Work
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
            }}
          >
            {focusAreas.map((area) => (
              <article
                key={area.title}
                style={{
                  background: "var(--color-neutral-50, #f8f3ea)",
                  borderRadius: 16,
                  padding: "32px 28px",
                  border: "1px solid var(--color-neutral-200, #e2e0dc)",
                }}
              >
                <h3
                  style={{
                    fontFamily: "var(--font-dm-sans)",
                    fontWeight: 600,
                    fontSize: "1.125rem",
                    color: "var(--ink)",
                    marginBottom: 12,
                  }}
                >
                  {area.title}
                </h3>
                <p style={{ fontSize: "0.9375rem", lineHeight: 1.6, color: "var(--ink-muted)" }}>
                  {area.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section style={{ background: "var(--color-neutral-50, #f8f3ea)", padding: "80px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", textAlign: "center" }}>
          <p
            style={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--color-accent-700, #c17b2a)",
              marginBottom: 12,
            }}
          >
            The Team
          </p>
          <h2
            style={{
              fontFamily: "var(--font-dm-sans)",
              fontWeight: 700,
              fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
              color: "var(--ink)",
              marginBottom: 40,
            }}
          >
            The People Behind Agrodomain
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 24,
            }}
          >
            {team.map((member) => (
              <article key={member.name} style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    background: "var(--color-brand-600, #2d5a3d)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    margin: "0 auto 12px",
                  }}
                >
                  {member.initials}
                </div>
                <strong style={{ display: "block", color: "var(--ink)", marginBottom: 4 }}>
                  {member.name}
                </strong>
                <span style={{ fontSize: "0.875rem", color: "var(--ink-muted)" }}>
                  {member.title}
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Careers CTA */}
      <section
        style={{
          background: "var(--color-brand-900, #1a2f1e)",
          padding: "80px 24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: "var(--font-dm-sans)",
              fontWeight: 700,
              fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
              color: "#fff",
              marginBottom: 16,
            }}
          >
            Join Our Team
          </h2>
          <p
            style={{
              fontSize: "1.0625rem",
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.80)",
              marginBottom: 32,
            }}
          >
            We&apos;re building the future of African agriculture. If you&apos;re passionate about
            technology, agriculture, and impact, we want to hear from you.
          </p>
          <Link
            href="/contact"
            className="ds-btn ds-btn-primary ds-btn-lg"
            style={{
              background: "var(--color-accent-700, #c17b2a)",
              borderColor: "transparent",
            }}
          >
            Get in Touch
          </Link>
        </div>
      </section>

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
            Ready to transform how you farm, trade, or invest?
          </h2>
          <p
            style={{
              fontSize: "1rem",
              color: "rgba(255,255,255,0.80)",
              marginBottom: 28,
            }}
          >
            Join thousands of farmers, buyers, and investors already using Agrodomain.
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
