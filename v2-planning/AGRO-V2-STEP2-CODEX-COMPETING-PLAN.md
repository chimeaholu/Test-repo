# SOP 15 Step 2 Competing Plan Artifact: `[[PRODUCT_NAME]]`

## 1) Architecture Strategy
Competing plan: **Control-Plane-First + Channel-Decoupled Domains**.

- Build `[[PRODUCT_NAME]]` around three hard boundaries from day one: `Channel Adapters` -> `Orchestration/Policy Plane` -> `Domain Services`.
- Enforce that USSD/WhatsApp/PWA adapters are **stateless translators only**; only domain services mutate records.
- Treat `Canonical State Store` and `Audit Event Log` as launch blockers before marketplace or wallet features.
- Use event contracts for all regulated mutations: `request_id`, `idempotency_key`, `actor_id`, `policy_context`, `schema_version`.
- Promote country packs as deployable config bundles, not code forks: legal text, language rules, payment rails, KYC/consent policy.
- Make planner/verifier artifacts first-class entities linked to every high-risk action.

Testable recommendations:
- 100% of mutating operations rejected if missing `idempotency_key` or invalid schema (`AIJ-002`, `IDI-003`).
- 100% of high-risk actions store linked planner + verifier IDs (`AIJ-001`, `AIJ-003`, `IDI-001`, `IDI-002`).
- 0 direct state mutation calls from channel adapter services (enforced via API gateway policy tests).

## 2) Channel/Workflow Strategy (USSD/WhatsApp/PWA)
Design principle: **one workflow model, three channel renderers**.

- Use a shared `workflow_intent_token` so sessions can hand off between channels without losing state.
- USSD scope is “critical thin path”: onboarding, listing status, bid accept/reject, alert acknowledgment.
- WhatsApp is primary conversational path: advisory, negotiation, confirmations, exception prompts.
- PWA is full-fidelity path: bulk operations, dashboards, audit review, dispute handling.
- Fallback order for critical events: `PWA push/Web -> WhatsApp -> SMS`.
- Queue any non-final action under degraded network and require explicit user re-confirmation for financial commits.

Testable recommendations:
- Cross-channel parity for critical flows `CJ-001`, `CJ-002`, `CJ-006` must pass before any country launch.
- USSD timeout recovery must resume using intent token within one re-entry (`EP-002`).
- WhatsApp template failure must trigger SMS for critical events within 60 seconds (`EP-003`).
- PWA offline queue replay must not duplicate commits (`DI-002`, `DI-003`).

## 3) Agent Runtime Design
Runtime pattern: **Planner -> Executor -> Verifier -> Policy Gate -> Commit**.

- Risk classes:
- `R0`: informational, no mutation.
- `R1`: low-risk mutation, auto-commit if schema/policy pass.
- `R2`: financial/advisory sensitive, verifier required.
- `R3`: credit/insurance/settlement exception, verifier + HITL required.
- Typed memory only: `user`, `feedback`, `project`, `reference`; stale memory requires revalidation.
- Tool registry is strict allow-list with versioned contracts and schema validation.
- Verifier outcome taxonomy: `approve`, `revise`, `block` with reason codes.
- Persist inference routing telemetry per decision: tier, prompt class, token/cost, latency, escalation reason.

Testable recommendations:
- Verifier must block all `R3` actions lacking source/citation/confidence thresholds (`FR-032`, `FR-082`).
- Memory recall precision check: top-k recall with freshness metadata present in 100% sampled records (`AIJ-004`, `IDI-004`).
- Policy engine must emit machine-readable deny/challenge reason codes for 100% denied operations (`FR-087`).

## 4) Reliability + Safety Controls
- Reliability invariants:
- At-least-once delivery at channel edge, exactly-once effect in domain services via idempotency keys.
- Reconciliation jobs run automatically after rollback and every 15 minutes for unsettled financial states.
- Safety controls:
- HITL mandatory for final commitments and disputed exceptions.
- Prompt/tool injection protection with pre-execution policy checks.
- Immutable audit trails for consent, payouts, approvals, overrides.
- Operational SLOs:
- Critical notification delivery success >= 99.5%.
- Settlement state propagation across channels <= 90 seconds p95.
- Policy decision service availability >= 99.9%.

