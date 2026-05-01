import Link from "next/link";

const platformLinks = [
  { label: "AgroMarket", href: "/features#agromarket" },
  { label: "AgroFund", href: "/features#agrofund" },
  { label: "AgroFarm", href: "/features#agrofarm" },
  { label: "AgroWallet", href: "/features#agrowallet" },
  { label: "AgroShield", href: "/features#agroshield" },
  { label: "AgroTrucker", href: "/features#agrotrucker" },
  { label: "AgroWeather", href: "/features#agroweather" },
  { label: "AgroGuide", href: "/features#agroguide" },
] as const;

const companyLinks = [
  { label: "About", href: "/about" },
  { label: "Careers", href: "/about#careers" },
  { label: "Blog", href: "/blog" },
  { label: "Press", href: "/about#press" },
  { label: "Partners", href: "/about#partners" },
  { label: "Contact", href: "/contact" },
] as const;

const legalLinks = [
  { label: "Terms of Service", href: "/legal/terms" },
  { label: "Privacy Policy", href: "/legal/privacy" },
  { label: "Cookie Policy", href: "/legal/cookies" },
  { label: "Licenses", href: "/legal/licenses" },
] as const;

const socialLinks = [
  { label: "Twitter", href: "https://twitter.com/agrodomain" },
  { label: "LinkedIn", href: "https://linkedin.com/company/agrodomain" },
  { label: "Facebook", href: "https://facebook.com/agrodomain" },
  { label: "Instagram", href: "https://instagram.com/agrodomain" },
  { label: "WhatsApp", href: "https://wa.me/233000000000" },
  { label: "YouTube", href: "https://youtube.com/@agrodomain" },
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
              <svg width="32" height="32" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                <circle cx="18" cy="18" r="16" fill="rgba(255,255,255,0.08)" />
                <path d="M18 28V16c0-6 3.5-10.5 10-13-6.5 2.5-8.5 7-10 13z" fill="#ffffff" />
                <path d="M18 28V16c0-6-3.5-10.5-10-13 6.5 2.5 8.5 7 10 13z" fill="rgba(255,255,255,0.6)" />
                <circle cx="18" cy="30" r="2" fill="#e5a94e" />
              </svg>
              <span className="pub-footer-wordmark">agrodomain</span>
            </div>
            <p className="pub-footer-tagline">
              Empowering African agriculture through technology.
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
          <p>Made with &hearts; in Accra, Lagos &amp; Kingston</p>
        </div>
      </div>
    </footer>
  );
}
