# Agrodomain Enterprise Master Plan Revision

- Date: `2026-04-20`
- Authoring lane: `architect-only`
- Baseline reviewed: `worktrees/agrodomain-n5-web-cd254ff7`
- Reference baseline commit: `cd254ff7c2658cdf2d7ced07d8bcc2bb3dfea729`
- Publish location: `execution/reviews`

## Executive Verdict

Agrodomain is not yet a complete enterprise-grade end-to-end product. It is a mixed-state baseline containing:

- real production-shaped assets in `apps/web`, `apps/api`, `packages/contracts`, and Alembic migrations
- route-level and domain-level progress across identity, marketplace, negotiation, advisory, climate, finance, and traceability
- hard release blockers in source-of-truth buildability, admin/ops control plane, worker/config ownership seams, and several route surfaces still using placeholders or fixture-driven copy

The immediate implication is architectural, not cosmetic: do not run direct feature-hotfix loops on top of the current baseline. Repair the source-of-truth control plane first, then promote in wave order that preserves integration seams.

## Evidence Base

Primary evidence used for this revision:

- Planning corpus:
  - [v2-planning/AGRO-V2-PROJECT-PLAN.md](../../v2-planning/AGRO-V2-PROJECT-PLAN.md)
  - [v2-planning/AGRO-V2-SOP15-COMPLIANCE-REPORT.md](../../v2-planning/AGRO-V2-SOP15-COMPLIANCE-REPORT.md)
- Topology and rollout facts:
  - [docs/architecture/2026-04-18-wave0-topology-lock.md](../../docs/architecture/2026-04-18-wave0-topology-lock.md)
  - [execution/reviews/2026-04-14-staging-provisioning-runbook.md](./2026-04-14-staging-provisioning-runbook.md)
- Current implementation artifacts:
  - [apps/api/app/core/application.py](../../apps/api/app/core/application.py)
  - [apps/api/app/api/routes](../../apps/api/app/api/routes)
  - [apps/web/app/app](../../apps/web/app/app)
  - [apps/web/components/app-provider.tsx](../../apps/web/components/app-provider.tsx)
  - [apps/web/lib/api/mock-client.ts](../../apps/web/lib/api/mock-client.ts)
  - [packages/contracts/src/catalog.ts](../../packages/contracts/src/catalog.ts)
  - [packages/contracts/src/index.ts](../../packages/contracts/src/index.ts)
  - [apps/worker/app/main.py](../../apps/worker/app/main.py)
  - [packages/config/src/index.ts](../../packages/config/src/index.ts)
- Prior forensic/review artifacts:
  - [execution/reviews/2026-04-18-wave1-independent-qa-gate-pack.md](./2026-04-18-wave1-independent-qa-gate-pack.md)
  - [execution/reviews/2026-04-19T01-26-37Z-n6-w1-admin-observability-blocker-report.md](./2026-04-19T01-26-37Z-n6-w1-admin-observability-blocker-report.md)
  - [execution/reviews/2026-04-19T02-15-00Z-n6-r1-plan-adversarial-review.md](./2026-04-19T02-15-00Z-n6-r1-plan-adversarial-review.md)
  - [execution/reviews/2026-04-19T02-15-00Z-n6-r1-architecture-adversarial-review.md](./2026-04-19T02-15-00Z-n6-r1-architecture-adversarial-review.md)
- Buildability proof collected during this review:
  - `corepack pnpm --filter @agrodomain/contracts build` fails because `./analytics/index.js` and `./observability/index.js` do not exist in source while [packages/contracts/src/catalog.ts](../../packages/contracts/src/catalog.ts) and [packages/contracts/src/index.ts](../../packages/contracts/src/index.ts) import them.
  - Python import of `app.main` fails because [apps/api/app/core/application.py](../../apps/api/app/core/application.py) imports `app.api.routes.admin`, but no `admin.py` exists under [apps/api/app/api/routes](../../apps/api/app/api/routes).

## 1) Canonical Gap Analysis

### 1.1 By Capability Domain

