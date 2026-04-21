# AGRO-V2-PRD

## 1) Executive Summary
`[[PRODUCT_NAME]]` is an AI-first agri platform for West Africa + Caribbean that unifies marketplace trading, advisory, climate intelligence, finance/insurance decision support, and traceability across USSD, WhatsApp, and PWA channels. This PRD is pre-build and approval-ready.

## 2) Product Naming Placeholder
- Working title in planning docs: `Agrodomain 2.0`
- Approval-time replacement token: `[[PRODUCT_NAME]]`
- Optional subtitle token: `[[PRODUCT_TAGLINE]]`
- Global find/replace scope: `/mnt/vault/MWH/Projects/Agrodomain/v2-planning/*.md`

## 3) Goals and Success Metrics

### 3.1 Business Goals
- Drive inclusive digital market participation for smallholders and cooperatives.
- Create monetizable enterprise intelligence and partner channels.
- Establish trust through auditable AI and compliant operations.

### 3.2 Product Goals
- Reliable multi-channel experience under degraded connectivity.
- Explainable recommendations with source-backed responses.
- Transaction-safe workflows with human approval where required.

### 3.3 KPI Baseline (to be finalized at approval)
- `KPI-01`: onboarding completion rate (channel-specific).
- `KPI-02`: successful offer-to-settlement conversion rate.
- `KPI-03`: advisory resolution usefulness score.
- `KPI-04`: cross-channel workflow completion without data loss.
- `KPI-05`: SLA compliance for critical notifications and payout events.

## 4) Users and Personas
- `P1` Smallholder farmer (feature phone or low-end smartphone).
- `P2` Cooperative manager (bulk operations, member management).
- `P3` Agribusiness buyer/trader (volume sourcing and quality assurance).
- `P4` Financial/insurance partner operator.
- `P5` Platform admin/compliance/audit operator.

## 5) Scope Definition

### 5.1 In Scope
- Multi-channel onboarding, identity, consent, and profile.
- Marketplace listing/bid/offer + settlement orchestration.
- Advisory responses with multilingual and source attribution.
- Climate alerts, risk scoring, and MRV baseline records.
- Finance/insurance support flows (partner-connected).
- Supply chain milestones and quality evidence capture.

### 5.2 Out of Scope
- Fully autonomous trade or credit decisions without HITL.
- Blockchain-ledger first implementation.
- Hardware sensor and drone-first integrations.

## 6) Functional Requirements

### 6.1 Channel and Access
- `FR-001`: Users can register and authenticate from USSD, WhatsApp, and PWA.
- `FR-002`: System stores canonical workflow state independent of channel.
- `FR-003`: Session can hand off between channels without losing transaction intent.
- `FR-004`: SMS fallback is used for critical event notifications when primary channel fails.

### 6.2 Marketplace
- `FR-010`: Farmers/coops can create and manage commodity listings.
- `FR-011`: Buyers can place bids/offers and negotiate with AI-assisted guidance.
- `FR-012`: All final offers require human confirmation before commitment.
- `FR-013`: Transaction lifecycle records include timestamps, actor IDs, and status transitions.

### 6.3 Wallet/Escrow/Settlement
- `FR-020`: Wallet ledger records debits/credits with immutable audit trail.
- `FR-021`: Escrow states are explicit (`initiated`, `funded`, `released`, `reversed`, `disputed`).
- `FR-022`: Settlement completion triggers participant notifications and reconciliation events.
- `FR-023`: Failure and retry paths are idempotent and recoverable.

### 6.4 Advisory and Agentic AI
- `FR-030`: Advisory responses include source attribution and confidence indicator.
- `FR-031`: Reviewer agent validates output before delivery for policy-sensitive prompts.
- `FR-032`: High-risk recommendations are blocked pending HITL approval.
- `FR-033`: Multilingual support includes English, French, and regional languages configured by country pack.

### 6.5 Climate and MRV
- `FR-040`: Climate service provides risk alerts tied to farm profile and location context.
- `FR-041`: MRV records include evidence metadata and method references.
- `FR-042`: Carbon-related outputs are tagged as estimations with transparent assumptions.

### 6.6 Finance and Insurance (Partner Model)
- `FR-050`: Credit and insurance decisions are partner-integrated with clear responsibility boundaries.
- `FR-051`: Parametric trigger events are stored with source data references and thresholds.
- `FR-052`: Users can view decision rationale summaries and dispute pathways.

