# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: r5-ux-hardening.spec.ts >> R5 UX hardening >> authenticated routes keep cleaned copy on critical operator surfaces
- Location: tests/e2e/r5-ux-hardening.spec.ts:40:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Live route updates' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('heading', { name: 'Live route updates' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
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
            - generic [ref=e19]: Admin
            - generic [ref=e20]: GH
          - paragraph [ref=e21]: Amina Owusu
          - heading "Ghana Growers Network" [level=1] [ref=e22]
          - paragraph [ref=e23]: amina.r5@example.com · Admin · GH
        - generic [ref=e24]:
          - generic [ref=e25]: Trace trace-pp-notifications-ceo74d
          - button "Sign out" [ref=e26] [cursor=pointer]
      - region "Sync status" [ref=e27]:
        - generic [ref=e28]:
          - generic [ref=e29]:
            - generic [ref=e30]: Low connectivity
            - generic [ref=e31]: Handoff ussd
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e32]
          - paragraph [ref=e33]: "Pending items: 1. Conflicts: 0. Trace ID: trace-pp-notifications-ceo74d."
        - generic [ref=e34]:
          - button "Force online" [ref=e35] [cursor=pointer]
          - button "Simulate degraded" [ref=e36] [cursor=pointer]
          - button "Simulate offline" [ref=e37] [cursor=pointer]
      - generic [ref=e40]:
        - generic [ref=e42]:
          - generic [ref=e43]:
            - paragraph [ref=e44]: Notifications
            - heading "Important updates across your workflow" [level=2] [ref=e45]
            - paragraph [ref=e46]: Escrow changes, recovery prompts, and system events are grouped here so teams can jump directly back to the affected work.
          - generic [ref=e49]: 1 unread
        - article [ref=e51]:
          - generic [ref=e52]:
            - strong [ref=e53]: market.listings.create
            - generic [ref=e54]: queued
          - paragraph [ref=e55]: Queued mutation awaiting replay.
          - paragraph [ref=e56]: queue_recovery • 2026-04-20T09:06:50.266Z
          - link "Open related work" [ref=e58] [cursor=pointer]:
            - /url: /app/offline/outbox
      - navigation "Mobile primary" [ref=e60]:
        - link "Home" [ref=e61] [cursor=pointer]:
          - /url: /app/admin
          - generic [ref=e62]: Home
        - link "Analytics" [ref=e63] [cursor=pointer]:
          - /url: /app/admin/analytics
          - generic [ref=e64]: Analytics
        - link "Market" [ref=e65] [cursor=pointer]:
          - /url: /app/market/listings
          - generic [ref=e66]: Market
        - link "Inbox 1" [ref=e67] [cursor=pointer]:
          - /url: /app/market/negotiations
          - generic [ref=e68]: Inbox
          - generic [ref=e69]: "1"
        - link "Alerts" [ref=e70] [cursor=pointer]:
          - /url: /app/climate/alerts
          - generic [ref=e71]: Alerts
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
  17 |     await expect(page.getByRole("link", { name: "Review offline recovery" })).toBeVisible();
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
> 61 |       await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();
     |                                                                        ^ Error: expect(locator).toBeVisible() failed
  62 |       await expectNoPlanningCopy(page);
  63 |     }
  64 |   });
  65 | });
  66 | 
```