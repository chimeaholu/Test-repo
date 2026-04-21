# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: recovery.spec.ts >> Consent recovery and offline retry >> offline seam exposes connectivity, retry, and dismiss controls
- Location: tests/e2e/recovery.spec.ts:56:7

# Error details

```
Error: Sign-in did not transition to onboarding consent
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - main [ref=e3]:
    - generic [ref=e4]:
      - article [ref=e5]:
        - generic [ref=e6]:
          - generic [ref=e7]: Identity check
          - generic [ref=e8]: Consent required next
        - heading "Open the right workspace with trust checks visible from the first screen." [level=1] [ref=e9]
        - paragraph [ref=e10]: Enter your name, work email, role, and operating country. Agrodomain routes you to the correct workspace, then asks for permission review before any protected work begins.
        - generic [ref=e11]:
          - complementary [ref=e12]:
            - strong [ref=e13]: Field-first rule
            - paragraph [ref=e14]: Use the same identity details your team already uses so handoffs, recovery, and account history remain clear.
          - complementary [ref=e15]:
            - strong [ref=e16]: Risk rule
            - paragraph [ref=e17]: Signing in identifies you. It does not authorize regulated actions until consent is granted.
        - generic "What happens next" [ref=e18]:
          - article [ref=e19]:
            - generic [ref=e20]: Step 1
            - strong [ref=e21]: Identity is recorded
            - paragraph [ref=e22]: Your role, email, and operating country are attached to the active session.
          - article [ref=e23]:
            - generic [ref=e24]: Step 2
            - strong [ref=e25]: Consent stays separate
            - paragraph [ref=e26]: The next route explains what is captured and what remains blocked.
          - article [ref=e27]:
            - generic [ref=e28]: Step 3
            - strong [ref=e29]: Routing happens after review
            - paragraph [ref=e30]: The workspace opens only after policy capture is complete.
      - article [ref=e31]:
        - generic [ref=e33]:
          - paragraph [ref=e34]: Identity entry
          - heading "Enter your work details" [level=2] [ref=e35]
          - paragraph [ref=e36]: Choose the role and country that match the work you need to resume today.
        - generic [ref=e37]:
          - paragraph [ref=e38]: Use the identity details attached to the work you need to resume. You can review consent before any protected action is enabled.
          - generic [ref=e39]:
            - generic [ref=e40]: Full name
            - textbox "Full name" [ref=e41]:
              - /placeholder: Ama Mensah
            - paragraph [ref=e42]: Use the name your cooperative, buyer group, or field team expects.
          - generic [ref=e43]:
            - generic [ref=e44]: Email
            - textbox "Email" [ref=e45]:
              - /placeholder: ama@example.com
            - paragraph [ref=e46]: This is used for account recovery, notifications, and route context.
          - generic [ref=e47]:
            - generic [ref=e48]: Role
            - combobox "Role" [ref=e49]:
              - option "Farmer" [selected]
              - option "Buyer"
              - option "Cooperative"
              - option "Advisor"
              - option "Finance"
              - option "Admin"
            - paragraph [ref=e50]: Choose the workspace you need today. This determines the protected route you reach after consent.
          - generic [ref=e51]:
            - generic [ref=e52]: Country pack
            - combobox "Country pack" [ref=e53]:
              - option "Ghana" [selected]
              - option "Nigeria"
              - option "Jamaica"
            - paragraph [ref=e54]: Country scope affects policy text, route framing, and operational context.
          - generic [ref=e55]:
            - button "Continue to onboarding" [ref=e56] [cursor=pointer]
            - paragraph [ref=e57]: No protected work is unlocked on this route.
        - generic "Route guarantees" [ref=e58]:
          - article [ref=e59]:
            - heading "Visible next step" [level=3] [ref=e60]
            - paragraph [ref=e61]: The route does not skip directly into a workspace. Consent review is always shown next.
          - article [ref=e62]:
            - heading "Clear accountability" [level=3] [ref=e63]
            - paragraph [ref=e64]: Your session identity is what later connects recovery events, approvals, and audit trails.
  - button "Open Next.js Dev Tools" [ref=e70] [cursor=pointer]:
    - img [ref=e71]
  - alert [ref=e74]
```

