# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: negotiation.spec.ts >> Negotiation inbox and thread proof >> pending confirmation approve/reject paths lock terminal state and outsider thread access is blocked
- Location: tests/e2e/negotiation.spec.ts:252:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Inbox and thread controls on the canonical N2-A2 runtime' })
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for getByRole('heading', { name: 'Inbox and thread controls on the canonical N2-A2 runtime' })

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - button "Open Next.js Dev Tools" [ref=e8] [cursor=pointer]:
    - img [ref=e9]
  - alert [ref=e12]: Ghana Growers Network
  - generic [ref=e13]:
    - link "Skip to content" [ref=e14] [cursor=pointer]:
      - /url: "#main-content"
    - main [ref=e15]:
      - generic [ref=e16]:
        - generic [ref=e17]:
          - generic [ref=e18]:
            - generic [ref=e19]: Buyer
            - generic [ref=e20]: GH
          - paragraph [ref=e21]: Kofi Buyer
          - heading "Ghana Growers Network" [level=1] [ref=e22]
          - paragraph [ref=e23]: buyer.negotiation.1776677161598@example.com · Buyer · GH
        - generic [ref=e24]:
          - generic [ref=e25]: Trace trace-ket-negotiations-bkceh5
          - button "Sign out" [ref=e26] [cursor=pointer]
      - region "Sync status" [ref=e27]:
        - generic [ref=e28]:
          - generic [ref=e30]: Online
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e31]
          - paragraph [ref=e32]: "Pending items: 0. Conflicts: 0. Trace ID: trace-ket-negotiations-bkceh5."
        - generic [ref=e33]:
          - button "Force online" [ref=e34] [cursor=pointer]
          - button "Simulate degraded" [ref=e35] [cursor=pointer]
          - button "Simulate offline" [ref=e36] [cursor=pointer]
      - generic [ref=e37]:
        - complementary [ref=e38]:
          - generic [ref=e39]:
            - generic [ref=e40]:
              - generic [ref=e42]:
                - paragraph [ref=e43]: Role-aware workspace
                - heading "Buyer operations" [level=2] [ref=e44]
                - paragraph [ref=e45]: The shell routes to the correct role surface while keeping consent, queue, and offline state visible.
              - navigation "Primary" [ref=e46]:
                - generic [ref=e47]:
                  - link "Home" [ref=e48] [cursor=pointer]:
                    - /url: /app/buyer
                    - generic [ref=e49]: Home
                  - link "Market" [ref=e50] [cursor=pointer]:
                    - /url: /app/market/listings
                    - generic [ref=e51]: Market
                  - link "Inbox" [active] [ref=e52] [cursor=pointer]:
                    - /url: /app/market/negotiations
                    - generic [ref=e53]: Inbox
                  - link "Alerts" [ref=e54] [cursor=pointer]:
                    - /url: /app/climate/alerts
                    - generic [ref=e55]: Alerts
                  - link "Profile 2" [ref=e56] [cursor=pointer]:
                    - /url: /app/profile
                    - generic [ref=e57]: Profile
                    - generic [ref=e58]: "2"
            - list [ref=e59]:
              - listitem [ref=e60]:
                - generic [ref=e61]: Home route
                - strong [ref=e62]: /app/buyer
              - listitem [ref=e63]:
                - generic [ref=e64]: Field posture
                - strong [ref=e65]: Offer work
              - listitem [ref=e66]:
                - generic [ref=e67]: Proof posture
                - strong [ref=e68]: Proof before commitment
            - complementary [ref=e69]:
              - strong [ref=e70]: Design note
              - paragraph [ref=e71]: Listing proof, identity state, and queue continuity appear before deal actions.
        - generic [ref=e73]:
          - generic [ref=e74]:
            - generic [ref=e76]:
              - paragraph [ref=e77]: Offers and negotiations
              - heading "Track every live negotiation in one place" [level=2] [ref=e78]
              - paragraph [ref=e79]: Review active threads, create offers, respond with counters, and manage confirmation checkpoints without losing the audit trail.
            - generic [ref=e80]:
              - generic [ref=e81]: buyer
              - generic [ref=e82]: Inbox ready
          - generic [ref=e83]:
            - article [ref=e84]:
              - generic [ref=e86]:
                - paragraph [ref=e87]: Inbox
                - heading "Visible negotiations" [level=2] [ref=e88]
                - paragraph [ref=e89]: Only participant threads appear here. If you are not part of the negotiation, you do not see the thread or its confirmation controls.
              - complementary [ref=e90]:
                - strong [ref=e91]: No negotiations yet
                - paragraph [ref=e92]: Create an offer from a published lot or wait for the counterparty to start the thread.
              - list "Negotiation threads"
            - generic [ref=e93]:
              - article [ref=e94]:
                - generic [ref=e96]:
                  - paragraph [ref=e97]: Open offer
                  - heading "Buyer offer composer" [level=2] [ref=e98]
                  - paragraph [ref=e99]: Start with a published lot, submit one canonical offer, and keep the result visible if the request is replayed or retried.
                - generic [ref=e100]:
                  - generic [ref=e101]:
                    - generic [ref=e102]: Listing ID
                    - textbox "Listing ID" [ref=e103]: listing-8a8f818da6ed
                    - paragraph [ref=e104]: Use a published listing id. Owner and unpublished listings fail closed.
                  - generic [ref=e105]:
                    - generic [ref=e106]:
                      - generic [ref=e107]: Offer amount
                      - spinbutton "Offer amount" [ref=e108]: "500"
                    - generic [ref=e109]:
                      - generic [ref=e110]: Currency
                      - textbox "Currency" [ref=e111]: GHS
                  - generic [ref=e112]:
                    - generic [ref=e113]: Buyer note
                    - textbox "Buyer note" [ref=e114]
                  - button "Create offer thread" [ref=e115] [cursor=pointer]
              - article [ref=e116]:
                - generic [ref=e118]:
                  - paragraph [ref=e119]: Thread
                  - heading "Choose a negotiation" [level=2] [ref=e120]
                  - paragraph [ref=e121]: Message history, confirmation checkpoints, and closed-state protections stay visible so both sides understand what happens next.
                - generic [ref=e123]:
                  - strong [ref=e124]: No negotiation selected
                  - paragraph [ref=e125]: Choose a thread from the inbox, or create a new buyer offer to populate this panel.
              - article [ref=e126]:
                - generic [ref=e128]:
                  - paragraph [ref=e129]: Evidence
                  - heading "Audit and idempotency cues" [level=2] [ref=e130]
                  - paragraph [ref=e131]: Every regulated mutation returns request identifiers you can replay into the audit route. Repeated submits stay single-effect and clearly marked.
                - complementary [ref=e132]:
                  - strong [ref=e133]: No mutation evidence captured yet
                  - paragraph [ref=e134]: Create or update a thread to surface request metadata, replay state, and audit evidence from the canonical audit route.
