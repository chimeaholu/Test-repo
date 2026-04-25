# Agrodomain Production Rebuild

## Wave 0 Architecture Packet

Date: `2026-04-18`
Authoritative source: `/ductor/agents/engineering/workspace/output_to_user/AGRODOMAIN-SOP15-PRODUCTION-BUILD-PLAN.md`
Scope: Wave 0 architect packet for production rebuild in `/mnt/vault/MWH/Projects/Agrodomain`

## 1. Decision and Wave 0 Finish Line

Agrodomain is not a production app yet. It is a planning-rich staging harness with strong contract and test artifacts under `src/agro_v2`, `tests/`, `execution/contracts/`, and `v2-planning/`, but the active runtime is still a single FastAPI HTML app backed by file state in `src/agro_v2/staging_runtime.py`.

Wave 0 therefore does not extend the harness. Wave 0 establishes the production architecture packet and the execution shape for the rebuild:

- preserve existing contracts, tests, planning docs, and review artifacts as source material
- freeze the current Python/Playwright harness as `legacy`
- rebuild as a production monorepo with `apps/web`, `apps/api`, `apps/worker`, and `packages/contracts`
- centralize contract truth before re-implementing feature logic
- deliver one executable vertical slice as the Wave 0 exit target: authenticated shell plus create-listing end to end with idempotency and audit

Wave 0 is complete only when all of the following are true:

- repo topology is locked
- domain boundaries are locked
- contract extraction map is locked
- schema and migration plan is locked
- Wave 1 lanes have tranche-ready beads with acceptance criteria
- implementation teams can start from copy-paste commands without architectural ambiguity

## 2. Current-State Extraction Summary

Current codebase signals:

- runtime entry is a staging FastAPI application in `src/agro_v2/staging_runtime.py`
- domain prototypes already exist for listings, negotiation, ledger, escrow, identity, advisory, notifications, traceability, climate, and intelligence workflows
- many contract-like artifacts already exist in `execution/contracts/*.json`
- tests already encode important journey expectations:
  - `CJ-*`, `EP-*`, `RJ-*`, `DI-*`, `AIJ-*`, `IDI-*` in `v2-planning/AGRO-V2-TEST-PLAN.md`
  - harness journey coverage in `tests/e2e/critical-journeys.spec.ts`

Implication:

- the highest-value assets are contracts, invariants, and test obligations
- the lowest-value asset is the current deployment shape
- rebuild must port behavior by contract and boundary, not by file copy

## 3. Production Repo Topology

### 3.1 Locked target topology

```text
Agrodomain/
  apps/
    web/
      app/
        (public)/
        (auth)/
        (farmer)/
        (buyer)/
        (cooperative)/
        (advisor)/
        (finance)/
        (admin)/
        api/
      components/
      features/
        identity/
        shell/
        listings/
        negotiation/
        wallet/
        advisory/
        climate/
        traceability/
        notifications/
      lib/
        api/
        auth/
        offline/
        telemetry/
        contracts/
      public/
      package.json
      tsconfig.json
      next.config.ts
    api/
      app/
        main.py
        api/
          routes/
          dependencies/
        core/
          config.py
          auth.py
          db.py
          logging.py
          telemetry.py
        modules/
          country_policy/
          identity/
          workflow/
          audit/
          policy/
          channels/
          marketplace/
          negotiation/
          ledger/
          escrow/
          advisory/
          intelligence/
          climate/
          finance/
          traceability/
          notifications/
          analytics/
        db/
          base.py
          models/
          repositories/
          migrations/
            versions/
        services/
          commands/
          idempotency.py
          outbox.py
          event_bus.py
      tests/
        unit/
        integration/
        contract/
      pyproject.toml
      alembic.ini
    worker/
      app/
        jobs/
        consumers/
        dispatchers/
        main.py
      pyproject.toml
  packages/
    contracts/
      src/
        envelope/
        errors/
        identity/
        workflow/
        channels/
        marketplace/
        negotiation/
        ledger/
        escrow/
        advisory/
        intelligence/
        climate/
        finance/
        traceability/
        notifications/
        analytics/
        observability/
      generated/
        json-schema/
        openapi/
      tests/
      package.json
      tsconfig.json
    config/
      src/
        env/
        flags/
        country-packs/
      package.json
  legacy/
    staging-runtime/
      src/agro_v2/
      tests/
      playwright.config.ts
      package.json
      pyproject.toml
  docs/
    architecture/
    runbooks/
    adr/
  infra/
    railway/
    vercel/
    supabase/
    redis/
  execution/
    contracts/
    reviews/
    specs/
  v2-planning/
  package.json
  pnpm-workspace.yaml
  turbo.json
```

