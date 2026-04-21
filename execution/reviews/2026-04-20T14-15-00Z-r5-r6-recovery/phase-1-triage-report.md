# Phase 1 Blocker Triage

- Timestamp: `2026-04-20T14:15:00Z`
- Scope: `R5 retry 0b30e0af` and `R6 gate c7c0a78b` recovery
- Decision: `TRIAGE COMPLETE`

## A. API typecheck blocker (`35` errors)

### Root-cause clusters

1. `apps/api/app/services/commands/handlers.py`
   - This file holds the bulk of the debt.
   - Root cause: optional repository lookups are reused under names later treated as guaranteed concrete records, so mypy does not preserve the earlier `None` guard across reassignment-heavy branches.
   - Root cause: multiple `dict[str, object]` payloads are assembled with narrower concrete value types (`dict[str, str | None]`, `dict[str, str]`, `list[dict[str, bool | str | None]]`), which is rejected because `dict` is invariant.
   - Root cause: dynamic payload fragments are typed as generic `object`, then immediately passed into `float()`/`int()` or repository methods expecting stricter literal/string types.
   - Representative failures:
     - `658`, `763`, `772`: numeric coercions from `object`
     - `831`, `1105`, `1398`, `1432`, `1467`, `1519`, `1565`, `1619`, `1683`, `1751`, `1915`, `2040`, `2153`, `2357`, `2376`, `2417`: optional repository return values later treated as concrete records
     - `969`, `988`, `2487`: invariant `dict` / `list[dict]` payload shape mismatches
     - `1166`, `1170`: `actor_role` and `milestone` passed with types broader than repository contract

2. `apps/api/app/modules/advisory/runtime.py`
   - Root cause: `_string_list(...)` currently returns values typed broadly enough that iterating and calling `.lower()` on the result of `policy_context.get(...)` is seen as iterating over `object`.
   - Failing points: `78`, `337`.

3. `apps/api/app/modules/analytics/runtime.py`
   - Root cause: mypy does not narrow `admin_observation` after `evaluate_observation(...)`; `last_recorded_at` still dereferences a possibly-`None` observation.
   - Failing point: `145`.

4. `apps/api/app/api/routes/marketplace.py`
   - Root cause: route locals are typed as mixed unions that do not match actual repository signatures.
   - `list_published_listings()` already returns `list[ListingProjection]`, but the route widens it to `list[Listing | ListingProjection]`.
   - `get_published_listing()` already returns `ListingProjection | None`, but the route widens it unnecessarily.
   - Failing points: `152`, `184`.

5. `apps/api/app/api/routes/wallet.py`
   - Root cause: `notification` is built as `dict[str, str]` even though repository contract accepts `dict[str, object] | None`.
   - Failing point: `292`.

6. `apps/api/app/api/routes/admin.py`
   - Root cause: `Settings.environment` is typed as plain `str`, but the rollout/country-runtime helpers require `RuntimeEnvironment` literals.
   - The runtime behavior is already normalized; the typing failure is from the config model not exposing the narrower literal type.
   - Failing points: `85`, `140`, `338`.

7. `apps/api/app/services/commands/bus.py`
   - Root cause: `degraded_reason_codes` is typed as `list[object]`, then indexed and stringified. Mypy rejects indexing because the source expression remains `object`-typed before the cast settles.
   - Failing point: `363`.

8. `apps/api/tests/contract/test_control_plane_contract_integrity.py`
   - Root cause: `exc.detail` is cast to `dict[str, object]`, but mypy still sees `detail` as potentially string-like when indexing because FastAPI’s exception detail surface is broad. The test needs an explicit runtime shape assertion before dictionary indexing.
   - Failing point: `49`.

### Triage conclusion

- This is not eight unrelated defects.
- It is one concentrated typing drift cluster caused by:
  - overly broad config/runtime types
  - optional repository returns not being narrowed once and held in dedicated variables
  - invariant `dict` payload annotations that are too narrow at call sites
  - a few tests/helpers that assume broad FastAPI/Pydantic surfaces are already typed

## B. API unit regression: `test_settings_loading_uses_typed_settings`

### Root cause

- File: `apps/api/app/core/config.py`
- Failing test: `apps/api/tests/unit/test_system.py::test_settings_loading_uses_typed_settings`
- Current behavior:
  - `Settings.model_validate({... "allowed_schema_versions": "v1,v2" ...})` first parses the comma-delimited string into a list via `_coerce_schema_versions`.
  - `model_post_init()` then overwrites `allowed_schema_versions` unless `"allowed_schema_versions"` is present in `self.model_fields_set`.
