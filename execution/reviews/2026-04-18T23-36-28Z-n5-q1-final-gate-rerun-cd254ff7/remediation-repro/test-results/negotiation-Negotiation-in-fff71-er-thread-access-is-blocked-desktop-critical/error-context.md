# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: negotiation.spec.ts >> Negotiation inbox and thread proof >> pending confirmation approve/reject paths lock terminal state and outsider thread access is blocked
- Location: tests/e2e/negotiation.spec.ts:250:7

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
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - button "Open Next.js Dev Tools" [ref=e8] [cursor=pointer]:
    - img [ref=e9]
  - alert [ref=e12]: Load the right workspace without hiding the consent gate.
  - main [ref=e13]:
    - generic [ref=e14]:
      - article [ref=e15]:
        - generic [ref=e16]:
          - generic [ref=e17]: Identity
          - generic [ref=e18]: Consent gate next
        - heading "Load the right workspace without hiding the consent gate." [level=1] [ref=e19]
        - paragraph [ref=e20]: "Start with four clear fields only: name, email, role, and country pack. The next screen explains consent before any protected action is unlocked."
        - generic [ref=e21]:
          - complementary [ref=e22]:
            - strong [ref=e23]: Field-first rule
            - paragraph [ref=e24]: Keep wording short so onboarding still works when a field officer is reading instructions aloud.
          - complementary [ref=e25]:
            - strong [ref=e26]: Risk rule
            - paragraph [ref=e27]: Identity entry does not imply permission. Regulated paths stay blocked until consent is captured.
      - article [ref=e28]:
        - generic [ref=e30]:
          - paragraph [ref=e31]: Identity entry
          - heading "Sign in" [level=2] [ref=e32]
          - paragraph [ref=e33]: Use the role and country pack that match the work you need to resume.
        - generic [ref=e34]:
          - generic [ref=e35]:
            - generic [ref=e36]: Full name
            - textbox "Full name" [ref=e37]:
              - /placeholder: Ama Mensah
            - paragraph [ref=e38]: Use the name your cooperative, buyer group, or field team expects.
          - generic [ref=e39]:
            - generic [ref=e40]: Email
            - textbox "Email" [ref=e41]:
              - /placeholder: ama@example.com
            - paragraph [ref=e42]: This is used for identity recovery and route context.
          - generic [ref=e43]:
            - generic [ref=e44]: Role
            - combobox "Role" [ref=e45]:
              - option "Farmer" [selected]
              - option "Buyer"
              - option "Cooperative"
              - option "Advisor"
              - option "Finance"
              - option "Admin"
          - generic [ref=e46]:
            - generic [ref=e47]: Country pack
            - combobox "Country pack" [ref=e48]:
              - option "Ghana" [selected]
              - option "Nigeria"
              - option "Jamaica"
          - button "Continue to onboarding" [ref=e49] [cursor=pointer]