### 3.2 Ownership rules

- `apps/web` may import only client-safe types, generated contract clients, and feature-flag config.
- `apps/api` owns all persistence, policy enforcement, idempotency checks, and audit writes.
- `apps/worker` owns async retries, notification fan-out, ingestion, reconciliation, and long-running verifier/eval jobs.
- `packages/contracts` is the transport source of truth for envelopes, DTOs, event payloads, error codes, and schema versioning.
- `packages/config` owns typed environment loading, feature flags, and country-pack config shape.
- `legacy/staging-runtime` is read-only reference material after Wave 0.

## 4. Domain Boundaries and Current-Source Mapping

### 4.1 Boundary map

| Boundary | New home | Owns | Must not own | Current source anchors |
|---|---|---|---|---|
| Identity and Access | `apps/api/app/modules/identity` | actor identity, memberships, consent, sessions, invite acceptance | listings, finance decisions, notification fan-out | `identity_consent.py`, `country_pack.py`, `frontend_consent_ui.py`, `frontend_app_shell.py` |
| Country Policy | `apps/api/app/modules/country_policy` | country packs, locale support, policy text, compliance flags, launch gating | user session logic, domain writes | `country_pack.py`, `multilingual_delivery.py`, `policy_guardrails.py` |
| Workflow and Audit | `apps/api/app/modules/workflow`, `audit` | canonical workflow instances, idempotency, audit events, outbox trigger points | UI, provider adapters | `audit_events.py`, `audit_logger.py`, `state_store.py`, `tool_contracts.py` |
| Channel Adapters | `apps/api/app/modules/channels` and `notifications` | USSD/WhatsApp/PWA translation, session metadata, delivery attempts | direct aggregate mutation | `ussd_adapter.py`, `whatsapp_adapter.py`, `offline_queue.py`, `offline_action_queue.py`, `notification_broker.py`, `settlement_notifications.py` |
| Marketplace | `apps/api/app/modules/marketplace` | listings, listing revisions, publish/close flow | wallet or escrow writes | `listings.py`, `frontend_listing_routes.py`, `frontend_listing_wizard.py` |
| Negotiation | `apps/api/app/modules/negotiation` | offer threads, confirmation checkpoints, thread events | wallet settlement | `negotiation.py`, `frontend_negotiation_ui.py` |
| Wallet and Escrow | `apps/api/app/modules/ledger`, `escrow` | wallet accounts, immutable ledger entries, escrow state machine, settlement orchestration | advisory, channel parsing | `ledger.py`, `escrow.py`, `frontend_escrow_wallet_center.py` |
| Advisory and Intelligence | `apps/api/app/modules/advisory`, `intelligence` | advisory requests/responses, citations, planner/verifier, memory, tool contracts, router decisions | irreversible business commits | `advisory_retrieval.py`, `reviewer_workflow.py`, `planning_loop.py`, `verifier_loop.py`, `memory_service.py`, `memory_selector.py`, `model_router.py`, `agent_eval.py` |
| Climate and MRV | `apps/api/app/modules/climate` | climate ingestion, alert rules, MRV evidence records | finance and identity concerns | `climate_risk_ingestion.py`, `climate_alert_rules.py`, `mrv_evidence_service.py`, `frontend_climate_alert_center.py`, `frontend_evidence_capture_queue.py` |
| Finance and Insurance | `apps/api/app/modules/finance` | partner requests, partner decisions, trigger registry, HITL actions | final autonomous underwriting | `finance_partner_adapter.py`, `insurance_trigger_registry.py`, `finance_hitl_console.py`, `frontend_finance_queue.py` |
| Traceability | `apps/api/app/modules/traceability` | consignments, milestones, evidence attachments, shipment event chain | identity sessions, pricing | `traceability_event_chain.py`, `quality_evidence_attachments.py`, `frontend_traceability_routes.py` |
| Analytics and Observability | `apps/api/app/modules/analytics`, telemetry services | dashboards, projections, SLO events, operational snapshots | transactional source-of-truth writes | `enterprise_analytics_mart.py`, `observability.py`, `frontend_admin_analytics.py` |

### 4.2 Boundary rules that are launch-blocking

