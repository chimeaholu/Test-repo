# Agrodomain N4 Tranche Packet

Date: `2026-04-18`
Canonical repo: `/mnt/vault/MWH/Projects/Agrodomain`
Predecessor gates: `N3-G1` to `N3-G5` green on canonical `master` at `8a28709d6f793202968f59b653e324f2c4f2cfde`
Predecessor evidence root: `execution/reviews/2026-04-18T19-40-00Z-n3-q1-final-rerun`
Authoritative sources:
- `execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md`
- `v2-planning/AGRO-V2-BEAD-BACKLOG.md`
- `v2-planning/AGRO-V2-TEST-PLAN.md`
- `v2-planning/AGRO-V2-PRD.md`

## 1. Tranche Decision

The next tranche after the completed `N3` wallet and escrow closeout is `N4`, the advisory, reviewer, and climate baseline slice for trusted operational guidance.

`N3` closed the first regulated money path and established the append-only audit posture needed for sensitive actions. It did not yet deliver:

- advisory retrieval with source-linked citations and confidence indicators
- reviewer enforcement and HITL blocking for low-confidence or policy-sensitive guidance
- multilingual advisory delivery aligned to country-pack locale selection
- climate-risk alerts tied to farm context
- MRV evidence records with explicit assumptions and method references
- tranche-specific `CJ-005`, `CJ-006`, `EP-006`, `EP-008`, `RJ-003`, `DI-005`, and `DI-006` evidence on canonical `master`

`N4` therefore focuses on farmer-facing guidance trust: grounded advisory responses, reviewer gating, climate alerts, and MRV provenance. This tranche is intentionally bounded away from finance, insurance, wallet expansion, traceability expansion, partner APIs, or enterprise hardening.

## 2. N4 Scope

### In scope

- advisory retrieval contracts and runtime with vetted source metadata, citations, and confidence indicators
- reviewer and verifier decision enforcement for policy-sensitive and low-confidence advisory outputs
- multilingual delivery seams required for advisory rendering across configured locales
- climate-risk ingestion normalization, farm-context alert generation, and alert acknowledgement state
- MRV evidence record creation with assumptions, provenance, and method references
- API and Playwright coverage for `CJ-005`, `CJ-006`, `EP-006`, `EP-008`, `RJ-003`, `DI-005`, and `DI-006`
- audit and transcript completeness for advisory and climate actions that cross reviewer or degraded-mode boundaries

### Out of scope

- wallet, escrow, settlement, payout, or notification expansion beyond regression protection
- finance and insurance partner routing, approval consoles, parametric trigger logic, or lending workflows (`B-020` to `B-022`)
- traceability event-chain or quality-evidence expansion (`B-023`, `B-024`)
- enterprise analytics, partner APIs, observability hardening, or other original backlog Wave 4 beads (`B-025` to `B-030`)
- Wave 5+ style expansion of disease diagnosis, supply-chain logistics, or country-rollout operations
- deploy, publish, or push actions

## 3. Bead Set

### `N4-C1` Advisory, reviewer, and climate contracts

- Maps to: `B-014`, `B-015`, `B-016`, `B-017`, `B-018`, `B-019`
- Objective: extend the contracts package for advisory prompts/responses, reviewer outcomes, climate alerts, and MRV evidence records.
- Route owner: `@builder`
- Dependencies: `N3-G1` to `N3-G5`
- Inputs: `packages/contracts`, `AGRO-V2-TEST-PLAN.md`, `AGRO-V2-BEAD-BACKLOG.md`, `AGRO-V2-PRD.md`
- Implementation tasks:
  - add advisory request/response DTOs with source citations, confidence bands, locale, and transcript metadata
  - add reviewer decision DTOs with `approve`, `revise`, `block`, and `hitl_required` outcomes plus reason codes
  - add climate alert, acknowledgement, and degraded-mode DTOs
  - add MRV evidence record DTOs with assumptions, source references, and method tags
  - generate schema and manifest outputs
