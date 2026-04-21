# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: recovery.spec.ts >> Consent recovery and offline retry >> consent revoke blocks protected routes until restored
- Location: tests/e2e/recovery.spec.ts:14:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3213/signin
Call log:
  - navigating to "http://127.0.0.1:3213/signin", waiting until "commit"

```

# Test source

```ts
  157 |       }
  158 |       const raw = window.localStorage.getItem(sessionKey);
  159 |       if (!raw) {
  160 |         return false;
  161 |       }
  162 |       try {
  163 |         const session = JSON.parse(raw) as {
  164 |           actor?: { role?: string };
  165 |         };
  166 |         return session.actor?.role === role;
  167 |       } catch {
  168 |         return false;
  169 |       }
  170 |     },
  171 |     [SESSION_KEY, TOKEN_KEY, input.role],
  172 |     { timeout: 30_000 },
  173 |   );
  174 |   await gotoPath(page, roleHomeRoute[input.role]);
  175 |   await expect(page).toHaveURL(new RegExp(`${roleHomeRoute[input.role]}$`), {
  176 |     timeout: 20_000,
  177 |   });
  178 | }
  179 | 
  180 | export async function createListing(
  181 |   page: Page,
  182 |   input: {
  183 |     title: string;
  184 |     commodity: string;
  185 |     quantityTons: string;
  186 |     priceAmount: string;
  187 |     priceCurrency: string;
  188 |     location: string;
  189 |     summary: string;
  190 |   },
  191 | ): Promise<string> {
  192 |   await gotoPath(page, "/app/market/listings");
  193 |   const listingTitleField = page.getByLabel("Listing title");
  194 |   const listingFormVisible = await listingTitleField.isVisible({ timeout: 8_000 }).catch(() => false);
  195 |   if (!listingFormVisible) {
  196 |     await restoreWorkspaceFromSession(page);
  197 |     await gotoPath(page, "/app/market/listings");
  198 |   }
  199 |   await expect(listingTitleField).toBeVisible({ timeout: 20_000 });
  200 |   await listingTitleField.fill(input.title);
  201 |   await page.getByLabel("Commodity").fill(input.commodity);
  202 |   await page.getByLabel("Quantity (tons)").fill(input.quantityTons);
  203 |   await page.getByLabel("Price amount").fill(input.priceAmount);
  204 |   await page.getByLabel("Currency").fill(input.priceCurrency);
  205 |   await page.getByLabel("Location").fill(input.location);
  206 |   await page.getByLabel("Summary").fill(input.summary);
  207 |   const createButton = page.getByRole("button", { name: "Create listing" });
  208 |   await createButton.click();
  209 | 
  210 |   const listingItem = page.getByRole("listitem").filter({ hasText: input.title }).first();
  211 |   await expect(listingItem).toBeVisible({ timeout: 30_000 });
  212 |   const detailLink = listingItem.getByRole("link", { name: "View and edit" });
  213 |   await expect(detailLink).toBeVisible({ timeout: 30_000 });
  214 |   const href = await detailLink.getAttribute("href");
  215 |   if (!href) {
  216 |     throw new Error("Expected listing detail link href");
  217 |   }
  218 |   return href;
  219 | }
  220 | 
  221 | async function restoreWorkspaceFromSession(page: Page): Promise<void> {
  222 |   const role = await page.evaluate(([sessionKey]) => {
  223 |     const raw = window.localStorage.getItem(sessionKey);
  224 |     if (!raw) {
  225 |       return null;
  226 |     }
  227 |     try {
  228 |       const session = JSON.parse(raw) as { actor?: { role?: string } };
  229 |       return session.actor?.role ?? null;
  230 |     } catch {
  231 |       return null;
  232 |     }
  233 |   }, [SESSION_KEY]);
  234 | 
  235 |   if (!role || !(role in roleHomeRoute)) {
  236 |     return;
  237 |   }
  238 | 
  239 |   const route = roleHomeRoute[role as Role];
  240 |   await gotoPath(page, route);
  241 |   await expect(page).toHaveURL(new RegExp(`${route}(\\?.*)?$`), { timeout: 20_000 });
  242 | }
  243 | 
  244 | export function listingIdFromHref(href: string): string {
  245 |   const url = new URL(href, "http://127.0.0.1:3000");
  246 |   const segments = url.pathname.split("/").filter(Boolean);
  247 |   const listingId = segments.at(-1);
  248 |   if (!listingId) {
  249 |     throw new Error(`Expected listing id in href: ${href}`);
  250 |   }
  251 |   return listingId;
  252 | }
  253 | 
  254 | export async function gotoPath(page: Page, path: string): Promise<void> {
  255 |   for (let attempt = 0; attempt < 3; attempt += 1) {
  256 |     try {
> 257 |       await page.goto(path, { waitUntil: "commit", timeout: 120_000 });
      |                  ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3213/signin
  258 |       const redirectedToSignIn = /\/signin(\?.*)?$/.test(page.url());
  259 |       const wantsProtectedRoute = path === "/app" || path.startsWith("/app/");
  260 |       if (redirectedToSignIn && wantsProtectedRoute) {
  261 |         const hasStoredSession = await page
  262 |           .evaluate(([sessionKey, tokenKey]) => {
  263 |             return Boolean(window.localStorage.getItem(sessionKey)) && Boolean(window.localStorage.getItem(tokenKey));
  264 |           }, [SESSION_KEY, TOKEN_KEY])
  265 |           .catch(() => false);
  266 |         if (hasStoredSession) {
  267 |           await restoreWorkspaceFromSession(page);
  268 |           continue;
  269 |         }
  270 |       }
  271 |       return;
  272 |     } catch (error) {
  273 |       const message = error instanceof Error ? error.message : String(error);
  274 |       if (
  275 |         (!message.includes("net::ERR_ABORTED") &&
  276 |           !message.includes("page crashed") &&
  277 |           !message.includes("net::ERR_INSUFFICIENT_RESOURCES")) ||
  278 |         attempt === 2
  279 |       ) {
  280 |         throw error;
  281 |       }
  282 |       await page.waitForTimeout(500);
  283 |     }
  284 |   }
  285 | }
  286 | 
  287 | async function waitForInteractiveForm(page: Page, route: "/signin" | "/onboarding/consent"): Promise<void> {
  288 |   await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}(\\?.*)?$`), {
  289 |     timeout: 20_000,
  290 |   });
  291 |   await expect(page.locator("form[data-interactive='true']")).toBeVisible({
  292 |     timeout: 20_000,
  293 |   });
  294 | }
  295 | 
```