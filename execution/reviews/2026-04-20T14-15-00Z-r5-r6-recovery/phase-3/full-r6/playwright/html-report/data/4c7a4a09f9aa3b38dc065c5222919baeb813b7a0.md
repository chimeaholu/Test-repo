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
  - button "Open Next.js Dev Tools" [ref=e8] [cursor=pointer]:
    - img [ref=e9]
  - alert [ref=e12]
  - generic [ref=e13]:
    - link "Skip to content" [ref=e14] [cursor=pointer]:
      - /url: "#main-content"
    - main [ref=e15]:
      - generic [ref=e16]:
        - generic [ref=e17]:
          - generic [ref=e18]:
            - generic [ref=e19]: Farmer
            - generic [ref=e20]: GH
          - paragraph [ref=e21]: Yaw Farmer
          - heading "Ghana Growers Network" [level=1] [ref=e22]
          - paragraph [ref=e23]: yaw.1776695838927@example.com · Farmer · GH
          - paragraph [ref=e24]: This protected workspace keeps role routing, queue state, and consent posture persistent while you move between operational routes.
        - generic [ref=e25]:
          - generic [ref=e26]: Trace trace-p-offline-outbox-unh2iy
          - button "Sign out" [ref=e27] [cursor=pointer]
      - region "Sync status" [ref=e28]:
        - generic [ref=e29]:
          - generic [ref=e30]:
            - generic [ref=e31]: Low connectivity
            - generic [ref=e32]: Handoff ussd
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e33]
          - paragraph [ref=e34]: "Pending items: 1. Conflicts: 0. Trace ID: trace-p-offline-outbox-unh2iy."
        - generic [ref=e35]:
          - button "Force online" [ref=e36] [cursor=pointer]
          - button "Simulate degraded" [ref=e37] [cursor=pointer]
          - button "Simulate offline" [ref=e38] [cursor=pointer]
      - generic [ref=e39]:
        - complementary [ref=e40]:
          - generic [ref=e41]:
            - generic [ref=e42]:
              - generic [ref=e44]:
                - paragraph [ref=e45]: Role-aware workspace
                - heading "Farmer operations" [level=2] [ref=e46]
                - paragraph [ref=e47]: The workspace routes to the correct role surface while keeping consent, queue, and offline state visible.
              - navigation "Primary" [ref=e48]:
                - generic [ref=e49]:
                  - link "Home" [ref=e50] [cursor=pointer]:
                    - /url: /app/farmer
                    - generic [ref=e51]: Home
                  - link "Market" [ref=e52] [cursor=pointer]:
                    - /url: /app/market/listings
                    - generic [ref=e53]: Market
                  - link "Inbox 1" [ref=e54] [cursor=pointer]:
                    - /url: /app/market/negotiations
                    - generic [ref=e55]: Inbox
                    - generic [ref=e56]: "1"
                  - link "Alerts" [ref=e57] [cursor=pointer]:
                    - /url: /app/climate/alerts
                    - generic [ref=e58]: Alerts
                  - link "Profile 2" [ref=e59] [cursor=pointer]:
                    - /url: /app/profile
                    - generic [ref=e60]: Profile
                    - generic [ref=e61]: "2"
            - list [ref=e62]:
              - listitem [ref=e63]:
                - generic [ref=e64]: Home route
                - strong [ref=e65]: /app/farmer
              - listitem [ref=e66]:
                - generic [ref=e67]: Field posture
                - strong [ref=e68]: Field actions
              - listitem [ref=e69]:
                - generic [ref=e70]: Proof posture
                - strong [ref=e71]: Why this is safe
            - complementary [ref=e72]:
              - strong [ref=e73]: Design note
              - paragraph [ref=e74]: Consent, queue freshness, and evidence ownership stay visible before any protected action.
        - generic [ref=e75]:
          - generic [ref=e78]:
            - paragraph [ref=e79]: Offline recovery
            - heading "Outbox and replay controls" [level=2] [ref=e80]
            - paragraph [ref=e81]: Queued work stays in context, replay order stays deterministic, and each item exposes the envelope metadata the transport requires.
          - generic [ref=e82]:
            - article [ref=e83]:
              - generic [ref=e85]:
                - paragraph [ref=e86]: Queued mutations
                - heading "Actionable work" [level=2] [ref=e87]
                - paragraph [ref=e88]: Resolve or replay items in order. Conflicts should surface guidance before retry.
              - list [ref=e89]:
                - listitem [ref=e90]:
                  - generic [ref=e91]:
                    - strong [ref=e92]: market.listings.create
                    - generic [ref=e93]: failed_retryable
                  - paragraph [ref=e94]: Workflow wf-listing-001 · Attempts 1 · Created 2026-04-20T14:37:24.395Z
                  - paragraph [ref=e95]:
                    - text: Idempotency key
                    - code [ref=e96]: 4146a25e-e122-4b59-92cd-8caf8fe2a8a0
                  - generic [ref=e97]:
                    - button "Retry" [active] [ref=e98] [cursor=pointer]
                    - button "Dismiss" [ref=e99] [cursor=pointer]
            - complementary [ref=e100]:
              - generic [ref=e102]:
                - paragraph [ref=e103]: Queue summary
                - heading "Recovery posture" [level=2] [ref=e104]
              - list [ref=e105]:
                - listitem [ref=e106]:
                  - generic [ref=e107]: Connectivity
                  - strong [ref=e108]: degraded
                - listitem [ref=e109]:
                  - generic [ref=e110]: Actionable items
                  - strong [ref=e111]: "1"
                - listitem [ref=e112]:
                  - generic [ref=e113]: Conflicts
                  - strong [ref=e114]: "0"
                - listitem [ref=e115]:
                  - generic [ref=e116]: Suggested handoff
                  - strong [ref=e117]: ussd
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
  52 |       "Create, revise, and publish listings with visible marketplace state",
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
  64 |     await expect(page.getByText("Low connectivity")).toBeVisible();
  65 |     await expect(page.getByText("Handoff ussd")).toBeVisible();
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