| Domain | Required enterprise capability | Current implementation state | Gap verdict | Evidence |
| --- | --- | --- | --- | --- |
| Backend | Bootable API with complete route inventory, stable service boundaries, admin/ops endpoints, worker delegation | Domain APIs exist for identity, marketplace, advisory, climate, traceability, workflow command bus. API source does not boot from clean import because `admin` route is missing. No admin observability or rollout-control surface is present. | `CRITICAL` | [apps/api/app/core/application.py](../../apps/api/app/core/application.py), [apps/api/app/api/routes](../../apps/api/app/api/routes), [execution/reviews/2026-04-19T02-15-00Z-n6-r1-architecture-adversarial-review.md](./2026-04-19T02-15-00Z-n6-r1-architecture-adversarial-review.md) |
| Frontend | Role-safe, live-data, route-complete product shell with no placeholder business pages | Core auth shell, listings, negotiations, advisory, climate, finance, traceability, consent, profile, offline queue exist. Admin analytics and cooperative dispatch are placeholders. Notifications and wallet are fixture-driven. Role home uses local protected-action evaluation rather than server-authoritative policy read. | `HIGH` | [apps/web/app/app/admin/analytics/page.tsx](../../apps/web/app/app/admin/analytics/page.tsx), [apps/web/app/app/cooperative/dispatch/page.tsx](../../apps/web/app/app/cooperative/dispatch/page.tsx), [apps/web/app/app/notifications/page.tsx](../../apps/web/app/app/notifications/page.tsx), [apps/web/app/app/payments/wallet/page.tsx](../../apps/web/app/app/payments/wallet/page.tsx), [apps/web/components/role-home.tsx](../../apps/web/components/role-home.tsx) |
| Data | Canonical Postgres schema, projections, audit/outbox, replayable migrations, durable analytics marts | Alembic chain exists through finance and traceability runtime. Operator/admin marts, SLO tables, rollout-state persistence, and durable telemetry projections are absent. | `HIGH` | [apps/api/app/db/migrations/versions](../../apps/api/app/db/migrations/versions), [execution/reviews/2026-04-19T02-15-00Z-n6-r1-plan-adversarial-review.md](./2026-04-19T02-15-00Z-n6-r1-plan-adversarial-review.md) |
| Contracts | Complete, buildable transport source of truth across business and control-plane domains | Business-domain contracts are substantial. Source build fails because analytics/observability modules are referenced but missing. Dist artifacts exist but cannot be trusted as source truth. | `CRITICAL` | [packages/contracts/src/catalog.ts](../../packages/contracts/src/catalog.ts), [packages/contracts/src/index.ts](../../packages/contracts/src/index.ts), [packages/contracts/src/analytics](../../packages/contracts/src/analytics), [packages/contracts/src/observability](../../packages/contracts/src/observability) |
| Integrations | Country-pack ready adapters for payments, finance partners, insurance, messaging, telemetry ingestion | Domain contracts and runtime seams exist for finance, insurance, notifications, channels. Worker/config ownership needed for async integrations is still scaffold-only. | `HIGH` | [apps/worker/app/main.py](../../apps/worker/app/main.py), [packages/config/src/index.ts](../../packages/config/src/index.ts), [docs/architecture/2026-04-18-wave0-topology-lock.md](../../docs/architecture/2026-04-18-wave0-topology-lock.md) |
| Deploy | Reproducible staging/prod promotion with parity, rollback, release-readiness evidence | Staging deploy facts exist, but provisioning history shows token/env instability. No production-parity promotion system is locked for the new monorepo topology. | `HIGH` | [execution/reviews/2026-04-14-staging-provisioning-runbook.md](./2026-04-14-staging-provisioning-runbook.md), [docs/architecture/2026-04-18-wave0-topology-lock.md](../../docs/architecture/2026-04-18-wave0-topology-lock.md) |
| UX | Enterprise-grade route completeness, clear loading/degraded/error states, accessibility, mobile behavior, operator UX | Many working route surfaces are strong for N1-N5 scope. Remaining gaps are not isolated polish; they are missing operator/admin, cooperative operations, wallet detail, and systemwide stale/degraded ops views. | `HIGH` | [apps/web/app/app](../../apps/web/app/app), [execution/reviews/2026-04-19T01-26-37Z-n6-w1-admin-observability-blocker-report.md](./2026-04-19T01-26-37Z-n6-w1-admin-observability-blocker-report.md) |
| Copy | Production copy deck, country-pack copy control, compliance-safe language, no planning-copy leakage | Existing copy is thoughtful but still carries tranche labels (`W-003`, `Wave 1 web lane`, `N4`, `N5`) and implementation-era language in user-facing routes. | `MEDIUM` | [apps/web/app/page.tsx](../../apps/web/app/page.tsx), [apps/web/app/app/offline/outbox/page.tsx](../../apps/web/app/app/offline/outbox/page.tsx), [apps/web/features/advisory/conversation-workspace.tsx](../../apps/web/features/advisory/conversation-workspace.tsx) |
| Security | Server-authoritative authz, admin RBAC, audit completeness, release controls, kill switches | Consent, audit, idempotency, and command routing are real strengths. Admin/operator authz surfaces, rollout authorization, telemetry integrity, and release kill switches are not yet implemented. | `CRITICAL` | [apps/api/app/api/routes/commands.py](../../apps/api/app/api/routes/commands.py), [apps/api/app/api/routes/audit.py](../../apps/api/app/api/routes/audit.py), [execution/reviews/2026-04-19T02-15-00Z-n6-r1-architecture-adversarial-review.md](./2026-04-19T02-15-00Z-n6-r1-architecture-adversarial-review.md) |
| Ops | Observability, SLOs, alerting, rollback drills, admin control plane, incident-ready runbooks | Health endpoints exist. Durable telemetry, SLO evaluation, rollout freeze, release readiness status, and rollback drills are absent. | `CRITICAL` | [apps/api/app/api/routes/system.py](../../apps/api/app/api/routes/system.py), [apps/api/app/core/telemetry.py](../../apps/api/app/core/telemetry.py), [execution/reviews/2026-04-19T02-15-00Z-n6-r1-architecture-adversarial-review.md](./2026-04-19T02-15-00Z-n6-r1-architecture-adversarial-review.md) |

