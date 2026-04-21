# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: advisory-climate-gate.spec.ts >> N4 advisory and climate tranche diagnostics >> CJ-005 EP-006 RJ-003 DI-005 advisory route shows citations, confidence, and reviewer state
- Location: tests/e2e/advisory-climate-gate.spec.ts:36:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Grounded guidance with reviewer state' })
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for getByRole('heading', { name: 'Grounded guidance with reviewer state' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - button "Open Next.js Dev Tools" [ref=e8] [cursor=pointer]:
    - img [ref=e9]
  - alert [ref=e12]: Load the right workspace without hiding the consent gate.
  - main [ref=e13]:
    - generic [ref=e14]:
      - article [ref=e15]:
        - generic [ref=e16]:
          - generic [ref=e17]: Identity
          - generic [ref=e18]: Consent gate next
        - heading "Load the right workspace without hiding the consent gate." [level=1] [ref=e19]
        - paragraph [ref=e20]: "Start with four clear fields only: name, email, role, and country pack. The next screen explains consent before any protected action is unlocked."
        - generic [ref=e21]:
          - complementary [ref=e22]:
            - strong [ref=e23]: Field-first rule
            - paragraph [ref=e24]: Keep wording short so onboarding still works when a field officer is reading instructions aloud.
          - complementary [ref=e25]:
            - strong [ref=e26]: Risk rule
            - paragraph [ref=e27]: Identity entry does not imply permission. Regulated paths stay blocked until consent is captured.
      - article [ref=e28]:
        - generic [ref=e30]:
          - paragraph [ref=e31]: Identity entry
          - heading "Sign in" [level=2] [ref=e32]
          - paragraph [ref=e33]: Use the role and country pack that match the work you need to resume.
        - generic [ref=e34]:
          - generic [ref=e35]:
            - generic [ref=e36]: Full name
            - textbox "Full name" [ref=e37]:
              - /placeholder: Ama Mensah
            - paragraph [ref=e38]: Use the name your cooperative, buyer group, or field team expects.
          - generic [ref=e39]:
            - generic [ref=e40]: Email
            - textbox "Email" [ref=e41]:
              - /placeholder: ama@example.com
            - paragraph [ref=e42]: This is used for identity recovery and route context.
          - generic [ref=e43]:
            - generic [ref=e44]: Role
            - combobox "Role" [ref=e45]:
              - option "Farmer" [selected]
              - option "Buyer"
              - option "Cooperative"
              - option "Advisor"
              - option "Finance"
              - option "Admin"
          - generic [ref=e46]:
            - generic [ref=e47]: Country pack
            - combobox "Country pack" [ref=e48]:
              - option "Ghana" [selected]
              - option "Nigeria"
              - option "Jamaica"
          - button "Continue to onboarding" [ref=e49] [cursor=pointer]
```

# Test source

```ts
  1  | import fs from "node:fs";
  2  | import path from "node:path";
  3  | 
  4  | import { expect, test, type Page, type TestInfo } from "@playwright/test";
  5  | 
  6  | import { gotoPath, signInAndGrantConsent } from "./helpers";
  7  | 
  8  | function proofPath(testInfo: TestInfo, name: string): string | null {
  9  |   const artifactDir = process.env.PLAYWRIGHT_ARTIFACT_DIR;
  10 |   if (!artifactDir) {
  11 |     return null;
  12 |   }
  13 |   const screenshotDir = path.join(artifactDir, "screenshots");
  14 |   fs.mkdirSync(screenshotDir, { recursive: true });
  15 |   return path.join(screenshotDir, `${testInfo.project.name}-${name}.png`);
  16 | }
  17 | 
  18 | async function captureProof(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  19 |   const screenshotPath = proofPath(testInfo, name);
  20 |   if (!screenshotPath) {
  21 |     return;
  22 |   }
  23 |   try {
  24 |     await page.screenshot({ path: screenshotPath, fullPage: true });
  25 |   } catch (error) {
  26 |     const message = error instanceof Error ? error.message : String(error);
  27 |     if (!message.includes("Page.captureScreenshot")) {
  28 |       throw error;
  29 |     }
  30 |     // Fallback for intermittent mobile full-page capture protocol failures.
  31 |     await page.screenshot({ path: screenshotPath, fullPage: false });
  32 |   }
  33 | }
  34 | 
  35 | test.describe("N4 advisory and climate tranche diagnostics", () => {
  36 |   test("CJ-005 EP-006 RJ-003 DI-005 advisory route shows citations, confidence, and reviewer state", async ({
  37 |     page,
  38 |   }, testInfo) => {
  39 |     const runId = `${testInfo.project.name}-${Date.now()}`;
  40 |     await signInAndGrantConsent(page, {
  41 |       displayName: "N4 Advisor QA",
  42 |       email: `advisor.n4.${runId}@example.com`,
  43 |       role: "advisor",
  44 |       countryCode: "GH",
  45 |     });
  46 | 
  47 |     await gotoPath(page, "/app/advisor/requests");
  48 |     await expect(
  49 |       page.getByRole("heading", { name: "Grounded guidance with reviewer state" }),
> 50 |     ).toBeVisible({ timeout: 20_000 });
     |       ^ Error: expect(locator).toBeVisible() failed
  51 |     await expect(
  52 |       page.getByText(
  53 |         "Every response keeps citations, confidence, and reviewer posture visible before anyone treats it as field advice.",
  54 |       ),
  55 |     ).toBeVisible();
  56 |     await expect(page.getByText(/confidence/i).first()).toBeVisible();
  57 |     await expect(page.getByText(/Reviewer decision/i)).toBeVisible();
  58 |     await page.getByRole("button", { name: "Open citation drawer" }).click();
  59 |     await expect(page.getByRole("heading", { name: "Source proof" })).toBeVisible();
  60 |     await expect(page.getByText("Unverified input claims control")).toBeVisible();
  61 | 
  62 |     await captureProof(page, testInfo, "cj005-advisory-conversation");
  63 |   });
  64 | 
  65 |   test("CJ-006 EP-008 RJ-003 DI-006 climate route shows alert acknowledgement and MRV evidence", async ({
  66 |     page,
  67 |   }, testInfo) => {
  68 |     const runId = `${testInfo.project.name}-${Date.now()}`;
  69 |     await signInAndGrantConsent(page, {
  70 |       displayName: "N4 Farmer QA",
  71 |       email: `farmer.n4.${runId}@example.com`,
  72 |       role: "farmer",
  73 |       countryCode: "GH",
  74 |     });
  75 | 
  76 |     await gotoPath(page, "/app/climate/alerts");
  77 |     await expect(
  78 |       page.getByRole("heading", { name: "Live alert triage with visible degraded-mode posture" }),
  79 |     ).toBeVisible({ timeout: 20_000 });
  80 |     await expect(
  81 |       page.getByText(
  82 |         "Alert severity, acknowledgement state, source posture, and MRV assumptions stay visible together so operators do not over-read partial data.",
  83 |       ),
  84 |     ).toBeVisible();
  85 |     await expect(page.getByRole("button", { name: /Acknowledge alert/i })).toBeVisible();
  86 |     await expect(page.getByRole("heading", { name: "Assumptions and method references" })).toBeVisible();
  87 |     await expect(page.getByText("IPCC Tier 2 Annex 4")).toBeVisible();
  88 |     await expect(page.getByText(/Assumption/i).first()).toBeVisible();
  89 |     await expect(page.getByText(/degraded/i).first()).toBeVisible();
  90 | 
  91 |     await captureProof(page, testInfo, "cj006-climate-dashboard");
  92 |   });
  93 | });
  94 | 
```