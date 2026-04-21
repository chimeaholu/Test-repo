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

Locator: getByText('Alert severity, acknowledgement state, source posture, and MRV assumptions stay visible together so operators do not over-read partial data.')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByText('Alert severity, acknowledgement state, source posture, and MRV assumptions stay visible together so operators do not over-read partial data.')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - alert [ref=e3]
  - generic [ref=e4]:
    - link "Skip to content" [ref=e5] [cursor=pointer]:
      - /url: "#main-content"
    - main [ref=e6]:
      - generic [ref=e7]:
        - generic [ref=e8]:
          - generic [ref=e9]:
            - generic [ref=e10]: Farmer
            - generic [ref=e11]: GH
          - paragraph [ref=e12]: N4 Farmer QA
          - heading "Ghana Growers Network" [level=1] [ref=e13]
          - paragraph [ref=e14]: farmer.n4.desktop-critical-1776686063260@example.com · Farmer · GH
          - paragraph [ref=e15]: This protected shell keeps role routing, queue state, and consent posture persistent while you move between operational routes.
        - generic [ref=e16]:
          - generic [ref=e17]: Trace trace-p-climate-alerts-vm3dz8
          - button "Sign out" [ref=e18] [cursor=pointer]
      - region "Sync status" [ref=e19]:
        - generic [ref=e20]:
          - generic [ref=e21]:
            - generic [ref=e22]: Low connectivity
            - generic [ref=e23]: Handoff ussd
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e24]
          - paragraph [ref=e25]: "Pending items: 1. Conflicts: 0. Trace ID: trace-p-climate-alerts-vm3dz8."
        - generic [ref=e26]:
          - button "Force online" [ref=e27] [cursor=pointer]
          - button "Simulate degraded" [ref=e28] [cursor=pointer]
          - button "Simulate offline" [ref=e29] [cursor=pointer]
      - generic [ref=e30]:
        - complementary [ref=e31]:
          - generic [ref=e32]:
            - generic [ref=e33]:
              - generic [ref=e35]:
                - paragraph [ref=e36]: Role-aware workspace
                - heading "Farmer operations" [level=2] [ref=e37]
                - paragraph [ref=e38]: The shell routes to the correct role surface while keeping consent, queue, and offline state visible.
              - navigation "Primary" [ref=e39]:
                - generic [ref=e40]:
                  - link "Home" [ref=e41] [cursor=pointer]:
                    - /url: /app/farmer
                    - generic [ref=e42]: Home
                  - link "Market" [ref=e43] [cursor=pointer]:
                    - /url: /app/market/listings
                    - generic [ref=e44]: Market
                  - link "Inbox 1" [ref=e45] [cursor=pointer]:
                    - /url: /app/market/negotiations
                    - generic [ref=e46]: Inbox
                    - generic [ref=e47]: "1"
                  - link "Alerts" [ref=e48] [cursor=pointer]:
                    - /url: /app/climate/alerts
                    - generic [ref=e49]: Alerts
                  - link "Profile 2" [ref=e50] [cursor=pointer]:
                    - /url: /app/profile
                    - generic [ref=e51]: Profile
                    - generic [ref=e52]: "2"
            - list [ref=e53]:
              - listitem [ref=e54]:
                - generic [ref=e55]: Home route
                - strong [ref=e56]: /app/farmer
              - listitem [ref=e57]:
                - generic [ref=e58]: Field posture
                - strong [ref=e59]: Field actions
              - listitem [ref=e60]:
                - generic [ref=e61]: Proof posture
                - strong [ref=e62]: Why this is safe
            - complementary [ref=e63]:
              - strong [ref=e64]: Design note
              - paragraph [ref=e65]: Consent, queue freshness, and evidence ownership stay visible before any protected action.
        - generic [ref=e67]:
          - generic [ref=e68]:
            - generic [ref=e69]:
              - generic [ref=e70]:
                - paragraph [ref=e71]: Climate and MRV
                - heading "Live alert triage with visible degraded-mode posture" [level=2] [ref=e72]
                - paragraph [ref=e73]: Alert severity, acknowledgement status, source posture, and MRV assumptions stay visible together so teams do not over-read partial data.
              - generic [ref=e75]:
                - generic [ref=e76]: Reference view
                - generic [ref=e77]: en-GH
            - paragraph [ref=e78]: The climate service is still catching up. This workspace clearly labels reference data and degraded evidence so teams do not over-read incomplete information.
          - generic [ref=e79]:
            - generic [ref=e80]:
              - generic [ref=e82]:
                - paragraph [ref=e83]: Alert center
                - heading "Farm alerts" [level=2] [ref=e84]
                - paragraph [ref=e85]: Severity order is preserved so the highest-risk item is the first thing a mobile or desktop operator sees.
              - list "Climate alerts" [ref=e86]:
                - button "critical Open 4/18/2026, 8:20:00 PM High soil saturation risk Two consecutive heavy-rain windows raise root stress risk in low-field blocks. Verified from current source window" [ref=e87] [cursor=pointer]:
                  - generic [ref=e88]:
                    - generic [ref=e89]:
                      - generic [ref=e90]: critical
                      - generic [ref=e91]: Open
                    - generic [ref=e92]: 4/18/2026, 8:20:00 PM
                  - heading "High soil saturation risk" [level=3] [ref=e93]
                  - paragraph [ref=e94]: Two consecutive heavy-rain windows raise root stress risk in low-field blocks.
                  - paragraph [ref=e95]: Verified from current source window
                - button "warning Open 4/18/2026, 8:24:00 PM Weather window incomplete Recent rainfall readings are partial. Treat operational advice as reduced-confidence until the next refresh. Reduced while source windows recover" [ref=e96] [cursor=pointer]:
                  - generic [ref=e97]:
                    - generic [ref=e98]:
                      - generic [ref=e99]: warning
                      - generic [ref=e100]: Open
                    - generic [ref=e101]: 4/18/2026, 8:24:00 PM
                  - heading "Weather window incomplete" [level=3] [ref=e102]
                  - paragraph [ref=e103]: Recent rainfall readings are partial. Treat operational advice as reduced-confidence until the next refresh.
                  - paragraph [ref=e104]: Reduced while source windows recover
            - generic [ref=e105]:
              - generic [ref=e106]:
                - generic [ref=e107]:
                  - generic [ref=e108]:
                    - paragraph [ref=e109]: High soil saturation risk
                    - heading "Alert detail" [level=2] [ref=e110]
                    - paragraph [ref=e111]: Two consecutive heavy-rain windows raise root stress risk in low-field blocks.
                  - generic [ref=e113]:
                    - generic [ref=e114]: critical
                    - generic [ref=e115]: Current data window
                - list [ref=e116]:
                  - listitem [ref=e117]:
                    - generic [ref=e118]: Source confidence
                    - strong [ref=e119]: Verified from current source window
                  - listitem [ref=e120]:
                    - generic [ref=e121]: Acknowledgement
                    - strong [ref=e122]: Pending operator action
                  - listitem [ref=e123]:
                    - generic [ref=e124]: Source ids
                    - strong [ref=e125]: source-window-gh-01, radar-gh-02
                - button "Acknowledge alert" [ref=e127] [cursor=pointer]
                - paragraph [ref=e128]: Acknowledgement is recorded here, but source completeness is always shown separately so no one mistakes this for full certainty.
              - generic [ref=e129]:
                - generic [ref=e131]:
                  - paragraph [ref=e132]: Degraded windows
                  - heading "Source gaps and assumptions" [level=2] [ref=e133]
                  - paragraph [ref=e134]: When data windows fail, the assumptions remain on-screen so operators can decide whether the alert is still actionable.
                - article [ref=e136]:
                  - generic [ref=e137]:
                    - strong [ref=e138]: source_window_missing
                    - generic [ref=e139]: degraded
                  - list [ref=e140]:
                    - listitem [ref=e141]:
                      - generic [ref=e142]: Assumption
                      - strong [ref=e143]: Radar observations for the last 6 hours are missing.
                    - listitem [ref=e144]:
                      - generic [ref=e145]: Assumption
                      - strong [ref=e146]: The last verified station reading is being used as a temporary assumption.
              - generic [ref=e147]:
                - generic [ref=e149]:
                  - paragraph [ref=e150]: MRV evidence
                  - heading "Evidence and method references" [level=2] [ref=e151]
                  - paragraph [ref=e152]: Evidence records keep provenance visible so MRV completeness is not overstated in field operations.
                - generic [ref=e153]:
                  - article [ref=e154]:
                    - generic [ref=e155]:
                      - strong [ref=e156]: ipcc-tier-2-soil-moisture
                      - generic [ref=e157]: partial
                    - list [ref=e158]:
                      - listitem [ref=e159]:
                        - generic [ref=e160]: Assumption
                        - strong [ref=e161]: North block moisture is estimated from the last verified reading.
                      - listitem [ref=e162]:
                        - generic [ref=e163]: Assumption
                        - strong [ref=e164]: The calculation excludes rows that were not sampled.
                      - listitem [ref=e165]:
                        - generic [ref=e166]: Method reference
                        - strong [ref=e167]: IPCC Tier 2 Annex 4
                  - article [ref=e168]:
                    - generic [ref=e169]:
                      - strong [ref=e170]: field-drainage-observation
                      - generic [ref=e171]: complete
                    - list [ref=e172]:
                      - listitem [ref=e173]:
                        - generic [ref=e174]: Assumption
                        - strong [ref=e175]: No additional assumptions; all field observations were captured in the latest visit.
                      - listitem [ref=e176]:
                        - generic [ref=e177]: Method reference
                        - strong [ref=e178]: Drainage Checklist v2
```

# Test source

```ts
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
  103 |     ).toBeVisible({ timeout: 20_000 });
  104 |     await expect(
  105 |       page.getByText(
  106 |         "Alert severity, acknowledgement state, source posture, and MRV assumptions stay visible together so operators do not over-read partial data.",
  107 |       ),
> 108 |     ).toBeVisible();
      |       ^ Error: expect(locator).toBeVisible() failed
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