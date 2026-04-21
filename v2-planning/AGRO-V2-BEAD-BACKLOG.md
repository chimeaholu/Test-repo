# AGRO-V2-BEAD-BACKLOG

## 1) Backlog Rules
- Every bead includes:
  - `Route`
  - `Dependencies`
  - `Test Obligations` (`Unit`, `E2E Journey`, `Data Check`)
- Frontend routing policy (mandatory):
  - UI/UX beads must default to `Route: @frontend`
  - any non-`@frontend` UI/UX route requires:
    - `Exception Reason: ...`
    - `Don Approval: APPROVED-EXCEPTION`
  - every `@frontend` bead must include explicit `UX Quality` test obligations
- Route constraint for this planning cycle:
  - `@architect`, `@review-plan`, `@review-arch`, `@frontend`, `@qa-engineer`, `@builder`

## 2) Beads

### Wave 1 — Foundations, Channel Core, Governance

#### `B-001` Country Pack Configuration Framework
- Route: `@architect`
- Dependencies: none
- Scope: region policy abstraction for West Africa + Caribbean.
- Test Obligations:
  - Unit: policy resolution by country code.
  - E2E Journey: `CJ-001`
  - Data Check: `DI-004`

#### `B-002` Identity and Consent Service Skeleton
- Route: `@builder`
- Dependencies: `B-001`
- Scope: identity state machine and consent capture contract.
- Test Obligations:
  - Unit: consent lifecycle transitions.
  - E2E Journey: `CJ-001`
  - Data Check: `DI-004`

#### `B-003` Canonical Cross-Channel State Store
- Route: `@builder`
- Dependencies: `B-001`
- Scope: shared workflow state with idempotency tokens.
- Test Obligations:
  - Unit: state replay and idempotency.
  - E2E Journey: `CJ-002`, `EP-002`
  - Data Check: `DI-001`, `DI-002`

#### `B-004` USSD Adapter Contract + Session Handling
- Route: `@frontend`
- Dependencies: `B-003`
- Scope: compact menu flows and timeout recovery.
- Test Obligations:
  - Unit: menu state serialization.
  - E2E Journey: `CJ-001`, `EP-002`
  - UX Quality: `UXJ-002` interaction feedback consistency + `UXDI-002` state coverage (and `UXJ/UXDI` variants where applicable).
  - Data Check: `DI-001`

#### `B-005` WhatsApp Adapter Contract + Template Strategy
- Route: `@frontend`
- Dependencies: `B-003`
- Scope: template, command parsing, fallback hooks.
- Test Obligations:
  - Unit: command intent parsing.
  - E2E Journey: `CJ-005`, `EP-003`
  - UX Quality: `UXJ-002` interaction feedback consistency + `UXDI-002` state coverage (and `UXJ/UXDI` variants where applicable).
  - Data Check: `DI-001`

#### `B-006` PWA Shell + Connectivity Downgrade UX
- Route: `@frontend`
- Dependencies: `B-003`
- Scope: online/offline queue and channel handoff prompts.
- Test Obligations:
  - Unit: offline queue behavior.
  - E2E Journey: `RJ-001`, `RJ-002`
  - UX Quality: `UXJ-002` interaction feedback consistency + `UXDI-002` state coverage (and `UXJ/UXDI` variants where applicable).
  - Data Check: `DI-002`

#### `B-007` Audit Event Schema and Immutable Logging
- Route: `@builder`
- Dependencies: `B-002`, `B-003`
- Scope: security/compliance event capture.
- Test Obligations:
  - Unit: append-only constraints.
  - E2E Journey: `CJ-008`, `EP-005`
  - Data Check: `DI-003`

#### `B-008` Agent Policy Guardrail Framework
- Route: `@architect`
- Dependencies: `B-007`
- Scope: tool allow-list, risk scoring, HITL gates.
- Test Obligations:
  - Unit: policy decision matrix.
  - E2E Journey: `EP-006`
  - Data Check: `DI-005`

### Wave 2 — Marketplace, Wallet/Escrow, Advisory

#### `B-009` Commodity Listing Domain Model + APIs
- Route: `@builder`
- Dependencies: `B-003`
- Scope: create/read/update listing lifecycle.
- Test Obligations:
  - Unit: listing state transitions.
  - E2E Journey: `CJ-002`
  - Data Check: `DI-001`

#### `B-010` Offer/Bid Negotiation Workflow
- Route: `@builder`
- Dependencies: `B-009`
- Scope: negotiation thread + human confirmation checkpoint.
- Test Obligations:
  - Unit: terminal state guards.
  - E2E Journey: `CJ-003`
  - Data Check: `DI-002`

