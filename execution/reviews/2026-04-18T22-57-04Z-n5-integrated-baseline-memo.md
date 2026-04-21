# N5 Integrated Baseline Memo

- Timestamp: `2026-04-18T22:57:04Z`
- Working branch: `integration/agrodomain-n5-baseline-sparse`
- Source finance/insurance baseline: `fix/agrodomain-n5-c1-a1-canonical` at `280178b5f8da6dec7c5e593ee2a3b03bcfbe2bc8`
- Source traceability runtime: `9fa75b7e18628df306c06353c6a0448a2e410142`
- Source traceability addendum: `3c92ec6e52c70ccb52d4d80040c82e18d5568b8e`

## Outcome

Created a single integrated N5 baseline branch that combines:

- N5-C1/A1 finance partner request, decision, and insurance trigger runtime
- N5-A2 traceability consignment and append-only event-chain runtime
- Focused-test addendum artifacts from the traceability canonical branch

The integrated branch keeps scope to N5 runtime and contract surfaces only. No unrelated wave content was added.

## Explicit Base and Migration Resolution

Two migration consistency issues required normalization:

1. `0010_advisory_reviewer_runtime.py`
   Restored `down_revision = "0009"` so the N4 wallet/advisory baseline is linear again.

2. Traceability migration
   Renamed the traceability migration from `0012_traceability_event_chain_runtime.py` to `0013_traceability_event_chain_runtime.py` and set `down_revision = "0012"`.

Resulting linear chain:

`0008 -> 0009 -> 0010 -> 0011 -> 0012 -> 0013`

This removes the Alembic multi-head failure and allows `upgrade head` to succeed.

## Integration Notes

- Command bus and handler wiring now include both finance/insurance and traceability repositories.
- Telemetry now emits both finance/insurance and traceability metrics.
- Contract ownership was normalized:
  - finance contracts remain in `packages/contracts/src/finance/index.ts`
  - canonical traceability contracts now live in `packages/contracts/src/traceability/index.ts`
  - catalog imports were updated to avoid duplicate barrel exports
- Focused tests were updated for the integrated handler constructor and traceability contract shape.

## Focused Sanity Checks

API checks passed:

```text
pytest tests/integration/test_migrations_and_seed.py \
  tests/integration/test_finance_insurance_runtime.py \
  tests/integration/test_traceability_runtime_integration.py \
  tests/unit/test_models_and_repositories.py \
  tests/unit/test_climate_runtime.py
```

Result: `20 passed in 28.36s`

Contracts checks passed:

```text
corepack pnpm run typecheck
corepack pnpm run test -- tests/contracts.test.ts
```

Result:

- `tsc -p tsconfig.json --noEmit` passed
- `vitest` passed with `18` tests green

## Reachable Ref

Use the tip of `integration/agrodomain-n5-baseline-sparse` as the integrated N5 baseline for web lane execution.
