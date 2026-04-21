# N5-Q1 Final Closeout Rerun Report

- Timestamp: `2026-04-19T00:26:54Z`
- Baseline: `integration/agrodomain-n5-baseline-sparse@cd254ff7c2658cdf2d7ced07d8bcc2bb3dfea729`
- Web lane input: completed N5 web lane outputs from `5592f401` (snapshot worktree `agrodomain-n5-web-cd254ff7`)
- Scope enforced: N5-Q1 only (`CJ-004`, `CJ-007`, `CJ-008`, `EP-008`, `DI-003`, `DI-006`) with mandatory `N1..N4` regression expectation

## N5-G1..N5-G5 matrix

| Gate | Status | Strict evidence |
| --- | --- | --- |
| `N5-G1` contract and boundary lock | `PASS` | `contracts/contracts-test.log` (`18 passed`), `contracts/contracts-generate.log`, `api/n5-route-inventory.log` |
| `N5-G2` finance decision accountability | `PASS` | `api/n5-focused-api.log` (`4 passed` aggregate includes finance replay + decision invariants), `playwright/playwright-n5-focused.log` (`CJ-004/CJ-008` pass desktop+mobile) |
| `N5-G3` insurance trigger provenance | `PASS` | `api/n5-focused-api.log` (insurance trigger/dedupe coverage), `playwright/playwright-n5-focused.log` (finance decision journey checks) |
| `N5-G4` traceability continuity | `PASS` | `api/n5-focused-api.log` (traceability continuity + ordering checks), `playwright/playwright-n5-focused.log` (`CJ-007` timeline pass desktop+mobile) |
| `N5-G5` decision-surface + regression integrity | `FAIL` | `regression/playwright-regression-n1-n4.log` (`10 passed`, `6 failed`) |

## Final tranche decision

`FAIL` (N5 tranche remains open).

Finance/insurance/traceability surfaces for N5-Q1 are green in focused API and focused Playwright proof. Final closeout remains blocked because regression expectation is not met in the same rerun pack.

## Regression blocker detail (N5-G5)

- Regression suite executed `16` tests, result `10 passed`, `6 failed`.
- Failing specs:
  - `tests/e2e/advisory-climate-gate.spec.ts` on desktop and mobile (proof screenshot crash path in Chromium).
  - `tests/e2e/buyer-discovery.spec.ts` on desktop and mobile (`ECONNREFUSED 127.0.0.1:8000` while seeding identity session).
  - `tests/e2e/negotiation.spec.ts` on desktop and mobile (`ECONNREFUSED 127.0.0.1:8000` while seeding identity session).

## Notes on claim mismatch

Input claim said N1-N4 rerun was green (`16/16`). This isolated rerun evidence does not reproduce that outcome; the artifact above is the authoritative result for this closeout run.