#### `B-011` Wallet Ledger Service
- Route: `@builder`
- Dependencies: `B-007`
- Scope: immutable debit/credit entries.
- Test Obligations:
  - Unit: ledger invariants.
  - E2E Journey: `CJ-004`
  - Data Check: `DI-003`

#### `B-012` Escrow Orchestration
- Route: `@builder`
- Dependencies: `B-011`, `B-010`
- Scope: escrow lifecycle and exception handling.
- Test Obligations:
  - Unit: escrow transition coverage.
  - E2E Journey: `CJ-004`, `EP-004`
  - Data Check: `DI-003`

#### `B-013` Settlement Notification and Fallback
- Route: `@frontend`
- Dependencies: `B-012`, `B-005`
- Scope: channel-aware notification + SMS fallback.
- Test Obligations:
  - Unit: fallback trigger conditions.
  - E2E Journey: `EP-003`
  - UX Quality: `UXJ-002` interaction feedback consistency + `UXDI-002` state coverage (and `UXJ/UXDI` variants where applicable).
  - Data Check: `DI-003`

#### `B-014` Advisory Retrieval and Citation Layer
- Route: `@architect`
- Dependencies: `B-008`
- Scope: vetted KB retrieval contract and citation rendering metadata.
- Test Obligations:
  - Unit: source filtering and relevance.
  - E2E Journey: `CJ-005`
  - Data Check: `DI-005`

#### `B-015` Reviewer Agent Decision Workflow
- Route: `@architect`
- Dependencies: `B-014`, `B-008`
- Scope: enforce confidence thresholds and escalation.
- Test Obligations:
  - Unit: policy threshold enforcement.
  - E2E Journey: `EP-006`
  - Data Check: `DI-005`

#### `B-016` Multilingual Delivery Framework
- Route: `@frontend`
- Dependencies: `B-005`, `B-014`
- Scope: localization and readability across supported regions.
- Test Obligations:
  - Unit: locale resolution fallback.
  - E2E Journey: `CJ-005`, `RJ-003`
  - UX Quality: `UXJ-002` interaction feedback consistency + `UXDI-002` state coverage (and `UXJ/UXDI` variants where applicable).
  - Data Check: `DI-005`

### Wave 2.5 — Agent Intelligence Core (Claude-Derived)

#### `B-031` Planning Loop Quality Engine
- Route: `@architect`
- Dependencies: `B-003`, `B-008`
- Scope: require planner artifacts for non-trivial/high-risk intents and enforce phase checkpoints.
- Test Obligations:
  - Unit: planner trigger policy by intent/risk class.
  - E2E Journey: `AIJ-001`, `CJ-003`, `CJ-004`
  - Data Check: `IDI-001`, `DI-002`

#### `B-032` Verifier Loop Runtime
- Route: `@architect`
- Dependencies: `B-031`, `B-015`
- Scope: independent verifier pass with `approve/revise/block` outcomes and reason codes.
- Test Obligations:
  - Unit: verifier decision-state transitions.
  - E2E Journey: `AIJ-003`, `EP-006`, `CJ-008`
  - Data Check: `IDI-002`, `DI-005`

#### `B-033` Typed Memory Service
- Route: `@builder`
- Dependencies: `B-003`, `B-014`
- Scope: memory taxonomy (`user`, `feedback`, `project`, `reference`) and freshness metadata.
- Test Obligations:
  - Unit: memory type validation and freshness scoring.
  - E2E Journey: `AIJ-004`, `CJ-005`
  - Data Check: `IDI-004`, `DI-005`

#### `B-034` Memory Selector and Revalidation
- Route: `@architect`
- Dependencies: `B-033`, `B-032`
- Scope: selective top-k recall and stale-memory revalidation before recommendation.
- Test Obligations:
  - Unit: recall ranking and stale-memory recheck logic.
  - E2E Journey: `AIJ-004`, `EP-006`, `EP-008`
  - Data Check: `IDI-004`, `DI-005`, `DI-006`

#### `B-035` Tool Contract Registry and Schema Validation
- Route: `@builder`
- Dependencies: `B-008`, `B-003`
- Scope: versioned tool contracts with strict input/output schema validation.
- Test Obligations:
  - Unit: schema mismatch rejection paths.
  - E2E Journey: `AIJ-002`, `EP-005`
  - Data Check: `IDI-003`, `DI-003`

