# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: negotiation.spec.ts >> Negotiation inbox and thread proof >> pending confirmation approve/reject paths lock terminal state and outsider thread access is blocked
- Location: tests/e2e/negotiation.spec.ts:252:7

# Error details

```
Error: Channel closed
```

```
Error: locator.fill: Test ended.
Call log:
  - waiting for getByLabel('Summary')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - button "Open Next.js Dev Tools" [ref=e8] [cursor=pointer]:
    - img [ref=e9]
  - alert [ref=e12]
  - generic [ref=e13]:
    - link "Skip to content" [ref=e14] [cursor=pointer]:
      - /url: "#main-content"
    - main [ref=e15]:
      - generic [ref=e16]:
        - generic [ref=e17]:
          - generic [ref=e18]:
            - generic [ref=e19]: Farmer
            - generic [ref=e20]: GH
          - paragraph [ref=e21]: Ama Seller
          - heading "Ghana Growers Network" [level=1] [ref=e22]
          - paragraph [ref=e23]: seller.negotiation.1776561274598@example.com · Farmer · GH
        - generic [ref=e24]:
          - generic [ref=e25]: Trace trace--market-listings-34od4h
          - button "Sign out" [ref=e26] [cursor=pointer]
      - region "Sync status" [ref=e27]:
        - generic [ref=e28]:
          - generic [ref=e30]: Online
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e31]
          - paragraph [ref=e32]: "Pending items: 0. Conflicts: 0. Trace ID: trace--market-listings-34od4h."
        - generic [ref=e33]:
          - button "Force online" [ref=e34] [cursor=pointer]
          - button "Simulate degraded" [ref=e35] [cursor=pointer]
          - button "Simulate offline" [ref=e36] [cursor=pointer]
      - generic [ref=e39]:
        - generic [ref=e42]:
          - paragraph [ref=e43]: Owner workspace
          - heading "Create, revise, and publish listings with visible marketplace state" [level=2] [ref=e44]
          - paragraph [ref=e45]: The owner flow stays intact, while buyer discovery remains restricted to published buyer-safe records.
        - generic [ref=e46]:
          - article [ref=e47]:
            - generic [ref=e49]:
              - paragraph [ref=e50]: Create listing
              - heading "Listing wizard" [level=2] [ref=e51]
              - paragraph [ref=e52]: Authenticated actor, country scope, consent, validation, and audit are enforced server-side before the listing is committed.
            - generic [ref=e53]:
              - generic [ref=e54]:
                - generic [ref=e55]: Listing title
                - textbox "Listing title" [ref=e56]: Negotiation proof cassava 1776561274598 approve
              - generic [ref=e57]:
                - generic [ref=e58]: Commodity
                - textbox "Commodity" [ref=e59]: Cassava
              - generic [ref=e60]:
                - generic [ref=e61]:
                  - generic [ref=e62]: Quantity (tons)
                  - spinbutton "Quantity (tons)" [ref=e63]: "6.0"
                - generic [ref=e64]:
                  - generic [ref=e65]: Price amount
                  - spinbutton "Price amount" [ref=e66]: "400"
              - generic [ref=e67]:
                - generic [ref=e68]:
                  - generic [ref=e69]: Currency
                  - textbox "Currency" [ref=e70]: GHS
                - generic [ref=e71]:
                  - generic [ref=e72]: Location
                  - textbox "Location" [active] [ref=e73]: Tamale, GH
              - generic [ref=e74]:
                - generic [ref=e75]: Summary
                - textbox "Summary" [ref=e76]: Bagged cassava stock ready for pickup with moisture proof attached.
              - button "Create listing" [ref=e77] [cursor=pointer]
          - article [ref=e78]:
            - generic [ref=e80]:
              - paragraph [ref=e81]: Server evidence
              - heading "Audit and idempotency receipt" [level=2] [ref=e82]
              - paragraph [ref=e83]: Create and edit commands return request metadata that can be queried back through the audit route.
            - complementary [ref=e84]:
              - strong [ref=e85]: Pending first submission
              - paragraph [ref=e86]: Submit once to create a listing, then inspect publish and revision cues on the owner detail route.
        - generic [ref=e87]:
          - generic [ref=e89]:
            - paragraph [ref=e90]: Owner listings
            - heading "Owned supply with publish and revision cues" [level=2] [ref=e91]
            - paragraph [ref=e92]: Each listing remains editable by the owner, and buyer visibility state is explicit.
          - list "Owner listing collection" [ref=e93]:
            - listitem [ref=e94]:
              - generic [ref=e95]:
                - generic [ref=e96]:
                  - generic [ref=e97]: published
                  - generic [ref=e98]: Owner-only view
                - heading "Negotiation proof cassava 1776561198264 reject" [level=3] [ref=e99]
              - paragraph [ref=e100]: Published cassava listing used for canonical negotiation browser proof.
              - paragraph [ref=e101]: Cassava · 6 tons · 400 GHS · Tamale, GH
              - link "View and edit" [ref=e103] [cursor=pointer]:
                - /url: /app/market/listings/listing-a15ee54b1c7d
            - listitem [ref=e104]:
              - generic [ref=e105]:
                - generic [ref=e106]:
                  - generic [ref=e107]: published
                  - generic [ref=e108]: Owner-only view
                - heading "Negotiation proof cassava 1776561198264 approve" [level=3] [ref=e109]
              - paragraph [ref=e110]: Published cassava listing used for canonical negotiation browser proof.
              - paragraph [ref=e111]: Cassava · 6 tons · 400 GHS · Tamale, GH
              - link "View and edit" [ref=e113] [cursor=pointer]:
                - /url: /app/market/listings/listing-e10558384c7a
      - navigation "Mobile primary" [ref=e115]:
        - link "Home" [ref=e116] [cursor=pointer]:
          - /url: /app/farmer
          - generic [ref=e117]: Home
        - link "Market" [ref=e118] [cursor=pointer]:
          - /url: /app/market/listings
          - generic [ref=e119]: Market
        - link "Inbox" [ref=e120] [cursor=pointer]:
          - /url: /app/market/negotiations
          - generic [ref=e121]: Inbox
        - link "Alerts" [ref=e122] [cursor=pointer]:
          - /url: /app/climate/alerts
          - generic [ref=e123]: Alerts
        - link "Profile 2" [ref=e124] [cursor=pointer]:
          - /url: /app/profile
          - generic [ref=e125]: Profile
          - generic [ref=e126]: "2"
```

