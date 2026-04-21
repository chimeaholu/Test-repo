# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: negotiation.spec.ts >> Negotiation inbox and thread proof >> pending confirmation approve/reject paths lock terminal state and outsider thread access is blocked
- Location: tests/e2e/negotiation.spec.ts:251:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Waiting for authorized confirmer')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByText('Waiting for authorized confirmer')

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
            - generic [ref=e19]: Buyer
            - generic [ref=e20]: GH
          - paragraph [ref=e21]: Kofi Buyer
          - heading "Ghana Growers Network" [level=1] [ref=e22]
          - paragraph [ref=e23]: buyer.negotiation.1776703994533@example.com · Buyer · GH
          - paragraph [ref=e24]: This protected workspace keeps role routing, queue state, and consent posture persistent while you move between operational routes.
        - generic [ref=e25]:
          - generic [ref=e26]: Trace trace-ket-negotiations-xhod40
          - button "Sign out" [ref=e27] [cursor=pointer]
      - region "Sync status" [ref=e28]:
        - generic [ref=e29]:
          - generic [ref=e31]: Online
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e32]
          - paragraph [ref=e33]: "Pending items: 0. Conflicts: 0. Trace ID: trace-ket-negotiations-xhod40."
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
                - heading "Buyer operations" [level=2] [ref=e45]
                - paragraph [ref=e46]: The workspace routes to the correct role surface while keeping consent, queue, and offline state visible.
              - navigation "Primary" [ref=e47]:
                - generic [ref=e48]:
                  - link "Home" [ref=e49] [cursor=pointer]:
                    - /url: /app/buyer
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
                - strong [ref=e63]: /app/buyer
              - listitem [ref=e64]:
                - generic [ref=e65]: Field posture
                - strong [ref=e66]: Offer work
              - listitem [ref=e67]:
                - generic [ref=e68]: Proof posture
                - strong [ref=e69]: Proof before commitment
            - complementary [ref=e70]:
              - strong [ref=e71]: Design note
              - paragraph [ref=e72]: Listing proof, identity state, and queue continuity appear before deal actions.
        - generic [ref=e74]:
          - generic [ref=e75]:
            - generic [ref=e77]:
              - paragraph [ref=e78]: Offers and negotiations
              - heading "Inbox and thread controls on the canonical N2-A2 runtime" [level=2] [ref=e79]
              - paragraph [ref=e80]: Review active threads, create offers, respond with counters, and manage confirmation checkpoints without losing the audit trail.
            - generic [ref=e81]:
              - generic [ref=e82]: buyer
              - generic [ref=e83]: Pending confirmation
            - generic "Negotiation workspace posture" [ref=e84]:
              - article [ref=e85]:
                - generic [ref=e86]: Visible threads
                - strong [ref=e87]: "1"
                - paragraph [ref=e88]: Only participant threads surface in this inbox.
              - article [ref=e89]:
                - generic [ref=e90]: Selected state
                - strong [ref=e91]: Pending confirmation
                - paragraph [ref=e92]: Controls change as confirmation and terminal states evolve.
              - article [ref=e93]:
                - generic [ref=e94]: Evidence capture
                - strong [ref=e95]: Pending action
                - paragraph [ref=e96]: Request metadata appears after each regulated mutation.
          - generic [ref=e97]:
            - article [ref=e98]:
              - generic [ref=e100]:
                - paragraph [ref=e101]: Inbox
                - heading "Visible negotiations" [level=2] [ref=e102]
                - paragraph [ref=e103]: Only participant threads appear here. If you are not part of the negotiation, you do not see the thread or its confirmation controls.
              - generic "Inbox rules" [ref=e104]:
                - article [ref=e105]:
                  - heading "Scope is enforced" [level=3] [ref=e106]
                  - paragraph [ref=e107]: Threads outside your actor scope fail closed and stay out of the list.
                - article [ref=e108]:
                  - heading "Status drives controls" [level=3] [ref=e109]
                  - paragraph [ref=e110]: Open, pending confirmation, accepted, and rejected threads do not share the same actions.
              - list "Negotiation threads" [ref=e111]:
                - button "listing-e7eba38630c8 with actor-farmer-gh-seller-negotiation-17767 Pending confirmation Offer 385 GHS Updated 4/20/2026, 4:53:41 PM Awaiting actor-buyer-gh-buyer-negotiation-177670" [active] [ref=e112] [cursor=pointer]:
                  - generic [ref=e113]:
                    - strong [ref=e114]: listing-e7eba38630c8 with actor-farmer-gh-seller-negotiation-17767
                    - generic [ref=e115]: Pending confirmation
                  - paragraph [ref=e116]: Offer 385 GHS
                  - paragraph [ref=e117]: Updated 4/20/2026, 4:53:41 PM
                  - paragraph [ref=e118]: Awaiting actor-buyer-gh-buyer-negotiation-177670
            - generic [ref=e119]:
              - article [ref=e120]:
                - generic [ref=e122]:
                  - paragraph [ref=e123]: Open offer
                  - heading "Buyer offer composer" [level=2] [ref=e124]
                  - paragraph [ref=e125]: Start with a published lot, submit one canonical offer, and keep the result visible if the request is replayed or retried.
                - paragraph [ref=e126]: This composer is buyer-only and assumes the lot has already passed the buyer-safe visibility boundary.
                - generic [ref=e127]:
                  - generic [ref=e128]:
                    - generic [ref=e129]: Listing ID
                    - textbox "Listing ID" [ref=e130]
                    - paragraph [ref=e131]: Use a published listing id. Owner and unpublished listings fail closed.
                  - generic [ref=e132]:
                    - generic [ref=e133]:
                      - generic [ref=e134]: Offer amount
                      - spinbutton "Offer amount" [ref=e135]: "500"
                    - generic [ref=e136]:
                      - generic [ref=e137]: Currency
                      - textbox "Currency" [ref=e138]: GHS
                  - generic [ref=e139]:
                    - generic [ref=e140]: Buyer note
                    - textbox "Buyer note" [ref=e141]
                  - button "Create offer thread" [ref=e142] [cursor=pointer]
              - article [ref=e143]:
                - generic [ref=e145]:
                  - paragraph [ref=e146]: Thread
                  - heading "listing-e7eba38630c8 with actor-farmer-gh-seller-negotiation-17767" [level=2] [ref=e147]
                  - paragraph [ref=e148]: Message history, confirmation checkpoints, and closed-state protections stay visible so both sides understand what happens next.
                - generic [ref=e149]:
                  - generic [ref=e150]:
                    - generic [ref=e151]: Pending confirmation
                    - generic [ref=e152]: 385 GHS
                    - generic [ref=e153]: thread-3b5ba281a874
                  - generic "Selected thread summary" [ref=e154]:
                    - article [ref=e155]:
                      - generic [ref=e156]: Current offer
                      - strong [ref=e157]: 385 GHS
                      - paragraph [ref=e158]: Latest commercial position for this thread.
                    - article [ref=e159]:
                      - generic [ref=e160]: Participants
                      - strong [ref=e161]: Buyer and seller only
                      - paragraph [ref=e162]: Confirmation controls are restricted to the named participant when a checkpoint exists.
                  - complementary [ref=e163]:
                    - strong [ref=e164]: Waiting for confirmation
                    - paragraph [ref=e165]: "Requested by actor-farmer-gh-seller-negotiation-17767. Authorized confirmer: actor-buyer-gh-buyer-negotiation-177670."
                  - generic [ref=e166]:
                    - generic [ref=e168]:
                      - generic [ref=e170]:
                        - paragraph [ref=e171]: Conversation
                        - heading "Message history" [level=2] [ref=e172]
                        - paragraph [ref=e173]: Each offer, counter, and confirmation step is added to the timeline so the commercial record is easy to follow.
                      - list [ref=e174]:
                        - listitem [ref=e175]:
                          - generic [ref=e177]:
                            - strong [ref=e178]: Offer created
                            - paragraph [ref=e179]: actor-buyer-gh-buyer-negotiation-177670 • 385 GHS
                            - paragraph [ref=e180]: Buyer opening offer for canonical thread proof.
                            - paragraph [ref=e181]: 4/20/2026, 4:53:34 PM
                        - listitem [ref=e182]:
                          - generic [ref=e184]:
                            - strong [ref=e185]: Confirmation requested
                            - paragraph [ref=e186]: actor-farmer-gh-seller-negotiation-17767
                            - paragraph [ref=e187]: Seller requests final buyer confirmation.
                            - paragraph [ref=e188]: 4/20/2026, 4:53:41 PM
                    - article [ref=e190]:
                      - generic [ref=e192]:
                        - paragraph [ref=e193]: Authorized confirmer
                        - heading "Approve or reject" [level=2] [ref=e194]
                        - paragraph [ref=e195]: These terminal controls render only for the actor named in the checkpoint. Approval and rejection both clear the checkpoint server-side.
                      - generic [ref=e196]:
                        - generic [ref=e197]:
                          - generic [ref=e198]: Decision note
                          - textbox "Decision note" [ref=e199]
                        - generic [ref=e200]:
                          - button "Approve thread" [ref=e201] [cursor=pointer]
                          - button "Reject thread" [ref=e202] [cursor=pointer]
              - article [ref=e203]:
                - generic [ref=e205]:
                  - paragraph [ref=e206]: Evidence
                  - heading "Audit and idempotency cues" [level=2] [ref=e207]
                  - paragraph [ref=e208]: Every regulated mutation returns request identifiers you can replay into the audit route. Repeated submits stay single-effect and clearly marked.
                - paragraph [ref=e209]: Use this panel to explain whether the last change succeeded once, replayed safely, or still needs another attempt.
                - complementary [ref=e210]:
                  - strong [ref=e211]: No mutation evidence captured yet
                  - paragraph [ref=e212]: Create or update a thread to surface request metadata, replay state, and audit evidence from the canonical audit route.
