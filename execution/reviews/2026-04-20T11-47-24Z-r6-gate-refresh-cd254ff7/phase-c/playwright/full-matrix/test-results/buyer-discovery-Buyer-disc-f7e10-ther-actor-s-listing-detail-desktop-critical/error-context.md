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
  - alert [ref=e3]
  - generic [ref=e4]:
    - link "Skip to content" [ref=e5] [cursor=pointer]:
      - /url: "#main-content"
    - main [ref=e6]:
      - generic [ref=e7]:
        - generic [ref=e8]:
          - generic [ref=e9]:
            - generic [ref=e10]: Buyer
            - generic [ref=e11]: GH
          - paragraph [ref=e12]: Kofi Buyer
          - heading "Ghana Growers Network" [level=1] [ref=e13]
          - paragraph [ref=e14]: buyer.1776686100716@example.com · Buyer · GH
          - paragraph [ref=e15]: This protected shell keeps role routing, queue state, and consent posture persistent while you move between operational routes.
        - generic [ref=e16]:
          - generic [ref=e17]: Trace trace-ket-negotiations-e90dm1
          - button "Sign out" [ref=e18] [cursor=pointer]
      - region "Sync status" [ref=e19]:
        - generic [ref=e20]:
          - generic [ref=e22]: Online
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e23]
          - paragraph [ref=e24]: "Pending items: 0. Conflicts: 0. Trace ID: trace-ket-negotiations-e90dm1."
        - generic [ref=e25]:
          - button "Force online" [ref=e26] [cursor=pointer]
          - button "Simulate degraded" [ref=e27] [cursor=pointer]
          - button "Simulate offline" [ref=e28] [cursor=pointer]
      - generic [ref=e29]:
        - complementary [ref=e30]:
          - generic [ref=e31]:
            - generic [ref=e32]:
              - generic [ref=e34]:
                - paragraph [ref=e35]: Role-aware workspace
                - heading "Buyer operations" [level=2] [ref=e36]
                - paragraph [ref=e37]: The shell routes to the correct role surface while keeping consent, queue, and offline state visible.
              - navigation "Primary" [ref=e38]:
                - generic [ref=e39]:
                  - link "Home" [ref=e40] [cursor=pointer]:
                    - /url: /app/buyer
                    - generic [ref=e41]: Home
                  - link "Market" [ref=e42] [cursor=pointer]:
                    - /url: /app/market/listings
                    - generic [ref=e43]: Market
                  - link "Inbox" [ref=e44] [cursor=pointer]:
                    - /url: /app/market/negotiations
                    - generic [ref=e45]: Inbox
                  - link "Alerts" [ref=e46] [cursor=pointer]:
                    - /url: /app/climate/alerts
                    - generic [ref=e47]: Alerts
                  - link "Profile 2" [ref=e48] [cursor=pointer]:
                    - /url: /app/profile
                    - generic [ref=e49]: Profile
                    - generic [ref=e50]: "2"
            - list [ref=e51]:
              - listitem [ref=e52]:
                - generic [ref=e53]: Home route
                - strong [ref=e54]: /app/buyer
              - listitem [ref=e55]:
                - generic [ref=e56]: Field posture
                - strong [ref=e57]: Offer work
              - listitem [ref=e58]:
                - generic [ref=e59]: Proof posture
                - strong [ref=e60]: Proof before commitment
            - complementary [ref=e61]:
              - strong [ref=e62]: Design note
              - paragraph [ref=e63]: Listing proof, identity state, and queue continuity appear before deal actions.
        - generic [ref=e65]:
          - generic [ref=e66]:
            - generic [ref=e68]:
              - paragraph [ref=e69]: Offers and negotiations
              - heading "Track every live negotiation in one place" [level=2] [ref=e70]
              - paragraph [ref=e71]: Review active threads, create offers, respond with counters, and manage confirmation checkpoints without losing the audit trail.
            - generic [ref=e72]:
              - generic [ref=e73]: buyer
              - generic [ref=e74]: Inbox ready
          - generic [ref=e75]:
            - article [ref=e76]:
              - generic [ref=e78]:
                - paragraph [ref=e79]: Inbox
                - heading "Visible negotiations" [level=2] [ref=e80]
                - paragraph [ref=e81]: Only participant threads appear here. If you are not part of the negotiation, you do not see the thread or its confirmation controls.
              - complementary [ref=e82]:
                - strong [ref=e83]: No negotiations yet
                - paragraph [ref=e84]: Create an offer from a published lot or wait for the counterparty to start the thread.
              - list "Negotiation threads"
            - generic [ref=e85]:
              - article [ref=e86]:
                - generic [ref=e88]:
                  - paragraph [ref=e89]: Open offer
                  - heading "Buyer offer composer" [level=2] [ref=e90]
                  - paragraph [ref=e91]: Start with a published lot, submit one canonical offer, and keep the result visible if the request is replayed or retried.
                - generic [ref=e92]:
                  - generic [ref=e93]:
                    - generic [ref=e94]: Listing ID
                    - textbox "Listing ID" [ref=e95]
                    - paragraph [ref=e96]: Use a published listing id. Owner and unpublished listings fail closed.
                  - generic [ref=e97]:
                    - generic [ref=e98]:
                      - generic [ref=e99]: Offer amount
                      - spinbutton "Offer amount" [ref=e100]: "500"
                    - generic [ref=e101]:
                      - generic [ref=e102]: Currency
                      - textbox "Currency" [ref=e103]: GHS
                  - generic [ref=e104]:
                    - generic [ref=e105]: Buyer note
                    - textbox "Buyer note" [ref=e106]
                  - button "Create offer thread" [ref=e107] [cursor=pointer]
              - article [ref=e108]:
                - generic [ref=e110]:
                  - paragraph [ref=e111]: Thread
                  - heading "Choose a negotiation" [level=2] [ref=e112]
                  - paragraph [ref=e113]: Message history, confirmation checkpoints, and closed-state protections stay visible so both sides understand what happens next.
                - generic [ref=e115]:
                  - strong [ref=e116]: No negotiation selected
                  - paragraph [ref=e117]: Choose a thread from the inbox, or create a new buyer offer to populate this panel.
              - article [ref=e118]:
                - generic [ref=e120]:
                  - paragraph [ref=e121]: Evidence
                  - heading "Audit and idempotency cues" [level=2] [ref=e122]
                  - paragraph [ref=e123]: Every regulated mutation returns request identifiers you can replay into the audit route. Repeated submits stay single-effect and clearly marked.
                - complementary [ref=e124]:
                  - strong [ref=e125]: No mutation evidence captured yet
                  - paragraph [ref=e126]: Create or update a thread to surface request metadata, replay state, and audit evidence from the canonical audit route.
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