Testable recommendations:
- Any policy service outage forces safe mode: read-only for high-risk mutations.
- Quarterly fault-injection test for payment timeout/retry/idempotency (`EP-004`, `DI-003`).
- Audit export tamper-evidence test must pass before go-live (`SC-004`).

## 5) Cost Routing Strategy
Adopt **OSS-first tiered inference with hard budget governors**.

- `Tier-0`: intent classification + lightweight transforms.
- `Tier-1`: core reasoning for normal advisory/workflow.
- `Tier-2`: verifier and contradiction checks.
- `Tier-3`: premium escalation for unresolved high-risk ambiguity only.
- Budget controls:
- Per-journey spend cap by workflow type.
- Daily country-pack spend cap with automatic downgrade when 80% consumed.
- Escalation quota cap per country/day to prevent runaway premium usage.

Testable recommendations:
- Router must downgrade or challenge when journey cap exceeded (`AIJ-005`).
- Premium escalation rate target: <5% of total inference calls after Wave 2 stabilization.
- Cost ledger must provide per-journey cost traceability for 100% sampled high-risk transactions.

## 6) Testing Strategy
Use existing blocking suite as release gate, plus explicit runtime economics checks.

- Blocking suites remain mandatory: `CJ-*`, `EP-*`, `RJ-*`, `DI-*`, `AIJ-*`, `IDI-*`.
- Add competing-plan hard checks:
- `CP-T01`: channel adapter cannot call mutating domain DB paths directly.
- `CP-T02`: all `R2/R3` actions require verifier transcript linkage.
- `CP-T03`: budget cap breach triggers deterministic routing policy outcome.
- `CP-T04`: rollback triggers reconciliation and closes orphaned pending states.
- Run under `NET-A`, `NET-B`, `NET-C` for all critical journeys.
- Launch gate is fail-closed: any `S0`/`S1` defect blocks country release.

Testable recommendations:
- Pre-launch requires 2 consecutive green runs of full blocking suite in staging.
- Minimum adversarial prompts per high-risk domain: 200 per country pack before production.
- Traceability coverage: each shipped bead maps to at least one journey ID and one data integrity check.

## 7) Delivery Waves + Critical Path
Wave structure (6-month MVP) with critical-path sequencing:

- **Wave 1 (Weeks 1-6)**: `B-001` `B-002` `B-003` `B-004` `B-005` `B-006` `B-007` `B-008`.
- **Wave 2 (Weeks 7-12)**: `B-009` `B-010` `B-011` `B-012` `B-013` `B-014` `B-015` `B-016`.
- **Wave 2.5 (Weeks 10-14, parallel but blocking for finance/advisory prod)**: `B-031` to `B-038`.
- **Wave 3 (Weeks 13-20)**: `B-017` to `B-024`.
- **Wave 4 (Weeks 21-24)**: `B-025` to `B-030` + country canary + hardening.

Critical path:
- `B-001 -> B-003 -> B-008 -> B-031 -> B-032 -> B-035 -> B-036 -> B-010 -> B-012 -> B-013 -> B-028 -> B-030`.
- No country go-live before this path is complete and blocking tests are green.

## 8) Risks and Tradeoffs
- **Risk**: Control-plane-first increases early delivery overhead.
  - Tradeoff: Slower first demo, but materially lower rework/regulatory risk later.
- **Risk**: USSD thin-path limits feature richness.
  - Tradeoff: Better reliability on 2G and lower support burden.
- **Risk**: Strict verifier/HITL raises latency for high-risk flows.
  - Tradeoff: Better trust, auditability, and compliance defensibility.
- **Risk**: Aggressive cost caps can reduce answer quality in edge cases.
  - Tradeoff: Predictable unit economics and safer scale behavior.
- **Risk**: Multi-region day-one adds config complexity.
  - Tradeoff: Avoids architecture forks and supports GRIT partnership commitments.

Final recommendation:
- Approve this competing plan if the program prioritizes **launch safety, cross-channel integrity, and cost predictability** over earliest feature breadth.