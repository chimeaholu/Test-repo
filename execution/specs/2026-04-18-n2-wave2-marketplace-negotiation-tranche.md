# Agrodomain N2 Tranche Packet

Date: `2026-04-18`
Canonical repo: `/mnt/vault/MWH/Projects/Agrodomain`
Predecessor gates: `V-001` green on canonical `master`; `N1` green on canonical `master` at `e65cdcc273418552c908047363bc6de95d3a8f1d`
Authoritative sources:
- `output_to_user/AGRODOMAIN-SOP15-PRODUCTION-BUILD-PLAN.md`
- `execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md`
- `v2-planning/AGRO-V2-TEST-PLAN.md`

## 1. Tranche Decision

The next tranche after `V-001` and `N1` is `N2`, the first true Wave 2 expansion of the marketplace revenue path.

`N1` proved the shell, consent, listing create/edit, buyer discovery shell, and API hardening. It did not yet deliver the Wave 2 finish line because:

- buyer discovery is still mostly a gated shell rather than a published marketplace
- listing edits are owner-scoped but revision history and publish-state discipline are not the shared system of record
- negotiation routes exist as placeholders rather than a buyer-to-seller thread flow
- `CJ-003` and `DI-002` are not yet green on canonical `master`

`N2` therefore focuses on shared marketplace visibility plus negotiation threads, and explicitly does **not** start wallet, escrow, finance, advisory, traceability, or channel-fallback implementation.

## 2. N2 Scope

### In scope

- published listing visibility for non-owner buyer actors
- listing schema and read-model redesign from owner-scoped mutable rows to publish/unpublish/revision-aware state
- negotiation thread creation, counter, confirmation request, confirmation approve/reject, and thread-read surfaces
- cross-role visibility rules for listing and negotiation reads
- deterministic command idempotency and browser refresh parity for offer mutations
- API and Playwright coverage for `CJ-003` and `DI-002`

### Out of scope

- wallet ledger entries or escrow state transitions
- wallet, escrow, and settlement references in N2 listing or negotiation DTOs/tables
- finance partner routing
- partner-routing references in N2 listing or negotiation DTOs/tables
- worker-owned retry orchestration
- WhatsApp/SMS delivery fallback implementation
- channel fallback and cross-channel replay orchestration
- advisory or reviewer intelligence logic
- traceability, climate, or admin hardening beyond required observability hooks

## 3. Bead Set

### `N2-C1` Marketplace publish and negotiation contracts

- Objective: extend the canonical contracts package for publish-state and negotiation flows.
- Route owner: `@builder`
- Dependencies: `V-001`, `N1`
- Inputs: `packages/contracts`, `v2-planning/AGRO-V2-TEST-PLAN.md`, `v2-planning/AGRO-V2-BEAD-BACKLOG.md`
- Implementation tasks:
  - add listing publish, unpublish, and revision-summary DTOs
  - add negotiation create, counter, accept, reject, and thread-read DTOs
  - generate schema and manifest outputs
- Test obligations:
  - Unit: schema validation for publish and offer commands
  - Integration: generated artifact parity
  - E2E reference: `CJ-003`
  - Data reference: `DI-002`
- Observability obligations: contract metadata must preserve `schema_version`, `request_id`, and `idempotency_key`
- Security obligations: mutating offer contracts require actor and country scope metadata
- Exit criteria:
  - generated artifacts committed
  - no duplicate DTO definitions outside `packages/contracts`

### `N2-A1` Listing schema and read-model redesign

- Objective: redesign listing persistence and read paths to support publish/unpublish plus revision-aware buyer-safe discovery.
- Route owner: `@builder`
- Dependencies: `N2-C1`
- Inputs: existing `marketplace` routes, repositories, and `0005_vertical_slice_identity_marketplace.py`
- Implementation tasks:
  - design and implement migration-backed listing schema for revision storage and publish transitions
  - define and implement latest-projection strategy over revisions
  - add publish/unpublish handlers bound to the new schema
  - expose buyer-safe published listing read-model queries
  - explicitly decide and test-pin listing create default state