- channel adapters are translators only
- all mutating commands require `request_id`, `idempotency_key`, `actor_id`, `country_code`, `channel`, and `schema_version`
- all regulated mutations write audit events and outbox records
- intelligence modules can recommend, classify, and block, but they cannot directly commit wallet, escrow, finance, or consent state
- analytics consumes projections, not direct business writes

## 5. Contract Extraction Plan

### 5.1 Contract source hierarchy

Contract extraction order is fixed:

1. `output_to_user/AGRODOMAIN-SOP15-PRODUCTION-BUILD-PLAN.md`
2. `v2-planning/AGRO-V2-PRD.md`
3. `v2-planning/AGRO-V2-TEST-PLAN.md`
4. `execution/contracts/*.json`
5. current Python prototypes in `src/agro_v2/*.py`
6. harness UI route files only for UX intent, not API shape

If two sources conflict:

- planning docs define intent
- `execution/contracts` defines the current formalized contract shape
- Python code is only a prototype and loses conflicts

### 5.2 Extraction batches

| Batch | Package path | Inputs | Output |
|---|---|---|---|
| E1 envelope | `packages/contracts/src/envelope` | `tool_contracts.py`, test plan, competing plan | request envelope, response envelope, event envelope, pagination envelope |
| E2 identity/policy | `packages/contracts/src/identity`, `workflow` | `identity_consent.py`, `country_pack.py`, `policy_guardrails.py`, `b002_identity_consent_contract.json` | consent DTOs, membership DTOs, policy decision result DTOs |
| E3 channels | `packages/contracts/src/channels`, `notifications` | `b004_ussd_adapter_contract.json`, `b005_whatsapp_adapter_contract.json`, `b006_pwa_offline_queue_contract.json`, `b013_settlement_notification_contract.json`, `offline_queue.py`, `notification_broker.py` | channel session DTOs, offline queue DTOs, notification delivery DTOs |
| E4 commerce | `packages/contracts/src/marketplace`, `negotiation`, `ledger`, `escrow` | `listings.py`, `negotiation.py`, `ledger.py`, `escrow.py` | listing commands/events, negotiation commands/events, wallet/escrow DTOs |
| E5 intelligence | `packages/contracts/src/advisory`, `intelligence` | `advisory_retrieval.py`, `planning_loop.py`, `verifier_loop.py`, `memory_service.py`, `memory_selector.py`, `model_router.py`, `b038*`, `b039*`, `b040*` | advisory DTOs, citation DTOs, planner/verifier DTOs, memory DTOs, router decision DTOs |
| E6 risk/traceability | `packages/contracts/src/climate`, `finance`, `traceability` | `b017*` through `b024*`, plus matching Python modules | climate alert, finance case, partner decision, consignment, evidence DTOs |
| E7 generated artifacts | `packages/contracts/generated` | all previous batches | JSON Schema, OpenAPI fragments, generated TS client bindings |

### 5.3 Extraction implementation rules

- every extracted contract gets a `schema_version`
- every mutating contract gets an idempotency-bearing envelope
- every contract gets at least one contract test and one traceability reference to `CJ-*`, `EP-*`, `DI-*`, `AIJ-*`, or `IDI-*`
- generated artifacts are committed, not build-only
- no direct import from `src/agro_v2` is allowed in production packages once a contract is extracted

### 5.4 Immediate module-to-contract map

| Current module | New contract package | New API module |
|---|---|---|
| `listings.py` | `marketplace` | `marketplace` |
| `negotiation.py` | `negotiation` | `negotiation` |
| `ledger.py` | `ledger` | `ledger` |
| `escrow.py` | `escrow` | `escrow` |
| `identity_consent.py` | `identity` | `identity` |
| `country_pack.py` | `identity` and `workflow` | `country_policy` |
| `audit_events.py` and `audit_logger.py` | `observability` and `envelope` | `audit` |
| `offline_queue.py` and `offline_action_queue.py` | `channels` | `channels` |
| `ussd_adapter.py` and `whatsapp_adapter.py` | `channels` | `channels` |
| `advisory_retrieval.py` | `advisory` | `advisory` |
| `planning_loop.py`, `verifier_loop.py`, `model_router.py` | `intelligence` | `intelligence` |
| `climate_alert_rules.py`, `climate_risk_ingestion.py`, `mrv_evidence_service.py` | `climate` | `climate` |
| `finance_partner_adapter.py`, `finance_hitl_console.py`, `insurance_trigger_registry.py` | `finance` | `finance` |
| `traceability_event_chain.py`, `quality_evidence_attachments.py` | `traceability` | `traceability` |

