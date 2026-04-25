import { expect, type Page } from "@playwright/test";

type Role = "farmer" | "buyer" | "cooperative" | "advisor" | "finance" | "admin";
const SESSION_KEY = "agrodomain.session.v2";
const TOKEN_KEY = "agrodomain.session-token.v1";
const CONSENT_ROUTE = /\/onboarding\/consent(\?.*)?$/;
const E2E_ORIGIN =
  process.env.PLAYWRIGHT_BASE_URL ??
  `http://127.0.0.1:${process.env.PLAYWRIGHT_WEB_PORT ?? "3000"}`;

const roleHomeRoute: Record<Role, string> = {
  farmer: "/app/farmer",
  buyer: "/app/buyer",
  cooperative: "/app/cooperative",
  advisor: "/app/advisor",
  finance: "/app/finance",
  admin: "/app/admin",
};

function signInRoleLabel(role: Role): string {
  switch (role) {
    case "farmer":
      return "Farmer";
    case "buyer":
      return "Buyer";
    case "cooperative":
      return "Co-op Manager";
    default:
      throw new Error(`Sign-in UI does not currently expose role ${role}.`);
  }
}

export async function signIn(
  page: Page,
  input: {
    displayName: string;
    email: string;
    role: Role;
    countryCode?: "GH" | "NG" | "JM";
  },
): Promise<void> {
  const emailField = page.getByLabel("Email address");
  const alreadyOnSignIn = /\/signin(\?.*)?$/.test(page.url());
  if (!alreadyOnSignIn) {
    await gotoPath(page, "/signin");
  }
  await expect(emailField).toBeVisible();
  await waitForInteractiveForm(page, "/signin");
  const submitButton = page.getByRole("button", { name: "Sign In" });
  let reachedConsent = false;
  for (let attempt = 0; attempt < 4 && !reachedConsent; attempt += 1) {
    await page.locator("label.pub-role-tile").filter({ hasText: signInRoleLabel(input.role) }).click();
    await emailField.fill(input.email);
    await page.getByLabel("Your country").selectOption(input.countryCode ?? "GH");
    await submitButton.click();
    try {
      await expect(page).toHaveURL(CONSENT_ROUTE, { timeout: 20_000 });
      reachedConsent = true;
    } catch {
      if (!page.url().includes("/signin")) {
        throw new Error(`Unexpected sign-in route after submit: ${page.url()}`);
      }
      await gotoPath(page, "/signin");
      await expect(emailField).toBeVisible();
      await page.waitForTimeout(500);
    }
  }
  if (!reachedConsent) {
    throw new Error("Sign-in did not transition to onboarding consent");
  }
  await page.waitForFunction(
    ([sessionKey, tokenKey]) =>
      Boolean(window.localStorage.getItem(sessionKey)) &&
      Boolean(window.localStorage.getItem(tokenKey)),
    [SESSION_KEY, TOKEN_KEY],
  );
}

export async function grantConsent(page: Page): Promise<void> {
  await waitForInteractiveForm(page, "/onboarding/consent");
  const acceptedCheckbox = page.locator("input[name='accepted']");
  await acceptedCheckbox.check();
  await expect(acceptedCheckbox).toBeChecked();
  const grantButton = page.getByRole("button", { name: "Grant consent" });
  let reachedWorkspace = false;
  for (let attempt = 0; attempt < 2 && !reachedWorkspace; attempt += 1) {
    await grantButton.click();
    try {
      await expect(page).toHaveURL(/\/app\/.+$/, { timeout: 30_000 });
      reachedWorkspace = true;
    } catch {
      if (!CONSENT_ROUTE.test(page.url())) {
        throw new Error(`Unexpected route after consent submit: ${page.url()}`);
      }
    }
  }
  if (!reachedWorkspace) {
    const consentCaptured = await page
      .waitForFunction(
        ([sessionKey, tokenKey]) => {
          const raw = window.localStorage.getItem(sessionKey);
          const token = window.localStorage.getItem(tokenKey);
          if (!raw || !token) {
            return false;
          }
          try {
            const session = JSON.parse(raw) as { consent?: { state?: string } };
            return session.consent?.state === "consent_granted";
          } catch {
            return false;
          }
        },
        [SESSION_KEY, TOKEN_KEY],
        { timeout: 30_000 },
      )
      .then(() => true)
      .catch(() => false);
    if (consentCaptured) {
      await restoreWorkspaceFromSession(page);
    }
  }
}

export async function signInAndGrantConsent(
  page: Page,
  input: {
    displayName: string;
    email: string;
    role: Role;
    countryCode?: "GH" | "NG" | "JM";
  },
): Promise<void> {
  await signIn(page, input);
  await grantConsent(page);
  const sessionReady = await page
    .waitForFunction(
      ([sessionKey, tokenKey, role]) => {
        if (!window.localStorage.getItem(tokenKey)) {
          return false;
        }
        const raw = window.localStorage.getItem(sessionKey);
        if (!raw) {
          return false;
        }
        try {
          const session = JSON.parse(raw) as {
            actor?: { role?: string };
          };
          return session.actor?.role === role;
        } catch {
          return false;
        }
      },
      [SESSION_KEY, TOKEN_KEY, input.role],
      { timeout: 30_000 },
    )
    .then(() => true)
    .catch(() => false);
  if (!sessionReady) {
    await restoreWorkspaceFromSession(page);
  }
  await page.waitForFunction(
    ([sessionKey, tokenKey, role]) => {
      if (!window.localStorage.getItem(tokenKey)) {
        return false;
      }
      const raw = window.localStorage.getItem(sessionKey);
      if (!raw) {
        return false;
      }
      try {
        const session = JSON.parse(raw) as {
          actor?: { role?: string };
        };
        return session.actor?.role === role;
      } catch {
        return false;
      }
    },
    [SESSION_KEY, TOKEN_KEY, input.role],
    { timeout: 30_000 },
  );
  await gotoPath(page, roleHomeRoute[input.role]);
  await expect(page).toHaveURL(new RegExp(`${roleHomeRoute[input.role]}$`), {
    timeout: 20_000,
  });
}