#### `B-036` Model Router and Budget Guardrails
- Route: `@builder`
- Dependencies: `B-032`, `B-035`
- Scope: tiered open-source-first model routing with escalation and budget caps.
- Test Obligations:
  - Unit: route selection by risk/confidence/budget.
  - E2E Journey: `AIJ-005`, `PF-001`, `PF-004`
  - Data Check: `IDI-005`, `DI-002`

#### `B-037` Agent Evaluation Harness
- Route: `@qa-engineer`
- Dependencies: `B-032`, `B-034`, `B-036`
- Scope: benchmark harness for reasoning quality, tool fidelity, and hallucination rejection.
- Test Obligations:
  - Unit: eval fixture quality checks.
  - E2E Journey: `AIJ-001` to `AIJ-006`, `CJ-005`, `EP-006`
  - Data Check: `IDI-001` to `IDI-005`, `DI-005`

#### `B-038` Adversarial Intelligence Gate
- Route: `@review-arch`
- Dependencies: `B-031` to `B-037`
- Scope: adversarial review of planner/verifier/memory/router interactions before rollout.
- Test Obligations:
  - Unit: gate checklist completion.
  - E2E Journey: n/a (planning/review gate)
  - Data Check: traceability of intelligence requirements to tests

### Wave 2.6 — Android Readiness Design Layer

#### `B-039` Mobile API Profile and Payload Budget Spec
- Route: `@architect`
- Dependencies: `B-003`, `B-035`
- Scope: versioned mobile API profile, response budget limits, pagination and resumable operation contracts.
- Test Obligations:
  - Unit: payload size budget assertions and version negotiation rules.
  - E2E Journey: `ARJ-001`, `ARJ-004`
  - Data Check: `ARDI-001`

#### `B-040` Offline Action Queue Contract
- Route: `@builder`
- Dependencies: `B-039`, `B-003`
- Scope: enqueue/replay/dedupe semantics and queue state model for Android-compatible behavior.
- Test Obligations:
  - Unit: queue dedupe/replay invariants.
  - E2E Journey: `ARJ-002`
  - Data Check: `ARDI-002`

#### `B-041` Sync Conflict Resolver Policy
- Route: `@architect`
- Dependencies: `B-040`, `B-032`
- Scope: deterministic conflict precedence and user-visible resolution states.
- Test Obligations:
  - Unit: conflict resolution precedence matrix.
  - E2E Journey: `ARJ-003`, `ARJ-005`
  - Data Check: `ARDI-003`

#### `B-042` Device Capability Abstraction Layer Spec
- Route: `@frontend`
- Dependencies: `B-039`
- Scope: abstraction contracts for camera/location/storage/background jobs independent of domain logic.
- Test Obligations:
  - Unit: capability contract compatibility checks.
  - E2E Journey: `ARJ-006`
  - UX Quality: `UXJ-002` interaction feedback consistency + `UXDI-002` state coverage (and `UXJ/UXDI` variants where applicable).
  - Data Check: `ARDI-004`

#### `B-043` Notification Broker Abstraction
- Route: `@builder`
- Dependencies: `B-005`, `B-013`, `B-039`
- Scope: unified notification intent model across WhatsApp/SMS/push with delivery-state parity.
- Test Obligations:
  - Unit: notification channel routing rules.
  - E2E Journey: `ARJ-004`, `EP-003`
  - Data Check: `ARDI-005`

#### `B-044` Low-End Android Performance Budget Harness
- Route: `@qa-engineer`
- Dependencies: `B-039`, `B-040`, `B-041`, `B-043`
- Scope: android-representative profile harness (low RAM, unstable 3G, intermittent background).
- Test Obligations:
  - Unit: scenario fixture integrity checks.
  - E2E Journey: `ARJ-001` to `ARJ-006`
  - Data Check: `ARDI-001` to `ARDI-005`

### Wave 2.7 — IoT Readiness Interfaces (No Hardware Execution)

#### `B-045` Device Registry and Identity Schema
- Route: `@architect`
- Dependencies: `B-001`, `B-003`
- Scope: device registry and identity fields for future farm-node integration.
- Test Obligations:
  - Unit: schema integrity and identity lifecycle checks.
  - E2E Journey: `IOTJ-001`
  - Data Check: `IOTDI-001`

#### `B-046` Sensor Event Schema + Provenance Contract
- Route: `@builder`
- Dependencies: `B-045`
- Scope: sensor event envelope contract with provenance metadata and versioning.
- Test Obligations:
  - Unit: event schema validation and provenance completeness.
  - E2E Journey: `IOTJ-002`
  - Data Check: `IOTDI-002`