### 1.2 Architectural Truths That Must Govern The Replan

1. `packages/contracts` is the current first blocker. If source contracts do not build, every downstream API/web claim is probabilistic.
2. `apps/api` is the second blocker. A missing `admin` module proves the baseline is not cleanly bootable from source.
3. `apps/web` is not a placeholder-only shell anymore, but it still mixes live runtime calls, fixture-backed screens, and implementation-copy. Treat it as partially productionized, not as release-ready.
4. `apps/worker` and `packages/config` are still ownership shells. Do not keep assigning async orchestration, rollout policy, or country-pack behavior to them until those seams exist for real.
5. No ops/admin tranche should be reopened as isolated UI work. The control plane must land contract-first, API-next, worker/config-next, then web.

## 2) Mapping Table: Implemented vs Partial vs Missing

| Area | Status | Why | Evidence |
| --- | --- | --- | --- |
| Root topology split (`apps/web`, `apps/api`, `apps/worker`, `packages/contracts`, `packages/config`) | `Implemented` | Monorepo structure exists and matches topology lock | [docs/architecture/2026-04-18-wave0-topology-lock.md](../../docs/architecture/2026-04-18-wave0-topology-lock.md) |
| Identity sign-in and consent APIs | `Implemented` | API routes exist and web flows consume them | [apps/api/app/api/routes/identity.py](../../apps/api/app/api/routes/identity.py), [apps/web/app/signin/page.tsx](../../apps/web/app/signin/page.tsx), [apps/web/app/onboarding/consent/page.tsx](../../apps/web/app/onboarding/consent/page.tsx) |
| Marketplace listings read/write | `Implemented` | API routes and web listing workspace exist | [apps/api/app/api/routes/marketplace.py](../../apps/api/app/api/routes/marketplace.py), [apps/web/features/listings/listing-slice.tsx](../../apps/web/features/listings/listing-slice.tsx) |
| Negotiation threads and confirmations | `Implemented` | Web inbox and API route coverage are present | [apps/web/features/negotiation/negotiation-inbox.tsx](../../apps/web/features/negotiation/negotiation-inbox.tsx), [apps/api/app/api/routes/marketplace.py](../../apps/api/app/api/routes/marketplace.py) |
| Advisory runtime read surfaces | `Implemented` | Advisory route and workspace exist with contract-backed shapes | [apps/api/app/api/routes/advisory.py](../../apps/api/app/api/routes/advisory.py), [apps/web/features/advisory/conversation-workspace.tsx](../../apps/web/features/advisory/conversation-workspace.tsx) |
| Climate alert and MRV read surfaces | `Implemented` | Climate APIs and dashboard are present | [apps/api/app/api/routes/climate.py](../../apps/api/app/api/routes/climate.py), [apps/web/features/climate/climate-dashboard.tsx](../../apps/web/features/climate/climate-dashboard.tsx) |
| Finance review console | `Partial` | Web surface exists, but broader partner/insurance orchestration remains local-state-light and lacks operator-plane integration | [apps/web/features/finance/finance-review-console.tsx](../../apps/web/features/finance/finance-review-console.tsx), [apps/api/app/db/models/finance.py](../../apps/api/app/db/models/finance.py) |
| Traceability consignment timeline | `Implemented` | API route and workspace exist | [apps/api/app/api/routes/traceability.py](../../apps/api/app/api/routes/traceability.py), [apps/web/features/traceability/traceability-workspace.tsx](../../apps/web/features/traceability/traceability-workspace.tsx) |
| Offline queue UX | `Partial` | Queue and conflict surfaces exist, but replay logic is still client-simulated rather than worker-backed | [apps/web/app/app/offline/outbox/page.tsx](../../apps/web/app/app/offline/outbox/page.tsx), [apps/web/components/app-provider.tsx](../../apps/web/components/app-provider.tsx) |
| Role-aware shell | `Partial` | Navigation and role home exist, but protected-action status is locally evaluated and not server-authoritative | [apps/web/components/role-home.tsx](../../apps/web/components/role-home.tsx), [apps/web/lib/api/mock-client.ts](../../apps/web/lib/api/mock-client.ts) |
| Admin analytics route | `Missing` | Only placeholder route exists | [apps/web/app/app/admin/analytics/page.tsx](../../apps/web/app/app/admin/analytics/page.tsx) |
| Cooperative dispatch route | `Missing` | Only placeholder route exists | [apps/web/app/app/cooperative/dispatch/page.tsx](../../apps/web/app/app/cooperative/dispatch/page.tsx) |
| Notifications center | `Partial` | Fixture-driven page; not runtime-backed | [apps/web/app/app/notifications/page.tsx](../../apps/web/app/app/notifications/page.tsx), [apps/web/lib/fixtures.ts](../../apps/web/lib/fixtures.ts) |
| Wallet and escrow workspace | `Partial` | Fixture-driven page; not contract/API-backed | [apps/web/app/app/payments/wallet/page.tsx](../../apps/web/app/app/payments/wallet/page.tsx), [apps/web/lib/fixtures.ts](../../apps/web/lib/fixtures.ts) |
| Contracts build integrity | `Missing` | Source build fails due missing analytics/observability modules | [packages/contracts/src/catalog.ts](../../packages/contracts/src/catalog.ts), [packages/contracts/src/index.ts](../../packages/contracts/src/index.ts) |
| API app clean boot | `Missing` | `app.main` import fails due missing `admin` route file | [apps/api/app/core/application.py](../../apps/api/app/core/application.py), [apps/api/app/api/routes](../../apps/api/app/api/routes) |
| Worker runtime | `Missing` | Scaffold only | [apps/worker/app/main.py](../../apps/worker/app/main.py), [apps/worker/package.json](../../apps/worker/package.json) |
| Config package | `Missing` | Marker only, no typed env, feature flags, or country packs | [packages/config/src/index.ts](../../packages/config/src/index.ts), [packages/config/package.json](../../packages/config/package.json) |
| Observability control plane | `Missing` | No routes, DTOs, persistence, or web surfaces for admin SLOs and rollout control | [execution/reviews/2026-04-19T02-15-00Z-n6-r1-architecture-adversarial-review.md](./2026-04-19T02-15-00Z-n6-r1-architecture-adversarial-review.md) |