export async function createListing(
  page: Page,
  input: {
    title: string;
    commodity: string;
    quantityTons: string;
    priceAmount: string;
    priceCurrency: string;
    location: string;
    summary: string;
  },
): Promise<string> {
  await gotoPath(page, "/app/market/listings/create");
  const listingTitleField = page.locator("#listing-title");
  const wizardVisible = await listingTitleField.isVisible({ timeout: 8_000 }).catch(() => false);
  if (!wizardVisible) {
    await restoreWorkspaceFromSession(page);
    await gotoPath(page, "/app/market/listings/create");
  }
  await expect(page).toHaveURL(/\/app\/market\/listings\/create(\?.*)?$/, { timeout: 20_000 });
  await expect(listingTitleField).toBeVisible({ timeout: 20_000 });
  await listingTitleField.scrollIntoViewIfNeeded();
  await listingTitleField.fill(input.title);
  await page.getByLabel("Commodity").fill(input.commodity);
  const varietyField = page.getByLabel("Variety / grade");
  await expect(varietyField).toBeVisible({ timeout: 10_000 });
  await varietyField.fill("Grade A");
  const descriptionField = page.getByLabel("Description");
  await descriptionField.fill(input.summary);
  await page.getByLabel("Category").fill("Root crop");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByLabel("Price amount")).toBeVisible({ timeout: 10_000 });
  await page.getByLabel("Price amount").fill(input.priceAmount);
  await page.getByLabel("Currency").fill(input.priceCurrency);
  await page.getByLabel("Quantity (tons)").fill(input.quantityTons);
  await page.getByLabel("Minimum order quantity").fill("1");
  await page.getByRole("radio", { name: "Negotiable" }).check();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByLabel("Region / district")).toBeVisible({ timeout: 10_000 });
  await page.getByLabel("Manual location entry").fill(input.location);
  await page.getByRole("radio", { name: "Pickup or delivery" }).check();
  await page.getByRole("button", { name: "Continue" }).click();

  const publishButton = page.getByRole("button", { name: "Publish listing" });
  await expect(publishButton).toBeVisible({ timeout: 10_000 });
  await publishButton.evaluate((element) => {
    element.scrollIntoView({ block: "center", inline: "center" });
  });
  try {
    await publishButton.click();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Timeout")) {
      throw error;
    }
    await publishButton.click({ force: true }).catch(async () => {
      await publishButton.evaluate((element) => {
        (element as HTMLButtonElement).click();
      });
    });
  }

  const confirmation = page.getByText(/Listing published confirmed/);
  await expect(confirmation).toBeVisible({ timeout: 30_000 });
  const evidenceCallout = page.getByText(/Listing .* produced request .* audit events\./);
  await expect(evidenceCallout).toBeVisible({ timeout: 30_000 });
  const confirmationText = (await evidenceCallout.textContent()) ?? "";
  const listingIdMatch = confirmationText.match(/Listing ([A-Za-z0-9-]+) produced request/);
  const listingId = listingIdMatch?.[1];
  if (!listingId) {
    throw new Error(`Expected listing id in publish confirmation: ${confirmationText}`);
  }
  return `/app/market/listings/${listingId}`;
}

async function restoreWorkspaceFromSession(page: Page): Promise<void> {
  const role = await page.evaluate(([sessionKey]) => {
    const raw = window.localStorage.getItem(sessionKey);
    if (!raw) {
      return null;
    }
    try {
      const session = JSON.parse(raw) as { actor?: { role?: string } };
      return session.actor?.role ?? null;
    } catch {
      return null;
    }
  }, [SESSION_KEY]);

  if (!role || !(role in roleHomeRoute)) {
    return;
  }

  const route = roleHomeRoute[role as Role];
  await gotoPath(page, route);
  await expect(page).toHaveURL(new RegExp(`${route}(\\?.*)?$`), { timeout: 20_000 });
}

export function listingIdFromHref(href: string): string {
  const url = new URL(href, E2E_ORIGIN);
  const segments = url.pathname.split("/").filter(Boolean);
  const listingId = segments.at(-1);
  if (!listingId) {
    throw new Error(`Expected listing id in href: ${href}`);
  }
  return listingId;
}

export async function gotoPath(page: Page, path: string): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 120_000 });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        (!message.includes("net::ERR_ABORTED") &&
          !message.includes("NS_BINDING_ABORTED") &&
          !message.includes("page crashed") &&
          !message.includes("net::ERR_INSUFFICIENT_RESOURCES") &&
          !message.includes("interrupted by another navigation")) ||
        attempt === 3
      ) {
        throw error;
      }
      await page.waitForTimeout(500);
    }
  }
}

async function waitForInteractiveForm(page: Page, route: "/signin" | "/onboarding/consent"): Promise<void> {
  await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}(\\?.*)?$`), {
    timeout: 20_000,
  });
  await expect(page.locator("form[data-interactive='true']")).toBeVisible({
    timeout: 20_000,
  });
}