## 6. Schema and Migration Plan

### 6.1 Database strategy

Use Postgres with SQLAlchemy 2.x and Alembic. Treat the existing file-backed state as disposable staging data. Migrate fixtures, not records.

Recommended schemas:

- `core`
- `channels`
- `commerce`
- `intelligence`
- `risk`
- `traceability`
- `ops`
- `analytics`

### 6.2 Initial migration sequence

The migration stream must be explicit and replayable.

| Migration ID | Purpose | Tables |
|---|---|---|
| `0001_core_bootstrap` | create schemas and foundational enums | all schemas, shared enums |
| `0002_identity_workflow_audit` | core identity, consent, workflow, audit, idempotency, outbox | `core.actors`, `core.organizations`, `core.memberships`, `core.consent_records`, `core.identity_sessions`, `core.workflow_instances`, `core.workflow_steps`, `core.idempotency_keys`, `core.audit_events`, `core.outbox_events` |
| `0003_channels_notifications` | session translation and delivery tracking | `channels.ussd_sessions`, `channels.whatsapp_threads`, `channels.channel_sessions`, `channels.notification_deliveries`, `channels.offline_command_queue`, `channels.sync_conflicts`, `channels.device_registry` |
| `0004_marketplace_negotiation` | first commercial slice | `commerce.commodities`, `commerce.listings`, `commerce.listing_revisions`, `commerce.offers`, `commerce.offer_events` |
| `0005_wallet_escrow` | immutable money movement | `commerce.wallet_accounts`, `commerce.ledger_entries`, `commerce.escrow_cases`, `commerce.escrow_events`, `commerce.settlements` |
| `0006_advisory_intelligence` | intelligence telemetry and evidence | `intelligence.knowledge_sources`, `intelligence.knowledge_citations`, `intelligence.advisory_requests`, `intelligence.advisory_responses`, `intelligence.planner_runs`, `intelligence.verifier_runs`, `intelligence.memory_records`, `intelligence.memory_recall_logs`, `intelligence.tool_contract_registry`, `intelligence.tool_execution_logs`, `intelligence.model_router_decisions`, `intelligence.agent_eval_runs` |
| `0007_risk_finance_traceability` | non-core extension tables | `risk.climate_observations`, `risk.climate_alerts`, `risk.mrv_records`, `risk.finance_partner_requests`, `risk.finance_partner_decisions`, `risk.insurance_trigger_rules`, `risk.hitl_reviews`, `traceability.consignments`, `traceability.traceability_events`, `traceability.quality_evidence_attachments` |
| `0008_ops_analytics` | projection and operational tables | `ops.slo_measurements`, `ops.incident_events`, `ops.deployment_markers`, `analytics.*` projections |

### 6.3 Required invariants

- `core.idempotency_keys` must enforce uniqueness on `(scope, idempotency_key)`
- `core.audit_events` is append-only
- `commerce.ledger_entries` is append-only and cannot update amount or direction after insert
- all offer, escrow, finance, and traceability events include causation and correlation IDs
- all sensitive tables store actor, country, and recorded timestamp
- projection tables are rebuildable and must be safe to truncate/recompute

### 6.4 Seed plan

Seed only deterministic fixture data:

- roles and membership templates
- sample country packs
- commodity catalog
- demo users by role
- a seeded farmer and buyer for listing/negotiation tests

Do not seed:

- synthetic financial balances beyond test fixtures
- fake live partner decisions
- long-lived operational analytics

### 6.5 Migration verification

Wave 0 migration plan is valid only if these checks pass:

- clean bootstrap from empty database
- `upgrade -> downgrade -> upgrade` works without manual intervention
- all expected schemas and tables land in the correct namespace
- base seed can run twice without duplicate effects

## 7. Tranche-Ready Bead Decomposition

These beads replace vague “foundation” work with execution-ready packages for Wave 1.

### 7.1 Tranche T0-A: foundation reset

#### `R-001` Workspace bootstrap

- Objective: establish monorepo root and shared tooling
- Route owner: `@builder`
- Dependencies: none
- Inputs: Wave 0 packet, current root package setup
- Implementation tasks:
  - create `pnpm-workspace.yaml`, root `package.json`, `turbo.json`
  - add `apps/web`, `apps/api`, `apps/worker`, `packages/contracts`, `packages/config`
  - add shared scripts for lint, typecheck, test, build
