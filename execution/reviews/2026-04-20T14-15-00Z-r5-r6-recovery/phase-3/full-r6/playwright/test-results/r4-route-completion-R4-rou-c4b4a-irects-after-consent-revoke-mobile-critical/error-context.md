# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: r4-route-completion.spec.ts >> R4 route completion proof >> server-authoritative home posture redirects after consent revoke
- Location: tests/e2e/r4-route-completion.spec.ts:301:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/Protected path open/i)
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for getByText(/Protected path open/i)

```

# Page snapshot

```yaml
- generic [ref=e2]: missing required error components, refreshing...
```

# Test source

```ts
  211 |     await primeSession(page, seller);
  212 |     const detailHref = await createListing(page, {
  213 |       title: `R4 wallet route cassava ${stamp}`,
  214 |       commodity: "Cassava",
  215 |       quantityTons: "5.0",
  216 |       priceAmount: "420",
  217 |       priceCurrency: "GHS",
  218 |       location: "Tamale, GH",
  219 |       summary: "Accepted negotiation route proof for wallet and notification surfaces.",
  220 |     });
  221 |     const listingId = listingIdFromHref(detailHref);
  222 |     await publishListingViaCommand(
  223 |       request,
  224 |       seller.accessToken,
  225 |       seller.session.actor.actor_id,
  226 |       seller.session.actor.country_code,
  227 |       listingId,
  228 |     );
  229 | 
  230 |     await requestNegotiationCommand(
  231 |       request,
  232 |       buyer.accessToken,
  233 |       buyer.session.actor.actor_id,
  234 |       buyer.session.actor.country_code,
  235 |       "market.negotiations.create",
  236 |       listingId,
  237 |       {
  238 |         listing_id: listingId,
  239 |         offer_amount: 405,
  240 |         offer_currency: "GHS",
  241 |         note: "R4 buyer offer",
  242 |       },
  243 |     );
  244 | 
  245 |     const threadsResponse = await request.get(`${API_BASE_URL}/api/v1/marketplace/negotiations`, {
  246 |       headers: {
  247 |         Authorization: `Bearer ${buyer.accessToken}`,
  248 |       },
  249 |     });
  250 |     expect(threadsResponse.ok()).toBeTruthy();
  251 |     const threadPayload = (await threadsResponse.json()) as {
  252 |       items: Array<{ listing_id: string; thread_id: string }>;
  253 |     };
  254 |     const threadId = threadPayload.items.find((item) => item.listing_id === listingId)?.thread_id;
  255 |     expect(threadId).toBeTruthy();
  256 | 
  257 |     await requestNegotiationCommand(
  258 |       request,
  259 |       seller.accessToken,
  260 |       seller.session.actor.actor_id,
  261 |       seller.session.actor.country_code,
  262 |       "market.negotiations.confirm.request",
  263 |       threadId!,
  264 |       {
  265 |         thread_id: threadId,
  266 |         required_confirmer_actor_id: buyer.session.actor.actor_id,
  267 |         note: "Seller requests final confirmation.",
  268 |       },
  269 |     );
  270 |     await requestNegotiationCommand(
  271 |       request,
  272 |       buyer.accessToken,
  273 |       buyer.session.actor.actor_id,
  274 |       buyer.session.actor.country_code,
  275 |       "market.negotiations.confirm.approve",
  276 |       threadId!,
  277 |       {
  278 |         thread_id: threadId,
  279 |         note: "Buyer approves accepted thread.",
  280 |       },
  281 |     );
  282 | 
  283 |     await primeSession(page, buyer);
  284 |     await gotoPath(page, "/app/payments/wallet");
  285 |     await waitForWorkspaceReady(page);
  286 |     await expect(page.getByRole("heading", { name: "Ledger provenance and escrow lifecycle" })).toBeVisible({ timeout: 30_000 });
  287 |     await expect(page.getByRole("button", { name: "Initiate escrow" })).toBeVisible({ timeout: 30_000 });
  288 |     await page.getByRole("button", { name: "Initiate escrow" }).click();
  289 |     await expect(page.getByRole("button", { name: "Mark partner pending" })).toBeVisible({ timeout: 30_000 });
  290 |     await page.getByRole("button", { name: "Mark partner pending" }).click();
  291 |     await expect(page.locator(".status-pill").filter({ hasText: "partner_pending" }).first()).toBeVisible({
  292 |       timeout: 30_000,
  293 |     });
  294 | 
  295 |     await gotoPath(page, "/app/notifications");
  296 |     await waitForWorkspaceReady(page);
  297 |     await expect(page.getByRole("heading", { name: "Live route updates" })).toBeVisible({ timeout: 30_000 });
  298 |     await expect(page.getByText(/Escrow partner pending/i)).toBeVisible({ timeout: 30_000 });
  299 |   });
  300 | 
  301 |   test("server-authoritative home posture redirects after consent revoke", async ({ page, request }) => {
  302 |     const buyerSeed = await createAuthenticatedSession(request, {
  303 |       displayName: "R4 Consent Buyer",
  304 |       email: `r4.role-home.${Date.now()}@example.com`,
  305 |       role: "buyer",
  306 |       scopeIds: ["identity.core", "workflow.audit"],
  307 |     });
  308 |     await primeSession(page, buyerSeed);
  309 |     await gotoPath(page, "/app/buyer");
  310 |     await waitForWorkspaceReady(page);
> 311 |     await expect(page.getByText(/Protected path open/i)).toBeVisible({ timeout: 30_000 });
      |                                                          ^ Error: expect(locator).toBeVisible() failed
  312 | 
  313 |     const revokeResponse = await request.post(`${API_BASE_URL}/api/v1/identity/consent/revoke`, {
  314 |       data: {
  315 |         reason: "Server authoritative revoke for role-home proof",
  316 |       },
  317 |       headers: {
  318 |         Authorization: `Bearer ${buyerSeed.accessToken}`,
  319 |         "X-Request-ID": crypto.randomUUID(),
  320 |         "X-Correlation-ID": crypto.randomUUID(),
  321 |       },
  322 |     });
  323 |     expect(revokeResponse.ok()).toBeTruthy();
  324 | 
  325 |     await gotoPath(page, "/app/buyer");
  326 |     await expect(page).toHaveURL(/\/onboarding\/consent(\?.*)?$/, { timeout: 30_000 });
  327 |   });
  328 | });
  329 | 
```