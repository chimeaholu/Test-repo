import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";

const platformLinks = [
  { label: "Sell and get paid", href: "/features#trade-payments" },
  { label: "Protect your season", href: "/features#protection-planning" },
  { label: "Move and grow trade", href: "/features#logistics-growth" },
  { label: "Guided preview", href: "/preview" },
] as const;

const companyLinks = [
  { label: "About", href: "/about" },
  { label: "Features", href: "/features" },
  { label: "Contact", href: "/contact" },
] as const;

const legalLinks = [
  { label: "Terms of Service", href: "/legal/terms" },
  { label: "Privacy Policy", href: "/legal/privacy" },
  { label: "Create account", href: "/signup" },
  { label: "Sign in", href: "/signin" },
] as const;

const socialLinks = [
  { label: "Start as farmer", href: "/signup" },
  { label: "Start as buyer", href: "/signup" },
  { label: "Start as transporter", href: "/signup" },
  { label: "Ask for help", href: "/contact" },
] as const;

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pub-footer-col">
      <h4 className="pub-footer-col-title">{title}</h4>
      <ul className="pub-footer-col-list">{children}</ul>
    </div>
  );
}

export function PublicFooter() {
  return (
    <footer className="pub-footer" role="contentinfo">
      <div className="pub-footer-inner">
        <div className="pub-footer-top">
          <div className="pub-footer-brand">
            <div className="pub-footer-logo">
              <BrandMark caption="One platform for selling, protecting, moving, and growing farm business" light />
            </div>
            <p className="pub-footer-tagline">
              Built for farmers, buyers, cooperatives, transporters, and teams working across the chain.
            </p>
          </div>

          <div className="pub-footer-columns">
            <FooterColumn title="Platform">
              {platformLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </FooterColumn>

            <FooterColumn title="Company">
              {companyLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </FooterColumn>

            <FooterColumn title="Legal">
              {legalLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </FooterColumn>

            <FooterColumn title="Connect">
              {socialLinks.map((l) => (
                <li key={l.href}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer">
                    {l.label}
                  </a>
                </li>
              ))}
            </FooterColumn>
          </div>
        </div>

        <div className="pub-footer-divider" />

        <div className="pub-footer-bottom">
          <p>&copy; 2026 Agrodomain Technologies Ltd. All rights reserved.</p>
          <p>Built for mobile-first agricultural work in Nigeria and Ghana.</p>
        </div>
      </div>
    </footer>
  );
}