- Test obligations:
  - Unit: schema validation for advisory, reviewer, climate, and MRV commands
  - Integration: generated artifact parity
  - E2E references: `CJ-005`, `CJ-006`
  - Error references: `EP-006`, `EP-008`
  - Data references: `DI-005`, `DI-006`
- Observability obligations: metadata must preserve `schema_version`, `request_id`, `idempotency_key`, `actor_id`, `country_code`, `channel`, `correlation_id`, `locale`, and `source_ids`
- Security obligations: reviewer and HITL decisions require explicit actor-role and policy-context metadata
- Exit criteria:
  - generated artifacts committed
  - no duplicate advisory/reviewer/climate DTO definitions outside `packages/contracts`

### `N4-A1` Advisory retrieval and citation runtime

- Maps to: `B-014`
- Objective: implement advisory retrieval with explicit source filtering, citation payloads, and confidence scoring.
- Route owner: `@builder`
- Dependencies: `N4-C1`
- Inputs: existing command bus, policy guardrail seams, typed-memory/runtime scaffolds
- Implementation tasks:
  - add advisory query persistence and read-model tables if required by runtime
  - implement retrieval ranking and source filtering against vetted fixtures or seeded corpus only
  - expose advisory request, transcript, and response reads with citation drawers and confidence state
  - bind advisory responses to audit/transcript records with source IDs and model metadata
- Test obligations:
  - Unit: source filtering, ranking, and confidence-band mapping
  - Integration: duplicate advisory request replay remains single-effect
  - E2E references: `CJ-005`, `RJ-003`
  - Data reference: `DI-005`
- Observability obligations: retrieval source count, confidence bucket, and citation-render metadata
- Security obligations: no uncited response path for responses claimed as grounded
- Exit criteria:
  - advisory responses render source attribution and confidence indicators
  - replayed advisory submissions do not create duplicate conversation records

### `N4-A2` Reviewer decision and HITL enforcement runtime

- Maps to: `B-015`
- Objective: enforce reviewer decisions and human-block semantics for risky or low-confidence advisory output.
- Route owner: `@builder`
- Dependencies: `N4-C1`, `N4-A1`
- Inputs: policy guardrail framework, verifier/reviewer scaffolds, audit seams
- Implementation tasks:
  - implement reviewer decision transitions with reason codes and transcript links
  - block or escalate low-confidence/high-risk advisory output before delivery
  - expose HITL-required state to clients without simulating approval completion
  - audit every reviewer and override boundary
- Test obligations:
  - Unit: confidence threshold and policy threshold enforcement
  - Integration: blocked output never appears as delivered advice
  - E2E references: `CJ-005`, `EP-006`
  - Data reference: `DI-005`
- Observability obligations: reviewer outcome counts, blocked-response counts, and escalation latency markers
- Security obligations: manual approval simulation is forbidden; only explicit `hitl_required` or decision-backed states may pass
- Exit criteria:
  - low-confidence or policy-sensitive advisory is revised, blocked, or escalated with explicit reason codes
  - reviewer log and user-visible state stay aligned

### `N4-A3` Climate ingestion, alerting, and MRV evidence runtime

- Maps to: `B-017`, `B-018`, `B-019`
- Objective: implement farm-context climate alerts and provenance-rich MRV evidence records on top of normalized climate inputs.
- Route owner: `@builder`
- Dependencies: `N4-C1`
- Inputs: country-pack config, canonical state store, audit seams
- Implementation tasks:
  - add climate observation ingestion persistence and normalization if missing in current slice
  - implement farm-context alert rules, precedence ordering, and acknowledgement flow
  - implement MRV evidence record creation with method tags, assumptions, and source completeness checks
  - preserve explicit degraded-mode semantics when source windows are unavailable or inconsistent
- Test obligations:
  - Unit: climate mapper coverage, alert precedence, and provenance completeness checks
  - Integration: missing source windows produce degraded-mode records rather than silent success
  - E2E references: `CJ-006`, `EP-008`
  - Data reference: `DI-006`
