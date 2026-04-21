# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: negotiation.spec.ts >> Negotiation inbox and thread proof >> pending confirmation approve/reject paths lock terminal state and outsider thread access is blocked
- Location: tests/e2e/negotiation.spec.ts:250:7

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
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
          - paragraph [ref=e23]: seller.negotiation.1776556657192@example.com · Farmer · GH
        - generic [ref=e24]:
          - generic [ref=e25]: Trace trace--market-listings-loz762
          - button "Sign out" [ref=e26] [cursor=pointer]
      - region "Sync status" [ref=e27]:
        - generic [ref=e28]:
          - generic [ref=e30]: Online
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e31]
          - paragraph [ref=e32]: "Pending items: 0. Conflicts: 0. Trace ID: trace--market-listings-loz762."
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
                - button "Create listing" [ref=e111] [cursor=pointer]
            - article [ref=e112]:
              - generic [ref=e114]:
                - paragraph [ref=e115]: Server evidence
                - heading "Audit and idempotency receipt" [level=2] [ref=e116]
                - paragraph [ref=e117]: Create and edit commands return request metadata that can be queried back through the audit route.
              - generic [ref=e118]:
                - generic [ref=e119]:
                  - generic [ref=e120]: Create committed
                  - generic [ref=e121]: Single effect
                - paragraph [ref=e122]: "Listing ID: listing-c3c39ba39fab"
                - paragraph [ref=e123]: "Request ID: 785a94bb-5da2-4b7b-903f-d7c48671850c"
                - paragraph [ref=e124]: "Idempotency key: 218ce574-bb41-4693-b188-f16689b44af8"
                - paragraph [ref=e125]: "Audit events returned: 1"
                - link "Open owner detail" [ref=e126] [cursor=pointer]:
                  - /url: /app/market/listings/listing-c3c39ba39fab
          - generic [ref=e127]:
            - generic [ref=e129]:
              - paragraph [ref=e130]: Owner listings
              - heading "Owned supply with publish and revision cues" [level=2] [ref=e131]
              - paragraph [ref=e132]: Each listing remains editable by the owner, and buyer visibility state is explicit.
            - list "Owner listing collection" [ref=e133]:
              - listitem [ref=e134]:
                - generic [ref=e135]:
                  - generic [ref=e136]:
                    - generic [ref=e137]: draft
                    - generic [ref=e138]: Owner-only view
                  - heading "Negotiation proof cassava 1776556657192 reject" [level=3] [ref=e139]
                - paragraph [ref=e140]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e141]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e143] [cursor=pointer]:
                  - /url: /app/market/listings/listing-c3c39ba39fab
              - listitem [ref=e144]:
                - generic [ref=e145]:
                  - generic [ref=e146]:
                    - generic [ref=e147]: published
                    - generic [ref=e148]: Owner-only view
                  - heading "Negotiation proof cassava 1776556657192 approve" [level=3] [ref=e149]
                - paragraph [ref=e150]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e151]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e153] [cursor=pointer]:
                  - /url: /app/market/listings/listing-3bb5ce84e33b
              - listitem [ref=e154]:
                - generic [ref=e155]:
                  - generic [ref=e156]:
                    - generic [ref=e157]: published
                    - generic [ref=e158]: Owner-only view
                  - heading "Negotiation proof cassava 1776556524396 reject" [level=3] [ref=e159]
                - paragraph [ref=e160]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e161]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e163] [cursor=pointer]:
                  - /url: /app/market/listings/listing-2155fdea8957
              - listitem [ref=e164]:
                - generic [ref=e165]:
                  - generic [ref=e166]:
                    - generic [ref=e167]: published
                    - generic [ref=e168]: Owner-only view
                  - heading "Negotiation proof cassava 1776556524396 approve" [level=3] [ref=e169]
                - paragraph [ref=e170]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e171]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e173] [cursor=pointer]:
                  - /url: /app/market/listings/listing-9b33e1d29352
              - listitem [ref=e174]:
                - generic [ref=e175]:
                  - generic [ref=e176]:
                    - generic [ref=e177]: draft
                    - generic [ref=e178]: Owner-only view
                  - heading "Negotiation proof cassava 1776556467432 reject" [level=3] [ref=e179]
                - paragraph [ref=e180]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e181]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e183] [cursor=pointer]:
                  - /url: /app/market/listings/listing-18aca8a3bc3b
              - listitem [ref=e184]:
                - generic [ref=e185]:
                  - generic [ref=e186]:
                    - generic [ref=e187]: published
                    - generic [ref=e188]: Owner-only view
                  - heading "Negotiation proof cassava 1776556467432 approve" [level=3] [ref=e189]
                - paragraph [ref=e190]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e191]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e193] [cursor=pointer]:
                  - /url: /app/market/listings/listing-080292a1f129
              - listitem [ref=e194]:
                - generic [ref=e195]:
                  - generic [ref=e196]:
                    - generic [ref=e197]: published
                    - generic [ref=e198]: Owner-only view
                  - heading "Negotiation proof cassava 1776556330088 reject" [level=3] [ref=e199]
                - paragraph [ref=e200]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e201]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e203] [cursor=pointer]:
                  - /url: /app/market/listings/listing-2e1d7cc3fa63
              - listitem [ref=e204]:
                - generic [ref=e205]:
                  - generic [ref=e206]:
                    - generic [ref=e207]: published
                    - generic [ref=e208]: Owner-only view
                  - heading "Negotiation proof cassava 1776556330088 approve" [level=3] [ref=e209]
                - paragraph [ref=e210]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e211]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e213] [cursor=pointer]:
                  - /url: /app/market/listings/listing-f21fc8692cb6
              - listitem [ref=e214]:
                - generic [ref=e215]:
                  - generic [ref=e216]:
                    - generic [ref=e217]: published
                    - generic [ref=e218]: Owner-only view
                  - heading "Negotiation proof cassava 1776556280899 reject" [level=3] [ref=e219]
                - paragraph [ref=e220]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e221]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e223] [cursor=pointer]:
                  - /url: /app/market/listings/listing-4dbe0f7884d4
              - listitem [ref=e224]:
                - generic [ref=e225]:
                  - generic [ref=e226]:
                    - generic [ref=e227]: published
                    - generic [ref=e228]: Owner-only view
                  - heading "Negotiation proof cassava 1776556280899 approve" [level=3] [ref=e229]
                - paragraph [ref=e230]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e231]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e233] [cursor=pointer]:
                  - /url: /app/market/listings/listing-fb182dd96c64
              - listitem [ref=e234]:
                - generic [ref=e235]:
                  - generic [ref=e236]:
                    - generic [ref=e237]: published
                    - generic [ref=e238]: Owner-only view
                  - heading "Negotiation proof cassava 1776555654127 reject" [level=3] [ref=e239]
                - paragraph [ref=e240]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e241]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e243] [cursor=pointer]:
                  - /url: /app/market/listings/listing-74b62401043d
              - listitem [ref=e244]:
                - generic [ref=e245]:
                  - generic [ref=e246]:
                    - generic [ref=e247]: published
                    - generic [ref=e248]: Owner-only view
                  - heading "Negotiation proof cassava 1776555654127 approve" [level=3] [ref=e249]
                - paragraph [ref=e250]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e251]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e253] [cursor=pointer]:
                  - /url: /app/market/listings/listing-e6da2c30e78d
              - listitem [ref=e254]:
                - generic [ref=e255]:
                  - generic [ref=e256]:
                    - generic [ref=e257]: published
                    - generic [ref=e258]: Owner-only view
                  - heading "Negotiation proof cassava 1776555564658 reject" [level=3] [ref=e259]
                - paragraph [ref=e260]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e261]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e263] [cursor=pointer]:
                  - /url: /app/market/listings/listing-dce24c260655
              - listitem [ref=e264]:
                - generic [ref=e265]:
                  - generic [ref=e266]:
                    - generic [ref=e267]: published
                    - generic [ref=e268]: Owner-only view
                  - heading "Negotiation proof cassava 1776555564658 approve" [level=3] [ref=e269]
                - paragraph [ref=e270]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e271]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e273] [cursor=pointer]:
                  - /url: /app/market/listings/listing-8415d13546f5
              - listitem [ref=e274]:
                - generic [ref=e275]:
                  - generic [ref=e276]:
                    - generic [ref=e277]: published
                    - generic [ref=e278]: Owner-only view
                  - heading "Negotiation proof cassava 1776549245852 reject" [level=3] [ref=e279]
                - paragraph [ref=e280]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e281]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e283] [cursor=pointer]:
                  - /url: /app/market/listings/listing-9a2a41e0cc77
              - listitem [ref=e284]:
                - generic [ref=e285]:
                  - generic [ref=e286]:
                    - generic [ref=e287]: published
                    - generic [ref=e288]: Owner-only view
                  - heading "Negotiation proof cassava 1776549245852 approve" [level=3] [ref=e289]
                - paragraph [ref=e290]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e291]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e293] [cursor=pointer]:
                  - /url: /app/market/listings/listing-0b1a68d65096
              - listitem [ref=e294]:
                - generic [ref=e295]:
                  - generic [ref=e296]:
                    - generic [ref=e297]: published
                    - generic [ref=e298]: Owner-only view
                  - heading "Negotiation proof cassava 1776549114448 reject" [level=3] [ref=e299]
                - paragraph [ref=e300]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e301]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e303] [cursor=pointer]:
                  - /url: /app/market/listings/listing-d023c29e5e55
              - listitem [ref=e304]:
                - generic [ref=e305]:
                  - generic [ref=e306]:
                    - generic [ref=e307]: published
                    - generic [ref=e308]: Owner-only view
                  - heading "Negotiation proof cassava 1776549114448 approve" [level=3] [ref=e309]
                - paragraph [ref=e310]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e311]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e313] [cursor=pointer]:
                  - /url: /app/market/listings/listing-1d862c655bf2
              - listitem [ref=e314]:
                - generic [ref=e315]:
                  - generic [ref=e316]:
                    - generic [ref=e317]: published
                    - generic [ref=e318]: Owner-only view
                  - heading "Negotiation proof cassava 1776548309851 reject" [level=3] [ref=e319]
                - paragraph [ref=e320]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e321]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e323] [cursor=pointer]:
                  - /url: /app/market/listings/listing-da32161f4cfc
              - listitem [ref=e324]:
                - generic [ref=e325]:
                  - generic [ref=e326]:
                    - generic [ref=e327]: published
                    - generic [ref=e328]: Owner-only view
                  - heading "Negotiation proof cassava 1776548309851 approve" [level=3] [ref=e329]
                - paragraph [ref=e330]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e331]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e333] [cursor=pointer]:
                  - /url: /app/market/listings/listing-39702050043d
              - listitem [ref=e334]:
                - generic [ref=e335]:
                  - generic [ref=e336]:
                    - generic [ref=e337]: published
                    - generic [ref=e338]: Owner-only view
                  - heading "Negotiation proof cassava 1776548165795 reject" [level=3] [ref=e339]
                - paragraph [ref=e340]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e341]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e343] [cursor=pointer]:
                  - /url: /app/market/listings/listing-ad683bbf5817
              - listitem [ref=e344]:
                - generic [ref=e345]:
                  - generic [ref=e346]:
                    - generic [ref=e347]: published
                    - generic [ref=e348]: Owner-only view
                  - heading "Negotiation proof cassava 1776548165795 approve" [level=3] [ref=e349]
                - paragraph [ref=e350]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e351]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e353] [cursor=pointer]:
                  - /url: /app/market/listings/listing-93d031c50e95
              - listitem [ref=e354]:
                - generic [ref=e355]:
                  - generic [ref=e356]:
                    - generic [ref=e357]: published
                    - generic [ref=e358]: Owner-only view
                  - heading "Negotiation proof cassava 1776545477386 reject" [level=3] [ref=e359]
                - paragraph [ref=e360]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e361]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e363] [cursor=pointer]:
                  - /url: /app/market/listings/listing-3735bfd1a9ec
              - listitem [ref=e364]:
                - generic [ref=e365]:
                  - generic [ref=e366]:
                    - generic [ref=e367]: published
                    - generic [ref=e368]: Owner-only view
                  - heading "Negotiation proof cassava 1776545477386 approve" [level=3] [ref=e369]
                - paragraph [ref=e370]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e371]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e373] [cursor=pointer]:
                  - /url: /app/market/listings/listing-c771fdb4ac91
              - listitem [ref=e374]:
                - generic [ref=e375]:
                  - generic [ref=e376]:
                    - generic [ref=e377]: published
                    - generic [ref=e378]: Owner-only view
                  - heading "Negotiation proof cassava 1776545286996 reject" [level=3] [ref=e379]
                - paragraph [ref=e380]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e381]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e383] [cursor=pointer]:
                  - /url: /app/market/listings/listing-8b7445b400d1
              - listitem [ref=e384]:
                - generic [ref=e385]:
                  - generic [ref=e386]:
                    - generic [ref=e387]: published
                    - generic [ref=e388]: Owner-only view
                  - heading "Negotiation proof cassava 1776545286996 approve" [level=3] [ref=e389]
                - paragraph [ref=e390]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e391]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e393] [cursor=pointer]:
                  - /url: /app/market/listings/listing-df5a94b7b103
              - listitem [ref=e394]:
                - generic [ref=e395]:
                  - generic [ref=e396]:
                    - generic [ref=e397]: published
                    - generic [ref=e398]: Owner-only view
                  - heading "Negotiation proof cassava 1776543687582 reject" [level=3] [ref=e399]
                - paragraph [ref=e400]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e401]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e403] [cursor=pointer]:
                  - /url: /app/market/listings/listing-512672c600f5
              - listitem [ref=e404]:
                - generic [ref=e405]:
                  - generic [ref=e406]:
                    - generic [ref=e407]: published
                    - generic [ref=e408]: Owner-only view
                  - heading "Negotiation proof cassava 1776543687582 approve" [level=3] [ref=e409]
                - paragraph [ref=e410]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e411]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e413] [cursor=pointer]:
                  - /url: /app/market/listings/listing-d7708f558d5d
              - listitem [ref=e414]:
                - generic [ref=e415]:
                  - generic [ref=e416]:
                    - generic [ref=e417]: published
                    - generic [ref=e418]: Owner-only view
                  - heading "Negotiation proof cassava 1776543374412 reject" [level=3] [ref=e419]
                - paragraph [ref=e420]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e421]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e423] [cursor=pointer]:
                  - /url: /app/market/listings/listing-52f5fe8936fc
              - listitem [ref=e424]:
                - generic [ref=e425]:
                  - generic [ref=e426]:
                    - generic [ref=e427]: published
                    - generic [ref=e428]: Owner-only view
                  - heading "Negotiation proof cassava 1776543374412 approve" [level=3] [ref=e429]
                - paragraph [ref=e430]: Published cassava listing used for canonical negotiation browser proof.
                - paragraph [ref=e431]: Cassava · 6 tons · 400 GHS · Tamale, GH
                - link "View and edit" [ref=e433] [cursor=pointer]:
                  - /url: /app/market/listings/listing-a651e20aed06
