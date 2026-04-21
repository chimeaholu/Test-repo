# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: negotiation.spec.ts >> Negotiation inbox and thread proof >> pending confirmation approve/reject paths lock terminal state and outsider thread access is blocked
- Location: tests/e2e/negotiation.spec.ts:250:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('listitem').filter({ hasText: 'Negotiation proof cassava 1776556467432 reject' }).first()
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for getByRole('listitem').filter({ hasText: 'Negotiation proof cassava 1776556467432 reject' }).first()

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
            - generic [ref=e19]: Farmer
            - generic [ref=e20]: GH
          - paragraph [ref=e21]: Ama Seller
          - heading "Ghana Growers Network" [level=1] [ref=e22]
          - paragraph [ref=e23]: seller.negotiation.1776556467432@example.com · Farmer · GH
        - generic [ref=e24]:
          - generic [ref=e25]: Trace trace--market-listings-xfzno0
          - button "Sign out" [ref=e26] [cursor=pointer]
      - region "Sync status" [ref=e27]:
        - generic [ref=e28]:
          - generic [ref=e30]: Online
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e31]
          - paragraph [ref=e32]: "Pending items: 0. Conflicts: 0. Trace ID: trace--market-listings-xfzno0."
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
                - heading "Farmer operations" [level=2] [ref=e44]
                - paragraph [ref=e45]: The shell routes to the correct role surface while keeping consent, queue, and offline state visible.
              - navigation "Primary" [ref=e46]:
                - generic [ref=e47]:
                  - link "Home" [ref=e48] [cursor=pointer]:
                    - /url: /app/farmer
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
                - strong [ref=e62]: /app/farmer
              - listitem [ref=e63]:
                - generic [ref=e64]: Field posture
                - strong [ref=e65]: Field actions
              - listitem [ref=e66]:
                - generic [ref=e67]: Proof posture
                - strong [ref=e68]: Why this is safe
            - complementary [ref=e69]:
              - strong [ref=e70]: Design note
              - paragraph [ref=e71]: Consent, queue freshness, and evidence ownership stay visible before any protected action.
        - generic [ref=e73]:
          - generic [ref=e76]:
            - paragraph [ref=e77]: Owner workspace
            - heading "Create, revise, and publish listings with visible marketplace state" [level=2] [ref=e78]
            - paragraph [ref=e79]: The owner flow stays intact, while buyer discovery remains restricted to published buyer-safe records.
          - generic [ref=e80]:
            - article [ref=e81]:
              - generic [ref=e83]:
                - paragraph [ref=e84]: Create listing
                - heading "Listing wizard" [level=2] [ref=e85]
                - paragraph [ref=e86]: Authenticated actor, country scope, consent, validation, and audit are enforced server-side before the listing is committed.
              - generic [ref=e87]:
                - generic [ref=e88]:
                  - generic [ref=e89]: Listing title
                  - textbox "Listing title" [ref=e90]: Premium cassava harvest
                - generic [ref=e91]:
                  - generic [ref=e92]: Commodity
                  - textbox "Commodity" [ref=e93]: Cassava
                - generic [ref=e94]:
                  - generic [ref=e95]:
                    - generic [ref=e96]: Quantity (tons)
                    - spinbutton "Quantity (tons)" [ref=e97]: "4.2"
                  - generic [ref=e98]:
                    - generic [ref=e99]: Price amount
                    - spinbutton "Price amount" [ref=e100]: "320"
                - generic [ref=e101]:
                  - generic [ref=e102]:
                    - generic [ref=e103]: Currency
                    - textbox "Currency" [ref=e104]: GHS
                  - generic [ref=e105]:
                    - generic [ref=e106]: Location
                    - textbox "Location" [ref=e107]: Tamale, GH
                - generic [ref=e108]:
                  - generic [ref=e109]: Summary
                  - textbox "Summary" [ref=e110]: Bagged cassava stock ready for pickup with moisture proof attached.
                - alert [ref=e111]: unauthorized
                - button "Create listing" [ref=e112] [cursor=pointer]
            - article [ref=e113]:
              - generic [ref=e115]:
                - paragraph [ref=e116]: Server evidence
                - heading "Audit and idempotency receipt" [level=2] [ref=e117]
                - paragraph [ref=e118]: Create and edit commands return request metadata that can be queried back through the audit route.
              - generic [ref=e119]:
                - generic [ref=e120]:
                  - generic [ref=e121]: Create committed
                  - generic [ref=e122]: Single effect
                - paragraph [ref=e123]: "Listing ID: listing-18aca8a3bc3b"
                - paragraph [ref=e124]: "Request ID: fcacc937-94e7-4970-8843-3d35d872c501"
                - paragraph [ref=e125]: "Idempotency key: 564146a6-6175-4328-8cba-d6fdb279dfdf"
                - paragraph [ref=e126]: "Audit events returned: 1"
                - link "Open owner detail" [ref=e127] [cursor=pointer]:
                  - /url: /app/market/listings/listing-18aca8a3bc3b
          - generic [ref=e128]:
            - generic [ref=e130]:
              - paragraph [ref=e131]: Owner listings
              - heading "Owned supply with publish and revision cues" [level=2] [ref=e132]
              - paragraph [ref=e133]: Each listing remains editable by the owner, and buyer visibility state is explicit.
            - list "Owner listing collection" [ref=e134]:
              - listitem [ref=e135]:
                - generic [ref=e136]:
                  - generic [ref=e137]:
                    - generic [ref=e138]: published
                    - generic [ref=e139]: Owner-only view
                  - heading "Negotiation proof cassava 1776556467432 approve" [level=3] [ref=e140]
                - paragraph [ref=e141]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e142]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e144] [cursor=pointer]:
                  - /url: /app/market/listings/listing-080292a1f129
              - listitem [ref=e145]:
                - generic [ref=e146]:
                  - generic [ref=e147]:
                    - generic [ref=e148]: published
                    - generic [ref=e149]: Owner-only view
                  - heading "Negotiation proof cassava 1776556330088 reject" [level=3] [ref=e150]
                - paragraph [ref=e151]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e152]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e154] [cursor=pointer]:
                  - /url: /app/market/listings/listing-2e1d7cc3fa63
              - listitem [ref=e155]:
                - generic [ref=e156]:
                  - generic [ref=e157]:
                    - generic [ref=e158]: published
                    - generic [ref=e159]: Owner-only view
                  - heading "Negotiation proof cassava 1776556330088 approve" [level=3] [ref=e160]
                - paragraph [ref=e161]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e162]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e164] [cursor=pointer]:
                  - /url: /app/market/listings/listing-f21fc8692cb6
              - listitem [ref=e165]:
                - generic [ref=e166]:
                  - generic [ref=e167]:
                    - generic [ref=e168]: published
                    - generic [ref=e169]: Owner-only view
                  - heading "Negotiation proof cassava 1776556280899 reject" [level=3] [ref=e170]
                - paragraph [ref=e171]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e172]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e174] [cursor=pointer]:
                  - /url: /app/market/listings/listing-4dbe0f7884d4
              - listitem [ref=e175]:
                - generic [ref=e176]:
                  - generic [ref=e177]:
                    - generic [ref=e178]: published
                    - generic [ref=e179]: Owner-only view
                  - heading "Negotiation proof cassava 1776556280899 approve" [level=3] [ref=e180]
                - paragraph [ref=e181]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e182]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e184] [cursor=pointer]:
                  - /url: /app/market/listings/listing-fb182dd96c64
              - listitem [ref=e185]:
                - generic [ref=e186]:
                  - generic [ref=e187]:
                    - generic [ref=e188]: published
                    - generic [ref=e189]: Owner-only view
                  - heading "Negotiation proof cassava 1776555654127 reject" [level=3] [ref=e190]
                - paragraph [ref=e191]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e192]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e194] [cursor=pointer]:
                  - /url: /app/market/listings/listing-74b62401043d
              - listitem [ref=e195]:
                - generic [ref=e196]:
                  - generic [ref=e197]:
                    - generic [ref=e198]: published
                    - generic [ref=e199]: Owner-only view
                  - heading "Negotiation proof cassava 1776555654127 approve" [level=3] [ref=e200]
                - paragraph [ref=e201]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e202]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e204] [cursor=pointer]:
                  - /url: /app/market/listings/listing-e6da2c30e78d
              - listitem [ref=e205]:
                - generic [ref=e206]:
                  - generic [ref=e207]:
                    - generic [ref=e208]: published
                    - generic [ref=e209]: Owner-only view
                  - heading "Negotiation proof cassava 1776555564658 reject" [level=3] [ref=e210]
                - paragraph [ref=e211]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e212]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e214] [cursor=pointer]:
                  - /url: /app/market/listings/listing-dce24c260655
              - listitem [ref=e215]:
                - generic [ref=e216]:
                  - generic [ref=e217]:
                    - generic [ref=e218]: published
                    - generic [ref=e219]: Owner-only view
                  - heading "Negotiation proof cassava 1776555564658 approve" [level=3] [ref=e220]
                - paragraph [ref=e221]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e222]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e224] [cursor=pointer]:
                  - /url: /app/market/listings/listing-8415d13546f5
              - listitem [ref=e225]:
                - generic [ref=e226]:
                  - generic [ref=e227]:
                    - generic [ref=e228]: published
                    - generic [ref=e229]: Owner-only view
                  - heading "Negotiation proof cassava 1776549245852 reject" [level=3] [ref=e230]
                - paragraph [ref=e231]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e232]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e234] [cursor=pointer]:
                  - /url: /app/market/listings/listing-9a2a41e0cc77
              - listitem [ref=e235]:
                - generic [ref=e236]:
                  - generic [ref=e237]:
                    - generic [ref=e238]: published
                    - generic [ref=e239]: Owner-only view
                  - heading "Negotiation proof cassava 1776549245852 approve" [level=3] [ref=e240]
                - paragraph [ref=e241]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e242]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e244] [cursor=pointer]:
                  - /url: /app/market/listings/listing-0b1a68d65096
              - listitem [ref=e245]:
                - generic [ref=e246]:
                  - generic [ref=e247]:
                    - generic [ref=e248]: published
                    - generic [ref=e249]: Owner-only view
                  - heading "Negotiation proof cassava 1776549114448 reject" [level=3] [ref=e250]
                - paragraph [ref=e251]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e252]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e254] [cursor=pointer]:
                  - /url: /app/market/listings/listing-d023c29e5e55
              - listitem [ref=e255]:
                - generic [ref=e256]:
                  - generic [ref=e257]:
                    - generic [ref=e258]: published
                    - generic [ref=e259]: Owner-only view
                  - heading "Negotiation proof cassava 1776549114448 approve" [level=3] [ref=e260]
                - paragraph [ref=e261]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e262]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e264] [cursor=pointer]:
                  - /url: /app/market/listings/listing-1d862c655bf2
              - listitem [ref=e265]:
                - generic [ref=e266]:
                  - generic [ref=e267]:
                    - generic [ref=e268]: published
                    - generic [ref=e269]: Owner-only view
                  - heading "Negotiation proof cassava 1776548309851 reject" [level=3] [ref=e270]
                - paragraph [ref=e271]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e272]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e274] [cursor=pointer]:
                  - /url: /app/market/listings/listing-da32161f4cfc
              - listitem [ref=e275]:
                - generic [ref=e276]:
                  - generic [ref=e277]:
                    - generic [ref=e278]: published
                    - generic [ref=e279]: Owner-only view
                  - heading "Negotiation proof cassava 1776548309851 approve" [level=3] [ref=e280]
                - paragraph [ref=e281]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e282]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e284] [cursor=pointer]:
                  - /url: /app/market/listings/listing-39702050043d
              - listitem [ref=e285]:
                - generic [ref=e286]:
                  - generic [ref=e287]:
                    - generic [ref=e288]: published
                    - generic [ref=e289]: Owner-only view
                  - heading "Negotiation proof cassava 1776548165795 reject" [level=3] [ref=e290]
                - paragraph [ref=e291]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e292]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e294] [cursor=pointer]:
                  - /url: /app/market/listings/listing-ad683bbf5817
              - listitem [ref=e295]:
                - generic [ref=e296]:
                  - generic [ref=e297]:
                    - generic [ref=e298]: published
                    - generic [ref=e299]: Owner-only view
                  - heading "Negotiation proof cassava 1776548165795 approve" [level=3] [ref=e300]
                - paragraph [ref=e301]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e302]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e304] [cursor=pointer]:
                  - /url: /app/market/listings/listing-93d031c50e95
              - listitem [ref=e305]:
                - generic [ref=e306]:
                  - generic [ref=e307]:
                    - generic [ref=e308]: published
                    - generic [ref=e309]: Owner-only view
                  - heading "Negotiation proof cassava 1776545477386 reject" [level=3] [ref=e310]
                - paragraph [ref=e311]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e312]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e314] [cursor=pointer]:
                  - /url: /app/market/listings/listing-3735bfd1a9ec
              - listitem [ref=e315]:
                - generic [ref=e316]:
                  - generic [ref=e317]:
                    - generic [ref=e318]: published
                    - generic [ref=e319]: Owner-only view
                  - heading "Negotiation proof cassava 1776545477386 approve" [level=3] [ref=e320]
                - paragraph [ref=e321]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e322]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e324] [cursor=pointer]:
                  - /url: /app/market/listings/listing-c771fdb4ac91
              - listitem [ref=e325]:
                - generic [ref=e326]:
                  - generic [ref=e327]:
                    - generic [ref=e328]: published
                    - generic [ref=e329]: Owner-only view
                  - heading "Negotiation proof cassava 1776545286996 reject" [level=3] [ref=e330]
                - paragraph [ref=e331]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e332]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e334] [cursor=pointer]:
                  - /url: /app/market/listings/listing-8b7445b400d1
              - listitem [ref=e335]:
                - generic [ref=e336]:
                  - generic [ref=e337]:
                    - generic [ref=e338]: published
                    - generic [ref=e339]: Owner-only view
                  - heading "Negotiation proof cassava 1776545286996 approve" [level=3] [ref=e340]
                - paragraph [ref=e341]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e342]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e344] [cursor=pointer]:
                  - /url: /app/market/listings/listing-df5a94b7b103
              - listitem [ref=e345]:
                - generic [ref=e346]:
                  - generic [ref=e347]:
                    - generic [ref=e348]: published
                    - generic [ref=e349]: Owner-only view
                  - heading "Negotiation proof cassava 1776543687582 reject" [level=3] [ref=e350]
                - paragraph [ref=e351]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e352]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e354] [cursor=pointer]:
                  - /url: /app/market/listings/listing-512672c600f5
              - listitem [ref=e355]:
                - generic [ref=e356]:
                  - generic [ref=e357]:
                    - generic [ref=e358]: published
                    - generic [ref=e359]: Owner-only view
                  - heading "Negotiation proof cassava 1776543687582 approve" [level=3] [ref=e360]
                - paragraph [ref=e361]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e362]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e364] [cursor=pointer]:
                  - /url: /app/market/listings/listing-d7708f558d5d
              - listitem [ref=e365]:
                - generic [ref=e366]:
                  - generic [ref=e367]:
                    - generic [ref=e368]: published
                    - generic [ref=e369]: Owner-only view
                  - heading "Negotiation proof cassava 1776543374412 reject" [level=3] [ref=e370]
                - paragraph [ref=e371]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e372]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e374] [cursor=pointer]:
                  - /url: /app/market/listings/listing-52f5fe8936fc
              - listitem [ref=e375]:
                - generic [ref=e376]:
                  - generic [ref=e377]:
                    - generic [ref=e378]: published
                    - generic [ref=e379]: Owner-only view
                  - heading "Negotiation proof cassava 1776543374412 approve" [level=3] [ref=e380]
                - paragraph [ref=e381]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e382]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e384] [cursor=pointer]:
                  - /url: /app/market/listings/listing-a651e20aed06