```

# Test source

```ts
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
  227 |   await expect(page.getByText("Waiting for authorized confirmer")).toBeVisible({ timeout: 30_000 });
  228 |   await expect(page.getByRole("button", { name: "Approve thread" })).toHaveCount(0);
  229 |   await expect(page.getByRole("button", { name: "Reject thread" })).toHaveCount(0);
  230 | }
  231 | 
  232 | async function buyerOpenPendingConfirmationThread(page: Page, listingId: string): Promise<void> {
  233 |   await gotoPath(page, "/app/market/negotiations");
  234 |   await waitForWorkspaceReady(page);
  235 |   const buyerThreadButton = page
  236 |     .getByRole("list", { name: "Negotiation threads" })
  237 |     .getByRole("button")
  238 |     .filter({ hasText: listingId })
  239 |     .first();
  240 |   await expect(buyerThreadButton).toBeVisible({ timeout: 30_000 });
  241 |   await buyerThreadButton.scrollIntoViewIfNeeded();
  242 |   await buyerThreadButton.click();
> 243 |   await expect(page.getByText("Waiting for authorized confirmer")).toBeVisible();
      |                                                                    ^ Error: expect(locator).toBeVisible() failed
  244 |   await expect(page.getByRole("button", { name: "Approve thread" })).toBeVisible({ timeout: 30_000 });
  245 |   await expect(page.getByRole("button", { name: "Reject thread" })).toBeVisible({ timeout: 30_000 });
  246 | }
  247 | 
  248 | test.describe("Negotiation inbox and thread proof", () => {
  249 |   test.setTimeout(240_000);
  250 | 
  251 |   test("pending confirmation approve/reject paths lock terminal state and outsider thread access is blocked", async ({ page, request }) => {
  252 |     const timestamp = Date.now();
  253 |     const sellerIdentity = {
  254 |       displayName: "Ama Seller",
  255 |       email: `seller.negotiation.${timestamp}@example.com`,
  256 |       role: "farmer" as const,
  257 |     };
  258 |     const sellerSession = await createAuthenticatedSession(request, sellerIdentity);
  259 |     const buyerSession = await createAuthenticatedSession(request, {
  260 |       displayName: "Kofi Buyer",
  261 |       email: `buyer.negotiation.${timestamp}@example.com`,
  262 |       role: "buyer",
  263 |     });
  264 |     await activateSession(page, sellerSession, "/app/farmer");
  265 | 
  266 |     const listingIdApprove = await sellerCreateAndPublishListing(
  267 |       request,
  268 |       page,
  269 |       timestamp,
  270 |       "approve",
  271 |     );
  272 |     await activateSession(page, buyerSession, "/app/buyer");
  273 |     await buyerCreateThread(request, page, listingIdApprove);
  274 |     await activateSession(page, sellerSession, "/app/farmer");
  275 |     await sellerRequestConfirmation(page, listingIdApprove);
  276 |     await activateSession(page, buyerSession, "/app/buyer");
  277 |     await buyerOpenPendingConfirmationThread(page, listingIdApprove);
  278 |     await page.getByLabel("Decision note").fill("Buyer approves the negotiated thread.");
  279 |     await page.getByRole("button", { name: "Approve thread" }).click();
  280 |     await expect(page.getByText("Terminal-state lock is active")).toBeVisible();
  281 |     await expect(page.getByText("Thread status is accepted.")).toBeVisible();
  282 |     await expect(page.getByRole("button", { name: "Submit counter" })).toHaveCount(0);
  283 |     await expect(page.getByRole("button", { name: "Move to pending confirmation" })).toHaveCount(0);
  284 | 
  285 |     await activateSession(page, sellerSession, "/app/farmer");
  286 |     const listingIdReject = await sellerCreateAndPublishListing(
  287 |       request,
  288 |       page,
  289 |       timestamp,
  290 |       "reject",
  291 |     );
  292 |     await activateSession(page, buyerSession, "/app/buyer");
  293 |     const rejectedThreadId = await buyerCreateThread(request, page, listingIdReject);
  294 |     await activateSession(page, sellerSession, "/app/farmer");
  295 |     await sellerRequestConfirmation(page, listingIdReject);
  296 |     await activateSession(page, buyerSession, "/app/buyer");
  297 |     await buyerOpenPendingConfirmationThread(page, listingIdReject);
  298 |     await page.getByLabel("Decision note").fill("Buyer rejects this thread.");
  299 |     await page.getByRole("button", { name: "Reject thread" }).click();
  300 |     await expect(page.getByText("Terminal-state lock is active")).toBeVisible();
  301 |     await expect(page.getByText("Thread status is rejected.")).toBeVisible();
  302 |     await expect(page.getByRole("button", { name: "Submit counter" })).toHaveCount(0);
  303 | 
  304 |     const outsiderSession = await createAuthenticatedSession(request, {
  305 |       displayName: "Nana Outsider",
  306 |       email: `outsider.negotiation.${timestamp}@example.com`,
  307 |       role: "buyer",
  308 |     });
  309 |     await activateSession(page, outsiderSession, "/app/buyer");
  310 |     await gotoPath(page, `/app/market/negotiations?threadId=${rejectedThreadId}`);
  311 |     await expect(page.getByText("Thread not available in your actor scope")).toBeVisible();
  312 |   });
  313 | });
  314 | 
```