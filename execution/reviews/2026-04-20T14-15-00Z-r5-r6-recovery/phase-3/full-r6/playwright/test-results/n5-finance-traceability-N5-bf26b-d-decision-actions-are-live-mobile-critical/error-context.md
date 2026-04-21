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

Locator: getByRole('heading', { name: 'Review partner-owned decisions without hidden approval paths' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('heading', { name: 'Review partner-owned decisions without hidden approval paths' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - main [ref=e3]:
    - generic [ref=e4]:
      - paragraph [ref=e5]: Loading workspace
      - heading "Restoring route and contract state." [level=1] [ref=e6]
      - paragraph [ref=e7]: The workspace waits for local identity and queue state so offline recovery stays deterministic.
  - button "Open Next.js Dev Tools" [ref=e13] [cursor=pointer]:
    - img [ref=e14]
  - alert [ref=e17]
```

# Test source

```ts
  124 |       consignment_id?: string;
  125 |     };
  126 |   };
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
> 224 |     await expect(page.getByRole("heading", { name: "Review partner-owned decisions without hidden approval paths" })).toBeVisible();
      |                                                                                                                       ^ Error: expect(locator).toBeVisible() failed
  225 | 
  226 |     await page.getByRole("button", { name: "Submit finance request" }).click();
  227 |     await expect(page.getByText("listing/listing-201", { exact: true })).toBeVisible();
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