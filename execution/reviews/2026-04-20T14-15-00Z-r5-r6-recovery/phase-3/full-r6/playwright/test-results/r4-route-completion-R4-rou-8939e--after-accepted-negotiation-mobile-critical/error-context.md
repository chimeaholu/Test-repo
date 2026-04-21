# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: r4-route-completion.spec.ts >> R4 route completion proof >> wallet and notifications routes surface live escrow state after accepted negotiation
- Location: tests/e2e/r4-route-completion.spec.ts:196:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('listitem').filter({ hasText: 'R4 wallet route cassava 1776696263712' }).first()
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for getByRole('listitem').filter({ hasText: 'R4 wallet route cassava 1776696263712' }).first()

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
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
          - paragraph [ref=e21]: R4 Seller
          - heading "Ghana Growers Network" [level=1] [ref=e22]
          - paragraph [ref=e23]: r4.seller.1776696263712@example.com · Farmer · GH
          - paragraph [ref=e24]: This protected workspace keeps role routing, queue state, and consent posture persistent while you move between operational routes.
        - generic [ref=e25]:
          - generic [ref=e26]: Trace trace--market-listings-mrr1xy
          - button "Sign out" [ref=e27] [cursor=pointer]
      - region "Sync status" [ref=e28]:
        - generic [ref=e29]:
          - generic [ref=e31]: Online
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e32]
          - paragraph [ref=e33]: "Pending items: 0. Conflicts: 0. Trace ID: trace--market-listings-mrr1xy."
        - generic [ref=e34]:
          - button "Force online" [ref=e35] [cursor=pointer]
          - button "Simulate degraded" [ref=e36] [cursor=pointer]
          - button "Simulate offline" [ref=e37] [cursor=pointer]
      - generic [ref=e40]:
        - generic [ref=e41]:
          - generic [ref=e43]:
            - paragraph [ref=e44]: Seller workspace
            - heading "Create, revise, and publish inventory with clear market status" [level=2] [ref=e45]
            - paragraph [ref=e46]: Manage lot details, publish when stock is ready, and keep buyer visibility explicit at every step.
          - generic "Seller market controls" [ref=e47]:
            - article [ref=e48]:
              - generic [ref=e49]: Saved inventory
              - strong [ref=e50]: 0 lot(s)
              - paragraph [ref=e51]: Draft, published, and closed states stay visibly distinct.
            - article [ref=e52]:
              - generic [ref=e53]: Buyer-safe live view
              - strong [ref=e54]: 0 published lot(s)
              - paragraph [ref=e55]: Only this subset is visible in buyer discovery.
            - article [ref=e56]:
              - generic [ref=e57]: Receipt evidence
              - strong [ref=e58]: Pending first save
              - paragraph [ref=e59]: Every create or update returns traceable request metadata.
        - generic [ref=e60]:
          - article [ref=e61]:
            - generic [ref=e63]:
              - paragraph [ref=e64]: New listing
              - heading "Add a lot" [level=2] [ref=e65]
              - paragraph [ref=e66]: Enter the commercial details buyers need first. Identity, country scope, validation, and audit controls are enforced when the listing is saved.
            - generic "Seller workflow rules" [ref=e67]:
              - article [ref=e68]:
                - heading "Commercial fields first" [level=3] [ref=e69]
                - paragraph [ref=e70]: The form leads with the details buyers need to make a first-pass decision.
              - article [ref=e71]:
                - heading "Publish is explicit" [level=3] [ref=e72]
                - paragraph [ref=e73]: Nothing becomes buyer-visible until a published revision exists.
            - generic [ref=e74]:
              - generic [ref=e75]:
                - generic [ref=e76]: Listing title
                - textbox "Listing title" [ref=e77]: R4 wallet route cassava 1776696263712
              - generic [ref=e78]:
                - generic [ref=e79]: Commodity
                - textbox "Commodity" [ref=e80]: Cassava
              - generic [ref=e81]:
                - generic [ref=e82]:
                  - generic [ref=e83]: Quantity (tons)
                  - spinbutton "Quantity (tons)" [ref=e84]: "5.0"
                - generic [ref=e85]:
                  - generic [ref=e86]: Price amount
                  - spinbutton "Price amount" [ref=e87]: "420"
              - generic [ref=e88]:
                - generic [ref=e89]:
                  - generic [ref=e90]: Currency
                  - textbox "Currency" [ref=e91]: GHS
                - generic [ref=e92]:
                  - generic [ref=e93]: Location
                  - textbox "Location" [ref=e94]: Tamale, GH
              - generic [ref=e95]:
                - generic [ref=e96]: Summary
                - textbox "Summary" [ref=e97]: Accepted negotiation route proof for wallet and notification surfaces.
              - alert [ref=e98]: Session token missing
              - generic [ref=e99]:
                - button "Create listing" [ref=e100] [cursor=pointer]
                - paragraph [ref=e101]: This creates an owner-safe record first. Buyer discovery follows publication rules.
          - article [ref=e102]:
            - generic [ref=e104]:
              - paragraph [ref=e105]: Submission receipt
              - heading "Latest save result" [level=2] [ref=e106]
              - paragraph [ref=e107]: Each create and update returns request metadata so teams can confirm whether a change was applied once or replayed safely.
            - complementary [ref=e108]:
              - strong [ref=e109]: No saved listing yet
              - paragraph [ref=e110]: Create your first lot to unlock publish, revision, and buyer-visibility controls.
        - generic [ref=e111]:
          - generic [ref=e113]:
            - paragraph [ref=e114]: Your inventory
            - heading "Saved lots" [level=2] [ref=e115]
            - paragraph [ref=e116]: Each listing keeps its publish status, buyer visibility, and revision cues visible so nothing is accidentally exposed.
          - generic "Inventory visibility snapshot" [ref=e117]:
            - article [ref=e118]:
              - generic [ref=e119]: Draft or closed
              - strong [ref=e120]: 0 lot(s)
              - paragraph [ref=e121]: These entries are not in active buyer discovery.
            - article [ref=e122]:
              - generic [ref=e123]: Published
              - strong [ref=e124]: 0 lot(s)
              - paragraph [ref=e125]: Published lots retain revision and visibility cues on every card.
          - paragraph [ref=e126]: You have not saved any listings yet.
          - list "Owner listing collection"
      - navigation "Mobile primary" [ref=e128]:
        - link "Home" [ref=e129] [cursor=pointer]:
          - /url: /app/farmer
          - generic [ref=e130]: Home
        - link "Market" [ref=e131] [cursor=pointer]:
          - /url: /app/market/listings
          - generic [ref=e132]: Market
        - link "Inbox" [ref=e133] [cursor=pointer]:
          - /url: /app/market/negotiations
          - generic [ref=e134]: Inbox
        - link "Alerts" [ref=e135] [cursor=pointer]:
          - /url: /app/climate/alerts
          - generic [ref=e136]: Alerts
        - link "Profile 2" [ref=e137] [cursor=pointer]:
          - /url: /app/profile
          - generic [ref=e138]: Profile
          - generic [ref=e139]: "2"