- Test obligations:
  - Unit: publish-state transition rules and revision append behavior
  - Integration: owner edit then buyer read parity
  - E2E reference: `CJ-002`
  - Data reference: `DI-001`
- Observability obligations: publish transition metrics and revision count fields
- Security obligations: owner-only publish/edit, buyer read only for published records
- Exit criteria:
  - published listing appears in buyer discovery
  - revision trail is queryable
  - migration and integration tests prove read parity for owner and buyer-safe projection semantics

### `N2-A2` Negotiation command and thread runtime

- Objective: implement the first cross-role negotiation workflow on top of published listings.
- Route owner: `@builder`
- Dependencies: `N2-C1`, `N2-A1`
- Inputs: `AGRO-V2-TEST-PLAN.md`, existing command bus/idempotency/audit seams
- Implementation tasks:
  - add negotiation persistence tables and migration
  - add create-offer, counter-offer, confirmation request, confirmation approve, and confirmation reject handlers
  - implement `open -> pending_confirmation -> accepted/rejected` state transitions with terminal-state mutation guards
  - enforce authorized confirmer identity on confirmation actions
  - fail closed for unsupported `market.negotiation.*` commands until handlers are registered
  - record audit and outbox events on every state transition
  - enforce single-effect replay for repeated offer submissions
- Test obligations:
  - Unit: negotiation state machine
  - Integration: duplicate offer replay and unauthorized thread access rejection
  - E2E reference: `CJ-003`
  - Data reference: `DI-002`
- Observability obligations: thread open/counter/accept/reject counters
- Security obligations: actor-scoped thread access, server-side authorization, audit required on all regulated mutations
- Exit criteria:
  - buyer can create an offer on a published listing
  - thread enters `pending_confirmation` before any final acceptance
  - only authorized confirmer actions can finalize confirmation states
  - refresh shows the same thread state for both actors
  - final acceptance requires a recorded confirmation checkpoint and authorized confirmer action

### `N2-W1` Published marketplace discovery

- Objective: convert buyer discovery from empty shell to a published market surface.
- Route owner: `@frontend`
- Dependencies: `N2-C1`, `N2-A1`
- Implementation tasks:
  - replace empty-state-only buyer listing page with published listing feed
  - expose publish status and revision cues on owner detail
  - preserve current owner edit UX while separating buyer-safe view
- Test obligations:
  - Unit: state selectors and view-model mapping
  - Integration: generated client usage only
  - E2E reference: `CJ-002`
  - Data reference: `DI-001`
- Observability obligations: listing view and inquiry-start telemetry hooks
- Security obligations: no direct server model imports; generated client only
- Exit criteria:
  - buyer can discover published listings without owner-only controls leaking into the view

### `N2-W2` Negotiation inbox and thread UI

- Objective: ship the first usable buyer/seller negotiation experience.
- Route owner: `@frontend`
- Dependencies: `N2-C1`, `N2-A2`
- Build gate: static composition only until `N2-C1` generated artifacts are committed and `N2-A2` exposes negotiation read/mutation endpoints
- Implementation tasks:
  - before prerequisites: keep route limited to static layout and non-interactive composition
  - after prerequisites: replace placeholder negotiation inbox with live thread list
  - after prerequisites: add offer composer, counter flow, confirmation request/approve/reject actions, and timeline states
  - render audit-friendly status chips and deterministic replay/conflict messaging
- Test obligations:
  - Unit: thread reducer and action-state rendering
  - Integration: contract-backed mutations and optimistic reconciliation
  - E2E reference: `CJ-003`, `RJ-002`
  - Data reference: `DI-002`
- Observability obligations: offer submit latency and failure telemetry
- Security obligations: action visibility follows actor role and thread membership
- Exit criteria:
  - no interactive negotiation behavior ships before contract and endpoint prerequisites are met
  - buyer and seller can progress one thread end to end in the browser

