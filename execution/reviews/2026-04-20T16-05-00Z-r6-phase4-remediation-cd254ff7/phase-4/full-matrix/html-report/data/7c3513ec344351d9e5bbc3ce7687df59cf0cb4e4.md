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
          - paragraph [ref=e14]: yaw.1776702417782@example.com · Farmer · GH
          - paragraph [ref=e15]: This protected workspace keeps role routing, queue state, and consent posture persistent while you move between operational routes.
        - generic [ref=e16]:
          - generic [ref=e17]: Trace trace-p-offline-outbox-4jof5o
          - button "Sign out" [ref=e18] [cursor=pointer]
      - region "Sync status" [ref=e19]:
        - generic [ref=e20]:
          - generic [ref=e21]:
            - generic [ref=e22]: Low connectivity
            - generic [ref=e23]: Handoff ussd
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e24]
          - paragraph [ref=e25]: "Pending items: 1. Conflicts: 0. Trace ID: trace-p-offline-outbox-4jof5o."
        - generic [ref=e26]:
          - button "Force online" [ref=e27] [cursor=pointer]
          - button "Simulate degraded" [ref=e28] [cursor=pointer]
          - button "Simulate offline" [ref=e29] [cursor=pointer]
      - generic [ref=e31]:
        - generic [ref=e34]:
          - paragraph [ref=e35]: Offline recovery
          - heading "Outbox and replay controls" [level=2] [ref=e36]
          - paragraph [ref=e37]: Queued work stays in context, replay order stays deterministic, and each item exposes the envelope metadata the transport requires.
        - generic [ref=e38]:
          - article [ref=e39]:
            - generic [ref=e41]:
              - paragraph [ref=e42]: Queued mutations
              - heading "Actionable work" [level=2] [ref=e43]
              - paragraph [ref=e44]: Resolve or replay items in order. Conflicts should surface guidance before retry.
            - list [ref=e45]:
              - listitem [ref=e46]:
                - generic [ref=e47]:
                  - strong [ref=e48]: market.listings.create
                  - generic [ref=e49]: failed_retryable
                - paragraph [ref=e50]: Workflow wf-listing-001 · Attempts 1 · Created 2026-04-20T16:26:58.724Z
                - paragraph [ref=e51]:
                  - text: Idempotency key
                  - code [ref=e52]: 99393be4-fb00-4497-bc1c-786423baed3b
                - generic [ref=e53]:
                  - button "Retry" [active] [ref=e54] [cursor=pointer]
                  - button "Dismiss" [ref=e55] [cursor=pointer]
          - complementary [ref=e56]:
            - generic [ref=e58]:
              - paragraph [ref=e59]: Queue summary
              - heading "Recovery posture" [level=2] [ref=e60]
            - list [ref=e61]:
              - listitem [ref=e62]:
                - generic [ref=e63]: Connectivity
                - strong [ref=e64]: degraded
              - listitem [ref=e65]:
                - generic [ref=e66]: Actionable items
                - strong [ref=e67]: "1"
              - listitem [ref=e68]:
                - generic [ref=e69]: Conflicts
                - strong [ref=e70]: "0"
              - listitem [ref=e71]:
                - generic [ref=e72]: Suggested handoff
                - strong [ref=e73]: ussd
      - navigation "Mobile primary" [ref=e75]:
        - link "Home" [ref=e76] [cursor=pointer]:
          - /url: /app/farmer
          - generic [ref=e77]: Home
        - link "Market" [ref=e78] [cursor=pointer]:
          - /url: /app/market/listings
          - generic [ref=e79]: Market
        - link "Inbox 1" [ref=e80] [cursor=pointer]:
          - /url: /app/market/negotiations
          - generic [ref=e81]: Inbox
          - generic [ref=e82]: "1"
        - link "Alerts" [ref=e83] [cursor=pointer]:
          - /url: /app/climate/alerts
          - generic [ref=e84]: Alerts
        - link "Profile 2" [ref=e85] [cursor=pointer]:
          - /url: /app/profile
          - generic [ref=e86]: Profile
          - generic [ref=e87]: "2"
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