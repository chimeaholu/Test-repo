# Agrodomain N6 Tranche Packet

Date: `2026-04-19`
Canonical repo: `/mnt/vault/MWH/Projects/Agrodomain`
Predecessor gates: `N5-G1` to `N5-G5` green on promoted sparse integrated baseline `integration/agrodomain-n5-baseline-sparse` at `cd254ff7c2658cdf2d7ced07d8bcc2bb3dfea729`
Predecessor evidence root: `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/execution/reviews/2026-04-19T01-06-38Z-n5-q1-final-closeout-rerun-cd254ff7`
Authoritative sources:
- `execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md`
- `v2-planning/AGRO-V2-BEAD-BACKLOG.md`
- `v2-planning/AGRO-V2-TEST-PLAN.md`
- `v2-planning/AGRO-V2-PRD.md`
- `execution/contracts/b025_enterprise_analytics_mart_contract.json`
- `execution/contracts/b026_partner_api_gateway_contract.json`
- `execution/contracts/b027_observability_contract.json`
- `execution/contracts/b028_multi_channel_qa_harness_contract.json`
- `execution/contracts/b029_plan_adversarial_review_gate_contract.json`
- `execution/contracts/b030_architecture_adversarial_review_gate_contract.json`

## 1. Tranche Decision

The next tranche after completed `N5` closeout is `N6`, the operations-control slice for admin observability, rollout controls, reliability hardening, and release/rollback readiness.

`N5` closed finance/insurance decision accountability and traceability evidence integrity on the repaired runnable line. It did not yet deliver:

- packaged admin-facing analytics and observability views tied to the enterprise mart and SLO telemetry contracts
- runtime-scoped rollout controls and partner-access boundaries usable by operators without widening product scope
- tranche-owned reliability hardening using the canonical multi-channel QA harness and regression guardrails
- explicit release/rollback operating artifacts, blocker classification, and adversarial review outputs for the runnable packaged baseline

`N6` therefore converts `B-025` through `B-030` into a strict operations tranche. The emphasis is operational control and release safety, not net-new customer product surfaces.

This tranche is intentionally bounded away from white-label expansion, new partner programs, logistics optimization, disease-diagnosis expansion, IoT execution, and any post-Wave-6 feature discovery.

## 2. N6 Scope

### In scope

- `B-025` admin-facing analytics mart projections and observability-ready read models required for operator oversight
- `B-026` scoped rollout and partner-access control surfaces with explicit credential, country, and audit boundaries
- `B-027` telemetry, trace, SLO, and alert-evaluation seams required to observe the packaged runtime
- `B-028` canonical multi-channel reliability harness updates, fixtures, and regression execution paths needed to gate release
- `B-029` plan adversarial review outputs scoped to the N6 operations tranche
- `B-030` architecture adversarial review outputs scoped to release/rollback readiness for the N6 operations tranche
- release/rollback runbooks, decision logs, and evidence bundles required to operate this packaged baseline safely without external deploy action
- regression protection for `N1` through `N5`

### Out of scope

- new end-user marketplace, wallet, advisory, finance, or traceability feature expansion outside operator-readiness needs
- white-label packaging, partner commercial onboarding, or open-ended third-party API productization beyond bounded rollout controls
- deploy, publish, push, infrastructure mutation, or irreversible environment changes
- logistics routing, disease diagnosis, Android/IoT expansion, or Wave 7+ planning
- reworking prior tranche internals except where required for packaged observability, harnessing, or regression-safe integration

## 3. Bead Set

### `N6-C1` Enterprise ops contract and control-plane lock

- Maps to: `B-025`, `B-026`, `B-027`
- Objective: extend the contracts package for admin analytics marts, rollout-control authorization, and telemetry/SLO envelopes before runtime or UI integration begins.
- Route owner: `@builder`
- Dependencies: `N5-G1` to `N5-G5`
- Inputs: `packages/contracts`, `AGRO-V2-BEAD-BACKLOG.md`, `AGRO-V2-TEST-PLAN.md`, `AGRO-V2-PRD.md`
- Implementation tasks:
  - add admin analytics mart DTOs for operator-safe rollups, citation-backed provenance, and service-level summaries
  - add rollout-control DTOs for scoped credentials, freeze/unfreeze intents, country-limited access, and audit reasons
  - add telemetry and SLO DTOs for channel/country/service observations, breach summaries, and alert decisions
  - regenerate contract manifest, JSON schema, and OpenAPI artifacts
