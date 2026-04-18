# Agrodomain Staging Readiness Remediation Report

Date: 2026-04-13
Timestamp (UTC): `2026-04-13T17:47:04Z`
Project: `/mnt/vault/MWH/Projects/Agrodomain`
Prior gate: `execution/reviews/2026-04-13T17-31-22Z-staging-e2e-gate-report.md`
Scope: unblock staging E2E prerequisites without pushing or deploying

## Outcome

Verdict: `LOCAL BLOCKERS CLEARED / EXTERNAL DEPLOY INPUTS STILL REQUIRED`

The repository now contains a runnable integrated staging runtime, deterministic seed/teardown tooling, persisted-state verification hooks, a non-secret env contract, and an exercised Playwright suite for desktop and mobile critical journeys. The remaining blockers are external, not code gaps inside this repository: no actual staging host URL was provisioned, no real non-production secrets were injected, and no deploy was executed under the task constraint.

## Remediation Matrix

| Original blocker | Status now | Evidence |
| --- | --- | --- |
| No staging deployment manifest/config or runtime entrypoint | `PARTIAL` | Added `pyproject.toml`, `Dockerfile`, `Procfile`, `railway.json`, and runnable module `src/agro_v2/staging_runtime.py`. Actual host URL/deploy still external. |
| No runnable integrated web application surface | `CLEARED` | Live FastAPI runtime exposes `/healthz`, `/signin`, auth-backed `/app/*` routes, action hooks, and verification APIs. |
| Auth path modeled but not wired to a live runtime | `CLEARED (staging harness)` | Cookie-signed staging auth flow implemented at `/auth/test-login` with role redirects and protected routes. Real secrets still need injection. |
| Deterministic staging seed + teardown absent | `CLEARED` | Added `scripts/staging_seed.py` and `scripts/staging_teardown.py`, both backed by canonical stable IDs and idempotent behavior. |
| Browser E2E runner incomplete for deployed execution | `CLEARED` | Added `package.json`, `playwright.config.ts`, and `tests/e2e/critical-journeys.spec.ts`; local desktop+mobile run passed. |
| Project-specific env/secrets contract absent | `PARTIAL` | Added `.env.example` with staging/runtime/Playwright key contract; actual secret values and host injection remain external. |
| No DB/API persisted-state verification path | `CLEARED` | Added `scripts/verify_staging_state.py` and runtime endpoints `/api/e2e/state/checks` and `/api/e2e/state/checks/{check}`. |

## Artifacts Added

### Runtime + deploy scaffolding

- `pyproject.toml`
- `Dockerfile`
- `Procfile`
- `railway.json`
- `src/agro_v2/staging_runtime.py`

### Environment contract

- `.env.example`

### Deterministic E2E operations

- `scripts/staging_seed.py`
- `scripts/staging_teardown.py`
- `scripts/verify_staging_state.py`
- `tests/test_staging_runtime.py`

### Browser E2E scaffolding

- `package.json`
- `package-lock.json`
- `playwright.config.ts`
- `tests/e2e/critical-journeys.spec.ts`

### Hygiene

- `.gitignore`

## Validation Evidence

### Python contract validation

Command:

```bash
python3 -m pytest -q tests/test_staging_runtime.py
```

Result:

- `3 passed in 1.26s`

### Seed / idempotency / teardown proof

Commands:

```bash
PYTHONPATH=src python3 scripts/staging_seed.py --state-path .staging/test-runtime-state.json
PYTHONPATH=src python3 scripts/staging_seed.py --state-path .staging/test-runtime-state.json
PYTHONPATH=src python3 scripts/staging_teardown.py --state-path .staging/test-runtime-state.json
```

Observed results:

- Canonical seed emitted stable IDs for `listing-001`, `listing-draft-001`, `negotiation-001`, `escrow-001`, `advisory-001`, `finance-case-001`, `insurance-trigger-001`, `consignment-001`
- Repeat seed on the same state path returned `idempotent: true`
- Teardown returned `verification_passed: true`

### Live runtime smoke

Local runtime started with:

```bash
PYTHONPATH=src AGRODOMAIN_STAGING_PORT=8011 AGRODOMAIN_STATE_PATH=.staging/http-runtime-state.json python3 -m agro_v2.staging_runtime
```

Runtime evidence:

- `GET /healthz` returned `ok: true`
- `POST /api/e2e/seed?profile=e2e-critical` succeeded
- `/auth/test-login` established an auth-backed browser session
- Critical action hooks completed successfully
- Final verification endpoint returned `full-critical -> passed: true`

### Playwright execution

Command:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:8011 PLAYWRIGHT_ARTIFACT_DIR=execution/reviews/2026-04-13T18-30-00Z-staging-e2e-evidence npx playwright test
```

Result:

- `6 passed (9.0s)`
- Coverage executed on both `desktop-critical` and `mobile-critical`

Artifact paths:

- `execution/reviews/2026-04-13T18-30-00Z-staging-e2e-evidence/html-report/index.html`
- `execution/reviews/2026-04-13T18-30-00Z-staging-e2e-evidence/test-results/.last-run.json`

## What Still Requires External Inputs

1. Actual staging deploy target and canonical host URL
   - The repo is now deployable in principle, but no platform project/remote/URL was provisioned here.

2. Real non-production secrets
   - Needed at minimum for `AGRODOMAIN_AUTH_SECRET`, `AGRODOMAIN_E2E_VERIFY_KEY`, and any real downstream adapters if the staging runtime is pointed at them.

3. Platform-side environment injection and deploy execution
   - The task constraint explicitly prohibited deploy/push, so the manifests were prepared but not exercised against Railway/Vercel/other remote infra.

4. Real service bindings, if desired beyond harness mode
   - `.env.example` includes Supabase and comms adapter placeholders. These remain intentionally unset.

## Recommendation

The repo is no longer blocked by missing runtime, seed, verification, or browser-runner scaffolding. The next gate should be:

1. inject non-production staging secrets
2. deploy this runtime to the chosen staging target
3. set the canonical `PLAYWRIGHT_BASE_URL`
4. re-run the Playwright suite against the real staging host
5. archive the remote evidence bundle beside the local proof above
