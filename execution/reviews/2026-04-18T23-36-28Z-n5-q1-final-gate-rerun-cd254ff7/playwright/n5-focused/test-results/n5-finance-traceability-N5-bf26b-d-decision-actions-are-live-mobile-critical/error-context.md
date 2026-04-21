# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: n5-finance-traceability.spec.ts >> N5 finance and traceability tranche checks >> CJ-004/CJ-008 finance HITL queue and decision actions are live
- Location: tests/e2e/n5-finance-traceability.spec.ts:214:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('listing/listing-201', { exact: true })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByText('listing/listing-201', { exact: true })

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
            - generic [ref=e19]: Finance
            - generic [ref=e20]: GH
          - paragraph [ref=e21]: Finance N5
          - heading "Ghana Growers Network" [level=1] [ref=e22]
          - paragraph [ref=e23]: finance.n5.1776555461112@example.com · Finance · GH
        - generic [ref=e24]:
          - generic [ref=e25]: Trace trace-pp-finance-queue-7p709e
          - button "Sign out" [ref=e26] [cursor=pointer]
      - region "Sync status" [ref=e27]:
        - generic [ref=e28]:
          - generic [ref=e30]: Online
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e31]
          - paragraph [ref=e32]: "Pending items: 0. Conflicts: 0. Trace ID: trace-pp-finance-queue-7p709e."
        - generic [ref=e33]:
          - button "Force online" [ref=e34] [cursor=pointer]
          - button "Simulate degraded" [ref=e35] [cursor=pointer]
          - button "Simulate offline" [ref=e36] [cursor=pointer]
      - generic [ref=e39]:
        - generic [ref=e40]:
          - generic [ref=e41]:
            - generic [ref=e42]:
              - paragraph [ref=e43]: Finance and insurance HITL
              - heading "Review partner-owned decisions without hidden approval paths" [level=2] [ref=e44]
              - paragraph [ref=e45]: Queue state, responsibility boundaries, partner status, and actor-attributed actions stay visible in one lane.
            - generic [ref=e47]:
              - generic [ref=e48]: 0 queue item(s)
              - generic [ref=e49]: Partner approval required
          - paragraph [ref=e50]: The console records partner decisions only. Internal approval shortcuts remain blocked by runtime policy.
        - generic [ref=e51]:
          - generic [ref=e53]:
            - paragraph [ref=e54]: Create review case
            - heading "Submit finance partner request" [level=2] [ref=e55]
            - paragraph [ref=e56]: Requests are sent through the canonical workflow command bus and become queue entries when accepted.
          - generic [ref=e57]:
            - generic [ref=e58]:
              - text: Case reference
              - textbox "Case reference" [ref=e59]: listing/listing-201
            - generic [ref=e60]:
              - text: Product type
              - combobox "Product type" [ref=e61]:
                - option "Invoice advance" [selected]
                - option "Working capital"
                - option "Input credit"
            - generic [ref=e62]:
              - text: Requested amount
              - textbox "Requested amount" [ref=e63]: "1500"
            - generic [ref=e64]:
              - text: Currency
              - textbox "Currency" [ref=e65]: GHS
            - generic [ref=e66]:
              - text: Partner id
              - textbox "Partner id" [ref=e67]: partner-agri-bank
            - generic [ref=e68]:
              - text: Partner reference
              - textbox "Partner reference" [ref=e69]: partner-case-201
          - button "Submit finance request" [ref=e71] [cursor=pointer]
          - alert [ref=e72]: "[ { \"code\": \"invalid_type\", \"expected\": \"object\", \"received\": \"undefined\", \"path\": [], \"message\": \"Required\" } ]"
        - generic [ref=e73]:
          - generic [ref=e74]:
            - generic [ref=e75]:
              - generic [ref=e76]:
                - paragraph [ref=e77]: Queue
                - heading "Finance and insurance review queue" [level=2] [ref=e78]
                - paragraph [ref=e79]: Filters expose explicit state coverage for pending review, approved, blocked, and HITL required.
              - generic [ref=e81]:
                - text: Filter
                - combobox "Filter" [ref=e82]:
                  - option "All" [selected]
                  - option "Pending review"
                  - option "Approved"
                  - option "Blocked"
                  - option "HITL required"
            - complementary [ref=e83]:
              - strong [ref=e84]: No queue items yet
              - paragraph [ref=e85]: Submit a finance partner request to populate the HITL review queue with runtime-backed records.
          - paragraph [ref=e88]: Select a queue item to inspect responsibility boundaries, partner status, and decision history.
      - navigation "Mobile primary" [ref=e90]:
        - link "Home" [ref=e91] [cursor=pointer]:
          - /url: /app/finance
          - generic [ref=e92]: Home
        - link "Queue" [ref=e93] [cursor=pointer]:
          - /url: /app/finance/queue
          - generic [ref=e94]: Queue
        - link "Market" [ref=e95] [cursor=pointer]:
          - /url: /app/market/listings
          - generic [ref=e96]: Market
        - link "Inbox" [ref=e97] [cursor=pointer]:
          - /url: /app/market/negotiations
          - generic [ref=e98]: Inbox
        - link "Alerts" [ref=e99] [cursor=pointer]:
          - /url: /app/climate/alerts
          - generic [ref=e100]: Alerts
