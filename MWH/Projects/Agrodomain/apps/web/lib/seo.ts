import type { Metadata } from "next";

const FALLBACK_SITE_URL = "https://web-prod-n6-production.up.railway.app";

export const siteName = "Agrodomain";
export const siteDescription =
  "Agrodomain is the agricultural super-platform for Africa and the Caribbean, connecting farmers, buyers, cooperatives, investors, and advisers through trade, finance, insurance, weather, and AI-powered farm operations.";
export const siteTagline = "Trade. Fund. Insure. Grow. All powered by AI.";
export const socialImagePath = "/opengraph-image";
export const twitterImagePath = "/twitter-image";

export const defaultKeywords = [
  "agriculture platform",
  "agritech Africa",
  "farmer marketplace",
  "crop insurance",
  "farm financing",
  "agricultural logistics",
  "weather alerts for farmers",
  "Agrodomain",
] as const;

type BuildMetadataInput = {
  title: string;
  description: string;
  path: string;
  keywords?: readonly string[];
  noIndex?: boolean;
};

type FaqItem = {
  question: string;
  answer: string;
};

type ItemListEntry = {
  name: string;
  url: string;
  description?: string;
};

function normalizeSiteUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return FALLBACK_SITE_URL;

  const withProtocol = /^https?:\/\//u.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/u, "");
}

export function getSiteUrl(): URL {
  return new URL(
    normalizeSiteUrl(
      process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? FALLBACK_SITE_URL,
    ),
  );
}

export function absoluteUrl(path = "/"): string {
  return new URL(path, getSiteUrl()).toString();
}

function buildRobots(noIndex = false): NonNullable<Metadata["robots"]> {
  if (noIndex) {
    return {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
        "max-image-preview": "none",
        "max-snippet": 0,
        "max-video-preview": 0,
      },
    };
  }

  return {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  };
}

export function buildPageMetadata({
  title,
  description,
  path,
  keywords = defaultKeywords,
  noIndex = false,
}: BuildMetadataInput): Metadata {
  const canonical = absoluteUrl(path);

  return {
    title,
    description,
    keywords: [...keywords],
    alternates: noIndex
      ? undefined
      : {
          canonical,
        },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: canonical,
      title,
      description,
      siteName,
      images: [
        {
          url: absoluteUrl(socialImagePath),
          width: 1200,
          height: 630,
          alt: `${siteName} social preview`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteUrl(twitterImagePath)],
      creator: "@agrodomain",
      site: "@agrodomain",
    },
    robots: buildRobots(noIndex),
  };
}

export function buildNoIndexMetadata(
  input: Omit<BuildMetadataInput, "noIndex">,
): Metadata {
  return buildPageMetadata({ ...input, noIndex: true });
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: siteName,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/icon.svg"),
    description: siteDescription,
    email: "support@agrodomain.com",
    slogan: siteTagline,
    areaServed: ["Ghana", "Nigeria", "Jamaica"],
    sameAs: [
      "https://twitter.com/agrodomain",
      "https://linkedin.com/company/agrodomain",
      "https://facebook.com/agrodomain",
      "https://instagram.com/agrodomain",
      "https://youtube.com/@agrodomain",
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "support@agrodomain.com",
        availableLanguage: ["English"],
        areaServed: ["Ghana", "Nigeria", "Jamaica"],
      },
    ],
  };
}

export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: siteName,
    url: absoluteUrl("/"),
    description: siteDescription,
    publisher: {
      "@id": absoluteUrl("/#organization"),
    },
  };
}

export function buildWebPageJsonLd(
  title: string,
  description: string,
  path: string,
  type = "WebPage",
) {
  return {
    "@context": "https://schema.org",
    "@type": type,
    "@id": `${absoluteUrl(path)}#webpage`,
    url: absoluteUrl(path),
    name: title,
    description,
    isPartOf: {
      "@id": absoluteUrl("/#website"),
    },
    about: {
      "@id": absoluteUrl("/#organization"),
    },
  };
}

export function buildItemListJsonLd(name: string, entries: ItemListEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: entries.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      url: absoluteUrl(entry.url),
      ...(entry.description ? { description: entry.description } : {}),
    })),
  };
}

export function buildFaqJsonLd(items: readonly FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data);
}