### 6.7 Supply Chain and Traceability
- `FR-060`: Each consignment has traceability events from source to delivery.
- `FR-061`: Quality evidence (media/docs) is linked to shipment milestones.
- `FR-062`: Traceability view is available to buyers/coops with role-based filters.

### 6.8 Enterprise and APIs
- `FR-070`: Enterprise dashboards expose anonymized regional intelligence.
- `FR-071`: API suite supports partner integrations with scoped credentials.
- `FR-072`: Export jobs provide compliance and audit bundles by country and date range.

### 6.9 Agent Intelligence Architecture
- `FR-080`: Non-trivial/high-risk intents must generate a planner artifact before execution.
- `FR-081`: All state-mutating tool calls must pass schema validation and include idempotency keys.
- `FR-082`: Verifier agent must independently evaluate executor outputs before high-risk commit.
- `FR-083`: Memory subsystem must support typed memories (`user`, `feedback`, `project`, `reference`) with freshness metadata.
- `FR-084`: Memory recall must be selective (top-k) and must revalidate stale facts before use.
- `FR-085`: Inference router must support tiered model routing with risk/confidence-aware escalation.
- `FR-086`: Tool contract registry must maintain versioned contracts and policy metadata.
- `FR-087`: Policy engine must support allow/deny/challenge outcomes with reason codes for audit.

## 7) Non-Functional Requirements
- `NFR-001`: Critical path user operations complete under constrained network conditions.
- `NFR-002`: Channel services support retry-safe operations with eventual consistency.
- `NFR-003`: System supports region-aware policy packs without code forks.
- `NFR-004`: Observability captures distributed traces across channel, domain, and agent layers.
- `NFR-005`: Platform supports horizontal scale for seasonal usage spikes.
- `NFR-006`: Planner + verifier loops must complete within defined latency budgets per risk class.
- `NFR-007`: Model routing must honor journey-level budget ceilings and emit cost telemetry per tier.
- `NFR-008`: Degraded-mode fallback (PWA -> WhatsApp -> USSD/SMS) must preserve workflow integrity.

## 8) Security Requirements
- `SEC-001`: Role-based and attribute-based authorization for sensitive operations.
- `SEC-002`: Encryption for data in transit and at rest.
- `SEC-003`: Immutable audit logs for finance, consent, and agent decisions.
- `SEC-004`: Secret management and key rotation policies for integrations.
- `SEC-005`: Prompt/tool security policy with allow-listed tool calls and redaction.
- `SEC-006`: Unregistered or schema-invalid tool calls must be blocked before execution.
- `SEC-007`: Policy engine must block prompt/tool injection attempts and log threat events.

## 9) Compliance Requirements
- `COMP-001`: Consent capture with purpose, timestamp, and revocation workflow.
- `COMP-002`: NDPR-aligned data handling controls for Nigeria operations.
- `COMP-003`: Country-specific Caribbean privacy controls via policy packs.
- `COMP-004`: Data retention and deletion workflows for regulated categories.
- `COMP-005`: Financial module disclaimers and partner licensing boundaries surfaced to users.

## 10) Multi-Region and Localization Requirements
- `REG-001`: Country pack architecture controls legal text, language, and channel templates.
- `REG-002`: Localized content quality workflow for advisory responses.
- `REG-003`: Country launch checklist includes compliance, payment rails, and escalation routing.

## 11) Agent Architecture Specification
- Orchestrator agent coordinates intents and domain service calls.
- Specialist agents: marketplace intelligence, advisory, climate/MRV, finance/insurance support, supply chain.
- Reviewer agent enforces:
  - policy checks
  - hallucination filters
  - source and confidence thresholds
- HITL checkpoints required for:
  - final financial commitments
  - disputed settlement decisions
  - high-uncertainty advisory outputs

## 12) Data Architecture and Governance
- Canonical entities:
  - farmer_profile, cooperative, listing, offer, settlement, recommendation, climate_alert, mrv_record, audit_event.
- Data integrity controls:
  - idempotency keys for cross-channel operations
  - reconciliation jobs across channel events and domain state
  - immutable event logs for regulated flows

## 13) Rollout and Operations

