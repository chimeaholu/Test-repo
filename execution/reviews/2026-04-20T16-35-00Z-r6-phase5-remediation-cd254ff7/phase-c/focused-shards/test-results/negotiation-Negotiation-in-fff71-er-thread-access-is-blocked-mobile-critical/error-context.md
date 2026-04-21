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

Locator: getByText('Pending confirmation checkpoint')
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for getByText('Pending confirmation checkpoint')

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
          - paragraph [ref=e21]: Ama Seller
          - heading "Ghana Growers Network" [level=1] [ref=e22]
          - paragraph [ref=e23]: seller.negotiation.1776703528231@example.com · Farmer · GH
          - paragraph [ref=e24]: This protected workspace keeps role routing, queue state, and consent posture persistent while you move between operational routes.
        - generic [ref=e25]:
          - generic [ref=e26]: Trace trace-ket-negotiations-hp0r6l
          - button "Sign out" [ref=e27] [cursor=pointer]
      - region "Sync status" [ref=e28]:
        - generic [ref=e29]:
          - generic [ref=e31]: Online
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e32]
          - paragraph [ref=e33]: "Pending items: 0. Conflicts: 0. Trace ID: trace-ket-negotiations-hp0r6l."
        - generic [ref=e34]:
          - button "Force online" [ref=e35] [cursor=pointer]
          - button "Simulate degraded" [ref=e36] [cursor=pointer]
          - button "Simulate offline" [ref=e37] [cursor=pointer]
      - generic [ref=e40]:
        - generic [ref=e41]:
          - generic [ref=e43]:
            - paragraph [ref=e44]: Offers and negotiations
            - heading "Inbox and thread controls on the canonical N2-A2 runtime" [level=2] [ref=e45]
            - paragraph [ref=e46]: Review active threads, create offers, respond with counters, and manage confirmation checkpoints without losing the audit trail.
          - generic [ref=e47]:
            - generic [ref=e48]: farmer
            - generic [ref=e49]: Pending confirmation
          - generic "Negotiation workspace posture" [ref=e50]:
            - article [ref=e51]:
              - generic [ref=e52]: Visible threads
              - strong [ref=e53]: "2"
              - paragraph [ref=e54]: Only participant threads surface in this inbox.
            - article [ref=e55]:
              - generic [ref=e56]: Selected state
              - strong [ref=e57]: Pending confirmation
              - paragraph [ref=e58]: Controls change as confirmation and terminal states evolve.
            - article [ref=e59]:
              - generic [ref=e60]: Evidence capture
              - strong [ref=e61]: Live
              - paragraph [ref=e62]: Request metadata appears after each regulated mutation.
        - generic [ref=e63]:
          - article [ref=e64]:
            - generic [ref=e66]:
              - paragraph [ref=e67]: Inbox
              - heading "Visible negotiations" [level=2] [ref=e68]
              - paragraph [ref=e69]: Only participant threads appear here. If you are not part of the negotiation, you do not see the thread or its confirmation controls.
            - generic "Inbox rules" [ref=e70]:
              - article [ref=e71]:
                - heading "Scope is enforced" [level=3] [ref=e72]
                - paragraph [ref=e73]: Threads outside your actor scope fail closed and stay out of the list.
              - article [ref=e74]:
                - heading "Status drives controls" [level=3] [ref=e75]
                - paragraph [ref=e76]: Open, pending confirmation, accepted, and rejected threads do not share the same actions.
            - list "Negotiation threads" [ref=e77]:
              - button "listing-6fc54d5ba8ee with actor-buyer-gh-buyer-negotiation-177670 Pending confirmation Offer 385 GHS Updated 4/20/2026, 4:45:49 PM Awaiting actor-buyer-gh-buyer-negotiation-177670" [ref=e78] [cursor=pointer]:
                - generic [ref=e79]:
                  - strong [ref=e80]: listing-6fc54d5ba8ee with actor-buyer-gh-buyer-negotiation-177670
                  - generic [ref=e81]: Pending confirmation
                - paragraph [ref=e82]: Offer 385 GHS
                - paragraph [ref=e83]: Updated 4/20/2026, 4:45:49 PM
                - paragraph [ref=e84]: Awaiting actor-buyer-gh-buyer-negotiation-177670
              - button "listing-0fe76cef73c3 with actor-buyer-gh-buyer-negotiation-177670 Pending confirmation Offer 385 GHS Updated 4/20/2026, 4:40:41 PM Awaiting actor-buyer-gh-buyer-negotiation-177670" [ref=e85] [cursor=pointer]:
                - generic [ref=e86]:
                  - strong [ref=e87]: listing-0fe76cef73c3 with actor-buyer-gh-buyer-negotiation-177670
                  - generic [ref=e88]: Pending confirmation
                - paragraph [ref=e89]: Offer 385 GHS
                - paragraph [ref=e90]: Updated 4/20/2026, 4:40:41 PM
                - paragraph [ref=e91]: Awaiting actor-buyer-gh-buyer-negotiation-177670
          - generic [ref=e92]:
            - article [ref=e93]:
              - generic [ref=e95]:
                - paragraph [ref=e96]: Thread
                - heading "listing-6fc54d5ba8ee with actor-buyer-gh-buyer-negotiation-177670" [level=2] [ref=e97]
                - paragraph [ref=e98]: Message history, confirmation checkpoints, and closed-state protections stay visible so both sides understand what happens next.
              - generic [ref=e99]:
                - generic [ref=e100]:
                  - generic [ref=e101]: Pending confirmation
                  - generic [ref=e102]: 385 GHS
                  - generic [ref=e103]: thread-49e527d73710
                - generic "Selected thread summary" [ref=e104]:
                  - article [ref=e105]:
                    - generic [ref=e106]: Current offer
                    - strong [ref=e107]: 385 GHS
                    - paragraph [ref=e108]: Latest commercial position for this thread.
                  - article [ref=e109]:
                    - generic [ref=e110]: Participants
                    - strong [ref=e111]: Buyer and seller only
                    - paragraph [ref=e112]: Confirmation controls are restricted to the named participant when a checkpoint exists.
                - complementary [ref=e113]:
                  - strong [ref=e114]: Waiting for confirmation
                  - paragraph [ref=e115]: "Requested by actor-farmer-gh-seller-negotiation-17767. Authorized confirmer: actor-buyer-gh-buyer-negotiation-177670."
                - generic [ref=e116]:
                  - generic [ref=e118]:
                    - generic [ref=e120]:
                      - paragraph [ref=e121]: Conversation
                      - heading "Message history" [level=2] [ref=e122]
                      - paragraph [ref=e123]: Each offer, counter, and confirmation step is added to the timeline so the commercial record is easy to follow.
                    - list [ref=e124]:
                      - listitem [ref=e125]:
                        - generic [ref=e127]:
                          - strong [ref=e128]: Offer created
                          - paragraph [ref=e129]: actor-buyer-gh-buyer-negotiation-177670 • 385 GHS
                          - paragraph [ref=e130]: Buyer opening offer for canonical thread proof.
                          - paragraph [ref=e131]: 4/20/2026, 4:45:42 PM
                      - listitem [ref=e132]:
                        - generic [ref=e134]:
                          - strong [ref=e135]: Confirmation requested
                          - paragraph [ref=e136]: actor-farmer-gh-seller-negotiation-17767
                          - paragraph [ref=e137]: Seller requests final buyer confirmation.
                          - paragraph [ref=e138]: 4/20/2026, 4:45:49 PM
                  - article [ref=e140]:
                    - complementary [ref=e141]:
                      - strong [ref=e142]: Waiting for authorized confirmer
                      - paragraph [ref=e143]: Only actor-buyer-gh-buyer-negotiation-177670 can approve or reject this checkpoint.
            - article [ref=e144]:
              - generic [ref=e146]:
                - paragraph [ref=e147]: Evidence
                - heading "Audit and idempotency cues" [level=2] [ref=e148]
                - paragraph [ref=e149]: Every regulated mutation returns request identifiers you can replay into the audit route. Repeated submits stay single-effect and clearly marked.
              - paragraph [ref=e150]: Use this panel to explain whether the last change succeeded once, replayed safely, or still needs another attempt.
              - generic [ref=e151]:
                - generic [ref=e152]:
                  - generic [ref=e153]: Confirmation requested
                  - generic [ref=e154]: Single effect
                - paragraph [ref=e155]: "Thread ID: thread-49e527d73710"
                - paragraph [ref=e156]: "Request ID: 57a9eb92-ec1a-47f2-bd49-fadf6351deb7"
                - paragraph [ref=e157]: "Idempotency key: 4748743a-526d-41c1-9fdf-4bce3826fd2e"
                - paragraph [ref=e158]: "Audit events returned: 2"
      - navigation "Mobile primary" [ref=e160]:
        - link "Home" [ref=e161] [cursor=pointer]:
          - /url: /app/farmer
          - generic [ref=e162]: Home
        - link "Market" [ref=e163] [cursor=pointer]:
          - /url: /app/market/listings
          - generic [ref=e164]: Market
        - link "Inbox" [ref=e165] [cursor=pointer]:
          - /url: /app/market/negotiations
          - generic [ref=e166]: Inbox
        - link "Alerts" [ref=e167] [cursor=pointer]:
          - /url: /app/climate/alerts
          - generic [ref=e168]: Alerts
        - link "Profile 2" [ref=e169] [cursor=pointer]:
          - /url: /app/profile
          - generic [ref=e170]: Profile
          - generic [ref=e171]: "2"
```

# Test source

```ts
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
  222 |   await expect(sellerThreadList).toContainText(listingId, { timeout: 30_000 });
  223 |   await sellerThreadList.getByRole("button").filter({ hasText: listingId }).first().click();
  224 |   await expect(page.getByRole("heading", { name: "Request confirmation" })).toBeVisible({ timeout: 30_000 });
  225 |   await page.getByLabel("Checkpoint note").fill("Seller requests final buyer confirmation.");
  226 |   await page.getByRole("button", { name: "Move to pending confirmation" }).click();
> 227 |   await expect(page.getByText("Pending confirmation checkpoint")).toBeVisible({ timeout: 30_000 });
      |                                                                   ^ Error: expect(locator).toBeVisible() failed
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