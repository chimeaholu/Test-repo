# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: r5-ux-hardening.spec.ts >> R5 UX hardening >> public routes remove planning copy and keep primary actions reachable at 320px
- Location: tests/e2e/r5-ux-hardening.spec.ts:12:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('link', { name: 'Review offline recovery' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('link', { name: 'Review offline recovery' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - main [ref=e3]:
    - generic [ref=e4]:
      - paragraph [ref=e5]: Agricultural operations platform
      - heading "Run marketplace, operations, finance, and field decisions from one trusted workspace." [level=1] [ref=e6]
      - paragraph [ref=e7]: Agrodomain routes every actor to the right workspace, keeps access and consent explicit, and preserves work when connectivity drops so teams can keep operating without guesswork.
      - generic [ref=e8]:
        - link "Open sign in" [ref=e9] [cursor=pointer]:
          - /url: /signin
        - link "Review recovery tools" [ref=e10] [cursor=pointer]:
          - /url: /app/offline/outbox
      - generic [ref=e11]:
        - list [ref=e12]:
          - listitem [ref=e13]:
            - generic [ref=e14]: Primary journeys
            - strong [ref=e15]: Onboarding, marketplace, dispatch, finance
          - listitem [ref=e16]:
            - generic [ref=e17]: Access model
            - strong [ref=e18]: Role-based with explicit consent
          - listitem [ref=e19]:
            - generic [ref=e20]: Recovery posture
            - strong [ref=e21]: Offline queue and replay controls
        - generic [ref=e22]:
          - strong [ref=e23]: What teams can do here
          - paragraph [ref=e24]: Move from sign-in to production work quickly, then keep evidence, approvals, and recovery options visible as conditions change.
    - generic [ref=e25]:
      - article [ref=e26]:
        - heading "Role-specific workspaces" [level=2] [ref=e27]
        - paragraph [ref=e28]: Farmers, buyers, cooperative teams, advisors, finance teams, and admins each land on the work that matters next.
      - article [ref=e29]:
        - heading "Access you can explain" [level=2] [ref=e30]
        - paragraph [ref=e31]: Sign-in and consent stay explicit so regulated actions never unlock behind a silent redirect or hidden policy check.
      - article [ref=e32]:
        - heading "Recovery built into the workflow" [level=2] [ref=e33]
        - paragraph [ref=e34]: Queue depth, replay order, and conflict handling stay visible so teams know what is pending, what failed, and what to do next.
    - generic [ref=e35]:
      - complementary [ref=e36]:
        - strong [ref=e37]: Designed for operational trust
        - paragraph [ref=e38]: The interface favors plain-language actions, clear hierarchy, and visible evidence instead of decorative dashboard noise.
      - complementary [ref=e39]:
        - strong [ref=e40]: Built for mobile and desktop
        - paragraph [ref=e41]: Primary actions stay reachable on small screens while larger layouts expand into richer review surfaces without changing the task flow.
  - button "Open Next.js Dev Tools" [ref=e47] [cursor=pointer]:
    - img [ref=e48]
  - alert [ref=e51]
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | import { gotoPath, signIn, signInAndGrantConsent } from "./helpers";
  4  | 
  5  | const bannedCopy = /Wave 1 web lane|Wave 0|W-003|N4|N5|N2-A2/;
  6  | 
  7  | async function expectNoPlanningCopy(page: import("@playwright/test").Page): Promise<void> {
  8  |   await expect(page.locator("body")).not.toContainText(bannedCopy);
  9  | }
  10 | 
  11 | test.describe("R5 UX hardening", () => {
  12 |   test("public routes remove planning copy and keep primary actions reachable at 320px", async ({ page }) => {
  13 |     await page.setViewportSize({ width: 320, height: 900 });
  14 | 
  15 |     await gotoPath(page, "/");
  16 |     await expect(page.getByRole("link", { name: "Open sign in" })).toBeVisible();
> 17 |     await expect(page.getByRole("link", { name: "Review offline recovery" })).toBeVisible();
     |                                                                               ^ Error: expect(locator).toBeVisible() failed
  18 |     await expectNoPlanningCopy(page);
  19 | 
  20 |     await page.keyboard.press("Tab");
  21 |     await expect(page.getByRole("link", { name: "Skip to content" }).first()).toBeFocused();
  22 | 
  23 |     await gotoPath(page, "/signin");
  24 |     await expect(page.getByRole("heading", { name: "Load the right workspace without hiding the consent gate." })).toBeVisible();
  25 |     await expect(page.getByRole("button", { name: "Continue to onboarding" })).toBeVisible();
  26 |     await expectNoPlanningCopy(page);
  27 | 
  28 |     await signIn(page, {
  29 |       displayName: "Ama Mensah",
  30 |       email: "ama.r5@example.com",
  31 |       role: "admin",
  32 |       countryCode: "GH",
  33 |     });
  34 |     await expect(page.getByRole("heading", { name: "Set up identity and consent" })).toBeVisible();
  35 |     await expect(page.getByText("Policy 2026.04.w1")).toBeVisible();
  36 |     await expect(page.getByRole("button", { name: "Grant consent" })).toBeVisible();
  37 |     await expectNoPlanningCopy(page);
  38 |   });
  39 | 
  40 |   test("authenticated routes keep cleaned copy on critical operator surfaces", async ({ page }) => {
  41 |     await signInAndGrantConsent(page, {
  42 |       displayName: "Amina Owusu",
  43 |       email: "amina.r5@example.com",
  44 |       role: "admin",
  45 |       countryCode: "GH",
  46 |     });
  47 | 
  48 |     const routes: Array<{ path: string; heading: string }> = [
  49 |       { path: "/app/admin/analytics", heading: "Service health" },
  50 |       { path: "/app/notifications", heading: "Live route updates" },
  51 |       { path: "/app/payments/wallet", heading: "Ledger provenance and escrow lifecycle" },
  52 |       { path: "/app/offline/outbox", heading: "Outbox and replay controls" },
  53 |       { path: "/app/climate/alerts", heading: "Live alert triage with visible degraded-mode posture" },
  54 |       { path: "/app/advisory/new", heading: "Grounded guidance with reviewer state" },
  55 |       { path: "/app/market/negotiations", heading: "Inbox and thread controls with live negotiation state" },
  56 |       { path: "/app/cooperative/dispatch", heading: "Member dispatch board" },
  57 |     ];
  58 | 
  59 |     for (const route of routes) {
  60 |       await gotoPath(page, route.path);
  61 |       await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();
  62 |       await expectNoPlanningCopy(page);
  63 |     }
  64 |   });
  65 | });
  66 | 
```