- Test obligations:
  - Unit: schema validation for analytics, rollout-control, telemetry, and SLO DTOs
  - Integration: generated artifact parity
  - E2E references: `CJ-008`, `EP-005`, `PF-001`, `PF-004`
  - Data references: `DI-002`, `DI-003`
- Observability obligations: every control-plane payload must preserve `schema_version`, `request_id`, `actor_id`, `country_code`, `channel`, `service_name`, `slo_id`, `alert_severity`, and `audit_event_id`
- Security obligations: rollout controls require explicit actor, scope, reason, and audit metadata; no anonymous or implicit toggles
- Exit criteria:
  - generated artifacts committed
  - no duplicate operations DTO definitions outside `packages/contracts`

### `N6-A1` Admin observability and rollout-control runtime

- Maps to: `B-025`, `B-026`, `B-027`
- Objective: implement packaged runtime seams for admin analytics, scoped rollout controls, telemetry capture, and SLO evaluation without widening business scope.
- Route owner: `@builder`
- Dependencies: `N6-C1`
- Inputs: existing audit/logging seams, packaged route inventory, N5 closeout baseline, contract outputs
- Implementation tasks:
  - implement admin analytics read models sourced from packaged marketplace, advisory, finance, traceability, and climate entities strictly as operator rollups
  - implement scoped rollout-control runtime with freeze, hold, and limited-release state changes bounded by actor role, country, and audit trail
  - implement telemetry aggregation and SLO evaluation hooks for critical packaged flows across API and web runtime paths
  - expose release-readiness status endpoints that summarize control health without mutating external environments
- Test obligations:
  - Unit: mart aggregation integrity, authz scope enforcement, telemetry schema validation, and SLO threshold evaluation
  - Integration: idempotent telemetry ingestion, scoped rollout-control transitions, and alert generation remain replay-safe
  - E2E references: `EP-005`, `PF-001`, `PF-004`
  - Data references: `DI-002`, `DI-003`
- Observability obligations: emit explicit counters and summaries for admin view refreshes, rollout-state changes, telemetry ingestion, and alert decisions
- Security obligations: rollout-control actions must be actor-attributed, country-limited, and append-only in audit history
- Exit criteria:
  - admin runtime exposes contract-backed analytics, rollout-control, and observability reads
  - no implicit partner or rollout authorization path bypasses explicit scope checks

### `N6-W1` Admin observability and rollout-control surfaces

- Maps to: `B-025`, `B-027`
- Objective: deliver contract-backed admin analytics, alert-state, and rollout-control UX for operators while preserving non-placeholder, audit-visible behavior.
- Route owner: `@frontend`
- Dependencies: `N6-C1`, `N6-A1`
- Build gate: no placeholder metrics, faux alerting, or mock-only rollout actions in canonical deliverables
- Implementation tasks:
  - wire admin analytics dashboards, service health, and alert summaries to live N6 payloads
  - expose rollout-control surfaces with explicit freeze/hold/release state, actor attribution, scope chips, and audit-history views
  - preserve responsive operator usability across desktop and mobile admin routes
  - reuse established visual/admin primitives where possible without generic placeholder layouts
- Test obligations:
  - Unit: observability card mapping, alert-state rendering, and rollout-control transition view models
  - Integration: contract-generated client usage only
  - E2E references: `CJ-008`, `PF-001`, `PF-004`
  - UX references: `UXJ-002`, `UXDI-002`
  - Data references: `DI-002`, `DI-003`
- Observability obligations: UI interactions for filters, alert drilldown, and rollout actions emit telemetry hooks
- Security obligations: no hidden admin state transitions; every rollout action must surface who acted, why, and within what scope
- Exit criteria:
  - operators can inspect service health, alert state, and rollout posture from live packaged data
  - admin views remain explicit about stale, degraded, or unavailable telemetry rather than silently hiding it

### `N6-Q1` Reliability hardening and regression gate pack

- Maps to: `B-028`
- Objective: harden the canonical multi-channel QA harness and publish the blocking release-quality evidence for N6.
- Route owner: `@qa-engineer`
- Dependencies: `N6-A1`, `N6-W1`
- Implementation tasks:
  - extend fixtures and channel stubs for admin analytics, rollout controls, telemetry, and SLO paths
  - add focused API and Playwright coverage for admin observability, scoped rollout controls, and degraded-state rendering
  - run mandatory regression coverage across `N1` through `N5`
  - publish the N6 reliability evidence pack under `execution/reviews`