## 3) Route-By-Route Design Packet Requirements

Every route packet must include:

1. route objective and actor matrix
2. data dependencies and source-of-truth contracts
3. authz and country-pack rules
4. loading, empty, degraded, offline, and error-state matrix
5. telemetry events and audit implications
6. copy deck and localization notes
7. desktop/mobile accessibility requirements
8. E2E journey IDs and data-integrity checks
9. rollout flag, backward-compatibility, and kill-switch behavior

### Required packets by route

| Route | Current state | Packet requirement |
| --- | --- | --- |
| `/` | redirect only | Keep simple; packet only needs redirect/auth behavior and environment-aware landing policy |
| `/signin` | live | Packet must define role/country validation, abuse controls, recovery states, and localization |
| `/onboarding/consent` | live | Packet must define consent versioning, revocation semantics, scope copy, and audit expectations |
| `/app/[role]` | partial | Packet must define server-authoritative protected-action posture, role home content source, and stale session handling |
| `/app/market/listings` | live | Packet must define owner vs buyer mode, publish-state semantics, audit proof display, and performance budgets |
| `/app/market/listings/[listingId]` | live | Packet must define buyer-safe projection, owner revision visibility, and deep-link recovery |
| `/app/market/negotiations` | live | Packet must define seller/buyer state machine, confirmation checkpoints, and dispute escalation surfaces |
| `/app/advisory/new` | live | Packet must define prompt, retrieval, citation rendering, HITL states, and refusal copy |
| `/app/advisor/requests` | live | Packet must define advisor triage, reviewer posture, transcript governance, and locale fallback |
| `/app/climate/alerts` | live | Packet must define degraded-mode communication, acknowledgement semantics, and MRV evidence visibility |
| `/app/finance/queue` | partial | Packet must define partner boundary, decision rights, rejection handling, payout triggers, and audit drill-down |
| `/app/traceability/[consignmentId]` | live | Packet must define ordered-event-chain proof, attachment validation, custody continuity, and operator escalation |
| `/app/payments/wallet` | partial | Packet must define real escrow lifecycle, ledger provenance, release rules, and exception handling; fixture copy is not acceptable |
| `/app/notifications` | partial | Packet must define notification source taxonomy, unread/acked state, channel downgrade, and destination routing |
| `/app/profile` | live | Packet must define session identity detail, consent mutation flow, and membership switching |
| `/app/offline/outbox` | partial | Packet must define actual replay source, worker-driven statuses, conflict causality, and handoff policy |
| `/app/offline/conflicts/[id]` | partial | Packet must define recovery playbooks per conflict code and operator override rules |
| `/app/cooperative/dispatch` | missing | Full packet required before coding; must define dispatch board, member batching, proof chain, and operations KPIs |
| `/app/admin/analytics` | missing | Full packet required before coding; must define admin analytics mart, SLOs, alert states, release readiness, rollout controls, and kill switches |

