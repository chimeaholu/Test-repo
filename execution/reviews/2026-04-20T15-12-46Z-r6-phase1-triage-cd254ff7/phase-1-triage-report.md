# R6 Phase 1 Triage Report

- Timestamp: `2026-04-20T15:12:46Z`
- Worktree: `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7`
- Scope: Phase 1 triage only
- Code changes: `none`
- Decision: `TRIAGE COMPLETE`

## Controlling evidence

- Active API typecheck reproduction:
  - `apps/api`: `python3 -m mypy app tests scripts`
  - `execution/reviews/2026-04-20T11-47-24Z-r6-gate-refresh-cd254ff7/phase-b/typecheck/repo-typecheck.log`
- Historical failing API package test artifact:
  - `execution/reviews/2026-04-20T11-47-24Z-r6-gate-refresh-cd254ff7/phase-b/api/api-tests.log`
- Current API package test rerun:
  - `apps/api`: `python3 ./scripts/quality_gate.py test`
  - result in this run: `65 passed`
- Browser/admin failure evidence:
  - `execution/reviews/2026-04-20T11-47-24Z-r6-gate-refresh-cd254ff7/phase-c/playwright/playwright-full-matrix.log`
  - `execution/reviews/2026-04-20T11-47-24Z-r6-gate-refresh-cd254ff7/phase-c/playwright/full-matrix/test-results/**/error-context.md`

## A. API typecheck errors blocking R6

### Status

- `ACTIVE`
- Current direct reproduction still reports `35` mypy errors in `8` files.

### File-level root causes

1. `apps/api/app/services/commands/handlers.py`
   - This is the dominant cluster.
   - Root cause: repository reads that return `T | None` are reassigned into variables later treated as guaranteed concrete records. Mypy rejects that pattern repeatedly.
   - Root cause: dynamic command payload values stay typed as `object`, then get passed straight into `float(...)`, `int(...)`, or repository methods that expect concrete scalar types.
   - Root cause: narrow concrete containers such as `dict[str, str | None]` and `list[dict[str, bool | str | None]]` are passed into repository contracts typed as `dict[str, object]` and `list[dict[str, object]]`. The failure is invariance, not runtime behavior.
   - Root cause: route/runtime strings are passed into repository methods that expect narrower literals.
   - Representative failing lines from the current mypy log:
     - `658`, `763`, `772`: numeric coercion from `object`
     - `831`, `1105`, `1398`, `1432`, `1467`, `1519`, `1565`, `1619`, `1683`, `1751`, `1915`, `2040`, `2153`, `2357`, `2376`, `2417`: optional repository returns reused as concrete records
     - `969`, `988`, `2487`: invariant container mismatches
     - `1166`, `1170`: broader `str | None` and plain `str` passed where repository contracts require stricter shapes

2. `apps/api/app/modules/advisory/runtime.py`
   - Root cause: helper output is still broad enough that mypy sees iterated values as `object`, so iteration and `.lower()` are not type-safe.
   - Failing lines: `78`, `337`.

3. `apps/api/app/modules/analytics/runtime.py`
   - Root cause: `admin_observation` is still typed as `TelemetryObservationRecord | None` at the dereference site. The guard is not strong enough for mypy to prove non-nullability.
   - Failing line: `145`.

4. `apps/api/app/api/routes/marketplace.py`
   - Root cause: route locals are widened beyond the repository return signatures.
   - The route treats results as `list[ListingProjection]` / `ListingProjection | None`, but the code path still receives `list[Listing]` / `Listing | None` in the type system.
   - Failing lines: `152`, `184`.

5. `apps/api/app/api/routes/wallet.py`
   - Root cause: `notification_payload` is assembled as `dict[str, str]`, but the repository contract accepts `dict[str, object] | None`.
   - Failing line: `292`.

6. `apps/api/app/api/routes/admin.py`
   - Root cause: the route passes `settings.environment` into helpers that require `RuntimeEnvironment` literals; mypy still sees the argument as plain `str` at these call sites.
   - Failing lines: `85`, `140`, `338`.

7. `apps/api/app/services/commands/bus.py`
   - Root cause: `degraded_reason_codes` remains typed as `object` at the indexing site.
   - Failing line: `363`.

8. `apps/api/tests/contract/test_control_plane_contract_integrity.py`
   - Root cause: the test indexes `exc.detail` as if it were already a dictionary, but FastAPI exposes a broader union there. The test lacks a shape assertion that narrows `detail` before indexing.
   - Failing line: `49`.

### Triage conclusion

- The typecheck blocker is real and current.
- The debt is concentrated, not random:
  - optional repository returns are not narrowed once and kept narrow
  - container annotations are too specific at call sites
  - `object`-typed payload fragments are not normalized before use
  - a small number of route/test files are drifting from stricter contracts

## B. API unit test `tests/unit/test_system.py::test_settings_loading_uses_typed_settings`

### Status

- `NOT CURRENTLY REPRODUCING`
- Historical R6 artifact shows a real failure.
- Current direct rerun of the single test passes.
- Current full `apps/api` package rerun also passes: `65 passed`.

### Evidence split

1. Historical failing evidence
   - `execution/reviews/2026-04-20T11-47-24Z-r6-gate-refresh-cd254ff7/phase-b/api/api-tests.log`
   - Failure recorded there:
     - expected `['2026-04-18.wave1', '2027-01-01.wave1']`
     - got `['2026-04-18.wave1']`

2. Current code and rerun evidence
   - `apps/api/app/core/config.py`
   - `apps/api/tests/unit/test_system.py`
   - Current direct validation now preserves the explicit comma-delimited `allowed_schema_versions`.
   - Current `python3 ./scripts/quality_gate.py test` passes without reproducing the failure.

