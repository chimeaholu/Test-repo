# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: r4-route-completion.spec.ts >> R4 route completion proof >> admin analytics and cooperative dispatch routes are live and navigable
- Location: tests/e2e/r4-route-completion.spec.ts:171:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Member dispatch board' })
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for getByRole('heading', { name: 'Member dispatch board' })

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
  92  |   token: string,
  93  |   actorId: string,
  94  |   countryCode: string,
  95  |   listingId: string,
  96  | ): Promise<void> {
  97  |   const requestId = crypto.randomUUID();
  98  |   const response = await request.post(`${API_BASE_URL}/api/v1/workflow/commands`, {
  99  |     data: {
  100 |       metadata: {
  101 |         request_id: requestId,
  102 |         idempotency_key: requestId,
  103 |         actor_id: actorId,
  104 |         country_code: countryCode,
  105 |         channel: "pwa",
  106 |         schema_version: SCHEMA_VERSION,
  107 |         correlation_id: requestId,
  108 |         occurred_at: new Date().toISOString(),
  109 |         traceability: {
  110 |           journey_ids: ["CJ-002"],
  111 |           data_check_ids: ["DI-001"],
  112 |         },
  113 |       },
  114 |       command: {
  115 |         name: "market.listings.publish",
  116 |         aggregate_ref: listingId,
  117 |         mutation_scope: "marketplace.listings",
  118 |         payload: { listing_id: listingId },
  119 |       },
  120 |     },
  121 |     headers: {
  122 |       Authorization: `Bearer ${token}`,
  123 |     },
  124 |   });
  125 |   expect(response.ok()).toBeTruthy();
  126 | }
  127 | 
  128 | async function requestNegotiationCommand(
  129 |   request: APIRequestContext,
  130 |   token: string,
  131 |   actorId: string,
  132 |   countryCode: string,
  133 |   name: string,
  134 |   aggregateRef: string,
  135 |   payload: Record<string, unknown>,
  136 | ): Promise<void> {
  137 |   const requestId = crypto.randomUUID();
  138 |   const response = await request.post(`${API_BASE_URL}/api/v1/workflow/commands`, {
  139 |     data: {
  140 |       metadata: {
  141 |         request_id: requestId,
  142 |         idempotency_key: requestId,
  143 |         actor_id: actorId,
  144 |         country_code: countryCode,
  145 |         channel: "pwa",
  146 |         schema_version: SCHEMA_VERSION,
  147 |         correlation_id: requestId,
  148 |         occurred_at: new Date().toISOString(),
  149 |         traceability: {
  150 |           journey_ids: ["CJ-003"],
  151 |           data_check_ids: ["DI-003"],
  152 |         },
  153 |       },
  154 |       command: {
  155 |         name,
  156 |         aggregate_ref: aggregateRef,
  157 |         mutation_scope: "marketplace.negotiations",
  158 |         payload,
  159 |       },
  160 |     },
  161 |     headers: {
  162 |       Authorization: `Bearer ${token}`,
  163 |     },
  164 |   });
  165 |   expect(response.ok()).toBeTruthy();
  166 | }
  167 | 
  168 | test.describe("R4 route completion proof", () => {
  169 |   test.setTimeout(240_000);
  170 | 
  171 |   test("admin analytics and cooperative dispatch routes are live and navigable", async ({ page, request }) => {
  172 |     const adminSeed = await createAuthenticatedSession(request, {
  173 |       displayName: "R4 Admin",
  174 |       email: `r4.admin.${Date.now()}@example.com`,
  175 |       role: "admin",
  176 |       scopeIds: ["identity.core", "workflow.audit", "admin.observability", "admin.rollout"],
  177 |     });
  178 |     await primeSession(page, adminSeed);
  179 |     await gotoPath(page, "/app/admin");
  180 |     await waitForWorkspaceReady(page);
  181 |     await expect(page.getByRole("heading", { name: "Service health" })).toBeVisible({ timeout: 30_000 });
  182 |     await expect(page.getByRole("button", { name: /Freeze rollout/i })).toBeVisible();
  183 |     await expect(page.getByText("Admin analytics route")).toHaveCount(0);
  184 | 
  185 |     await signInAndGrantConsent(page, {
  186 |       displayName: "R4 Cooperative",
  187 |       email: `r4.coop.${Date.now()}@example.com`,
  188 |       role: "cooperative",
  189 |     });
  190 |     await gotoPath(page, "/app/cooperative/dispatch");
  191 |     await waitForWorkspaceReady(page);
> 192 |     await expect(page.getByRole("heading", { name: "Member dispatch board" })).toBeVisible({ timeout: 30_000 });
      |                                                                                ^ Error: expect(locator).toBeVisible() failed
  193 |     await expect(page.getByText("Dispatch operations route")).toHaveCount(0);
  194 |   });
  195 | 
  196 |   test("wallet and notifications routes surface live escrow state after accepted negotiation", async ({ page, request }) => {
  197 |     const stamp = Date.now();
  198 |     const seller = await createAuthenticatedSession(request, {
  199 |       displayName: "R4 Seller",
  200 |       email: `r4.seller.${stamp}@example.com`,
  201 |       role: "farmer",
  202 |       scopeIds: ["identity.core", "workflow.audit"],
  203 |     });
  204 |     const buyer = await createAuthenticatedSession(request, {
  205 |       displayName: "R4 Buyer",
  206 |       email: `r4.buyer.${stamp}@example.com`,
  207 |       role: "buyer",
  208 |       scopeIds: ["identity.core", "workflow.audit", "notifications.delivery"],
  209 |     });
  210 | 
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
```