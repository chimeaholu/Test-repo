import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/public/public-nav";
import { PublicFooter } from "@/components/public/public-footer";
import { JsonLd } from "@/components/seo/json-ld";
import {
  buildItemListJsonLd,
  buildOrganizationJsonLd,
  buildPageMetadata,
  buildWebPageJsonLd,
  buildWebsiteJsonLd,
} from "@/lib/seo";

const features = [
  {
    id: "agromarket",
    title: "AgroMarket",
    desc: "Buy and sell crops at transparent, fair market prices. Connect directly with verified buyers and farmers \u2014 no middlemen.",
    iconBg: "rgba(74, 140, 94, 0.10)",
    iconColor: "#4a8c5e",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    id: "agrofund",
    title: "AgroFund",
    desc: "Access micro-loans, grants, and investment opportunities tailored to your farming cycle and creditworthiness.",
    iconBg: "rgba(193, 123, 42, 0.10)",
    iconColor: "#c17b2a",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    id: "agrofarm",
    title: "AgroFarm",
    desc: "AI-powered farm management tools \u2014 crop planning, input tracking, yield prediction, and personalized agronomic advice.",
    iconBg: "rgba(74, 140, 94, 0.10)",
    iconColor: "#4a8c5e",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 20h10" />
        <path d="M10 20c5.5-2.5.8-6.4 3-10" />
        <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
        <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
      </svg>
    ),
  },
  {
    id: "agrowallet",
    title: "AgroWallet",
    desc: "Send, receive, and save money with a digital wallet built for rural economies. Mobile-money integrated.",
    iconBg: "rgba(59, 130, 196, 0.10)",
    iconColor: "#3b82c4",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M2 10h20" />
        <circle cx="16" cy="14" r="2" />
      </svg>
    ),
  },
  {
    id: "agroshield",
    title: "AgroShield",
    desc: "Affordable crop and livestock insurance that pays out automatically when weather events strike. No paperwork.",
    iconBg: "rgba(196, 75, 59, 0.10)",
    iconColor: "#c44b3b",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    id: "agrotrucker",
    title: "AgroTrucker",
    desc: "Book verified transporters on demand. Track your shipment from farm to market in real time.",
    iconBg: "rgba(193, 123, 42, 0.10)",
    iconColor: "#c17b2a",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 3h15v13H1z" />
        <path d="M16 8h4l3 3v5h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    id: "agroweather",
    title: "AgroWeather",
    desc: "Hyper-local weather forecasts, rainfall predictions, and severe weather alerts delivered to your phone.",
    iconBg: "rgba(59, 130, 196, 0.10)",
    iconColor: "#3b82c4",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z" />
      </svg>
    ),
  },
  {
    id: "agroguide",
    title: "AgroGuide",
    desc: "Training modules, best-practice guides, and on-demand extension agent support \u2014 in your local language.",
    iconBg: "rgba(61, 140, 90, 0.10)",
    iconColor: "#3d8c5a",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
] as const;

const steps = [
  {
    num: "01",
    title: "Create Your Profile",
    desc: "Tell us who you are, where you farm, and what you grow. It takes less than five minutes.",
  },
  {
    num: "02",
    title: "Connect & Transact",
    desc: "List crops for sale, apply for funding, insure your harvest, or book a truck \u2014 all from one dashboard.",
  },
  {
    num: "03",
    title: "Grow & Thrive",
    desc: "Track your progress, access AI-powered insights, and scale your operation season after season.",
  },
] as const;

const testimonials = [
  {
    quote:
      "Before Agrodomain, I sold my maize to the first trader who came. Now I compare prices from six buyers and my income has increased by 40%. The insurance saved me last season when the rains failed.",
    name: "Ama Mensah",
    location: "Tamale, Northern Region, Ghana",
    crop: "Maize & Soybean Farmer",
    initials: "AM",
  },
  {
    quote:
      "AgroFund approved my loan in 48 hours. No bank would give me that speed. I used it to buy improved seeds and my cassava yield doubled. Now I am repaying early and applying for a bigger loan.",
    name: "Chidi Okonkwo",
    location: "Abia State, Nigeria",
    crop: "Cassava & Yam Farmer",
    initials: "CO",
  },
  {
    quote:
      "The weather alerts are a game-changer. Last month I got a storm warning two days early and harvested my peppers before the flood. My neighbors were not so lucky. I have told everyone in my parish about this app.",
    name: "Marcia Thompson",
    location: "St. Elizabeth Parish, Jamaica",
    crop: "Scotch Bonnet Pepper Farmer",
    initials: "MT",
  },
] as const;

const stats = [
  { value: "50,000+", label: "Farmers Reached" },
  { value: "GH\u20B512M+", label: "Transactions Processed" },
  { value: "15+", label: "Crops Covered" },
  { value: "3", label: "Countries" },
] as const;

const partners = ["GIZ", "USAID", "AfDB", "Mastercard Fdn", "AGRA", "World Bank"] as const;

const homeTitle = "The Super-Platform for African Agriculture";
const homeDescription =
  "Agrodomain helps farmers, buyers, cooperatives, investors, and advisers trade, fund, insure, and grow through one agricultural operating platform.";

export const metadata: Metadata = buildPageMetadata({
  title: homeTitle,
  description: homeDescription,
  path: "/",
  keywords: [
    "African agriculture platform",
    "farmer marketplace",
    "agricultural finance",
    "crop insurance platform",
    "farm management software",
    "Agrodomain",
  ],
});

