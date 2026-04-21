# Phase 4 Subphase 1: Failure Clustering

- Timestamp: `2026-04-20T16:30:56Z`
- Scope: failing Playwright families from R6 controlling packet (`marketplace`, `n5 finance`, `n6 admin observability`, `negotiation`, `r4`, `r5`, `recovery`)
- Evidence inputs:
  - `phase-3/focused-families.log`
  - `phase-3/focused-families/results.json`
  - `phase-4/playwright-full-matrix.log`
  - `phase-4/full-matrix/results.json`
  - `phase-4/full-matrix/test-results/**/error-context.md`

## Top 3 Root Causes

1. **Auth/session collapse to `/signin` on protected navigation** (dominant).
   - Signal: `14/17` failing full-matrix cases render the sign-in page snapshot instead of protected route headings.
   - Affected families: `marketplace`, `n5 finance`, `n6`, `negotiation`, `r4`, `r5`, and parts of `recovery`.

2. **Offline retry assertion mismatch with actual queue state transitions**.
   - Signal: recovery offline seam failures expect `acked`, but UI shows `failed_retryable` after retry.
   - Affected family: `recovery`.

3. **Route readiness/heading availability instability after cross-route transitions**.
   - Signal: targeted route headings absent after URL-level navigation under production matrix load.
   - Affected families: `negotiation`, `r4`, `r5`, and one `advisory/climate` regression case.

## Notes

- The dominant failure class is no longer copy drift; it is runtime auth/session continuity under multi-journey matrix execution.
- A new non-scoped regression surfaced in `advisory-climate` (`CJ-006`) during the full rerun and is treated as blocking under strict no-false-pass rules.