```

# Test source

```ts
  42  |     headers: {
  43  |       "X-Correlation-ID": signInRequestId,
  44  |       "X-Request-ID": signInRequestId,
  45  |     },
  46  |   });
  47  |   expect(signInResponse.ok()).toBeTruthy();
  48  |   const signInPayload = (await signInResponse.json()) as {
  49  |     access_token: string;
  50  |     session: SessionSeed["session"];
  51  |   };
  52  | 
  53  |   const consentRequestId = crypto.randomUUID();
  54  |   const consentResponse = await request.post(`${API_BASE_URL}/api/v1/identity/consent`, {
  55  |     data: {
  56  |       captured_at: new Date().toISOString(),
  57  |       policy_version: "2026.04.w1",
  58  |       scope_ids: CONSENT_SCOPE_IDS,
  59  |     },
  60  |     headers: {
  61  |       Authorization: `Bearer ${signInPayload.access_token}`,
  62  |       "X-Correlation-ID": consentRequestId,
  63  |       "X-Request-ID": consentRequestId,
  64  |     },
  65  |   });
  66  |   expect(consentResponse.ok()).toBeTruthy();
  67  | 
  68  |   return {
  69  |     accessToken: signInPayload.access_token,
  70  |     session: (await consentResponse.json()) as SessionSeed["session"],
  71  |   };
  72  | }
  73  | 
  74  | async function primeSession(page: Page, sessionSeed: SessionSeed): Promise<void> {
  75  |   await gotoPath(page, "/signin");
  76  |   await page.evaluate(
  77  |     ([sessionKey, tokenKey, session, token]) => {
  78  |       window.localStorage.setItem(sessionKey, JSON.stringify(session));
  79  |       window.localStorage.setItem(tokenKey, token);
  80  |     },
  81  |     [SESSION_KEY, TOKEN_KEY, sessionSeed.session, sessionSeed.accessToken],
  82  |   );
  83  | }
  84  | 
  85  | async function activateSession(page: Page, sessionSeed: SessionSeed, route: "/app/farmer" | "/app/buyer"): Promise<void> {
  86  |   await primeSession(page, sessionSeed);
  87  |   await gotoPath(page, route);
  88  |   await waitForWorkspaceReady(page);
  89  | }
  90  | 
  91  | async function waitForWorkspaceReady(page: Page): Promise<void> {
  92  |   await page.getByText("Loading workspace").waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
  93  | }
  94  | 
  95  | async function publishListingViaCommand(
  96  |   request: APIRequestContext,
  97  |   page: Page,
  98  |   listingId: string,
  99  | ): Promise<void> {
  100 |   const token = await page.evaluate(() => window.localStorage.getItem("agrodomain.session-token.v1"));
  101 |   const sessionRaw = await page.evaluate(() => window.localStorage.getItem("agrodomain.session.v2"));
  102 |   if (!token || !sessionRaw) {
  103 |     throw new Error("Expected seller token and session in localStorage");
  104 |   }
  105 | 
  106 |   const session = JSON.parse(sessionRaw) as {
  107 |     actor: {
  108 |       actor_id: string;
  109 |       country_code: string;
  110 |     };
  111 |   };
  112 |   const requestId = crypto.randomUUID();
  113 |   const response = await request.post(`${API_BASE_URL}/api/v1/workflow/commands`, {
  114 |     data: {
  115 |       metadata: {
  116 |         request_id: requestId,
  117 |         idempotency_key: requestId,
  118 |         actor_id: session.actor.actor_id,
  119 |         country_code: session.actor.country_code,
  120 |         channel: "pwa",
  121 |         schema_version: SCHEMA_VERSION,
  122 |         correlation_id: requestId,
  123 |         occurred_at: new Date().toISOString(),
  124 |         traceability: {
  125 |           journey_ids: ["CJ-002"],
  126 |           data_check_ids: ["DI-001"],
  127 |         },
  128 |       },
  129 |       command: {
  130 |         name: "market.listings.publish",
  131 |         aggregate_ref: listingId,
  132 |         mutation_scope: "marketplace.listings",
  133 |         payload: {
  134 |           listing_id: listingId,
  135 |         },
  136 |       },
  137 |     },
  138 |     headers: {
  139 |       Authorization: `Bearer ${token}`,
  140 |     },
  141 |   });
> 142 |   expect(response.ok()).toBeTruthy();
      |                         ^ Error: expect(received).toBeTruthy()
  143 | }
  144 | 
  145 | async function sellerCreateAndPublishListing(request: APIRequestContext, page: Page, timestamp: number, suffix: string): Promise<string> {
  146 |   const detailHref = await createListing(page, {
  147 |     title: `Negotiation proof cassava ${timestamp} ${suffix}`,
  148 |     commodity: "Cassava",
  149 |     quantityTons: "6.0",
  150 |     priceAmount: "400",
  151 |     priceCurrency: "GHS",
  152 |     location: "Tamale, GH",
  153 |     summary: "Published cassava listing used for canonical negotiation browser proof.",
  154 |   });
  155 |   const listingId = listingIdFromHref(detailHref);
  156 |   await publishListingViaCommand(request, page, listingId);
  157 |   return listingId;
  158 | }
  159 | 
  160 | async function buyerCreateThread(
  161 |   request: APIRequestContext,
  162 |   page: Page,
  163 |   listingId: string,
  164 | ): Promise<string> {
  165 |   await gotoPath(page, `/app/market/negotiations?listingId=${listingId}`);
  166 |   await waitForWorkspaceReady(page);
  167 |   const inboxHeading = page.getByRole("heading", {
  168 |     name: "Inbox and thread controls on the canonical N2-A2 runtime",
  169 |   });
  170 |   const inboxLoaded = await inboxHeading.isVisible({ timeout: 10_000 }).catch(() => false);
  171 |   if (!inboxLoaded) {
  172 |     const inboxLink = page.getByRole("link", { name: /^Inbox/ });
  173 |     if (await inboxLink.isVisible().catch(() => false)) {
  174 |       await inboxLink.click();
  175 |     } else {
  176 |       await gotoPath(page, "/app/market/negotiations");
  177 |     }
  178 |   }
  179 |   await expect(inboxHeading).toBeVisible({ timeout: 30_000 });
  180 |   await page.getByLabel("Listing ID").fill(listingId);
  181 |   await page.getByLabel("Offer amount").fill("385");
  182 |   await page.getByLabel("Currency").fill("GHS");
  183 |   await page.getByLabel("Buyer note").fill("Buyer opening offer for canonical thread proof.");
  184 |   await page.getByRole("button", { name: "Create offer thread" }).click();
  185 |   await expect(page.getByRole("list", { name: "Negotiation threads" })).toContainText(listingId, { timeout: 30_000 });
  186 | 
  187 |   const buyerThreadButton = page
  188 |     .getByRole("list", { name: "Negotiation threads" })
  189 |     .getByRole("button")
  190 |     .filter({ hasText: listingId })
  191 |     .first();
  192 |   await expect(buyerThreadButton).toBeVisible({ timeout: 30_000 });
  193 |   await buyerThreadButton.scrollIntoViewIfNeeded();
  194 |   await buyerThreadButton.click();
  195 | 
  196 |   const token = await page.evaluate((tokenKey) => window.localStorage.getItem(tokenKey), TOKEN_KEY);
  197 |   if (!token) {
  198 |     throw new Error("Expected buyer token in localStorage");
  199 |   }
  200 |   const threadsResponse = await request.get(`${API_BASE_URL}/api/v1/marketplace/negotiations`, {
  201 |     headers: {
  202 |       Authorization: `Bearer ${token}`,
  203 |     },
  204 |   });
  205 |   expect(threadsResponse.ok()).toBeTruthy();
  206 |   const threadsPayload = (await threadsResponse.json()) as {
  207 |     items: Array<{ listing_id: string; thread_id: string }>;
  208 |   };
  209 |   const matchingThread = threadsPayload.items.find((item) => item.listing_id === listingId);
  210 |   if (!matchingThread) {
  211 |     throw new Error(`Expected negotiation thread for listing ${listingId}`);
  212 |   }
  213 |   return matchingThread.thread_id;
  214 | }
  215 | 
  216 | async function sellerRequestConfirmation(page: Page, listingId: string): Promise<void> {
  217 |   await gotoPath(page, "/app/market/negotiations");
  218 |   await waitForWorkspaceReady(page);
  219 |   const sellerThreadList = page.getByRole("list", { name: "Negotiation threads" });
  220 |   await expect(sellerThreadList).toContainText(listingId, { timeout: 30_000 });
  221 |   await sellerThreadList.getByRole("button").filter({ hasText: listingId }).first().click();
  222 |   await expect(page.getByRole("heading", { name: "Request confirmation" })).toBeVisible({ timeout: 30_000 });
  223 |   await page.getByLabel("Checkpoint note").fill("Seller requests final buyer confirmation.");
  224 |   await page.getByRole("button", { name: "Move to pending confirmation" }).click();
  225 |   await expect(page.getByText("Pending confirmation checkpoint")).toBeVisible({ timeout: 30_000 });
  226 |   await expect(page.getByText("Waiting for authorized confirmer")).toBeVisible();
  227 |   await expect(page.getByRole("button", { name: "Approve thread" })).toHaveCount(0);
  228 |   await expect(page.getByRole("button", { name: "Reject thread" })).toHaveCount(0);
  229 | }
  230 | 
  231 | async function buyerOpenPendingConfirmationThread(page: Page, listingId: string): Promise<void> {
  232 |   await gotoPath(page, "/app/market/negotiations");
  233 |   await waitForWorkspaceReady(page);
  234 |   const buyerThreadButton = page
  235 |     .getByRole("list", { name: "Negotiation threads" })
  236 |     .getByRole("button")
  237 |     .filter({ hasText: listingId })
  238 |     .first();
  239 |   await expect(buyerThreadButton).toBeVisible({ timeout: 30_000 });
  240 |   await buyerThreadButton.scrollIntoViewIfNeeded();
  241 |   await buyerThreadButton.click();
  242 |   await expect(page.getByText("Pending confirmation checkpoint")).toBeVisible();
```