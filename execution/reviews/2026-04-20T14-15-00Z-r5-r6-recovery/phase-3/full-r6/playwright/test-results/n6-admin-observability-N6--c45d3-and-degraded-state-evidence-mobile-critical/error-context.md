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
  - main [ref=e3]:
    - generic [ref=e4]:
      - paragraph [ref=e5]: Loading workspace
      - heading "Restoring route and contract state." [level=1] [ref=e6]
      - paragraph [ref=e7]: The workspace waits for local identity and queue state so offline recovery stays deterministic.
  - button "Open Next.js Dev Tools" [ref=e13] [cursor=pointer]:
    - img [ref=e14]
  - alert [ref=e17]
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