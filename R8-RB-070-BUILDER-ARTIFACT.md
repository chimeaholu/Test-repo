# R8 RB-070 Builder Artifact

## Scope

Implemented the RB-070 load-testing lane for the current AgroDomain API, including benchmark harness creation, seeded scenario data, performance execution, bottleneck analysis, and safe backend remediations where the failures were actionable.

Delivered:

- realistic marketplace and mixed-workload load scripts
- isolated benchmark database preparation and orchestration
- external Postgres benchmark-profile support with isolated schema resets
- pooler-compatible schema routing and Postgres seeding/runtime fixes
- runtime/process fixes for multi-worker API execution
- batched read-path fixes across marketplace, farm, climate, wallet, fund, and transport surfaces
- final marketplace browse revision batching and climate degraded-mode batching
- SQLite temp-store/cache tuning and targeted read-order indexes
- WAL/checkpoint tuning for the write path
- wallet transfer concurrency hardening to eliminate reproducible 5xx failures
- final report in `docs/load-test-report.md`
- execution-ready Postgres remediation plan in `docs/r8-rb070-postgres-runtime-plan.md`

## Files Changed

- `tests/load/harness.mjs`
- `tests/load/marketplace-load.js`
- `tests/load/mixed-workload.js`
- `tests/load/prepare_benchmark_db.py`
- `tests/load/run_rb070.py`
- `apps/api/pyproject.toml`
- `apps/api/app/core/config.py`
- `apps/api/start.sh`
- `Procfile`
- `apps/api/Dockerfile`
- `apps/api/app/core/db.py`
- `apps/api/app/db/migrations/env.py`
- `apps/api/app/seed_demo_data.py`
- `apps/api/tests/conftest.py`
- `apps/api/app/api/routes/marketplace.py`
- `apps/api/app/api/routes/farm.py`
- `apps/api/app/api/routes/climate.py`
- `apps/api/app/api/routes/wallet.py`
- `apps/api/app/api/routes/fund.py`
- `apps/api/app/api/routes/transport.py`
- `apps/api/app/db/repositories/marketplace.py`
- `apps/api/app/db/repositories/farm.py`
- `apps/api/app/db/repositories/climate.py`
- `apps/api/app/db/repositories/ledger.py`
- `apps/api/app/db/repositories/fund.py`
- `apps/api/app/db/repositories/transport.py`
- `docs/load-test-report.md`
- `docs/r8-rb070-postgres-runtime-plan.md`

## Checks Run

- `python3 tests/load/run_rb070.py --tag baseline`
- `python3 tests/load/run_rb070.py --tag fixed-runtime`
- `python3 tests/load/run_rb070.py --tag fixed2`
- `python3 tests/load/run_rb070.py --tag fixed3`
- `python3 tests/load/run_rb070.py --tag fixed4`
- `python3 tests/load/run_rb070.py --tag fixed5`
- `python3 tests/load/run_rb070.py --tag fixed6`
- `python3 tests/load/run_rb070.py --tag postgres-parity --database-url 'postgresql://postgres.bfklsgyuipjkxilxtfvt:<redacted>@aws-1-us-east-1.pooler.supabase.com:6543/postgres' --database-schema rb070_postgres_parity --web-concurrency 4`
- `python3 tests/load/run_rb070.py --help`
- `python3 tests/load/prepare_benchmark_db.py --database-url sqlite:////tmp/agrodomain-rb070-proof.db --context-out /tmp/agrodomain-rb070-proof-context.json`
- targeted wallet contention repro before fix
- targeted wallet contention repro after fix
- Postgres smoke:
  - `GET /healthz` -> `200`
  - `GET /api/v1/marketplace/listings` with seeded RB-070 token -> `200`
- `pytest apps/api/tests/unit/test_system.py apps/api/tests/integration/test_app_boot.py -q`
- `pytest apps/api/tests/integration/test_climate_runtime_integration.py apps/api/tests/unit/test_climate_runtime.py apps/api/tests/integration/test_wallet_transfer_routes.py apps/api/tests/integration/test_wallet_escrow_runtime.py apps/api/tests/unit/test_wallet_ledger_and_escrow.py -q`

Results:

