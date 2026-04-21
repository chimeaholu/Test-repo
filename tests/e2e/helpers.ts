import { expect, type Page } from "@playwright/test";

type Role = "farmer" | "buyer" | "cooperative" | "advisor" | "finance" | "admin";
const SESSION_KEY = "agrodomain.session.v2";
const TOKEN_KEY = "agrodomain.session-token.v1";
const CONSENT_ROUTE = /\/onboarding\/consent(\?.*)?$/;
type SignInIdentity = {
  displayName: string;
  email: string;
  role: Role;
  countryCode?: "GH" | "NG" | "JM";
};
const identityByPage = new WeakMap<Page, SignInIdentity>();

const roleHomeRoute: Record<Role, string> = {
  farmer: "/app/farmer",
  buyer: "/app/buyer",
  cooperative: "/app/cooperative",
  advisor: "/app/advisor",
  finance: "/app/finance",
  admin: "/app/admin",
};

export async function signIn(
  page: Page,
  input: SignInIdentity,
): Promise<void> {
  const signInNameField = page.getByLabel("Full name");
  const alreadyOnSignIn = /\/signin(\?.*)?$/.test(page.url());
  if (!alreadyOnSignIn) {
    await gotoPath(page, "/signin");
  }
  // Avoid stale cross-role state when tests switch identities in the same page.
  await page.evaluate(([sessionKey, tokenKey]) => {
    window.localStorage.removeItem(sessionKey);
    window.localStorage.removeItem(tokenKey);
  }, [SESSION_KEY, TOKEN_KEY]);
  await expect(signInNameField).toBeVisible();
  await waitForInteractiveForm(page, "/signin");
  const submitButton = page.getByRole("button", { name: "Continue to onboarding" });
  let reachedConsent = false;
  for (let attempt = 0; attempt < 4 && !reachedConsent; attempt += 1) {
    await page.getByLabel("Full name").fill(input.displayName);
    await page.getByLabel("Email").fill(input.email);
    await page.getByLabel("Role").selectOption(input.role);
    await page
      .getByLabel("Country pack")
      .selectOption(input.countryCode ?? "GH");
    await submitButton.click();
    try {
      await expect(page).toHaveURL(CONSENT_ROUTE, { timeout: 20_000 });
      reachedConsent = true;
    } catch {
      if (CONSENT_ROUTE.test(page.url())) {
        reachedConsent = true;
        break;
      }
      if (!page.url().includes("/signin")) {
        throw new Error(`Unexpected sign-in route after submit: ${page.url()}`);
      }
      await gotoPath(page, "/signin");
      await expect(page.getByLabel("Full name")).toBeVisible();
      await page.waitForTimeout(500);
    }
  }
  if (!reachedConsent) {
    throw new Error("Sign-in did not transition to onboarding consent");
  }
  identityByPage.set(page, input);
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
  input: SignInIdentity,
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
  identityByPage.set(page, input);
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
  await gotoPath(page, "/app/market/listings");
  const listingTitleField = page.getByLabel("Listing title");
  const listingFormVisible = await listingTitleField.isVisible({ timeout: 8_000 }).catch(() => false);
  if (!listingFormVisible) {
    await restoreWorkspaceFromSession(page);
    await gotoPath(page, "/app/market/listings");
  }
  await expect(listingTitleField).toBeVisible({ timeout: 20_000 });
  await listingTitleField.fill(input.title);
  await page.getByLabel("Commodity").fill(input.commodity);
  await page.getByLabel("Quantity (tons)").fill(input.quantityTons);
  await page.getByLabel("Price amount").fill(input.priceAmount);
  await page.getByLabel("Currency").fill(input.priceCurrency);
  await page.getByLabel("Location").fill(input.location);
  await page.getByLabel("Summary").fill(input.summary);
  const createButton = page.getByRole("button", { name: "Create listing" });
  await createButton.click();

  const listingItem = page.getByRole("listitem").filter({ hasText: input.title }).first();
  await expect(listingItem).toBeVisible({ timeout: 30_000 });
  const detailLink = listingItem.getByRole("link", { name: "View and edit" });
  await expect(detailLink).toBeVisible({ timeout: 30_000 });
  const href = await detailLink.getAttribute("href");
  if (!href) {
    throw new Error("Expected listing detail link href");
  }
  return href;
}

async function restoreWorkspaceFromSession(page: Page): Promise<boolean> {
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
    return false;
  }

  const route = roleHomeRoute[role as Role];
  await gotoPath(page, route);
  await expect(page).toHaveURL(new RegExp(`${route}(\\?.*)?$`), { timeout: 20_000 });
  return true;
}

export function listingIdFromHref(href: string): string {
  const url = new URL(href, "http://127.0.0.1:3000");
  const segments = url.pathname.split("/").filter(Boolean);
  const listingId = segments.at(-1);
  if (!listingId) {
    throw new Error(`Expected listing id in href: ${href}`);
  }
  return listingId;
}

export async function gotoPath(page: Page, path: string): Promise<void> {
  let lastRedirectReason = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(path, { waitUntil: "commit", timeout: 120_000 });
      const redirectedToSignIn = /\/signin(\?.*)?$/.test(page.url());
      const wantsProtectedRoute = path === "/app" || path.startsWith("/app/");
      if (redirectedToSignIn && wantsProtectedRoute) {
        const hasStoredSession = await page
          .evaluate(([sessionKey, tokenKey]) => {
            return Boolean(window.localStorage.getItem(sessionKey)) && Boolean(window.localStorage.getItem(tokenKey));
          }, [SESSION_KEY, TOKEN_KEY])
          .catch(() => false);
        if (hasStoredSession) {
          const restored = await restoreWorkspaceFromSession(page);
          if (restored) {
            continue;
          }
          lastRedirectReason = "stored session present but role route restoration failed";
        }
        const cachedIdentity = identityByPage.get(page);
        if (cachedIdentity) {
          await signInAndGrantConsent(page, cachedIdentity);
          continue;
        }
        throw new Error(`Protected route ${path} redirected to /signin without recoverable session state`);
      }
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        (!message.includes("net::ERR_ABORTED") &&
          !message.includes("page crashed") &&
          !message.includes("net::ERR_INSUFFICIENT_RESOURCES")) ||
        attempt === 2
      ) {
        throw error;
      }
      await page.waitForTimeout(500);
    }
  }
  throw new Error(
    `Failed to navigate to ${path} after retries${lastRedirectReason ? `: ${lastRedirectReason}` : ""}`,
  );
}

async function waitForInteractiveForm(page: Page, route: "/signin" | "/onboarding/consent"): Promise<void> {
  await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}(\\?.*)?$`), {
    timeout: 20_000,
  });
  await expect(page.locator("form[data-interactive='true']")).toBeVisible({
    timeout: 20_000,
  });
}