- Observability obligations: alert counts by severity, degraded-mode count, and evidence-record completeness markers
- Security obligations: climate/MRV outputs must include assumptions and provenance before user-facing promotion
- Exit criteria:
  - climate alert flow supports create, read, and acknowledge
  - MRV records persist assumptions, method references, and source completeness state
  - missing source data yields explicit degraded mode and audit evidence

### `N4-W1` Advisory conversation UX and multilingual delivery

- Maps to: `B-016` plus `RJ-003`
- Objective: replace placeholder advisory flows with contract-backed conversation, citation, confidence, and reviewer-state UX.
- Route owner: `@frontend`
- Dependencies: `N4-C1`, `N4-A1`, `N4-A2`
- Build gate: no HITL completion affordance until backend reviewer states exist
- Implementation tasks:
  - replace fixture-only advisory views with live advisory conversation data
  - show citations, confidence chips, reviewer outcome copy, and `hitl_required` or blocked states
  - implement locale resolution and fallback for supported country-pack language selections
  - preserve readability and mobile clarity for `RJ-003`
- Test obligations:
  - Unit: locale fallback and advisory state rendering
  - Integration: generated contract client usage only
  - E2E references: `CJ-005`, `EP-006`
  - Responsive reference: `RJ-003`
  - Data reference: `DI-005`
- Observability obligations: citation drawer interaction and reviewer-state display telemetry hooks
- Security obligations: no direct server model imports; generated client only
- Exit criteria:
  - desktop and mobile users can read advisory conversation history with citations and confidence
  - low-confidence or blocked states are explicit and non-generic

### `N4-W2` Climate alerts and MRV evidence UX

- Maps to: climate/MRV UI slice for `B-017`, `B-018`, `B-019`
- Objective: deliver live climate alert and MRV evidence surfaces with degraded-mode clarity.
- Route owner: `@frontend`
- Dependencies: `N4-C1`, `N4-A3`
- Implementation tasks:
  - wire climate alert center/detail views to live alert and acknowledgement payloads
  - show severity, source confidence, degraded mode, and acknowledgement status
  - surface MRV evidence, assumptions, and method references with explicit operator-facing copy
  - keep offline/retry guidance scoped to climate acknowledgement only
- Test obligations:
  - Unit: severity mapping, degraded-mode reducer, and MRV evidence view-model mapping
  - Integration: contract-backed climate/MRV payload usage
  - E2E references: `CJ-006`, `EP-008`
  - Responsive reference: climate alert mobile readability within `CJ-006`
  - Data reference: `DI-006`
- Observability obligations: alert acknowledgement latency and degraded-mode impression telemetry hooks
- Security obligations: no hidden confidence downgrade; degraded mode must stay visible to end users
- Exit criteria:
  - climate alerts and MRV evidence are readable on desktop and mobile
  - source gaps yield visible degraded-state messaging instead of empty or optimistic UI

### `N4-Q1` Advisory/reviewer/climate gate pack

- Objective: define and run the blocking QA evidence for the tranche.
- Route owner: `@qa-engineer`
- Dependencies: `N4-A2`, `N4-A3`, `N4-W1`, `N4-W2`
- Implementation tasks:
  - add focused API integration coverage for advisory retrieval, reviewer blocking, climate degraded mode, and MRV provenance
  - add Playwright advisory and climate journey coverage for desktop and mobile
  - publish the N4 gate evidence pack under `execution/reviews`
- Test obligations:
  - Critical: `CJ-005`, `CJ-006`
  - Error: `EP-006`, `EP-008`
  - Responsive: `RJ-003`
  - Data: `DI-005`, `DI-006`
  - Negative paths:
    - uncited advisory response
    - low-confidence advisory delivered without reviewer block
    - stale or missing reviewer reason code
    - climate alert emitted without farm-context link
    - MRV record missing assumptions or method reference
    - source outage without degraded-mode marker
  - Regression paths:
    - no regression of `V-001`, `N1`, `N2`, or `N3` auth/listing/negotiation/wallet flows
    - desktop and mobile evidence for advisory conversation and climate alert flows
