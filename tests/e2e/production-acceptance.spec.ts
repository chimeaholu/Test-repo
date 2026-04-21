import { expect, test } from "@playwright/test";

import { signInAs } from "./helpers/auth";

// ---------------------------------------------------------------------------
// Banned engineering terms — these must never appear in customer-facing UI
// ---------------------------------------------------------------------------
const BANNED_TERMS = [
  "W-001",
  "W-002",
  "W-003",
  "wave",
  "seam",
  "canonical",
  "deterministic",
  "control-plane",
  "posture",
  "envelope",
  "idempotency",
] as const;

const BANNED_REGEX = new RegExp(
  BANNED_TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
  "i",
);

// ---------------------------------------------------------------------------
// Route definitions with expected customer-facing content
// ---------------------------------------------------------------------------
interface RouteSpec {
  path: string;
  /** Short label for test names and screenshot filenames */
  slug: string;
  /** Headings or copy strings that MUST be present on the rendered page */
  expectedContent: string[];
}

const FARMER_ROUTES: RouteSpec[] = [
  {
    path: "/app/farmer",
    slug: "farmer-home",
    expectedContent: [
      "Finish setup, publish produce, and keep every field action recoverable",
      "Field flow",
      "List produce",
    ],
  },
  {
    path: "/app/market/listings",
    slug: "market-listings",
    expectedContent: [
      "Marketplace",
    ],
  },
  {
    path: "/app/market/negotiations",
    slug: "market-negotiations",
    expectedContent: [
      "Offers and negotiations",
      "Track every live negotiation in one place",
    ],
  },
  {
    path: "/app/advisory/new",
    slug: "advisory-new",
    expectedContent: [
      "Advisory workspace",
      "Review evidence-backed recommendations",
    ],
  },
  {
    path: "/app/climate/alerts",
    slug: "climate-alerts",
    expectedContent: [
      "Climate and MRV",
      "Monitor weather risk and field evidence with confidence in view",
    ],
  },
  {
    path: "/app/payments/wallet",
    slug: "payments-wallet",
    expectedContent: [
      "Wallet and escrow",
      "Payment timeline and delivery records",
    ],
  },
  {
    path: "/app/notifications",
    slug: "notifications",
    expectedContent: [
      "Notifications",
      "Important updates across your workflow",
    ],
  },
  {
    path: "/app/offline/outbox",
    slug: "offline-outbox",
    expectedContent: [
      "Offline recovery",
      "Outbox and replay controls",
    ],
  },
  {
    path: "/app/profile",
    slug: "profile",
    expectedContent: [
      "Consent and permissions",
      "Consent review",
    ],
  },
];

