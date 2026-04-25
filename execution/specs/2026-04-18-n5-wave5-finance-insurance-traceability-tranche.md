# Agrodomain N5 Tranche Packet

Date: `2026-04-18`
Canonical repo: `/mnt/vault/MWH/Projects/Agrodomain`
Predecessor gates: `N4-G1` to `N4-G5` green on repaired runnable baseline ref `fix/agrodomain-n4-packaged-baseline` at `118fa1b4349eb58f32ca079479ff5d050412dcc4`
Predecessor evidence root: `execution/reviews/2026-04-18T21-44-57Z-n4-q1-final-rerun-118fa1b4`
Authoritative sources:
- `execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md`
- `v2-planning/AGRO-V2-BEAD-BACKLOG.md`
- `v2-planning/AGRO-V2-TEST-PLAN.md`
- `v2-planning/AGRO-V2-PRD.md`

## 1. Tranche Decision

The next tranche after completed `N4` closeout is `N5`, the finance/insurance decision-surface and traceability evidence slice.

`N4` closed trusted-guidance foundations for advisory grounding, reviewer enforcement, climate degraded mode, and MRV provenance. It did not yet deliver:

- partner-bound finance decision requests and responsibility-bounded decision outcomes
- insurance parametric trigger registration, evaluation, and payout-event provenance
- operator-facing finance/insurance HITL queue and approval-detail surfaces
- traceability event-chain persistence for consignments and milestone custody updates
- quality evidence attachment capture and gallery projection tied to traceability events
- tranche-specific `CJ-004`, `CJ-007`, `CJ-008`, `EP-008`, `DI-003`, and `DI-006` evidence on the repaired runnable baseline

`N5` therefore focuses on regulated decision handling and shipment proof surfaces: partner decision boundaries, parametric insurance trigger semantics, operator review surfaces, consignment event continuity, and quality evidence attachment visibility.

This tranche is intentionally bounded away from enterprise/API hardening, observability expansion, admin-hardening, logistics optimization, disease-diagnosis expansion, and any Wave 6 style rollout or operational-program work.

## 2. N5 Scope

### In scope

- finance partner request and decision DTOs, persistence, runtime transitions, and responsibility boundaries for `B-020`
- insurance trigger registry, trigger evaluation outcomes, and payout-event provenance for `B-021`
- operator-facing finance/insurance review queue, decision detail, and HITL outcome surfaces for `B-022`
- consignment lifecycle event-chain persistence and read models for `B-023`
- quality evidence attachment metadata, validation, and gallery/detail surfaces for `B-024`
- API, web, and Playwright evidence for `CJ-004`, `CJ-007`, `CJ-008`, `EP-008`, `DI-003`, and `DI-006`
- tranche-specific regression protection for `N1` through `N4` journeys

### Out of scope

- `B-025` through `B-030`, including analytics mart, partner API gateway expansion, observability/SLO hardening, or executable review-gate hardening
- deploy, publish, push, release, or environment mutation actions
- lending origination workflows, crowd-farming, investor matching, or underwriting beyond bounded partner decision seams
- logistics routing, post-harvest optimization, disease-diagnosis expansion, or country-rollout operations
- admin-hardening or Wave 6 expansion of enterprise controls
- unrelated wallet/escrow, negotiation, onboarding, or listing expansion outside regression protection

## 3. Bead Set

### `N5-C1` Finance, insurance, and traceability contract lock

- Maps to: `B-020`, `B-021`, `B-022`, `B-023`, `B-024`
- Objective: extend the contracts package for finance partner decisions, insurance triggers, review-queue states, traceability events, and quality evidence attachments.
- Route owner: `@builder`
- Dependencies: `N4-G1` to `N4-G5`
- Inputs: `packages/contracts`, `AGRO-V2-TEST-PLAN.md`, `AGRO-V2-BEAD-BACKLOG.md`, `AGRO-V2-PRD.md`
- Implementation tasks:
  - add finance partner request and decision DTOs with actor, country, partner responsibility, policy, and audit metadata
  - add insurance trigger registry and payout-event DTOs with threshold sources, evaluation timestamp, and dedupe semantics
  - add finance/insurance queue item, review detail, and approval action DTOs for the operator console
  - add consignment, traceability-event, and evidence-attachment DTOs with causation/correlation IDs and immutable event references
  - regenerate manifest, JSON schema, and OpenAPI artifacts
- Test obligations:
  - Unit: schema validation for finance, insurance, review, traceability, and evidence DTOs
  - Integration: generated artifact parity
  - E2E references: `CJ-004`, `CJ-007`, `CJ-008`
  - Error/data references: `EP-008`, `DI-003`, `DI-006`
