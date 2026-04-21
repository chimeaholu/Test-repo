# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: advisory-climate-gate.spec.ts >> N4 advisory and climate tranche diagnostics >> CJ-005 EP-006 RJ-003 DI-005 advisory route shows citations, confidence, and reviewer state
- Location: tests/e2e/advisory-climate-gate.spec.ts:27:7

# Error details

```
Error: page.screenshot: Protocol error (Page.captureScreenshot): Unable to capture screenshot
Call log:
  - taking page screenshot
  - waiting for fonts to load...
  - fonts loaded

```

# Page snapshot

```yaml
- generic [ref=e1]:
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
          - paragraph [ref=e23]: advisor.n4.mobile-critical-1776557231486@example.com · Advisor · GH
        - generic [ref=e24]:
          - generic [ref=e25]: Trace trace-advisor-requests-93l1wu
          - button "Sign out" [ref=e26] [cursor=pointer]
      - region "Sync status" [ref=e27]:
        - generic [ref=e28]:
          - generic [ref=e29]:
            - generic [ref=e30]: Low connectivity
            - generic [ref=e31]: Handoff ussd
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e32]
          - paragraph [ref=e33]: "Pending items: 1. Conflicts: 0. Trace ID: trace-advisor-requests-93l1wu."
        - generic [ref=e34]:
          - button "Force online" [ref=e35] [cursor=pointer]
          - button "Simulate degraded" [ref=e36] [cursor=pointer]
          - button "Simulate offline" [ref=e37] [cursor=pointer]
      - generic [ref=e40]:
        - generic [ref=e41]:
          - generic [ref=e42]:
            - generic [ref=e43]:
              - paragraph [ref=e44]: Advisory conversation
              - heading "Grounded guidance with reviewer state" [level=2] [ref=e45]
              - paragraph [ref=e46]: Every response keeps citations, confidence, and reviewer posture visible before anyone treats it as field advice.
            - generic [ref=e48]:
              - generic [ref=e49]: Contract-backed preview
              - generic [ref=e50]: en-GH
          - generic [ref=e51]:
            - paragraph [ref=e52]: Live N4 advisory reads are still being published. This workspace is rendering the canonical contract-backed preview instead of a placeholder.
            - paragraph [ref=e53]: Queue and detail stay visible together so reviewers can compare confidence, policy context, and transcript state.
        - generic [ref=e54]:
          - generic [ref=e55]:
            - generic [ref=e57]:
              - paragraph [ref=e58]: Case queue
              - heading "Advisory requests" [level=2] [ref=e59]
              - paragraph [ref=e60]: Open a case to inspect reviewer posture, confidence, and source proof before you move forward.
            - list "Advisory requests" [ref=e61]:
              - 'button "blocked low confidence 4/18/2026, 8:16:00 PM Unverified soil additive claim A trader says a new additive will reverse yellowing in one day. Can that advice be sent? 1 citations · reviewer: block" [ref=e62] [cursor=pointer]':
                - generic [ref=e63]:
                  - generic [ref=e64]:
                    - generic [ref=e65]: blocked
                    - generic [ref=e66]: low confidence
                  - generic [ref=e67]: 4/18/2026, 8:16:00 PM
                - heading "Unverified soil additive claim" [level=3] [ref=e68]
                - paragraph [ref=e69]: A trader says a new additive will reverse yellowing in one day. Can that advice be sent?
                - paragraph [ref=e70]: "1 citations · reviewer: block"
              - 'button "hitl required medium confidence 4/18/2026, 8:13:00 PM Possible pesticide recommendation Can I tell the farmer to apply a fungicide immediately after this rainfall pattern? 1 citations · reviewer: hitl required" [ref=e71] [cursor=pointer]':
                - generic [ref=e72]:
                  - generic [ref=e73]:
                    - generic [ref=e74]: hitl required
                    - generic [ref=e75]: medium confidence
                  - generic [ref=e76]: 4/18/2026, 8:13:00 PM
                - heading "Possible pesticide recommendation" [level=3] [ref=e77]
                - paragraph [ref=e78]: Can I tell the farmer to apply a fungicide immediately after this rainfall pattern?
                - paragraph [ref=e79]: "1 citations · reviewer: hitl required"
              - 'button "delivered high confidence 4/18/2026, 8:12:00 PM Waterlogged maize after heavy rain Leaves are turning yellow after heavy rain. What should the farmer verify first before treating the field? 2 citations · reviewer: approve" [ref=e80] [cursor=pointer]':
                - generic [ref=e81]:
                  - generic [ref=e82]:
                    - generic [ref=e83]: delivered
                    - generic [ref=e84]: high confidence
                  - generic [ref=e85]: 4/18/2026, 8:12:00 PM
                - heading "Waterlogged maize after heavy rain" [level=3] [ref=e86]
                - paragraph [ref=e87]: Leaves are turning yellow after heavy rain. What should the farmer verify first before treating the field?
                - paragraph [ref=e88]: "2 citations · reviewer: approve"
          - generic [ref=e89]:
            - generic [ref=e90]:
              - generic [ref=e91]:
                - generic [ref=e92]:
                  - paragraph [ref=e93]: Unverified soil additive claim
                  - heading "Advice state" [level=2] [ref=e94]
                  - paragraph [ref=e95]: A trader says a new additive will reverse yellowing in one day. Can that advice be sent?
                - generic [ref=e97]:
                  - generic [ref=e98]: blocked
                  - generic [ref=e99]: 29% confidence
              - paragraph [ref=e100]: No. The claim is blocked because the available sources do not verify the additive and the confidence score is below the release threshold.
              - complementary [ref=e101]:
                - strong [ref=e102]: Blocked delivery
                - paragraph [ref=e103]: Delivery is blocked. Do not restate this as approved advice until the reviewer clears or revises it.
            - generic [ref=e104]:
              - generic [ref=e106]:
                - paragraph [ref=e107]: Reviewer decision
                - heading "Reviewer blocked delivery" [level=2] [ref=e108]
                - paragraph [ref=e109]: Commercial efficacy claim is unsupported by vetted sources.
              - list [ref=e110]:
                - listitem [ref=e111]:
                  - generic [ref=e112]: Reason code
                  - strong [ref=e113]: insufficient_confidence
                - listitem [ref=e114]:
                  - generic [ref=e115]: Policy threshold
                  - strong [ref=e116]: 75%
                - listitem [ref=e117]:
                  - generic [ref=e118]: Policy sensitivity
                  - strong [ref=e119]: Sensitive
            - generic [ref=e120]:
              - generic [ref=e121]:
                - generic [ref=e122]:
                  - paragraph [ref=e123]: Citations
                  - heading "Source proof" [level=2] [ref=e124]
                  - paragraph [ref=e125]: Grounded advice must stay attached to the evidence used to form it.
                - button "Hide citations" [active] [ref=e127] [cursor=pointer]
              - paragraph [ref=e128]: 1 vetted sources linked · model agro-advisor n4-preview
              - list "Citation drawer" [ref=e129]:
                - listitem [ref=e130]:
                  - generic [ref=e131]:
                    - strong [ref=e132]: Unverified input claims control
                    - generic [ref=e133]: policy
                  - paragraph [ref=e134]: Advice tied to unverified commercial claims must be blocked when evidence is insufficient.
                  - paragraph [ref=e135]: policy-unverified-input-block · GH · en-GH
            - generic [ref=e136]:
              - generic [ref=e138]:
                - paragraph [ref=e139]: Conversation transcript
                - heading "Transcript trail" [level=2] [ref=e140]
                - paragraph [ref=e141]: Conversation state is visible so the final response can be audited against the prompts and reviewer events that shaped it.
              - list [ref=e142]:
                - listitem [ref=e143]:
                  - generic [ref=e144]:
                    - generic [ref=e145]:
                      - strong [ref=e146]: user
                      - generic [ref=e147]: 4/18/2026, 8:15:00 PM
                    - paragraph [ref=e148]: A trader says a new additive will fix this in one day.
                - listitem [ref=e149]:
                  - generic [ref=e150]:
                    - generic [ref=e151]:
                      - strong [ref=e152]: system
                      - generic [ref=e153]: 4/18/2026, 8:16:00 PM
                    - paragraph [ref=e154]: Delivery blocked because the evidence threshold was not met.
      - navigation "Mobile primary" [ref=e156]:
        - link "Home" [ref=e157] [cursor=pointer]:
          - /url: /app/advisor
          - generic [ref=e158]: Home
        - link "Requests" [ref=e159] [cursor=pointer]:
          - /url: /app/advisor/requests
          - generic [ref=e160]: Requests
        - link "Market" [ref=e161] [cursor=pointer]:
          - /url: /app/market/listings
          - generic [ref=e162]: Market
        - link "Inbox 1" [ref=e163] [cursor=pointer]:
          - /url: /app/market/negotiations
          - generic [ref=e164]: Inbox
          - generic [ref=e165]: "1"
        - link "Alerts" [ref=e166] [cursor=pointer]:
          - /url: /app/climate/alerts
          - generic [ref=e167]: Alerts
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
> 23 |   await page.screenshot({ path: screenshotPath, fullPage: true });
     |              ^ Error: page.screenshot: Protocol error (Page.captureScreenshot): Unable to capture screenshot
  24 | }
  25 | 
  26 | test.describe("N4 advisory and climate tranche diagnostics", () => {
  27 |   test("CJ-005 EP-006 RJ-003 DI-005 advisory route shows citations, confidence, and reviewer state", async ({
  28 |     page,
  29 |   }, testInfo) => {
  30 |     const runId = `${testInfo.project.name}-${Date.now()}`;
  31 |     await signInAndGrantConsent(page, {
  32 |       displayName: "N4 Advisor QA",
  33 |       email: `advisor.n4.${runId}@example.com`,
  34 |       role: "advisor",
  35 |       countryCode: "GH",
  36 |     });
  37 | 
  38 |     await gotoPath(page, "/app/advisor/requests");
  39 |     await expect(
  40 |       page.getByRole("heading", { name: "Grounded guidance with reviewer state" }),
  41 |     ).toBeVisible({ timeout: 20_000 });
  42 |     await expect(
  43 |       page.getByText(
  44 |         "Every response keeps citations, confidence, and reviewer posture visible before anyone treats it as field advice.",
  45 |       ),
  46 |     ).toBeVisible();
  47 |     await expect(page.getByText(/confidence/i).first()).toBeVisible();
  48 |     await expect(page.getByText(/Reviewer decision/i)).toBeVisible();
  49 |     await page.getByRole("button", { name: "Open citation drawer" }).click();
  50 |     await expect(page.getByRole("heading", { name: "Source proof" })).toBeVisible();
  51 |     await expect(page.getByText("Unverified input claims control")).toBeVisible();
  52 | 
  53 |     await captureProof(page, testInfo, "cj005-advisory-conversation");
  54 |   });
  55 | 
  56 |   test("CJ-006 EP-008 RJ-003 DI-006 climate route shows alert acknowledgement and MRV evidence", async ({
  57 |     page,
  58 |   }, testInfo) => {
  59 |     const runId = `${testInfo.project.name}-${Date.now()}`;
  60 |     await signInAndGrantConsent(page, {
  61 |       displayName: "N4 Farmer QA",
  62 |       email: `farmer.n4.${runId}@example.com`,
  63 |       role: "farmer",
  64 |       countryCode: "GH",
  65 |     });
  66 | 
  67 |     await gotoPath(page, "/app/climate/alerts");
  68 |     await expect(
  69 |       page.getByRole("heading", { name: "Live alert triage with visible degraded-mode posture" }),
  70 |     ).toBeVisible({ timeout: 20_000 });
  71 |     await expect(
  72 |       page.getByText(
  73 |         "Alert severity, acknowledgement state, source posture, and MRV assumptions stay visible together so operators do not over-read partial data.",
  74 |       ),
  75 |     ).toBeVisible();
  76 |     await expect(page.getByRole("button", { name: /Acknowledge alert/i })).toBeVisible();
  77 |     await expect(page.getByRole("heading", { name: "Assumptions and method references" })).toBeVisible();
  78 |     await expect(page.getByText("IPCC Tier 2 Annex 4")).toBeVisible();
  79 |     await expect(page.getByText(/Assumption/i).first()).toBeVisible();
  80 |     await expect(page.getByText(/degraded/i).first()).toBeVisible();
  81 | 
  82 |     await captureProof(page, testInfo, "cj006-climate-dashboard");
  83 |   });
  84 | });
  85 | 
```