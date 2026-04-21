# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: n6-admin-observability.spec.ts >> N6 admin observability and rollout tranche diagnostics >> PF-001 PF-004 admin analytics route exposes live health and degraded-state evidence
- Location: tests/e2e/n6-admin-observability.spec.ts:6:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Service health' })
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for getByRole('heading', { name: 'Service health' })

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
          - paragraph [ref=e23]: admin.n6.1776562227824@example.com · Admin · GH
        - generic [ref=e24]:
          - generic [ref=e25]: Trace trace--admin-analytics-c64s0g
          - button "Sign out" [ref=e26] [cursor=pointer]
      - region "Sync status" [ref=e27]:
        - generic [ref=e28]:
          - generic [ref=e29]:
            - generic [ref=e30]: Low connectivity
            - generic [ref=e31]: Handoff ussd
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e32]
          - paragraph [ref=e33]: "Pending items: 1. Conflicts: 0. Trace ID: trace--admin-analytics-c64s0g."
        - generic [ref=e34]:
          - button "Force online" [ref=e35] [cursor=pointer]
          - button "Simulate degraded" [ref=e36] [cursor=pointer]
          - button "Simulate offline" [ref=e37] [cursor=pointer]
      - generic [ref=e38]:
        - complementary [ref=e39]:
          - generic [ref=e40]:
            - generic [ref=e41]:
              - generic [ref=e43]:
                - paragraph [ref=e44]: Role-aware workspace
                - heading "Admin operations" [level=2] [ref=e45]
                - paragraph [ref=e46]: The shell routes to the correct role surface while keeping consent, queue, and offline state visible.
              - navigation "Primary" [ref=e47]:
                - generic [ref=e48]:
                  - link "Home" [ref=e49] [cursor=pointer]:
                    - /url: /app/admin
                    - generic [ref=e50]: Home
                  - link "Analytics" [ref=e51] [cursor=pointer]:
                    - /url: /app/admin/analytics
                    - generic [ref=e52]: Analytics
                  - link "Market" [ref=e53] [cursor=pointer]:
                    - /url: /app/market/listings
                    - generic [ref=e54]: Market
                  - link "Inbox 1" [ref=e55] [cursor=pointer]:
                    - /url: /app/market/negotiations
                    - generic [ref=e56]: Inbox
                    - generic [ref=e57]: "1"
                  - link "Alerts" [ref=e58] [cursor=pointer]:
                    - /url: /app/climate/alerts
                    - generic [ref=e59]: Alerts
                  - link "Profile 2" [ref=e60] [cursor=pointer]:
                    - /url: /app/profile
                    - generic [ref=e61]: Profile
                    - generic [ref=e62]: "2"
            - list [ref=e63]:
              - listitem [ref=e64]:
                - generic [ref=e65]: Home route
                - strong [ref=e66]: /app/admin
              - listitem [ref=e67]:
                - generic [ref=e68]: Field posture
                - strong [ref=e69]: Control checks
              - listitem [ref=e70]:
                - generic [ref=e71]: Proof posture
                - strong [ref=e72]: Readiness proof
            - complementary [ref=e73]:
              - strong [ref=e74]: Design note
              - paragraph [ref=e75]: State naming, queue risk, and route readiness remain explicit to support release gates.
        - generic [ref=e79]:
          - paragraph [ref=e80]: Admin
          - heading "Admin analytics route" [level=2] [ref=e81]
          - paragraph [ref=e82]: Shell boot traces, onboarding funnel events, and queue telemetry now give the analytics lane stable observability seams.
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
> 19 |     await expect(page.getByRole("heading", { name: "Service health" })).toBeVisible({ timeout: 20_000 });
     |                                                                         ^ Error: expect(locator).toBeVisible() failed
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
  38 |     await expect(page.getByText(/Actor attribution|Audit history|Country scope/i)).toBeVisible();
  39 |   });
  40 | });
  41 | 
```