```

# Test source

```ts
  107 |     }
  108 |   }
  109 | }
  110 | 
  111 | export async function signInAndGrantConsent(
  112 |   page: Page,
  113 |   input: {
  114 |     displayName: string;
  115 |     email: string;
  116 |     role: Role;
  117 |     countryCode?: "GH" | "NG" | "JM";
  118 |   },
  119 | ): Promise<void> {
  120 |   await signIn(page, input);
  121 |   await grantConsent(page);
  122 |   const sessionReady = await page
  123 |     .waitForFunction(
  124 |       ([sessionKey, tokenKey, role]) => {
  125 |         if (!window.localStorage.getItem(tokenKey)) {
  126 |           return false;
  127 |         }
  128 |         const raw = window.localStorage.getItem(sessionKey);
  129 |         if (!raw) {
  130 |           return false;
  131 |         }
  132 |         try {
  133 |           const session = JSON.parse(raw) as {
  134 |             actor?: { role?: string };
  135 |           };
  136 |           return session.actor?.role === role;
  137 |         } catch {
  138 |           return false;
  139 |         }
  140 |       },
  141 |       [SESSION_KEY, TOKEN_KEY, input.role],
  142 |       { timeout: 30_000 },
  143 |     )
  144 |     .then(() => true)
  145 |     .catch(() => false);
  146 |   if (!sessionReady) {
  147 |     await restoreWorkspaceFromSession(page);
  148 |   }
  149 |   await page.waitForFunction(
  150 |     ([sessionKey, tokenKey, role]) => {
  151 |       if (!window.localStorage.getItem(tokenKey)) {
  152 |         return false;
  153 |       }
  154 |       const raw = window.localStorage.getItem(sessionKey);
  155 |       if (!raw) {
  156 |         return false;
  157 |       }
  158 |       try {
  159 |         const session = JSON.parse(raw) as {
  160 |           actor?: { role?: string };
  161 |         };
  162 |         return session.actor?.role === role;
  163 |       } catch {
  164 |         return false;
  165 |       }
  166 |     },
  167 |     [SESSION_KEY, TOKEN_KEY, input.role],
  168 |     { timeout: 30_000 },
  169 |   );
  170 |   await gotoPath(page, roleHomeRoute[input.role]);
  171 |   await expect(page).toHaveURL(new RegExp(`${roleHomeRoute[input.role]}$`), {
  172 |     timeout: 20_000,
  173 |   });
  174 | }
  175 | 
  176 | export async function createListing(
  177 |   page: Page,
  178 |   input: {
  179 |     title: string;
  180 |     commodity: string;
  181 |     quantityTons: string;
  182 |     priceAmount: string;
  183 |     priceCurrency: string;
  184 |     location: string;
  185 |     summary: string;
  186 |   },
  187 | ): Promise<string> {
  188 |   await gotoPath(page, "/app/market/listings");
  189 |   const listingTitleField = page.getByLabel("Listing title");
  190 |   const listingFormVisible = await listingTitleField.isVisible({ timeout: 8_000 }).catch(() => false);
  191 |   if (!listingFormVisible) {
  192 |     await restoreWorkspaceFromSession(page);
  193 |     await gotoPath(page, "/app/market/listings");
  194 |   }
  195 |   await expect(listingTitleField).toBeVisible({ timeout: 20_000 });
  196 |   await listingTitleField.fill(input.title);
  197 |   await page.getByLabel("Commodity").fill(input.commodity);
  198 |   await page.getByLabel("Quantity (tons)").fill(input.quantityTons);
  199 |   await page.getByLabel("Price amount").fill(input.priceAmount);
  200 |   await page.getByLabel("Currency").fill(input.priceCurrency);
  201 |   await page.getByLabel("Location").fill(input.location);
  202 |   await page.getByLabel("Summary").fill(input.summary);
  203 |   const createButton = page.getByRole("button", { name: "Create listing" });
  204 |   await createButton.click();
  205 | 
  206 |   const listingItem = page.getByRole("listitem").filter({ hasText: input.title }).first();
> 207 |   await expect(listingItem).toBeVisible({ timeout: 30_000 });
      |                             ^ Error: expect(locator).toBeVisible() failed
  208 |   const detailLink = listingItem.getByRole("link", { name: "View and edit" });
  209 |   await expect(detailLink).toBeVisible({ timeout: 30_000 });
  210 |   const href = await detailLink.getAttribute("href");
  211 |   if (!href) {
  212 |     throw new Error("Expected listing detail link href");
  213 |   }
  214 |   return href;
  215 | }
  216 | 
  217 | async function restoreWorkspaceFromSession(page: Page): Promise<void> {
  218 |   const role = await page.evaluate(([sessionKey]) => {
  219 |     const raw = window.localStorage.getItem(sessionKey);
  220 |     if (!raw) {
  221 |       return null;
  222 |     }
  223 |     try {
  224 |       const session = JSON.parse(raw) as { actor?: { role?: string } };
  225 |       return session.actor?.role ?? null;
  226 |     } catch {
  227 |       return null;
  228 |     }
  229 |   }, [SESSION_KEY]);
  230 | 
  231 |   if (!role || !(role in roleHomeRoute)) {
  232 |     return;
  233 |   }
  234 | 
  235 |   const route = roleHomeRoute[role as Role];
  236 |   await gotoPath(page, route);
  237 |   await expect(page).toHaveURL(new RegExp(`${route}(\\?.*)?$`), { timeout: 20_000 });
  238 | }
  239 | 
  240 | export function listingIdFromHref(href: string): string {
  241 |   const url = new URL(href, "http://127.0.0.1:3000");
  242 |   const segments = url.pathname.split("/").filter(Boolean);
  243 |   const listingId = segments.at(-1);
  244 |   if (!listingId) {
  245 |     throw new Error(`Expected listing id in href: ${href}`);
  246 |   }
  247 |   return listingId;
  248 | }
  249 | 
  250 | export async function gotoPath(page: Page, path: string): Promise<void> {
  251 |   for (let attempt = 0; attempt < 3; attempt += 1) {
  252 |     try {
  253 |       await page.goto(path, { waitUntil: "domcontentloaded", timeout: 60_000 });
  254 |       return;
  255 |     } catch (error) {
  256 |       const message = error instanceof Error ? error.message : String(error);
  257 |       if (
  258 |         (!message.includes("net::ERR_ABORTED") &&
  259 |           !message.includes("page crashed") &&
  260 |           !message.includes("net::ERR_INSUFFICIENT_RESOURCES")) ||
  261 |         attempt === 2
  262 |       ) {
  263 |         throw error;
  264 |       }
  265 |       await page.waitForTimeout(500);
  266 |     }
  267 |   }
  268 | }
  269 | 
  270 | async function waitForInteractiveForm(page: Page, route: "/signin" | "/onboarding/consent"): Promise<void> {
  271 |   await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}(\\?.*)?$`), {
  272 |     timeout: 20_000,
  273 |   });
  274 |   await expect(page.locator("form[data-interactive='true']")).toBeVisible({
  275 |     timeout: 20_000,
  276 |   });
  277 | }
  278 | 
```