- Observability obligations: metadata must preserve `schema_version`, `request_id`, `idempotency_key`, `actor_id`, `country_code`, `channel`, `correlation_id`, `partner_reference_id`, `consignment_id`, and `trace_event_id`
- Security obligations: finance/insurance actions require explicit actor-role, responsibility-boundary, and policy-context metadata
- Exit criteria:
  - generated artifacts committed
  - no duplicate finance/insurance/traceability DTO definitions outside `packages/contracts`

### `N5-A1` Finance partner adapter and insurance trigger runtime

- Maps to: `B-020`, `B-021`
- Objective: implement partner-bound finance decision flows and parametric insurance trigger evaluation without collapsing responsibility boundaries.
- Route owner: `@builder`
- Dependencies: `N5-C1`
- Inputs: existing wallet and climate seams, policy guardrails, audit services, typed runtime scaffolds
- Implementation tasks:
  - implement partner request creation, idempotent replay protection, and decision persistence for finance cases
  - implement responsibility-safe decision transitions so internal runtime never impersonates partner approval
  - implement insurance trigger registry, evaluation, deduplication, and payout-event recording with climate-source references
  - bind every finance/insurance mutation to audit and transcript records with actor, partner, and source metadata
- Test obligations:
  - Unit: adapter validation, partner-boundary enforcement, trigger-threshold evaluation, and payout dedupe logic
  - Integration: replayed finance requests remain single-effect and duplicate insurance trigger evaluations do not emit duplicate payout events
  - E2E references: `CJ-004`, `EP-008`
  - Data references: `DI-003`, `DI-006`
- Observability obligations: finance decision counts, pending-review counts, trigger evaluation counts, and payout-event dedupe markers
- Security obligations: no internal "approved" shortcut without explicit partner decision or HITL-reviewed state
- Exit criteria:
  - finance decisions expose responsibility-boundary metadata
  - insurance triggers retain source-linked thresholds and payout provenance

### `N5-A2` Traceability event-chain runtime

- Maps to: `B-023`
- Objective: implement consignment lifecycle events with chain continuity, immutable event references, and read models for shipment proof.
- Route owner: `@builder`
- Dependencies: `N5-C1`
- Inputs: listing/order primitives, audit seams, canonical state store
- Implementation tasks:
  - implement consignment aggregate persistence if missing in current slice
  - implement append-only traceability events for harvest, handoff, dispatch, transit, delivery, and exception milestones
  - expose traceability timelines and detail reads with event ordering, actor metadata, and source references
  - enforce continuity checks so gaps or out-of-order inserts surface explicit error states
- Test obligations:
  - Unit: chain continuity validation, ordering, and immutable reference checks
  - Integration: duplicate append requests remain single-effect and missing predecessor events fail safely
  - E2E references: `CJ-007`
  - Data reference: `DI-006`
- Observability obligations: event counts by milestone, continuity-failure counts, and attachment-ready projection markers
- Security obligations: traceability events are append-only and must retain causation/correlation IDs
- Exit criteria:
  - consignment timeline supports create, read, and ordered event views
  - continuity failures are explicit rather than silently repaired

### `N5-W1` Finance/insurance HITL approval console

- Maps to: `B-022`
- Objective: replace placeholder finance surfaces with contract-backed review queue and decision detail UX.
- Route owner: `@frontend`
- Dependencies: `N5-C1`, `N5-A1`
- Build gate: no simulated approval completion before runtime exposes real queue and decision states
- Implementation tasks:
  - wire queue, detail, and decision-action surfaces to live finance/insurance review payloads
  - show responsibility boundary, partner status, trigger source references, and actor decision history
  - expose `pending_review`, `approved`, `blocked`, and `hitl_required` states with explicit operator copy
  - preserve mobile usability and state-coverage requirements for `CJ-008`
- Test obligations:
  - Unit: review-state rendering and decision transition view-model mapping
  - Integration: generated contract client usage only
  - E2E references: `CJ-004`, `CJ-008`
  - UX references: `UXJ-002`, `UXDI-002`
  - Data reference: `DI-003`
- Observability obligations: queue filter interaction and decision-action telemetry hooks
- Security obligations: no hidden or auto-approved state transitions; every approval action must remain actor-attributed
- Exit criteria:
  - operator users can inspect and act on bounded finance/insurance queue items
  - partner-vs-internal responsibility remains explicit in UI copy and state chips

### `N5-W2` Traceability timeline and quality evidence surfaces

- Maps to: `B-024`
- Objective: deliver live consignment timeline and evidence gallery/detail UX on top of contract-backed traceability read models.
- Route owner: `@frontend`
- Dependencies: `N5-C1`, `N5-A2`
- Implementation tasks:
  - wire traceability timeline/detail pages to live consignment and event-chain payloads
  - show milestone ordering, actor attribution, custody state, and exception markers
  - surface evidence attachment cards, validation state, and metadata-rich gallery/detail views
  - keep upload/retry guidance bounded to evidence metadata interactions only
