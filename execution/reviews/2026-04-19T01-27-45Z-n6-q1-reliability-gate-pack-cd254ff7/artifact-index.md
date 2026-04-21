# Artifact Index — N6-Q1 Reliability Gate Pack

Root: `execution/reviews/2026-04-19T01-27-45Z-n6-q1-reliability-gate-pack-cd254ff7`

## Decision docs

- `n6-q1-gate-report.md`
- `artifact-index.md`

## Focused API evidence

- `api/n6-focused-api.log`
- `api/route-inventory.log`
- `api/admin-route-inventory.log`

## Focused Playwright evidence

- `playwright/playwright-n6-focused.log`
- `playwright/n6-focused/test-results/.last-run.json`
- `playwright/n6-focused/test-results/n6-admin-observability-N6--c45d3-and-degraded-state-evidence-desktop-critical/error-context.md`
- `playwright/n6-focused/test-results/n6-admin-observability-N6--c45d3-and-degraded-state-evidence-desktop-critical/test-failed-1.png`
- `playwright/n6-focused/test-results/n6-admin-observability-N6--1ccc0-ope-chips-and-audit-posture-desktop-critical/error-context.md`
- `playwright/n6-focused/test-results/n6-admin-observability-N6--1ccc0-ope-chips-and-audit-posture-desktop-critical/test-failed-1.png`
- `playwright/n6-focused/test-results/n6-admin-observability-N6--c45d3-and-degraded-state-evidence-mobile-critical/error-context.md`
- `playwright/n6-focused/test-results/n6-admin-observability-N6--c45d3-and-degraded-state-evidence-mobile-critical/test-failed-1.png`
- `playwright/n6-focused/test-results/n6-admin-observability-N6--1ccc0-ope-chips-and-audit-posture-mobile-critical/error-context.md`
- `playwright/n6-focused/test-results/n6-admin-observability-N6--1ccc0-ope-chips-and-audit-posture-mobile-critical/test-failed-1.png`

## Regression evidence

- `regression/api-regression-n1-n5.log`
- `regression/playwright-regression-n1-n5.log`
- `regression/playwright-n1-n5/test-results/.last-run.json`
- `regression/playwright-n1-n5/screenshots/desktop-critical-cj005-advisory-conversation.png`
- `regression/playwright-n1-n5/screenshots/desktop-critical-cj006-climate-dashboard.png`

## Blocker summary

- Release-blocking: missing admin rollout-control API surface
- Release-blocking: missing admin alert-feed API surface
- Release-blocking: missing admin analytics/SLO health API surface
- Release-blocking: missing admin telemetry ingest/dedupe API surface
- Release-blocking: admin analytics web route remains a placeholder
- Release-blocking: admin workspace lacks rollout controls, scope chips, and audit posture
- Regression status: `N1..N5` API + Playwright proofs remain green
