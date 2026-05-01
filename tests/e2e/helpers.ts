import { expect, type APIRequestContext, type Page } from "@playwright/test";

export type Role =
  | "farmer"
  | "buyer"
  | "cooperative"
  | "transporter"
  | "investor"
  | "extension_agent"
  | "advisor"
  | "finance"
  | "admin";
const SESSION_KEY = "agrodomain.session.v2";
const TOKEN_KEY = "agrodomain.session-token.v1";
const CONSENT_ROUTE = /\/onboarding\/consent(\?.*)?$/;
const E2E_ORIGIN =
  process.env.PLAYWRIGHT_BASE_URL ??
  `http://127.0.0.1:${process.env.PLAYWRIGHT_WEB_PORT ?? "3000"}`;
const API_BASE_URL =
  process.env.AGRO_E2E_API_BASE_URL ??
  `http://127.0.0.1:${process.env.AGRO_E2E_API_PORT ?? "8000"}`;

const roleHomeRoute: Record<Role, string> = {
  farmer: "/app/farmer",
  buyer: "/app/buyer",
  cooperative: "/app/cooperative",
  transporter: "/app/transporter",
  investor: "/app/investor",
  extension_agent: "/app/extension_agent",
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
    case "transporter":
      return "Transporter";
    case "investor":
      return "Investor";
    case "extension_agent":
      return "Extension Agent";
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
  const legacyRoleTilesVisible =
    (await page.locator("label.pub-role-tile").count()) > 0;
  if (!legacyRoleTilesVisible) {
    throw new Error(
      "pending-backend: /signin no longer supports arbitrary role bootstrap; use real password or magic-link fixtures instead",
    );
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
  const grantButton = page.getByRole("button", {
    name: /Accept and continue|Grant consent/i,
  });
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

export type SessionSeed = {
  accessToken: string;
  session: {
    actor: {
      actor_id: string;
      country_code: string;
      display_name: string;
      email: string;
      membership?: {
        organization_name: string;
      };
      role: string;
    };
    consent?: {
      state?: string;
    };
  };
};

type BootstrapMode = "login_only" | "register_or_login";

type BootstrapSessionInput = {
  countryCode?: "GH" | "NG" | "JM";
  displayName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  role: Role;
  scopeIds?: string[];
  mode?: BootstrapMode;
};

function buildPhoneNumber(countryCode: "GH" | "NG" | "JM", seed: string): string {
  const digits = seed.replace(/\D/g, "").slice(-7).padStart(7, "0");
  if (countryCode === "NG") {
    return `+23480${digits}`;
  }
  if (countryCode === "JM") {
    return `+1876555${digits.slice(-4)}`;
  }
  return `+23324${digits}`;
}

async function grantConsentByToken(
  request: APIRequestContext,
  accessToken: string,
  scopeIds: string[],
): Promise<SessionSeed["session"]> {
  const response = await request.post(`${API_BASE_URL}/api/v1/identity/consent`, {
    data: {
      captured_at: new Date().toISOString(),
      policy_version: "2026.04.eh7",
      scope_ids: scopeIds,
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  expect(response.ok(), `consent grant failed: ${await response.text()}`).toBeTruthy();
  return (await response.json()) as SessionSeed["session"];
}

async function loginWithPassword(
  request: APIRequestContext,
  input: BootstrapSessionInput,
): Promise<SessionSeed> {
  const response = await request.post(`${API_BASE_URL}/api/v1/identity/login/password`, {
    data: {
      identifier: input.email,
      password: input.password,
      country_code: input.countryCode ?? "GH",
      role: input.role,
    },
  });
  expect(response.ok(), `password login failed: ${await response.text()}`).toBeTruthy();
  const payload = (await response.json()) as {
    access_token: string;
    session: SessionSeed["session"];
  };
  return {
    accessToken: payload.access_token,
    session: payload.session,
  };
}

export async function bootstrapPasswordSession(
  request: APIRequestContext,
  input: BootstrapSessionInput,
): Promise<SessionSeed> {
  const countryCode = input.countryCode ?? "GH";
  let seed: SessionSeed;

  if ((input.mode ?? "register_or_login") === "login_only") {
    seed = await loginWithPassword(request, input);
  } else {
    const response = await request.post(`${API_BASE_URL}/api/v1/identity/register/password`, {
      data: {
        display_name: input.displayName,
        email: input.email,
        phone_number:
          input.phoneNumber ?? buildPhoneNumber(countryCode, `${Date.now()}${Math.random()}`),
        password: input.password,
        role: input.role,
        country_code: countryCode,
      },
    });

    if (response.ok()) {
      const payload = (await response.json()) as {
        access_token: string;
        session: SessionSeed["session"];
      };
      seed = {
        accessToken: payload.access_token,
        session: payload.session,
      };
    } else if (response.status() === 409) {
      seed = await loginWithPassword(request, input);
    } else {
      expect(
        response.ok(),
        `password registration failed: ${response.status()} ${await response.text()}`,
      ).toBeTruthy();
      throw new Error("unreachable");
    }
  }

  if (seed.session.consent?.state === "consent_granted") {
    return seed;
  }

  return {
    accessToken: seed.accessToken,
    session: await grantConsentByToken(
      request,
      seed.accessToken,
      input.scopeIds ?? ["identity.core", "workflow.audit", "notifications.delivery"],
    ),
  };
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
  const formLocator =
    route === "/signin"
      ? page.locator("main form").first()
      : page.locator("form.onboarding-consent-form");
  await expect(formLocator).toBeVisible({ timeout: 20_000 });
}
