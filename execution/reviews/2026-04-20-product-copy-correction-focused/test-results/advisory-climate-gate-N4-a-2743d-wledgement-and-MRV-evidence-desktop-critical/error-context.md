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
            - generic [ref=e19]: Farmer
            - generic [ref=e20]: GH
          - paragraph [ref=e21]: N4 Farmer QA
          - heading "Ghana Growers Network" [level=1] [ref=e22]
          - paragraph [ref=e23]: farmer.n4.desktop-critical-1776729504903@example.com · Farmer · GH
          - paragraph [ref=e24]: This protected workspace keeps role routing, queue state, and permission status visible while you move between operational routes.
        - generic [ref=e25]:
          - generic [ref=e26]: Trace trace-p-climate-alerts-h7khib
          - button "Sign out" [ref=e27] [cursor=pointer]
      - region "Sync status" [ref=e28]:
        - generic [ref=e29]:
          - generic [ref=e30]:
            - generic [ref=e31]: Low connectivity
            - generic [ref=e32]: Handoff ussd
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e33]
          - paragraph [ref=e34]: "Pending items: 1. Conflicts: 0. Trace ID: trace-p-climate-alerts-h7khib."
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
                - heading "Farmer operations" [level=2] [ref=e46]
                - paragraph [ref=e47]: The workspace routes to the correct role surface while keeping consent, queue, and offline state visible.
              - navigation "Primary" [ref=e48]:
                - generic [ref=e49]:
                  - link "Home" [ref=e50] [cursor=pointer]:
                    - /url: /app/farmer
                    - generic [ref=e51]: Home
                  - link "Market" [ref=e52] [cursor=pointer]:
                    - /url: /app/market/listings
                    - generic [ref=e53]: Market
                  - link "Inbox 1" [ref=e54] [cursor=pointer]:
                    - /url: /app/market/negotiations
                    - generic [ref=e55]: Inbox
                    - generic [ref=e56]: "1"
                  - link "Alerts" [ref=e57] [cursor=pointer]:
                    - /url: /app/climate/alerts
                    - generic [ref=e58]: Alerts
                  - link "Profile 2" [ref=e59] [cursor=pointer]:
                    - /url: /app/profile
                    - generic [ref=e60]: Profile
                    - generic [ref=e61]: "2"
            - list [ref=e62]:
              - listitem [ref=e63]:
                - generic [ref=e64]: Home route
                - strong [ref=e65]: /app/farmer
              - listitem [ref=e66]:
                - generic [ref=e67]: Field posture
                - strong [ref=e68]: Field actions
              - listitem [ref=e69]:
                - generic [ref=e70]: Proof posture
                - strong [ref=e71]: Why this is safe
            - complementary [ref=e72]:
              - strong [ref=e73]: Design note
              - paragraph [ref=e74]: Consent, queue freshness, and evidence ownership stay visible before any protected action.
        - generic [ref=e76]:
          - generic [ref=e77]:
            - generic [ref=e78]:
              - generic [ref=e79]:
                - paragraph [ref=e80]: Climate and MRV
                - heading "Monitor weather risk and field evidence with confidence in view" [level=2] [ref=e81]
                - paragraph [ref=e82]: Alert severity, acknowledgement state, source posture, and evidence assumptions stay visible together so operators do not over-read partial data.
              - generic [ref=e84]:
                - generic [ref=e85]: Reference view
                - generic [ref=e86]: en-GH
            - paragraph [ref=e87]: The climate service is still catching up. This workspace clearly labels reference data and degraded evidence so teams do not over-read incomplete information.
          - generic [ref=e88]:
            - generic [ref=e89]:
              - generic [ref=e91]:
                - paragraph [ref=e92]: Alert center
                - heading "Farm alerts" [level=2] [ref=e93]
                - paragraph [ref=e94]: Severity order is preserved so the highest-risk item is the first thing a mobile or desktop operator sees.
              - list "Climate alerts" [ref=e95]:
                - button "critical Open 4/18/2026, 8:20:00 PM High soil saturation risk Two consecutive heavy-rain windows raise root stress risk in low-field blocks. Verified from current source window" [ref=e96] [cursor=pointer]:
                  - generic [ref=e97]:
                    - generic [ref=e98]:
                      - generic [ref=e99]: critical
                      - generic [ref=e100]: Open
                    - generic [ref=e101]: 4/18/2026, 8:20:00 PM
                  - heading "High soil saturation risk" [level=3] [ref=e102]
                  - paragraph [ref=e103]: Two consecutive heavy-rain windows raise root stress risk in low-field blocks.
                  - paragraph [ref=e104]: Verified from current source window
                - button "warning Open 4/18/2026, 8:24:00 PM Weather window incomplete Recent rainfall readings are partial. Treat operational advice as reduced-confidence until the next refresh. Reduced while source windows recover" [ref=e105] [cursor=pointer]:
                  - generic [ref=e106]:
                    - generic [ref=e107]:
                      - generic [ref=e108]: warning
                      - generic [ref=e109]: Open
                    - generic [ref=e110]: 4/18/2026, 8:24:00 PM
                  - heading "Weather window incomplete" [level=3] [ref=e111]
                  - paragraph [ref=e112]: Recent rainfall readings are partial. Treat operational advice as reduced-confidence until the next refresh.
                  - paragraph [ref=e113]: Reduced while source windows recover
            - generic [ref=e114]:
              - generic [ref=e115]:
                - generic [ref=e116]:
                  - generic [ref=e117]:
                    - paragraph [ref=e118]: High soil saturation risk
                    - heading "Alert detail" [level=2] [ref=e119]
                    - paragraph [ref=e120]: Two consecutive heavy-rain windows raise root stress risk in low-field blocks.
                  - generic [ref=e122]:
                    - generic [ref=e123]: critical
                    - generic [ref=e124]: Current data window
                - list [ref=e125]:
                  - listitem [ref=e126]:
                    - generic [ref=e127]: Source confidence
                    - strong [ref=e128]: Verified from current source window
                  - listitem [ref=e129]:
                    - generic [ref=e130]: Acknowledgement
                    - strong [ref=e131]: Pending operator action
                  - listitem [ref=e132]:
                    - generic [ref=e133]: Source ids
                    - strong [ref=e134]: source-window-gh-01, radar-gh-02
                - button "Acknowledge alert" [ref=e136] [cursor=pointer]
                - paragraph [ref=e137]: Acknowledgement is recorded here, but source completeness is always shown separately so no one mistakes this for full certainty.
              - generic [ref=e138]:
                - generic [ref=e140]:
                  - paragraph [ref=e141]: Degraded windows
                  - heading "Assumptions and method references" [level=2] [ref=e142]
                  - paragraph [ref=e143]: When data windows fail, the assumptions remain on-screen so operators can decide whether the alert is still actionable.
                - article [ref=e145]:
                  - generic [ref=e146]:
                    - strong [ref=e147]: source_window_missing
                    - generic [ref=e148]: degraded
                  - list [ref=e149]:
                    - listitem [ref=e150]:
                      - generic [ref=e151]: Assumption
                      - strong [ref=e152]: Radar observations for the last 6 hours are missing.
                    - listitem [ref=e153]:
                      - generic [ref=e154]: Assumption
                      - strong [ref=e155]: The last verified station reading is being used as a temporary assumption.
              - generic [ref=e156]:
                - generic [ref=e158]:
                  - paragraph [ref=e159]: MRV evidence
                  - heading "Evidence and method references" [level=2] [ref=e160]
                  - paragraph [ref=e161]: Evidence records keep provenance visible so MRV completeness is not overstated in field operations.
                - generic [ref=e162]:
                  - article [ref=e163]:
                    - generic [ref=e164]:
                      - strong [ref=e165]: ipcc-tier-2-soil-moisture
                      - generic [ref=e166]: partial
                    - list [ref=e167]:
                      - listitem [ref=e168]:
                        - generic [ref=e169]: Assumption
                        - strong [ref=e170]: North block moisture is estimated from the last verified reading.
                      - listitem [ref=e171]:
                        - generic [ref=e172]: Assumption
                        - strong [ref=e173]: The calculation excludes rows that were not sampled.
                      - listitem [ref=e174]:
                        - generic [ref=e175]: Method reference
                        - strong [ref=e176]: IPCC Tier 2 Annex 4
                  - article [ref=e177]:
                    - generic [ref=e178]:
                      - strong [ref=e179]: field-drainage-observation
                      - generic [ref=e180]: complete
                    - list [ref=e181]:
                      - listitem [ref=e182]:
                        - generic [ref=e183]: Assumption
                        - strong [ref=e184]: No additional assumptions; all field observations were captured in the latest visit.
                      - listitem [ref=e185]:
                        - generic [ref=e186]: Method reference
                        - strong [ref=e187]: Drainage Checklist v2
```

# Test source

```ts
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
  45  |   const heading = page.getByRole("heading", { name: "Review evidence-backed recommendations" });
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
  66  |   const heading = page.getByRole("heading", { name: "Monitor weather risk and field evidence with confidence in view" });
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
  79  |   await expect(heading).toBeVisible({ timeout: 20_000 });
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
> 125 |     ).toBeVisible();
      |       ^ Error: expect(locator).toBeVisible() failed
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