# N6-Q1 Reliability Gate Report

- Timestamp: `2026-04-19T01:27:45Z`
- Baseline: `integration/agrodomain-n5-baseline-sparse@cd254ff7c2658cdf2d7ced07d8bcc2bb3dfea729`
- Scope: `N6-Q1` only for `B-028` reliability hardening, with mandatory `N1..N5` regression proof
- Decision: `FAIL / BLOCKED`

## Gate matrix

| Gate | Status | Evidence |
| --- | --- | --- |
| `N6-G2` Admin observability integrity | `FAIL` | `api/n6-focused-api.log`, `playwright/playwright-n6-focused.log` |
| `N6-G3` Rollout-control security and accountability | `FAIL` | `api/n6-focused-api.log`, `api/admin-route-inventory.log`, `playwright/playwright-n6-focused.log` |
| `N6-G4` Reliability hardening and regression integrity | `FAIL` for tranche, `PASS` for regression baseline | `regression/api-regression-n1-n5.log`, `regression/playwright-regression-n1-n5.log` |

## Focused N6 findings

1. Rollout control negative-path coverage is blocked by missing runtime surface.
   `api/admin-route-inventory.log` is empty, and `api/n6-focused-api.log` shows `404 Not Found` for `/api/v1/admin/rollouts/freeze` instead of a scoped rejection for missing actor scope and reason.

2. Silent alert-loss coverage is blocked by missing admin alert-feed surface.
   `api/n6-focused-api.log` shows `404 Not Found` for `/api/v1/admin/observability/alerts?country_code=GH`, so an operator-visible alert breach feed does not exist.

3. Stale analytics cannot be proven safe because the admin health surface is missing and the web route is placeholdered.
   `api/n6-focused-api.log` shows `404 Not Found` for `/api/v1/admin/analytics/health?country_code=GH`.
   `playwright/playwright-n6-focused.log` fails on both desktop and mobile because `/app/admin/analytics` does not expose a `Service health` heading or degraded telemetry evidence.
   The route implementation is still a `PlaceholderPage` in `apps/web/app/app/admin/analytics/page.tsx`.

4. Duplicate telemetry inflation protection cannot be verified because telemetry ingest/SLO seams are absent.
   `api/n6-focused-api.log` shows `404 Not Found` for `/api/v1/admin/observability/telemetry`, so dedupe behavior cannot be exercised.

5. Admin rollout controls are absent in the web surface.
   `playwright/playwright-n6-focused.log` fails on both desktop and mobile because `/app/admin` exposes no `Freeze rollout` control and no actor-attribution, audit-history, or country-scope posture.

6. The current admin home posture is still fixture-backed rather than live observability-backed.
   `apps/web/lib/fixtures.ts:231-234` hard-codes `Healthy services 18/20`, `Countries live 04`, and `PWA sync success 97.8%`, which means stale analytics could still render as healthy even before a live admin analytics route exists.

## Mandatory regression proof

- API regression: `26 passed, 4 deselected` in `regression/api-regression-n1-n5.log`
- Playwright regression: `24 passed` in `regression/playwright-regression-n1-n5.log`
- Result: `N1..N5` remain green in the gating run

## Blocker classification

| Blocker | Class | Basis |
| --- | --- | --- |
| `RB-01` Missing admin rollout-control API | `release-blocking` | No admin route inventory entry; rollout negative-path rejection cannot be validated |
| `RB-02` Missing admin alert-feed API | `release-blocking` | Silent alert-loss cannot be disproven without operator alert surface |
| `RB-03` Missing admin analytics health API | `release-blocking` | Stale/degraded analytics cannot be rendered or validated safely |
| `RB-04` Missing admin telemetry ingest/SLO API | `release-blocking` | Duplicate telemetry inflation and SLO dedupe cannot be proven |
| `RB-05` Placeholder admin analytics page | `release-blocking` | Desktop and mobile observability checks fail immediately |
| `RB-06` Missing admin rollout controls in web UI | `release-blocking` | No operator control, scope chip, or audit posture is present |

## QA conclusion

`N6-Q1` does not pass on this baseline. The reliability harness now encodes the Wave 6 requirements and the regression guardrail is green, but the admin observability and rollout-control runtime/surface work required by `N6-A1` and `N6-W1` is not yet present.
