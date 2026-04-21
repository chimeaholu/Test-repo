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