# Test source

```ts
  102 |       )
  103 |       .then(() => true)
  104 |       .catch(() => false);
  105 |     if (consentCaptured) {
  106 |       await restoreWorkspaceFromSession(page);
  107 |     }
  108 |   }
  109 | }
  110 | 
  111 | export async function signInAndGrantConsent(
  112 |   page: Page,
  113 |   input: {
  114 |     displayName: string;
  115 |     email: string;
  116 |     role: Role;
  117 |     countryCode?: "GH" | "NG" | "JM";
  118 |   },
  119 | ): Promise<void> {
  120 |   await signIn(page, input);
  121 |   await grantConsent(page);
  122 |   const sessionReady = await page
  123 |     .waitForFunction(
  124 |       ([sessionKey, tokenKey, role]) => {
  125 |         if (!window.localStorage.getItem(tokenKey)) {
  126 |           return false;
  127 |         }
  128 |         const raw = window.localStorage.getItem(sessionKey);
  129 |         if (!raw) {
  130 |           return false;
  131 |         }
  132 |         try {
  133 |           const session = JSON.parse(raw) as {
  134 |             actor?: { role?: string };
  135 |           };
  136 |           return session.actor?.role === role;
  137 |         } catch {
  138 |           return false;
  139 |         }
  140 |       },
  141 |       [SESSION_KEY, TOKEN_KEY, input.role],
  142 |       { timeout: 30_000 },
  143 |     )
  144 |     .then(() => true)
  145 |     .catch(() => false);
  146 |   if (!sessionReady) {
  147 |     await restoreWorkspaceFromSession(page);
  148 |   }
  149 |   await page.waitForFunction(
  150 |     ([sessionKey, tokenKey, role]) => {
  151 |       if (!window.localStorage.getItem(tokenKey)) {
  152 |         return false;
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
> 202 |   await page.getByLabel("Summary").fill(input.summary);
      |                                    ^ Error: locator.fill: Test ended.
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
  253 |       await page.goto(path, { waitUntil: "domcontentloaded", timeout: 60_000 });
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