# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: n6-admin-observability.spec.ts >> N6 admin observability and rollout tranche diagnostics >> EP-005 DI-003 admin workspace shows rollout controls with scope chips and audit posture
- Location: tests/e2e/n6-admin-observability.spec.ts:24:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/Actor attribution|Audit history|Country scope/i)
Expected: visible
Error: strict mode violation: getByText(/Actor attribution|Audit history|Country scope/i) resolved to 3 elements:
    1) <span>Country scope</span> aka getByText('Country scope')
    2) <span>Actor attribution</span> aka getByText('Actor attribution')
    3) <p class="eyebrow">Audit history</p> aka getByText('Audit history')

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByText(/Actor attribution|Audit history|Country scope/i)

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
            - generic [ref=e19]: Admin
            - generic [ref=e20]: GH
          - paragraph [ref=e21]: N6 Admin QA
          - heading "Ghana Growers Network" [level=1] [ref=e22]
          - paragraph [ref=e23]: admin.rollout.n6.1776695599635@example.com · Admin · GH
          - paragraph [ref=e24]: This protected workspace keeps role routing, queue state, and consent posture persistent while you move between operational routes.
        - generic [ref=e25]:
          - generic [ref=e26]: Trace trace--app-admin-t4dzjd
          - button "Sign out" [ref=e27] [cursor=pointer]
      - region "Sync status" [ref=e28]:
        - generic [ref=e29]:
          - generic [ref=e30]:
            - generic [ref=e31]: Low connectivity
            - generic [ref=e32]: Handoff ussd
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e33]
          - paragraph [ref=e34]: "Pending items: 1. Conflicts: 0. Trace ID: trace--app-admin-t4dzjd."
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
                - heading "Admin operations" [level=2] [ref=e46]
                - paragraph [ref=e47]: The workspace routes to the correct role surface while keeping consent, queue, and offline state visible.
              - navigation "Primary" [ref=e48]:
                - generic [ref=e49]:
                  - link "Home" [ref=e50] [cursor=pointer]:
                    - /url: /app/admin
                    - generic [ref=e51]: Home
                  - link "Analytics" [ref=e52] [cursor=pointer]:
                    - /url: /app/admin/analytics
                    - generic [ref=e53]: Analytics
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
                - strong [ref=e67]: /app/admin
              - listitem [ref=e68]:
                - generic [ref=e69]: Field posture
                - strong [ref=e70]: Control checks
              - listitem [ref=e71]:
                - generic [ref=e72]: Proof posture
                - strong [ref=e73]: Readiness proof
            - complementary [ref=e74]:
              - strong [ref=e75]: Design note
              - paragraph [ref=e76]: State naming, queue risk, and route readiness remain explicit to support release gates.
        - generic [ref=e78]:
          - generic [ref=e79]:
            - generic [ref=e80]:
              - generic [ref=e81]:
                - paragraph [ref=e82]: Admin analytics
                - heading "Service health" [level=2] [ref=e83]
                - paragraph [ref=e84]: Service health, release readiness, rollout posture, and recent operator activity stay visible in one admin view.
              - generic [ref=e86]:
                - generic [ref=e87]: degraded
                - generic [ref=e88]: blocked
            - generic "Admin control posture" [ref=e89]:
              - article [ref=e90]:
                - generic [ref=e91]: Service health
                - strong [ref=e92]: degraded
                - paragraph [ref=e93]: Current summary of service health signals.
              - article [ref=e94]:
                - generic [ref=e95]: Readiness
                - strong [ref=e96]: blocked
                - paragraph [ref=e97]: Release posture before any promote action is taken.
              - article [ref=e98]:
                - generic [ref=e99]: Active alerts
                - strong [ref=e100]: "7"
                - paragraph [ref=e101]: Operational conditions that may block or constrain release activity.
          - generic [ref=e102]:
            - generic [ref=e103]:
              - generic [ref=e105]:
                - paragraph [ref=e106]: Alert summary
                - heading "Operational alerts" [level=2] [ref=e107]
                - paragraph [ref=e108]: This panel stays explicit when telemetry is stale, degraded, or blocking release progress.
              - complementary [ref=e109]:
                - strong [ref=e110]: Operator expectation
                - paragraph [ref=e111]: Alerts should help an admin explain the current platform posture quickly, not force a hunt across separate tools.
              - generic [ref=e112]:
                - article [ref=e113]:
                  - generic [ref=e114]:
                    - strong [ref=e115]: admin_control_plane
                    - generic [ref=e116]: breached
                  - paragraph [ref=e117]: No telemetry observation has been ingested for this service; runtime is explicitly degraded.
                - article [ref=e118]:
                  - generic [ref=e119]:
                    - strong [ref=e120]: marketplace
                    - generic [ref=e121]: breached
                  - paragraph [ref=e122]: No telemetry observation has been ingested for this service; runtime is explicitly degraded.
                - article [ref=e123]:
                  - generic [ref=e124]:
                    - strong [ref=e125]: advisory
                    - generic [ref=e126]: breached
                  - paragraph [ref=e127]: No telemetry observation has been ingested for this service; runtime is explicitly degraded.
                - article [ref=e128]:
                  - generic [ref=e129]:
                    - strong [ref=e130]: finance
                    - generic [ref=e131]: breached
                  - paragraph [ref=e132]: No telemetry observation has been ingested for this service; runtime is explicitly degraded.
                - article [ref=e133]:
                  - generic [ref=e134]:
                    - strong [ref=e135]: traceability
                    - generic [ref=e136]: breached
                  - paragraph [ref=e137]: No telemetry observation has been ingested for this service; runtime is explicitly degraded.
                - article [ref=e138]:
                  - generic [ref=e139]:
                    - strong [ref=e140]: climate
                    - generic [ref=e141]: breached
                  - paragraph [ref=e142]: No telemetry observation has been ingested for this service; runtime is explicitly degraded.
                - article [ref=e143]:
                  - generic [ref=e144]:
                    - strong [ref=e145]: rollout_control
                    - generic [ref=e146]: breached
                  - paragraph [ref=e147]: No telemetry observation has been ingested for this service; runtime is explicitly degraded.
            - generic [ref=e148]:
              - generic [ref=e150]:
                - paragraph [ref=e151]: Release readiness
                - heading "Readiness, ownership, and rollout controls" [level=2] [ref=e152]
                - paragraph [ref=e153]: Rollout actions remain actor-attributed and country-scoped before a release is promoted.
              - list [ref=e154]:
                - listitem [ref=e155]:
                  - generic [ref=e156]: Readiness
                  - strong [ref=e157]: blocked
                - listitem [ref=e158]:
                  - generic [ref=e159]: Telemetry freshness
                  - strong [ref=e160]: breached
                - listitem [ref=e161]:
                  - generic [ref=e162]: Country scope
                  - strong [ref=e163]: GH
                - listitem [ref=e164]:
                  - generic [ref=e165]: Actor attribution
                  - strong [ref=e166]: actor-admin-gh-admin-rollout-n6-1776695
              - generic [ref=e167]:
                - button "Freeze rollout" [ref=e168] [cursor=pointer]
                - button "Canary release" [ref=e169] [cursor=pointer]
                - button "Promote" [ref=e170] [cursor=pointer]
                - button "Rollback" [ref=e171] [cursor=pointer]
              - paragraph [ref=e172]: These controls are for operator-attributed rollout state changes only. They are not general navigation shortcuts.
              - generic [ref=e173]:
                - paragraph [ref=e174]: admin_control_plane:freshness_seconds:breached
                - paragraph [ref=e175]: marketplace:freshness_seconds:breached
                - paragraph [ref=e176]: advisory:freshness_seconds:breached
                - paragraph [ref=e177]: finance:freshness_seconds:breached
                - paragraph [ref=e178]: traceability:freshness_seconds:breached
                - paragraph [ref=e179]: climate:freshness_seconds:breached
                - paragraph [ref=e180]: rollout_control:freshness_seconds:breached
          - generic [ref=e181]:
            - generic [ref=e183]:
              - paragraph [ref=e184]: Rollout controls
              - heading "Current rollout states" [level=2] [ref=e185]
              - paragraph [ref=e186]: Scope, state, and last change timestamp stay visible for operator review.
            - article [ref=e188]:
              - generic [ref=e189]:
                - strong [ref=e190]: rollout_control
                - generic [ref=e191]: active
              - paragraph [ref=e192]: Scope gh-default • default_active • 2026-04-20T14:33:26.820587Z
          - generic [ref=e195]:
            - paragraph [ref=e196]: Audit history
            - heading "Recent operator events" [level=2] [ref=e197]
            - paragraph [ref=e198]: Recent admin events remain attached to request IDs for release and incident review.
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | import { gotoPath, signInAndGrantConsent } from "./helpers";
  4  | 
  5  | test.describe("N6 admin observability and rollout tranche diagnostics", () => {
  6  |   test("PF-001 PF-004 admin analytics route exposes live health and degraded-state evidence", async ({
  7  |     page,
  8  |   }) => {
  9  |     const runId = `${Date.now()}`;
  10 |     await signInAndGrantConsent(page, {
  11 |       displayName: "N6 Admin QA",
  12 |       email: `admin.n6.${runId}@example.com`,
  13 |       role: "admin",
  14 |       countryCode: "GH",
  15 |     });
  16 | 
  17 |     await gotoPath(page, "/app/admin/analytics");
  18 |     await expect(page).toHaveURL(/\/app\/admin\/analytics(\?.*)?$/, { timeout: 20_000 });
  19 |     await expect(page.getByRole("heading", { name: "Service health" })).toBeVisible({ timeout: 20_000 });
  20 |     await expect(page.getByText(/Stale telemetry|Degraded telemetry|Alert summary/i)).toBeVisible();
  21 |     await expect(page.getByText("Admin analytics route")).not.toBeVisible();
  22 |   });
  23 | 
  24 |   test("EP-005 DI-003 admin workspace shows rollout controls with scope chips and audit posture", async ({
  25 |     page,
  26 |   }) => {
  27 |     const runId = `${Date.now()}`;
  28 |     await signInAndGrantConsent(page, {
  29 |       displayName: "N6 Admin QA",
  30 |       email: `admin.rollout.n6.${runId}@example.com`,
  31 |       role: "admin",
  32 |       countryCode: "GH",
  33 |     });
  34 | 
  35 |     await gotoPath(page, "/app/admin");
  36 |     await expect(page).toHaveURL(/\/app\/admin(\?.*)?$/, { timeout: 20_000 });
  37 |     await expect(page.getByRole("button", { name: /Freeze rollout/i })).toBeVisible({ timeout: 20_000 });
> 38 |     await expect(page.getByText(/Actor attribution|Audit history|Country scope/i)).toBeVisible();
     |                                                                                    ^ Error: expect(locator).toBeVisible() failed
  39 |   });
  40 | });
  41 | 
```