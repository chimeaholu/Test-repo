import { expect, type APIRequestContext, type Page } from "@playwright/test";

import { gotoPath, grantConsent } from "./helpers";

type GateAuthRole = "farmer" | "buyer" | "transporter";
type GateCountry = "GH" | "NG";
type AuthFlow = "magic-link" | "password";

type GateActor = {
  countryCode: GateCountry;
  countryName: string;
  role: GateAuthRole;
};

type FlowCapability = {
  supported: boolean;
  reason: string | null;
};

type MagicLinkPayload = {
  preview_code?: string;
};

const apiBaseUrl =
  process.env.AGRO_E2E_API_BASE_URL ??
  `http://127.0.0.1:${process.env.AGRO_E2E_API_PORT ?? "8000"}`;

const ROLE_HOME: Record<GateAuthRole, string> = {
  buyer: "/app/buyer",
  farmer: "/app/farmer",
  transporter: "/app/transporter",
};

const FIXTURE_RUN_ID = (process.env.AGRO_E2E_RUN_ID ?? `${Date.now()}`).replace(/\D/g, "").slice(-6) || "000001";

export const gateActors: GateActor[] = [
  { countryCode: "GH", countryName: "Ghana", role: "farmer" },
  { countryCode: "GH", countryName: "Ghana", role: "buyer" },
  { countryCode: "GH", countryName: "Ghana", role: "transporter" },
  { countryCode: "NG", countryName: "Nigeria", role: "farmer" },
  { countryCode: "NG", countryName: "Nigeria", role: "buyer" },
  { countryCode: "NG", countryName: "Nigeria", role: "transporter" },
];

export function actorLabel(actor: GateActor): string {
  return `${actor.role}-${actor.countryCode.toLowerCase()}`;
}

export function actorEmail(actor: GateActor, slug: string): string {
  return `eh0.${actor.role}.${actor.countryCode.toLowerCase()}.${slug}.${FIXTURE_RUN_ID}@example.com`;
}

export function actorHomeRoute(role: GateAuthRole): string {
  return ROLE_HOME[role];
}

export async function expectAnonymousProtectedRouteRedirect(
  page: Page,
  route: string,
): Promise<void> {
  await gotoPath(page, route);
  await expect(page).toHaveURL(/\/signin(\?.*)?$/);
  await expect(
    page.getByRole("heading", { name: "Sign in to your Agrodomain account" }),
  ).toBeVisible();
}

export async function expectAnonymousApiRejection(
  request: APIRequestContext,
  route: string = "/api/v1/identity/session",
): Promise<void> {
  const response = await request.get(`${apiBaseUrl}${route}`);
  expect(response.status()).toBe(401);
}

export async function detectFlowCapability(
  page: Page,
  flow: AuthFlow,
): Promise<FlowCapability> {
  await gotoPath(page, "/signin");
  const pageText = await page.locator("body").innerText().catch(() => "");
  const reason = capabilityReason(flow, pageText);
  return {
    reason,
    supported: reason === null,
  };
}

export async function signInWithMagicLink(
  page: Page,
  request: APIRequestContext,
  actor: GateActor,
): Promise<void> {
  const capability = await detectFlowCapability(page, "magic-link");
  if (!capability.supported) {
    throw new Error(capability.reason ?? "pending-backend");
  }

  const fixture = seedActorFixture(actor);

  await ensurePasswordActor(request, actor, fixture);

  await fillEntryIdentity(page, fixture.email, "#magicLinkIdentifier");
  await page.locator("#magicLinkCountryCode").selectOption(actor.countryCode);
  const challengeResponsePromise = page.waitForResponse((response) => {
    return response.url().includes("/api/v1/identity/login/magic-link/request")
      && response.request().method() === "POST";
  });
  await page
    .getByRole("button", {
      name: selectorPattern(
        process.env.AGRO_E2E_MAGIC_LINK_BUTTON_NAME,
        "request verification code|verification code|magic link|email me a link|send link|continue with email",
      ),
    })
    .click();

  const challengeResponse = await challengeResponsePromise;
  if (!challengeResponse.ok()) {
    throw new Error(`pending-backend: magic-link request failed (${challengeResponse.status()})`);
  }
  const challenge = (await challengeResponse.json()) as MagicLinkPayload;
  if (!challenge.preview_code) {
    throw new Error("pending-backend: preview code not returned for magic-link challenge");
  }

  await page.locator("#verificationCode").fill(challenge.preview_code);
  await page
    .getByRole("button", {
      name: selectorPattern(
        process.env.AGRO_E2E_MAGIC_LINK_VERIFY_BUTTON_NAME,
        "verify code and continue|verify|continue",
      ),
    })
    .click();
  await expect(page).toHaveURL(/\/(onboarding\/consent|app\/.+)$/);
}

