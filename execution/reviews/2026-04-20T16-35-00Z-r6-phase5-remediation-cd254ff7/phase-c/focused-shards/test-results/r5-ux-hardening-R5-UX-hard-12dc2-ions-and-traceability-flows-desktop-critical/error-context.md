# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: r5-ux-hardening.spec.ts >> R5 UX hardening proof >> captures seeded marketplace, wallet, notifications, and traceability flows
- Location: tests/e2e/r5-ux-hardening.spec.ts:337:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Track every live negotiation in one place' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('heading', { name: 'Track every live negotiation in one place' })

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
            - generic [ref=e19]: Buyer
            - generic [ref=e20]: GH
          - paragraph [ref=e21]: R5 Buyer
          - heading "Ghana Growers Network" [level=1] [ref=e22]
          - paragraph [ref=e23]: r5.buyer.1776703334743@example.com · Buyer · GH
          - paragraph [ref=e24]: This protected workspace keeps role routing, queue state, and consent posture persistent while you move between operational routes.
        - generic [ref=e25]:
          - generic [ref=e26]: Trace trace-ket-negotiations-sq2s1q
          - button "Sign out" [ref=e27] [cursor=pointer]
      - region "Sync status" [ref=e28]:
        - generic [ref=e29]:
          - generic [ref=e31]: Online
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e32]
          - paragraph [ref=e33]: "Pending items: 0. Conflicts: 0. Trace ID: trace-ket-negotiations-sq2s1q."
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
              - generic [ref=e83]: Accepted
            - generic "Negotiation workspace posture" [ref=e84]:
              - article [ref=e85]:
                - generic [ref=e86]: Visible threads
                - strong [ref=e87]: "1"
                - paragraph [ref=e88]: Only participant threads surface in this inbox.
              - article [ref=e89]:
                - generic [ref=e90]: Selected state
                - strong [ref=e91]: Accepted
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
                - button "listing-4bbbe00a8582 with actor-farmer-gh-r5-seller-1776703334743 Accepted Offer 405 GHS Updated 4/20/2026, 4:42:31 PM" [ref=e112] [cursor=pointer]:
                  - generic [ref=e113]:
                    - strong [ref=e114]: listing-4bbbe00a8582 with actor-farmer-gh-r5-seller-1776703334743
                    - generic [ref=e115]: Accepted
                  - paragraph [ref=e116]: Offer 405 GHS
                  - paragraph [ref=e117]: Updated 4/20/2026, 4:42:31 PM
            - generic [ref=e118]:
              - article [ref=e119]:
                - generic [ref=e121]:
                  - paragraph [ref=e122]: Open offer
                  - heading "Buyer offer composer" [level=2] [ref=e123]
                  - paragraph [ref=e124]: Start with a published lot, submit one canonical offer, and keep the result visible if the request is replayed or retried.
                - paragraph [ref=e125]: This composer is buyer-only and assumes the lot has already passed the buyer-safe visibility boundary.
                - generic [ref=e126]:
                  - generic [ref=e127]:
                    - generic [ref=e128]: Listing ID
                    - textbox "Listing ID" [ref=e129]: listing-4bbbe00a8582
                    - paragraph [ref=e130]: Use a published listing id. Owner and unpublished listings fail closed.
                  - generic [ref=e131]:
                    - generic [ref=e132]:
                      - generic [ref=e133]: Offer amount
                      - spinbutton "Offer amount" [ref=e134]: "500"
                    - generic [ref=e135]:
                      - generic [ref=e136]: Currency
                      - textbox "Currency" [ref=e137]: GHS
                  - generic [ref=e138]:
                    - generic [ref=e139]: Buyer note
                    - textbox "Buyer note" [ref=e140]
                  - button "Create offer thread" [ref=e141] [cursor=pointer]
              - article [ref=e142]:
                - generic [ref=e144]:
                  - paragraph [ref=e145]: Thread
                  - heading "listing-4bbbe00a8582 with actor-farmer-gh-r5-seller-1776703334743" [level=2] [ref=e146]
                  - paragraph [ref=e147]: Message history, confirmation checkpoints, and closed-state protections stay visible so both sides understand what happens next.
                - generic [ref=e148]:
                  - generic [ref=e149]:
                    - generic [ref=e150]: Accepted
                    - generic [ref=e151]: 405 GHS
                    - generic [ref=e152]: thread-b5fef0762472
                  - generic "Selected thread summary" [ref=e153]:
                    - article [ref=e154]:
                      - generic [ref=e155]: Current offer
                      - strong [ref=e156]: 405 GHS
                      - paragraph [ref=e157]: Latest commercial position for this thread.
                    - article [ref=e158]:
                      - generic [ref=e159]: Participants
                      - strong [ref=e160]: Buyer and seller only
                      - paragraph [ref=e161]: Confirmation controls are restricted to the named participant when a checkpoint exists.
                  - complementary [ref=e162]:
                    - strong [ref=e163]: Terminal-state lock is active
                    - paragraph [ref=e164]: Thread status is accepted. Counter and confirmation-request controls are intentionally disabled because the thread is already closed.
                  - generic [ref=e167]:
                    - generic [ref=e169]:
                      - paragraph [ref=e170]: Conversation
                      - heading "Message history" [level=2] [ref=e171]
                      - paragraph [ref=e172]: Each offer, counter, and confirmation step is added to the timeline so the commercial record is easy to follow.
                    - list [ref=e173]:
                      - listitem [ref=e174]:
                        - generic [ref=e176]:
                          - strong [ref=e177]: Offer created
                          - paragraph [ref=e178]: actor-buyer-gh-r5-buyer-1776703334743 • 405 GHS
                          - paragraph [ref=e179]: R5 buyer offer
                          - paragraph [ref=e180]: 4/20/2026, 4:42:31 PM
                      - listitem [ref=e181]:
                        - generic [ref=e183]:
                          - strong [ref=e184]: Confirmation requested
                          - paragraph [ref=e185]: actor-farmer-gh-r5-seller-1776703334743
                          - paragraph [ref=e186]: Seller requests final confirmation.
                          - paragraph [ref=e187]: 4/20/2026, 4:42:31 PM
                      - listitem [ref=e188]:
                        - generic [ref=e190]:
                          - strong [ref=e191]: Confirmation approved
                          - paragraph [ref=e192]: actor-buyer-gh-r5-buyer-1776703334743
                          - paragraph [ref=e193]: Buyer approves accepted thread.
                          - paragraph [ref=e194]: 4/20/2026, 4:42:31 PM
              - article [ref=e196]:
                - generic [ref=e198]:
                  - paragraph [ref=e199]: Evidence
                  - heading "Audit and idempotency cues" [level=2] [ref=e200]
                  - paragraph [ref=e201]: Every regulated mutation returns request identifiers you can replay into the audit route. Repeated submits stay single-effect and clearly marked.
                - paragraph [ref=e202]: Use this panel to explain whether the last change succeeded once, replayed safely, or still needs another attempt.
                - complementary [ref=e203]:
                  - strong [ref=e204]: No mutation evidence captured yet
                  - paragraph [ref=e205]: Create or update a thread to surface request metadata, replay state, and audit evidence from the canonical audit route.