### File-level triage finding

1. `apps/api/app/core/config.py`
   - Current code does not reproduce the failure in this environment.
   - `Settings.model_validate(...)` now retains `allowed_schema_versions` in `model_fields_set`, and the current run preserved both schema versions.

2. `apps/api/tests/unit/test_system.py`
   - The assertion is still valid.
   - The test is acting as a regression detector, not as the cause of the problem.

### Triage conclusion

- This blocker is stale in the current worktree state.
- It should not be treated as an active Phase 1 code root cause unless it reappears under a fresh gate rerun.
- The right posture is:
  - keep the historical failing artifact in the record
  - mark the unit-test blocker as `resolved or non-reproducible in current tree`
  - do not spend Phase 2 time on it unless it fails again

## C. Playwright browser/admin failures and admin `403`

### Status

- `ACTIVE`
- Browser failures still have current actionable product/test drift.
- The later `ERR_CONNECTION_REFUSED` tail is harness collapse noise after earlier failures.

### File-level root causes

1. `apps/web/features/admin/admin-analytics-workspace.tsx`
   - Root cause: the component performs authenticated fetches to admin endpoints and immediately calls `response.json()` without checking `response.ok`.
   - When the API returns `403`, the component does not branch on authorization failure. It continues with incomplete payloads and leaves the surface in loading/default state.
   - This matches the historical browser log, which contains repeated `403 Forbidden` responses for:
     - `/api/v1/admin/analytics/health`
     - `/api/v1/admin/observability/alerts`
     - `/api/v1/admin/rollouts/status`
     - `/api/v1/admin/audit/events`
     - `/api/v1/admin/release-readiness`

2. `apps/web/features/admin/admin-analytics-workspace.tsx` versus `tests/e2e/n6-admin-observability.spec.ts`
   - Root cause: heading contract drift.
   - The component renders the primary accessible heading as `Platform health and release posture` on the admin workspace and `SectionHeading` content that does not match the Playwright expectation `Service health`.
   - The test is checking a heading that the current page does not expose.

3. `tests/e2e/n6-admin-observability.spec.ts`
   - Root cause: the second assertion uses `getByText(/Actor attribution|Audit history|Country scope/i)` in strict mode.
   - The page currently contains all three strings, so the locator resolves to multiple elements and fails because the assertion is ambiguous, not because the route is missing content.
   - This is a test-harness defect, not a product defect.

4. `apps/web/app/onboarding/consent/page.tsx` and `tests/e2e/auth-consent.spec.ts`
   - Root cause: copy contract drift.
   - The consent page heading is `Review the consent terms`, but the current snapshot in the historical failure packet shows `Review access before the workspace opens` on the rendered page at failure time.
   - That mismatch explains the failing auth/consent assertion recorded in the R6 evidence pack.
   - Current file content shows the test contract and route file are now aligned, which makes this a stale browser artifact rather than a current product blocker.

5. `apps/web/features/advisory/conversation-workspace.tsx` and `apps/web/lib/content/route-copy.ts` versus `tests/e2e/advisory-climate-gate.spec.ts`
   - Root cause: proof-copy drift.
   - Historical browser evidence shows the advisory page text changed from `reviewer posture` to `reviewer status` in the failing packet.
   - Current source now reads `Every response keeps citations, confidence, and reviewer posture visible before anyone treats it as field advice.`
   - That indicates the old failure packet is partly stale, but the test contract has been brittle to exact prose.

6. `apps/web/features/climate/climate-dashboard.tsx` versus `tests/e2e/advisory-climate-gate.spec.ts`
   - Root cause: proof-copy drift.
   - Historical failure snapshot shows `acknowledgement status` instead of the test string `acknowledgement state`.
   - Historical snapshot also shows `Evidence and method references` while the test expects `Assumptions and method references`.
   - The climate route failures in the archived packet are therefore driven by exact copy mismatch, not by missing route implementation.

7. `tests/e2e/helpers.ts`
   - Root cause: once the server falls over later in the matrix, `gotoPath()` records only `ERR_CONNECTION_REFUSED` retries. Those later failures are downstream harness fallout, not primary product signal.
   - This file is not the source of the earlier product mismatches; it just amplifies them after the web server stops serving.

### Admin `403` behavior: best current root-cause statement

- The `403` behavior is real in the historical R6 gate packet.
- The most defensible file-level cause from current source is:
  - `apps/web/features/admin/admin-analytics-workspace.tsx` does not handle non-OK admin responses, so authorization failures degrade into misleading loading/default UI.
- `apps/api/app/api/routes/admin.py` is the server-side surface enforcing those `403`s.
- I did not find a single currently reproducible code-path proof in this triage run that isolates whether the original `403` came from:
  - role mismatch
  - stale token/session alignment
  - or missing operator scope
- What is safe to say from the code and artifacts:
  - the API is the component emitting the `403`
  - the frontend is not resilient to that response
  - the admin Playwright packet also contains separate test-contract mismatches that must not be conflated with the `403`

## Phase 1 outcome

### Active blockers

1. `ACTIVE`: API mypy debt in `8` files, dominated by `apps/api/app/services/commands/handlers.py`
2. `ACTIVE`: browser/admin contract drift and admin-surface response handling

### Stale or non-reproducing blockers

1. `STALE / NON-REPRODUCING`: `tests/unit/test_system.py::test_settings_loading_uses_typed_settings`
2. `STALE / PARTLY STALE`: older auth/advisory/climate copy failures from the archived R6 packet

## Recommended next phase scope

1. Close the `35` current mypy errors only.
2. Re-run the focused admin/advisory/climate Playwright slices after typecheck closure.
3. Treat the unit-test issue as closed unless a fresh gate rerun reopens it.