```

# Test source

```ts
  111 |     }
  112 |   }
  113 | }
  114 | 
  115 | export async function signInAndGrantConsent(
  116 |   page: Page,
  117 |   input: {
  118 |     displayName: string;
  119 |     email: string;
  120 |     role: Role;
  121 |     countryCode?: "GH" | "NG" | "JM";
  122 |   },
  123 | ): Promise<void> {
  124 |   await signIn(page, input);
  125 |   await grantConsent(page);
  126 |   const sessionReady = await page
  127 |     .waitForFunction(
  128 |       ([sessionKey, tokenKey, role]) => {
  129 |         if (!window.localStorage.getItem(tokenKey)) {
  130 |           return false;
  131 |         }
  132 |         const raw = window.localStorage.getItem(sessionKey);
  133 |         if (!raw) {
  134 |           return false;
  135 |         }
  136 |         try {
  137 |           const session = JSON.parse(raw) as {
  138 |             actor?: { role?: string };
  139 |           };
  140 |           return session.actor?.role === role;
  141 |         } catch {
  142 |           return false;
  143 |         }
  144 |       },
  145 |       [SESSION_KEY, TOKEN_KEY, input.role],
  146 |       { timeout: 30_000 },
  147 |     )
  148 |     .then(() => true)
  149 |     .catch(() => false);
  150 |   if (!sessionReady) {
  151 |     await restoreWorkspaceFromSession(page);
  152 |   }
  153 |   await page.waitForFunction(
  154 |     ([sessionKey, tokenKey, role]) => {
  155 |       if (!window.localStorage.getItem(tokenKey)) {
  156 |         return false;
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
> 211 |   await expect(listingItem).toBeVisible({ timeout: 30_000 });
      |                             ^ Error: expect(locator).toBeVisible() failed
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
  257 |       await page.goto(path, { waitUntil: "commit", timeout: 120_000 });
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