```

# Test source

```ts
  79  |       window.localStorage.setItem(tokenKey, token);
  80  |     },
  81  |     [SESSION_KEY, TOKEN_KEY, sessionSeed.session, sessionSeed.accessToken],
  82  |   );
  83  | }
  84  | 
  85  | async function activateSession(page: Page, sessionSeed: SessionSeed, route: "/app/farmer" | "/app/buyer"): Promise<void> {
  86  |   await primeSession(page, sessionSeed);
  87  |   await gotoPath(page, route);
  88  |   await waitForWorkspaceReady(page);
  89  | }
  90  | 
  91  | async function waitForWorkspaceReady(page: Page): Promise<void> {
  92  |   await page.getByText("Loading workspace").waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
  93  | }
  94  | 
  95  | async function publishListingViaCommand(
  96  |   request: APIRequestContext,
  97  |   page: Page,
  98  |   listingId: string,
  99  | ): Promise<void> {
  100 |   const token = await page.evaluate(() => window.localStorage.getItem("agrodomain.session-token.v1"));
  101 |   const sessionRaw = await page.evaluate(() => window.localStorage.getItem("agrodomain.session.v2"));
  102 |   if (!token || !sessionRaw) {
  103 |     throw new Error("Expected seller token and session in localStorage");
  104 |   }
  105 | 
  106 |   const session = JSON.parse(sessionRaw) as {
  107 |     actor: {
  108 |       actor_id: string;
  109 |       country_code: string;
  110 |     };
  111 |   };
  112 |   const requestId = crypto.randomUUID();
  113 |   const response = await request.post(`${API_BASE_URL}/api/v1/workflow/commands`, {
  114 |     data: {
  115 |       metadata: {
  116 |         request_id: requestId,
  117 |         idempotency_key: requestId,
  118 |         actor_id: session.actor.actor_id,
  119 |         country_code: session.actor.country_code,
  120 |         channel: "pwa",
  121 |         schema_version: SCHEMA_VERSION,
  122 |         correlation_id: requestId,
  123 |         occurred_at: new Date().toISOString(),
  124 |         traceability: {
  125 |           journey_ids: ["CJ-002"],
  126 |           data_check_ids: ["DI-001"],
  127 |         },
  128 |       },
  129 |       command: {
  130 |         name: "market.listings.publish",
  131 |         aggregate_ref: listingId,
  132 |         mutation_scope: "marketplace.listings",
  133 |         payload: {
  134 |           listing_id: listingId,
  135 |         },
  136 |       },
  137 |     },
  138 |     headers: {
  139 |       Authorization: `Bearer ${token}`,
  140 |     },
  141 |   });
  142 |   expect(response.ok()).toBeTruthy();
  143 | }
  144 | 
  145 | async function sellerCreateAndPublishListing(request: APIRequestContext, page: Page, timestamp: number, suffix: string): Promise<string> {
  146 |   const detailHref = await createListing(page, {
  147 |     title: `Negotiation proof cassava ${timestamp} ${suffix}`,
  148 |     commodity: "Cassava",
  149 |     quantityTons: "6.0",
  150 |     priceAmount: "400",
  151 |     priceCurrency: "GHS",
  152 |     location: "Tamale, GH",
  153 |     summary: "Published cassava listing used for canonical negotiation browser proof.",
  154 |   });
  155 |   const listingId = listingIdFromHref(detailHref);
  156 |   await publishListingViaCommand(request, page, listingId);
  157 |   return listingId;
  158 | }
  159 | 
  160 | async function buyerCreateThread(
  161 |   request: APIRequestContext,
  162 |   page: Page,
  163 |   listingId: string,
  164 | ): Promise<string> {
  165 |   await gotoPath(page, `/app/market/negotiations?listingId=${listingId}`);
  166 |   await waitForWorkspaceReady(page);
  167 |   const inboxHeading = page.getByRole("heading", {
  168 |     name: "Inbox and thread controls on the canonical N2-A2 runtime",
  169 |   });
  170 |   const inboxLoaded = await inboxHeading.isVisible({ timeout: 10_000 }).catch(() => false);
  171 |   if (!inboxLoaded) {
  172 |     const inboxLink = page.getByRole("link", { name: /^Inbox/ });
  173 |     if (await inboxLink.isVisible().catch(() => false)) {
  174 |       await inboxLink.click();
  175 |     } else {
  176 |       await gotoPath(page, "/app/market/negotiations");
  177 |     }
  178 |   }
> 179 |   await expect(inboxHeading).toBeVisible({ timeout: 30_000 });
      |                              ^ Error: expect(locator).toBeVisible() failed
  180 |   await page.getByLabel("Listing ID").fill(listingId);
  181 |   await page.getByLabel("Offer amount").fill("385");
  182 |   await page.getByLabel("Currency").fill("GHS");
  183 |   await page.getByLabel("Buyer note").fill("Buyer opening offer for canonical thread proof.");
  184 |   await page.getByRole("button", { name: "Create offer thread" }).click();
  185 |   await expect(page.getByRole("list", { name: "Negotiation threads" })).toContainText(listingId, { timeout: 30_000 });
  186 | 
  187 |   const buyerThreadButton = page
  188 |     .getByRole("list", { name: "Negotiation threads" })
  189 |     .getByRole("button")
  190 |     .filter({ hasText: listingId })
  191 |     .first();
  192 |   await expect(buyerThreadButton).toBeVisible({ timeout: 30_000 });
  193 |   await buyerThreadButton.scrollIntoViewIfNeeded();
  194 |   await buyerThreadButton.click();
  195 | 
  196 |   const token = await page.evaluate((tokenKey) => window.localStorage.getItem(tokenKey), TOKEN_KEY);
  197 |   if (!token) {
  198 |     throw new Error("Expected buyer token in localStorage");
  199 |   }
  200 |   const threadsResponse = await request.get(`${API_BASE_URL}/api/v1/marketplace/negotiations`, {
  201 |     headers: {
  202 |       Authorization: `Bearer ${token}`,
  203 |     },
  204 |   });
  205 |   expect(threadsResponse.ok()).toBeTruthy();
  206 |   const threadsPayload = (await threadsResponse.json()) as {
  207 |     items: Array<{ listing_id: string; thread_id: string }>;
  208 |   };
  209 |   const matchingThread = threadsPayload.items.find((item) => item.listing_id === listingId);
  210 |   if (!matchingThread) {
  211 |     throw new Error(`Expected negotiation thread for listing ${listingId}`);
  212 |   }
  213 |   return matchingThread.thread_id;
  214 | }
  215 | 
  216 | async function sellerRequestConfirmation(page: Page, listingId: string): Promise<void> {
  217 |   await gotoPath(page, "/app/market/negotiations");
  218 |   await waitForWorkspaceReady(page);
  219 |   const sellerThreadList = page.getByRole("list", { name: "Negotiation threads" });
  220 |   await expect(sellerThreadList).toContainText(listingId, { timeout: 30_000 });
  221 |   await sellerThreadList.getByRole("button").filter({ hasText: listingId }).first().click();
  222 |   await expect(page.getByRole("heading", { name: "Request confirmation" })).toBeVisible({ timeout: 30_000 });
  223 |   await page.getByLabel("Checkpoint note").fill("Seller requests final buyer confirmation.");
  224 |   await page.getByRole("button", { name: "Move to pending confirmation" }).click();
  225 |   await expect(page.getByText("Pending confirmation checkpoint")).toBeVisible({ timeout: 30_000 });
  226 |   await expect(page.getByText("Waiting for authorized confirmer")).toBeVisible();
  227 |   await expect(page.getByRole("button", { name: "Approve thread" })).toHaveCount(0);
  228 |   await expect(page.getByRole("button", { name: "Reject thread" })).toHaveCount(0);
  229 | }
  230 | 
  231 | async function buyerOpenPendingConfirmationThread(page: Page, listingId: string): Promise<void> {
  232 |   await gotoPath(page, "/app/market/negotiations");
  233 |   await waitForWorkspaceReady(page);
  234 |   const buyerThreadButton = page
  235 |     .getByRole("list", { name: "Negotiation threads" })
  236 |     .getByRole("button")
  237 |     .filter({ hasText: listingId })
  238 |     .first();
  239 |   await expect(buyerThreadButton).toBeVisible({ timeout: 30_000 });
  240 |   await buyerThreadButton.scrollIntoViewIfNeeded();
  241 |   await buyerThreadButton.click();
  242 |   await expect(page.getByText("Pending confirmation checkpoint")).toBeVisible();
  243 |   await expect(page.getByRole("button", { name: "Approve thread" })).toBeVisible({ timeout: 30_000 });
  244 |   await expect(page.getByRole("button", { name: "Reject thread" })).toBeVisible({ timeout: 30_000 });
  245 | }
  246 | 
  247 | test.describe("Negotiation inbox and thread proof", () => {
  248 |   test.setTimeout(240_000);
  249 | 
  250 |   test("pending confirmation approve/reject paths lock terminal state and outsider thread access is blocked", async ({ page, request }) => {
  251 |     const timestamp = Date.now();
  252 |     const sellerIdentity = {
  253 |       displayName: "Ama Seller",
  254 |       email: `seller.negotiation.${timestamp}@example.com`,
  255 |       role: "farmer" as const,
  256 |     };
  257 |     const sellerSession = await createAuthenticatedSession(request, sellerIdentity);
  258 |     const buyerSession = await createAuthenticatedSession(request, {
  259 |       displayName: "Kofi Buyer",
  260 |       email: `buyer.negotiation.${timestamp}@example.com`,
  261 |       role: "buyer",
  262 |     });
  263 |     await activateSession(page, sellerSession, "/app/farmer");
  264 | 
  265 |     const listingIdApprove = await sellerCreateAndPublishListing(
  266 |       request,
  267 |       page,
  268 |       timestamp,
  269 |       "approve",
  270 |     );
  271 |     await activateSession(page, buyerSession, "/app/buyer");
  272 |     await buyerCreateThread(request, page, listingIdApprove);
  273 |     await activateSession(page, sellerSession, "/app/farmer");
  274 |     await sellerRequestConfirmation(page, listingIdApprove);
  275 |     await activateSession(page, buyerSession, "/app/buyer");
  276 |     await buyerOpenPendingConfirmationThread(page, listingIdApprove);
  277 |     await page.getByLabel("Decision note").fill("Buyer approves the negotiated thread.");
  278 |     await page.getByRole("button", { name: "Approve thread" }).click();
  279 |     await expect(page.getByText("Terminal-state lock is active")).toBeVisible();
```