- Test obligations:
  - Unit: package script execution sanity
  - Integration: workspace install and cross-package script resolution
  - E2E: none
  - Data: none
- Observability obligations: add root command for CI artifact collection
- Security obligations: root env template excludes secrets from VCS
- Exit criteria:
  - `pnpm install` succeeds
  - `pnpm lint` resolves workspace tasks
  - no active root app remains the production target

#### `R-002` Legacy freeze and archive

- Objective: preserve harness artifacts without leaving them on the production path
- Route owner: `@architect`
- Dependencies: `R-001`
- Inputs: `src/agro_v2`, root `pyproject.toml`, root Playwright config
- Implementation tasks:
  - move current runtime into `legacy/staging-runtime`
  - add `legacy/staging-runtime/README.md` documenting its reference-only role
  - ensure production docs and commands point to `apps/web` and `apps/api`
- Test obligations:
  - Unit: none
  - Integration: root search confirms no production import path points to `legacy`
  - E2E: existing harness still runnable under `legacy`
  - Data: none
- Observability obligations: none
- Security obligations: no secrets or live env references remain in legacy path
- Exit criteria:
  - legacy path exists and is documented
  - production branch does not deploy from `src/agro_v2/staging_runtime.py`

### 7.2 Tranche T0-B: contracts backbone

#### `C-001` Canonical transport envelope

- Objective: lock the universal request, response, and event envelope
- Route owner: `@architect`
- Dependencies: `R-001`
- Inputs: `tool_contracts.py`, competing plan, test plan
- Implementation tasks:
  - define request envelope schema
  - define response envelope schema
  - define event envelope schema
  - define standard error catalog and reason codes
- Test obligations:
  - Unit: required-field validation and unknown-field rejection
  - Integration: generated JSON Schema and OpenAPI fragment generation
  - E2E: `AIJ-002`
  - Data: `IDI-003`
- Observability obligations: standard correlation ID fields in every envelope
- Security obligations: invalid schema and unknown tool calls are fail-closed
- Exit criteria:
  - generated artifacts committed
  - contract tests prove `schema_version` and `idempotency_key` enforcement

#### `C-002` Identity, workflow, and policy contracts

- Objective: extract foundation DTOs before feature DTOs
- Route owner: `@builder`
- Dependencies: `C-001`
- Inputs: `identity_consent.py`, `country_pack.py`, `policy_guardrails.py`, `b002_identity_consent_contract.json`
- Implementation tasks:
  - define identity, consent, membership, workflow, and policy decision schemas
  - map country-pack configuration shape into typed contracts
- Test obligations:
  - Unit: consent lifecycle and policy decision schema tests
  - Integration: API stubs consume contracts without local redefinition
  - E2E: `CJ-001`, `EP-007`
  - Data: `DI-004`
- Observability obligations: policy decision DTO includes reason codes
- Security obligations: consent status required for regulated mutations
- Exit criteria:
  - contract suite green
  - country-pack validation rejects invalid locale/legal settings

#### `C-003` Channels and notifications contracts

- Objective: define translator-only contracts for multi-channel operation
- Route owner: `@builder`
- Dependencies: `C-001`
- Inputs: `b004*`, `b005*`, `b006*`, `b013*`, `offline_queue.py`, `notification_broker.py`
- Implementation tasks:
  - define USSD session schema
  - define WhatsApp command schema
  - define offline queue command/result schema
  - define notification attempt/result schema
- Test obligations:
  - Unit: command parsing and offline replay DTO validation
  - Integration: delivery fallback status model parity
  - E2E: `EP-002`, `EP-003`, `RJ-001`, `RJ-002`
  - Data: `DI-001`, `DI-002`
- Observability obligations: delivery attempt and fallback outcome fields mandatory
- Security obligations: contracts expose no direct aggregate mutation semantics
- Exit criteria:
  - schemas generated
  - contract tests encode conflict metadata and fallback states

### 7.3 Tranche T0-C: API core

#### `A-001` API shell and health surface

- Objective: stand up the production API skeleton
- Route owner: `@builder`
- Dependencies: `R-001`, `C-001`
- Inputs: current FastAPI runtime patterns, Wave 0 topology
- Implementation tasks:
  - create FastAPI app factory
  - add health, readiness, settings, logging, telemetry stubs
  - add route dependency structure
