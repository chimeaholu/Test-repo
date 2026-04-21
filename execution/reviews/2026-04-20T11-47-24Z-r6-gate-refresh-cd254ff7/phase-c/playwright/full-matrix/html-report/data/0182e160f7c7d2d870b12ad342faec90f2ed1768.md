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
  - alert [ref=e3]
  - generic [ref=e4]:
    - link "Skip to content" [ref=e5] [cursor=pointer]:
      - /url: "#main-content"
    - main [ref=e6]:
      - generic [ref=e7]:
        - generic [ref=e8]:
          - generic [ref=e9]:
            - generic [ref=e10]: Admin
            - generic [ref=e11]: GH
          - paragraph [ref=e12]: N6 Admin QA
          - heading "Ghana Growers Network" [level=1] [ref=e13]
          - paragraph [ref=e14]: admin.rollout.n6.1776686215951@example.com · Admin · GH
          - paragraph [ref=e15]: This protected shell keeps role routing, queue state, and consent posture persistent while you move between operational routes.
        - generic [ref=e16]:
          - generic [ref=e17]: Trace trace--app-admin-49vwdy
          - button "Sign out" [ref=e18] [cursor=pointer]
      - region "Sync status" [ref=e19]:
        - generic [ref=e20]:
          - generic [ref=e21]:
            - generic [ref=e22]: Low connectivity
            - generic [ref=e23]: Handoff ussd
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e24]
          - paragraph [ref=e25]: "Pending items: 1. Conflicts: 0. Trace ID: trace--app-admin-49vwdy."
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
                - heading "Admin operations" [level=2] [ref=e37]
                - paragraph [ref=e38]: The shell routes to the correct role surface while keeping consent, queue, and offline state visible.
              - navigation "Primary" [ref=e39]:
                - generic [ref=e40]:
                  - link "Home" [ref=e41] [cursor=pointer]:
                    - /url: /app/admin
                    - generic [ref=e42]: Home
                  - link "Analytics" [ref=e43] [cursor=pointer]:
                    - /url: /app/admin/analytics
                    - generic [ref=e44]: Analytics
                  - link "Market" [ref=e45] [cursor=pointer]:
                    - /url: /app/market/listings
                    - generic [ref=e46]: Market
                  - link "Inbox 1" [ref=e47] [cursor=pointer]:
                    - /url: /app/market/negotiations
                    - generic [ref=e48]: Inbox
                    - generic [ref=e49]: "1"
                  - link "Alerts" [ref=e50] [cursor=pointer]:
                    - /url: /app/climate/alerts
                    - generic [ref=e51]: Alerts
                  - link "Profile 2" [ref=e52] [cursor=pointer]:
                    - /url: /app/profile
                    - generic [ref=e53]: Profile
                    - generic [ref=e54]: "2"
            - list [ref=e55]:
              - listitem [ref=e56]:
                - generic [ref=e57]: Home route
                - strong [ref=e58]: /app/admin
              - listitem [ref=e59]:
                - generic [ref=e60]: Field posture
                - strong [ref=e61]: Control checks
              - listitem [ref=e62]:
                - generic [ref=e63]: Proof posture
                - strong [ref=e64]: Readiness proof
            - complementary [ref=e65]:
              - strong [ref=e66]: Design note
              - paragraph [ref=e67]: State naming, queue risk, and route readiness remain explicit to support release gates.
        - generic [ref=e69]:
          - generic [ref=e71]:
            - generic [ref=e72]:
              - paragraph [ref=e73]: Admin analytics
              - heading "Platform health and release posture" [level=2] [ref=e74]
              - paragraph [ref=e75]: Service health, release readiness, rollout posture, and recent operator activity stay visible in one admin view.
            - generic [ref=e77]:
              - generic [ref=e78]: Loading
              - generic [ref=e79]: Readiness loading
          - generic [ref=e80]:
            - generic [ref=e81]:
              - generic [ref=e83]:
                - paragraph [ref=e84]: Alert summary
                - heading "Operational alerts" [level=2] [ref=e85]
                - paragraph [ref=e86]: This panel stays explicit when telemetry is stale, degraded, or blocking release progress.
              - paragraph [ref=e88]: There are no active platform alerts right now.
            - generic [ref=e89]:
              - generic [ref=e91]:
                - paragraph [ref=e92]: Release readiness
                - heading "Readiness, ownership, and rollout controls" [level=2] [ref=e93]
                - paragraph [ref=e94]: Rollout actions remain actor-attributed and country-scoped before a release is promoted.
              - list [ref=e95]:
                - listitem [ref=e96]:
                  - generic [ref=e97]: Readiness
                  - strong [ref=e98]: Unknown
                - listitem [ref=e99]:
                  - generic [ref=e100]: Telemetry freshness
                  - strong [ref=e101]: Unknown
                - listitem [ref=e102]:
                  - generic [ref=e103]: Country scope
                  - strong [ref=e104]: GH
                - listitem [ref=e105]:
                  - generic [ref=e106]: Actor attribution
                  - strong [ref=e107]: actor-admin-gh-admin-rollout-n6-1776686
              - generic [ref=e108]:
                - button "Freeze rollout" [ref=e109] [cursor=pointer]
                - button "Canary release" [ref=e110] [cursor=pointer]
                - button "Promote" [ref=e111] [cursor=pointer]
                - button "Rollback" [ref=e112] [cursor=pointer]
          - generic [ref=e113]:
            - generic [ref=e115]:
              - paragraph [ref=e116]: Rollout controls
              - heading "Current rollout states" [level=2] [ref=e117]
              - paragraph [ref=e118]: Scope, state, and last change timestamp stay visible for operator review.
            - paragraph [ref=e120]: No rollout states have been written yet.
          - generic [ref=e123]:
            - paragraph [ref=e124]: Audit history
            - heading "Recent operator events" [level=2] [ref=e125]
            - paragraph [ref=e126]: Recent admin events remain attached to request IDs for release and incident review.
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