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

Locator: getByRole('heading', { name: 'Outbox and replay controls' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('heading', { name: 'Outbox and replay controls' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - alert [ref=e3]: Sign in to the right workspace without skipping access controls.
  - main [ref=e4]:
    - generic [ref=e5]:
      - article [ref=e6]:
        - generic [ref=e7]:
          - generic [ref=e8]: Identity check
          - generic [ref=e9]: Consent required next
        - heading "Sign in to the right workspace without skipping access controls." [level=1] [ref=e10]
        - paragraph [ref=e11]: Enter your name, work email, role, and operating country. Agrodomain routes you to the correct workspace, then asks for consent before any protected work begins.
        - generic [ref=e12]:
          - complementary [ref=e13]:
            - strong [ref=e14]: Field-first rule
            - paragraph [ref=e15]: Use the same identity details your team already uses so handoffs, recovery, and audit history remain clear.
          - complementary [ref=e16]:
            - strong [ref=e17]: Risk rule
            - paragraph [ref=e18]: Signing in identifies you. It does not authorize regulated actions until consent is granted.
        - generic "What happens next" [ref=e19]:
          - article [ref=e20]:
            - generic [ref=e21]: Step 1
            - strong [ref=e22]: Identity is recorded
            - paragraph [ref=e23]: Your role, email, and operating country are attached to the active session.
          - article [ref=e24]:
            - generic [ref=e25]: Step 2
            - strong [ref=e26]: Consent stays separate
            - paragraph [ref=e27]: The next route explains what is captured and what remains blocked.
          - article [ref=e28]:
            - generic [ref=e29]: Step 3
            - strong [ref=e30]: Routing happens after review
            - paragraph [ref=e31]: The workspace opens only after policy capture is complete.
      - article [ref=e32]:
        - generic [ref=e34]:
          - paragraph [ref=e35]: Identity entry
          - heading "Enter your work details" [level=2] [ref=e36]
          - paragraph [ref=e37]: Choose the role and country that match the work you need to resume today.
        - generic [ref=e38]:
          - paragraph [ref=e39]: Use the identity details attached to the work you need to resume. You can review consent before any protected action is enabled.
          - generic [ref=e40]:
            - generic [ref=e41]: Full name
            - textbox "Full name" [ref=e42]:
              - /placeholder: Ama Mensah
            - paragraph [ref=e43]: Use the name your cooperative, buyer group, or field team expects.
          - generic [ref=e44]:
            - generic [ref=e45]: Email
            - textbox "Email" [ref=e46]:
              - /placeholder: ama@example.com
            - paragraph [ref=e47]: This is used for account recovery, notifications, and route context.
          - generic [ref=e48]:
            - generic [ref=e49]: Role
            - combobox "Role" [ref=e50]:
              - option "Farmer" [selected]
              - option "Buyer"
              - option "Cooperative"
              - option "Advisor"
              - option "Finance"
              - option "Admin"
            - paragraph [ref=e51]: Choose the workspace you need today. This determines the protected route you reach after consent.
          - generic [ref=e52]:
            - generic [ref=e53]: Country pack
            - combobox "Country pack" [ref=e54]:
              - option "Ghana" [selected]
              - option "Nigeria"
              - option "Jamaica"
            - paragraph [ref=e55]: Country scope affects policy text, route framing, and operational context.
          - generic [ref=e56]:
            - button "Continue to onboarding" [ref=e57] [cursor=pointer]
            - paragraph [ref=e58]: No protected work is unlocked on this route.
        - generic "Route guarantees" [ref=e59]:
          - article [ref=e60]:
            - heading "Visible next step" [level=3] [ref=e61]
            - paragraph [ref=e62]: The route does not skip directly into a workspace. Consent review is always shown next.
          - article [ref=e63]:
            - heading "Clear accountability" [level=3] [ref=e64]
            - paragraph [ref=e65]: Your session identity is what later connects recovery events, approvals, and audit trails.
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
> 64 |     await expect(page.getByRole("heading", { name: "Outbox and replay controls" })).toBeVisible();
     |                                                                                     ^ Error: expect(locator).toBeVisible() failed
  65 |     await expect(page.getByText(/Suggested handoff/i)).toBeVisible();
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