### 13.1 Rollout Waves
- Wave 1: identity/channel/gov core.
- Wave 2: marketplace + wallet + advisory.
- Wave 3: climate/MRV + finance/insurance + traceability.
- Wave 4: enterprise analytics/API and optimization.

### 13.2 Operational Controls
- SLO/SLA dashboard by channel and country.
- Incident runbooks for payment delays, integration failures, and model anomalies.
- Cost controls for LLM and premium climate/satellite APIs.

### 13.3 Model Routing Economics
- Tier hierarchy:
  - `Tier-0` fast OSS (intent and lightweight transformations)
  - `Tier-1` core OSS reasoning
  - `Tier-2` OSS verifier
  - `Tier-3` premium escalation only for unresolved critical/high-risk ambiguity
- Routing controls:
  - confidence thresholds
  - risk-class escalation policy
  - daily and per-journey budget caps
- Reporting:
  - cost per journey
  - verifier reject rates by tier
  - escalation frequency by country pack

## 14) Dependencies
- Licensed partner availability by country.
- USSD and mobile money aggregator access.
- Reliable satellite/weather data access per region.
- Localization and moderation operations in target languages.

## 15) Risks and Mitigations
- `RISK-01` Regulatory variance across Caribbean countries.
  - Mitigation: country pack legal matrix and launch gates.
- `RISK-02` Model hallucinations in high-stakes flows.
  - Mitigation: reviewer agent + HITL + citation requirements.
- `RISK-03` Cross-channel inconsistency.
  - Mitigation: canonical state store + idempotency + reconciliation jobs.
- `RISK-04` Payment/settlement failures.
  - Mitigation: retry orchestration, escalation queues, partner SLAs.
- `RISK-05` Cost volatility.
  - Mitigation: tiered model routing and budget guards.

## 16) Open Decisions for Approval Gate
1. Final product name and brand system.
2. Country sequence for first two production launches.
3. Partner strategy for credit/insurance and escrow operations.
4. Strictness threshold for HITL in Wave 2 vs Wave 3.
5. Budget envelope for premium data providers.

## 17) Traceability References
- Test mapping: `AGRO-V2-TEST-PLAN.md`
- Delivery mapping: `AGRO-V2-BEAD-BACKLOG.md`
- Review findings: `AGRO-V2-PLAN-REVIEW.md`, `AGRO-V2-ARCH-REVIEW.md`
- Agent uplift references:
  - `AGRO-V2-AGENT-INTELLIGENCE-ADDENDUM.md`
  - `AGRO-V2-AGENT-SYSTEM-SPEC.md`
  - `AGRO-V2-AGENT-BEST-PRACTICES-MATRIX.md`

## 18) API and Contract Detail (Step 1 Depth)

### 18.1 External Contract Classes
- `API-C1` Channel APIs (WhatsApp/USSD/SMS gateways).
- `API-C2` Climate/satellite data APIs.
- `API-C3` Payment and settlement partner APIs.
- `API-C4` Insurance trigger and payout partner APIs.

### 18.2 Canonical Error Contract
```json
{
  "error_code": "POLICY_DENY",
  "message": "Action blocked by policy",
  "request_id": "uuid",
  "retryable": false,
  "escalation_required": true
}
```

### 18.3 Idempotent Mutation Contract
```json
{
  "request_id": "uuid",
  "idempotency_key": "uuid",
  "actor_id": "string",
  "operation": "settlement.release",
  "payload": {}
}
```

### 18.4 Contract Acceptance Rules
- Schema validation must pass before execution.
- Required policy context must be present for high-risk operations.
- Missing idempotency key on mutating operation is an immediate reject.

## 19) Measurable Acceptance Additions
- `ACC-01`: 100% of high-risk transactions have planner and verifier artifacts.
- `ACC-02`: 100% of mutating calls include idempotency keys and schema version.
- `ACC-03`: 0 policy-bypassed commits in finance/insurance flows.
- `ACC-04`: Memory freshness revalidation is executed for stale recalled facts.
- `ACC-05`: Model router respects configured budget caps in all benchmark runs.

## 20) Android Readiness Requirements (Planning/Design Now)

