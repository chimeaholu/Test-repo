# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: marketplace.spec.ts >> Marketplace create and read >> farmer creates a listing and reads it back from detail
- Location: tests/e2e/marketplace.spec.ts:6:7

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
          - paragraph [ref=e21]: Ama Mensah
          - heading "Ghana Growers Network" [level=1] [ref=e22]
          - paragraph [ref=e23]: ama.1776695552736@example.com · Farmer · GH
          - paragraph [ref=e24]: This protected workspace keeps role routing, queue state, and consent posture persistent while you move between operational routes.
        - generic [ref=e25]:
          - generic [ref=e26]: Trace trace--market-listings-0qcguw
          - button "Sign out" [ref=e27] [cursor=pointer]
      - region "Sync status" [ref=e28]:
        - generic [ref=e29]:
          - generic [ref=e30]:
            - generic [ref=e31]: Low connectivity
            - generic [ref=e32]: Handoff ussd
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e33]
          - paragraph [ref=e34]: "Pending items: 1. Conflicts: 0. Trace ID: trace--market-listings-0qcguw."
        - generic [ref=e35]:
          - button "Force online" [ref=e36] [cursor=pointer]
          - button "Simulate degraded" [ref=e37] [cursor=pointer]
          - button "Simulate offline" [ref=e38] [cursor=pointer]
      - generic [ref=e39]:
        - complementary [ref=e40]:
          - generic [ref=e41]:
            - generic [ref=e42]:
              - generic [ref=e44]:
                - paragraph [ref=e45]: Role-aware workspace
                - heading "Farmer operations" [level=2] [ref=e46]
                - paragraph [ref=e47]: The workspace routes to the correct role surface while keeping consent, queue, and offline state visible.
              - navigation "Primary" [ref=e48]:
                - generic [ref=e49]:
                  - link "Home" [ref=e50] [cursor=pointer]:
                    - /url: /app/farmer
                    - generic [ref=e51]: Home
                  - link "Market" [ref=e52] [cursor=pointer]:
                    - /url: /app/market/listings
                    - generic [ref=e53]: Market
                  - link "Inbox 1" [ref=e54] [cursor=pointer]:
                    - /url: /app/market/negotiations
                    - generic [ref=e55]: Inbox
                    - generic [ref=e56]: "1"
                  - link "Alerts" [ref=e57] [cursor=pointer]:
                    - /url: /app/climate/alerts
                    - generic [ref=e58]: Alerts
                  - link "Profile 2" [ref=e59] [cursor=pointer]:
                    - /url: /app/profile
                    - generic [ref=e60]: Profile
                    - generic [ref=e61]: "2"
            - list [ref=e62]:
              - listitem [ref=e63]:
                - generic [ref=e64]: Home route
                - strong [ref=e65]: /app/farmer
              - listitem [ref=e66]:
                - generic [ref=e67]: Field posture
                - strong [ref=e68]: Field actions
              - listitem [ref=e69]:
                - generic [ref=e70]: Proof posture
                - strong [ref=e71]: Why this is safe
            - complementary [ref=e72]:
              - strong [ref=e73]: Design note
              - paragraph [ref=e74]: Consent, queue freshness, and evidence ownership stay visible before any protected action.
        - generic [ref=e76]:
          - generic [ref=e77]:
            - generic [ref=e79]:
              - paragraph [ref=e80]: Seller workspace
              - heading "Create, revise, and publish inventory with clear market status" [level=2] [ref=e81]
              - paragraph [ref=e82]: Manage lot details, publish when stock is ready, and keep buyer visibility explicit at every step.
            - generic "Seller market controls" [ref=e83]:
              - article [ref=e84]:
                - generic [ref=e85]: Saved inventory
                - strong [ref=e86]: 0 lot(s)
                - paragraph [ref=e87]: Draft, published, and closed states stay visibly distinct.
              - article [ref=e88]:
                - generic [ref=e89]: Buyer-safe live view
                - strong [ref=e90]: 0 published lot(s)
                - paragraph [ref=e91]: Only this subset is visible in buyer discovery.
              - article [ref=e92]:
                - generic [ref=e93]: Receipt evidence
                - strong [ref=e94]: Pending first save
                - paragraph [ref=e95]: Every create or update returns traceable request metadata.
          - generic [ref=e96]:
            - article [ref=e97]:
              - generic [ref=e99]:
                - paragraph [ref=e100]: New listing
                - heading "Add a lot" [level=2] [ref=e101]
                - paragraph [ref=e102]: Enter the commercial details buyers need first. Identity, country scope, validation, and audit controls are enforced when the listing is saved.
              - generic "Seller workflow rules" [ref=e103]:
                - article [ref=e104]:
                  - heading "Commercial fields first" [level=3] [ref=e105]
                  - paragraph [ref=e106]: The form leads with the details buyers need to make a first-pass decision.
                - article [ref=e107]:
                  - heading "Publish is explicit" [level=3] [ref=e108]
                  - paragraph [ref=e109]: Nothing becomes buyer-visible until a published revision exists.
              - generic [ref=e110]:
                - generic [ref=e111]:
                  - generic [ref=e112]: Listing title
                  - textbox "Listing title" [ref=e113]: Premium cassava harvest 1776695552736
                - generic [ref=e114]:
                  - generic [ref=e115]: Commodity
                  - textbox "Commodity" [ref=e116]: Cassava
                - generic [ref=e117]:
                  - generic [ref=e118]:
                    - generic [ref=e119]: Quantity (tons)
                    - spinbutton "Quantity (tons)" [ref=e120]: "4.2"
                  - generic [ref=e121]:
                    - generic [ref=e122]: Price amount
                    - spinbutton "Price amount" [ref=e123]: "320"
                - generic [ref=e124]:
                  - generic [ref=e125]:
                    - generic [ref=e126]: Currency
                    - textbox "Currency" [ref=e127]: GHS
                  - generic [ref=e128]:
                    - generic [ref=e129]: Location
                    - textbox "Location" [active] [ref=e130]: Tamale, GH
                - generic [ref=e131]:
                  - generic [ref=e132]: Summary
                  - textbox "Summary" [ref=e133]: Bagged cassava stock ready for pickup with moisture proof attached.
                - generic [ref=e134]:
                  - button "Create listing" [ref=e135] [cursor=pointer]
                  - paragraph [ref=e136]: This creates an owner-safe record first. Buyer discovery follows publication rules.
            - article [ref=e137]:
              - generic [ref=e139]:
                - paragraph [ref=e140]: Submission receipt
                - heading "Latest save result" [level=2] [ref=e141]
                - paragraph [ref=e142]: Each create and update returns request metadata so teams can confirm whether a change was applied once or replayed safely.
              - complementary [ref=e143]:
                - strong [ref=e144]: No saved listing yet
                - paragraph [ref=e145]: Create your first lot to unlock publish, revision, and buyer-visibility controls.
          - generic [ref=e146]:
            - generic [ref=e148]:
              - paragraph [ref=e149]: Your inventory
              - heading "Saved lots" [level=2] [ref=e150]
              - paragraph [ref=e151]: Each listing keeps its publish status, buyer visibility, and revision cues visible so nothing is accidentally exposed.
            - generic "Inventory visibility summary" [ref=e152]:
              - article [ref=e153]:
                - generic [ref=e154]: Draft or closed
                - strong [ref=e155]: 0 lot(s)
                - paragraph [ref=e156]: These entries are not in active buyer discovery.
              - article [ref=e157]:
                - generic [ref=e158]: Published
                - strong [ref=e159]: 0 lot(s)
                - paragraph [ref=e160]: Published lots retain revision and visibility cues on every card.
            - paragraph [ref=e161]: You have not saved any listings yet.
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