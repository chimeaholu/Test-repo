# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: r5-ux-hardening.spec.ts >> R5 UX hardening proof >> captures public, onboarding, and role-home routes
- Location: tests/e2e/r5-ux-hardening.spec.ts:303:7

# Error details

```
TimeoutError: page.screenshot: Timeout 20000ms exceeded.
Call log:
  - taking page screenshot
  - waiting for fonts to load...
  - fonts loaded

```

# Test source

```ts
  1   | import crypto from "node:crypto";
  2   | import fs from "node:fs";
  3   | import path from "node:path";
  4   | 
  5   | import { expect, test, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";
  6   | import { schemaVersion } from "@agrodomain/contracts";
  7   | 
  8   | import { createListing, gotoPath, listingIdFromHref, signIn, signInAndGrantConsent } from "./helpers";
  9   | 
  10  | const API_BASE_URL =
  11  |   process.env.AGRO_E2E_API_BASE_URL ??
  12  |   `http://127.0.0.1:${process.env.AGRO_E2E_API_PORT ?? "8000"}`;
  13  | const SESSION_KEY = "agrodomain.session.v2";
  14  | const TOKEN_KEY = "agrodomain.session-token.v1";
  15  | 
  16  | type Role = "farmer" | "buyer" | "cooperative" | "advisor" | "finance" | "admin";
  17  | type SessionSeed = {
  18  |   accessToken: string;
  19  |   session: {
  20  |     actor: {
  21  |       actor_id: string;
  22  |       country_code: string;
  23  |       role: Role;
  24  |     };
  25  |   };
  26  | };
  27  | 
  28  | function proofPath(testInfo: TestInfo, name: string): string | null {
  29  |   const artifactDir = process.env.PLAYWRIGHT_ARTIFACT_DIR;
  30  |   if (!artifactDir) {
  31  |     return null;
  32  |   }
  33  |   const screenshotDir = path.join(artifactDir, "screenshots");
  34  |   fs.mkdirSync(screenshotDir, { recursive: true });
  35  |   return path.join(screenshotDir, `${testInfo.project.name}-${name}.png`);
  36  | }
  37  | 
  38  | async function captureProof(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  39  |   const screenshotPath = proofPath(testInfo, name);
  40  |   if (!screenshotPath) {
  41  |     return;
  42  |   }
  43  |   try {
> 44  |     await page.screenshot({ path: screenshotPath, fullPage: true });
      |                ^ TimeoutError: page.screenshot: Timeout 20000ms exceeded.
  45  |   } catch (error) {
  46  |     const message = error instanceof Error ? error.message : String(error);
  47  |     if (!message.includes("Page.captureScreenshot")) {
  48  |       throw error;
  49  |     }
  50  |     await page.screenshot({ path: screenshotPath, fullPage: false });
  51  |   }
  52  | }
  53  | 
  54  | async function assertA11ySmoke(page: Page): Promise<void> {
  55  |   await expect(page.locator("main")).toHaveCount(1);
  56  |   const h1Count = await page.locator("h1").count();
  57  |   expect(h1Count).toBeLessThanOrEqual(1);
  58  |   const offenders = await page.evaluate(() => {
  59  |     return Array.from(document.querySelectorAll("button, a")).flatMap((element) => {
  60  |       const label =
  61  |         element.getAttribute("aria-label") ??
  62  |         element.textContent?.replace(/\s+/g, " ").trim() ??
  63  |         "";
  64  |       if (label.length > 0) {
  65  |         return [];
  66  |       }
  67  |       return [`${element.tagName.toLowerCase()}:${element.outerHTML.slice(0, 120)}`];
  68  |     });
  69  |   });
  70  |   expect(offenders).toEqual([]);
  71  | }
  72  | 
  73  | async function createAuthenticatedSession(
  74  |   request: APIRequestContext,
  75  |   input: {
  76  |     displayName: string;
  77  |     email: string;
  78  |     role: Role;
  79  |     scopeIds: string[];
  80  |     countryCode?: "GH" | "NG" | "JM";
  81  |   },
  82  | ): Promise<SessionSeed> {
  83  |   const signInRequestId = crypto.randomUUID();
  84  |   const signInResponse = await request.post(`${API_BASE_URL}/api/v1/identity/session`, {
  85  |     data: {
  86  |       display_name: input.displayName,
  87  |       email: input.email,
  88  |       role: input.role,
  89  |       country_code: input.countryCode ?? "GH",
  90  |     },
  91  |     headers: {
  92  |       "X-Correlation-ID": signInRequestId,
  93  |       "X-Request-ID": signInRequestId,
  94  |     },
  95  |   });
  96  |   expect(signInResponse.ok()).toBeTruthy();
  97  |   const signInPayload = (await signInResponse.json()) as {
  98  |     access_token: string;
  99  |     session: SessionSeed["session"];
  100 |   };
  101 | 
  102 |   const consentRequestId = crypto.randomUUID();
  103 |   const consentResponse = await request.post(`${API_BASE_URL}/api/v1/identity/consent`, {
  104 |     data: {
  105 |       captured_at: new Date().toISOString(),
  106 |       policy_version: "2026.04.w1",
  107 |       scope_ids: input.scopeIds,
  108 |     },
  109 |     headers: {
  110 |       Authorization: `Bearer ${signInPayload.access_token}`,
  111 |       "X-Correlation-ID": consentRequestId,
  112 |       "X-Request-ID": consentRequestId,
  113 |     },
  114 |   });
  115 |   expect(consentResponse.ok()).toBeTruthy();
  116 | 
  117 |   return {
  118 |     accessToken: signInPayload.access_token,
  119 |     session: (await consentResponse.json()) as SessionSeed["session"],
  120 |   };
  121 | }
  122 | 
  123 | async function primeSession(page: Page, sessionSeed: SessionSeed): Promise<void> {
  124 |   await gotoPath(page, "/signin");
  125 |   await page.evaluate(
  126 |     ([sessionKey, tokenKey, session, token]) => {
  127 |       window.localStorage.setItem(sessionKey, JSON.stringify(session));
  128 |       window.localStorage.setItem(tokenKey, token);
  129 |     },
  130 |     [SESSION_KEY, TOKEN_KEY, sessionSeed.session, sessionSeed.accessToken],
  131 |   );
  132 | }
  133 | 
  134 | async function publishListingViaCommand(
  135 |   request: APIRequestContext,
  136 |   token: string,
  137 |   actorId: string,
  138 |   countryCode: string,
  139 |   listingId: string,
  140 | ): Promise<void> {
  141 |   const requestId = crypto.randomUUID();
  142 |   const response = await request.post(`${API_BASE_URL}/api/v1/workflow/commands`, {
  143 |     data: {
  144 |       metadata: {
```