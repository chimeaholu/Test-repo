# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: n5-finance-traceability.spec.ts >> N5 finance and traceability tranche checks >> CJ-007 traceability timeline renders ordered events and explicit evidence state
- Location: tests/e2e/n5-finance-traceability.spec.ts:237:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Ordered event chain' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('heading', { name: 'Ordered event chain' })

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
> 248 |     await expect(page.getByRole("heading", { name: "Ordered event chain" })).toBeVisible();
      |                                                                              ^ Error: expect(locator).toBeVisible() failed
  249 |     await expect(page.getByText(timelineSeed.harvestedReference).first()).toBeVisible();
  250 |     await expect(page.getByText(timelineSeed.dispatchedReference).first()).toBeVisible();
  251 |     await expect(page.getByText("No evidence attachment metadata returned")).toBeVisible();
  252 |   });
  253 | });
  254 | 
```