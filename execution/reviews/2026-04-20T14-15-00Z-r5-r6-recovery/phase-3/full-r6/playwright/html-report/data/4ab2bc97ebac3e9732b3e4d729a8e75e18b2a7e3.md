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

Locator: getByLabel('Full name')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByLabel('Full name')

```

# Page snapshot

```yaml
- generic [ref=e2]: Internal Server Error
```

# Test source

```ts
  1   | import { expect, type Page } from "@playwright/test";
  2   | 
  3   | type Role = "farmer" | "buyer" | "cooperative" | "advisor" | "finance" | "admin";
  4   | const SESSION_KEY = "agrodomain.session.v2";
  5   | const TOKEN_KEY = "agrodomain.session-token.v1";
  6   | const CONSENT_ROUTE = /\/onboarding\/consent(\?.*)?$/;
  7   | 
  8   | const roleHomeRoute: Record<Role, string> = {
  9   |   farmer: "/app/farmer",
  10  |   buyer: "/app/buyer",
  11  |   cooperative: "/app/cooperative",
  12  |   advisor: "/app/advisor",
  13  |   finance: "/app/finance",
  14  |   admin: "/app/admin",
  15  | };
  16  | 
  17  | export async function signIn(
  18  |   page: Page,
  19  |   input: {
  20  |     displayName: string;
  21  |     email: string;
  22  |     role: Role;
  23  |     countryCode?: "GH" | "NG" | "JM";
  24  |   },
  25  | ): Promise<void> {
  26  |   const signInNameField = page.getByLabel("Full name");
  27  |   const alreadyOnSignIn = /\/signin(\?.*)?$/.test(page.url());
  28  |   if (!alreadyOnSignIn) {
  29  |     await gotoPath(page, "/signin");
  30  |   }
> 31  |   await expect(signInNameField).toBeVisible();
      |                                 ^ Error: expect(locator).toBeVisible() failed
  32  |   await waitForInteractiveForm(page, "/signin");
  33  |   const submitButton = page.getByRole("button", { name: "Continue to onboarding" });
  34  |   let reachedConsent = false;
  35  |   for (let attempt = 0; attempt < 4 && !reachedConsent; attempt += 1) {
  36  |     await page.getByLabel("Full name").fill(input.displayName);
  37  |     await page.getByLabel("Email").fill(input.email);
  38  |     await page.getByLabel("Role").selectOption(input.role);
  39  |     await page
  40  |       .getByLabel("Country pack")
  41  |       .selectOption(input.countryCode ?? "GH");
  42  |     await submitButton.click();
  43  |     try {
  44  |       await expect(page).toHaveURL(CONSENT_ROUTE, { timeout: 20_000 });
  45  |       reachedConsent = true;
  46  |     } catch {
  47  |       if (CONSENT_ROUTE.test(page.url())) {
  48  |         reachedConsent = true;
  49  |         break;
  50  |       }
  51  |       if (!page.url().includes("/signin")) {
  52  |         throw new Error(`Unexpected sign-in route after submit: ${page.url()}`);
  53  |       }
  54  |       await gotoPath(page, "/signin");
  55  |       await expect(page.getByLabel("Full name")).toBeVisible();
  56  |       await page.waitForTimeout(500);
  57  |     }
  58  |   }
  59  |   if (!reachedConsent) {
  60  |     throw new Error("Sign-in did not transition to onboarding consent");
  61  |   }
  62  |   await page.waitForFunction(
  63  |     ([sessionKey, tokenKey]) =>
  64  |       Boolean(window.localStorage.getItem(sessionKey)) &&
  65  |       Boolean(window.localStorage.getItem(tokenKey)),
  66  |     [SESSION_KEY, TOKEN_KEY],
  67  |   );
  68  | }
  69  | 
  70  | export async function grantConsent(page: Page): Promise<void> {
  71  |   await waitForInteractiveForm(page, "/onboarding/consent");
  72  |   const acceptedCheckbox = page.locator("input[name='accepted']");
  73  |   await acceptedCheckbox.check();
  74  |   await expect(acceptedCheckbox).toBeChecked();
  75  |   const grantButton = page.getByRole("button", { name: "Grant consent" });
  76  |   let reachedWorkspace = false;
  77  |   for (let attempt = 0; attempt < 2 && !reachedWorkspace; attempt += 1) {
  78  |     await grantButton.click();
  79  |     try {
  80  |       await expect(page).toHaveURL(/\/app\/.+$/, { timeout: 30_000 });
  81  |       reachedWorkspace = true;
  82  |     } catch {
  83  |       if (!CONSENT_ROUTE.test(page.url())) {
  84  |         throw new Error(`Unexpected route after consent submit: ${page.url()}`);
  85  |       }
  86  |     }
  87  |   }
  88  |   if (!reachedWorkspace) {
  89  |     const consentCaptured = await page
  90  |       .waitForFunction(
  91  |         ([sessionKey, tokenKey]) => {
  92  |           const raw = window.localStorage.getItem(sessionKey);
  93  |           const token = window.localStorage.getItem(tokenKey);
  94  |           if (!raw || !token) {
  95  |             return false;
  96  |           }
  97  |           try {
  98  |             const session = JSON.parse(raw) as { consent?: { state?: string } };
  99  |             return session.consent?.state === "consent_granted";
  100 |           } catch {
  101 |             return false;
  102 |           }
  103 |         },
  104 |         [SESSION_KEY, TOKEN_KEY],
  105 |         { timeout: 30_000 },
  106 |       )
  107 |       .then(() => true)
  108 |       .catch(() => false);
  109 |     if (consentCaptured) {
  110 |       await restoreWorkspaceFromSession(page);
  111 |     }
  112 |   }
  113 | }
  114 | 
  115 | export async function signInAndGrantConsent(
  116 |   page: Page,
  117 |   input: {
  118 |     displayName: string;
  119 |     email: string;
  120 |     role: Role;
  121 |     countryCode?: "GH" | "NG" | "JM";
  122 |   },
  123 | ): Promise<void> {
  124 |   await signIn(page, input);
  125 |   await grantConsent(page);
  126 |   const sessionReady = await page
  127 |     .waitForFunction(
  128 |       ([sessionKey, tokenKey, role]) => {
  129 |         if (!window.localStorage.getItem(tokenKey)) {
  130 |           return false;
  131 |         }
```