# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: buyer-discovery.spec.ts >> Buyer discovery and scoped read behavior >> buyer reaches the discovery shell and cannot read another actor's listing detail
- Location: tests/e2e/buyer-discovery.spec.ts:145:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Inbox and thread controls on the canonical N2-A2 runtime' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('heading', { name: 'Inbox and thread controls on the canonical N2-A2 runtime' })

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
          - paragraph [ref=e21]: Kofi Buyer
          - heading "Ghana Growers Network" [level=1] [ref=e22]
          - paragraph [ref=e23]: buyer.1776695533631@example.com · Buyer · GH
          - paragraph [ref=e24]: This protected workspace keeps role routing, queue state, and consent posture persistent while you move between operational routes.
        - generic [ref=e25]:
          - generic [ref=e26]: Trace trace-ket-negotiations-avlr9t
          - button "Sign out" [ref=e27] [cursor=pointer]
      - region "Sync status" [ref=e28]:
        - generic [ref=e29]:
          - generic [ref=e31]: Online
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e32]
          - paragraph [ref=e33]: "Pending items: 0. Conflicts: 0. Trace ID: trace-ket-negotiations-avlr9t."
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
              - heading "Track every live negotiation in one place" [level=2] [ref=e79]
              - paragraph [ref=e80]: Review active threads, create offers, respond with counters, and manage confirmation checkpoints without losing the audit trail.
            - generic [ref=e81]:
              - generic [ref=e82]: buyer
              - generic [ref=e83]: Inbox ready
            - generic "Negotiation workspace posture" [ref=e84]:
              - article [ref=e85]:
                - generic [ref=e86]: Visible threads
                - strong [ref=e87]: "0"
                - paragraph [ref=e88]: Only participant threads surface in this inbox.
              - article [ref=e89]:
                - generic [ref=e90]: Selected state
                - strong [ref=e91]: Choose a thread
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
              - complementary [ref=e111]:
                - strong [ref=e112]: No negotiations yet
                - paragraph [ref=e113]: Create an offer from a published lot or wait for the counterparty to start the thread.
              - list "Negotiation threads"
            - generic [ref=e114]:
              - article [ref=e115]:
                - generic [ref=e117]:
                  - paragraph [ref=e118]: Open offer
                  - heading "Buyer offer composer" [level=2] [ref=e119]
                  - paragraph [ref=e120]: Start with a published lot, submit one canonical offer, and keep the result visible if the request is replayed or retried.
                - paragraph [ref=e121]: This composer is buyer-only and assumes the lot has already passed the buyer-safe visibility boundary.
                - generic [ref=e122]:
                  - generic [ref=e123]:
                    - generic [ref=e124]: Listing ID
                    - textbox "Listing ID" [ref=e125]
                    - paragraph [ref=e126]: Use a published listing id. Owner and unpublished listings fail closed.
                  - generic [ref=e127]:
                    - generic [ref=e128]:
                      - generic [ref=e129]: Offer amount
                      - spinbutton "Offer amount" [ref=e130]: "500"
                    - generic [ref=e131]:
                      - generic [ref=e132]: Currency
                      - textbox "Currency" [ref=e133]: GHS
                  - generic [ref=e134]:
                    - generic [ref=e135]: Buyer note
                    - textbox "Buyer note" [ref=e136]
                  - button "Create offer thread" [ref=e137] [cursor=pointer]
              - article [ref=e138]:
                - generic [ref=e140]:
                  - paragraph [ref=e141]: Thread
                  - heading "Choose a negotiation" [level=2] [ref=e142]
                  - paragraph [ref=e143]: Message history, confirmation checkpoints, and closed-state protections stay visible so both sides understand what happens next.
                - generic [ref=e145]:
                  - strong [ref=e146]: No negotiation selected
                  - paragraph [ref=e147]: Choose a thread from the inbox, or create a new buyer offer to populate this panel.
              - article [ref=e148]:
                - generic [ref=e150]:
                  - paragraph [ref=e151]: Evidence
                  - heading "Audit and idempotency cues" [level=2] [ref=e152]
                  - paragraph [ref=e153]: Every regulated mutation returns request identifiers you can replay into the audit route. Repeated submits stay single-effect and clearly marked.
                - paragraph [ref=e154]: Use this panel to explain whether the last change succeeded once, replayed safely, or still needs another attempt.
                - complementary [ref=e155]:
                  - strong [ref=e156]: No mutation evidence captured yet
                  - paragraph [ref=e157]: Create or update a thread to surface request metadata, replay state, and audit evidence from the canonical audit route.
