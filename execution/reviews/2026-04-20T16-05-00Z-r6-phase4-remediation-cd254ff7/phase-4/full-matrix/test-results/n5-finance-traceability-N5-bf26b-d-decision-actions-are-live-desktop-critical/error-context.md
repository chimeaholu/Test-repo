# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: n5-finance-traceability.spec.ts >> N5 finance and traceability tranche checks >> CJ-004/CJ-008 finance HITL queue and decision actions are live
- Location: tests/e2e/n5-finance-traceability.spec.ts:222:7

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
  132 |       consignment_id?: string;
  133 |     };
  134 |   };
  135 |   const consignmentId = createJson.result?.consignment?.consignment_id ?? createJson.result?.consignment_id;
  136 |   if (!consignmentId) {
  137 |     throw new Error(`traceability.consignments.create did not return consignment_id: ${JSON.stringify(createJson)}`);
  138 |   }
  139 | 
  140 |   const harvestRequestId = crypto.randomUUID();
  141 |   const harvestResponse = await request.post(`${apiBaseUrl}/api/v1/workflow/commands`, {
  142 |     data: {
  143 |       metadata: {
  144 |         request_id: harvestRequestId,
  145 |         idempotency_key: crypto.randomUUID(),
  146 |         actor_id: actorId,
  147 |         country_code: countryCode,
  148 |         channel: "pwa",
  149 |         schema_version: schemaVersion,
  150 |         correlation_id: harvestRequestId,
  151 |         occurred_at: new Date().toISOString(),
  152 |         traceability: {
  153 |           journey_ids: ["CJ-007"],
  154 |           data_check_ids: ["DI-006"],
  155 |         },
  156 |       },
  157 |       command: {
  158 |         name: "traceability.events.append",
  159 |         aggregate_ref: "traceability",
  160 |         mutation_scope: "traceability.runtime",
  161 |         payload: {
  162 |           consignment_id: consignmentId,
  163 |           milestone: "harvested",
  164 |           event_reference: harvestedReference,
  165 |           previous_event_reference: null,
  166 |           occurred_at: new Date().toISOString(),
  167 |           current_custody_actor_id: actorId,
  168 |         },
  169 |       },
  170 |     },
  171 |     headers: {
  172 |       Authorization: `Bearer ${actor.accessToken}`,
  173 |       "X-Correlation-ID": harvestRequestId,
  174 |       "X-Request-ID": harvestRequestId,
  175 |     },
  176 |   });
  177 |   expect(harvestResponse.ok()).toBeTruthy();
  178 | 
  179 |   const dispatchRequestId = crypto.randomUUID();
  180 |   const dispatchResponse = await request.post(`${apiBaseUrl}/api/v1/workflow/commands`, {
  181 |     data: {
  182 |       metadata: {
  183 |         request_id: dispatchRequestId,
  184 |         idempotency_key: crypto.randomUUID(),
  185 |         actor_id: actorId,
  186 |         country_code: countryCode,
  187 |         channel: "pwa",
  188 |         schema_version: schemaVersion,
  189 |         correlation_id: dispatchRequestId,
  190 |         occurred_at: new Date().toISOString(),
  191 |         traceability: {
  192 |           journey_ids: ["CJ-007"],
  193 |           data_check_ids: ["DI-006"],
  194 |         },
  195 |       },
  196 |       command: {
  197 |         name: "traceability.events.append",
  198 |         aggregate_ref: "traceability",
  199 |         mutation_scope: "traceability.runtime",
  200 |         payload: {
  201 |           consignment_id: consignmentId,
  202 |           milestone: "dispatched",
  203 |           event_reference: dispatchedReference,
  204 |           previous_event_reference: harvestedReference,
  205 |           occurred_at: new Date().toISOString(),
  206 |           current_custody_actor_id: "actor-transporter-gh-1",
  207 |         },
  208 |       },
  209 |     },
  210 |     headers: {
  211 |       Authorization: `Bearer ${actor.accessToken}`,
  212 |       "X-Correlation-ID": dispatchRequestId,
  213 |       "X-Request-ID": dispatchRequestId,
  214 |     },
  215 |   });
  216 |   expect(dispatchResponse.ok()).toBeTruthy();
  217 | 
  218 |   return { consignmentId, harvestedReference, dispatchedReference };
  219 | }
  220 | 
  221 | test.describe("N5 finance and traceability tranche checks", () => {
  222 |   test("CJ-004/CJ-008 finance HITL queue and decision actions are live", async ({ page, request }) => {
  223 |     const finance = await createAuthenticatedSession(request, {
  224 |       displayName: "Finance N5",
  225 |       email: `finance.n5.${Date.now()}@example.com`,
  226 |       role: "finance",
  227 |       countryCode: "GH",
  228 |     });
  229 |     await primeSession(page, finance);
  230 | 
  231 |     await openSeededProtectedRoute(page, finance, "/app/finance/queue");
> 232 |     await expect(page.getByRole("heading", { name: "Review partner-owned decisions without hidden approval paths" })).toBeVisible();
      |                                                                                                                       ^ Error: expect(locator).toBeVisible() failed
  233 | 
  234 |     await page.getByRole("button", { name: "Submit finance request" }).click();
  235 |     await expect(page.getByText("listing/listing-201", { exact: true })).toBeVisible();
  236 | 
  237 |     await page.getByRole("button", { name: "Record partner approved" }).click();
  238 |     await expect(page.getByText("evidence_sufficient")).toBeVisible();
  239 |     await expect(page.getByText("Actor history count")).toBeVisible();
  240 | 
  241 |     await page.getByRole("button", { name: "Evaluate trigger" }).click();
  242 |     await expect(page.getByText("Payout dedupe key")).toBeVisible();
  243 |   });
  244 | 
  245 |   test("CJ-007 traceability timeline renders ordered events and explicit evidence state", async ({ page, request }) => {
  246 |     const farmer = await createAuthenticatedSession(request, {
  247 |       displayName: "Farmer N5",
  248 |       email: `farmer.n5.${Date.now()}@example.com`,
  249 |       role: "farmer",
  250 |       countryCode: "GH",
  251 |     });
  252 |     const timelineSeed = await createConsignmentTimeline(request, farmer);
  253 |     await primeSession(page, farmer);
  254 | 
  255 |     await openSeededProtectedRoute(page, farmer, `/app/traceability/${timelineSeed.consignmentId}`);
  256 |     await expect(page.getByRole("heading", { name: "Ordered event chain" })).toBeVisible();
  257 |     await expect(page.getByText(timelineSeed.harvestedReference).first()).toBeVisible();
  258 |     await expect(page.getByText(timelineSeed.dispatchedReference).first()).toBeVisible();
  259 |     await expect(page.getByText("No evidence attachment metadata returned")).toBeVisible();
  260 |   });
  261 | });
  262 | 
```