# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: n5-finance-traceability.spec.ts >> N5 finance and traceability tranche checks >> CJ-007 traceability timeline renders ordered events and explicit evidence state
- Location: tests/e2e/n5-finance-traceability.spec.ts:237:7

# Error details

```
Error: traceability.consignments.create did not return consignment_id: {"status":"accepted","request_id":"e3f2d402-8deb-4ac8-9b10-d787a022b075","idempotency_key":"3e46b165-b3fa-40af-b756-31e5f7ccd183","result":{"execution_id":14,"command_name":"traceability.consignments.create","accepted":true},"error_code":null,"audit_event_id":357,"replayed":false}
```

# Test source

```ts
  29  |   const signInResponse = await request.post(`${apiBaseUrl}/api/v1/identity/session`, {
  30  |     data: {
  31  |       display_name: input.displayName,
  32  |       email: input.email,
  33  |       role: input.role,
  34  |       country_code: input.countryCode,
  35  |     },
  36  |     headers: {
  37  |       "X-Correlation-ID": signInRequestId,
  38  |       "X-Request-ID": signInRequestId,
  39  |     },
  40  |   });
  41  |   expect(signInResponse.ok()).toBeTruthy();
  42  |   const signInPayload = (await signInResponse.json()) as {
  43  |     access_token: string;
  44  |   };
  45  | 
  46  |   const consentRequestId = crypto.randomUUID();
  47  |   const consentResponse = await request.post(`${apiBaseUrl}/api/v1/identity/consent`, {
  48  |     data: {
  49  |       captured_at: new Date().toISOString(),
  50  |       policy_version: "2026.04.w5",
  51  |       scope_ids: ["identity.core", "workflow.audit", "regulated.finance", "traceability.runtime"],
  52  |     },
  53  |     headers: {
  54  |       Authorization: `Bearer ${signInPayload.access_token}`,
  55  |       "X-Correlation-ID": consentRequestId,
  56  |       "X-Request-ID": consentRequestId,
  57  |     },
  58  |   });
  59  |   expect(consentResponse.ok()).toBeTruthy();
  60  | 
  61  |   return {
  62  |     accessToken: signInPayload.access_token,
  63  |     session: (await consentResponse.json()) as Record<string, unknown>,
  64  |   };
  65  | }
  66  | 
  67  | async function primeSession(page: Page, sessionSeed: SessionSeed): Promise<void> {
  68  |   await gotoPath(page, "/signin");
  69  |   await page.evaluate(
  70  |     ([sessionKey, tokenKey, session, token]) => {
  71  |       window.localStorage.setItem(sessionKey, JSON.stringify(session));
  72  |       window.localStorage.setItem(tokenKey, token);
  73  |     },
  74  |     [SESSION_KEY, TOKEN_KEY, sessionSeed.session, sessionSeed.accessToken],
  75  |   );
  76  | }
  77  | 
  78  | async function createConsignmentTimeline(
  79  |   request: APIRequestContext,
  80  |   actor: SessionSeed,
  81  | ): Promise<{ consignmentId: string; harvestedReference: string; dispatchedReference: string }> {
  82  |   const actorId = String((actor.session.actor as { actor_id: string }).actor_id);
  83  |   const countryCode = String((actor.session.actor as { country_code: string }).country_code);
  84  |   const eventRefSeed = crypto.randomUUID().slice(0, 8);
  85  |   const harvestedReference = `evt-ref-harvested-${eventRefSeed}`;
  86  |   const dispatchedReference = `evt-ref-dispatched-${eventRefSeed}`;
  87  |   const createRequestId = crypto.randomUUID();
  88  |   const createResponse = await request.post(`${apiBaseUrl}/api/v1/workflow/commands`, {
  89  |     data: {
  90  |       metadata: {
  91  |         request_id: createRequestId,
  92  |         idempotency_key: crypto.randomUUID(),
  93  |         actor_id: actorId,
  94  |         country_code: countryCode,
  95  |         channel: "pwa",
  96  |         schema_version: schemaVersion,
  97  |         correlation_id: createRequestId,
  98  |         occurred_at: new Date().toISOString(),
  99  |         traceability: {
  100 |           journey_ids: ["CJ-007"],
  101 |           data_check_ids: ["DI-006"],
  102 |         },
  103 |       },
  104 |       command: {
  105 |         name: "traceability.consignments.create",
  106 |         aggregate_ref: "traceability",
  107 |         mutation_scope: "traceability.runtime",
  108 |         payload: {
  109 |           partner_reference_id: "partner-shipment-77",
  110 |           current_custody_actor_id: actorId,
  111 |         },
  112 |       },
  113 |     },
  114 |     headers: {
  115 |       Authorization: `Bearer ${actor.accessToken}`,
  116 |       "X-Correlation-ID": createRequestId,
  117 |       "X-Request-ID": createRequestId,
  118 |     },
  119 |   });
  120 |   expect(createResponse.ok()).toBeTruthy();
  121 |   const createJson = (await createResponse.json()) as {
  122 |     result?: {
  123 |       consignment?: { consignment_id?: string };
  124 |       consignment_id?: string;
  125 |     };
  126 |   };
  127 |   const consignmentId = createJson.result?.consignment?.consignment_id ?? createJson.result?.consignment_id;
  128 |   if (!consignmentId) {
> 129 |     throw new Error(`traceability.consignments.create did not return consignment_id: ${JSON.stringify(createJson)}`);
      |           ^ Error: traceability.consignments.create did not return consignment_id: {"status":"accepted","request_id":"e3f2d402-8deb-4ac8-9b10-d787a022b075","idempotency_key":"3e46b165-b3fa-40af-b756-31e5f7ccd183","result":{"execution_id":14,"command_name":"traceability.consignments.create","accepted":true},"error_code":null,"audit_event_id":357,"replayed":false}
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
  227 |     await expect(page.getByText("listing/listing-201", { exact: true })).toBeVisible();
  228 | 
  229 |     await page.getByRole("button", { name: "Record partner approved" }).click();
```