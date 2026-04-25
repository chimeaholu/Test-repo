import { expect, test } from "@playwright/test";

async function reseed(request: any) {
  const response = await request.post("/api/e2e/seed?profile=e2e-critical");
  expect(response.ok()).toBeTruthy();
}

async function login(page: any, role: string) {
  await page.goto(`/signin?role=${role}`);
  await page.getByRole("button", { name: /continue with staging profile/i }).click();
  await expect(page.getByTestId("app-shell")).toBeVisible();
}

async function assertCheck(request: any, checkName: string) {
  const response = await request.get(`/api/e2e/state/checks/${checkName}`);
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(payload.passed, JSON.stringify(payload, null, 2)).toBeTruthy();
}

test("auth onboarding consent persists", async ({ page, request }) => {
  await reseed(request);
  await login(page, "farmer");
  await page.goto("/app/onboarding/consent");
  await page.getByRole("button", { name: /accept consent/i }).click();
  await assertCheck(request, "auth-onboarding");
});

test("listing publish, negotiation approval, and escrow release persist", async ({
  page,
  request,
}) => {
  await reseed(request);
  await login(page, "farmer");

  await page.goto("/app/listings/new");
  await page.getByRole("button", { name: /publish seeded draft listing/i }).click();
  await assertCheck(request, "listing-publish");

  await page.goto("/app/negotiation");
  await page.getByRole("button", { name: /approve negotiation/i }).click();
  await assertCheck(request, "negotiation-approval");

  await page.goto("/app/wallet");
  await page.getByRole("button", { name: /fund escrow/i }).click();
  await page.getByRole("button", { name: /release escrow/i }).click();
  await assertCheck(request, "escrow-release");
});

test("advisory, climate, finance, traceability, and admin checks persist", async ({
  page,
  request,
}) => {
  await reseed(request);
  await login(page, "farmer");

  await page.goto("/app/advisory/new");
  await page.getByRole("button", { name: /attach vetted citations/i }).click();
  await assertCheck(request, "advisory-citations");

  await page.goto("/app/climate/alerts");
  await page.getByRole("button", { name: /acknowledge alert/i }).click();
  await assertCheck(request, "climate-ack");

  await login(page, "finance");
  await page.goto("/app/finance/queue");
  await page.getByRole("button", { name: /approve finance case/i }).click();
  await assertCheck(request, "finance-hitl");

  await login(page, "admin");
  await page.goto("/app/traceability");
  await page.getByRole("button", { name: /append dispatch event/i }).click();
  await assertCheck(request, "traceability-dispatch");

  await page.goto("/app/admin/analytics");
  await expect(page.getByText(/observability/i)).toBeVisible();
  await assertCheck(request, "admin-analytics");
});
