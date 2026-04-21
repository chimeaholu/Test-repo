# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: advisory-climate-gate.spec.ts >> N4 advisory and climate tranche diagnostics >> CJ-005 EP-006 RJ-003 DI-005 advisory route shows citations, confidence, and reviewer state
- Location: tests/e2e/advisory-climate-gate.spec.ts:69:7

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
  - alert [ref=e12]
  - generic [ref=e13]:
    - link "Skip to content" [ref=e14] [cursor=pointer]:
      - /url: "#main-content"
    - main [ref=e15]:
      - generic [ref=e16]:
        - generic [ref=e17]:
          - generic [ref=e18]:
            - generic [ref=e19]: Advisor
            - generic [ref=e20]: GH
          - paragraph [ref=e21]: N4 Advisor QA
          - heading "Ghana Growers Network" [level=1] [ref=e22]
          - paragraph [ref=e23]: advisor.n4.mobile-critical-1776559752511@example.com · Advisor · GH
        - generic [ref=e24]:
          - generic [ref=e25]: Trace trace--app-advisor-jj36fb
          - button "Sign out" [ref=e26] [cursor=pointer]
      - region "Sync status" [ref=e27]:
        - generic [ref=e28]:
          - generic [ref=e29]:
            - generic [ref=e30]: Low connectivity
            - generic [ref=e31]: Handoff ussd
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e32]
          - paragraph [ref=e33]: "Pending items: 1. Conflicts: 0. Trace ID: trace--app-advisor-jj36fb."
        - generic [ref=e34]:
          - button "Force online" [ref=e35] [cursor=pointer]
          - button "Simulate degraded" [ref=e36] [cursor=pointer]
          - button "Simulate offline" [ref=e37] [cursor=pointer]
      - generic [ref=e39]:
        - generic [ref=e40]:
          - generic [ref=e41]:
            - generic [ref=e42]:
              - paragraph [ref=e43]: Advisory flow
              - heading "Respond with evidence, keep language plain, and show what the advice is based on." [level=2] [ref=e44]
              - paragraph [ref=e45]: The advisor home emphasizes proof-bearing recommendations, consent visibility, and fast triage for field support.
            - generic [ref=e46]:
              - link "Open requests" [ref=e47] [cursor=pointer]:
                - /url: /app/advisor/requests
              - link "Open outbox" [ref=e48] [cursor=pointer]:
                - /url: /app/offline/outbox
          - generic [ref=e49]:
            - generic [ref=e50]:
              - generic [ref=e51]:
                - generic [ref=e52]: Consent live
                - generic [ref=e53]: Low signal
                - generic [ref=e54]: Protected path open
              - paragraph [ref=e55]: Advice never appears without provenance, role context, and a safe next step.
              - list [ref=e56]:
                - listitem [ref=e57]:
                  - generic [ref=e58]: Case queue
                  - strong [ref=e59]: 1 active
                - listitem [ref=e60]:
                  - generic [ref=e61]: Conflicts
                  - strong [ref=e62]: "0"
                - listitem [ref=e63]:
                  - generic [ref=e64]: Policy version
                  - strong [ref=e65]: 2026.04.w1
                - listitem [ref=e66]:
                  - generic [ref=e67]: Last capture
                  - strong [ref=e68]: 2026-04-19T00:49:15.187000
            - generic [ref=e69]:
              - complementary [ref=e70]:
                - strong [ref=e71]: Field mode
                - paragraph [ref=e72]: Mobile and tablet views keep one clear case action in reach while preserving proof context.
              - complementary [ref=e73]:
                - strong [ref=e74]: Desktop mode
                - paragraph [ref=e75]: Desktop views favor queue-to-detail comparison for faster advisory throughput.
              - complementary [ref=e76]:
                - strong [ref=e77]: Evidence posture
                - paragraph [ref=e78]: "Protected action reason code: ok. Trace trace--app-advisor-jj36fb."
        - generic [ref=e79]:
          - generic [ref=e80]:
            - generic [ref=e82]:
              - paragraph [ref=e83]: Queue first
              - heading "Next actions" [level=2] [ref=e84]
              - paragraph [ref=e85]: Every role lands on work that can be resumed immediately instead of a generic dashboard.
            - generic [ref=e86]:
              - link "Case queue Continue advisory requests with role, locale, and queue state already loaded." [ref=e87] [cursor=pointer]:
                - /url: /app/advisor/requests
                - strong [ref=e88]: Case queue
                - paragraph [ref=e89]: Continue advisory requests with role, locale, and queue state already loaded.
              - link "Climate triage Pair recommendations with alert severity and freshness before escalation." [ref=e90] [cursor=pointer]:
                - /url: /app/climate/alerts
                - strong [ref=e91]: Climate triage
                - paragraph [ref=e92]: Pair recommendations with alert severity and freshness before escalation.
          - generic [ref=e93]:
            - generic [ref=e95]:
              - paragraph [ref=e96]: State framing
              - heading "Role posture" [level=2] [ref=e97]
              - paragraph [ref=e98]: These state cues stay visible so users know whether they can proceed, recover, or escalate.
            - generic [ref=e99]:
              - article [ref=e100]:
                - text: Consent posture
                - strong [ref=e101]: Live
                - paragraph [ref=e102]: Protected actions depend on current consent, not cached client confidence.
              - article [ref=e103]:
                - text: Queue depth
                - strong [ref=e104]: "1"
                - paragraph [ref=e105]: 0 conflicts currently need explicit operator attention.
              - article [ref=e106]:
                - text: Safe next step
                - strong [ref=e107]: Proceed
                - paragraph [ref=e108]: "Reason code: ok"
      - navigation "Mobile primary" [ref=e110]:
        - link "Home" [ref=e111] [cursor=pointer]:
          - /url: /app/advisor
          - generic [ref=e112]: Home
        - link "Requests" [ref=e113] [cursor=pointer]:
          - /url: /app/advisor/requests
          - generic [ref=e114]: Requests
        - link "Market" [ref=e115] [cursor=pointer]:
          - /url: /app/market/listings
          - generic [ref=e116]: Market
        - link "Inbox 1" [ref=e117] [cursor=pointer]:
          - /url: /app/market/negotiations
          - generic [ref=e118]: Inbox
          - generic [ref=e119]: "1"
        - link "Alerts" [ref=e120] [cursor=pointer]:
          - /url: /app/climate/alerts
          - generic [ref=e121]: Alerts
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
  23  |   try {
  24  |     await page.screenshot({ path: screenshotPath, fullPage: true });
  25  |   } catch (error) {
  26  |     const message = error instanceof Error ? error.message : String(error);
  27  |     if (!message.includes("Page.captureScreenshot")) {
  28  |       throw error;
  29  |     }
  30  |     // Fallback for intermittent mobile full-page capture protocol failures.
  31  |     await page.screenshot({ path: screenshotPath, fullPage: false });
  32  |   }
  33  | }
  34  | 
  35  | async function openAdvisorRequestsWithRecovery(
  36  |   page: Page,
  37  |   authInput: Parameters<typeof signInAndGrantConsent>[1],
  38  | ): Promise<void> {
  39  |   const heading = page.getByRole("heading", { name: "Grounded guidance with reviewer state" });
  40  |   for (let attempt = 0; attempt < 3; attempt += 1) {
  41  |     const onAuthGate =
  42  |       /\/signin(\?.*)?$/.test(page.url()) || /\/onboarding\/consent(\?.*)?$/.test(page.url());
  43  |     if (onAuthGate) {
  44  |       await signInAndGrantConsent(page, authInput);
  45  |     }
  46  | 
  47  |     await gotoPath(page, "/app/advisor");
  48  |     await expect(page).toHaveURL(/\/app\/advisor(\?.*)?$/, { timeout: 20_000 });
  49  |     const requestEntryPoints = [
  50  |       page.getByRole("link", { name: /^Open requests$/ }),
  51  |       page.getByRole("link", { name: /^Requests$/ }).first(),
  52  |       page.getByRole("link", { name: /^Case queue/ }).first(),
  53  |     ];
  54  |     for (const entryPoint of requestEntryPoints) {
  55  |       if (await entryPoint.isVisible().catch(() => false)) {
  56  |         await entryPoint.click();
  57  |         await page.waitForURL(/\/app\/advisor\/requests(\?.*)?$/, { timeout: 10_000 }).catch(() => {});
  58  |         const retried = await heading.isVisible({ timeout: 12_000 }).catch(() => false);
  59  |         if (retried) {
  60  |           return;
  61  |         }
  62  |       }
  63  |     }
  64  |   }
> 65  |   await expect(heading).toBeVisible({ timeout: 20_000 });
      |                         ^ Error: expect(locator).toBeVisible() failed
  66  | }
  67  | 
  68  | test.describe("N4 advisory and climate tranche diagnostics", () => {
  69  |   test("CJ-005 EP-006 RJ-003 DI-005 advisory route shows citations, confidence, and reviewer state", async ({
  70  |     page,
  71  |   }, testInfo) => {
  72  |     const runId = `${testInfo.project.name}-${Date.now()}`;
  73  |     const advisorIdentity = {
  74  |       displayName: "N4 Advisor QA",
  75  |       email: `advisor.n4.${runId}@example.com`,
  76  |       role: "advisor",
  77  |       countryCode: "GH",
  78  |     } as const;
  79  |     await signInAndGrantConsent(page, advisorIdentity);
  80  |     await openAdvisorRequestsWithRecovery(page, advisorIdentity);
  81  |     await expect(
  82  |       page.getByText(
  83  |         "Every response keeps citations, confidence, and reviewer posture visible before anyone treats it as field advice.",
  84  |       ),
  85  |     ).toBeVisible();
  86  |     await expect(page.getByText(/confidence/i).first()).toBeVisible();
  87  |     await expect(page.getByText(/Reviewer decision/i)).toBeVisible();
  88  |     await page.getByRole("button", { name: "Open citation drawer" }).click();
  89  |     await expect(page.getByRole("heading", { name: "Source proof" })).toBeVisible();
  90  |     await expect(page.getByText("Unverified input claims control")).toBeVisible();
  91  | 
  92  |     await captureProof(page, testInfo, "cj005-advisory-conversation");
  93  |   });
  94  | 
  95  |   test("CJ-006 EP-008 RJ-003 DI-006 climate route shows alert acknowledgement and MRV evidence", async ({
  96  |     page,
  97  |   }, testInfo) => {
  98  |     const runId = `${testInfo.project.name}-${Date.now()}`;
  99  |     await signInAndGrantConsent(page, {
  100 |       displayName: "N4 Farmer QA",
  101 |       email: `farmer.n4.${runId}@example.com`,
  102 |       role: "farmer",
  103 |       countryCode: "GH",
  104 |     });
  105 | 
  106 |     await gotoPath(page, "/app/climate/alerts");
  107 |     await expect(
  108 |       page.getByRole("heading", { name: "Live alert triage with visible degraded-mode posture" }),
  109 |     ).toBeVisible({ timeout: 20_000 });
  110 |     await expect(
  111 |       page.getByText(
  112 |         "Alert severity, acknowledgement state, source posture, and MRV assumptions stay visible together so operators do not over-read partial data.",
  113 |       ),
  114 |     ).toBeVisible();
  115 |     await expect(page.getByRole("button", { name: /Acknowledge alert/i })).toBeVisible();
  116 |     await expect(page.getByRole("heading", { name: "Assumptions and method references" })).toBeVisible();
  117 |     await expect(page.getByText("IPCC Tier 2 Annex 4")).toBeVisible();
  118 |     await expect(page.getByText(/Assumption/i).first()).toBeVisible();
  119 |     await expect(page.getByText(/degraded/i).first()).toBeVisible();
  120 | 
  121 |     await captureProof(page, testInfo, "cj006-climate-dashboard");
  122 |   });
  123 | });
  124 | 
```