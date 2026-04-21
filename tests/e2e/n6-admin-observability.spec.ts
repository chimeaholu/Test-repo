import { expect, test } from "@playwright/test";

import { gotoPath, signInAndGrantConsent } from "./helpers";

test.describe("N6 admin observability and rollout tranche diagnostics", () => {
  test("PF-001 PF-004 admin analytics route exposes live health and degraded-state evidence", async ({
    page,
  }) => {
    const runId = `${Date.now()}`;
    await signInAndGrantConsent(page, {
      displayName: "N6 Admin QA",
      email: `admin.n6.${runId}@example.com`,
      role: "admin",
      countryCode: "GH",
    });

    await gotoPath(page, "/app/admin/analytics");
    await expect(page).toHaveURL(/\/app\/admin\/analytics(\?.*)?$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Service health" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Stale telemetry|Degraded telemetry|Alert summary/i)).toBeVisible();
    await expect(page.getByText("Admin analytics route")).not.toBeVisible();
  });

  test("EP-005 DI-003 admin workspace shows rollout controls with scope chips and audit posture", async ({
    page,
  }) => {
    const runId = `${Date.now()}`;
    await signInAndGrantConsent(page, {
      displayName: "N6 Admin QA",
      email: `admin.rollout.n6.${runId}@example.com`,
      role: "admin",
      countryCode: "GH",
    });

    await gotoPath(page, "/app/admin");
    await expect(page).toHaveURL(/\/app\/admin(\?.*)?$/, { timeout: 20_000 });
    await expect(page.getByRole("button", { name: /Freeze rollout/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Country scope")).toBeVisible();
    await expect(page.getByText("Actor attribution")).toBeVisible();
    await expect(page.getByText("Audit history")).toBeVisible();
  });
});
