import { expect, type Page } from "@playwright/test";

type Role = "farmer" | "buyer" | "cooperative" | "advisor" | "finance" | "admin";

const SESSION_KEY = "agrodomain.session.v2";
const TOKEN_KEY = "agrodomain.session-token.v1";

/**
 * Sign in via the real sign-in form and complete the consent flow.
 *
 * After this function returns the page is on the role home route
 * with a fully-granted session stored in localStorage.
 */
export async function signInAs(
  page: Page,
  role: Role,
  name: string,
  email: string,
  country: "GH" | "NG" | "JM" = "GH",
): Promise<void> {
  // ------------------------------------------------------------------
  // 1. Navigate to /signin and clear stale state
  // ------------------------------------------------------------------
  await page.goto("/signin", { waitUntil: "commit", timeout: 60_000 });
  await page.evaluate(
    ([sk, tk]) => {
      window.localStorage.removeItem(sk);
      window.localStorage.removeItem(tk);
    },
    [SESSION_KEY, TOKEN_KEY],
  );

  // Wait for the form to become interactive (client-side hydration)
  await expect(page.locator("form[data-interactive='true']")).toBeVisible({
    timeout: 20_000,
  });

  // ------------------------------------------------------------------
  // 2. Fill and submit the sign-in form
  // ------------------------------------------------------------------
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Role").selectOption(role);
  await page.getByLabel("Country pack").selectOption(country);

  await page.getByRole("button", { name: "Continue to onboarding" }).click();

  // ------------------------------------------------------------------
  // 3. Wait for the consent route
  // ------------------------------------------------------------------
  await expect(page).toHaveURL(/\/onboarding\/consent(\?.*)?$/, {
    timeout: 30_000,
  });

  // Ensure session token has landed in localStorage before continuing
  await page.waitForFunction(
    ([sk, tk]) =>
      Boolean(window.localStorage.getItem(sk)) &&
      Boolean(window.localStorage.getItem(tk)),
    [SESSION_KEY, TOKEN_KEY],
    { timeout: 20_000 },
  );

  // ------------------------------------------------------------------
  // 4. Complete consent
  // ------------------------------------------------------------------
  await expect(page.locator("form[data-interactive='true']")).toBeVisible({
    timeout: 20_000,
  });

  // Check the "accepted" checkbox (the confirmation toggle)
  const acceptedCheckbox = page.locator("input[name='accepted']");
  await acceptedCheckbox.check();
  await expect(acceptedCheckbox).toBeChecked();

  // Submit consent
  await page.getByRole("button", { name: "Grant consent" }).click();

  // ------------------------------------------------------------------
  // 5. Wait for workspace redirect
  // ------------------------------------------------------------------
  await expect(page).toHaveURL(/\/app\/.+$/, { timeout: 30_000 });

  // Double-check session state reflects the granted consent
  await page.waitForFunction(
    ([sk, tk, expectedRole]) => {
      if (!window.localStorage.getItem(tk)) return false;
      const raw = window.localStorage.getItem(sk);
      if (!raw) return false;
      try {
        const session = JSON.parse(raw) as {
          actor?: { role?: string };
          consent?: { state?: string };
        };
        return (
          session.actor?.role === expectedRole &&
          session.consent?.state === "consent_granted"
        );
      } catch {
        return false;
      }
    },
    [SESSION_KEY, TOKEN_KEY, role],
    { timeout: 20_000 },
  );
}