```

# Test source

```ts
  94  |         correlation_id: requestId,
  95  |         occurred_at: new Date().toISOString(),
  96  |         traceability: {
  97  |           journey_ids: ["CJ-002"],
  98  |           data_check_ids: ["DI-001"],
  99  |         },
  100 |       },
  101 |       command: {
  102 |         name: "market.listings.create",
  103 |         aggregate_ref: "listing",
  104 |         mutation_scope: "marketplace.listings",
  105 |         payload: {
  106 |           title: input.title,
  107 |           commodity: input.commodity,
  108 |           quantity_tons: Number(input.quantityTons),
  109 |           price_amount: Number(input.priceAmount),
  110 |           price_currency: input.priceCurrency,
  111 |           location: input.location,
  112 |           summary: input.summary,
  113 |         },
  114 |       },
  115 |     },
  116 |     headers: {
  117 |       Authorization: `Bearer ${seller.accessToken}`,
  118 |       "X-Correlation-ID": requestId,
  119 |       "X-Request-ID": requestId,
  120 |     },
  121 |   });
  122 |   expect(response.ok()).toBeTruthy();
  123 |   const payload = (await response.json()) as {
  124 |     result: {
  125 |       listing: {
  126 |         listing_id: string;
  127 |       };
  128 |     };
  129 |   };
  130 |   return `/app/market/listings/${payload.result.listing.listing_id}`;
  131 | }
  132 | 
  133 | async function primeSession(page: Page, sessionSeed: SessionSeed): Promise<void> {
  134 |   await gotoPath(page, "/signin");
  135 |   await page.evaluate(
  136 |     ([sessionKey, tokenKey, session, token]) => {
  137 |       window.localStorage.setItem(sessionKey, JSON.stringify(session));
  138 |       window.localStorage.setItem(tokenKey, token);
  139 |     },
  140 |     [SESSION_KEY, TOKEN_KEY, sessionSeed.session, sessionSeed.accessToken],
  141 |   );
  142 | }
  143 | 
  144 | test.describe("Buyer discovery and scoped read behavior", () => {
  145 |   test("buyer reaches the discovery shell and cannot read another actor's listing detail", async ({
  146 |     page,
  147 |     request,
  148 |   }) => {
  149 |     const title = `Buyer discovery fixture ${Date.now()}`;
  150 |     const seller = await createAuthenticatedSession(request, {
  151 |       displayName: "Ama Mensah",
  152 |       email: `seller.${Date.now()}@example.com`,
  153 |       role: "farmer",
  154 |       countryCode: "GH",
  155 |     });
  156 |     const detailHref = await createListingViaApi(request, seller, {
  157 |       title,
  158 |       commodity: "Cassava",
  159 |       quantityTons: "5.0",
  160 |       priceAmount: "350",
  161 |       priceCurrency: "GHS",
  162 |       location: "Tamale, GH",
  163 |       summary: "Cassava fixture for buyer discovery coverage.",
  164 |     });
  165 |     const buyer = await createAuthenticatedSession(request, {
  166 |       displayName: "Kofi Buyer",
  167 |       email: `buyer.${Date.now()}@example.com`,
  168 |       role: "buyer",
  169 |       countryCode: "GH",
  170 |     });
  171 | 
  172 |     await primeSession(page, buyer);
  173 | 
  174 |     await gotoPath(page, "/app/buyer");
  175 |     await expect(
  176 |       page.getByRole("heading", {
  177 |         name: "Review supply quickly, inspect proof, and move offers without losing context.",
  178 |       }),
  179 |     ).toBeVisible();
  180 | 
  181 |     await gotoPath(page, "/app/market/listings");
  182 |     await expect(
  183 |       page.getByRole("heading", {
  184 |         name: "Discover live lots without owner controls leaking into view",
  185 |       }),
  186 |     ).toBeVisible();
  187 |     await expect(page.getByText("Draft leak prevention is explicit")).toBeVisible();
  188 | 
  189 |     await gotoPath(page, "/app/market/negotiations");
  190 |     await expect(
  191 |       page.getByRole("heading", {
  192 |         name: "Inbox and thread controls on the canonical N2-A2 runtime",
  193 |       }),
> 194 |     ).toBeVisible();
      |       ^ Error: expect(locator).toBeVisible() failed
  195 |     await expect(page.getByText("No visible threads yet")).toBeVisible();
  196 | 
  197 |     await gotoPath(page, detailHref);
  198 |     await expect(page.getByText(/listing_not_(published|found)/)).toBeVisible();
  199 |   });
  200 | });
  201 | 
```