#### `B-047` Telemetry Ingestion API Profile
- Route: `@builder`
- Dependencies: `B-046`, `B-035`
- Scope: versioned, idempotent, resumable ingestion API semantics.
- Test Obligations:
  - Unit: idempotent ingest and resume token validation.
  - E2E Journey: `IOTJ-003`
  - Data Check: `IOTDI-003`

#### `B-048` Event Bus Topic/Partitioning Model
- Route: `@architect`
- Dependencies: `B-047`
- Scope: telemetry stream topic taxonomy and partition strategy by farm/region.
- Test Obligations:
  - Unit: topic routing and partition key consistency.
  - E2E Journey: `IOTJ-004`
  - Data Check: `IOTDI-004`

#### `B-049` Digital Twin Readiness + Governance Boundary
- Route: `@review-arch`
- Dependencies: `B-045`, `B-046`, `B-048`
- Scope: digital twin field compatibility and explicit no-hardware-now guardrails.
- Test Obligations:
  - Unit: twin schema compatibility checks.
  - E2E Journey: `IOTJ-005`
  - Data Check: `IOTDI-005`

### Wave 2.8 — UX Excellence Hard Gate

#### `B-050` Visual Language System (Typography/Color/Spacing)
- Route: `@frontend`
- Dependencies: `B-006`
- Scope: codified visual language tokens and hierarchy rules; generic patterns prohibited.
- Test Obligations:
  - Unit: token and component style conformance checks.
  - E2E Journey: `UXJ-001`
  - UX Quality: `UXJ-002` interaction feedback consistency + `UXDI-002` state coverage (and `UXJ/UXDI` variants where applicable).
  - Data Check: `UXDI-001`

#### `B-051` Interaction + Feedback Pattern Library
- Route: `@frontend`
- Dependencies: `B-050`, `B-006`
- Scope: loading/error/offline/retry/trust feedback standards for all critical flows.
- Test Obligations:
  - Unit: interaction state coverage checks.
  - E2E Journey: `UXJ-002`, `UXJ-004`
  - UX Quality: `UXJ-002` interaction feedback consistency + `UXDI-002` state coverage (and `UXJ/UXDI` variants where applicable).
  - Data Check: `UXDI-002`

#### `B-052` Accessibility + Readability Compliance Pack
- Route: `@frontend`
- Dependencies: `B-050`, `B-051`
- Scope: low-literacy/mobile accessibility standards and validation workflow.
- Test Obligations:
  - Unit: accessibility rule checks.
  - E2E Journey: `UXJ-003`
  - UX Quality: `UXJ-002` interaction feedback consistency + `UXDI-002` state coverage (and `UXJ/UXDI` variants where applicable).
  - Data Check: `UXDI-003`

#### `B-053` Low-End Android Mobile UX Polish Harness
- Route: `@frontend`
- Dependencies: `B-051`, `B-044`
- Scope: UX performance/clarity checks for low-end Android cohort.
- Test Obligations:
  - Unit: scenario harness fixture checks.
  - E2E Journey: `UXJ-005`
  - UX Quality: `UXJ-002` interaction feedback consistency + `UXDI-002` state coverage (and `UXJ/UXDI` variants where applicable).
  - Data Check: `UXDI-004`

#### `B-054` UX Excellence Design Review Gate
- Route: `@review-plan`
- Dependencies: `B-050`, `B-051`, `B-052`, `B-053`
- Scope: enforce world-class/non-generic UX gate checklist pre-build and pre-release.
- Test Obligations:
  - Unit: checklist completeness and blocker classification checks.
  - E2E Journey: `UXG-001`
  - Data Check: `UXDI-005`

### Wave 3 — Climate/MRV, Finance/Insurance, Traceability

#### `B-017` Climate Risk Ingestion Pipeline
- Route: `@builder`
- Dependencies: `B-001`
- Scope: weather/satellite data normalization.
- Test Obligations:
  - Unit: ingest mapper coverage.
  - E2E Journey: `CJ-006`
  - Data Check: `DI-006`

#### `B-018` Climate Alert Rules Engine
- Route: `@architect`
- Dependencies: `B-017`, `B-003`
- Scope: farm-context risk threshold rules.
- Test Obligations:
  - Unit: threshold and precedence logic.
  - E2E Journey: `CJ-006`
  - Data Check: `DI-006`

#### `B-019` MRV Evidence Record Service
- Route: `@builder`
- Dependencies: `B-017`, `B-007`
- Scope: evidence model, assumptions, and provenance.
- Test Obligations:
  - Unit: provenance completeness checks.
  - E2E Journey: `EP-008`
  - Data Check: `DI-006`

