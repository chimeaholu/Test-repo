# N5-G5 Regression Remediation Summary

Date: `2026-04-19`

## Scope

- Restored the four reported regression lanes for:
- `tests/e2e/buyer-discovery.spec.ts`
- `tests/e2e/negotiation.spec.ts`
- Desktop and mobile

## Minimal fixes applied

1. Session boot hydration now seeds from valid local storage before async restore.
2. Async boot restore is ignored if the stored access token changed mid-flight.
3. Playwright workers were serialized to `1` because desktop and mobile were sharing one web/api/db stack and the combined run was non-deterministic even when the desktop negotiation lane passed in isolation.

Files touched:

- `apps/web/components/app-provider.tsx`
- `apps/web/lib/api/mock-client.ts`
- `playwright.config.ts`

## Focused verification

Command:

```bash
PLAYWRIGHT_ARTIFACT_DIR=execution/reviews/2026-04-18T23-36-28Z-n5-q1-final-gate-rerun-cd254ff7/remediation-focused-r3 \
corepack pnpm exec playwright test \
  tests/e2e/buyer-discovery.spec.ts \
  tests/e2e/negotiation.spec.ts \
  --project=desktop-critical \
  --project=mobile-critical
```

Result: `4 passed`

Artifacts:

- `execution/reviews/2026-04-18T23-36-28Z-n5-q1-final-gate-rerun-cd254ff7/remediation-focused-r3/results.json`
- `execution/reviews/2026-04-18T23-36-28Z-n5-q1-final-gate-rerun-cd254ff7/remediation-focused-r3/html-report/index.html`

## Full N1-N4 regression check

Command:

```bash
PLAYWRIGHT_ARTIFACT_DIR=execution/reviews/2026-04-18T23-36-28Z-n5-q1-final-gate-rerun-cd254ff7/regression-n1-n4-rerun \
corepack pnpm exec playwright test \
  tests/e2e/auth-consent.spec.ts \
  tests/e2e/buyer-discovery.spec.ts \
  tests/e2e/marketplace.spec.ts \
  tests/e2e/negotiation.spec.ts \
  tests/e2e/advisory-climate-gate.spec.ts \
  --project=desktop-critical \
  --project=mobile-critical
```

Result: `15 passed`, `1 failed`

Residual failure:

- `tests/e2e/advisory-climate-gate.spec.ts` on `mobile-critical`
- Failure mode: `page.screenshot: Protocol error (Page.captureScreenshot): Unable to capture screenshot`
- This is a screenshot-capture failure in the proof helper, not a buyer-discovery or negotiation functional regression.

Artifacts:

- `execution/reviews/2026-04-18T23-36-28Z-n5-q1-final-gate-rerun-cd254ff7/regression-n1-n4-rerun/results.json`
- `execution/reviews/2026-04-18T23-36-28Z-n5-q1-final-gate-rerun-cd254ff7/regression-n1-n4-rerun/html-report/index.html`

## Reference baseline

- N5 baseline worktree ref: `cd254ff7`
- Canonical vault repo HEAD used for reference: `55ce8674`
