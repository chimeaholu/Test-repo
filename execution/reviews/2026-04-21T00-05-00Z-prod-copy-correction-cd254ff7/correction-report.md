# Correction Report

- Timestamp (UTC): `2026-04-21T00:05:00Z`
- Status: `CORRECTIONS IMPLEMENTED / REDEPLOY BLOCKED`

## Product-copy corrections implemented

Updated customer-facing copy/design surfaces to remove internal rollout language:

- homepage
- sign-in
- consent
- shell loading and protected shell framing
- role-home
- negotiation workspace
- advisory workspace
- climate workspace
- admin analytics
- offline conflict recovery

Representative replacements:

- `Sign in to the right workspace without skipping access controls.` -> `Open the right workspace with trust checks visible from the first screen.`
- `Review the consent terms` -> `Review access before the workspace opens`
- `Grounded guidance with reviewer state` -> `Review evidence-backed recommendations`
- `Live alert triage with visible degraded-mode posture` -> `Monitor weather risk and field evidence with confidence in view`
- `Restoring route and contract state.` -> `Restoring your workspace and recent activity.`

## Hard release gates added

### Internal lexicon guard

Added `apps/web/scripts/verify-product-copy.mjs` and wired it into:

- `corepack pnpm --filter @agrodomain/web typecheck`
- `corepack pnpm --filter @agrodomain/web test`

The guard now fails source builds when customer-facing source contains:

- `Wave`
- `W-001`
- `recovery seam`
- `internal contract`
- `canonical N2-A2 runtime`
- `contract state`

### Screenshot proof guard

Added `scripts/verify-release-proof.mjs`.

This now requires acceptance screenshots for:

- `/`
- `/signin`
- `/onboarding/consent`
- `/app/farmer`

on both:

- `desktop-critical`
- `mobile-critical`

## Focused corrections to proof harness

The route-proof harness had two false-negative issues and was corrected:

- label smoke check now accepts valid `label[for=id]` associations
- sign-in to consent transition now retries through cold-start timing instead of hard failing on a single slow route compile

## Verification status

Passed:

- `corepack pnpm --filter @agrodomain/web typecheck`
- `corepack pnpm --filter @agrodomain/web test`
- isolated Playwright rerun for climate gate on both desktop and mobile after stale expectation fix

Not yet closed:

- focused/full Playwright matrix rerun still needs one clean, archived end-to-end pass after the latest proof-harness fixes
- local proof-pack generation was re-run after harness fixes and was still in progress at report time
- Railway GraphQL redeploy is blocked by Cloudflare `1010`

## Live proof currently captured

- production before-state: `output_to_user/live-production-home-before.png`
- canary before-state: `output_to_user/live-canary-signin-before.png`

These prove the live environments are still not acceptable release targets.
