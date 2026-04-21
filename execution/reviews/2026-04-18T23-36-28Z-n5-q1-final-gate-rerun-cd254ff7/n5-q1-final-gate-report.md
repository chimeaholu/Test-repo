# N5-Q1 Final Gate Rerun Report

- Timestamp: `2026-04-18T23-36-28Z`
- Baseline: `integration/agrodomain-n5-baseline-sparse@cd254ff7c2658cdf2d7ced07d8bcc2bb3dfea729`
- Web lane input: completed lane `5592f401` outputs (snapshot rooted at `worktrees/agrodomain-n5-web-cd254ff7`)
- Scope: `N5-Q1` only (`CJ-004`, `CJ-007`, `CJ-008`, `EP-008`, `DI-003`, `DI-006`) plus mandatory `N1..N4` regression expectation

## Gate verdict

| Gate | Status | Evidence |
| --- | --- | --- |
| `N5-G1` Contract and boundary lock | `PASS` | `contracts/contracts-test.log`, `contracts/contracts-generate.log`, `contracts/n5-contract-inventory.log`, `api/n5-route-inventory.log` |
| `N5-G2` Finance decision accountability | `PASS` | `api/test_finance_insurance_runtime.log` |
| `N5-G3` Insurance trigger provenance | `PASS` | `api/test_finance_insurance_runtime.log` |
| `N5-G4` Traceability continuity | `PASS` | `api/test_traceability_runtime_integration.log` |
| `N5-G5` Decision-surface + regression integrity | `FAIL` | `playwright/playwright-n5-focused-isolated.log` (N5 journey pass), `regression/playwright-regression-n1-n4-isolated.log` (N1..N4 regression fail) |

## Final closeout decision

`FAIL` (do not close N5 tranche yet).

N5-specific finance/insurance/traceability surface checks pass under isolated-port replay. Closeout is blocked by regression expectation failure in `N1..N4` browser journeys (buyer discovery and negotiation in both desktop/mobile shards).

## Key run outcomes

- Contracts:
  - `@agrodomain/contracts` tests: `18 passed`
  - artifact generation command succeeded
- Focused API:
  - `test_finance_insurance_runtime.py`: `2 passed`
  - `test_traceability_runtime_integration.py`: `2 passed`
- N5 Playwright:
  - initial default-port run (`playwright/playwright-n5-focused.log`): `4 failed` (stale/reused-server mismatch)
  - isolated-port rerun (`playwright/playwright-n5-focused-isolated.log`): `4 passed` for `CJ-004/CJ-008` and `CJ-007` on desktop+mobile
- Regression Playwright (`N1..N4` subset, isolated ports):
  - `12 passed`, `4 failed` in `regression/playwright-regression-n1-n4-isolated.log`
  - failures:
    - `tests/e2e/buyer-discovery.spec.ts` desktop+mobile
    - `tests/e2e/negotiation.spec.ts` desktop+mobile

## Blocking findings summary

1. Regression expectation breach (`N5-G5`):
   - Buyer discovery heading expectation not satisfied on both form factors.
   - Negotiation flow cannot reach listing form controls (`Listing title`) on both form factors.
2. Environment fragility noted (non-gating after isolation):
   - Earlier default-port browser run reused existing servers and produced false negatives for N5-specific assertions.
   - Screenshot-triggered Chromium SEGV in an earlier regression run was removed by re-running functional regression without artifact screenshot capture.
