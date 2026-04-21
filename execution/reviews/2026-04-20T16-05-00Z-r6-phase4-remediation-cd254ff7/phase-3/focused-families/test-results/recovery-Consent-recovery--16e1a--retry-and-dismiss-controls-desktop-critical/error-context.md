# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: recovery.spec.ts >> Consent recovery and offline retry >> offline seam exposes connectivity, retry, and dismiss controls
- Location: tests/e2e/recovery.spec.ts:56:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('acked')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByText('acked')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - alert [ref=e3]
  - generic [ref=e4]:
    - link "Skip to content" [ref=e5] [cursor=pointer]:
      - /url: "#main-content"
    - main [ref=e6]:
      - generic [ref=e7]:
        - generic [ref=e8]:
          - generic [ref=e9]:
            - generic [ref=e10]: Farmer
            - generic [ref=e11]: GH
          - paragraph [ref=e12]: Yaw Farmer
          - heading "Ghana Growers Network" [level=1] [ref=e13]
          - paragraph [ref=e14]: yaw.1776701469873@example.com · Farmer · GH
          - paragraph [ref=e15]: This protected workspace keeps role routing, queue state, and consent posture persistent while you move between operational routes.
        - generic [ref=e16]:
          - generic [ref=e17]: Trace trace-p-offline-outbox-magsxg
          - button "Sign out" [ref=e18] [cursor=pointer]
      - region "Sync status" [ref=e19]:
        - generic [ref=e20]:
          - generic [ref=e21]:
            - generic [ref=e22]: Low connectivity
            - generic [ref=e23]: Handoff ussd
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e24]
          - paragraph [ref=e25]: "Pending items: 1. Conflicts: 0. Trace ID: trace-p-offline-outbox-magsxg."
        - generic [ref=e26]:
          - button "Force online" [ref=e27] [cursor=pointer]
          - button "Simulate degraded" [ref=e28] [cursor=pointer]
          - button "Simulate offline" [ref=e29] [cursor=pointer]
      - generic [ref=e30]:
        - complementary [ref=e31]:
          - generic [ref=e32]:
            - generic [ref=e33]:
              - generic [ref=e35]:
                - paragraph [ref=e36]: Role-aware workspace
                - heading "Farmer operations" [level=2] [ref=e37]
                - paragraph [ref=e38]: The workspace routes to the correct role surface while keeping consent, queue, and offline state visible.
              - navigation "Primary" [ref=e39]:
                - generic [ref=e40]:
                  - link "Home" [ref=e41] [cursor=pointer]:
                    - /url: /app/farmer
                    - generic [ref=e42]: Home
                  - link "Market" [ref=e43] [cursor=pointer]:
                    - /url: /app/market/listings
                    - generic [ref=e44]: Market
                  - link "Inbox 1" [ref=e45] [cursor=pointer]:
                    - /url: /app/market/negotiations
                    - generic [ref=e46]: Inbox
                    - generic [ref=e47]: "1"
                  - link "Alerts" [ref=e48] [cursor=pointer]:
                    - /url: /app/climate/alerts
                    - generic [ref=e49]: Alerts
                  - link "Profile 2" [ref=e50] [cursor=pointer]:
                    - /url: /app/profile
                    - generic [ref=e51]: Profile
                    - generic [ref=e52]: "2"
            - list [ref=e53]:
              - listitem [ref=e54]:
                - generic [ref=e55]: Home route
                - strong [ref=e56]: /app/farmer
              - listitem [ref=e57]:
                - generic [ref=e58]: Field posture
                - strong [ref=e59]: Field actions
              - listitem [ref=e60]:
                - generic [ref=e61]: Proof posture
                - strong [ref=e62]: Why this is safe
            - complementary [ref=e63]:
              - strong [ref=e64]: Design note
              - paragraph [ref=e65]: Consent, queue freshness, and evidence ownership stay visible before any protected action.
        - generic [ref=e66]:
          - generic [ref=e69]:
            - paragraph [ref=e70]: Offline recovery
            - heading "Outbox and replay controls" [level=2] [ref=e71]
            - paragraph [ref=e72]: Queued work stays in context, replay order stays deterministic, and each item exposes the envelope metadata the transport requires.
          - generic [ref=e73]:
            - article [ref=e74]:
              - generic [ref=e76]:
                - paragraph [ref=e77]: Queued mutations
                - heading "Actionable work" [level=2] [ref=e78]
                - paragraph [ref=e79]: Resolve or replay items in order. Conflicts should surface guidance before retry.
              - list [ref=e80]:
                - listitem [ref=e81]:
                  - generic [ref=e82]:
                    - strong [ref=e83]: market.listings.create
                    - generic [ref=e84]: failed_retryable
                  - paragraph [ref=e85]: Workflow wf-listing-001 · Attempts 1 · Created 2026-04-20T16:11:11.106Z
                  - paragraph [ref=e86]:
                    - text: Idempotency key
                    - code [ref=e87]: 7e0b3116-936f-45ba-838e-70c67c697e0a
                  - generic [ref=e88]:
                    - button "Retry" [active] [ref=e89] [cursor=pointer]
                    - button "Dismiss" [ref=e90] [cursor=pointer]
            - complementary [ref=e91]:
              - generic [ref=e93]:
                - paragraph [ref=e94]: Queue summary
                - heading "Recovery posture" [level=2] [ref=e95]
              - list [ref=e96]:
                - listitem [ref=e97]:
                  - generic [ref=e98]: Connectivity
                  - strong [ref=e99]: degraded
                - listitem [ref=e100]:
                  - generic [ref=e101]: Actionable items
                  - strong [ref=e102]: "1"
                - listitem [ref=e103]:
                  - generic [ref=e104]: Conflicts
                  - strong [ref=e105]: "0"
                - listitem [ref=e106]:
                  - generic [ref=e107]: Suggested handoff
                  - strong [ref=e108]: ussd