export async function signInWithPassword(
  page: Page,
  request: APIRequestContext,
  actor: GateActor,
): Promise<void> {
  const capability = await detectFlowCapability(page, "password");
  if (!capability.supported) {
    throw new Error(capability.reason ?? "pending-backend");
  }

  const fixture = seedActorFixture(actor);
  const email = fixture.email;
  const password = fixture.password;
  await ensurePasswordActor(request, actor, fixture);

  await fillEntryIdentity(page, email, "#passwordIdentifier");
  await page.locator("#passwordCountryCode").selectOption(actor.countryCode);
  await page.locator("#password").fill(password);
  await page
    .getByRole("button", {
      name: selectorPattern(
        process.env.AGRO_E2E_PASSWORD_BUTTON_NAME,
        "sign in|log in|continue",
      ),
    })
    .click();

  await expect(page).toHaveURL(/\/(onboarding\/consent|app\/.+)$/);
}

function capabilityReason(flow: AuthFlow, pageText: string = ""): string | null {
  if (flow === "magic-link") {
    const hasUi =
      Boolean(process.env.AGRO_E2E_MAGIC_LINK_BUTTON_NAME) ||
      /verification code|magic link|email me a link|send link|one-time link/i.test(pageText);
    if (!hasUi) {
      return "pending-backend: magic-link auth UI is not merged";
    }
    return null;
  }

  const hasUi =
    Boolean(process.env.AGRO_E2E_PASSWORD_INPUT_SELECTOR) ||
    /password/i.test(pageText);
  if (!hasUi) {
    return "pending-backend: password auth UI is not merged";
  }
  return null;
}

async function fillEntryIdentity(
  page: Page,
  email: string,
  selector: string,
): Promise<void> {
  const emailField = page.locator(selector).first();
  await expect(emailField).toBeVisible();
  await emailField.fill(email);
}

function selectorPattern(
  override: string | undefined,
  fallback: string,
): RegExp {
  return new RegExp(override ?? fallback, "i");
}

export async function completePasswordEntry(
  page: Page,
  request: APIRequestContext,
  actor: GateActor,
): Promise<void> {
  await signInWithPassword(page, request, actor);
  await completeConsentIfNeeded(page, actor);
}

export async function completeMagicLinkEntry(
  page: Page,
  request: APIRequestContext,
  actor: GateActor,
): Promise<void> {
  await signInWithMagicLink(page, request, actor);
  await completeConsentIfNeeded(page, actor);
}

export function passwordFixtureReason(actor: GateActor): string | null {
  return null;
}

export function magicLinkFixtureReason(actor: GateActor): string | null {
  return null;
}

async function completeConsentIfNeeded(
  page: Page,
  actor: GateActor,
): Promise<void> {
  if (/\/onboarding\/consent(\?.*)?$/.test(page.url())) {
    await grantConsent(page);
  }
  await expect(page).toHaveURL(new RegExp(`${actorHomeRoute(actor.role)}(\\?.*)?$`));
}

function seedActorFixture(actor: GateActor): {
  email: string;
  password: string;
  phoneNumber: string;
  displayName: string;
} {
  const slug = actorLabel(actor);
  const countryPrefix = actor.countryCode === "NG" ? "+234" : "+233";
  const countryLocalPrefix = actor.countryCode === "NG" ? "80" : "24";
  const roleDigits =
    actor.role === "farmer"
      ? "101"
      : actor.role === "buyer"
        ? "202"
        : "303";
  return {
    email: actorEmail(actor, "auth"),
    password: `Harvest!${actor.countryCode}${roleDigits}`,
    phoneNumber: `${countryPrefix}${countryLocalPrefix}${roleDigits}${FIXTURE_RUN_ID.slice(-4)}`,
    displayName: `EH0 ${actor.role} ${actor.countryName} ${FIXTURE_RUN_ID}`,
  };
}

async function ensurePasswordActor(
  request: APIRequestContext,
  actor: GateActor,
  fixture: {
    email: string;
    password: string;
    phoneNumber: string;
    displayName: string;
  },
): Promise<void> {
  const response = await request.post(`${apiBaseUrl}/api/v1/identity/register/password`, {
    data: {
      display_name: fixture.displayName,
      email: fixture.email,
      phone_number: fixture.phoneNumber,
      password: fixture.password,
      role: actor.role,
      country_code: actor.countryCode,
    },
  });
  if (response.status() === 200 || response.status() === 409) {
    return;
  }
  throw new Error(`pending-backend: register/password failed for ${fixture.email} (${response.status()})`);
}
