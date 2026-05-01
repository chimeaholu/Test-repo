# Agrodomain N3 Tranche Packet

Date: `2026-04-18`
Canonical repo: `/mnt/vault/MWH/Projects/Agrodomain`
Predecessor gates: `N2-G1` to `N2-G4` green on canonical `master` at `8a28709d6f793202968f59b653e324f2c4f2cfde`
Predecessor evidence root: `execution/reviews/2026-04-18T17-45-14Z-n2-final-qa-gate-pack`
Authoritative sources:
- `output_to_user/AGRODOMAIN-SOP15-PRODUCTION-BUILD-PLAN.md`
- `execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md`
- `v2-planning/AGRO-V2-BEAD-BACKLOG.md`
- `v2-planning/AGRO-V2-TEST-PLAN.md`
- `v2-planning/AGRO-V2-PRD.md`

## 1. Tranche Decision

The next tranche after the completed `N2` marketplace and negotiation closeout is `N3`, the wallet/escrow/settlement execution slice for the first money-movement path.

`N2` closed the buyer-safe marketplace read-model and the cross-role negotiation thread. It did not yet deliver:

- immutable wallet ledger entries
- escrow lifecycle orchestration tied to completed negotiations
- settlement release and reversal pathways
- participant settlement notifications and channel fallback
- `CJ-004`, `EP-004`, `RJ-004`, and `DI-003` evidence on canonical `master`

`N3` therefore focuses on the first regulated commerce money path and explicitly keeps all finance-adjacent expansion outside scope unless needed to satisfy audit completeness or payout correctness inside the tranche.

## 2. N3 Scope

### In scope

- wallet command and read-model contracts required for funding, holding, releasing, reversing, and reconciling escrow-bound funds
- immutable wallet ledger entries with append-only discipline
- escrow orchestration state machine bound to completed negotiation threads
- settlement release, reversal, dispute-open, and timeout/pending states
- participant settlement timeline UI and delivery/fallback notifications
- audit and outbox completeness for every regulated mutation in the tranche
- API and Playwright coverage for `CJ-004`, `EP-004`, `RJ-004`, and `DI-003`

### Out of scope

- external payment processor production integrations or real-money transfer
- credit, insurance, lending, underwriting, or partner routing logic
- advisory, traceability, climate, or admin feature expansion
- cross-country payment policy branching beyond metadata needed by the existing country envelope
- worker-owned async retry daemons beyond deterministic pending/retry seams required by `EP-004`
- channel expansion beyond PWA + notification fallback already scoped by `B-013`

## 3. Bead Set

### `N3-C1` Wallet, escrow, and settlement contracts

- Maps to: `B-011`, `B-012`, `B-013`
- Objective: extend the canonical contracts package for wallet ledger, escrow lifecycle, settlement release/reversal, and settlement notifications.
- Route owner: `@builder`
- Dependencies: `N2-G1` to `N2-G4`
- Inputs: `packages/contracts`, `v2-planning/AGRO-V2-TEST-PLAN.md`, `v2-planning/AGRO-V2-BEAD-BACKLOG.md`, `v2-planning/AGRO-V2-PRD.md`
- Implementation tasks:
  - add wallet funding, hold, release, reverse, and reconciliation DTOs
  - add escrow lifecycle DTOs with explicit states: `initiated`, `pending_funds`, `funded`, `released`, `reversed`, `disputed`, `partner_pending`
  - add settlement timeline and notification payload DTOs
  - generate schema and manifest outputs
- Test obligations:
  - Unit: schema validation for wallet and escrow commands
  - Integration: generated artifact parity
  - E2E reference: `CJ-004`
  - Error reference: `EP-004`
  - Data reference: `DI-003`
- Observability obligations: metadata must preserve `schema_version`, `request_id`, `idempotency_key`, `actor_id`, `country_code`, `channel`, `correlation_id`
- Security obligations: settlement mutations require actor-role and aggregate-scope metadata
- Exit criteria:
  - generated artifacts committed
  - no duplicate wallet or escrow DTO definitions outside `packages/contracts`

### `N3-A1` Wallet ledger service

- Maps to: `B-011`
- Objective: implement the immutable wallet ledger and balance projection boundary.
- Route owner: `@builder`
- Dependencies: `N3-C1`
- Inputs: existing workflow command bus, audit/outbox seams, and migration lineage
- Implementation tasks:
  - add migration-backed ledger tables and indexes
  - implement append-only debit/credit entry rules with reversible compensating entries instead of updates
  - expose wallet balance projection and transaction history queries
  - bind ledger entry creation to escrow-funding/release orchestration inputs
