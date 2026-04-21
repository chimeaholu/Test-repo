# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: advisory-climate-gate.spec.ts >> N4 advisory and climate tranche diagnostics >> CJ-006 EP-008 RJ-003 DI-006 climate route shows alert acknowledgement and MRV evidence
- Location: tests/e2e/advisory-climate-gate.spec.ts:89:7

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
  - button "Open Next.js Dev Tools" [ref=e8] [cursor=pointer]:
    - img [ref=e9]
  - alert [ref=e12]: Sign in to the right workspace without skipping access controls.
  - main [ref=e13]:
    - generic [ref=e14]:
      - article [ref=e15]:
        - generic [ref=e16]:
          - generic [ref=e17]: Identity check
          - generic [ref=e18]: Consent required next
        - heading "Sign in to the right workspace without skipping access controls." [level=1] [ref=e19]
        - paragraph [ref=e20]: Enter your name, work email, role, and operating country. Agrodomain routes you to the correct workspace, then asks for consent before any protected work begins.
        - generic [ref=e21]:
          - complementary [ref=e22]:
            - strong [ref=e23]: Field-first rule
            - paragraph [ref=e24]: Use the same identity details your team already uses so handoffs, recovery, and audit history remain clear.
          - complementary [ref=e25]:
            - strong [ref=e26]: Risk rule
            - paragraph [ref=e27]: Signing in identifies you. It does not authorize regulated actions until consent is granted.
        - generic "What happens next" [ref=e28]:
          - article [ref=e29]:
            - generic [ref=e30]: Step 1
            - strong [ref=e31]: Identity is recorded
            - paragraph [ref=e32]: Your role, email, and operating country are attached to the active session.
          - article [ref=e33]:
            - generic [ref=e34]: Step 2
            - strong [ref=e35]: Consent stays separate
            - paragraph [ref=e36]: The next route explains what is captured and what remains blocked.
          - article [ref=e37]:
            - generic [ref=e38]: Step 3
            - strong [ref=e39]: Routing happens after review
            - paragraph [ref=e40]: The workspace opens only after policy capture is complete.
      - article [ref=e41]:
        - generic [ref=e43]:
          - paragraph [ref=e44]: Identity entry
          - heading "Enter your work details" [level=2] [ref=e45]
          - paragraph [ref=e46]: Choose the role and country that match the work you need to resume today.
        - generic [ref=e47]:
          - paragraph [ref=e48]: Use the identity details attached to the work you need to resume. You can review consent before any protected action is enabled.
          - generic [ref=e49]:
            - generic [ref=e50]: Full name
            - textbox "Full name" [ref=e51]:
              - /placeholder: Ama Mensah
            - paragraph [ref=e52]: Use the name your cooperative, buyer group, or field team expects.
          - generic [ref=e53]:
            - generic [ref=e54]: Email
            - textbox "Email" [ref=e55]:
              - /placeholder: ama@example.com
            - paragraph [ref=e56]: This is used for account recovery, notifications, and route context.
          - generic [ref=e57]:
            - generic [ref=e58]: Role
            - combobox "Role" [ref=e59]:
              - option "Farmer" [selected]
              - option "Buyer"
              - option "Cooperative"
              - option "Advisor"
              - option "Finance"
              - option "Admin"
            - paragraph [ref=e60]: Choose the workspace you need today. This determines the protected route you reach after consent.
          - generic [ref=e61]:
            - generic [ref=e62]: Country pack
            - combobox "Country pack" [ref=e63]:
              - option "Ghana" [selected]
              - option "Nigeria"
              - option "Jamaica"
            - paragraph [ref=e64]: Country scope affects policy text, route framing, and operational context.
          - generic [ref=e65]:
            - button "Continue to onboarding" [ref=e66] [cursor=pointer]
            - paragraph [ref=e67]: No protected work is unlocked on this route.
        - generic "Route guarantees" [ref=e68]:
          - article [ref=e69]:
            - heading "Visible next step" [level=3] [ref=e70]
            - paragraph [ref=e71]: The route does not skip directly into a workspace. Consent review is always shown next.
          - article [ref=e72]:
            - heading "Clear accountability" [level=3] [ref=e73]
            - paragraph [ref=e74]: Your session identity is what later connects recovery events, approvals, and audit trails.
```

# Test source

```ts
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
  62  | test.describe("N4 advisory and climate tranche diagnostics", () => {
  63  |   test("CJ-005 EP-006 RJ-003 DI-005 advisory route shows citations, confidence, and reviewer state", async ({
  64  |     page,
  65  |   }, testInfo) => {
  66  |     const runId = `${testInfo.project.name}-${Date.now()}`;
  67  |     const advisorIdentity = {
  68  |       displayName: "N4 Advisor QA",
  69  |       email: `advisor.n4.${runId}@example.com`,
  70  |       role: "advisor",
  71  |       countryCode: "GH",
  72  |     } as const;
  73  |     await signInAndGrantConsent(page, advisorIdentity);
  74  |     await openAdvisorRequestsWithRecovery(page, advisorIdentity);
  75  |     await expect(
  76  |       page.getByText(
  77  |         "Every response keeps citations, confidence, and reviewer posture visible before anyone treats it as field advice.",
  78  |       ),
  79  |     ).toBeVisible();
  80  |     await expect(page.getByText(/confidence/i).first()).toBeVisible();
  81  |     await expect(page.getByText(/Reviewer decision/i)).toBeVisible();
  82  |     await page.getByRole("button", { name: "Open citation drawer" }).click();
  83  |     await expect(page.getByRole("heading", { name: "Source proof" })).toBeVisible();
  84  |     await expect(page.getByText("Unverified input claims control")).toBeVisible();
  85  | 
  86  |     await captureProof(page, testInfo, "cj005-advisory-conversation");
  87  |   });
  88  | 
  89  |   test("CJ-006 EP-008 RJ-003 DI-006 climate route shows alert acknowledgement and MRV evidence", async ({
  90  |     page,
  91  |   }, testInfo) => {
  92  |     const runId = `${testInfo.project.name}-${Date.now()}`;
  93  |     await signInAndGrantConsent(page, {
  94  |       displayName: "N4 Farmer QA",
  95  |       email: `farmer.n4.${runId}@example.com`,
  96  |       role: "farmer",
  97  |       countryCode: "GH",
  98  |     });
  99  | 
  100 |     await gotoPath(page, "/app/climate/alerts");
  101 |     await expect(
  102 |       page.getByRole("heading", { name: "Live alert triage with visible degraded-mode posture" }),
> 103 |     ).toBeVisible({ timeout: 20_000 });
      |       ^ Error: expect(locator).toBeVisible() failed
  104 |     await expect(
  105 |       page.getByText(
  106 |         "Alert severity, acknowledgement state, source posture, and MRV assumptions stay visible together so operators do not over-read partial data.",
  107 |       ),
  108 |     ).toBeVisible();
  109 |     await expect(page.getByRole("button", { name: /Acknowledge alert/i })).toBeVisible();
  110 |     await expect(page.getByRole("heading", { name: "Assumptions and method references" })).toBeVisible();
  111 |     await expect(page.getByText("IPCC Tier 2 Annex 4")).toBeVisible();
  112 |     await expect(page.getByText(/Assumption/i).first()).toBeVisible();
  113 |     await expect(page.getByText(/degraded/i).first()).toBeVisible();
  114 | 
  115 |     await captureProof(page, testInfo, "cj006-climate-dashboard");
  116 |   });
  117 | });
  118 | 
```