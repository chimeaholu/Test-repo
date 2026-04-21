# Phase 4 Subphase 4: Full Playwright Production-Mode Matrix

- Timestamp: `2026-04-20T16:30:56Z`
- Command log: `phase-4/playwright-full-matrix.log`
- Result payload: `phase-4/full-matrix/results.json`

## Aggregate Before/After Counts

- Prior controlling packet (`2026-04-20T15-34-08Z`): `17 passed / 23 failed`
- Phase 4 rerun (`2026-04-20T16-05-00Z`): `23 passed / 17 failed`
- Net delta: `+6 passed`, `-6 failed`

## Family Before/After (Device-Run Failures)

- `marketplace`: `2/4 -> 2/4` (no net change, still red)
- `n5 finance`: `1/4 -> 1/4` (no net change, still red)
- `n6 admin observability`: `3/4 -> 1/4` (improved, still red)
- `negotiation`: `2/2 -> 2/2` (no net change, still red)
- `r4 route completion`: `5/6 -> 5/6` (no net change, still red)
- `r5 ux hardening`: `6/6 -> 3/6` (improved, still red)
- `recovery`: `4/4 -> 2/4` (improved, still red)

## Additional Observed Regression

- `advisory-climate` `CJ-006` regressed from full `PASS` to desktop `FAIL`.
- Strict matrix policy treats this as blocking.

## Matrix Verdict

- `FAIL` (strict no-false-pass retained).
