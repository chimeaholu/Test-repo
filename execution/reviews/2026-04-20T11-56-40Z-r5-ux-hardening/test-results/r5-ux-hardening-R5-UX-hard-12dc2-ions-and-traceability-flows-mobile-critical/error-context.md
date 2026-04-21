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

Locator: getByRole('heading', { name: 'Create, revise, and publish inventory with clear market status' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('heading', { name: 'Create, revise, and publish inventory with clear market status' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - main [ref=e3]:
    - generic [ref=e4]:
      - paragraph [ref=e5]: Loading workspace
      - heading "Restoring route and contract state." [level=1] [ref=e6]
      - paragraph [ref=e7]: The workspace waits for local identity and queue state so offline recovery stays deterministic.
```

# Test source

```ts
  254 |     throw new Error("traceability consignment seed missing consignment_id");
  255 |   }
  256 | 
  257 |   for (const [milestone, eventReference, previousEventReference, custodyActorId] of [
  258 |     ["harvested", harvestedReference, null, actor.session.actor.actor_id],
  259 |     ["dispatched", dispatchedReference, harvestedReference, "actor-transporter-gh-1"],
  260 |   ] as const) {
  261 |     const requestId = crypto.randomUUID();
  262 |     const response = await request.post(`${API_BASE_URL}/api/v1/workflow/commands`, {
  263 |       data: {
  264 |         metadata: {
  265 |           request_id: requestId,
  266 |           idempotency_key: crypto.randomUUID(),
  267 |           actor_id: actor.session.actor.actor_id,
  268 |           country_code: actor.session.actor.country_code,
  269 |           channel: "pwa",
  270 |           schema_version: schemaVersion,
  271 |           correlation_id: requestId,
  272 |           occurred_at: new Date().toISOString(),
  273 |           traceability: {
  274 |             journey_ids: ["CJ-007"],
  275 |             data_check_ids: ["DI-006"],
  276 |           },
  277 |         },
  278 |         command: {
  279 |           name: "traceability.events.append",
  280 |           aggregate_ref: "traceability",
  281 |           mutation_scope: "traceability.runtime",
  282 |           payload: {
  283 |             consignment_id: consignmentId,
  284 |             milestone,
  285 |             event_reference: eventReference,
  286 |             previous_event_reference: previousEventReference,
  287 |             occurred_at: new Date().toISOString(),
  288 |             current_custody_actor_id: custodyActorId,
  289 |           },
  290 |         },
  291 |       },
  292 |       headers: { Authorization: `Bearer ${actor.accessToken}` },
  293 |     });
  294 |     expect(response.ok()).toBeTruthy();
  295 |   }
  296 | 
  297 |   return consignmentId;
  298 | }
  299 | 
  300 | test.describe("R5 UX hardening proof", () => {
  301 |   test.setTimeout(300_000);
  302 | 
  303 |   test("captures public, onboarding, and role-home routes", async ({ page }, testInfo) => {
  304 |     const stamp = `${testInfo.project.name}-${Date.now()}`;
  305 | 
  306 |     await gotoPath(page, "/");
  307 |     await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  308 |     await assertA11ySmoke(page);
  309 |     await captureProof(page, testInfo, "01-home");
  310 | 
  311 |     await gotoPath(page, "/signin");
  312 |     await expect(page.getByRole("heading", { name: "Sign in to the right workspace without skipping access controls." })).toBeVisible();
  313 |     await assertA11ySmoke(page);
  314 |     await captureProof(page, testInfo, "02-signin");
  315 | 
  316 |     await signIn(page, {
  317 |       displayName: "R5 Farmer",
  318 |       email: `r5.public.${stamp}@example.com`,
  319 |       role: "farmer",
  320 |       countryCode: "GH",
  321 |     });
  322 |     await expect(page.getByRole("heading", { name: "Review access before the workspace opens" })).toBeVisible();
  323 |     await assertA11ySmoke(page);
  324 |     await captureProof(page, testInfo, "03-consent");
  325 | 
  326 |     await signInAndGrantConsent(page, {
  327 |       displayName: "R5 Farmer",
  328 |       email: `r5.farmer.${stamp}@example.com`,
  329 |       role: "farmer",
  330 |       countryCode: "GH",
  331 |     });
  332 |     await expect(page.getByRole("heading", { name: "Finish setup, publish produce, and keep every field action recoverable." })).toBeVisible();
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
> 354 |     await expect(page.getByRole("heading", { name: "Create, revise, and publish inventory with clear market status" })).toBeVisible();
      |                                                                                                                         ^ Error: expect(locator).toBeVisible() failed
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
```