### 20.1 Functional Requirements
- `FR-090`: Mobile API profile must define payload budgets, pagination standards, and backward-compatible versioning for Android clients.
- `FR-091`: All mutating operations used by mobile clients must support resumable/idempotent execution with operation tokens.
- `FR-092`: Offline action queue contract must support enqueue, replay, dedupe, and replay-result reconciliation.
- `FR-093`: Sync conflict resolver policy must define deterministic precedence rules and user-visible resolution states.
- `FR-094`: Auth/session model must support parity between PWA and future Android (token refresh, device binding, session revocation).
- `FR-095`: Notification broker abstraction must unify WhatsApp/SMS/push intents and delivery status semantics.
- `FR-096`: Device capability abstraction layer must isolate camera/location/storage/background-job capabilities from domain logic.

### 20.2 Non-Functional Requirements
- `NFR-009`: Mobile profile endpoints must stay within defined payload budgets for low-end Android scenarios.
- `NFR-010`: Offline queue replay success must meet target thresholds under unstable 3G conditions.
- `NFR-011`: Background sync semantics must remain eventually consistent with canonical backend state.
- `NFR-012`: Android telemetry-ready fields must be emitted even before native app launch.

### 20.3 Observability Fields Required Now
- `device_class`, `network_quality`, `queue_depth`, `replay_attempt_count`, `conflict_type`, `sync_outcome`, `notification_channel`, `notification_delivery_state`.

## 21) Android Native Track Trigger Policy
- Start Android native build track when **3+ triggers** are breached for two consecutive reporting periods:
1. PWA core conversion drops >= 12% on Android user cohort versus baseline.
2. p95 interaction latency on Android cohort exceeds target by >= 25% on critical journeys.
3. Offline replay failure rate exceeds 3% on priority financial/advisory actions.
4. Retention degradation in Android cohort exceeds 10% relative to target segment benchmark.
5. Capability-dependent feature demand (camera/background processing/secure storage) blocks top-priority product outcomes.

### 21.1 Trigger Governance
- Trigger review cadence: biweekly.
- Decision authority: architecture + product + QA gate with Don sign-off.
- Native-start decision must include capacity plan and API compatibility certification.

## 22) IoT Readiness Requirements (Architecture Now, Hardware Later)

### 22.1 Functional Requirements
- `FR-100`: Device registry schema must support future farm-node identity (`device_id`, `farm_id`, `device_type`, `firmware_version`, `status`).
- `FR-101`: Sensor event schema must include provenance metadata (`source_device_id`, `ingest_time`, `event_time`, `confidence`, `signature_state`).
- `FR-102`: Ingestion APIs for sensor-origin data must be versioned, idempotent, and resumable.
- `FR-103`: Event bus topic model must support telemetry partitioning by `country_pack`, `farm_id`, and `stream_type`.
- `FR-104`: Digital twin field model must support future node-level state overlays without schema rewrites.
- `FR-105`: Data governance policy must classify sensor-origin data boundaries separately from user-entered data.

### 22.2 Non-Functional Requirements
- `NFR-013`: Telemetry ingestion contracts must remain backward compatible across schema revisions.
- `NFR-014`: Event-stream ingestion must tolerate duplicate deliveries with deterministic dedupe semantics.
- `NFR-015`: Sensor-origin data retention and access controls must be enforceable per country-pack policies.

### 22.3 Scope Boundary Statement
- Hardware/sensor integrations are explicitly deferred from MVP execution.
- Only readiness interfaces, schemas, and architecture contracts are implemented now.

## 23) UX Excellence Non-Negotiable Gate

### 23.1 Functional Requirements
- `FR-110`: UX must follow a defined visual language system (typography, color tokens, spacing scale, hierarchy rules).
- `FR-111`: Interaction patterns must include clear feedback states (loading/success/error/retry/empty/offline).
- `FR-112`: Trust-signaling patterns must be present in high-risk flows (confirmation clarity, audit visibility, explainability cues).
- `FR-113`: Accessibility and readability standards must support low-literacy and multilingual contexts.
- `FR-114`: Mobile-first interaction design must be optimized for low-end Android constraints.
- `FR-115`: Generic/template-like UI output fails release gate by policy.

### 23.2 Non-Functional Requirements
- `NFR-016`: UX performance budgets for low-end Android cohort must be met on critical journeys.
- `NFR-017`: Task completion and conversion UX metrics must meet defined thresholds before release.
- `NFR-018`: UX design review checklist signoff is mandatory pre-build and pre-release.

### 23.3 UX Gate Statement
- UX quality bar is world-class and non-generic.
- Any output assessed as generic, inconsistent, or trust-degrading is a release blocker.