- baseline: effectively failed under load because the runtime was single-worker
- `fixed4 -> fixed5` browse delta: `0.06%` errors / `p95 2860.9ms` / `p99 4210.2ms` / `114.93 rps` -> `0.00%` errors / `p95 1721.3ms` / `p99 2359.6ms` / `119.93 rps`
- `fixed4 -> fixed5` mixed delta: `31.82%` errors / `p50 914.4ms` / `113.43 rps` -> `14.77%` errors / `p50 1473.7ms` / `122.52 rps`
- `fixed5 -> fixed6` create delta: `1.56%` errors / `p99 5002.2ms` -> `0.39%` errors / `p99 3922.9ms`
- `fixed5 -> fixed6` mixed delta: `14.77%` errors / `p95 5012.1ms` / `p99 5383.4ms` -> `16.11%` errors / `p95 5069.3ms` / `p99 5179.4ms`
- `fixed3 -> fixed5` browse delta: `80.13%` errors / `p50 5012.7ms` / `p99 5280.2ms` -> `0.00%` errors / `p50 986.0ms` / `p99 2359.6ms`
- pooled Postgres browse parity: `85.16%` errors / `p50 5001.0ms` / `p99 5008.9ms` / `29.20 rps`
- pooled Postgres create parity: `100.00%` errors / `p50 5014.4ms` / `p99 5060.4ms` / `13.33 rps`
- pooled Postgres negotiation parity: `100.00%` errors / `p50 5002.7ms` / `p99 5047.9ms` / `5.33 rps`
- pooled Postgres wallet parity: `100.00%` errors / `p50 5001.8ms` / `p99 5023.6ms` / `2.67 rps`
- pooled Postgres mixed parity: `100.00%` errors / `p50 5029.7ms` / `p99 5159.5ms` / `52.00 rps`
- final run: no 5xx responses across any RB-070 phase
- wallet contention repro: improved from `155x 500` to `200x 200`
- SQLite benchmark preparation proof after the Postgres-profile changes: pass
- benchmark CLI now supports `--database-url`, `--database-schema`, and `--web-concurrency`
- `pytest apps/api/tests/unit/test_system.py apps/api/tests/integration/test_app_boot.py -q`: `6 passed`
- pytest: `11 passed`

## Readiness Notes

- The wallet transfer concurrency bug was a real backend defect and is fixed.
- Marketplace browse is no longer collapsing under load after batching published-revision lookups.
- The remaining blocker is long-tail timeout pressure in the current SQLite-backed runtime, not 5xx behavior.
- The PRD targets are still not met for browse-marketplace p99, create-listings, negotiation p99, and mixed 200-concurrent traffic.
- The final `fixed4`/`fixed5`/`fixed6` tuning window shows phase-tradeoff behavior: read-tuning helps browse/mixed, WAL tuning helps create, but no safe SQLite-native state gets the full bead green.
- The benchmark harness can now run against an external Postgres target without further code changes.
- The Postgres parity rerun completed against Supabase pooler project `bfklsgyuipjkxilxtfvt`, but it failed materially worse than the SQLite ceiling under load.
- Single-request Postgres smoke traffic succeeds; the failure mode appears only under RB-070 concurrency, where requests stall into the `5000ms` harness timeout ceiling and abort.

## Gate Readiness

RB-070 is not green. SQLite is no longer the only blocker. The exact residual blocker is now that the available pooled Postgres runtime profile also collapses under RB-070 concurrency:

- best observed browse `p99 2359.6ms`
- best observed create `p99 3922.9ms`, `0.39%` errors
- best observed negotiation `p99 3368.1ms`, non-zero errors
- best observed mixed `p95 5012.1ms`, `p99 5179.4ms`, `14.77%` errors
- pooled Postgres browse parity `85.16%` errors, `p99 5008.9ms`
- pooled Postgres create parity `100.00%` errors, `p99 5060.4ms`
- pooled Postgres negotiation parity `100.00%` errors, `p99 5047.9ms`
- pooled Postgres wallet parity `100.00%` errors, `p99 5023.6ms`
- pooled Postgres mixed parity `100.00%` errors, `p99 5159.5ms`

Recommendation: `NO-GO` for R8 closure on the current Supabase transaction-pooler profile. The next required move is direct Postgres connectivity from an IPv6-capable or colocated runtime, then one more RB-070 rerun on that direct profile.

Execution-ready next step:

- use `docs/r8-rb070-postgres-runtime-plan.md`
- switch the same benchmark command to a direct Postgres endpoint instead of `aws-1-us-east-1.pooler.supabase.com:6543`
- rerun RB-070 with `--database-url` and `--database-schema rb070_postgres_parity`