// ---------------------------------------------------------------------------
// Test identity
// ---------------------------------------------------------------------------
const FARMER_IDENTITY = {
  role: "farmer" as const,
  name: "Ama Mensah",
  email: `ama.acceptance.${Date.now()}@example.com`,
  country: "GH" as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function screenshotName(slug: string, viewport: string): string {
  return `acceptance-${slug}-${viewport}.png`;
}

/** Collect all visible text from the page (excluding script/style). */
async function visibleText(page: import("@playwright/test").Page): Promise<string> {
  return page.evaluate(() => {
    const body = document.querySelector("body");
    if (!body) return "";
    // Walk text nodes to collect rendered content
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toLowerCase();
        if (tag === "script" || tag === "style" || tag === "noscript") {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const parts: string[] = [];
    let current = walker.nextNode();
    while (current) {
      const text = current.textContent?.trim();
      if (text) parts.push(text);
      current = walker.nextNode();
    }
    return parts.join(" ");
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

test.describe("Production acceptance — farmer flow", () => {
  // Sign in once for the entire describe block
  test.beforeAll(async ({ browser }) => {
    // Warm-up: ensure the first real test does not eat the sign-in time
    const warmupPage = await browser.newPage();
    await signInAs(
      warmupPage,
      FARMER_IDENTITY.role,
      FARMER_IDENTITY.name,
      FARMER_IDENTITY.email,
      FARMER_IDENTITY.country,
    );
    // Stash the localStorage state so we can reuse it
    const storageState = await warmupPage.context().storageState();
    (test.info() as any).__acceptanceStorage = storageState;
    await warmupPage.close();
  });

  // -----------------------------------------------------------------------
  // 1. Sign-in and consent smoke test
  // -----------------------------------------------------------------------
  test("signs in as a farmer and completes the consent flow", async ({
    page,
  }) => {
    const uniqueEmail = `ama.signin.${Date.now()}@example.com`;

    // -- Navigate to sign-in --
    await page.goto("/signin", { waitUntil: "commit" });
    await expect(page.locator("form[data-interactive='true']")).toBeVisible({
      timeout: 20_000,
    });

    // Assert customer-facing sign-in copy
    await expect(
      page.getByRole("heading", {
        name: "Open the right workspace with trust checks visible from the first screen",
      }),
    ).toBeVisible();

    // -- Fill the form --
    await page.getByLabel("Full name").fill("Ama Mensah");
    await page.getByLabel("Email").fill(uniqueEmail);
    await page.getByLabel("Role").selectOption("farmer");
    await page.getByLabel("Country pack").selectOption("GH");
    await page.getByRole("button", { name: "Continue to onboarding" }).click();

    // -- Consent page --
    await expect(page).toHaveURL(/\/onboarding\/consent(\?.*)?$/, {
      timeout: 30_000,
    });
    await expect(
      page.getByRole("heading", {
        name: "Review access before the workspace opens",
      }),
    ).toBeVisible();

    // Verify required scopes are visible
    await expect(page.getByText("Identity and session controls")).toBeVisible();
    await expect(
      page.getByText("Workflow audit and regulated operations"),
    ).toBeVisible();

    // Check and submit
    await page.locator("input[name='accepted']").check();
    await page.getByRole("button", { name: "Grant consent" }).click();

    // -- Redirected to farmer home --
    await expect(page).toHaveURL(/\/app\/farmer$/, { timeout: 30_000 });
    await expect(
      page.getByRole("heading", {
        name: "Finish setup, publish produce, and keep every field action recoverable",
      }),
    ).toBeVisible();

    await page.screenshot({
      path: `test-results/acceptance-signin-consent-flow.png`,
      fullPage: true,
    });
  });

  // -----------------------------------------------------------------------
  // 2. Route-by-route content verification
  // -----------------------------------------------------------------------
  for (const route of FARMER_ROUTES) {
    test(`route ${route.slug} — loads with customer-facing content`, async ({
      page,
    }) => {
      // Authenticate
      await signInAs(
        page,
        FARMER_IDENTITY.role,
        FARMER_IDENTITY.name,
        `ama.${route.slug}.${Date.now()}@example.com`,
        FARMER_IDENTITY.country,
      );

      // Navigate to the target route
      await page.goto(route.path, { waitUntil: "commit", timeout: 60_000 });

      // Guard: not redirected back to sign-in
      const currentUrl = page.url();
      expect(currentUrl).not.toMatch(/\/signin(\?.*)?$/);

      // Wait for meaningful content to render
      await page.waitForLoadState("domcontentloaded");

      // Assert each expected content string is present
      for (const expected of route.expectedContent) {
        await expect(
          page.getByText(expected, { exact: false }).first(),
        ).toBeVisible({ timeout: 15_000 });
      }

      // Desktop screenshot
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.screenshot({
        path: `test-results/${screenshotName(route.slug, "desktop")}`,
        fullPage: true,
      });

      // Mobile screenshot
      await page.setViewportSize({ width: 375, height: 812 });
      await page.screenshot({
        path: `test-results/${screenshotName(route.slug, "mobile")}`,
        fullPage: true,
      });
    });
  }

  // -----------------------------------------------------------------------
  // 3. Content quality gate — banned engineering vocabulary
  // -----------------------------------------------------------------------
  test("content quality gate — no banned engineering terms on any route", async ({
    page,
  }) => {
    // Authenticate once
    await signInAs(
      page,
      FARMER_IDENTITY.role,
      FARMER_IDENTITY.name,
      `ama.quality.${Date.now()}@example.com`,
      FARMER_IDENTITY.country,
    );

    const violations: { route: string; term: string; snippet: string }[] = [];

    for (const route of FARMER_ROUTES) {
      await page.goto(route.path, { waitUntil: "commit", timeout: 60_000 });

      // Ensure we are not on the sign-in page
      const url = page.url();
      if (/\/signin(\?.*)?$/.test(url)) {
        // Re-authenticate if session was lost
        await signInAs(
          page,
          FARMER_IDENTITY.role,
          FARMER_IDENTITY.name,
          `ama.quality.retry.${Date.now()}@example.com`,
          FARMER_IDENTITY.country,
        );
        await page.goto(route.path, { waitUntil: "commit", timeout: 60_000 });
      }

      await page.waitForLoadState("domcontentloaded");

      const text = await visibleText(page);

      for (const term of BANNED_TERMS) {
        const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        if (regex.test(text)) {
          // Grab a snippet around the match for debugging
          const idx = text.toLowerCase().indexOf(term.toLowerCase());
          const start = Math.max(0, idx - 40);
          const end = Math.min(text.length, idx + term.length + 40);
          violations.push({
            route: route.path,
            term,
            snippet: text.slice(start, end),
          });
        }
      }
    }

    if (violations.length > 0) {
      const report = violations
        .map(
          (v) =>
            `  [${v.route}] found "${v.term}" — ...${v.snippet}...`,
        )
        .join("\n");
      // Fail hard with a clear report
      expect(
        violations,
        `Banned engineering terms found in customer-facing UI:\n${report}`,
      ).toHaveLength(0);
    }
  });
});
