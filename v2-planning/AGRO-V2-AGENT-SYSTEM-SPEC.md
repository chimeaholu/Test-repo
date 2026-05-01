# AGRO-V2-AGENT-SYSTEM-SPEC

## 1) Scope
Production runtime spec for `[[PRODUCT_NAME]]` agent layer covering orchestration, tool contracts, verifier loops, HITL gates, reliability, safety, and cost routing.

## 2) Runtime Architecture

### 2.1 Core Components
1. `Intent Gateway` (channel intents from USSD/WhatsApp/PWA).
2. `Planner` (creates structured plan for non-trivial actions).
3. `Orchestrator` (assigns tasks to domain specialist agents).
4. `Specialist Agents` (marketplace, advisory, climate/MRV, finance/insurance, supply chain).
5. `Reviewer/Verifier` (policy and factual consistency checks).
6. `Policy Engine` (allow/deny/challenge per role/country/risk class).
7. `Tool Contract Registry` (schema and permission metadata).
8. `Memory Service` (typed memory + freshness scoring).
9. `Inference Router` (model-tier selection and failover).
10. `Audit Transcript Store` (full action lineage).

### 2.2 High-Level Flow
`Intent -> Plan (if needed) -> Route -> Execute tools -> Verify -> HITL if required -> Commit -> Notify`.

## 3) Tool Contract Specification

### 3.1 Required Contract Fields
- `tool_name`
- `tool_version`
- `schema_version`
- `input_schema`
- `output_schema`
- `required_permissions`
- `risk_class`
- `timeout_ms`
- `retry_policy`
- `idempotency_required` (bool)

### 3.2 Call Envelope (Canonical)
```json
{
  "request_id": "uuid",
  "idempotency_key": "uuid",
  "tool_name": "wallet.release_escrow",
  "schema_version": "1.2.0",
  "input": {},
  "policy_context": {
    "country_pack": "NG",
    "actor_role": "coop_manager",
    "risk_class": "high"
  }
}
```

### 3.3 Contract Rules
- Reject if schema validation fails.
- Reject if permission policy denies.
- Require verifier sign-off for `risk_class=high`.
- Persist every accepted/rejected call in audit store.

## 4) Planner and Verifier Loops

### 4.1 Planner Loop
- Trigger conditions:
  - multi-step transaction
  - high-risk domain
  - ambiguous intent
- Planner output:
  - objective
  - assumptions
  - required tools
  - failure/rollback path
  - HITL requirement status

### 4.2 Verifier Loop
- Independent pass validates:
  - policy conformance
  - factual consistency with cited data
  - numeric and state-transition consistency
  - user-safety risk
- Verifier outcomes:
  - `approve`
  - `revise`
  - `block_and_escalate`

## 5) HITL Approval Gates
- Mandatory HITL events:
  - financial commitment
  - insurance trigger payout
  - disputed settlement release
  - low-confidence advisory in high-risk scenario
- HITL payload includes:
  - concise rationale
  - evidence links
  - risk label
  - recommended action and alternatives

## 6) Reliability Envelope

### 6.1 Retries and Timeouts
- Per-tool timeout budgets (`timeout_ms`) by risk class.
- Retries:
  - transient: exponential backoff with jitter
  - deterministic validation failure: no retry
- Circuit breaker for failing provider/tool.

### 6.2 Idempotency and Consistency
- All state-mutating calls require idempotency keys.
- At-least-once delivery with idempotent handlers.
- Reconciliation workers compare channel state vs canonical ledger.

### 6.3 Degraded Mode
- If PWA path degraded, route to WhatsApp/USSD confirmation.
- If premium model unavailable, route to lower tier + enforce verifier/HITL.
- If external data source unavailable, show degraded advisory with assumptions.

### 6.4 Observability
- Mandatory telemetry:
  - plan generation latency
  - tool success/failure rates
  - verifier reject rates
  - HITL frequency
  - cost per completed journey

## 7) Safety Envelope

### 7.1 Prompt/Tool Injection Defenses
- Tool names resolved from allow-list registry only.
- Reject dynamic unregistered tools.
- Strict argument schema validation and sanitization.
- Block shell-like execution in business agents unless explicitly approved.

### 7.2 Data Boundaries
- Country-pack scoped data access.
- PII redaction in non-essential logs.
- Separate namespaces for user memory vs project/reference memory.

### 7.3 Policy Enforcement
- PDP decision before every high-risk tool call.
- `deny` decision must include reason code.
- `challenge` decision routes to HITL.

## 8) Cost and Performance Envelope

### 8.1 Model Routing Hierarchy
1. Tier-0 OSS fast intent model.
2. Tier-1 OSS reasoning model.
3. Tier-2 OSS verifier model.
4. Tier-3 premium escalation only when required.

### 8.2 Routing Policy
- Prefer lower-cost tier if:
  - confidence >= threshold
  - risk_class != high
  - no policy ambiguity
- Escalate tier if:
  - verifier rejects twice
  - contradiction unresolved
  - high-risk + low-confidence.

### 8.3 Budget Controls
- Per-journey token and dollar ceilings.
- Hard stop + HITL on budget breach in high-risk path.
- Daily cost cap alerts by country and domain.

## 9) Now vs Later Delivery

### Build Now (6-Month MVP Path)
- Planner/verifier/policy/tool-schema/idempotency/memory freshness/model router.
- Audit transcript and observability baseline.

### Build Later
- Learned routing optimizer from production telemetry.
- Automated prompt-policy distillation.
- Advanced multi-hop memory summarization.

## 10) Test Obligations
- Unit:
  - contract validation
  - routing policy decisions
  - memory freshness handling
- Integration:
  - planner->executor->verifier->HITL path
  - degraded mode across channels
- Audit:
  - transcript completeness for every high-risk action.

## 11) Placeholder Naming Rule
- Keep planning references as `Agrodomain 2.0` only where historical context is required.
- Use `[[PRODUCT_NAME]]` for system specification and rollout content.