```

# Test source

```ts
  127 |   const consignmentId = createJson.result?.consignment?.consignment_id ?? createJson.result?.consignment_id;
  128 |   if (!consignmentId) {
  129 |     throw new Error(`traceability.consignments.create did not return consignment_id: ${JSON.stringify(createJson)}`);
  130 |   }
  131 | 
  132 |   const harvestRequestId = crypto.randomUUID();
  133 |   const harvestResponse = await request.post(`${apiBaseUrl}/api/v1/workflow/commands`, {
  134 |     data: {
  135 |       metadata: {
  136 |         request_id: harvestRequestId,
  137 |         idempotency_key: crypto.randomUUID(),
  138 |         actor_id: actorId,
  139 |         country_code: countryCode,
  140 |         channel: "pwa",
  141 |         schema_version: schemaVersion,
  142 |         correlation_id: harvestRequestId,
  143 |         occurred_at: new Date().toISOString(),
  144 |         traceability: {
  145 |           journey_ids: ["CJ-007"],
  146 |           data_check_ids: ["DI-006"],
  147 |         },
  148 |       },
  149 |       command: {
  150 |         name: "traceability.events.append",
  151 |         aggregate_ref: "traceability",
  152 |         mutation_scope: "traceability.runtime",
  153 |         payload: {
  154 |           consignment_id: consignmentId,
  155 |           milestone: "harvested",
  156 |           event_reference: harvestedReference,
  157 |           previous_event_reference: null,
  158 |           occurred_at: new Date().toISOString(),
  159 |           current_custody_actor_id: actorId,
  160 |         },
  161 |       },
  162 |     },
  163 |     headers: {
  164 |       Authorization: `Bearer ${actor.accessToken}`,
  165 |       "X-Correlation-ID": harvestRequestId,
  166 |       "X-Request-ID": harvestRequestId,
  167 |     },
  168 |   });
  169 |   expect(harvestResponse.ok()).toBeTruthy();
  170 | 
  171 |   const dispatchRequestId = crypto.randomUUID();
  172 |   const dispatchResponse = await request.post(`${apiBaseUrl}/api/v1/workflow/commands`, {
  173 |     data: {
  174 |       metadata: {
  175 |         request_id: dispatchRequestId,
  176 |         idempotency_key: crypto.randomUUID(),
  177 |         actor_id: actorId,
  178 |         country_code: countryCode,
  179 |         channel: "pwa",
  180 |         schema_version: schemaVersion,
  181 |         correlation_id: dispatchRequestId,
  182 |         occurred_at: new Date().toISOString(),
  183 |         traceability: {
  184 |           journey_ids: ["CJ-007"],
  185 |           data_check_ids: ["DI-006"],
  186 |         },
  187 |       },
  188 |       command: {
  189 |         name: "traceability.events.append",
  190 |         aggregate_ref: "traceability",
  191 |         mutation_scope: "traceability.runtime",
  192 |         payload: {
  193 |           consignment_id: consignmentId,
  194 |           milestone: "dispatched",
  195 |           event_reference: dispatchedReference,
  196 |           previous_event_reference: harvestedReference,
  197 |           occurred_at: new Date().toISOString(),
  198 |           current_custody_actor_id: "actor-transporter-gh-1",
  199 |         },
  200 |       },
  201 |     },
  202 |     headers: {
  203 |       Authorization: `Bearer ${actor.accessToken}`,
  204 |       "X-Correlation-ID": dispatchRequestId,
  205 |       "X-Request-ID": dispatchRequestId,
  206 |     },
  207 |   });
  208 |   expect(dispatchResponse.ok()).toBeTruthy();
  209 | 
  210 |   return { consignmentId, harvestedReference, dispatchedReference };
  211 | }
  212 | 
  213 | test.describe("N5 finance and traceability tranche checks", () => {
  214 |   test("CJ-004/CJ-008 finance HITL queue and decision actions are live", async ({ page, request }) => {
  215 |     const finance = await createAuthenticatedSession(request, {
  216 |       displayName: "Finance N5",
  217 |       email: `finance.n5.${Date.now()}@example.com`,
  218 |       role: "finance",
  219 |       countryCode: "GH",
  220 |     });
  221 |     await primeSession(page, finance);
  222 | 
  223 |     await gotoPath(page, "/app/finance/queue");
  224 |     await expect(page.getByRole("heading", { name: "Review partner-owned decisions without hidden approval paths" })).toBeVisible();
  225 | 
  226 |     await page.getByRole("button", { name: "Submit finance request" }).click();
> 227 |     await expect(page.getByText("listing/listing-201", { exact: true })).toBeVisible();
      |                                                                          ^ Error: expect(locator).toBeVisible() failed
  228 | 
  229 |     await page.getByRole("button", { name: "Record partner approved" }).click();
  230 |     await expect(page.getByText("evidence_sufficient")).toBeVisible();
  231 |     await expect(page.getByText("Actor history count")).toBeVisible();
  232 | 
  233 |     await page.getByRole("button", { name: "Evaluate trigger" }).click();
  234 |     await expect(page.getByText("Payout dedupe key")).toBeVisible();
  235 |   });
  236 | 
  237 |   test("CJ-007 traceability timeline renders ordered events and explicit evidence state", async ({ page, request }) => {
  238 |     const farmer = await createAuthenticatedSession(request, {
  239 |       displayName: "Farmer N5",
  240 |       email: `farmer.n5.${Date.now()}@example.com`,
  241 |       role: "farmer",
  242 |       countryCode: "GH",
  243 |     });
  244 |     const timelineSeed = await createConsignmentTimeline(request, farmer);
  245 |     await primeSession(page, farmer);
  246 | 
  247 |     await gotoPath(page, `/app/traceability/${timelineSeed.consignmentId}`);
  248 |     await expect(page.getByRole("heading", { name: "Ordered event chain" })).toBeVisible();
  249 |     await expect(page.getByText(timelineSeed.harvestedReference).first()).toBeVisible();
  250 |     await expect(page.getByText(timelineSeed.dispatchedReference).first()).toBeVisible();
  251 |     await expect(page.getByText("No evidence attachment metadata returned")).toBeVisible();
  252 |   });
  253 | });
  254 | 
```