- Test obligations:
  - Unit: settings loading and health handler tests
  - Integration: app boot with test config
  - E2E: none
  - Data: none
- Observability obligations: request ID middleware and structured logs
- Security obligations: environment config loads from typed settings only
- Exit criteria:
  - `/healthz` and `/readyz` return `200`
  - unit tests pass in isolated API package

#### `A-002` Database and migration spine

- Objective: establish durable persistence baseline
- Route owner: `@builder`
- Dependencies: `A-001`, `C-002`
- Inputs: schema plan in this packet
- Implementation tasks:
  - add SQLAlchemy base and schema-separated metadata
  - add Alembic
  - implement migrations `0001` through `0004`
  - add repeatable seed runner
- Test obligations:
  - Unit: model validation and repository smoke tests
  - Integration: clean migration cycle and seed replay
  - E2E: supports `CJ-001` and `CJ-002` fixtures
  - Data: `DI-001`, `DI-004`
- Observability obligations: migration logs and seed logs tagged by revision
- Security obligations: migrations contain no manual secret interpolation
- Exit criteria:
  - clean bootstrap succeeds
  - seed replay is idempotent

#### `A-003` Command bus, idempotency, and audit seam

- Objective: enforce mutation discipline before feature breadth
- Route owner: `@architect`
- Dependencies: `A-001`, `A-002`, `C-001`
- Inputs: `audit_events.py`, `audit_logger.py`, `tool_contracts.py`
- Implementation tasks:
  - create command dispatch pattern
  - enforce idempotency middleware or dependency
  - append audit events on regulated commands
  - create outbox persistence seam
- Test obligations:
  - Unit: duplicate request handling and audit emission
  - Integration: single-effect duplicate submission test
  - E2E: `EP-005`
  - Data: `DI-003`, `IDI-003`
- Observability obligations: command duration, status, and correlation metrics
- Security obligations: unauthorized mutation attempts are audited and rejected
- Exit criteria:
  - duplicate mutating request creates one business effect
  - all protected mutations generate audit rows

### 7.4 Tranche T0-D: web shell

#### `W-001` Authenticated shell and role routing

- Objective: replace staging HTML with a production web shell
- Route owner: `@frontend`
- Dependencies: `R-001`, `C-002`, `A-001`
- Inputs: `frontend_app_shell.py`, `frontend_design_tokens.py`, route intent docs
- Implementation tasks:
  - create public routes, auth routes, role route groups
  - define design tokens and app layout primitives
  - add role-aware navigation and protected route shell
- Test obligations:
  - Unit: route guard helpers
  - Integration: generated contract client wiring
  - E2E: `RJ-001`
  - Data: none
- Observability obligations: shell boot metric and route change trace ID propagation
- Security obligations: route guards never substitute for server authorization
- Exit criteria:
  - desktop and mobile shells render cleanly
  - role-based navigation compiles with no dead links

#### `W-002` Identity and consent flows

- Objective: deliver the first real auth/consent UI path
- Route owner: `@frontend`
- Dependencies: `W-001`, `C-002`, `A-002`
- Inputs: `frontend_consent_ui.py`, existing staging flows, test plan
- Implementation tasks:
  - build sign-in placeholder or provider-backed sign-in shell
  - build onboarding and consent pages
  - build consent review/revoke surface
- Test obligations:
  - Unit: form schema validation
  - Integration: contract client + API flow
  - E2E: `CJ-001`, `EP-001`, `EP-007`
  - Data: `DI-004`
- Observability obligations: onboarding funnel instrumentation
- Security obligations: consent text version and timestamp visible in response state
- Exit criteria:
  - consent state persists end to end
  - revoke flow blocks protected regulated actions

#### `W-003` Offline shell and queue seam

- Objective: preserve low-connectivity product intent from day one
- Route owner: `@frontend`
- Dependencies: `W-001`, `C-003`
- Inputs: `frontend_offline_conflict_ui.py`, `offline_queue.py`, `sync_conflict_resolver.py`
- Implementation tasks:
  - outbox UI
  - sync status banner
  - conflict drawer
  - retry and dismiss controls
- Test obligations:
  - Unit: queue state reducers
  - Integration: error code to conflict UI mapping
  - E2E: `RJ-002`
  - Data: `DI-002`
- Observability obligations: queue depth and replay attempt telemetry
- Security obligations: queued mutations preserve envelope metadata
- Exit criteria:
  - queued state survives refresh
  - conflict presentation is deterministic from contract codes

