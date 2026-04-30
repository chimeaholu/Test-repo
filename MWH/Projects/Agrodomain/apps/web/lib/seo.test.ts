import { afterEach, describe, expect, it, vi } from "vitest";

import {
  absoluteUrl,
  buildNoIndexMetadata,
  buildPageMetadata,
  getSiteUrl,
} from "@/lib/seo";

describe("seo helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the deployed railway URL when no site env is present", () => {
    vi.unstubAllEnvs();

    expect(getSiteUrl().toString()).toBe("https://web-prod-n6-production.up.railway.app/");
    expect(absoluteUrl("/features")).toBe(
      "https://web-prod-n6-production.up.railway.app/features",
    );
  });

  it("normalizes configured site URLs before building canonical links", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "agrodomain.com/");

    expect(getSiteUrl().toString()).toBe("https://agrodomain.com/");
    expect(absoluteUrl("/contact")).toBe("https://agrodomain.com/contact");
  });

  it("builds indexable metadata with canonical and social fields", () => {
    const metadata = buildPageMetadata({
      title: "Features",
      description: "Explore Agrodomain modules.",
      path: "/features",
    });

    expect(metadata.alternates?.canonical).toBe(
      "https://web-prod-n6-production.up.railway.app/features",
    );
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
    expect(metadata.openGraph?.url).toBe(
      "https://web-prod-n6-production.up.railway.app/features",
    );
    expect(metadata.twitter?.images).toEqual([
      "https://web-prod-n6-production.up.railway.app/twitter-image",
    ]);
  });

  it("builds noindex metadata for auth and protected surfaces", () => {
    const metadata = buildNoIndexMetadata({
      title: "Sign In",
      description: "Sign in to Agrodomain.",
      path: "/signin",
    });

    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });
});
