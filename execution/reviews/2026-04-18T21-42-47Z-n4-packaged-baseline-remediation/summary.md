# N4 Packaged Baseline Remediation Summary

- Timestamp (UTC): `2026-04-18T21:42:47Z`
- Base commit under repair: `55ce86749cb901421d53d526c4ff717daa41c2a7`
- Validation worktree: `/tmp/agro-n4-remediate-src.T7nIIX/MWH/Projects/Agrodomain`

## Remediations

1. Restored the missing `0009` Alembic migration and wallet ledger repository/model prerequisite seam required by N4 runtime bootstrap.
2. Rewired the command bus and handler to restore N3 wallet prerequisite availability while keeping N4 advisory/climate execution intact.
3. Regenerated advisory/climate contract artifacts so runtime contract lookup resolves `advisory.advisory_request_input` and related N4 descriptors.
4. Added root Playwright dependency support in canonical package setup via `package.json` and `pnpm-lock.yaml`.
5. Restored the `data-interactive` form marker contract on `/signin` and `/onboarding/consent` so the canonical Playwright helper path is executable.
6. Made `WorkflowCommandHandler` constructor backward-compatible for legacy unit-test callers that still use the five-argument form.

## Validation

- `pytest apps/api/tests` -> `41 passed`
- `corepack pnpm --filter @agrodomain/contracts run generate` -> `PASS`
- `corepack pnpm --filter @agrodomain/contracts run build` -> `PASS`
- `corepack pnpm --filter @agrodomain/contracts run test` -> `16 passed`
- `corepack pnpm --filter @agrodomain/web run test` -> `29 passed`
- `corepack pnpm --filter @agrodomain/web run build` -> `PASS`
- `corepack pnpm --filter @agrodomain/web run typecheck` -> `PASS`
- `corepack pnpm exec playwright test tests/e2e/advisory-climate-gate.spec.ts` -> `4 passed`
- `corepack pnpm exec playwright test` -> `20 passed`

## Scope note

This remediation intentionally restores only the runtime/package prerequisites that N4 depends on and the minimal UI compatibility needed for the canonical browser regression harness to execute. It does not introduce wallet web/runtime expansion beyond the missing prerequisite seam that N4 and existing regression callers already expected.