### 7.5 Tranche T0-E: Wave 0 vertical slice

#### `V-001` Create-listing vertical slice

- Objective: prove the rebuild path with a real business flow
- Route owner: `@builder` plus `@frontend`
- Dependencies: `C-001`, `C-002`, `A-002`, `A-003`, `W-001`
- Inputs: `listings.py`, `frontend_listing_wizard.py`, `AGRO-V2-TEST-PLAN.md`
- Implementation tasks:
  - extract listing contracts
  - build listing persistence and command handler
  - build listing create/edit wizard
  - build listing read/detail path
  - emit audit event and enforce idempotency
- Test obligations:
  - Unit: listing lifecycle transitions
  - Integration: API persistence and idempotent re-submit
  - E2E: `CJ-002`
  - Data: `DI-001`
- Observability obligations: listing create funnel and publish failure metrics
- Security obligations: authenticated actor scoping and country scoping enforced server-side
- Exit criteria:
  - listing create works from web to DB to read-back
  - duplicate submission is single-effect
  - audit event is queryable

## 8. Wave 1 Lanes and Acceptance Criteria

Wave 1 starts immediately after this packet is accepted. Lanes can run in parallel once dependencies are met.

### 8.1 Contracts lane

Sequence:

1. `C-001`
2. `C-002`
3. `C-003`
4. listing contracts from `V-001`

Lane acceptance:

- generated schemas committed
- OpenAPI fragments generated
- `schema_version` and `idempotency_key` present for every mutating contract
- `AIJ-002` and `IDI-003` contract tests green

### 8.2 API lane

Sequence:

1. `A-001`
2. `A-002`
3. `A-003`
4. listing command and query handlers from `V-001`

Lane acceptance:

- app boots locally
- migrations are repeatable
- duplicate mutation test is green
- listing create/read integration test is green

### 8.3 Web lane

Sequence:

1. `W-001`
2. `W-002`
3. `W-003`
4. listing wizard and detail pages from `V-001`

Lane acceptance:

- shell works at mobile and desktop breakpoints
- consent flow works against the API
- offline queue seam exists even if replay uses mocked transport first
- listing wizard submits via generated contract client only

### 8.4 QA lane

Sequence:

1. create Wave 1 contract test matrix
2. create API integration test matrix
3. create initial Playwright shell and listing smoke paths
4. wire CI evidence collection

Lane acceptance:

- `CJ-001`, `CJ-002`, `EP-001`, `EP-005`, `EP-007`, `RJ-001`, `DI-001`, `DI-004`, `AIJ-002`, `IDI-003` mapped to concrete tests
- evidence output path defined under `execution/heartbeats` or equivalent new CI artifacts

## 9. Immediate Execution Commands

Run from `/mnt/vault/MWH/Projects/Agrodomain`.

### 9.1 Foundation lane

```bash
git checkout -b wave0-production-rebuild
mkdir -p apps/web apps/api apps/worker packages/contracts packages/config legacy docs/architecture infra
mkdir -p legacy/staging-runtime
test -d src && git mv src legacy/staging-runtime/src || true
test -f pyproject.toml && git mv pyproject.toml legacy/staging-runtime/pyproject.toml || true
test -f playwright.config.ts && git mv playwright.config.ts legacy/staging-runtime/playwright.config.ts || true
test -f package-lock.json && git mv package-lock.json legacy/staging-runtime/package-lock.json || true
```

```bash
corepack enable
cat > pnpm-workspace.yaml <<'EOF'
packages:
  - apps/*
  - packages/*
EOF
cat > package.json <<'EOF'
{
  "name": "agrodomain",
  "private": true,
  "packageManager": "pnpm@10.11.0",
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev --parallel",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test"
  },
  "devDependencies": {
    "turbo": "^2.5.5",
    "typescript": "^5.8.3"
  }
}
EOF
cat > turbo.json <<'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": {},
    "typecheck": {},
    "test": { "dependsOn": ["^build"], "outputs": ["coverage/**"] }
  }
}
EOF
pnpm install
```

### 9.2 Contracts lane

