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

Locator: getByRole('heading', { name: 'Review access before the workspace opens' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('heading', { name: 'Review access before the workspace opens' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=e7] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e8]:
      - img [ref=e9]
    - generic [ref=e12]:
      - button "Open issues overlay" [ref=e13]:
        - generic [ref=e14]:
          - generic [ref=e15]: "0"
          - generic [ref=e16]: "1"
        - generic [ref=e17]: Issue
      - button "Collapse issues badge" [ref=e18]:
        - img [ref=e19]
  - alert [ref=e21]
  - main [ref=e22]:
    - generic [ref=e23]:
      - article [ref=e24]:
        - generic [ref=e26]:
          - paragraph [ref=e27]: Consent and access
          - heading "Review the consent terms" [level=2] [ref=e28]
          - paragraph [ref=e29]: Review what will be recorded, why it is needed, and which actions remain locked until you agree.
        - generic [ref=e30]:
          - generic [ref=e31]: Protected actions locked
          - generic [ref=e32]: Policy 2026.04.w1
        - list "Onboarding steps" [ref=e33]:
          - listitem [ref=e34]:
            - generic [ref=e36]:
              - strong [ref=e37]: Identity confirmed
              - paragraph [ref=e38]: Role, country, and contact details carry over from sign-in so you can confirm you are granting access in the right context.
          - listitem [ref=e39]:
            - generic [ref=e41]:
              - strong [ref=e42]: Consent review
              - paragraph [ref=e43]: Regulated actions stay blocked until consent is captured with the policy version and timestamp.
          - listitem [ref=e44]:
            - generic [ref=e46]:
              - strong [ref=e47]: Workspace access
              - paragraph [ref=e48]: Once consent is granted, your workspace opens with the same policy checks still enforced on the server.
        - complementary [ref=e49]:
          - strong [ref=e50]: Plain-language rule
          - paragraph [ref=e51]: "Keep the explanation concrete: what is recorded, why it is required, and what stays blocked if you do not agree."
        - generic "Consent outcomes" [ref=e52]:
          - article [ref=e53]:
            - generic [ref=e54]: Recorded immediately
            - strong [ref=e55]: Policy version and capture time
            - paragraph [ref=e56]: The consent record becomes part of the active session state.
          - article [ref=e57]:
            - generic [ref=e58]: Still enforced later
            - strong [ref=e59]: Server-side policy checks
            - paragraph [ref=e60]: Granting consent does not bypass subsequent permission or workflow checks.
      - article [ref=e61]:
        - generic [ref=e63]:
          - paragraph [ref=e64]: Consent details
          - heading "Choose what you agree to" [level=2] [ref=e65]
          - paragraph [ref=e66]: Select the scopes you accept. The policy version and capture time are stored as soon as consent is granted.
        - list [ref=e67]:
          - listitem [ref=e68]:
            - generic [ref=e69]: Policy version
            - strong [ref=e70]: 2026.04.w1
          - listitem [ref=e71]:
            - generic [ref=e72]: Channel
            - strong [ref=e73]: pwa
          - listitem [ref=e74]:
            - generic [ref=e75]: Country
            - strong [ref=e76]: GH
          - listitem [ref=e77]:
            - generic [ref=e78]: Role
            - strong [ref=e79]: farmer
        - generic "Scope explanation" [ref=e80]:
          - article [ref=e81]:
            - heading "Identity scope" [level=3] [ref=e82]
            - paragraph [ref=e83]: Needed to route you correctly, maintain session continuity, and explain who performed each action.
          - article [ref=e84]:
            - heading "Workflow scope" [level=3] [ref=e85]
            - paragraph [ref=e86]: Needed where regulated actions, approvals, or evidence retention apply.
        - generic [ref=e87]:
          - group "Select the consent scopes you accept" [ref=e88]:
            - generic [ref=e89]: Select the consent scopes you accept
            - generic [ref=e90]:
              - checkbox "Identity and session controlsNeeded to load the correct workspace and verify your identity state." [checked] [ref=e91]
              - generic [ref=e92]:
                - strong [ref=e93]: Identity and session controls
                - text: Needed to load the correct workspace and verify your identity state.
            - generic [ref=e94]:
              - checkbox "Workflow audit and regulated operationsNeeded to log regulated actions and keep audit history intact." [checked] [ref=e95]
              - generic [ref=e96]:
                - strong [ref=e97]: Workflow audit and regulated operations
                - text: Needed to log regulated actions and keep audit history intact.
            - generic [ref=e98]:
              - checkbox "Channel delivery and recovery promptsNeeded to send recovery prompts and channel handoff advice." [ref=e99]
              - generic [ref=e100]:
                - strong [ref=e101]: Channel delivery and recovery prompts
                - text: Needed to send recovery prompts and channel handoff advice.
          - generic [ref=e102]:
            - checkbox "I confirm this consent text can be recorded with its policy version and capture time." [ref=e103]
            - generic [ref=e104]: I confirm this consent text can be recorded with its policy version and capture time.
          - generic [ref=e105]:
            - button "Grant consent" [ref=e106] [cursor=pointer]
            - link "Back to sign in" [ref=e107] [cursor=pointer]:
              - /url: /signin
          - paragraph [ref=e108]: If consent is not granted, protected actions remain blocked and the workspace will not open.
```

# Test source

```ts
  222 |       metadata: {
  223 |         request_id: createRequestId,
  224 |         idempotency_key: crypto.randomUUID(),
  225 |         actor_id: actor.session.actor.actor_id,
  226 |         country_code: actor.session.actor.country_code,
  227 |         channel: "pwa",
  228 |         schema_version: schemaVersion,
  229 |         correlation_id: createRequestId,
  230 |         occurred_at: new Date().toISOString(),
  231 |         traceability: {
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
> 322 |     await expect(page.getByRole("heading", { name: "Review access before the workspace opens" })).toBeVisible();
      |                                                                                                   ^ Error: expect(locator).toBeVisible() failed
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
```