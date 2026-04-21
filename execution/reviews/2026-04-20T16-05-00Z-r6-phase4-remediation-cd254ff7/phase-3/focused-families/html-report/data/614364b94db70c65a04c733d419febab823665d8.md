# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: negotiation.spec.ts >> Negotiation inbox and thread proof >> pending confirmation approve/reject paths lock terminal state and outsider thread access is blocked
- Location: tests/e2e/negotiation.spec.ts:252:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('list', { name: 'Negotiation threads' })
Expected substring: "listing-7a18c0f1b3a4"
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 30000ms
  - waiting for getByRole('list', { name: 'Negotiation threads' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - alert [ref=e3]: Sign in to the right workspace without skipping access controls.
  - main [ref=e4]:
    - generic [ref=e5]:
      - article [ref=e6]:
        - generic [ref=e7]:
          - generic [ref=e8]: Identity check
          - generic [ref=e9]: Consent required next
        - heading "Sign in to the right workspace without skipping access controls." [level=1] [ref=e10]
        - paragraph [ref=e11]: Enter your name, work email, role, and operating country. Agrodomain routes you to the correct workspace, then asks for consent before any protected work begins.
        - generic [ref=e12]:
          - complementary [ref=e13]:
            - strong [ref=e14]: Field-first rule
            - paragraph [ref=e15]: Use the same identity details your team already uses so handoffs, recovery, and audit history remain clear.
          - complementary [ref=e16]:
            - strong [ref=e17]: Risk rule
            - paragraph [ref=e18]: Signing in identifies you. It does not authorize regulated actions until consent is granted.
        - generic "What happens next" [ref=e19]:
          - article [ref=e20]:
            - generic [ref=e21]: Step 1
            - strong [ref=e22]: Identity is recorded
            - paragraph [ref=e23]: Your role, email, and operating country are attached to the active session.
          - article [ref=e24]:
            - generic [ref=e25]: Step 2
            - strong [ref=e26]: Consent stays separate
            - paragraph [ref=e27]: The next route explains what is captured and what remains blocked.
          - article [ref=e28]:
            - generic [ref=e29]: Step 3
            - strong [ref=e30]: Routing happens after review
            - paragraph [ref=e31]: The workspace opens only after policy capture is complete.
      - article [ref=e32]:
        - generic [ref=e34]:
          - paragraph [ref=e35]: Identity entry
          - heading "Enter your work details" [level=2] [ref=e36]
          - paragraph [ref=e37]: Choose the role and country that match the work you need to resume today.
        - generic [ref=e38]:
          - paragraph [ref=e39]: Use the identity details attached to the work you need to resume. You can review consent before any protected action is enabled.
          - generic [ref=e40]:
            - generic [ref=e41]: Full name
            - textbox "Full name" [ref=e42]:
              - /placeholder: Ama Mensah
            - paragraph [ref=e43]: Use the name your cooperative, buyer group, or field team expects.
          - generic [ref=e44]:
            - generic [ref=e45]: Email
            - textbox "Email" [ref=e46]:
              - /placeholder: ama@example.com
            - paragraph [ref=e47]: This is used for account recovery, notifications, and route context.
          - generic [ref=e48]:
            - generic [ref=e49]: Role
            - combobox "Role" [ref=e50]:
              - option "Farmer" [selected]
              - option "Buyer"
              - option "Cooperative"
              - option "Advisor"
              - option "Finance"
              - option "Admin"
            - paragraph [ref=e51]: Choose the workspace you need today. This determines the protected route you reach after consent.
          - generic [ref=e52]:
            - generic [ref=e53]: Country pack
            - combobox "Country pack" [ref=e54]:
              - option "Ghana" [selected]
              - option "Nigeria"
              - option "Jamaica"
            - paragraph [ref=e55]: Country scope affects policy text, route framing, and operational context.
          - generic [ref=e56]:
            - button "Continue to onboarding" [ref=e57] [cursor=pointer]
            - paragraph [ref=e58]: No protected work is unlocked on this route.
        - generic "Route guarantees" [ref=e59]:
          - article [ref=e60]:
            - heading "Visible next step" [level=3] [ref=e61]
            - paragraph [ref=e62]: The route does not skip directly into a workspace. Consent review is always shown next.
          - article [ref=e63]:
            - heading "Clear accountability" [level=3] [ref=e64]
            - paragraph [ref=e65]: Your session identity is what later connects recovery events, approvals, and audit trails.
```

# Test source

```ts
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
  181 |   await expect(inboxHeading).toBeVisible({ timeout: 30_000 });
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
> 222 |   await expect(sellerThreadList).toContainText(listingId, { timeout: 30_000 });
      |                                  ^ Error: expect(locator).toContainText(expected) failed
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
  282 |     await expect(page.getByText("Thread status is accepted.")).toBeVisible();
  283 |     await expect(page.getByRole("button", { name: "Submit counter" })).toHaveCount(0);
  284 |     await expect(page.getByRole("button", { name: "Move to pending confirmation" })).toHaveCount(0);
  285 | 
  286 |     await activateSession(page, sellerSession, "/app/farmer");
  287 |     const listingIdReject = await sellerCreateAndPublishListing(
  288 |       request,
  289 |       page,
  290 |       timestamp,
  291 |       "reject",
  292 |     );
  293 |     await activateSession(page, buyerSession, "/app/buyer");
  294 |     const rejectedThreadId = await buyerCreateThread(request, page, listingIdReject);
  295 |     await activateSession(page, sellerSession, "/app/farmer");
  296 |     await sellerRequestConfirmation(page, listingIdReject);
  297 |     await activateSession(page, buyerSession, "/app/buyer");
  298 |     await buyerOpenPendingConfirmationThread(page, listingIdReject);
  299 |     await page.getByLabel("Decision note").fill("Buyer rejects this thread.");
  300 |     await page.getByRole("button", { name: "Reject thread" }).click();
  301 |     await expect(page.getByText("Terminal-state lock is active")).toBeVisible();
  302 |     await expect(page.getByText("Thread status is rejected.")).toBeVisible();
  303 |     await expect(page.getByRole("button", { name: "Submit counter" })).toHaveCount(0);
  304 | 
  305 |     const outsiderSession = await createAuthenticatedSession(request, {
  306 |       displayName: "Nana Outsider",
  307 |       email: `outsider.negotiation.${timestamp}@example.com`,
  308 |       role: "buyer",
  309 |     });
  310 |     await activateSession(page, outsiderSession, "/app/buyer");
  311 |     await gotoPath(page, `/app/market/negotiations?threadId=${rejectedThreadId}`);
  312 |     await expect(page.getByText("Thread not available in your actor scope")).toBeVisible();
  313 |   });
  314 | });
  315 | 
```