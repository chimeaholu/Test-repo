# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-consent.spec.ts >> Auth and consent >> protected routes redirect to sign-in first and consent second
- Location: tests/e2e/auth-consent.spec.ts:50:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Review the consent terms' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('heading', { name: 'Review the consent terms' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - alert [ref=e3]
  - main [ref=e4]:
    - generic [ref=e5]:
      - article [ref=e6]:
        - generic [ref=e8]:
          - paragraph [ref=e9]: Consent and access
          - heading "Review access before the workspace opens" [level=2] [ref=e10]
          - paragraph [ref=e11]: Review what will be recorded, why it is needed, and which actions remain locked until you agree.
        - generic [ref=e12]:
          - generic [ref=e13]: Protected actions locked
          - generic [ref=e14]: Policy 2026.04.w1
        - list "Onboarding steps" [ref=e15]:
          - listitem [ref=e16]:
            - generic [ref=e18]:
              - strong [ref=e19]: Identity confirmed
              - paragraph [ref=e20]: Role, country, and contact details carry over from sign-in so you can confirm you are granting access in the right context.
          - listitem [ref=e21]:
            - generic [ref=e23]:
              - strong [ref=e24]: Consent review
              - paragraph [ref=e25]: Regulated actions stay blocked until consent is captured with the policy version and timestamp.
          - listitem [ref=e26]:
            - generic [ref=e28]:
              - strong [ref=e29]: Workspace access
              - paragraph [ref=e30]: Once consent is granted, your workspace opens with the same policy checks still enforced on the server.
        - complementary [ref=e31]:
          - strong [ref=e32]: Plain-language rule
          - paragraph [ref=e33]: "Keep the explanation concrete: what is recorded, why it is required, and what stays blocked if you do not agree."
        - generic "Consent outcomes" [ref=e34]:
          - article [ref=e35]:
            - generic [ref=e36]: Recorded immediately
            - strong [ref=e37]: Policy version and capture time
            - paragraph [ref=e38]: The consent record becomes part of the active session state.
          - article [ref=e39]:
            - generic [ref=e40]: Still enforced later
            - strong [ref=e41]: Server-side policy checks
            - paragraph [ref=e42]: Granting consent does not bypass subsequent permission or workflow checks.
      - article [ref=e43]:
        - generic [ref=e45]:
          - paragraph [ref=e46]: Consent details
          - heading "Choose what you agree to" [level=2] [ref=e47]
          - paragraph [ref=e48]: Select the scopes you accept. The policy version and capture time are stored as soon as consent is granted.
        - list [ref=e49]:
          - listitem [ref=e50]:
            - generic [ref=e51]: Policy version
            - strong [ref=e52]: 2026.04.w1
          - listitem [ref=e53]:
            - generic [ref=e54]: Channel
            - strong [ref=e55]: pwa
          - listitem [ref=e56]:
            - generic [ref=e57]: Country
            - strong [ref=e58]: GH
          - listitem [ref=e59]:
            - generic [ref=e60]: Role
            - strong [ref=e61]: farmer
        - generic "Scope explanation" [ref=e62]:
          - article [ref=e63]:
            - heading "Identity scope" [level=3] [ref=e64]
            - paragraph [ref=e65]: Needed to route you correctly, maintain session continuity, and explain who performed each action.
          - article [ref=e66]:
            - heading "Workflow scope" [level=3] [ref=e67]
            - paragraph [ref=e68]: Needed where regulated actions, approvals, or evidence retention apply.
        - generic [ref=e69]:
          - group "Select the consent scopes you accept" [ref=e70]:
            - generic [ref=e71]: Select the consent scopes you accept
            - generic [ref=e72]:
              - checkbox "Identity and session controlsNeeded to load the correct workspace and verify your identity state." [checked] [ref=e73]
              - generic [ref=e74]:
                - strong [ref=e75]: Identity and session controls
                - text: Needed to load the correct workspace and verify your identity state.
            - generic [ref=e76]:
              - checkbox "Workflow audit and regulated operationsNeeded to log regulated actions and keep audit history intact." [checked] [ref=e77]
              - generic [ref=e78]:
                - strong [ref=e79]: Workflow audit and regulated operations
                - text: Needed to log regulated actions and keep audit history intact.
            - generic [ref=e80]:
              - checkbox "Channel delivery and recovery promptsNeeded to send recovery prompts and channel handoff advice." [ref=e81]
              - generic [ref=e82]:
                - strong [ref=e83]: Channel delivery and recovery prompts
                - text: Needed to send recovery prompts and channel handoff advice.
          - generic [ref=e84]:
            - checkbox "I confirm this consent text can be recorded with its policy version and capture time." [ref=e85]
            - generic [ref=e86]: I confirm this consent text can be recorded with its policy version and capture time.
          - generic [ref=e87]:
            - button "Grant consent" [ref=e88] [cursor=pointer]
            - link "Back to sign in" [ref=e89] [cursor=pointer]:
              - /url: /signin
          - paragraph [ref=e90]: If consent is not granted, protected actions remain blocked and the workspace will not open.
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
  56 |     await expect(page).toHaveURL(/\/signin$/);
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
> 76 |     ).toBeVisible();
     |       ^ Error: expect(locator).toBeVisible() failed
  77 |   });
  78 | });
  79 | 
```