- Root cause:
  - under direct `model_validate(...)`, the field validator runs, but `model_fields_set` does not preserve the original string input in a way this post-init branch relies on.
  - the post-init environment-profile overlay therefore treats the caller-provided field as absent and replaces it with the profile default (`["2026-04-18.wave1"]`).

### Resulting failure

- The explicit second schema version (`"2027-01-01.wave1"`) is dropped.
- This is a real settings bug, not a flaky test.

## C. Browser/admin route failures and admin `403`

### Real product defects before harness collapse

1. `apps/web/features/admin/admin-analytics-workspace.tsx`
   - Root cause: the page issues authenticated fetches to admin endpoints but never handles `403`/`401` as an authorization-state defect.
   - In the current matrix log the requests hit:
     - `/api/v1/admin/analytics/health`
     - `/api/v1/admin/observability/alerts`
     - `/api/v1/admin/rollouts/status`
     - `/api/v1/admin/audit/events`
     - `/api/v1/admin/release-readiness`
   - All return `403` repeatedly.
   - The UI then falls back to generic loading/error behavior, so the tests never see the intended admin proof surface.

2. `apps/web/features/admin/admin-analytics-workspace.tsx` vs Playwright expectations
   - Root cause: the page visibly contains the text `Service health`, but only as KPI label text inside an `article`, not as an accessible heading.
   - The browser gate expects `getByRole("heading", { name: "Service health" })`.
   - This is a direct UI-contract mismatch.

3. `apps/web/features/advisory/conversation-workspace.tsx` and `apps/web/lib/content/route-copy.ts`
   - Root cause: copy and heading text diverged from the Playwright contract.
   - Example:
     - test expects text containing `reviewer state`
     - current copy says `reviewer status`
   - The route is live, but the exact proof strings the gate relies on are no longer present.

4. `apps/web/features/climate/climate-dashboard.tsx`
   - Root cause: route text differs from the checked contract copy.
   - Examples:
     - test expects heading `Assumptions and method references`
     - page renders `Evidence and method references`
     - test expects `IPCC Tier 2 Annex 4`
     - rendered source references are driven by normalized runtime data and currently do not guarantee that exact token

5. `apps/web/features/listings/listing-slice.tsx`
   - Root cause: seller and buyer marketplace flows are alive, but later tests depend on exact form labels and headings after chained auth/session recovery. Once admin failures accumulate, listing tests are also exposed to degraded session/server state.
   - The earlier failures do not prove the listing route is fundamentally broken; they prove the full-matrix packet is no longer reliable after the admin lane.

### Admin `403` file-level cause

1. Server-side authorization surface: `apps/api/app/api/routes/admin.py`
   - Admin routes require both:
     - role in `READ_ROLES` / `MUTATION_ROLES`
     - consent scopes via `_require_scope(...)`
   - The repeated `403` responses mean the authenticated actor is present but missing required scope material from the API’s perspective.

2. Frontend/session handoff surface:
   - `tests/e2e/r4-route-completion.spec.ts`
   - `tests/e2e/r5-ux-hardening.spec.ts`
   - `tests/e2e/helpers.ts`
   - `apps/web/components/app-provider.tsx`
   - Root cause:
     - tests seed local storage directly, then rely on app bootstrap and live API fetches to stay aligned
     - admin route access is more stringent than generic protected-route access
     - the page works only if the token-backed server session and the locally seeded session stay fully consistent, including consent scopes
   - The controlling log shows the API, not the client router, is issuing the `403`, so the blocker is authorization-state alignment rather than a missing route file.

### Harness-only failures after the real defects

1. `execution/reviews/2026-04-20T11-47-24Z-r6-gate-refresh-cd254ff7/phase-c/playwright/playwright-full-matrix.log`
   - After the initial app failures, the log transitions into repeated:
     - `page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3020/...`
   - That part is harness collapse, not additional product root cause.
   - Once the web server dies, every remaining route is `FAIL / unproven` rather than actionable signal.

### Triage conclusion

- The browser packet contains three actionable blockers:
  1. admin API authorization alignment causing repeated live `403`
  2. admin analytics page not satisfying the heading/accessibility contract the tests enforce
  3. advisory/climate copy drift from the proof contract
- The later connection-refused tail is downstream harness noise and should not drive product edits.

## Phase 2 minimal-fix scope

1. Fix settings parsing so explicit `allowed_schema_versions` survive `model_validate(...)`.
2. Eliminate the 35 type errors with targeted typing/narrowing fixes only.
3. Align admin/advisory/climate browser surfaces to the existing Playwright contract.
4. Fix the admin authorization-state mismatch if it reproduces after the type/settings fixes.
