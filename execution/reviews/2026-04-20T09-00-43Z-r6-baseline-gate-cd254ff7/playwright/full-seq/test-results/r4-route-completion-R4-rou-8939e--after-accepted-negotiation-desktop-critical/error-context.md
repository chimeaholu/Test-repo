# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: r4-route-completion.spec.ts >> R4 route completion proof >> wallet and notifications routes surface live escrow state after accepted negotiation
- Location: tests/e2e/r4-route-completion.spec.ts:196:7

# Error details

```
TimeoutError: page.goto: Timeout 60000ms exceeded.
Call log:
  - navigating to "http://127.0.0.1:3010/app/market/listings", waiting until "domcontentloaded"

```

# Test source

```ts
  153 |       }
  154 |       const raw = window.localStorage.getItem(sessionKey);
  155 |       if (!raw) {
  156 |         return false;
  157 |       }
  158 |       try {
  159 |         const session = JSON.parse(raw) as {
  160 |           actor?: { role?: string };
  161 |         };
  162 |         return session.actor?.role === role;
  163 |       } catch {
  164 |         return false;
  165 |       }
  166 |     },
  167 |     [SESSION_KEY, TOKEN_KEY, input.role],
  168 |     { timeout: 30_000 },
  169 |   );
  170 |   await gotoPath(page, roleHomeRoute[input.role]);
  171 |   await expect(page).toHaveURL(new RegExp(`${roleHomeRoute[input.role]}$`), {
  172 |     timeout: 20_000,
  173 |   });
  174 | }
  175 | 
  176 | export async function createListing(
  177 |   page: Page,
  178 |   input: {
  179 |     title: string;
  180 |     commodity: string;
  181 |     quantityTons: string;
  182 |     priceAmount: string;
  183 |     priceCurrency: string;
  184 |     location: string;
  185 |     summary: string;
  186 |   },
  187 | ): Promise<string> {
  188 |   await gotoPath(page, "/app/market/listings");
  189 |   const listingTitleField = page.getByLabel("Listing title");
  190 |   const listingFormVisible = await listingTitleField.isVisible({ timeout: 8_000 }).catch(() => false);
  191 |   if (!listingFormVisible) {
  192 |     await restoreWorkspaceFromSession(page);
  193 |     await gotoPath(page, "/app/market/listings");
  194 |   }
  195 |   await expect(listingTitleField).toBeVisible({ timeout: 20_000 });
  196 |   await listingTitleField.fill(input.title);
  197 |   await page.getByLabel("Commodity").fill(input.commodity);
  198 |   await page.getByLabel("Quantity (tons)").fill(input.quantityTons);
  199 |   await page.getByLabel("Price amount").fill(input.priceAmount);
  200 |   await page.getByLabel("Currency").fill(input.priceCurrency);
  201 |   await page.getByLabel("Location").fill(input.location);
  202 |   await page.getByLabel("Summary").fill(input.summary);
  203 |   const createButton = page.getByRole("button", { name: "Create listing" });
  204 |   await createButton.click();
  205 | 
  206 |   const listingItem = page.getByRole("listitem").filter({ hasText: input.title }).first();
  207 |   await expect(listingItem).toBeVisible({ timeout: 30_000 });
  208 |   const detailLink = listingItem.getByRole("link", { name: "View and edit" });
  209 |   await expect(detailLink).toBeVisible({ timeout: 30_000 });
  210 |   const href = await detailLink.getAttribute("href");
  211 |   if (!href) {
  212 |     throw new Error("Expected listing detail link href");
  213 |   }
  214 |   return href;
  215 | }
  216 | 
  217 | async function restoreWorkspaceFromSession(page: Page): Promise<void> {
  218 |   const role = await page.evaluate(([sessionKey]) => {
  219 |     const raw = window.localStorage.getItem(sessionKey);
  220 |     if (!raw) {
  221 |       return null;
  222 |     }
  223 |     try {
  224 |       const session = JSON.parse(raw) as { actor?: { role?: string } };
  225 |       return session.actor?.role ?? null;
  226 |     } catch {
  227 |       return null;
  228 |     }
  229 |   }, [SESSION_KEY]);
  230 | 
  231 |   if (!role || !(role in roleHomeRoute)) {
  232 |     return;
  233 |   }
  234 | 
  235 |   const route = roleHomeRoute[role as Role];
  236 |   await gotoPath(page, route);
  237 |   await expect(page).toHaveURL(new RegExp(`${route}(\\?.*)?$`), { timeout: 20_000 });
  238 | }
  239 | 
  240 | export function listingIdFromHref(href: string): string {
  241 |   const url = new URL(href, "http://127.0.0.1:3000");
  242 |   const segments = url.pathname.split("/").filter(Boolean);
  243 |   const listingId = segments.at(-1);
  244 |   if (!listingId) {
  245 |     throw new Error(`Expected listing id in href: ${href}`);
  246 |   }
  247 |   return listingId;
  248 | }
  249 | 
  250 | export async function gotoPath(page: Page, path: string): Promise<void> {
  251 |   for (let attempt = 0; attempt < 3; attempt += 1) {
  252 |     try {
> 253 |       await page.goto(path, { waitUntil: "domcontentloaded", timeout: 60_000 });
      |                  ^ TimeoutError: page.goto: Timeout 60000ms exceeded.
  254 |       return;
  255 |     } catch (error) {
  256 |       const message = error instanceof Error ? error.message : String(error);
  257 |       if (
  258 |         (!message.includes("net::ERR_ABORTED") &&
  259 |           !message.includes("page crashed") &&
  260 |           !message.includes("net::ERR_INSUFFICIENT_RESOURCES")) ||
  261 |         attempt === 2
  262 |       ) {
  263 |         throw error;
  264 |       }
  265 |       await page.waitForTimeout(500);
  266 |     }
  267 |   }
  268 | }
  269 | 
  270 | async function waitForInteractiveForm(page: Page, route: "/signin" | "/onboarding/consent"): Promise<void> {
  271 |   await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}(\\?.*)?$`), {
  272 |     timeout: 20_000,
  273 |   });
  274 |   await expect(page.locator("form[data-interactive='true']")).toBeVisible({
  275 |     timeout: 20_000,
  276 |   });
  277 | }
  278 | 
```