## 4) Revised Execution Plan

### 4.1 Wave Launch Order

Immediate launch order optimized for seamless integration:

1. `R0` Source-of-truth repair and environment parity lock
2. `R1` Contracts and control-plane schema closure
3. `R2` API boot integrity and admin/ops runtime closure
4. `R3` Worker and config seam activation
5. `R4` Web route completion for operator and operations surfaces
6. `R5` Runtime hardening and copy/localization pass
7. `R6` Production-parity QA, reliability, and rollback validation
8. `R7` Staging-to-production promotion program
9. `Rn` Country-pack expansion and post-launch optimization

### 4.2 Bead Plan

#### Wave R0: Source-Of-Truth Repair

| Bead | Objective | Dependencies | Acceptance criteria |
| --- | --- | --- | --- |
| `R0-B01` | Freeze baseline and declare canonical execution root | none | Canonical branch/worktree pinned; all new evidence references one baseline only |
| `R0-B02` | Repair `packages/contracts` source integrity | `R0-B01` | `pnpm --filter @agrodomain/contracts build` and tests pass from source; no dist-only truth leaks |
| `R0-B03` | Repair API boot by reconciling route inventory vs imports | `R0-B01` | `python -c 'import app.main'` passes; route inventory is explicit and complete |
| `R0-B04` | Replace stale build artifacts as evidence sources with source-backed gates only | `R0-B02`, `R0-B03` | No PASS claim relies on pre-existing `dist`, `.next`, or cached wheel artifacts |
| `R0-B05` | Environment parity lock for local, CI, staging | `R0-B04` | Version matrix, env matrix, and seed/bootstrap steps are documented and reproducible |

