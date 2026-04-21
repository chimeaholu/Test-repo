# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: advisory-climate-gate.spec.ts >> N4 advisory and climate tranche diagnostics >> CJ-005 EP-006 RJ-003 DI-005 advisory route shows citations, confidence, and reviewer state
- Location: tests/e2e/advisory-climate-gate.spec.ts:63:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Every response keeps citations, confidence, and reviewer posture visible before anyone treats it as field advice.')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByText('Every response keeps citations, confidence, and reviewer posture visible before anyone treats it as field advice.')

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
          - paragraph [ref=e23]: advisor.n4.desktop-critical-1776694748170@example.com · Advisor · GH
          - paragraph [ref=e24]: This protected workspace keeps role routing, queue state, and consent posture persistent while you move between operational routes.
        - generic [ref=e25]:
          - generic [ref=e26]: Trace trace-advisor-requests-28ubvf
          - button "Sign out" [ref=e27] [cursor=pointer]
      - region "Sync status" [ref=e28]:
        - generic [ref=e29]:
          - generic [ref=e30]:
            - generic [ref=e31]: Low connectivity
            - generic [ref=e32]: Handoff ussd
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e33]
          - paragraph [ref=e34]: "Pending items: 1. Conflicts: 0. Trace ID: trace-advisor-requests-28ubvf."
        - generic [ref=e35]:
          - button "Force online" [ref=e36] [cursor=pointer]
          - button "Simulate degraded" [ref=e37] [cursor=pointer]
          - button "Simulate offline" [ref=e38] [cursor=pointer]
      - generic [ref=e39]:
        - complementary [ref=e40]:
          - generic [ref=e41]:
            - generic [ref=e42]:
              - generic [ref=e44]:
                - paragraph [ref=e45]: Role-aware workspace
                - heading "Advisor operations" [level=2] [ref=e46]
                - paragraph [ref=e47]: The workspace routes to the correct role surface while keeping consent, queue, and offline state visible.
              - navigation "Primary" [ref=e48]:
                - generic [ref=e49]:
                  - link "Home" [ref=e50] [cursor=pointer]:
                    - /url: /app/advisor
                    - generic [ref=e51]: Home
                  - link "Requests" [ref=e52] [cursor=pointer]:
                    - /url: /app/advisor/requests
                    - generic [ref=e53]: Requests
                  - link "Market" [ref=e54] [cursor=pointer]:
                    - /url: /app/market/listings
                    - generic [ref=e55]: Market
                  - link "Inbox 1" [ref=e56] [cursor=pointer]:
                    - /url: /app/market/negotiations
                    - generic [ref=e57]: Inbox
                    - generic [ref=e58]: "1"
                  - link "Alerts" [ref=e59] [cursor=pointer]:
                    - /url: /app/climate/alerts
                    - generic [ref=e60]: Alerts
                  - link "Profile 2" [ref=e61] [cursor=pointer]:
                    - /url: /app/profile
                    - generic [ref=e62]: Profile
                    - generic [ref=e63]: "2"
            - list [ref=e64]:
              - listitem [ref=e65]:
                - generic [ref=e66]: Home route
                - strong [ref=e67]: /app/advisor
              - listitem [ref=e68]:
                - generic [ref=e69]: Field posture
                - strong [ref=e70]: Case queue
              - listitem [ref=e71]:
                - generic [ref=e72]: Proof posture
                - strong [ref=e73]: Evidence posture
            - complementary [ref=e74]:
              - strong [ref=e75]: Design note
              - paragraph [ref=e76]: Advice never appears without provenance, role context, and a safe next step.
        - generic [ref=e78]:
          - generic [ref=e79]:
            - generic [ref=e80]:
              - generic [ref=e81]:
                - paragraph [ref=e82]: Advisory workspace
                - heading "Grounded guidance with reviewer state" [level=2] [ref=e83]
                - paragraph [ref=e84]: Every response keeps citations, confidence, and reviewer state visible before anyone treats it as field guidance.
              - generic [ref=e86]:
                - generic [ref=e87]: Reference view
                - generic [ref=e88]: en-GH
            - generic [ref=e89]:
              - paragraph [ref=e90]: The live advisory service is still catching up. You can continue triage in a clearly labeled reference view without losing the evidence attached to the response.
              - paragraph [ref=e91]: Queue and detail stay visible together so reviewers can compare confidence, policy context, and conversation history.
          - generic [ref=e92]:
            - generic [ref=e93]:
              - generic [ref=e95]:
                - paragraph [ref=e96]: Case queue
                - heading "Advisory requests" [level=2] [ref=e97]
                - paragraph [ref=e98]: Open a case to inspect reviewer status, confidence, and source proof before moving forward.
              - list "Advisory requests" [ref=e99]:
                - 'button "blocked low confidence 4/18/2026, 8:16:00 PM Unverified soil additive claim A trader says a new additive will reverse yellowing in one day. Can that advice be sent? 1 citations · reviewer: block" [ref=e100] [cursor=pointer]':
                  - generic [ref=e101]:
                    - generic [ref=e102]:
                      - generic [ref=e103]: blocked
                      - generic [ref=e104]: low confidence
                    - generic [ref=e105]: 4/18/2026, 8:16:00 PM
                  - heading "Unverified soil additive claim" [level=3] [ref=e106]
                  - paragraph [ref=e107]: A trader says a new additive will reverse yellowing in one day. Can that advice be sent?
                  - paragraph [ref=e108]: "1 citations · reviewer: block"
                - 'button "hitl required medium confidence 4/18/2026, 8:13:00 PM Possible pesticide recommendation Can I tell the farmer to apply a fungicide immediately after this rainfall pattern? 1 citations · reviewer: hitl required" [ref=e109] [cursor=pointer]':
                  - generic [ref=e110]:
                    - generic [ref=e111]:
                      - generic [ref=e112]: hitl required
                      - generic [ref=e113]: medium confidence
                    - generic [ref=e114]: 4/18/2026, 8:13:00 PM
                  - heading "Possible pesticide recommendation" [level=3] [ref=e115]
                  - paragraph [ref=e116]: Can I tell the farmer to apply a fungicide immediately after this rainfall pattern?
                  - paragraph [ref=e117]: "1 citations · reviewer: hitl required"
                - 'button "delivered high confidence 4/18/2026, 8:12:00 PM Waterlogged maize after heavy rain Leaves are turning yellow after heavy rain. What should the farmer verify first before treating the field? 2 citations · reviewer: approve" [ref=e118] [cursor=pointer]':
                  - generic [ref=e119]:
                    - generic [ref=e120]:
                      - generic [ref=e121]: delivered
                      - generic [ref=e122]: high confidence
                    - generic [ref=e123]: 4/18/2026, 8:12:00 PM
                  - heading "Waterlogged maize after heavy rain" [level=3] [ref=e124]
                  - paragraph [ref=e125]: Leaves are turning yellow after heavy rain. What should the farmer verify first before treating the field?
                  - paragraph [ref=e126]: "2 citations · reviewer: approve"
            - generic [ref=e127]:
              - generic [ref=e128]:
                - generic [ref=e129]:
                  - generic [ref=e130]:
                    - paragraph [ref=e131]: Unverified soil additive claim
                    - heading "Guidance summary" [level=2] [ref=e132]
                    - paragraph [ref=e133]: A trader says a new additive will reverse yellowing in one day. Can that advice be sent?
                  - generic [ref=e135]:
                    - generic [ref=e136]: blocked
                    - generic [ref=e137]: 29% confidence
                - paragraph [ref=e138]: No. The claim is blocked because the available sources do not verify the additive and the confidence score is below the release threshold.
                - complementary [ref=e139]:
                  - strong [ref=e140]: Blocked delivery
                  - paragraph [ref=e141]: Delivery is blocked. Do not restate this as approved advice until a reviewer clears or revises it.
              - generic [ref=e142]:
                - generic [ref=e144]:
                  - paragraph [ref=e145]: Reviewer state
                  - heading "Reviewer blocked delivery" [level=2] [ref=e146]
                  - paragraph [ref=e147]: Commercial efficacy claim is unsupported by vetted sources.
                - list [ref=e148]:
                  - listitem [ref=e149]:
                    - generic [ref=e150]: Reason code
                    - strong [ref=e151]: insufficient_confidence
                  - listitem [ref=e152]:
                    - generic [ref=e153]: Policy threshold
                    - strong [ref=e154]: 75%
                  - listitem [ref=e155]:
                    - generic [ref=e156]: Policy sensitivity
                    - strong [ref=e157]: Sensitive
              - generic [ref=e158]:
                - generic [ref=e159]:
                  - generic [ref=e160]:
                    - paragraph [ref=e161]: Citations
                    - heading "Supporting evidence" [level=2] [ref=e162]
                    - paragraph [ref=e163]: Field guidance stays attached to the evidence used to form it.
                  - button "Open citation drawer" [ref=e165] [cursor=pointer]
                - paragraph [ref=e166]: 1 vetted sources linked · model agro-advisor n4-preview
              - generic [ref=e167]:
                - generic [ref=e169]:
                  - paragraph [ref=e170]: Conversation history
                  - heading "Conversation history" [level=2] [ref=e171]
                  - paragraph [ref=e172]: The final response can be checked against the prompts and reviewer events that shaped it.
                - list [ref=e173]:
                  - listitem [ref=e174]:
                    - generic [ref=e175]:
                      - generic [ref=e176]:
                        - strong [ref=e177]: user
                        - generic [ref=e178]: 4/18/2026, 8:15:00 PM
                      - paragraph [ref=e179]: A trader says a new additive will fix this in one day.
                  - listitem [ref=e180]:
                    - generic [ref=e181]:
                      - generic [ref=e182]:
                        - strong [ref=e183]: system
                        - generic [ref=e184]: 4/18/2026, 8:16:00 PM
                      - paragraph [ref=e185]: Delivery blocked because the evidence threshold was not met.
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
> 79  |     ).toBeVisible();
      |       ^ Error: expect(locator).toBeVisible() failed
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
  103 |     ).toBeVisible({ timeout: 20_000 });
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