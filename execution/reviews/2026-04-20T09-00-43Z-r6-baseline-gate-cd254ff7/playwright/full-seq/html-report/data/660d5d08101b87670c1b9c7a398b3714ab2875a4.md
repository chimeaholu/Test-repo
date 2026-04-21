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
          - paragraph [ref=e23]: buyer.1776676990219@example.com · Buyer · GH
        - generic [ref=e24]:
          - generic [ref=e25]: Trace trace-ket-negotiations-c381r7
          - button "Sign out" [ref=e26] [cursor=pointer]
      - region "Sync status" [ref=e27]:
        - generic [ref=e28]:
          - generic [ref=e30]: Online
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e31]
          - paragraph [ref=e32]: "Pending items: 0. Conflicts: 0. Trace ID: trace-ket-negotiations-c381r7."
        - generic [ref=e33]:
          - button "Force online" [ref=e34] [cursor=pointer]
          - button "Simulate degraded" [ref=e35] [cursor=pointer]
          - button "Simulate offline" [ref=e36] [cursor=pointer]
      - generic [ref=e37]:
        - complementary [ref=e38]:
          - generic [ref=e39]:
            - generic [ref=e40]:
              - generic [ref=e42]:
                - paragraph [ref=e43]: Role-aware workspace
                - heading "Buyer operations" [level=2] [ref=e44]
                - paragraph [ref=e45]: The shell routes to the correct role surface while keeping consent, queue, and offline state visible.
              - navigation "Primary" [ref=e46]:
                - generic [ref=e47]:
                  - link "Home" [ref=e48] [cursor=pointer]:
                    - /url: /app/buyer
                    - generic [ref=e49]: Home
                  - link "Market" [ref=e50] [cursor=pointer]:
                    - /url: /app/market/listings
                    - generic [ref=e51]: Market
                  - link "Inbox" [ref=e52] [cursor=pointer]:
                    - /url: /app/market/negotiations
                    - generic [ref=e53]: Inbox
                  - link "Alerts" [ref=e54] [cursor=pointer]:
                    - /url: /app/climate/alerts
                    - generic [ref=e55]: Alerts
                  - link "Profile 2" [ref=e56] [cursor=pointer]:
                    - /url: /app/profile
                    - generic [ref=e57]: Profile
                    - generic [ref=e58]: "2"
            - list [ref=e59]:
              - listitem [ref=e60]:
                - generic [ref=e61]: Home route
                - strong [ref=e62]: /app/buyer
              - listitem [ref=e63]:
                - generic [ref=e64]: Field posture
                - strong [ref=e65]: Offer work
              - listitem [ref=e66]:
                - generic [ref=e67]: Proof posture
                - strong [ref=e68]: Proof before commitment
            - complementary [ref=e69]:
              - strong [ref=e70]: Design note
              - paragraph [ref=e71]: Listing proof, identity state, and queue continuity appear before deal actions.
        - generic [ref=e73]:
          - generic [ref=e74]:
            - generic [ref=e76]:
              - paragraph [ref=e77]: Offers and negotiations
              - heading "Track every live negotiation in one place" [level=2] [ref=e78]
              - paragraph [ref=e79]: Review active threads, create offers, respond with counters, and manage confirmation checkpoints without losing the audit trail.
            - generic [ref=e80]:
              - generic [ref=e81]: buyer
              - generic [ref=e82]: Inbox ready
          - generic [ref=e83]:
            - article [ref=e84]:
              - generic [ref=e86]:
                - paragraph [ref=e87]: Inbox
                - heading "Visible negotiations" [level=2] [ref=e88]
                - paragraph [ref=e89]: Only participant threads appear here. If you are not part of the negotiation, you do not see the thread or its confirmation controls.
              - complementary [ref=e90]:
                - strong [ref=e91]: No negotiations yet
                - paragraph [ref=e92]: Create an offer from a published lot or wait for the counterparty to start the thread.
              - list "Negotiation threads"
            - generic [ref=e93]:
              - article [ref=e94]:
                - generic [ref=e96]:
                  - paragraph [ref=e97]: Open offer
                  - heading "Buyer offer composer" [level=2] [ref=e98]
                  - paragraph [ref=e99]: Start with a published lot, submit one canonical offer, and keep the result visible if the request is replayed or retried.
                - generic [ref=e100]:
                  - generic [ref=e101]:
                    - generic [ref=e102]: Listing ID
                    - textbox "Listing ID" [ref=e103]
                    - paragraph [ref=e104]: Use a published listing id. Owner and unpublished listings fail closed.
                  - generic [ref=e105]:
                    - generic [ref=e106]:
                      - generic [ref=e107]: Offer amount
                      - spinbutton "Offer amount" [ref=e108]: "500"
                    - generic [ref=e109]:
                      - generic [ref=e110]: Currency
                      - textbox "Currency" [ref=e111]: GHS
                  - generic [ref=e112]:
                    - generic [ref=e113]: Buyer note
                    - textbox "Buyer note" [ref=e114]
                  - button "Create offer thread" [ref=e115] [cursor=pointer]
              - article [ref=e116]:
                - generic [ref=e118]:
                  - paragraph [ref=e119]: Thread
                  - heading "Choose a negotiation" [level=2] [ref=e120]
                  - paragraph [ref=e121]: Message history, confirmation checkpoints, and closed-state protections stay visible so both sides understand what happens next.
                - generic [ref=e123]:
                  - strong [ref=e124]: No negotiation selected
                  - paragraph [ref=e125]: Choose a thread from the inbox, or create a new buyer offer to populate this panel.
              - article [ref=e126]:
                - generic [ref=e128]:
                  - paragraph [ref=e129]: Evidence
                  - heading "Audit and idempotency cues" [level=2] [ref=e130]
                  - paragraph [ref=e131]: Every regulated mutation returns request identifiers you can replay into the audit route. Repeated submits stay single-effect and clearly marked.
                - complementary [ref=e132]:
                  - strong [ref=e133]: No mutation evidence captured yet
                  - paragraph [ref=e134]: Create or update a thread to surface request metadata, replay state, and audit evidence from the canonical audit route.
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