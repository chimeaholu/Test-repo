# N5-Q1 Final Closeout Rerun Report

- Timestamp: `2026-04-19T01:06:38Z`
- Baseline: `integration/agrodomain-n5-baseline-sparse@cd254ff7c2658cdf2d7ced07d8bcc2bb3dfea729`
- Web lane input: completed N5 web lane outputs from `5592f401`
- Scope: `N5-Q1` only (`CJ-004`, `CJ-007`, `CJ-008`, `EP-008`, `DI-003`, `DI-006`) with mandatory `N1..N4` regression expectation

## N5-G1..N5-G5 matrix

| Gate | Status | Strict evidence |
| --- | --- | --- |
| `N5-G1` contract and boundary lock | `PASS` | `contracts/contracts-test.log` (`18 passed`), `contracts/contracts-generate.log`, `api/n5-route-inventory.log` |
| `N5-G2` finance decision accountability | `PASS` | `api/n5-focused-api.log` (`4 passed`), `playwright/playwright-n5-focused.log` (`CJ-004/CJ-008` pass desktop+mobile) |
| `N5-G3` insurance trigger provenance | `PASS` | `api/n5-focused-api.log`, `playwright/playwright-n5-focused.log` |
| `N5-G4` traceability continuity | `PASS` | `api/n5-focused-api.log`, `playwright/playwright-n5-focused.log` (`CJ-007` pass desktop+mobile) |
| `N5-G5` decision-surface + regression integrity | `PASS` | `regression/playwright-regression-n1-n4.log` (`8 passed`) |

## Final tranche decision

`PASS / CLOSE`.

N5-Q1 final closeout criteria are satisfied on this rerun pack: contracts, focused API checks, focused N5 Playwright proofs, and the regression integrity gate all pass.

## Key evidence totals

- Contracts: `18 passed`
- Focused API: `4 passed`
- Focused Playwright (N5): `4 passed`
- Regression (`N1..N4` lane pack used in this rerun): `8 passed`
