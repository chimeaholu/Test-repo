import { expect, test } from "@playwright/test";

import {
  completeMagicLinkEntry,
  completePasswordEntry,
  detectFlowCapability,
  expectAnonymousApiRejection,
  expectAnonymousProtectedRouteRedirect,
  gateActors,
  magicLinkFixtureReason,
  passwordFixtureReason,
} from "./eh0-auth-harness";
import { gotoPath } from "./helpers";

test.describe("EH0 auth and consent", () => {
  for (const actor of gateActors) {
    test(`password sign-in reaches protected workspace for ${actor.role} in ${actor.countryName}`, async ({
      page,
      request,
    }) => {
      const capability = await detectFlowCapability(page, "password");
      const fixtureReason = passwordFixtureReason(actor);
      test.skip(
        !capability.supported || Boolean(fixtureReason),
        capability.reason ?? fixtureReason ?? "pending-backend",
      );

      await completePasswordEntry(page, request, actor);
      await expect(page.getByRole("main").first()).toBeVisible();
    });
  }

  for (const actor of gateActors) {
    test(`magic-link sign-in reaches protected workspace for ${actor.role} in ${actor.countryName}`, async ({
      page,
      request,
    }) => {
      const capability = await detectFlowCapability(page, "magic-link");
      const fixtureReason = magicLinkFixtureReason(actor);
      test.skip(
        !capability.supported || Boolean(fixtureReason),
        capability.reason ?? fixtureReason ?? "pending-backend",
      );

      await completeMagicLinkEntry(page, request, actor);
      await expect(page.getByRole("main").first()).toBeVisible();
    });
  }

  test("protected routes reject anonymous entry without any seeded session state", async ({
    page,
    request,
  }) => {
    await expectAnonymousProtectedRouteRedirect(page, "/app/market/listings");
    await expectAnonymousApiRejection(request);
  });

  test("role mismatches redirect back to the signed-in role instead of broadening access", async ({
    page,
    request,
  }) => {
    const buyer = gateActors.find(
      (actor) => actor.role === "buyer" && actor.countryCode === "NG",
    );
    const transporter = gateActors.find(
      (actor) => actor.role === "transporter" && actor.countryCode === "GH",
    );
    if (!buyer || !transporter) {
      throw new Error("Missing gate actors for role-boundary coverage");
    }

    const capability = await detectFlowCapability(page, "password");
    const buyerReason = passwordFixtureReason(buyer);
    const transporterReason = passwordFixtureReason(transporter);
    test.skip(
      !capability.supported || Boolean(buyerReason) || Boolean(transporterReason),
      capability.reason ?? buyerReason ?? transporterReason ?? "pending-backend",
    );

    await completePasswordEntry(page, request, buyer);

    await gotoPath(page, "/app/farmer");
    await expect(page).toHaveURL(/\/app\/buyer$/);

    await gotoPath(page, "/app/market/my-listings");
    await expect(
      page.getByText(
        "This view is for sellers managing active lots. Buyers stay in the marketplace and negotiation flow.",
      ),
    ).toBeVisible();

    await gotoPath(page, "/signin");
    await completePasswordEntry(page, request, transporter);

    await gotoPath(page, "/app/buyer");
    await expect(page).toHaveURL(/\/app\/transporter$/);
  });

  test("sign-in page keeps production auth and preview access explicitly separate", async ({
    page,
  }) => {
    await gotoPath(page, "/signin");
    await expect(
      page.getByRole("heading", { name: "Sign in to your Agrodomain account" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "View guided preview" }),
    ).toBeVisible();
  });
});
