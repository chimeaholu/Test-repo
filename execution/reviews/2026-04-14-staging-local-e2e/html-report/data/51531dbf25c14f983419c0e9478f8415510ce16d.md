# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: critical-journeys.spec.ts >> auth onboarding consent persists
- Location: tests/e2e/critical-journeys.spec.ts:21:5

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - strong [ref=e4]: Consent
    - generic [ref=e5]: Signed in as farmer-001 (farmer)
    - navigation [ref=e6]:
      - link "Consent" [ref=e7] [cursor=pointer]:
        - /url: /app/onboarding/consent
      - link "Listings" [ref=e8] [cursor=pointer]:
        - /url: /app/listings/new
      - link "Negotiation" [ref=e9] [cursor=pointer]:
        - /url: /app/negotiation
      - link "Wallet" [ref=e10] [cursor=pointer]:
        - /url: /app/wallet
      - link "Advisory" [ref=e11] [cursor=pointer]:
        - /url: /app/advisory/new
      - link "Climate" [ref=e12] [cursor=pointer]:
        - /url: /app/climate/alerts
      - link "Finance" [ref=e13] [cursor=pointer]:
        - /url: /app/finance/queue
      - link "Traceability" [ref=e14] [cursor=pointer]:
        - /url: /app/traceability
      - link "Admin" [ref=e15] [cursor=pointer]:
        - /url: /app/admin/analytics
  - main [ref=e16]:
    - generic [ref=e17]:
      - heading "Consent" [level=1] [ref=e18]
      - paragraph [ref=e19]:
        - text: "Accepted:"
        - strong [ref=e20]: "True"
      - button "Accept consent" [ref=e22] [cursor=pointer]
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | async function reseed(request: any) {
  4  |   const response = await request.post("/api/e2e/seed?profile=e2e-critical");
  5  |   expect(response.ok()).toBeTruthy();
  6  | }
  7  | 
  8  | async function login(page: any, role: string) {
  9  |   await page.goto(`/signin?role=${role}`);
  10 |   await page.getByRole("button", { name: /continue with staging profile/i }).click();
  11 |   await expect(page.getByTestId("app-shell")).toBeVisible();
  12 | }
  13 | 
  14 | async function assertCheck(request: any, checkName: string) {
  15 |   const response = await request.get(`/api/e2e/state/checks/${checkName}`);
> 16 |   expect(response.ok()).toBeTruthy();
     |                         ^ Error: expect(received).toBeTruthy()
  17 |   const payload = await response.json();
  18 |   expect(payload.passed, JSON.stringify(payload, null, 2)).toBeTruthy();
  19 | }
  20 | 
  21 | test("auth onboarding consent persists", async ({ page, request }) => {
  22 |   await reseed(request);
  23 |   await login(page, "farmer");
  24 |   await page.goto("/app/onboarding/consent");
  25 |   await page.getByRole("button", { name: /accept consent/i }).click();
  26 |   await assertCheck(request, "auth-onboarding");
  27 | });
  28 | 
  29 | test("listing publish, negotiation approval, and escrow release persist", async ({
  30 |   page,
  31 |   request,
  32 | }) => {
  33 |   await reseed(request);
  34 |   await login(page, "farmer");
  35 | 
  36 |   await page.goto("/app/listings/new");
  37 |   await page.getByRole("button", { name: /publish seeded draft listing/i }).click();
  38 |   await assertCheck(request, "listing-publish");
  39 | 
  40 |   await page.goto("/app/negotiation");
  41 |   await page.getByRole("button", { name: /approve negotiation/i }).click();
  42 |   await assertCheck(request, "negotiation-approval");
  43 | 
  44 |   await page.goto("/app/wallet");
  45 |   await page.getByRole("button", { name: /fund escrow/i }).click();
  46 |   await page.getByRole("button", { name: /release escrow/i }).click();
  47 |   await assertCheck(request, "escrow-release");
  48 | });
  49 | 
  50 | test("advisory, climate, finance, traceability, and admin checks persist", async ({
  51 |   page,
  52 |   request,
  53 | }) => {
  54 |   await reseed(request);
  55 |   await login(page, "farmer");
  56 | 
  57 |   await page.goto("/app/advisory/new");
  58 |   await page.getByRole("button", { name: /attach vetted citations/i }).click();
  59 |   await assertCheck(request, "advisory-citations");
  60 | 
  61 |   await page.goto("/app/climate/alerts");
  62 |   await page.getByRole("button", { name: /acknowledge alert/i }).click();
  63 |   await assertCheck(request, "climate-ack");
  64 | 
  65 |   await login(page, "finance");
  66 |   await page.goto("/app/finance/queue");
  67 |   await page.getByRole("button", { name: /approve finance case/i }).click();
  68 |   await assertCheck(request, "finance-hitl");
  69 | 
  70 |   await login(page, "admin");
  71 |   await page.goto("/app/traceability");
  72 |   await page.getByRole("button", { name: /append dispatch event/i }).click();
  73 |   await assertCheck(request, "traceability-dispatch");
  74 | 
  75 |   await page.goto("/app/admin/analytics");
  76 |   await expect(page.getByText(/observability/i)).toBeVisible();
  77 |   await assertCheck(request, "admin-analytics");
  78 | });
  79 | 
```