#### `B-020` Finance Partner Decision Adapter
- Route: `@builder`
- Dependencies: `B-011`, `B-001`
- Scope: partner integration boundary and responsibility model.
- Test Obligations:
  - Unit: adapter contract validation.
  - E2E Journey: `CJ-004`
  - Data Check: `DI-003`

#### `B-021` Insurance Parametric Trigger Registry
- Route: `@builder`
- Dependencies: `B-017`, `B-020`
- Scope: trigger thresholds, source references, payout events.
- Test Obligations:
  - Unit: trigger evaluation logic.
  - E2E Journey: `EP-008`
  - Data Check: `DI-006`

#### `B-022` Finance/Insurance HITL Approval Console
- Route: `@frontend`
- Dependencies: `B-020`, `B-021`, `B-008`
- Scope: operator review and approval queue.
- Test Obligations:
  - Unit: approval state transitions.
  - E2E Journey: `CJ-008`
  - UX Quality: `UXJ-002` interaction feedback consistency + `UXDI-002` state coverage (and `UXJ/UXDI` variants where applicable).
  - Data Check: `DI-003`

#### `B-023` Traceability Event Chain Service
- Route: `@builder`
- Dependencies: `B-009`, `B-007`
- Scope: consignment lifecycle event chain.
- Test Obligations:
  - Unit: chain continuity checks.
  - E2E Journey: `CJ-007`
  - Data Check: `DI-006`

#### `B-024` Quality Evidence Attachments
- Route: `@frontend`
- Dependencies: `B-023`
- Scope: media and document evidence capture and display.
- Test Obligations:
  - Unit: attachment validation and metadata checks.
  - E2E Journey: `CJ-007`
  - UX Quality: `UXJ-002` interaction feedback consistency + `UXDI-002` state coverage (and `UXJ/UXDI` variants where applicable).
  - Data Check: `DI-006`

### Wave 4 — Enterprise API, Operations, Scale Hardening

#### `B-025` Enterprise Analytics Data Mart Contracts
- Route: `@architect`
- Dependencies: `B-009`, `B-014`, `B-017`, `B-023`
- Scope: anonymized analytics and metrics schema.
- Test Obligations:
  - Unit: anonymization transformation tests.
  - E2E Journey: `CJ-008`
  - Data Check: `DI-003`

#### `B-026` Partner API Gateway and Credential Scoping
- Route: `@builder`
- Dependencies: `B-025`, `B-007`
- Scope: scoped credentials and partner APIs.
- Test Obligations:
  - Unit: authz scope enforcement.
  - E2E Journey: `EP-005`
  - Data Check: `DI-003`

#### `B-027` Observability and SLO Instrumentation
- Route: `@builder`
- Dependencies: `B-003`, `B-007`, `B-008`
- Scope: traces, metrics, alerting by channel/country.
- Test Obligations:
  - Unit: telemetry schema validation.
  - E2E Journey: `PF-001`, `PF-004`
  - Data Check: `DI-002`

#### `B-028` QA Harness for Multi-Channel E2E Automation
- Route: `@qa-engineer`
- Dependencies: `B-004`, `B-005`, `B-006`, `B-009`, `B-012`
- Scope: test utilities, fixtures, and channel stubs.
- Test Obligations:
  - Unit: fixture integrity checks.
  - E2E Journey: `CJ-001` to `CJ-008`, `EP-001` to `EP-008`
  - Data Check: `DI-001` to `DI-006`

#### `B-029` Plan Adversarial Review Gate
- Route: `@review-plan`
- Dependencies: `B-001` to `B-054` design docs
- Scope: detect gaps between scope, dependencies, and tests.
- Test Obligations:
  - Unit: review checklist completion.
  - E2E Journey: n/a (planning gate)
  - Data Check: traceability matrix integrity

#### `B-030` Architecture Adversarial Review Gate
- Route: `@review-arch`
- Dependencies: `B-001` to `B-054` design docs
- Scope: validate boundaries, scale, security, and deployment feasibility.
- Test Obligations:
  - Unit: architecture gate checklist completion.
  - E2E Journey: n/a (planning gate)
  - Data Check: architecture-to-requirement mapping completeness

## 3) Backlog Notes
- Execution order is wave-priority plus dependency constraints.
- Any new bead must include route + dependency + test obligations before becoming executable.
- Naming placeholders in any bead detail should use `[[PRODUCT_NAME]]`.