```

# Test source

```ts
  81  |       window.localStorage.setItem(tokenKey, token);
  82  |     },
  83  |     [SESSION_KEY, TOKEN_KEY, sessionSeed.session, sessionSeed.accessToken],
  84  |   );
  85  | }
  86  | 
  87  | async function activateSession(page: Page, sessionSeed: SessionSeed, route: "/app/farmer" | "/app/buyer"): Promise<void> {
  88  |   await primeSession(page, sessionSeed);
  89  |   await gotoPath(page, route);
  90  |   await waitForWorkspaceReady(page);
  91  | }
  92  | 
  93  | async function waitForWorkspaceReady(page: Page): Promise<void> {
  94  |   await page.getByText("Loading workspace").waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
  95  | }
  96  | 
  97  | async function publishListingViaCommand(
  98  |   request: APIRequestContext,
  99  |   page: Page,
  100 |   listingId: string,
  101 | ): Promise<void> {
  102 |   const token = await page.evaluate(() => window.localStorage.getItem("agrodomain.session-token.v1"));
  103 |   const sessionRaw = await page.evaluate(() => window.localStorage.getItem("agrodomain.session.v2"));
  104 |   if (!token || !sessionRaw) {
  105 |     throw new Error("Expected seller token and session in localStorage");
  106 |   }
  107 | 
  108 |   const session = JSON.parse(sessionRaw) as {
  109 |     actor: {
  110 |       actor_id: string;
  111 |       country_code: string;
  112 |     };
  113 |   };
  114 |   const requestId = crypto.randomUUID();
  115 |   const response = await request.post(`${API_BASE_URL}/api/v1/workflow/commands`, {
  116 |     data: {
  117 |       metadata: {
  118 |         request_id: requestId,
  119 |         idempotency_key: requestId,
  120 |         actor_id: session.actor.actor_id,
  121 |         country_code: session.actor.country_code,
  122 |         channel: "pwa",
  123 |         schema_version: SCHEMA_VERSION,
  124 |         correlation_id: requestId,
  125 |         occurred_at: new Date().toISOString(),
  126 |         traceability: {
  127 |           journey_ids: ["CJ-002"],
  128 |           data_check_ids: ["DI-001"],
  129 |         },
  130 |       },
  131 |       command: {
  132 |         name: "market.listings.publish",
  133 |         aggregate_ref: listingId,
  134 |         mutation_scope: "marketplace.listings",
  135 |         payload: {
  136 |           listing_id: listingId,
  137 |         },
  138 |       },
  139 |     },
  140 |     headers: {
  141 |       Authorization: `Bearer ${token}`,
  142 |     },
  143 |   });
  144 |   expect(response.ok()).toBeTruthy();
  145 | }
  146 | 
  147 | async function sellerCreateAndPublishListing(request: APIRequestContext, page: Page, timestamp: number, suffix: string): Promise<string> {
  148 |   const detailHref = await createListing(page, {
  149 |     title: `Negotiation proof cassava ${timestamp} ${suffix}`,
  150 |     commodity: "Cassava",
  151 |     quantityTons: "6.0",
  152 |     priceAmount: "400",
  153 |     priceCurrency: "GHS",
  154 |     location: "Tamale, GH",
  155 |     summary: "Published cassava listing used for canonical negotiation browser proof.",
  156 |   });
  157 |   const listingId = listingIdFromHref(detailHref);
  158 |   await publishListingViaCommand(request, page, listingId);
  159 |   return listingId;
  160 | }
  161 | 
  162 | async function buyerCreateThread(
  163 |   request: APIRequestContext,
  164 |   page: Page,
  165 |   listingId: string,
  166 | ): Promise<string> {
  167 |   await gotoPath(page, `/app/market/negotiations?listingId=${listingId}`);
  168 |   await waitForWorkspaceReady(page);
  169 |   const inboxHeading = page.getByRole("heading", {
  170 |     name: "Inbox and thread controls on the canonical N2-A2 runtime",
  171 |   });
  172 |   const inboxLoaded = await inboxHeading.isVisible({ timeout: 10_000 }).catch(() => false);
  173 |   if (!inboxLoaded) {
  174 |     const inboxLink = page.getByRole("link", { name: /^Inbox/ });
  175 |     if (await inboxLink.isVisible().catch(() => false)) {
  176 |       await inboxLink.click();
  177 |     } else {
  178 |       await gotoPath(page, "/app/market/negotiations");
  179 |     }
  180 |   }
> 181 |   await expect(inboxHeading).toBeVisible({ timeout: 30_000 });
      |                              ^ Error: expect(locator).toBeVisible() failed
  182 |   await page.getByLabel("Listing ID").fill(listingId);
  183 |   await page.getByLabel("Offer amount").fill("385");
  184 |   await page.getByLabel("Currency").fill("GHS");
  185 |   await page.getByLabel("Buyer note").fill("Buyer opening offer for canonical thread proof.");
  186 |   await page.getByRole("button", { name: "Create offer thread" }).click();
  187 |   await expect(page.getByRole("list", { name: "Negotiation threads" })).toContainText(listingId, { timeout: 30_000 });
  188 | 
  189 |   const buyerThreadButton = page
  190 |     .getByRole("list", { name: "Negotiation threads" })
  191 |     .getByRole("button")
  192 |     .filter({ hasText: listingId })
  193 |     .first();
  194 |   await expect(buyerThreadButton).toBeVisible({ timeout: 30_000 });
  195 |   await buyerThreadButton.scrollIntoViewIfNeeded();
  196 |   await buyerThreadButton.click();
  197 | 
  198 |   const token = await page.evaluate((tokenKey) => window.localStorage.getItem(tokenKey), TOKEN_KEY);
  199 |   if (!token) {
  200 |     throw new Error("Expected buyer token in localStorage");
  201 |   }
  202 |   const threadsResponse = await request.get(`${API_BASE_URL}/api/v1/marketplace/negotiations`, {
  203 |     headers: {
  204 |       Authorization: `Bearer ${token}`,
  205 |     },
  206 |   });
  207 |   expect(threadsResponse.ok()).toBeTruthy();
  208 |   const threadsPayload = (await threadsResponse.json()) as {
  209 |     items: Array<{ listing_id: string; thread_id: string }>;
  210 |   };
  211 |   const matchingThread = threadsPayload.items.find((item) => item.listing_id === listingId);
  212 |   if (!matchingThread) {
  213 |     throw new Error(`Expected negotiation thread for listing ${listingId}`);
  214 |   }
  215 |   return matchingThread.thread_id;
  216 | }
  217 | 
  218 | async function sellerRequestConfirmation(page: Page, listingId: string): Promise<void> {
  219 |   await gotoPath(page, "/app/market/negotiations");
  220 |   await waitForWorkspaceReady(page);
  221 |   const sellerThreadList = page.getByRole("list", { name: "Negotiation threads" });
  222 |   await expect(sellerThreadList).toContainText(listingId, { timeout: 30_000 });
  223 |   await sellerThreadList.getByRole("button").filter({ hasText: listingId }).first().click();
  224 |   await expect(page.getByRole("heading", { name: "Request confirmation" })).toBeVisible({ timeout: 30_000 });
  225 |   await page.getByLabel("Checkpoint note").fill("Seller requests final buyer confirmation.");
  226 |   await page.getByRole("button", { name: "Move to pending confirmation" }).click();
  227 |   await expect(page.getByText("Pending confirmation checkpoint")).toBeVisible({ timeout: 30_000 });
  228 |   await expect(page.getByText("Waiting for authorized confirmer")).toBeVisible();
  229 |   await expect(page.getByRole("button", { name: "Approve thread" })).toHaveCount(0);
  230 |   await expect(page.getByRole("button", { name: "Reject thread" })).toHaveCount(0);
  231 | }
  232 | 
  233 | async function buyerOpenPendingConfirmationThread(page: Page, listingId: string): Promise<void> {
  234 |   await gotoPath(page, "/app/market/negotiations");
  235 |   await waitForWorkspaceReady(page);
  236 |   const buyerThreadButton = page
  237 |     .getByRole("list", { name: "Negotiation threads" })
  238 |     .getByRole("button")
  239 |     .filter({ hasText: listingId })
  240 |     .first();
  241 |   await expect(buyerThreadButton).toBeVisible({ timeout: 30_000 });
  242 |   await buyerThreadButton.scrollIntoViewIfNeeded();
  243 |   await buyerThreadButton.click();
  244 |   await expect(page.getByText("Pending confirmation checkpoint")).toBeVisible();
  245 |   await expect(page.getByRole("button", { name: "Approve thread" })).toBeVisible({ timeout: 30_000 });
  246 |   await expect(page.getByRole("button", { name: "Reject thread" })).toBeVisible({ timeout: 30_000 });
  247 | }
  248 | 
  249 | test.describe("Negotiation inbox and thread proof", () => {
  250 |   test.setTimeout(240_000);
  251 | 
  252 |   test("pending confirmation approve/reject paths lock terminal state and outsider thread access is blocked", async ({ page, request }) => {
  253 |     const timestamp = Date.now();
  254 |     const sellerIdentity = {
  255 |       displayName: "Ama Seller",
  256 |       email: `seller.negotiation.${timestamp}@example.com`,
  257 |       role: "farmer" as const,
  258 |     };
  259 |     const sellerSession = await createAuthenticatedSession(request, sellerIdentity);
  260 |     const buyerSession = await createAuthenticatedSession(request, {
  261 |       displayName: "Kofi Buyer",
  262 |       email: `buyer.negotiation.${timestamp}@example.com`,
  263 |       role: "buyer",
  264 |     });
  265 |     await activateSession(page, sellerSession, "/app/farmer");
  266 | 
  267 |     const listingIdApprove = await sellerCreateAndPublishListing(
  268 |       request,
  269 |       page,
  270 |       timestamp,
  271 |       "approve",
  272 |     );
  273 |     await activateSession(page, buyerSession, "/app/buyer");
  274 |     await buyerCreateThread(request, page, listingIdApprove);
  275 |     await activateSession(page, sellerSession, "/app/farmer");
  276 |     await sellerRequestConfirmation(page, listingIdApprove);
  277 |     await activateSession(page, buyerSession, "/app/buyer");
  278 |     await buyerOpenPendingConfirmationThread(page, listingIdApprove);
  279 |     await page.getByLabel("Decision note").fill("Buyer approves the negotiated thread.");
  280 |     await page.getByRole("button", { name: "Approve thread" }).click();
  281 |     await expect(page.getByText("Terminal-state lock is active")).toBeVisible();
```