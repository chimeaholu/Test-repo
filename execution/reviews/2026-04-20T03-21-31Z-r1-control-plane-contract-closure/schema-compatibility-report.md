# R1 Schema Compatibility Report

- Timestamp: `2026-04-20T03:21:31Z`
- Execution base: `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7`
- Baseline ref: `cd254ff7c2658cdf2d7ced07d8bcc2bb3dfea729`
- Depends on R0 evidence: `execution/reviews/2026-04-20T03-09-24Z-r0-source-truth-parity-lock/r0-closeout-report.md`

## Objective

Close the `R1` contracts/control-plane schema gaps called out in:

- `execution/reviews/2026-04-20-agrodomain-enterprise-master-plan-revision.md`
- `execution/reviews/2026-04-19T02-15-00Z-n6-r1-architecture-adversarial-review.md`
- `execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md`

Scope held to:

1. contract/domain schema closure
2. regenerated source-backed artifacts
3. minimal API interface alignment required for schema integrity checks

No deploy or push was performed.

## Contract Surface Delta

### Added config contracts

New source-backed contracts landed under `packages/contracts/src/config/index.ts` and regenerated into `packages/contracts/generated/json-schema/config/`:

- `config.country_pack_runtime` -> `generated/json-schema/config/CountryPackRuntime.schema.json`
- `config.feature_flag` -> `generated/json-schema/config/FeatureFlag.schema.json`
- `config.rollout_policy` -> `generated/json-schema/config/RolloutPolicy.schema.json`
- `config.environment_profile` -> `generated/json-schema/config/EnvironmentProfile.schema.json`

### Repaired control-plane evidence refs

Analytics and observability contracts no longer point at the nonexistent tranche path `execution/specs/2026-04-19-n6-wave6-admin-observability-rollout-reliability-tranche.md`.

They now resolve to live source artifacts only:

- `execution/reviews/2026-04-20-agrodomain-enterprise-master-plan-revision.md`
- `execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md`
- existing execution contract JSONs:
  - `execution/contracts/b025_enterprise_analytics_mart_contract.json`
  - `execution/contracts/b026_partner_api_gateway_contract.json`
  - `execution/contracts/b027_observability_contract.json`

### Catalog compatibility

Regenerated manifest now reports `79` total contracts, including:

- `4` config contracts
- `3` analytics contracts
- `8` observability contracts
- `5` identity contracts

Control-plane source artifact existence check result:

- `control_plane_missing_refs = 0`

## Minimal API Interface Alignment

`apps/api/app/api/routes/admin.py` was aligned only where required for schema integrity checks:

- `GET /api/v1/admin/analytics/health`
  - now emits `analytics.admin_service_level_summary`-compatible payload shape
  - sets `X-Agrodomain-Contract-Id`, `X-Agrodomain-Contract-Name`, and `X-Agrodomain-Schema-Version`
- `GET /api/v1/admin/observability/alerts`
  - now emits `observability.slo_evaluation_collection`-compatible payload shape
  - sets the same source-of-truth contract headers
- `POST /api/v1/admin/rollouts/freeze`
  - validates request against `observability.rollout_control_input`
  - emits `observability.rollout_status`-compatible payload and headers
- `POST /api/v1/admin/observability/telemetry`
  - validates request against `observability.telemetry_observation_input`
  - emits `observability.telemetry_observation_record`-compatible payload and headers
  - preserves replay-safe dedupe via `WorkflowRepository`

Supporting schema integrity helpers landed in `apps/api/app/core/contracts_catalog.py`:

- generated-manifest descriptor lookup
- contract header emission
- `$ref`-aware root payload validation for:
  - unknown field rejection
  - required field presence
  - schema-version match

## Verification

### Contracts

- `corepack pnpm --filter @agrodomain/contracts generate` -> `PASS`
  - log: `contracts-generate.log`
- `corepack pnpm --filter @agrodomain/contracts build` -> `PASS`
  - log: `contracts-build.log`
- `corepack pnpm --filter @agrodomain/contracts test` -> `PASS`
  - log: `contracts-test.log`
  - result: `24/24` tests passed

### API schema integrity slice

- `pytest tests/contract/test_control_plane_contract_integrity.py tests/integration/test_app_boot.py tests/integration/test_n6_admin_observability_reliability.py -q` -> `PASS`
  - log: `api-schema-integrity.log`
  - result: `9 passed`

Warnings observed but non-blocking for this scope:

- Pytest config warning for `asyncio_default_fixture_loop_scope`
- Alembic deprecation warning for `path_separator`

## Compatibility Verdict

`PASS`

`R1-B01` through `R1-B04` are satisfied for the scoped control-plane contract lane:

- analytics DTOs exist in source and generated artifacts
- observability DTOs exist in source and generated artifacts
- typed config DTOs now exist for country-pack runtime, feature flags, rollout policy, and environment profile
- contract tests cover unknown-field rejection, required metadata presence, schema-version discipline, and control-plane source artifact existence

Residual out-of-scope compatibility debt remains in non-control-plane source artifact refs for other domains. This report does not claim those unrelated references were repaired in `R1`.
