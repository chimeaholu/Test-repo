# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-consent.spec.ts >> Auth and consent >> protected routes redirect to sign-in first and consent second
- Location: tests/e2e/auth-consent.spec.ts:50:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/signin$/
Received string:  "http://127.0.0.1:3010/app/market/listings"
Timeout: 10000ms

Call log:
  - Expect "toHaveURL" with timeout 10000ms
    10 × unexpected value "http://127.0.0.1:3010/app/market/listings"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - main [ref=e3]:
    - generic [ref=e4]:
      - paragraph [ref=e5]: Protected route
      - heading "This workspace needs an authenticated session." [level=1] [ref=e6]
      - link "Go to sign in" [ref=e8] [cursor=pointer]:
        - /url: /signin
  - button "Open Next.js Dev Tools" [ref=e14] [cursor=pointer]:
    - img [ref=e15]
  - alert [ref=e18]
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | import { grantConsent, gotoPath, signIn } from "./helpers";
  4  | 
  5  | test.describe("Auth and consent", () => {
  6  |   test("sign-in validates identity fields and grants consent", async ({ page }) => {
  7  |     const runId = Date.now();
  8  |     const amaEmail = `ama.e2e.${runId}@example.com`;
  9  |     const errorAlert = page.locator("p.field-error[role='alert']");
  10 |     const nameError = errorAlert.filter({ hasText: "Enter your name" });
  11 |     const submitButton = page.getByRole("button", { name: "Continue to onboarding" });
  12 | 
  13 |     await gotoPath(page, "/signin");
  14 |     await page.getByLabel("Full name").fill("A");
  15 |     await page.getByLabel("Email").fill(amaEmail);
  16 |     await submitButton.click();
  17 |     const invalidValidationRendered = await nameError.isVisible().catch(() => false);
  18 |     if (!invalidValidationRendered) {
  19 |       await expect(page).toHaveURL(/\/signin(\?.*)?$/);
  20 |       await gotoPath(page, "/signin");
  21 |       await page.getByLabel("Full name").fill("A");
  22 |       await page.getByLabel("Email").fill(amaEmail);
  23 |       await submitButton.click();
  24 |       const retryValidationRendered = await nameError.isVisible().catch(() => false);
  25 |       if (!retryValidationRendered) {
  26 |         await expect(page).toHaveURL(/\/signin(\?.*)?$/);
  27 |       }
  28 |     }
  29 | 
  30 |     await signIn(page, {
  31 |       displayName: "Ama Mensah",
  32 |       email: amaEmail,
  33 |       role: "farmer",
  34 |     });
  35 |     await expect(page).toHaveURL(/\/onboarding\/consent$/);
  36 |     await page.getByRole("button", { name: "Grant consent" }).click();
  37 |     await expect(errorAlert).toHaveText(
  38 |       "You must confirm the consent statement",
  39 |     );
  40 | 
  41 |     await grantConsent(page);
  42 |     await expect(page).toHaveURL(/\/app\/farmer$/);
  43 |     await expect(
  44 |       page.getByRole("heading", {
  45 |         name: "Finish setup, publish produce, and keep every field action recoverable.",
  46 |       }),
  47 |     ).toBeVisible();
  48 |   });
  49 | 
  50 |   test("protected routes redirect to sign-in first and consent second", async ({
  51 |     page,
  52 |   }) => {
  53 |     const runId = Date.now();
  54 |     const kojoEmail = `kojo.e2e.${runId}@example.com`;
  55 |     await gotoPath(page, "/app/market/listings");
> 56 |     await expect(page).toHaveURL(/\/signin$/);
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  57 | 
  58 |     await signIn(page, {
  59 |       displayName: "Kojo Addo",
  60 |       email: kojoEmail,
  61 |       role: "farmer",
  62 |     });
  63 | 
  64 |     await gotoPath(page, "/app/market/listings");
  65 |     await expect(page).toHaveURL(/\/(signin|onboarding\/consent)$/);
  66 |     if (page.url().endsWith("/signin")) {
  67 |       await signIn(page, {
  68 |         displayName: "Kojo Addo",
  69 |         email: kojoEmail,
  70 |         role: "farmer",
  71 |       });
  72 |       await expect(page).toHaveURL(/\/onboarding\/consent$/);
  73 |     }
  74 |     await expect(
  75 |       page.getByRole("heading", { name: "Review the consent terms" }),
  76 |     ).toBeVisible();
  77 |   });
  78 | });
  79 | 
```