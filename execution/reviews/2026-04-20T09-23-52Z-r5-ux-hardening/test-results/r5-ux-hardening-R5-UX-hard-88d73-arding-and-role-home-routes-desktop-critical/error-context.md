# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: r5-ux-hardening.spec.ts >> R5 UX hardening proof >> captures public, onboarding, and role-home routes
- Location: tests/e2e/r5-ux-hardening.spec.ts:303:7

# Error details

```
Error: Unexpected sign-in route after submit: http://127.0.0.1:3012/onboarding/consent
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
  31  |   await expect(signInNameField).toBeVisible();
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
  47  |       if (!page.url().includes("/signin")) {
> 48  |         throw new Error(`Unexpected sign-in route after submit: ${page.url()}`);
      |               ^ Error: Unexpected sign-in route after submit: http://127.0.0.1:3012/onboarding/consent
  49  |       }
  50  |       await gotoPath(page, "/signin");
  51  |       await expect(page.getByLabel("Full name")).toBeVisible();
  52  |       await page.waitForTimeout(500);
  53  |     }
  54  |   }
  55  |   if (!reachedConsent) {
  56  |     throw new Error("Sign-in did not transition to onboarding consent");
  57  |   }
  58  |   await page.waitForFunction(
  59  |     ([sessionKey, tokenKey]) =>
  60  |       Boolean(window.localStorage.getItem(sessionKey)) &&
  61  |       Boolean(window.localStorage.getItem(tokenKey)),
  62  |     [SESSION_KEY, TOKEN_KEY],
  63  |   );
  64  | }
  65  | 
  66  | export async function grantConsent(page: Page): Promise<void> {
  67  |   await waitForInteractiveForm(page, "/onboarding/consent");
  68  |   const acceptedCheckbox = page.locator("input[name='accepted']");
  69  |   await acceptedCheckbox.check();
  70  |   await expect(acceptedCheckbox).toBeChecked();
  71  |   const grantButton = page.getByRole("button", { name: "Grant consent" });
  72  |   let reachedWorkspace = false;
  73  |   for (let attempt = 0; attempt < 2 && !reachedWorkspace; attempt += 1) {
  74  |     await grantButton.click();
  75  |     try {
  76  |       await expect(page).toHaveURL(/\/app\/.+$/, { timeout: 30_000 });
  77  |       reachedWorkspace = true;
  78  |     } catch {
  79  |       if (!CONSENT_ROUTE.test(page.url())) {
  80  |         throw new Error(`Unexpected route after consent submit: ${page.url()}`);
  81  |       }
  82  |     }
  83  |   }
  84  |   if (!reachedWorkspace) {
  85  |     const consentCaptured = await page
  86  |       .waitForFunction(
  87  |         ([sessionKey, tokenKey]) => {
  88  |           const raw = window.localStorage.getItem(sessionKey);
  89  |           const token = window.localStorage.getItem(tokenKey);
  90  |           if (!raw || !token) {
  91  |             return false;
  92  |           }
  93  |           try {
  94  |             const session = JSON.parse(raw) as { consent?: { state?: string } };
  95  |             return session.consent?.state === "consent_granted";
  96  |           } catch {
  97  |             return false;
  98  |           }
  99  |         },
  100 |         [SESSION_KEY, TOKEN_KEY],
  101 |         { timeout: 30_000 },
  102 |       )
  103 |       .then(() => true)
  104 |       .catch(() => false);
  105 |     if (consentCaptured) {
  106 |       await restoreWorkspaceFromSession(page);
  107 |     }
  108 |   }
  109 | }
  110 | 
  111 | export async function signInAndGrantConsent(
  112 |   page: Page,
  113 |   input: {
  114 |     displayName: string;
  115 |     email: string;
  116 |     role: Role;
  117 |     countryCode?: "GH" | "NG" | "JM";
  118 |   },
  119 | ): Promise<void> {
  120 |   await signIn(page, input);
  121 |   await grantConsent(page);
  122 |   const sessionReady = await page
  123 |     .waitForFunction(
  124 |       ([sessionKey, tokenKey, role]) => {
  125 |         if (!window.localStorage.getItem(tokenKey)) {
  126 |           return false;
  127 |         }
  128 |         const raw = window.localStorage.getItem(sessionKey);
  129 |         if (!raw) {
  130 |           return false;
  131 |         }
  132 |         try {
  133 |           const session = JSON.parse(raw) as {
  134 |             actor?: { role?: string };
  135 |           };
  136 |           return session.actor?.role === role;
  137 |         } catch {
  138 |           return false;
  139 |         }
  140 |       },
  141 |       [SESSION_KEY, TOKEN_KEY, input.role],
  142 |       { timeout: 30_000 },
  143 |     )
  144 |     .then(() => true)
  145 |     .catch(() => false);
  146 |   if (!sessionReady) {
  147 |     await restoreWorkspaceFromSession(page);
  148 |   }
```