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
  - button "Open Next.js Dev Tools" [ref=e8] [cursor=pointer]:
    - img [ref=e9]
  - alert [ref=e12]
  - main [ref=e13]:
    - generic [ref=e14]:
      - article [ref=e15]:
        - generic [ref=e17]:
          - paragraph [ref=e18]: Consent and access
          - heading "Review access before the workspace opens" [level=2] [ref=e19]
          - paragraph [ref=e20]: Review what will be recorded, why it is needed, and which actions remain locked until you agree.
        - generic [ref=e21]:
          - generic [ref=e22]: Protected actions locked
          - generic [ref=e23]: Policy 2026.04.w1
        - list "Onboarding steps" [ref=e24]:
          - listitem [ref=e25]:
            - generic [ref=e27]:
              - strong [ref=e28]: Identity confirmed
              - paragraph [ref=e29]: Role, country, and contact details carry over from sign-in so you can confirm you are granting access in the right context.
          - listitem [ref=e30]:
            - generic [ref=e32]:
              - strong [ref=e33]: Consent review
              - paragraph [ref=e34]: Regulated actions stay blocked until consent is captured with the policy version and timestamp.
          - listitem [ref=e35]:
            - generic [ref=e37]:
              - strong [ref=e38]: Workspace access
              - paragraph [ref=e39]: Once consent is granted, your workspace opens with the same policy checks still enforced on the server.
        - complementary [ref=e40]:
          - strong [ref=e41]: Plain-language rule
          - paragraph [ref=e42]: "Keep the explanation concrete: what is recorded, why it is required, and what stays blocked if you do not agree."
        - generic "Consent outcomes" [ref=e43]:
          - article [ref=e44]:
            - generic [ref=e45]: Recorded immediately
            - strong [ref=e46]: Policy version and capture time
            - paragraph [ref=e47]: The consent record becomes part of the active session state.
          - article [ref=e48]:
            - generic [ref=e49]: Still enforced later
            - strong [ref=e50]: Server-side policy checks
            - paragraph [ref=e51]: Granting consent does not bypass subsequent permission or workflow checks.
      - article [ref=e52]:
        - generic [ref=e54]:
          - paragraph [ref=e55]: Consent details
          - heading "Choose what you agree to" [level=2] [ref=e56]
          - paragraph [ref=e57]: Select the scopes you accept. The policy version and capture time are stored as soon as consent is granted.
        - list [ref=e58]:
          - listitem [ref=e59]:
            - generic [ref=e60]: Policy version
            - strong [ref=e61]: 2026.04.w1
          - listitem [ref=e62]:
            - generic [ref=e63]: Channel
            - strong [ref=e64]: pwa
          - listitem [ref=e65]:
            - generic [ref=e66]: Country
            - strong [ref=e67]: GH
          - listitem [ref=e68]:
            - generic [ref=e69]: Role
            - strong [ref=e70]: farmer
        - generic "Scope explanation" [ref=e71]:
          - article [ref=e72]:
            - heading "Identity scope" [level=3] [ref=e73]
            - paragraph [ref=e74]: Needed to route you correctly, maintain session continuity, and explain who performed each action.
          - article [ref=e75]:
            - heading "Workflow scope" [level=3] [ref=e76]
            - paragraph [ref=e77]: Needed where regulated actions, approvals, or evidence retention apply.
        - generic [ref=e78]:
          - group "Select the consent scopes you accept" [ref=e79]:
            - generic [ref=e80]: Select the consent scopes you accept
            - generic [ref=e81]:
              - checkbox "Identity and session controlsNeeded to load the correct workspace and verify your identity state." [checked] [ref=e82]
              - generic [ref=e83]:
                - strong [ref=e84]: Identity and session controls
                - text: Needed to load the correct workspace and verify your identity state.
            - generic [ref=e85]:
              - checkbox "Workflow audit and regulated operationsNeeded to log regulated actions and keep audit history intact." [checked] [ref=e86]
              - generic [ref=e87]:
                - strong [ref=e88]: Workflow audit and regulated operations
                - text: Needed to log regulated actions and keep audit history intact.
            - generic [ref=e89]:
              - checkbox "Channel delivery and recovery promptsNeeded to send recovery prompts and channel handoff advice." [ref=e90]
              - generic [ref=e91]:
                - strong [ref=e92]: Channel delivery and recovery prompts
                - text: Needed to send recovery prompts and channel handoff advice.
          - generic [ref=e93]:
            - checkbox "I confirm this consent text can be recorded with its policy version and capture time." [ref=e94]
            - generic [ref=e95]: I confirm this consent text can be recorded with its policy version and capture time.
          - generic [ref=e96]:
            - button "Grant consent" [ref=e97] [cursor=pointer]
            - link "Back to sign in" [ref=e98] [cursor=pointer]:
              - /url: /signin
          - paragraph [ref=e99]: If consent is not granted, protected actions remain blocked and the workspace will not open.
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