export default function HomePage() {
  const structuredData = [
    buildOrganizationJsonLd(),
    buildWebsiteJsonLd(),
    buildWebPageJsonLd(homeTitle, homeDescription, "/"),
    buildItemListJsonLd(
      "Agrodomain platform modules",
      features.map((feature) => ({
        name: feature.title,
        url: `/features#${feature.id}`,
        description: feature.desc,
      })),
    ),
  ];

  return (
    <div className="pub-page">
      <PublicNav />

      <main id="main-content">
        <JsonLd data={structuredData} />
        {/* Hero */}
        <section className="pub-hero" aria-labelledby="hero-heading">
          <div className="pub-hero-overlay" />
          <div className="pub-hero-content">
            <span className="pub-hero-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#e5a94e" aria-hidden="true">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26" />
              </svg>
              Trusted by 50,000+ farmers across Africa &amp; the Caribbean
            </span>
            <h1 id="hero-heading" className="pub-hero-h1">
              The Super-Platform for African Agriculture
            </h1>
            <p className="pub-hero-sub">
              Trade. Fund. Insure. Grow. All powered by AI.
            </p>
            <div className="pub-hero-ctas">
              <Link href="/signup" className="pub-cta-primary">
                Start for Free
              </Link>
              <Link href="/#how-it-works" className="pub-cta-secondary">
                Watch How It Works &#9654;
              </Link>
            </div>
            <div className="pub-hero-scroll" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round">
                <path d="M7 13l5 5 5-5" />
              </svg>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="pub-partners">
          <p className="pub-partners-label">Partnered with</p>
          <div className="pub-partners-logos">
            {partners.map((p) => (
              <span key={p} className="pub-partner-logo" aria-label={`${p} logo`}>
                {p}
              </span>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="pub-features" aria-labelledby="features-heading">
          <div className="pub-section-header">
            <p className="pub-eyebrow">THE PLATFORM</p>
            <h2 id="features-heading" className="pub-h2">
              Everything Your Farm Needs. One Platform.
            </h2>
            <p className="pub-section-sub">
              Eight integrated modules designed for every participant in the agricultural value chain &mdash; from smallholder farmers to large-scale buyers.
            </p>
          </div>
          <div className="pub-features-grid">
            {features.map((f) => (
              <article key={f.id} className="pub-feature-card">
                <div
                  className="pub-feature-icon"
                  style={{ background: f.iconBg, color: f.iconColor }}
                >
                  {f.icon}
                </div>
                <h3 className="pub-feature-title">{f.title}</h3>
                <p className="pub-feature-desc">{f.desc}</p>
                <Link href={`/features#${f.id}`} className="pub-feature-link">
                  Learn more &rarr;
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="pub-hiw" aria-labelledby="hiw-heading">
          <div className="pub-section-header">
            <p className="pub-eyebrow">HOW IT WORKS</p>
            <h2 id="hiw-heading" className="pub-h2">
              From Sign-Up to Harvest in Three Steps
            </h2>
          </div>
          <div className="pub-hiw-grid">
            {steps.map((s, i) => (
              <article key={s.num} className="pub-hiw-step">
                <div className="pub-hiw-num">{s.num}</div>
                <h3 className="pub-hiw-title">{s.title}</h3>
                <p className="pub-hiw-desc">{s.desc}</p>
                {i < steps.length - 1 && <div className="pub-hiw-connector" aria-hidden="true" />}
              </article>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="pub-testimonials" aria-labelledby="testimonials-heading">
          <div className="pub-section-header pub-section-header--light">
            <p className="pub-eyebrow pub-eyebrow--gold">FARMER STORIES</p>
            <h2 id="testimonials-heading" className="pub-h2 pub-h2--white">
              Real Results from Real Farmers
            </h2>
          </div>
          <div className="pub-testimonials-grid">
            {testimonials.map((t) => (
              <article key={t.name} className="pub-testimonial-card">
                <div className="pub-testimonial-stars" aria-label="5 out of 5 stars" role="img">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#e5a94e" aria-hidden="true">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26" />
                    </svg>
                  ))}
                </div>
                <blockquote className="pub-testimonial-quote">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="pub-testimonial-divider" />
                <div className="pub-testimonial-author">
                  <div className="pub-testimonial-avatar" aria-hidden="true">
                    {t.initials}
                  </div>
                  <div>
                    <cite className="pub-testimonial-name">{t.name}</cite>
                    <p className="pub-testimonial-meta">{t.location}</p>
                    <p className="pub-testimonial-meta">{t.crop}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="pub-stats" aria-label="Platform statistics">
          <dl className="pub-stats-grid">
            {stats.map((s) => (
              <div key={s.label} className="pub-stat">
                <dd className="pub-stat-value">{s.value}</dd>
                <dt className="pub-stat-label">{s.label}</dt>
              </div>
            ))}
          </dl>
        </section>

        {/* Final CTA */}
        <section className="pub-final-cta">
          <div className="pub-cta-card">
            <h2 className="pub-cta-heading">
              Ready to Transform Your Agricultural Journey?
            </h2>
            <p className="pub-cta-sub">
              Join thousands of farmers and agribusinesses already growing smarter with Agrodomain.
            </p>
            <div className="pub-hero-ctas">
              <Link href="/signup" className="pub-cta-primary">
                Create Your Free Account
              </Link>
              <Link href="/contact" className="pub-cta-outlined">
                Talk to Our Team
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