- Test obligations:
  - Critical journeys: `CJ-008`, `EP-005`, `PF-001`, `PF-004`
  - Data checks: `DI-002`, `DI-003`
  - Negative paths:
    - rollout control accepted without actor scope
    - telemetry breach omitted from admin alert view
    - stale analytics mart data rendered as healthy
    - duplicate telemetry ingest inflates SLO state
    - regression break introduced in any closed `N1` through `N5` journey
- Observability obligations: artifact paths written under `execution/reviews` and `execution/heartbeats`
- Security obligations: approval-bypass, stale-health masking, and silent alert-loss failures must be explicitly evidenced
- Exit criteria:
  - gate pack exists with pass/fail matrix, artifact links, regression summary, and blocker classification

### `N6-R1` Release/rollback ops and adversarial review dossier

- Maps to: `B-029`, `B-030`
- Objective: close Wave 6 with release/rollback operating artifacts plus adversarial plan and architecture review outputs tied to the runnable baseline.
- Route owner: `@review-plan` + `@review-arch`
- Dependencies: `N6-Q1`
- Implementation tasks:
  - publish tranche-specific plan adversarial review memo validating scope, dependencies, tests, and blocker classification
  - publish tranche-specific architecture adversarial review memo validating boundary integrity, scale, security, deployment feasibility, and rollback readiness
  - write a release/rollback operations dossier for the packaged baseline covering go/no-go criteria, verification sequence, rollback triggers, and evidence references
  - classify any remaining blockers as release-blocking, pre-release-remediate, or post-release-follow-up
- Test obligations:
  - Review gate completeness for `B-029` and `B-030`
  - Traceability from N6 requirements to evidence pack artifacts and rollback decisions
- Observability obligations: release/rollback dossier must reference exact artifact paths, threshold signals, and operator handoff steps
- Security obligations: no go-live recommendation without explicit rollback trigger definitions and evidence-backed boundary confirmation
- Exit criteria:
  - review dossier exists with blocker table, go/no-go recommendation, and rollback trigger map

## 4. Lane Allocation and Merge Order

Because Wave 6 is operationally oriented, lanes are consolidated but still sequenced:

- API/control-plane lane: `N6-C1` + `N6-A1`
- Web/admin lane: `N6-W1`
- QA/reliability lane: `N6-Q1`
- Review/ops lane: `N6-R1`

Mandatory merge order:

1. `N6-C1`
2. `N6-A1`
3. `N6-W1`
4. `N6-Q1`
5. `N6-R1`

Execution and gating rules:

- `N6-A1` may not mutate external infrastructure, deploy state, or partner systems; it stays inside packaged control-plane logic and evidence generation.
- `N6-A1` must keep rollout-control actions bounded by explicit actor scope, country scope, and audit reason.
- `N6-W1` may move only after real admin analytics and observability payloads exist.
- `N6-W1` may not ship placeholder values, fake health badges, or unbound rollout buttons.
- `N6-Q1` runs only after admin surfaces are merged and must include regression proof for `N1` through `N5`.
- `N6-R1` does not block coding start, but it blocks tranche close and any release-readiness claim.

## 5. Acceptance Gates

### `N6-G1` Contract and ops-control lock

Pass when:

- analytics, rollout-control, and observability contracts are committed under `packages/contracts`
- generated schema artifacts are refreshed
- control-plane metadata preserves actor, scope, and telemetry boundary fields

### `N6-G2` Admin observability integrity

Pass when:

- `PF-001`, `PF-004`, and `DI-002` evidence prove telemetry ingestion, SLO evaluation, and degraded-state rendering work from packaged runtime to admin UI
- stale or missing telemetry is explicit and never rendered as healthy

### `N6-G3` Rollout-control security and accountability

Pass when:

- `EP-005` and `DI-003` evidence prove rollout actions remain actor-attributed, scope-limited, and replay-safe
- no internal or UI path can trigger rollout changes without explicit authorization metadata

### `N6-G4` Reliability hardening and regression integrity

Pass when:

- `N6-Q1` evidence proves focused admin/observability paths plus `N1` through `N5` regressions are green
- duplicate telemetry, stale marts, and silent alert-loss negative paths are explicitly checked

### `N6-G5` Release/rollback readiness

Pass when:

- the release/rollback dossier exists with go/no-go criteria, rollback triggers, and artifact references
- adversarial plan and architecture reviews classify no unresolved release-blocking gaps for Wave 6 scope