```

# Test source

```ts
  1  | import { expect, test, type Page } from "@playwright/test";
  2  | 
  3  | import { grantConsent, gotoPath, signIn, signInAndGrantConsent } from "./helpers";
  4  | 
  5  | async function expectHydratedHeading(page: Page, name: string): Promise<void> {
  6  |   const bootHeading = page.getByRole("heading", { name: "Restoring route and contract state." });
  7  |   await bootHeading.waitFor({ state: "hidden", timeout: 20_000 }).catch(() => undefined);
  8  |   await expect(page.getByRole("heading", { name })).toBeVisible({ timeout: 20_000 });
  9  | }
  10 | 
  11 | test.describe("Consent recovery and offline retry", () => {
  12 |   test.setTimeout(180_000);
  13 | 
  14 |   test("consent revoke blocks protected routes until restored", async ({ page }) => {
  15 |     const displayName = "Esi Farmer";
  16 |     const email = `esi.${Date.now()}@example.com`;
  17 | 
  18 |     await signInAndGrantConsent(page, {
  19 |       displayName,
  20 |       email,
  21 |       role: "farmer",
  22 |     });
  23 | 
  24 |     await gotoPath(page, "/app/profile");
  25 |     await expectHydratedHeading(page, "Consent and permissions");
  26 |     await page
  27 |       .getByLabel("Reason for revocation")
  28 |       .fill("Consent needs review");
  29 |     await page.getByRole("button", { name: "Revoke consent" }).click();
  30 | 
  31 |     await expect(page.getByText("consent_revoked")).toBeVisible();
  32 |     await gotoPath(page, "/app/market/listings");
  33 |     await expect(page).toHaveURL(/\/(signin|onboarding\/consent)$/);
  34 | 
  35 |     if (page.url().endsWith("/signin")) {
  36 |       await signIn(page, {
  37 |         displayName,
  38 |         email,
  39 |         role: "farmer",
  40 |       });
  41 |       await grantConsent(page);
  42 |       await expect(page).toHaveURL(/\/app\/farmer$/);
  43 |     } else {
  44 |       await gotoPath(page, "/app/profile");
  45 |       await page.getByRole("button", { name: "Restore consent" }).click();
  46 |       await expect(page).toHaveURL(/\/app\/farmer$/);
  47 |     }
  48 | 
  49 |     await gotoPath(page, "/app/market/listings");
  50 |     await expectHydratedHeading(
  51 |       page,
  52 |       "Create, revise, and publish inventory with clear market status",
  53 |     );
  54 |   });
  55 | 
  56 |   test("offline seam exposes connectivity, retry, and dismiss controls", async ({ page }) => {
  57 |     await signInAndGrantConsent(page, {
  58 |       displayName: "Yaw Farmer",
  59 |       email: `yaw.${Date.now()}@example.com`,
  60 |       role: "farmer",
  61 |     });
  62 | 
  63 |     await gotoPath(page, "/app/offline/outbox");
  64 |     await expect(page.getByRole("heading", { name: "Outbox and replay controls" })).toBeVisible();
  65 |     await expect(page.getByText(/Suggested handoff/i)).toBeVisible();
  66 |     await expect(page.getByText("Attempts 0")).toBeVisible();
  67 | 
  68 |     await page.getByRole("button", { name: "Retry" }).click();
> 69 |     await expect(page.getByText("acked")).toBeVisible();
     |                                           ^ Error: expect(locator).toBeVisible() failed
  70 |     await expect(page.getByText("Attempts 1")).toBeVisible();
  71 | 
  72 |     await page.getByRole("button", { name: "Simulate offline" }).click();
  73 |     await expect(page.locator(".sync-banner .status-pill").filter({ hasText: "Offline" })).toBeVisible();
  74 |     await expect(page.locator(".sync-banner .status-pill").filter({ hasText: "Handoff whatsapp" })).toBeVisible();
  75 | 
  76 |     await page.getByRole("button", { name: "Force online" }).click();
  77 |     await expect(page.locator(".sync-banner .status-pill").filter({ hasText: "Online" })).toBeVisible();
  78 |     await expect(page.locator(".sync-banner .status-pill").filter({ hasText: "Handoff whatsapp" })).toHaveCount(0);
  79 | 
  80 |     await page.getByRole("button", { name: "Dismiss" }).click();
  81 |     await expect(page.getByText("market.listings.create")).toHaveCount(0);
  82 |   });
  83 | });
  84 | 
```