- Test obligations:
  - Unit: ledger invariants and compensating-entry rules
  - Integration: replay-safe duplicate funding requests stay single-effect
  - E2E reference: `CJ-004`
  - Data reference: `DI-003`
- Observability obligations: balance version, entry sequence, and reconciliation markers
- Security obligations: no mutable balance source of truth outside derived projection
- Exit criteria:
  - immutable ledger entries drive every escrow money state transition
  - duplicate mutation replay does not duplicate effective debit or credit impact

### `N3-A2` Escrow orchestration and settlement runtime

- Maps to: `B-012`
- Objective: implement the first regulated escrow path on top of accepted negotiation threads and the new ledger.
- Route owner: `@builder`
- Dependencies: `N3-C1`, `N3-A1`, `N2-A2`
- Inputs: `AGRO-V2-TEST-PLAN.md`, accepted negotiation runtime, audit/outbox seams
- Implementation tasks:
  - add escrow persistence tables and migration
  - implement command handlers for escrow initiate, fund, mark-partner-pending, release, reverse, and dispute-open
  - enforce explicit state transitions and terminal-state guards
  - expose read surfaces for wallet and escrow timeline queries
  - preserve `pending` and retry-safe semantics for partner timeout scenarios without simulating unsafe automatic release
  - record audit and outbox events on every regulated transition
- Test obligations:
  - Unit: escrow state machine and timeout handling
  - Integration: idempotent retry on partner timeout and unauthorized release rejection
  - E2E reference: `CJ-004`
  - Error reference: `EP-004`
  - Data reference: `DI-003`
- Observability obligations: counters for initiated, funded, released, reversed, disputed, partner-pending
- Security obligations: release and reversal actions require authorized actor and prior escrow state proof
- Exit criteria:
  - accepted negotiation can enter funded escrow and later release or reverse through explicit commands
  - payment timeout produces `partner_pending` or equivalent pending state plus retry-safe audit evidence
  - final release and reversal remain single-effect under repeated submit

### `N3-W1` Wallet and escrow timeline UX

- Maps to: `B-013` UI portion plus `RJ-004`
- Objective: replace placeholder wallet/escrow surfaces with contract-backed settlement timeline and action states.
- Route owner: `@frontend`
- Dependencies: `N3-C1`, `N3-A1`, `N3-A2`
- Build gate: no interactive release/reversal actions until `N3-A2` read/mutation endpoints exist
- Implementation tasks:
  - replace fixture-only wallet page with live wallet and escrow timeline data
  - show funding, partner-pending, funded, released, reversed, and disputed states with audit-friendly chips and explanatory copy
  - surface deterministic retry, pending, and outbox/conflict guidance for timeout conditions
  - preserve mobile clarity and accessibility for `RJ-004`
- Test obligations:
  - Unit: view-model mapping and state rendering
  - Integration: generated contract client usage only
  - E2E reference: `CJ-004`
  - Error reference: `EP-004`
  - Responsive reference: `RJ-004`
  - Data reference: `DI-003`
- Observability obligations: settlement action latency and timeout/pending telemetry hooks
- Security obligations: no direct server model imports; generated client only
- Exit criteria:
  - desktop and mobile users can read a live wallet/escrow timeline
  - timeout and pending states are explicit, recoverable, and non-generic

### `N3-W2` Settlement notification and fallback flow

- Maps to: `B-013`
- Objective: deliver settlement notifications tied to escrow transitions with deterministic fallback behavior.
- Route owner: `@frontend`
- Dependencies: `N3-C1`, `N3-A2`, existing channel notification seams
- Implementation tasks:
  - wire settlement timeline updates to notification payloads
  - show notification delivery status and fallback status in the UI
  - preserve offline/outbox linkage for delayed confirmation and retry
  - keep fallback semantics scoped to settlement updates only
- Test obligations:
  - Unit: fallback trigger conditions and delivery-status reducer
  - Integration: contract-backed notification payload usage
  - E2E reference: `CJ-004`
  - Error reference: `EP-004`
  - Responsive reference: `RJ-004`
  - Data reference: `DI-003`
- Observability obligations: notification dispatch result, fallback trigger count, pending timeout age
- Security obligations: settlement notifications must not leak actor-private financial metadata beyond scoped message contracts
- Exit criteria:
  - settlement state changes produce visible participant update state
  - partner timeout path yields pending notification plus fallback evidence instead of silent failure

### `N3-Q1` Wallet/escrow gate pack