- Observability obligations: artifact paths written under `execution/reviews` and `execution/heartbeats`
- Security obligations: rejected reviewer/HITL bypass and degraded-mode omissions must be evidenced
- Exit criteria:
  - gate pack exists with pass/fail table and artifact links

## 4. Lane Allocation and Merge Order

- Contracts lane: `N4-C1`
- API lane 1: `N4-A1`
- API lane 2: `N4-A2`
- API lane 3: `N4-A3`
- Web lane 1: `N4-W1`
- Web lane 2: `N4-W2`
- QA lane: `N4-Q1`
- Review lane: adversarial code review against merged N4 diffs
- Architecture lane: boundary, sequencing, reviewer-trust, and degraded-mode review before tranche close

Mandatory merge order:

1. `N4-C1`
2. `N4-A1`
3. `N4-A2`
4. `N4-A3`
5. `N4-W1`
6. `N4-W2`
7. `N4-Q1`

Execution and gating rules:

- `N4-A1` may not emit grounded advisory content without source IDs and confidence metadata.
- `N4-A2` must reuse the existing policy, reviewer, and audit seams rather than inventing a side-channel approval path.
- `N4-A3` must preserve explicit degraded mode for unavailable source windows and may not silently fabricate climate certainty.
- `N4-W1` may move only after `N4-A1` and `N4-A2` publish committed read and decision contracts.
- `N4-W2` may not simulate alert health or MRV completeness without backend source-confidence or provenance signals.
- `N4-Q1` runs only after `N4-W2` is merged and must include negative-path and regression evidence.
- Review lanes do not block initial coding, but they do block tranche close.

## 5. Acceptance Gates

### `N4-G1` Contract lock

Pass when:

- advisory, reviewer, climate, and MRV contracts are committed under `packages/contracts`
- generated schema outputs are committed
- every sensitive mutation includes `request_id`, `idempotency_key`, `actor_id`, `country_code`, `channel`, and `schema_version`

### `N4-G2` Advisory grounding gate

Pass when:

- `CJ-005` is green
- advisory responses include citations and confidence indicators
- duplicate advisory submissions remain single-effect and auditable
- no uncited grounded-response path remains

### `N4-G3` Reviewer enforcement gate

Pass when:

- `EP-006` is green
- low-confidence or policy-sensitive advisory output is revised, blocked, or escalated
- reviewer decision logs and user-visible state align
- no HITL bypass or silent approval path remains

### `N4-G4` Climate degraded-mode gate

Pass when:

- `CJ-006` and `EP-008` are green
- farm-context climate alerts can be read and acknowledged through explicit states
- source gaps or conflicts produce degraded-mode messaging plus retry-safe evidence
- no silent outage or optimistic certainty leak remains

### `N4-G5` Provenance and data-integrity gate

Pass when:

- `DI-005` and `DI-006` are green
- advisory records preserve source IDs and model/reviewer metadata
- climate and MRV records preserve assumptions, method references, and source completeness state
- no open `S1` or higher defects remain

## 6. Launch Worktree Policy

Use isolated execution copies or existing worker copies because the shared git object store has been unstable for new worktrees. Generated-artifact cleanup is allowed; destructive source resets are not.

Suggested worker copies:

- Advisory API worker copy: `/ductor/agents/engineering/workspace/worktrees/agrodomain-n4-advisory-copy`
- Climate API worker copy: `/ductor/agents/engineering/workspace/worktrees/agrodomain-n4-climate-copy`
- Web worker copy: `/ductor/agents/engineering/workspace/worktrees/agrodomain-n4-web-copy`
- QA/review worker copy: `/ductor/agents/engineering/workspace/worktrees/agrodomain-n4-qa-copy`

## 7. Close Rule

Do not advance to finance, insurance, traceability, enterprise API, or other post-N4 scope until:

1. `N4-G1` to `N4-G5` are all green.
2. Adversarial code review and architecture review have published explicit tranche-close verdicts.
3. The tranche close packet cites artifact roots for contracts, API, web, Playwright, and provenance/degraded-mode evidence.