### `N2-Q1` Wave 2 gate pack

- Objective: define and run the blocking QA evidence for the tranche.
- Route owner: `@qa-engineer`
- Dependencies: `N2-A2`, `N2-W2`
- Implementation tasks:
  - add Playwright negotiation journey coverage
  - add API integration coverage for publish/read parity and offer replay
  - publish Wave 2 gate evidence pack under `execution/reviews`
- Test obligations:
  - E2E: `CJ-003`, `RJ-002`
  - Data: `DI-002`
  - Negative paths:
    - unauthorized negotiation read
    - unauthorized confirmation action
    - duplicate offer submit
    - terminal-thread post-accept mutation attempt
    - draft or unpublished listing leak into buyer discovery
  - Regression paths:
    - no regression of `V-001` and `N1` listing create/edit/idempotency/audit behavior
    - desktop and mobile evidence for real negotiation-thread `RJ-002` flow
- Observability obligations: artifact paths written under `execution/reviews` and `execution/heartbeats`
- Security obligations: rejected unauthorized reads and mutations must be evidenced
- Exit criteria:
  - gate pack exists with pass/fail table and artifact links

## 4. Lane Allocation and Merge Order

- Contracts lane: `N2-C1`
- API lane: `N2-A1`, then `N2-A2`
- Web lane: `N2-W1`, then `N2-W2` (prerequisite-gated)
- QA lane: `N2-Q1` (final tranche close lane)
- Review lane: adversarial code review against merged N2 diffs
- Architecture lane: boundary and sequencing validation before tranche close

Mandatory merge order:

1. `N2-C1`
2. `N2-A1`
3. `N2-W1`
4. `N2-A2`
5. `N2-W2`
6. `N2-Q1`

Execution and gating rule:

- `N2-W1` may run only against committed `N2-C1` + `N2-A1` shapes and must not assume unimplemented negotiation runtime.
- `N2-W2` may not move beyond static composition until `N2-C1` generated artifacts are committed and `N2-A2` endpoints exist.
- `N2-Q1` runs only after `N2-W2` is merged and must include full negative and regression evidence.
- Review lanes do not block initial coding, but they do block tranche close.

## 5. Acceptance Gates

### `N2-G1` Contract lock

Pass when:

- publish and negotiation contracts are committed under `packages/contracts`
- generated schema outputs are committed
- every negotiation mutation includes `request_id`, `idempotency_key`, `actor_id`, `country_code`, `channel`, and `schema_version`

### `N2-G2` Marketplace visibility gate

Pass when:

- owner can publish a listing and see revision history
- buyer can discover published listings only
- unpublished or unauthorized records do not leak across actors

### `N2-G3` Negotiation workflow gate

Pass when:

- `CJ-003` is green
- buyer offer -> seller counter -> `pending_confirmation` -> authorized confirmer action -> refreshed thread parity works
- unsupported `market.negotiation.*` commands are rejected and not accepted as generic workflow results
- duplicate submit is single-effect and auditable

### `N2-G4` Data integrity and boundary gate

Pass when:

- `DI-002` is green
- web mutations use generated contract clients only
- regulated negotiation mutations emit audit and outbox records
- no negotiation or marketplace DTO/table includes wallet, escrow, settlement, or finance-partner references
- no open `S1` or higher defects remain

## 6. Launch Commands

Use isolated execution copies because the shared git object store is currently corrupt for new worktrees.

- API/contracts worker copy: `/ductor/agents/engineering/workspace/worktrees/agrodomain-n2-api-copy`
- Web worker copy: `/ductor/agents/engineering/workspace/worktrees/agrodomain-n2-web-copy`
- QA worker copy: `/ductor/agents/engineering/workspace/worktrees/agrodomain-n2-qa-copy`

## 7. Close Rule

Do not advance to wallet or escrow until:

- `N2-G1` through `N2-G4` are green
- review and architecture lanes publish explicit PASS evidence
- canonical `master` contains the merged N2 tranche
