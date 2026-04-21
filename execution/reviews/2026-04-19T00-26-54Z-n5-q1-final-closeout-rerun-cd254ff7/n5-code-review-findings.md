# N5 Adversarial Code Review Findings (Final Closeout Rerun)

Scope: `N5-Q1` review lane only; no implementation beyond QA harness/evidence.

## Findings (ordered by severity)

1. `HIGH` Regression harness stability risk blocks gate reliability
   - Evidence: `regression/playwright-regression-n1-n4.log` fails `6/16`, including `ECONNREFUSED` against `127.0.0.1:8000` during seeded auth setup.
   - Impact: closeout gate can fail due runtime/process instability in shared regression flow, independent of N5 feature correctness.

2. `HIGH` Chromium proof-capture crash path still active in advisory regression
   - Evidence: `regression/playwright-regression-n1-n4.log` shows crash in advisory test screenshot step (`page.screenshot`, `SEGV_MAPERR`).
   - Impact: proof artifact capture can terminate browser context and poison downstream suite reliability.

3. `MEDIUM` N5 focused assertions are valid only under isolated environment controls
   - Evidence: focused run in `playwright/playwright-n5-focused.log` passes `4/4` under isolated ports; prior default-port executions in this lane had stale-process contamination.
   - Impact: without strict isolation, results can become non-deterministic and produce false tranche signals.

## Positive confirmations

- Contracts and API checks remain green for N5 scope:
  - `contracts/contracts-test.log` (`18 passed`)
  - `api/n5-focused-api.log` (`4 passed`)
- Focused tranche Playwright is green:
  - `playwright/playwright-n5-focused.log` (`4 passed`, CJ-004/CJ-007/CJ-008 journey proof desktop+mobile).
