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
  - alert [ref=e3]: Sign in to the right workspace without skipping access controls.
  - main [ref=e4]:
    - generic [ref=e5]:
      - article [ref=e6]:
        - generic [ref=e7]:
          - generic [ref=e8]: Identity check
          - generic [ref=e9]: Consent required next
        - heading "Sign in to the right workspace without skipping access controls." [level=1] [ref=e10]
        - paragraph [ref=e11]: Enter your name, work email, role, and operating country. Agrodomain routes you to the correct workspace, then asks for consent before any protected work begins.
        - generic [ref=e12]:
          - complementary [ref=e13]:
            - strong [ref=e14]: Field-first rule
            - paragraph [ref=e15]: Use the same identity details your team already uses so handoffs, recovery, and audit history remain clear.
          - complementary [ref=e16]:
            - strong [ref=e17]: Risk rule
            - paragraph [ref=e18]: Signing in identifies you. It does not authorize regulated actions until consent is granted.
        - generic "What happens next" [ref=e19]:
          - article [ref=e20]:
            - generic [ref=e21]: Step 1
            - strong [ref=e22]: Identity is recorded
            - paragraph [ref=e23]: Your role, email, and operating country are attached to the active session.
          - article [ref=e24]:
            - generic [ref=e25]: Step 2
            - strong [ref=e26]: Consent stays separate
            - paragraph [ref=e27]: The next route explains what is captured and what remains blocked.
          - article [ref=e28]:
            - generic [ref=e29]: Step 3
            - strong [ref=e30]: Routing happens after review
            - paragraph [ref=e31]: The workspace opens only after policy capture is complete.
      - article [ref=e32]:
        - generic [ref=e34]:
          - paragraph [ref=e35]: Identity entry
          - heading "Enter your work details" [level=2] [ref=e36]
          - paragraph [ref=e37]: Choose the role and country that match the work you need to resume today.
        - generic [ref=e38]:
          - paragraph [ref=e39]: Use the identity details attached to the work you need to resume. You can review consent before any protected action is enabled.
          - generic [ref=e40]:
            - generic [ref=e41]: Full name
            - textbox "Full name" [ref=e42]:
              - /placeholder: Ama Mensah
            - paragraph [ref=e43]: Use the name your cooperative, buyer group, or field team expects.
          - generic [ref=e44]:
            - generic [ref=e45]: Email
            - textbox "Email" [ref=e46]:
              - /placeholder: ama@example.com
            - paragraph [ref=e47]: This is used for account recovery, notifications, and route context.
          - generic [ref=e48]:
            - generic [ref=e49]: Role
            - combobox "Role" [ref=e50]:
              - option "Farmer" [selected]
              - option "Buyer"
              - option "Cooperative"
              - option "Advisor"
              - option "Finance"
              - option "Admin"
            - paragraph [ref=e51]: Choose the workspace you need today. This determines the protected route you reach after consent.
          - generic [ref=e52]:
            - generic [ref=e53]: Country pack
            - combobox "Country pack" [ref=e54]:
              - option "Ghana" [selected]
              - option "Nigeria"
              - option "Jamaica"
            - paragraph [ref=e55]: Country scope affects policy text, route framing, and operational context.
          - generic [ref=e56]:
            - button "Continue to onboarding" [ref=e57] [cursor=pointer]
            - paragraph [ref=e58]: No protected work is unlocked on this route.
        - generic "Route guarantees" [ref=e59]:
          - article [ref=e60]:
            - heading "Visible next step" [level=3] [ref=e61]
            - paragraph [ref=e62]: The route does not skip directly into a workspace. Consent review is always shown next.
          - article [ref=e63]:
            - heading "Clear accountability" [level=3] [ref=e64]
            - paragraph [ref=e65]: Your session identity is what later connects recovery events, approvals, and audit trails.
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
  38 |     await expect(page.getByText("Country scope")).toBeVisible();
  39 |     await expect(page.getByText("Actor attribution")).toBeVisible();
  40 |     await expect(page.getByText("Audit history")).toBeVisible();
  41 |   });
  42 | });
  43 | 
```