#### Wave R1: Control-Plane Contract Closure

| Bead | Objective | Dependencies | Acceptance criteria |
| --- | --- | --- | --- |
| `R1-B01` | Add analytics contracts | `R0-B02` | Admin analytics snapshot, provenance, and service-level DTOs exist in source and generated artifacts |
| `R1-B02` | Add observability contracts | `R0-B02` | Telemetry ingestion, telemetry record, SLO evaluation, rollout status, release readiness DTOs exist |
| `R1-B03` | Add country-pack config contracts | `R0-B02` | Typed country-pack, feature-flag, rollout policy, and environment schemas exist |
| `R1-B04` | Add contract evidence tests for control-plane DTOs | `R1-B01`, `R1-B02`, `R1-B03` | Contract tests cover unknown-field rejection, required metadata, and schema versioning |

#### Wave R2: API Runtime Closure

| Bead | Objective | Dependencies | Acceptance criteria |
| --- | --- | --- | --- |
| `R2-B01` | Implement admin analytics API routes | `R1-B01`, `R0-B03` | Admin route set exists with RBAC, country scope, degraded states, and tests |
| `R2-B02` | Implement telemetry ingestion and projection endpoints | `R1-B02`, `R0-B03` | Durable telemetry write/read path exists; duplicate telemetry is idempotent |
| `R2-B03` | Implement rollout-control and release-readiness APIs | `R1-B02`, `R1-B03`, `R0-B03` | Freeze, canary, promote, rollback, and release readiness states are persisted and auditable |
| `R2-B04` | Add admin/operator audit projection | `R2-B01` | Operator-scoped audit read model exists without weakening actor-safe audit routes |
| `R2-B05` | Add API-level no-false-pass gates | `R2-B01`, `R2-B02`, `R2-B03` | Tests prove stale, degraded, duplicate, unauthorized, and rollback-trigger cases |

#### Wave R3: Worker And Config Activation

| Bead | Objective | Dependencies | Acceptance criteria |
| --- | --- | --- | --- |
| `R3-B01` | Replace worker scaffold with real job runtime | `R2-B02`, `R2-B03` | Worker consumes outbox/events and executes retries, SLO evaluation, notifications, and reconciliation |
| `R3-B02` | Replace config scaffold with typed env and country packs | `R1-B03` | Web/API/worker all consume one typed config surface |
| `R3-B03` | Wire offline replay and reconciliation through worker | `R3-B01`, `R2-B03` | Queue states come from durable backend/worker lifecycle, not client-only ack simulation |
| `R3-B04` | Add operator notifications and incident hooks | `R3-B01`, `R2-B02` | Rollout and reliability incidents emit durable notifications with audit links |

#### Wave R4: Web Route Completion