- Objective: define and run the blocking QA evidence for the tranche.
- Route owner: `@qa-engineer`
- Dependencies: `N3-A2`, `N3-W1`, `N3-W2`
- Implementation tasks:
  - add focused API integration coverage for wallet ledger immutability, escrow transitions, timeout retry safety, and audit completeness
  - add Playwright wallet/escrow/settlement journey coverage for desktop and mobile
  - publish the N3 gate evidence pack under `execution/reviews`
- Test obligations:
  - E2E: `CJ-004`, `RJ-004`
  - Error: `EP-004`
  - Data: `DI-003`
  - Negative paths:
    - duplicate fund request
    - duplicate release request
    - unauthorized release or reversal attempt
    - timeout transition without pending marker
    - ledger mutation by update instead of compensating entry
    - settlement notification fallback not emitted on timeout path
  - Regression paths:
    - no regression of `V-001`, `N1`, or `N2` listing/negotiation/idempotency/audit behavior
    - desktop and mobile evidence for real `RJ-004` wallet/escrow timeline flow
- Observability obligations: artifact paths written under `execution/reviews` and `execution/heartbeats`
- Security obligations: rejected unauthorized releases and reversals must be evidenced
- Exit criteria:
  - gate pack exists with pass/fail table and artifact links

## 4. Lane Allocation and Merge Order

- Contracts lane: `N3-C1`
- API lane 1: `N3-A1`
- API lane 2: `N3-A2`
- Web lane 1: `N3-W1`
- Web lane 2: `N3-W2`
- QA lane: `N3-Q1`
- Review lane: adversarial code review against merged N3 diffs
- Architecture lane: boundary, sequencing, and regulated-mutation review before tranche close

Mandatory merge order:

1. `N3-C1`
2. `N3-A1`
3. `N3-A2`
4. `N3-W1`
5. `N3-W2`
6. `N3-Q1`

Execution and gating rules:

- `N3-A1` may not invent a mutable wallet balance source of truth outside the append-only ledger projection.
- `N3-A2` must reuse the existing command bus, audit, and outbox seams rather than adding a parallel regulated-mutation path.
- `N3-W1` may move only after `N3-A2` publishes wallet and escrow reads with committed contracts.
- `N3-W2` may not simulate fallback success without a real pending/failure state from the backend path.
- `N3-Q1` runs only after `N3-W2` is merged and must include negative-path and regression evidence.
- Review lanes do not block initial coding, but they do block tranche close.

## 5. Acceptance Gates

### `N3-G1` Contract lock

Pass when:

- wallet, escrow, settlement, and notification contracts are committed under `packages/contracts`
- generated schema outputs are committed
- every regulated mutation includes `request_id`, `idempotency_key`, `actor_id`, `country_code`, `channel`, and `schema_version`

### `N3-G2` Ledger integrity gate

Pass when:

- `B-011` ledger entries are append-only
- balance is projection-derived rather than mutation-authored
- duplicate fund or release requests are single-effect and auditable
- compensating entries are used for reversal semantics instead of mutation-in-place

### `N3-G3` Escrow workflow gate

Pass when:

- `CJ-004` is green
- accepted negotiation can move through escrow initiation, funding, and release or reversal with explicit state transitions
- repeated release or reversal submits remain single-effect
- unauthorized release and reversal attempts are rejected and audited

### `N3-G4` Timeout and fallback gate

Pass when:

- `EP-004` is green
- payment partner timeout yields deterministic pending status plus retry-safe replay behavior
- settlement notification and fallback evidence exists for timeout or delayed partner states
- no silent timeout or optimistic final-state leak remains

### `N3-G5` Data integrity and audit completeness gate

Pass when:

- `DI-003` is green
- ledger entries, escrow state, audit events, and outbox records match for each regulated mutation
- audit completeness evidence proves every regulated wallet/escrow mutation emits traceable audit and outbox records
- no open `S1` or higher defects remain

## 6. Launch Worktree Policy

Use isolated execution copies or existing worker copies because the shared git object store has been unstable for new worktrees. Generated-artifact cleanup is allowed; destructive source resets are not.

Suggested worker copies:

- API/contracts worker copy: `/ductor/agents/engineering/workspace/worktrees/agrodomain-n3-api-copy`
- Web worker copy: `/ductor/agents/engineering/workspace/worktrees/agrodomain-n3-web-copy`
- QA worker copy: `/ductor/agents/engineering/workspace/worktrees/agrodomain-n3-qa-copy`

## 7. Close Rule

Do not advance to post-N3 finance/advisory/traceability scope until:

1. `N3-G1` to `N3-G5` are all green.
2. Adversarial code review and architecture review have published explicit tranche-close verdicts.
3. The tranche close packet cites artifact roots for contracts, API, web, Playwright, and audit-completeness evidence.
