# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: recovery.spec.ts >> Consent recovery and offline retry >> consent revoke blocks protected routes until restored
- Location: tests/e2e/recovery.spec.ts:14:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('consent_revoked')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByText('consent_revoked')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=e7] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e8]:
      - img [ref=e9]
    - generic [ref=e12]:
      - button "Open issues overlay" [ref=e13]:
        - generic [ref=e14]:
          - generic [ref=e15]: "0"
          - generic [ref=e16]: "1"
        - generic [ref=e17]: Issue
      - button "Collapse issues badge" [ref=e18]:
        - img [ref=e19]
  - alert [ref=e21]
  - generic [ref=e22]:
    - link "Skip to content" [ref=e23] [cursor=pointer]:
      - /url: "#main-content"
    - main [ref=e24]:
      - generic [ref=e25]:
        - generic [ref=e26]:
          - generic [ref=e27]:
            - generic [ref=e28]: Farmer
            - generic [ref=e29]: GH
          - paragraph [ref=e30]: Esi Farmer
          - heading "Ghana Growers Network" [level=1] [ref=e31]
          - paragraph [ref=e32]: esi.1776695813412@example.com · Farmer · GH
          - paragraph [ref=e33]: This protected workspace keeps role routing, queue state, and consent posture persistent while you move between operational routes.
        - generic [ref=e34]:
          - generic [ref=e35]: Trace trace--app-profile-eby2oc
          - button "Sign out" [ref=e36] [cursor=pointer]
      - region "Sync status" [ref=e37]:
        - generic [ref=e38]:
          - generic [ref=e39]:
            - generic [ref=e40]: Low connectivity
            - generic [ref=e41]: Handoff ussd
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e42]
          - paragraph [ref=e43]: "Pending items: 1. Conflicts: 0. Trace ID: trace--app-profile-eby2oc."
        - generic [ref=e44]:
          - button "Force online" [ref=e45] [cursor=pointer]
          - button "Simulate degraded" [ref=e46] [cursor=pointer]
          - button "Simulate offline" [ref=e47] [cursor=pointer]
      - generic [ref=e48]:
        - complementary [ref=e49]:
          - generic [ref=e50]:
            - generic [ref=e51]:
              - generic [ref=e53]:
                - paragraph [ref=e54]: Role-aware workspace
                - heading "Farmer operations" [level=2] [ref=e55]
                - paragraph [ref=e56]: The workspace routes to the correct role surface while keeping consent, queue, and offline state visible.
              - navigation "Primary" [ref=e57]:
                - generic [ref=e58]:
                  - link "Home" [ref=e59] [cursor=pointer]:
                    - /url: /app/farmer
                    - generic [ref=e60]: Home
                  - link "Market" [ref=e61] [cursor=pointer]:
                    - /url: /app/market/listings
                    - generic [ref=e62]: Market
                  - link "Inbox 1" [ref=e63] [cursor=pointer]:
                    - /url: /app/market/negotiations
                    - generic [ref=e64]: Inbox
                    - generic [ref=e65]: "1"
                  - link "Alerts" [ref=e66] [cursor=pointer]:
                    - /url: /app/climate/alerts
                    - generic [ref=e67]: Alerts
                  - link "Profile 2" [ref=e68] [cursor=pointer]:
                    - /url: /app/profile
                    - generic [ref=e69]: Profile
                    - generic [ref=e70]: "2"
            - list [ref=e71]:
              - listitem [ref=e72]:
                - generic [ref=e73]: Home route
                - strong [ref=e74]: /app/farmer
              - listitem [ref=e75]:
                - generic [ref=e76]: Field posture
                - strong [ref=e77]: Field actions
              - listitem [ref=e78]:
                - generic [ref=e79]: Proof posture
                - strong [ref=e80]: Why this is safe
            - complementary [ref=e81]:
              - strong [ref=e82]: Design note
              - paragraph [ref=e83]: Consent, queue freshness, and evidence ownership stay visible before any protected action.
        - generic [ref=e84]:
          - generic [ref=e85]:
            - generic [ref=e87]:
              - paragraph [ref=e88]: Consent review
              - heading "Consent and permissions" [level=2] [ref=e89]
              - paragraph [ref=e90]: Revocation propagates immediately. Protected regulated actions remain blocked until a fresh grant is stored with a new timestamp.
            - generic [ref=e91]:
              - generic [ref=e92]: Consent active
              - generic [ref=e93]: farmer
          - generic [ref=e94]:
            - article [ref=e95]:
              - generic [ref=e97]:
                - paragraph [ref=e98]: Current response state
                - heading "Consent record" [level=2] [ref=e99]
              - list [ref=e100]:
                - listitem [ref=e101]:
                  - generic [ref=e102]: Consent state
                  - strong [ref=e103]: consent_granted
                - listitem [ref=e104]:
                  - generic [ref=e105]: Policy version
                  - strong [ref=e106]: 2026.04.w1
                - listitem [ref=e107]:
                  - generic [ref=e108]: Captured at
                  - strong [ref=e109]: 2026-04-20T14:36:58.708000+00:00
                - listitem [ref=e110]:
                  - generic [ref=e111]: Revoked at
                  - strong [ref=e112]: active
                - listitem [ref=e113]:
                  - generic [ref=e114]: Scopes
                  - strong [ref=e115]: identity.core, workflow.audit
              - complementary [ref=e116]:
                - strong [ref=e117]: Why this matters
                - paragraph [ref=e118]: This route is the fastest way to explain whether a protected action is blocked because of consent state or because of a later workflow policy.
            - article [ref=e119]:
              - generic [ref=e121]:
                - paragraph [ref=e122]: Change consent
                - heading "Update permission state" [level=2] [ref=e123]
              - generic [ref=e124]:
                - generic [ref=e125]:
                  - generic [ref=e126]: Reason for revocation
                  - textbox "Reason for revocation" [ref=e127]:
                    - /placeholder: Consent needs to be reviewed before more actions.
                    - text: Consent needs review
                - button "Revoke consent" [active] [ref=e128] [cursor=pointer]
                - paragraph [ref=e129]: Revocation takes effect immediately for protected actions.
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
> 31 |     await expect(page.getByText("consent_revoked")).toBeVisible();
     |                                                     ^ Error: expect(locator).toBeVisible() failed
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
  69 |     await expect(page.getByText("acked")).toBeVisible();
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