| Bead | Objective | Dependencies | Acceptance criteria |
| --- | --- | --- | --- |
| `R4-B01` | Replace admin analytics placeholder with live control plane | `R2-B01`, `R2-B03`, `R3-B02` | Admin route is contract-backed, degraded-aware, mobile-safe, and E2E-covered |
| `R4-B02` | Replace cooperative dispatch placeholder with live operations board | `R2-B01`, `R3-B02` | Cooperative route has dispatch data, member queues, and proof drill-down |
| `R4-B03` | Replace wallet fixture page with real ledger/escrow workspace | `R2-B03`, existing finance/traceability domains | Wallet page reads real payout and escrow state with exception handling |
| `R4-B04` | Replace notifications fixture page with live notification center | `R3-B04` | Notifications are sourced from runtime, not fixtures |
| `R4-B05` | Move role home protected-action status to server-authoritative read | `R2-B01`, `R2-B04` | Home posture reflects backend policy, not local helper evaluation |

#### Wave R5: UX, Copy, Accessibility, Localization Hardening

| Bead | Objective | Dependencies | Acceptance criteria |
| --- | --- | --- | --- |
| `R5-B01` | Remove wave/tranche implementation copy from user-facing routes | `R4-B01` through `R4-B05` | No user-facing references to `Wave`, `N4`, `N5`, `W-003`, or planning labels remain |
| `R5-B02` | Accessibility and readability pass | all live routes | Keyboard, focus, contrast, screen-reader, and 320px checks pass |
| `R5-B03` | Country-pack copy and localization pass | `R3-B02`, all live routes | Copy keys and locale variants are externally managed and versioned |
| `R5-B04` | Performance and degraded-state UX pass | all live routes | Route budgets, fallback states, and stale-data labeling are explicit |

#### Wave R6: Parity, Reliability, And Release Proof

| Bead | Objective | Dependencies | Acceptance criteria |
| --- | --- | --- | --- |
| `R6-B01` | End-to-end parity suite for web/api/worker | `R5-B04` | Critical journeys pass against the same deploy topology used for staging/prod promotion |
| `R6-B02` | Rollback drill and kill-switch proof | `R2-B03`, `R3-B01` | Simulated regression triggers freeze/rollback with audit trail |
| `R6-B03` | SLO and degraded-state proof pack | `R2-B02`, `R3-B01` | Alerting, stale telemetry, and recovery proofs exist |
| `R6-B04` | Release-readiness dossier | `R6-B01`, `R6-B02`, `R6-B03` | Single authoritative go/no-go package exists under `execution/reviews` |

#### Wave R7: Promotion Program

| Bead | Objective | Dependencies | Acceptance criteria |
| --- | --- | --- | --- |
| `R7-B01` | Staging rebuilt for full parity | `R6-B04` | Staging uses same topology, migrations, worker/runtime, and flags as production minus external scale |
| `R7-B02` | Canary promotion | `R7-B01` | Limited country/actor subset promoted with live rollback watch |
| `R7-B03` | Production promotion | `R7-B02` | Promotion occurs only after canary proof, zero critical defects, and signoff |

### 4.3 Dependency Rules That Prevent Hotfix Loops

1. No web/admin work before control-plane contracts and API runtime exist.
2. No worker/offline replay claims before config and rollout policy are typed and shared.
3. No copy pass before route completeness is real; otherwise copy churn creates false progress.
4. No production promotion before rollback drill evidence exists on the same topology.
5. No tranche closes on branch-local or cache-derived proof.

## 5) Updated Governance Model

### 5.1 Hard Gates

| Gate | Blocking question | Required signoff |
| --- | --- | --- |
| `G0` Baseline Integrity | Does source build cleanly from canonical root with no missing modules/imports? | Architect + Builder |
| `G1` Contract Integrity | Are all transport contracts source-backed, generated, versioned, and tested? | Architect + Review-Plan |
| `G2` Runtime Integrity | Does API boot cleanly and expose all required route inventory for the wave? | Architect + Review-Arch |
| `G3` Ownership Integrity | Are worker/config/web/api boundaries respected by code, not docs only? | Architect + Review-Arch |
| `G4` Route Completion | Does each launched route have a full design packet and no placeholder/fixture leakage? | Frontend + QA |
| `G5` Reliability And Rollback | Are SLOs, alerts, rollback triggers, and drills evidenced? | QA + Ops reviewer + Architect |
| `G6` Promotion Readiness | Does staging match production topology and canary proof? | Architect + QA + Approval owner |

