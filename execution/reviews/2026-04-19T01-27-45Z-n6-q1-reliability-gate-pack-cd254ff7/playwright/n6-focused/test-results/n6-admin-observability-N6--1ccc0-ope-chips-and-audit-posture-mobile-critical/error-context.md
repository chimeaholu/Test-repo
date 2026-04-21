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

Locator: getByRole('button', { name: /Freeze rollout/i })
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for getByRole('button', { name: /Freeze rollout/i })

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
          - paragraph [ref=e23]: admin.rollout.n6.1776562316946@example.com · Admin · GH
        - generic [ref=e24]:
          - generic [ref=e25]: Trace trace--app-admin-nva1fe
          - button "Sign out" [ref=e26] [cursor=pointer]
      - region "Sync status" [ref=e27]:
        - generic [ref=e28]:
          - generic [ref=e29]:
            - generic [ref=e30]: Low connectivity
            - generic [ref=e31]: Handoff ussd
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e32]
          - paragraph [ref=e33]: "Pending items: 1. Conflicts: 0. Trace ID: trace--app-admin-nva1fe."
        - generic [ref=e34]:
          - button "Force online" [ref=e35] [cursor=pointer]
          - button "Simulate degraded" [ref=e36] [cursor=pointer]
          - button "Simulate offline" [ref=e37] [cursor=pointer]
      - generic [ref=e39]:
        - generic [ref=e40]:
          - generic [ref=e41]:
            - generic [ref=e42]:
              - paragraph [ref=e43]: Control flow
              - heading "See platform posture quickly, then move into analytics only after active risks are framed." [level=2] [ref=e44]
              - paragraph [ref=e45]: The admin surface starts with platform health and launch posture rather than defaulting to chart-heavy clutter.
            - generic [ref=e46]:
              - link "Open analytics" [ref=e47] [cursor=pointer]:
                - /url: /app/admin/analytics
              - link "Open outbox" [ref=e48] [cursor=pointer]:
                - /url: /app/offline/outbox
          - generic [ref=e49]:
            - generic [ref=e50]:
              - generic [ref=e51]:
                - generic [ref=e52]: Consent live
                - generic [ref=e53]: Low signal
                - generic [ref=e54]: Protected path open
              - paragraph [ref=e55]: State naming, queue risk, and route readiness remain explicit to support release gates.
              - list [ref=e56]:
                - listitem [ref=e57]:
                  - generic [ref=e58]: Control checks
                  - strong [ref=e59]: 1 active
                - listitem [ref=e60]:
                  - generic [ref=e61]: Conflicts
                  - strong [ref=e62]: "0"
                - listitem [ref=e63]:
                  - generic [ref=e64]: Policy version
                  - strong [ref=e65]: 2026.04.w1
                - listitem [ref=e66]:
                  - generic [ref=e67]: Last capture
                  - strong [ref=e68]: 2026-04-19T01:31:59.672000
            - generic [ref=e69]:
              - complementary [ref=e70]:
                - strong [ref=e71]: Field mode
                - paragraph [ref=e72]: Mobile access trims to core state so admins can validate health from anywhere.
              - complementary [ref=e73]:
                - strong [ref=e74]: Desktop mode
                - paragraph [ref=e75]: Larger screens can hold telemetry, route posture, and readiness context together.
              - complementary [ref=e76]:
                - strong [ref=e77]: Readiness proof
                - paragraph [ref=e78]: "Protected action reason code: ok. Trace trace--app-admin-nva1fe."
        - generic [ref=e79]:
          - generic [ref=e80]:
            - generic [ref=e82]:
              - paragraph [ref=e83]: Queue first
              - heading "Next actions" [level=2] [ref=e84]
              - paragraph [ref=e85]: Every role lands on work that can be resumed immediately instead of a generic dashboard.
            - generic [ref=e86]:
              - link "Platform health Review shell, onboarding, and queue signals before deeper feature rollout." [ref=e87] [cursor=pointer]:
                - /url: /app/admin/analytics
                - strong [ref=e88]: Platform health
                - paragraph [ref=e89]: Review shell, onboarding, and queue signals before deeper feature rollout.
              - link "Outbox risk Audit replay conflicts and handoff advice before support load increases." [ref=e90] [cursor=pointer]:
                - /url: /app/offline/outbox
                - strong [ref=e91]: Outbox risk
                - paragraph [ref=e92]: Audit replay conflicts and handoff advice before support load increases.
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
          - /url: /app/admin
          - generic [ref=e112]: Home
        - link "Analytics" [ref=e113] [cursor=pointer]:
          - /url: /app/admin/analytics
          - generic [ref=e114]: Analytics
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
> 37 |     await expect(page.getByRole("button", { name: /Freeze rollout/i })).toBeVisible({ timeout: 20_000 });
     |                                                                         ^ Error: expect(locator).toBeVisible() failed
  38 |     await expect(page.getByText(/Actor attribution|Audit history|Country scope/i)).toBeVisible();
  39 |   });
  40 | });
  41 | 
```