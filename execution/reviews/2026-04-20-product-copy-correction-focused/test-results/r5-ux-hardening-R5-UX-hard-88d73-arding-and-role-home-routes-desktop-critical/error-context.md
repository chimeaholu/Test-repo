# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: r5-ux-hardening.spec.ts >> R5 UX hardening proof >> captures public, onboarding, and role-home routes
- Location: tests/e2e/r5-ux-hardening.spec.ts:303:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Finish setup, publish produce, and keep every field action recoverable.' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('heading', { name: 'Finish setup, publish produce, and keep every field action recoverable.' })

```

# Page snapshot

```yaml
- generic:
  - generic [active]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]:
          - navigation [ref=e6]:
            - button "previous" [disabled] [ref=e7]:
              - img "previous" [ref=e8]
            - generic [ref=e10]:
              - generic [ref=e11]: 1/
              - text: "1"
            - button "next" [disabled] [ref=e12]:
              - img "next" [ref=e13]
          - img
        - generic [ref=e15]:
          - link "Next.js 15.5.15 (outdated) Webpack" [ref=e16] [cursor=pointer]:
            - /url: https://nextjs.org/docs/messages/version-staleness
            - img [ref=e17]
            - generic "An outdated version detected (latest is 16.2.4), upgrade is highly recommended!" [ref=e19]: Next.js 15.5.15 (outdated)
            - generic [ref=e20]: Webpack
          - img
      - generic [ref=e21]:
        - dialog "Runtime TypeError" [ref=e22]:
          - generic [ref=e25]:
            - generic [ref=e26]:
              - generic [ref=e27]:
                - generic [ref=e29]: Runtime TypeError
                - generic [ref=e30]:
                  - button "Copy Error Info" [ref=e31] [cursor=pointer]:
                    - img [ref=e32]
                  - button "No related documentation found" [disabled] [ref=e34]:
                    - img [ref=e35]
                  - link "Learn more about enabling Node.js inspector for server code with Chrome DevTools" [ref=e37] [cursor=pointer]:
                    - /url: https://nextjs.org/docs/app/building-your-application/configuring/debugging#server-side-code
                    - img [ref=e38]
              - paragraph [ref=e47]: __webpack_modules__[moduleId] is not a function
            - generic [ref=e49]:
              - generic [ref=e50]:
                - paragraph [ref=e51]:
                  - text: Call Stack
                  - generic [ref=e52]: "8"
                - button "Show 6 ignore-listed frame(s)" [ref=e53] [cursor=pointer]:
                  - text: Show 6 ignore-listed frame(s)
                  - img [ref=e54]
              - generic [ref=e56]:
                - generic [ref=e57]: eval
                - text: ./app/app/[role]/page.tsx
              - generic [ref=e58]:
                - generic [ref=e59]: <unknown>
                - text: rsc)/./app/app/[role]/page.tsx (/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/apps/web/.next/server/app/app/[role]/page.js (84:1)
          - generic [ref=e60]:
            - generic [ref=e61]: "1"
            - generic [ref=e62]: "2"
        - contentinfo [ref=e63]:
          - region "Error feedback" [ref=e64]:
            - paragraph [ref=e65]:
              - link "Was this helpful?" [ref=e66] [cursor=pointer]:
                - /url: https://nextjs.org/telemetry#error-feedback
            - button "Mark as helpful" [ref=e67] [cursor=pointer]:
              - img [ref=e68]
            - button "Mark as not helpful" [ref=e71] [cursor=pointer]:
              - img [ref=e72]
    - generic [ref=e78] [cursor=pointer]:
      - button "Open Next.js Dev Tools" [ref=e79]:
        - img [ref=e80]
      - generic [ref=e83]:
        - button "Open issues overlay" [ref=e84]:
          - generic [ref=e85]:
            - generic [ref=e86]: "0"
            - generic [ref=e87]: "1"
          - generic [ref=e88]: Issue
        - button "Collapse issues badge" [ref=e89]:
          - img [ref=e90]
  - alert [ref=e92]
```

# Test source

```ts
  232 |           journey_ids: ["CJ-007"],
  233 |           data_check_ids: ["DI-006"],
  234 |         },
  235 |       },
  236 |       command: {
  237 |         name: "traceability.consignments.create",
  238 |         aggregate_ref: "traceability",
  239 |         mutation_scope: "traceability.runtime",
  240 |         payload: {
  241 |           partner_reference_id: "partner-shipment-r5",
  242 |           current_custody_actor_id: actor.session.actor.actor_id,
  243 |         },
  244 |       },
  245 |     },
  246 |     headers: { Authorization: `Bearer ${actor.accessToken}` },
  247 |   });
  248 |   expect(createResponse.ok()).toBeTruthy();
  249 |   const createJson = (await createResponse.json()) as {
  250 |     result?: { consignment?: { consignment_id?: string }; consignment_id?: string };
  251 |   };
  252 |   const consignmentId = createJson.result?.consignment?.consignment_id ?? createJson.result?.consignment_id;
  253 |   if (!consignmentId) {
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
  312 |     await expect(page.getByRole("heading", { name: "Open the right workspace with trust checks visible from the first screen." })).toBeVisible();
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
> 332 |     await expect(page.getByRole("heading", { name: "Finish setup, publish produce, and keep every field action recoverable." })).toBeVisible();
      |                                                                                                                                  ^ Error: expect(locator).toBeVisible() failed
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
```