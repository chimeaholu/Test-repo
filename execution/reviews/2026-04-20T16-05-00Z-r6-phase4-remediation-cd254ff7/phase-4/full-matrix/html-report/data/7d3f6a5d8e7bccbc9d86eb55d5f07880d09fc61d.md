# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: advisory-climate-gate.spec.ts >> N4 advisory and climate tranche diagnostics >> CJ-006 EP-008 RJ-003 DI-006 climate route shows alert acknowledgement and MRV evidence
- Location: tests/e2e/advisory-climate-gate.spec.ts:109:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Live alert triage with visible degraded-mode posture' })
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for getByRole('heading', { name: 'Live alert triage with visible degraded-mode posture' })

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
  1   | import fs from "node:fs";
  2   | import path from "node:path";
  3   | 
  4   | import { expect, test, type Page, type TestInfo } from "@playwright/test";
  5   | 
  6   | import { gotoPath, signInAndGrantConsent } from "./helpers";
  7   | 
  8   | function proofPath(testInfo: TestInfo, name: string): string | null {
  9   |   const artifactDir = process.env.PLAYWRIGHT_ARTIFACT_DIR;
  10  |   if (!artifactDir) {
  11  |     return null;
  12  |   }
  13  |   const screenshotDir = path.join(artifactDir, "screenshots");
  14  |   fs.mkdirSync(screenshotDir, { recursive: true });
  15  |   return path.join(screenshotDir, `${testInfo.project.name}-${name}.png`);
  16  | }
  17  | 
  18  | async function captureProof(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  19  |   const screenshotPath = proofPath(testInfo, name);
  20  |   if (!screenshotPath) {
  21  |     return;
  22  |   }
  23  |   if (testInfo.project.name === "mobile-critical") {
  24  |     return;
  25  |   }
  26  |   try {
  27  |     await page.screenshot({ path: screenshotPath, fullPage: true });
  28  |   } catch (error) {
  29  |     const message = error instanceof Error ? error.message : String(error);
  30  |     if (message.includes("Target crashed") || message.includes("page crashed")) {
  31  |       return;
  32  |     }
  33  |     if (!message.includes("Page.captureScreenshot")) {
  34  |       throw error;
  35  |     }
  36  |     // Fallback for intermittent mobile full-page capture protocol failures.
  37  |     await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});
  38  |   }
  39  | }
  40  | 
  41  | async function openAdvisorRequestsWithRecovery(
  42  |   page: Page,
  43  |   authInput: Parameters<typeof signInAndGrantConsent>[1],
  44  | ): Promise<void> {
  45  |   const heading = page.getByRole("heading", { name: "Grounded guidance with reviewer state" });
  46  |   const onAuthGate =
  47  |     /\/signin(\?.*)?$/.test(page.url()) || /\/onboarding\/consent(\?.*)?$/.test(page.url());
  48  |   if (onAuthGate) {
  49  |     await signInAndGrantConsent(page, authInput);
  50  |   }
  51  | 
  52  |   await gotoPath(page, "/app/advisor");
  53  |   await expect(page).toHaveURL(/\/app\/advisor(\?.*)?$/, { timeout: 20_000 });
  54  |   await page.waitForLoadState("networkidle").catch(() => {});
  55  |   await page.waitForTimeout(500);
  56  | 
  57  |   await gotoPath(page, "/app/advisor/requests");
  58  |   await expect(page).toHaveURL(/\/app\/advisor\/requests(\?.*)?$/, { timeout: 20_000 });
  59  |   await expect(heading).toBeVisible({ timeout: 20_000 });
  60  | }
  61  | 
  62  | async function openClimateAlertsWithRecovery(
  63  |   page: Page,
  64  |   authInput: Parameters<typeof signInAndGrantConsent>[1],
  65  | ): Promise<void> {
  66  |   const heading = page.getByRole("heading", { name: "Live alert triage with visible degraded-mode posture" });
  67  |   const onAuthGate =
  68  |     /\/signin(\?.*)?$/.test(page.url()) || /\/onboarding\/consent(\?.*)?$/.test(page.url());
  69  |   if (onAuthGate) {
  70  |     await signInAndGrantConsent(page, authInput);
  71  |   }
  72  | 
  73  |   await gotoPath(page, "/app/climate/alerts");
  74  |   if (/\/signin(\?.*)?$/.test(page.url()) || /\/onboarding\/consent(\?.*)?$/.test(page.url())) {
  75  |     await signInAndGrantConsent(page, authInput);
  76  |     await gotoPath(page, "/app/climate/alerts");
  77  |   }
  78  |   await expect(page).toHaveURL(/\/app\/climate\/alerts(\?.*)?$/, { timeout: 20_000 });
> 79  |   await expect(heading).toBeVisible({ timeout: 20_000 });
      |                         ^ Error: expect(locator).toBeVisible() failed
  80  | }
  81  | 
  82  | test.describe("N4 advisory and climate tranche diagnostics", () => {
  83  |   test("CJ-005 EP-006 RJ-003 DI-005 advisory route shows citations, confidence, and reviewer state", async ({
  84  |     page,
  85  |   }, testInfo) => {
  86  |     const runId = `${testInfo.project.name}-${Date.now()}`;
  87  |     const advisorIdentity = {
  88  |       displayName: "N4 Advisor QA",
  89  |       email: `advisor.n4.${runId}@example.com`,
  90  |       role: "advisor",
  91  |       countryCode: "GH",
  92  |     } as const;
  93  |     await signInAndGrantConsent(page, advisorIdentity);
  94  |     await openAdvisorRequestsWithRecovery(page, advisorIdentity);
  95  |     await expect(
  96  |       page.getByText(
  97  |         "Every response keeps citations, confidence, and reviewer posture visible before anyone treats it as field advice.",
  98  |       ),
  99  |     ).toBeVisible();
  100 |     await expect(page.getByText(/confidence/i).first()).toBeVisible();
  101 |     await expect(page.getByText(/Reviewer decision/i)).toBeVisible();
  102 |     await page.getByRole("button", { name: "Open citation drawer" }).click();
  103 |     await expect(page.getByRole("heading", { name: "Source proof" })).toBeVisible();
  104 |     await expect(page.getByText("Unverified input claims control")).toBeVisible();
  105 | 
  106 |     await captureProof(page, testInfo, "cj005-advisory-conversation");
  107 |   });
  108 | 
  109 |   test("CJ-006 EP-008 RJ-003 DI-006 climate route shows alert acknowledgement and MRV evidence", async ({
  110 |     page,
  111 |   }, testInfo) => {
  112 |     const runId = `${testInfo.project.name}-${Date.now()}`;
  113 |     const farmerIdentity = {
  114 |       displayName: "N4 Farmer QA",
  115 |       email: `farmer.n4.${runId}@example.com`,
  116 |       role: "farmer",
  117 |       countryCode: "GH",
  118 |     } as const;
  119 |     await signInAndGrantConsent(page, farmerIdentity);
  120 |     await openClimateAlertsWithRecovery(page, farmerIdentity);
  121 |     await expect(
  122 |       page.getByText(
  123 |         "Alert severity, acknowledgement state, source posture, and MRV assumptions stay visible together so operators do not over-read partial data.",
  124 |       ),
  125 |     ).toBeVisible();
  126 |     await expect(page.getByRole("button", { name: /Acknowledge alert/i })).toBeVisible();
  127 |     await expect(page.getByRole("heading", { name: "Assumptions and method references" })).toBeVisible();
  128 |     await expect(page.getByText("IPCC Tier 2 Annex 4")).toBeVisible();
  129 |     await expect(page.getByText(/Assumption/i).first()).toBeVisible();
  130 |     await expect(page.getByText(/degraded/i).first()).toBeVisible();
  131 | 
  132 |     await captureProof(page, testInfo, "cj006-climate-dashboard");
  133 |   });
  134 | });
  135 | 
```