### 5.2 Signoff Roles

- `Architect`: topology, route packet integrity, dependency ordering, production-parity acceptance
- `Builder/API owner`: source build integrity, runtime wiring, migrations, command/audit/outbox correctness
- `Frontend owner`: route completeness, UX packet compliance, copy/accessibility readiness
- `QA owner`: journey proof, negative-path proof, responsive proof, regression evidence
- `Arch reviewer`: adversarial validation of boundaries, scale, and security
- `Plan reviewer`: adversarial validation of wave sequencing, acceptance criteria, and no-false-pass logic
- `Approval owner`: explicit approval at pre-launch and pre-production promotion only

### 5.3 Kill-Switch Criteria

Trigger immediate freeze or rollback if any of the following occurs:

1. source build no longer passes from canonical root
2. control-plane contracts and runtime diverge by schema version or missing field
3. admin analytics or rollout-control routes return placeholder, fixture, or stale synthetic data without explicit degraded labeling
4. duplicate command or telemetry submissions produce multiple side effects
5. consent, wallet, escrow, finance, or rollout controls can be mutated without audit emission
6. staging and production diverge in topology, env loading, migration set, or worker behavior
7. canary SLO breaches exceed threshold and auto-freeze does not occur

### 5.4 No False PASS Conditions

These conditions are invalid and cannot produce PASS:

- screenshot-only proof without runtime/API evidence
- green tests against cached `dist`, `.next`, or generated artifacts when source build is red
- route marked complete while rendering `PlaceholderPage`
- route marked live while driven only by fixtures for core business state
- QA proof from a different branch/worktree than the canonical baseline
- build pass from manual local patching not committed to source
- promotion readiness claimed without rollback drill proof

## 6) Rollout Strategy For Production Parity And Promotion

### 6.1 Environment Model

- `local`: developer reproducibility, seed/reset, smoke only
- `ci`: source-of-truth build, migration replay, contract generation, route packet checks
- `staging`: full topology parity with production services and feature flags, reduced volume only
- `canary`: production topology with country-pack and actor subset restriction
- `production`: general release

### 6.2 Promotion Rules

1. Local to CI:
   - only source-backed builds and tests count
2. CI to staging:
   - requires `G0` through `G4`
3. Staging to canary:
   - requires `G5`, route packet completion for launched surfaces, and rollback proof
4. Canary to production:
   - requires `G6`, zero unresolved critical defects, and explicit approval gate

### 6.3 Production Parity Rules

- Same route inventory
- Same contract version set
- Same migration head
- Same worker job classes
- Same config schema and country-pack loader
- Same alerting and rollout-control paths
- Same release-readiness checks

No environment may silently stub or skip these without explicit degraded labeling and gate exception.

## 7) Immediate Wave R0-Rn Launch Recommendation

Recommended launch now:

1. `R0`
   - repair source truth first
   - no feature coding in parallel
2. `R1`
   - close contracts for analytics, observability, rollout, release readiness, country packs
3. `R2`
   - make API boot and control plane real
4. `R3`
   - activate worker/config to stop client-simulated ops behavior
5. `R4`
   - complete admin/cooperative/wallet/notifications routes
6. `R5`
   - UX/copy/accessibility/localization cleanup only after route truth exists
7. `R6`
   - reliability, rollback, parity, and release dossier
8. `R7`
   - staging, canary, production promotion
9. `Rn`
   - country-pack expansion, partner breadth, and optimization loops

## 8) Final Program Call

The correct architectural move is not "finish N6." The correct move is:

- re-establish one clean, buildable, source-backed baseline
- close the missing control plane as a first-class product surface
- activate worker/config ownership before resuming higher-order UX promises
- launch remaining routes only when each has a real design packet and contract-backed data source

That sequence minimizes rework, prevents disruptive hotfix loops, and creates a path where every later wave composes cleanly into the enterprise product instead of fighting the baseline.