```

# Test source

```ts
  333 |     await assertA11ySmoke(page);
  334 |     await captureProof(page, testInfo, "04-role-home");
  335 |   });
  336 | 
  337 |   test("captures seeded marketplace, wallet, notifications, and traceability flows", async ({ page, request }, testInfo) => {
  338 |     const stamp = Date.now();
  339 |     const seller = await createAuthenticatedSession(request, {
  340 |       displayName: "R5 Seller",
  341 |       email: `r5.seller.${stamp}@example.com`,
  342 |       role: "farmer",
  343 |       scopeIds: ["identity.core", "workflow.audit", "traceability.runtime"],
  344 |     });
  345 |     const buyer = await createAuthenticatedSession(request, {
  346 |       displayName: "R5 Buyer",
  347 |       email: `r5.buyer.${stamp}@example.com`,
  348 |       role: "buyer",
  349 |       scopeIds: ["identity.core", "workflow.audit", "notifications.delivery"],
  350 |     });
  351 | 
  352 |     await primeSession(page, seller);
  353 |     await gotoPath(page, "/app/market/listings");
  354 |     await expect(page.getByRole("heading", { name: "Create, revise, and publish inventory with clear market status" })).toBeVisible();
  355 |     await assertA11ySmoke(page);
  356 |     await captureProof(page, testInfo, "05-market-listings");
  357 | 
  358 |     const detailHref = await createListing(page, {
  359 |       title: `R5 listing ${stamp}`,
  360 |       commodity: "Cassava",
  361 |       quantityTons: "5.0",
  362 |       priceAmount: "420",
  363 |       priceCurrency: "GHS",
  364 |       location: "Tamale, GH",
  365 |       summary: "Accepted negotiation route proof for wallet, notifications, and listing detail.",
  366 |     });
  367 |     const listingId = listingIdFromHref(detailHref);
  368 |     await gotoPath(page, detailHref);
  369 |     await expect(page.getByText(`R5 listing ${stamp}`).first()).toBeVisible();
  370 |     await assertA11ySmoke(page);
  371 |     await captureProof(page, testInfo, "06-market-listing-detail");
  372 | 
  373 |     await publishListingViaCommand(
  374 |       request,
  375 |       seller.accessToken,
  376 |       seller.session.actor.actor_id,
  377 |       seller.session.actor.country_code,
  378 |       listingId,
  379 |     );
  380 | 
  381 |     await requestNegotiationCommand(
  382 |       request,
  383 |       buyer.accessToken,
  384 |       buyer.session.actor.actor_id,
  385 |       buyer.session.actor.country_code,
  386 |       "market.negotiations.create",
  387 |       listingId,
  388 |       {
  389 |         listing_id: listingId,
  390 |         offer_amount: 405,
  391 |         offer_currency: "GHS",
  392 |         note: "R5 buyer offer",
  393 |       },
  394 |     );
  395 |     const threadsResponse = await request.get(`${API_BASE_URL}/api/v1/marketplace/negotiations`, {
  396 |       headers: { Authorization: `Bearer ${buyer.accessToken}` },
  397 |     });
  398 |     expect(threadsResponse.ok()).toBeTruthy();
  399 |     const threadPayload = (await threadsResponse.json()) as {
  400 |       items: Array<{ listing_id: string; thread_id: string }>;
  401 |     };
  402 |     const threadId = threadPayload.items.find((item) => item.listing_id === listingId)?.thread_id;
  403 |     expect(threadId).toBeTruthy();
  404 | 
  405 |     await requestNegotiationCommand(
  406 |       request,
  407 |       seller.accessToken,
  408 |       seller.session.actor.actor_id,
  409 |       seller.session.actor.country_code,
  410 |       "market.negotiations.confirm.request",
  411 |       threadId!,
  412 |       {
  413 |         thread_id: threadId,
  414 |         required_confirmer_actor_id: buyer.session.actor.actor_id,
  415 |         note: "Seller requests final confirmation.",
  416 |       },
  417 |     );
  418 |     await requestNegotiationCommand(
  419 |       request,
  420 |       buyer.accessToken,
  421 |       buyer.session.actor.actor_id,
  422 |       buyer.session.actor.country_code,
  423 |       "market.negotiations.confirm.approve",
  424 |       threadId!,
  425 |       {
  426 |         thread_id: threadId,
  427 |         note: "Buyer approves accepted thread.",
  428 |       },
  429 |     );
  430 | 
  431 |     await primeSession(page, buyer);
  432 |     await gotoPath(page, `/app/market/negotiations?listingId=${listingId}&threadId=${threadId}`);
> 433 |     await expect(page.getByRole("heading", { name: "Track every live negotiation in one place" })).toBeVisible();
      |                                                                                                    ^ Error: expect(locator).toBeVisible() failed
  434 |     await assertA11ySmoke(page);
  435 |     await captureProof(page, testInfo, "07-negotiation");
  436 | 
  437 |     await gotoPath(page, "/app/payments/wallet");
  438 |     await expect(page.getByRole("heading", { name: "Track balances, escrow, and settlement exceptions" })).toBeVisible();
  439 |     const startEscrow = page.getByRole("button", { name: "Start escrow" });
  440 |     if (await startEscrow.isVisible().catch(() => false)) {
  441 |       await startEscrow.click();
  442 |       await expect(page.getByRole("button", { name: "Mark as partner pending" })).toBeVisible({ timeout: 30_000 });
  443 |       await page.getByRole("button", { name: "Mark as partner pending" }).click();
  444 |     }
  445 |     await assertA11ySmoke(page);
  446 |     await captureProof(page, testInfo, "08-wallet");
  447 | 
  448 |     await gotoPath(page, "/app/notifications");
  449 |     await expect(page.getByRole("heading", { name: "Important updates across your workflow" })).toBeVisible();
  450 |     await assertA11ySmoke(page);
  451 |     await captureProof(page, testInfo, "09-notifications");
  452 | 
  453 |     const consignmentId = await createConsignmentTimeline(request, seller);
  454 |     await primeSession(page, seller);
  455 |     await gotoPath(page, `/app/traceability/${consignmentId}`);
  456 |     await expect(page.getByRole("heading", { name: "Ordered event chain" })).toBeVisible();
  457 |     await assertA11ySmoke(page);
  458 |     await captureProof(page, testInfo, "10-traceability");
  459 |   });
  460 | 
  461 |   test("captures operations, advisory, climate, finance, and admin routes", async ({ page, request }, testInfo) => {
  462 |     const stamp = `${testInfo.project.name}-${Date.now()}`;
  463 | 
  464 |     await signInAndGrantConsent(page, {
  465 |       displayName: "R5 Cooperative",
  466 |       email: `r5.coop.${stamp}@example.com`,
  467 |       role: "cooperative",
  468 |       countryCode: "GH",
  469 |     });
  470 |     await gotoPath(page, "/app/cooperative/dispatch");
  471 |     await expect(page.getByRole("heading", { name: "Member dispatch board" })).toBeVisible();
  472 |     await assertA11ySmoke(page);
  473 |     await captureProof(page, testInfo, "11-dispatch");
  474 | 
  475 |     await signInAndGrantConsent(page, {
  476 |       displayName: "R5 Advisor",
  477 |       email: `r5.advisor.${stamp}@example.com`,
  478 |       role: "advisor",
  479 |       countryCode: "GH",
  480 |     });
  481 |     await gotoPath(page, "/app/advisor/requests");
  482 |     await expect(page.getByRole("heading", { name: "Grounded guidance with reviewer state" })).toBeVisible();
  483 |     await assertA11ySmoke(page);
  484 |     await captureProof(page, testInfo, "12-advisory");
  485 | 
  486 |     await gotoPath(page, "/app/climate/alerts");
  487 |     await expect(page.getByRole("heading", { name: "Live alert triage with visible degraded-mode posture" })).toBeVisible();
  488 |     await assertA11ySmoke(page);
  489 |     await captureProof(page, testInfo, "13-climate");
  490 | 
  491 |     const finance = await createAuthenticatedSession(request, {
  492 |       displayName: "R5 Finance",
  493 |       email: `r5.finance.${stamp}@example.com`,
  494 |       role: "finance",
  495 |       scopeIds: ["identity.core", "workflow.audit", "regulated.finance"],
  496 |     });
  497 |     await primeSession(page, finance);
  498 |     await gotoPath(page, "/app/finance/queue");
  499 |     await expect(page.getByRole("heading", { name: "Review partner-owned decisions without hidden approval paths" })).toBeVisible();
  500 |     await assertA11ySmoke(page);
  501 |     await captureProof(page, testInfo, "14-finance");
  502 | 
  503 |     const admin = await createAuthenticatedSession(request, {
  504 |       displayName: "R5 Admin",
  505 |       email: `r5.admin.${stamp}@example.com`,
  506 |       role: "admin",
  507 |       scopeIds: ["identity.core", "workflow.audit", "admin.observability", "admin.rollout"],
  508 |     });
  509 |     await primeSession(page, admin);
  510 |     await gotoPath(page, "/app/admin/analytics");
  511 |     await expect(page.getByRole("heading", { name: "Service health" })).toBeVisible();
  512 |     await assertA11ySmoke(page);
  513 |     await captureProof(page, testInfo, "15-admin");
  514 |   });
  515 | });
  516 | 
```