# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: buyer-discovery.spec.ts >> Buyer discovery and scoped read behavior >> buyer reaches the discovery shell and cannot read another actor's listing detail
- Location: tests/e2e/buyer-discovery.spec.ts:143:7

# Error details

```
Error: page.goto: Page crashed
Call log:
  - navigating to "http://127.0.0.1:39120/app/buyer", waiting until "domcontentloaded"

```

# Test source

```ts
  147 |       }
  148 |       const raw = window.localStorage.getItem(sessionKey);
  149 |       if (!raw) {
  150 |         return false;
  151 |       }
  152 |       try {
  153 |         const session = JSON.parse(raw) as {
  154 |           actor?: { role?: string };
  155 |         };
  156 |         return session.actor?.role === role;
  157 |       } catch {
  158 |         return false;
  159 |       }
  160 |     },
  161 |     [SESSION_KEY, TOKEN_KEY, input.role],
  162 |     { timeout: 30_000 },
  163 |   );
  164 |   await gotoPath(page, roleHomeRoute[input.role]);
  165 |   await expect(page).toHaveURL(new RegExp(`${roleHomeRoute[input.role]}$`), {
  166 |     timeout: 20_000,
  167 |   });
  168 | }
  169 | 
  170 | export async function createListing(
  171 |   page: Page,
  172 |   input: {
  173 |     title: string;
  174 |     commodity: string;
  175 |     quantityTons: string;
  176 |     priceAmount: string;
  177 |     priceCurrency: string;
  178 |     location: string;
  179 |     summary: string;
  180 |   },
  181 | ): Promise<string> {
  182 |   await gotoPath(page, "/app/market/listings");
  183 |   const listingTitleField = page.getByLabel("Listing title");
  184 |   const listingFormVisible = await listingTitleField.isVisible({ timeout: 8_000 }).catch(() => false);
  185 |   if (!listingFormVisible) {
  186 |     await restoreWorkspaceFromSession(page);
  187 |     await gotoPath(page, "/app/market/listings");
  188 |   }
  189 |   await expect(listingTitleField).toBeVisible({ timeout: 20_000 });
  190 |   await listingTitleField.fill(input.title);
  191 |   await page.getByLabel("Commodity").fill(input.commodity);
  192 |   await page.getByLabel("Quantity (tons)").fill(input.quantityTons);
  193 |   await page.getByLabel("Price amount").fill(input.priceAmount);
  194 |   await page.getByLabel("Currency").fill(input.priceCurrency);
  195 |   await page.getByLabel("Location").fill(input.location);
  196 |   await page.getByLabel("Summary").fill(input.summary);
  197 |   const createButton = page.getByRole("button", { name: "Create listing" });
  198 |   await createButton.click();
  199 | 
  200 |   const listingItem = page.getByRole("listitem").filter({ hasText: input.title }).first();
  201 |   await expect(listingItem).toBeVisible({ timeout: 30_000 });
  202 |   const detailLink = listingItem.getByRole("link", { name: "View and edit" });
  203 |   await expect(detailLink).toBeVisible({ timeout: 30_000 });
  204 |   const href = await detailLink.getAttribute("href");
  205 |   if (!href) {
  206 |     throw new Error("Expected listing detail link href");
  207 |   }
  208 |   return href;
  209 | }
  210 | 
  211 | async function restoreWorkspaceFromSession(page: Page): Promise<void> {
  212 |   const role = await page.evaluate(([sessionKey]) => {
  213 |     const raw = window.localStorage.getItem(sessionKey);
  214 |     if (!raw) {
  215 |       return null;
  216 |     }
  217 |     try {
  218 |       const session = JSON.parse(raw) as { actor?: { role?: string } };
  219 |       return session.actor?.role ?? null;
  220 |     } catch {
  221 |       return null;
  222 |     }
  223 |   }, [SESSION_KEY]);
  224 | 
  225 |   if (!role || !(role in roleHomeRoute)) {
  226 |     return;
  227 |   }
  228 | 
  229 |   const route = roleHomeRoute[role as Role];
  230 |   await gotoPath(page, route);
  231 |   await expect(page).toHaveURL(new RegExp(`${route}(\\?.*)?$`), { timeout: 20_000 });
  232 | }
  233 | 
  234 | export function listingIdFromHref(href: string): string {
  235 |   const url = new URL(href, "http://127.0.0.1:3000");
  236 |   const segments = url.pathname.split("/").filter(Boolean);
  237 |   const listingId = segments.at(-1);
  238 |   if (!listingId) {
  239 |     throw new Error(`Expected listing id in href: ${href}`);
  240 |   }
  241 |   return listingId;
  242 | }
  243 | 
  244 | export async function gotoPath(page: Page, path: string): Promise<void> {
  245 |   for (let attempt = 0; attempt < 3; attempt += 1) {
  246 |     try {
> 247 |       await page.goto(path, { waitUntil: "domcontentloaded", timeout: 60_000 });
      |                  ^ Error: page.goto: Page crashed
  248 |       return;
  249 |     } catch (error) {
  250 |       const message = error instanceof Error ? error.message : String(error);
  251 |       if (
  252 |         (!message.includes("net::ERR_ABORTED") &&
  253 |           !message.includes("page crashed") &&
  254 |           !message.includes("net::ERR_INSUFFICIENT_RESOURCES")) ||
  255 |         attempt === 2
  256 |       ) {
  257 |         throw error;
  258 |       }
  259 |       await page.waitForTimeout(500);
  260 |     }
  261 |   }
  262 | }
  263 | 
```