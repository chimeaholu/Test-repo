# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: r5-ux-hardening.spec.ts >> R5 UX hardening proof >> captures operations, advisory, climate, finance, and admin routes
- Location: tests/e2e/r5-ux-hardening.spec.ts:461:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Coordinate dispatch, member actions, and proof checkpoints' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('heading', { name: 'Coordinate dispatch, member actions, and proof checkpoints' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - button "Open Next.js Dev Tools" [ref=e8] [cursor=pointer]:
    - img [ref=e9]
  - alert [ref=e12]: Sign in to the right workspace without skipping access controls.
  - main [ref=e13]:
    - generic [ref=e14]:
      - article [ref=e15]:
        - generic [ref=e16]:
          - generic [ref=e17]: Identity check
          - generic [ref=e18]: Consent required next
        - heading "Sign in to the right workspace without skipping access controls." [level=1] [ref=e19]
        - paragraph [ref=e20]: Enter your name, work email, role, and operating country. Agrodomain routes you to the correct workspace, then asks for consent before any protected work begins.
        - generic [ref=e21]:
          - complementary [ref=e22]:
            - strong [ref=e23]: Field-first rule
            - paragraph [ref=e24]: Use the same identity details your team already uses so handoffs, recovery, and audit history remain clear.
          - complementary [ref=e25]:
            - strong [ref=e26]: Risk rule
            - paragraph [ref=e27]: Signing in identifies you. It does not authorize regulated actions until consent is granted.
      - article [ref=e28]:
        - generic [ref=e30]:
          - paragraph [ref=e31]: Identity entry
          - heading "Enter your work details" [level=2] [ref=e32]
          - paragraph [ref=e33]: Choose the role and country that match the work you need to resume today.
        - generic [ref=e34]:
          - paragraph [ref=e35]: Use the identity details attached to the work you need to resume. You can review consent before any protected action is enabled.
          - generic [ref=e36]:
            - generic [ref=e37]: Full name
            - textbox "Full name" [ref=e38]:
              - /placeholder: Ama Mensah
            - paragraph [ref=e39]: Use the name your cooperative, buyer group, or field team expects.
          - generic [ref=e40]:
            - generic [ref=e41]: Email
            - textbox "Email" [ref=e42]:
              - /placeholder: ama@example.com
            - paragraph [ref=e43]: This is used for account recovery, notifications, and route context.
          - generic [ref=e44]:
            - generic [ref=e45]: Role
            - combobox "Role" [ref=e46]:
              - option "Farmer" [selected]
              - option "Buyer"
              - option "Cooperative"
              - option "Advisor"
              - option "Finance"
              - option "Admin"
          - generic [ref=e47]:
            - generic [ref=e48]: Country pack
            - combobox "Country pack" [ref=e49]:
              - option "Ghana" [selected]
              - option "Nigeria"
              - option "Jamaica"
          - button "Continue to onboarding" [ref=e50] [cursor=pointer]
```

# Test source

```ts
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
  433 |     await expect(page.getByRole("heading", { name: "Track every live negotiation in one place" })).toBeVisible();
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
> 471 |     await expect(page.getByRole("heading", { name: "Coordinate dispatch, member actions, and proof checkpoints" })).toBeVisible();
      |                                                                                                                     ^ Error: expect(locator).toBeVisible() failed
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
  511 |     await expect(page.getByRole("heading", { name: "Platform health and release posture" })).toBeVisible();
  512 |     await assertA11ySmoke(page);
  513 |     await captureProof(page, testInfo, "15-admin");
  514 |   });
  515 | });
  516 | 
```