# Test source

```ts
  1   | import { expect, type Page } from "@playwright/test";
  2   | 
  3   | type Role = "farmer" | "buyer" | "cooperative" | "advisor" | "finance" | "admin";
  4   | const SESSION_KEY = "agrodomain.session.v2";
  5   | const TOKEN_KEY = "agrodomain.session-token.v1";
  6   | const CONSENT_ROUTE = /\/onboarding\/consent(\?.*)?$/;
  7   | type SignInIdentity = {
  8   |   displayName: string;
  9   |   email: string;
  10  |   role: Role;
  11  |   countryCode?: "GH" | "NG" | "JM";
  12  | };
  13  | const identityByPage = new WeakMap<Page, SignInIdentity>();
  14  | 
  15  | const roleHomeRoute: Record<Role, string> = {
  16  |   farmer: "/app/farmer",
  17  |   buyer: "/app/buyer",
  18  |   cooperative: "/app/cooperative",
  19  |   advisor: "/app/advisor",
  20  |   finance: "/app/finance",
  21  |   admin: "/app/admin",
  22  | };
  23  | 
  24  | export async function signIn(
  25  |   page: Page,
  26  |   input: SignInIdentity,
  27  | ): Promise<void> {
  28  |   const signInNameField = page.getByLabel("Full name");
  29  |   const alreadyOnSignIn = /\/signin(\?.*)?$/.test(page.url());
  30  |   if (!alreadyOnSignIn) {
  31  |     await gotoPath(page, "/signin");
  32  |   }
  33  |   // Avoid stale cross-role state when tests switch identities in the same page.
  34  |   await page.evaluate(([sessionKey, tokenKey]) => {
  35  |     window.localStorage.removeItem(sessionKey);
  36  |     window.localStorage.removeItem(tokenKey);
  37  |   }, [SESSION_KEY, TOKEN_KEY]);
  38  |   await expect(signInNameField).toBeVisible();
  39  |   await waitForInteractiveForm(page, "/signin");
  40  |   const submitButton = page.getByRole("button", { name: "Continue to onboarding" });
  41  |   let reachedConsent = false;
  42  |   for (let attempt = 0; attempt < 4 && !reachedConsent; attempt += 1) {
  43  |     await page.getByLabel("Full name").fill(input.displayName);
  44  |     await page.getByLabel("Email").fill(input.email);
  45  |     await page.getByLabel("Role").selectOption(input.role);
  46  |     await page
  47  |       .getByLabel("Country pack")
  48  |       .selectOption(input.countryCode ?? "GH");
  49  |     await submitButton.click();
  50  |     try {
  51  |       await expect(page).toHaveURL(CONSENT_ROUTE, { timeout: 20_000 });
  52  |       reachedConsent = true;
  53  |     } catch {
  54  |       if (CONSENT_ROUTE.test(page.url())) {
  55  |         reachedConsent = true;
  56  |         break;
  57  |       }
  58  |       if (!page.url().includes("/signin")) {
  59  |         throw new Error(`Unexpected sign-in route after submit: ${page.url()}`);
  60  |       }
  61  |       await gotoPath(page, "/signin");
  62  |       await expect(page.getByLabel("Full name")).toBeVisible();
  63  |       await page.waitForTimeout(500);
  64  |     }
  65  |   }
  66  |   if (!reachedConsent) {
> 67  |     throw new Error("Sign-in did not transition to onboarding consent");
      |           ^ Error: Sign-in did not transition to onboarding consent
  68  |   }
  69  |   identityByPage.set(page, input);
  70  |   await page.waitForFunction(
  71  |     ([sessionKey, tokenKey]) =>
  72  |       Boolean(window.localStorage.getItem(sessionKey)) &&
  73  |       Boolean(window.localStorage.getItem(tokenKey)),
  74  |     [SESSION_KEY, TOKEN_KEY],
  75  |   );
  76  | }
  77  | 
  78  | export async function grantConsent(page: Page): Promise<void> {
  79  |   await waitForInteractiveForm(page, "/onboarding/consent");
  80  |   const acceptedCheckbox = page.locator("input[name='accepted']");
  81  |   await acceptedCheckbox.check();
  82  |   await expect(acceptedCheckbox).toBeChecked();
  83  |   const grantButton = page.getByRole("button", { name: "Grant consent" });
  84  |   let reachedWorkspace = false;
  85  |   for (let attempt = 0; attempt < 2 && !reachedWorkspace; attempt += 1) {
  86  |     await grantButton.click();
  87  |     try {
  88  |       await expect(page).toHaveURL(/\/app\/.+$/, { timeout: 30_000 });
  89  |       reachedWorkspace = true;
  90  |     } catch {
  91  |       if (!CONSENT_ROUTE.test(page.url())) {
  92  |         throw new Error(`Unexpected route after consent submit: ${page.url()}`);
  93  |       }
  94  |     }
  95  |   }
  96  |   if (!reachedWorkspace) {
  97  |     const consentCaptured = await page
  98  |       .waitForFunction(
  99  |         ([sessionKey, tokenKey]) => {
  100 |           const raw = window.localStorage.getItem(sessionKey);
  101 |           const token = window.localStorage.getItem(tokenKey);
  102 |           if (!raw || !token) {
  103 |             return false;
  104 |           }
  105 |           try {
  106 |             const session = JSON.parse(raw) as { consent?: { state?: string } };
  107 |             return session.consent?.state === "consent_granted";
  108 |           } catch {
  109 |             return false;
  110 |           }
  111 |         },
  112 |         [SESSION_KEY, TOKEN_KEY],
  113 |         { timeout: 30_000 },
  114 |       )
  115 |       .then(() => true)
  116 |       .catch(() => false);
  117 |     if (consentCaptured) {
  118 |       await restoreWorkspaceFromSession(page);
  119 |     }
  120 |   }
  121 | }
  122 | 
  123 | export async function signInAndGrantConsent(
  124 |   page: Page,
  125 |   input: SignInIdentity,
  126 | ): Promise<void> {
  127 |   await signIn(page, input);
  128 |   await grantConsent(page);
  129 |   const sessionReady = await page
  130 |     .waitForFunction(
  131 |       ([sessionKey, tokenKey, role]) => {
  132 |         if (!window.localStorage.getItem(tokenKey)) {
  133 |           return false;
  134 |         }
  135 |         const raw = window.localStorage.getItem(sessionKey);
  136 |         if (!raw) {
  137 |           return false;
  138 |         }
  139 |         try {
  140 |           const session = JSON.parse(raw) as {
  141 |             actor?: { role?: string };
  142 |           };
  143 |           return session.actor?.role === role;
  144 |         } catch {
  145 |           return false;
  146 |         }
  147 |       },
  148 |       [SESSION_KEY, TOKEN_KEY, input.role],
  149 |       { timeout: 30_000 },
  150 |     )
  151 |     .then(() => true)
  152 |     .catch(() => false);
  153 |   if (!sessionReady) {
  154 |     await restoreWorkspaceFromSession(page);
  155 |   }
  156 |   await page.waitForFunction(
  157 |     ([sessionKey, tokenKey, role]) => {
  158 |       if (!window.localStorage.getItem(tokenKey)) {
  159 |         return false;
  160 |       }
  161 |       const raw = window.localStorage.getItem(sessionKey);
  162 |       if (!raw) {
  163 |         return false;
  164 |       }
  165 |       try {
  166 |         const session = JSON.parse(raw) as {
  167 |           actor?: { role?: string };
```