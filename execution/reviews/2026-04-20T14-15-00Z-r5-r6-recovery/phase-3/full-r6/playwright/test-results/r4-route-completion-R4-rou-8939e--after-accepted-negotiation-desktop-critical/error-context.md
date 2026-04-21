# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: r4-route-completion.spec.ts >> R4 route completion proof >> wallet and notifications routes surface live escrow state after accepted negotiation
- Location: tests/e2e/r4-route-completion.spec.ts:196:7

# Error details

```
Error: locator.fill: Error: strict mode violation: getByLabel('Summary') resolved to 2 elements:
    1) <textarea rows="5" id="summary" name="summary">Bagged cassava stock ready for pickup with moistu…</textarea> aka getByRole('textbox', { name: 'Summary' })
    2) <div class="hero-kpi-grid" aria-label="Inventory visibility summary">…</div> aka getByLabel('Inventory visibility summary')

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
          - paragraph [ref=e21]: R4 Seller
          - heading "Ghana Growers Network" [level=1] [ref=e22]
          - paragraph [ref=e23]: r4.seller.1776695672654@example.com · Farmer · GH
          - paragraph [ref=e24]: This protected workspace keeps role routing, queue state, and consent posture persistent while you move between operational routes.
        - generic [ref=e25]:
          - generic [ref=e26]: Trace trace--market-listings-17b3we
          - button "Sign out" [ref=e27] [cursor=pointer]
      - region "Sync status" [ref=e28]:
        - generic [ref=e29]:
          - generic [ref=e31]: Online
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e32]
          - paragraph [ref=e33]: "Pending items: 0. Conflicts: 0. Trace ID: trace--market-listings-17b3we."
        - generic [ref=e34]:
          - button "Force online" [ref=e35] [cursor=pointer]
          - button "Simulate degraded" [ref=e36] [cursor=pointer]
          - button "Simulate offline" [ref=e37] [cursor=pointer]
      - generic [ref=e38]:
        - complementary [ref=e39]:
          - generic [ref=e40]:
            - generic [ref=e41]:
              - generic [ref=e43]:
                - paragraph [ref=e44]: Role-aware workspace
                - heading "Farmer operations" [level=2] [ref=e45]
                - paragraph [ref=e46]: The workspace routes to the correct role surface while keeping consent, queue, and offline state visible.
              - navigation "Primary" [ref=e47]:
                - generic [ref=e48]:
                  - link "Home" [ref=e49] [cursor=pointer]:
                    - /url: /app/farmer
                    - generic [ref=e50]: Home
                  - link "Market" [ref=e51] [cursor=pointer]:
                    - /url: /app/market/listings
                    - generic [ref=e52]: Market
                  - link "Inbox" [ref=e53] [cursor=pointer]:
                    - /url: /app/market/negotiations
                    - generic [ref=e54]: Inbox
                  - link "Alerts" [ref=e55] [cursor=pointer]:
                    - /url: /app/climate/alerts
                    - generic [ref=e56]: Alerts
                  - link "Profile 2" [ref=e57] [cursor=pointer]:
                    - /url: /app/profile
                    - generic [ref=e58]: Profile
                    - generic [ref=e59]: "2"
            - list [ref=e60]:
              - listitem [ref=e61]:
                - generic [ref=e62]: Home route
                - strong [ref=e63]: /app/farmer
              - listitem [ref=e64]:
                - generic [ref=e65]: Field posture
                - strong [ref=e66]: Field actions
              - listitem [ref=e67]:
                - generic [ref=e68]: Proof posture
                - strong [ref=e69]: Why this is safe
            - complementary [ref=e70]:
              - strong [ref=e71]: Design note
              - paragraph [ref=e72]: Consent, queue freshness, and evidence ownership stay visible before any protected action.
        - generic [ref=e74]:
          - generic [ref=e75]:
            - generic [ref=e77]:
              - paragraph [ref=e78]: Seller workspace
              - heading "Create, revise, and publish inventory with clear market status" [level=2] [ref=e79]
              - paragraph [ref=e80]: Manage lot details, publish when stock is ready, and keep buyer visibility explicit at every step.
            - generic "Seller market controls" [ref=e81]:
              - article [ref=e82]:
                - generic [ref=e83]: Saved inventory
                - strong [ref=e84]: 0 lot(s)
                - paragraph [ref=e85]: Draft, published, and closed states stay visibly distinct.
              - article [ref=e86]:
                - generic [ref=e87]: Buyer-safe live view
                - strong [ref=e88]: 0 published lot(s)
                - paragraph [ref=e89]: Only this subset is visible in buyer discovery.
              - article [ref=e90]:
                - generic [ref=e91]: Receipt evidence
                - strong [ref=e92]: Pending first save
                - paragraph [ref=e93]: Every create or update returns traceable request metadata.
          - generic [ref=e94]:
            - article [ref=e95]:
              - generic [ref=e97]:
                - paragraph [ref=e98]: New listing
                - heading "Add a lot" [level=2] [ref=e99]
                - paragraph [ref=e100]: Enter the commercial details buyers need first. Identity, country scope, validation, and audit controls are enforced when the listing is saved.
              - generic "Seller workflow rules" [ref=e101]:
                - article [ref=e102]:
                  - heading "Commercial fields first" [level=3] [ref=e103]
                  - paragraph [ref=e104]: The form leads with the details buyers need to make a first-pass decision.
                - article [ref=e105]:
                  - heading "Publish is explicit" [level=3] [ref=e106]
                  - paragraph [ref=e107]: Nothing becomes buyer-visible until a published revision exists.
              - generic [ref=e108]:
                - generic [ref=e109]:
                  - generic [ref=e110]: Listing title
                  - textbox "Listing title" [ref=e111]: R4 wallet route cassava 1776695672654
                - generic [ref=e112]:
                  - generic [ref=e113]: Commodity
                  - textbox "Commodity" [ref=e114]: Cassava
                - generic [ref=e115]:
                  - generic [ref=e116]:
                    - generic [ref=e117]: Quantity (tons)
                    - spinbutton "Quantity (tons)" [ref=e118]: "5.0"
                  - generic [ref=e119]:
                    - generic [ref=e120]: Price amount
                    - spinbutton "Price amount" [ref=e121]: "420"
                - generic [ref=e122]:
                  - generic [ref=e123]:
                    - generic [ref=e124]: Currency
                    - textbox "Currency" [ref=e125]: GHS
                  - generic [ref=e126]:
                    - generic [ref=e127]: Location
                    - textbox "Location" [active] [ref=e128]: Tamale, GH
                - generic [ref=e129]:
                  - generic [ref=e130]: Summary
                  - textbox "Summary" [ref=e131]: Bagged cassava stock ready for pickup with moisture proof attached.
                - generic [ref=e132]:
                  - button "Create listing" [ref=e133] [cursor=pointer]
                  - paragraph [ref=e134]: This creates an owner-safe record first. Buyer discovery follows publication rules.
            - article [ref=e135]:
              - generic [ref=e137]:
                - paragraph [ref=e138]: Submission receipt
                - heading "Latest save result" [level=2] [ref=e139]
                - paragraph [ref=e140]: Each create and update returns request metadata so teams can confirm whether a change was applied once or replayed safely.
              - complementary [ref=e141]:
                - strong [ref=e142]: No saved listing yet
                - paragraph [ref=e143]: Create your first lot to unlock publish, revision, and buyer-visibility controls.
          - generic [ref=e144]:
            - generic [ref=e146]:
              - paragraph [ref=e147]: Your inventory
              - heading "Saved lots" [level=2] [ref=e148]
              - paragraph [ref=e149]: Each listing keeps its publish status, buyer visibility, and revision cues visible so nothing is accidentally exposed.
            - generic "Inventory visibility summary" [ref=e150]:
              - article [ref=e151]:
                - generic [ref=e152]: Draft or closed
                - strong [ref=e153]: 0 lot(s)
                - paragraph [ref=e154]: These entries are not in active buyer discovery.
              - article [ref=e155]:
                - generic [ref=e156]: Published
                - strong [ref=e157]: 0 lot(s)
                - paragraph [ref=e158]: Published lots retain revision and visibility cues on every card.
            - paragraph [ref=e159]: You have not saved any listings yet.
            - list "Owner listing collection"
```

# Test source

```ts
  106 |       )
  107 |       .then(() => true)
  108 |       .catch(() => false);
  109 |     if (consentCaptured) {
  110 |       await restoreWorkspaceFromSession(page);
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
> 206 |   await page.getByLabel("Summary").fill(input.summary);
      |                                    ^ Error: locator.fill: Error: strict mode violation: getByLabel('Summary') resolved to 2 elements:
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