- Test obligations:
  - Unit: event timeline ordering reducer and evidence gallery view-model mapping
  - Integration: contract-backed traceability/evidence payload usage
  - E2E references: `CJ-007`
  - UX references: `UXJ-002`, `UXDI-002`
  - Data reference: `DI-006`
- Observability obligations: evidence gallery interaction and event-detail open telemetry hooks
- Security obligations: evidence must stay trace-event scoped; no orphaned attachment rendering
- Exit criteria:
  - desktop and mobile users can inspect consignment timelines and evidence details
  - orphaned or invalid evidence metadata yields explicit error state, not silent omission

### `N5-Q1` Finance/traceability gate pack

- Objective: define and run the blocking QA and review evidence for the tranche.
- Route owner: `@qa-engineer`
- Dependencies: `N5-A1`, `N5-A2`, `N5-W1`, `N5-W2`
- Implementation tasks:
  - add focused API integration coverage for finance partner decisions, insurance trigger dedupe, traceability continuity, and evidence attachment reads
  - add Playwright coverage for operator review queue and traceability/evidence journeys on desktop and mobile
  - publish adversarial code-review and architecture-review memos scoped to N5 boundary compliance
  - publish the N5 gate evidence pack under `execution/reviews`
- Test obligations:
  - Critical journeys: `CJ-004`, `CJ-007`, `CJ-008`
  - Error/data journeys: `EP-008`, `DI-003`, `DI-006`
  - Negative paths:
    - finance decision recorded without responsibility boundary
    - insurance trigger duplicated into two payout events
    - operator approval state shown without explicit actor action
    - traceability event appended out of order without continuity failure
    - evidence attachment rendered without linked trace event
  - Regression paths:
    - no regression of `V-001`, `N1`, `N2`, `N3`, or `N4` auth/listing/negotiation/wallet/advisory/climate flows
- Observability obligations: artifact paths written under `execution/reviews` and `execution/heartbeats`
- Security obligations: approval-bypass and orphaned-evidence failures must be explicitly evidenced
- Exit criteria:
  - gate pack exists with pass/fail table, artifact links, and review findings summary

## 4. Lane Allocation and Merge Order

Because the background-task pool is capped, launch lanes are consolidated while bead sequencing remains strict:

- API lane alpha: `N5-C1` + `N5-A1`
- API lane beta: `N5-A2`
- Web lane: `N5-W1` + `N5-W2`
- QA/review lane: `N5-Q1` plus adversarial code/architecture review artifacts

Mandatory merge order:

1. `N5-C1`
2. `N5-A1`
3. `N5-A2`
4. `N5-W1`
5. `N5-W2`
6. `N5-Q1`

Execution and gating rules:

- `N5-A1` may not collapse partner responsibility into internal approval state.
- `N5-A1` must preserve idempotent finance requests and deduped insurance payout emission.
- `N5-A2` must remain append-only for traceability events and reject continuity gaps explicitly.
- `N5-W1` may move only after real finance/insurance queue and decision contracts exist.
- `N5-W2` may not simulate evidence attachments or milestone order without backend read models.
- `N5-Q1` runs only after both web surfaces are merged and must include regression proof for `N1` through `N4`.
- Review artifacts do not block initial coding, but they do block tranche close.

## 5. Acceptance Gates

### `N5-G1` Contract and boundary lock

Pass when:

- finance, insurance, review, traceability, and evidence contracts are committed under `packages/contracts`
- generated schema artifacts are refreshed
- contract metadata preserves regulated-action boundary fields

### `N5-G2` Finance decision accountability

Pass when:

- `CJ-004` and `DI-003` evidence prove finance requests, partner decisions, and HITL states are actor-attributed and replay-safe
- no internal runtime path can silently mark a partner-owned case as approved

### `N5-G3` Insurance trigger provenance

Pass when:

- `EP-008` and `DI-006` evidence prove thresholds, climate-source references, and payout-event dedupe behavior
- missing or duplicate trigger evaluations fail safely with audit proof

### `N5-G4` Traceability continuity

Pass when:

- `CJ-007` evidence proves ordered consignment events and immutable references across the timeline
- out-of-order or missing predecessor events surface explicit continuity failure states

### `N5-G5` Decision-surface and evidence integrity

Pass when:

- `CJ-008` plus `CJ-007` desktop/mobile evidence proves operator queue/detail surfaces and evidence gallery/detail views are live and non-placeholder
- tranche regression runs show no new failures in closed `N1` to `N4` journeys

## 6. Scope Guard Reminder

This tranche is limited to `B-020` through `B-024`. Do not expand into `B-025` through `B-030`, Wave 6/admin-hardening, deploy work, or non-regression wallet/advisory/climate follow-on scope while executing N5.