```bash
mkdir -p packages/contracts/src/{envelope,errors,identity,workflow,channels,marketplace,negotiation,ledger,escrow,advisory,intelligence,climate,finance,traceability,notifications,analytics,observability}
mkdir -p packages/contracts/generated/{json-schema,openapi}
mkdir -p packages/contracts/tests
cat > packages/contracts/package.json <<'EOF'
{
  "name": "@agrodomain/contracts",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "tsc --noEmit -p tsconfig.json",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "^3.24.3"
  },
  "devDependencies": {
    "typescript": "^5.8.3",
    "vitest": "^3.1.2"
  }
}
EOF
cat > packages/contracts/tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "declaration": true,
    "outDir": "dist",
    "strict": true
  },
  "include": ["src", "tests"]
}
EOF
touch packages/contracts/src/index.ts
```

### 9.3 API lane

```bash
mkdir -p apps/api/app/{api/routes,api/dependencies,core,db/models,db/repositories,db/migrations/versions,modules/{country_policy,identity,workflow,audit,policy,channels,marketplace,negotiation,ledger,escrow,advisory,intelligence,climate,finance,traceability,notifications,analytics},services/commands}
mkdir -p apps/api/tests/{unit,integration,contract}
cat > apps/api/pyproject.toml <<'EOF'
[build-system]
requires = ["setuptools>=68", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "agrodomain-api"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
  "fastapi>=0.115.0,<1.0.0",
  "uvicorn>=0.34.0,<1.0.0",
  "sqlalchemy>=2.0.40,<3.0.0",
  "alembic>=1.15.2,<2.0.0",
  "psycopg[binary]>=3.2.6,<4.0.0",
  "pydantic-settings>=2.8.1,<3.0.0",
  "pytest>=8.3.4,<9.0.0"
]

[tool.pytest.ini_options]
testpaths = ["tests"]
EOF
python3 -m venv apps/api/.venv
. apps/api/.venv/bin/activate
pip install -U pip
pip install -e apps/api
cd apps/api && alembic init app/db/migrations && cd /mnt/vault/MWH/Projects/Agrodomain
```

### 9.4 Web lane

```bash
pnpm dlx create-next-app@latest apps/web --ts --tailwind --eslint --app --src-dir=false --import-alias "@/*" --use-pnpm --yes
cd apps/web
pnpm add zod @tanstack/react-query zustand workbox-window
mkdir -p app/'(public)' app/'(auth)' app/'(farmer)' app/'(buyer)' app/'(cooperative)' app/'(advisor)' app/'(finance)' app/'(admin)'
mkdir -p components features/{identity,shell,listings,negotiation,wallet,advisory,climate,traceability,notifications} lib/{api,auth,offline,telemetry,contracts}
cd /mnt/vault/MWH/Projects/Agrodomain
```

### 9.5 QA lane

```bash
mkdir -p apps/web/tests/e2e apps/api/tests/integration packages/contracts/tests
cat > docs/architecture/wave1-test-slice.md <<'EOF'
# Wave 1 Test Slice

- CJ-001 -> onboarding + consent
- CJ-002 -> listing creation and edit lifecycle
- EP-001 -> invalid login or auth failure
- EP-005 -> unauthorized mutation rejected and audited
- EP-007 -> missing consent blocked
- RJ-001 -> responsive onboarding shell
- DI-001 -> listing visible after creation
- DI-004 -> consent revocation propagates
- AIJ-002 -> invalid schema/tool call rejected
- IDI-003 -> schema version recorded
EOF
```

## 10. Acceptance Gates

### Gate G0: topology lock

Pass when:

- `apps/web`, `apps/api`, `apps/worker`, and `packages/contracts` exist
- `legacy/staging-runtime` exists
- root workspace commands install cleanly

### Gate G1: contract lock

Pass when:

- envelope package exists
- generated schemas are committed
- every mutating contract has `idempotency_key` and `schema_version`

### Gate G2: migration lock

Pass when:

- `0001` through `0004` are implemented
- clean bootstrap and replay succeed
- seed replay is idempotent

### Gate G3: boundary lock

Pass when:

- web imports only shared contracts and client helpers
- API owns all writes
- channel adapters have no direct aggregate writes

### Gate G4: Wave 0 vertical slice lock

Pass when:

- authenticated shell exists
- consent persists
- create listing works end to end
- audit and idempotency evidence exists

## 11. Recommended Execution Order

Run in this order:

1. `R-001`
2. `R-002`
3. `C-001`
4. `C-002`
5. `C-003`
6. `A-001`
7. `A-002`
8. `A-003`
9. `W-001`
10. `W-002`
11. `W-003`
12. `V-001`

Do not start wallet, escrow, finance, advisory, or traceability implementation until `V-001` is green.
