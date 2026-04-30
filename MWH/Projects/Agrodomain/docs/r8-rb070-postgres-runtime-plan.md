# RB-070 Postgres Runtime Plan

## Status

RB-070 cannot be cleared on the current SQLite runtime. The codebase now supports running the existing load harness against a Postgres-backed profile, but the Agrodomain Supabase database password was not available in this lane, so the final parity rerun could not be executed.

## What Changed

- Added a first-class PostgreSQL driver dependency to the API package.
- Added non-SQLite SQLAlchemy pool settings so the API can run with a production-like connection profile instead of SQLite-only defaults.
- Updated Alembic config wiring to accept URL-encoded Postgres URLs safely.
- Extended `tests/load/run_rb070.py` so the same benchmark harness can target:
  - default isolated SQLite files, or
  - an external database URL with an isolated Postgres schema per run.

## Exact Missing Input

One of the following is required to run the parity benchmark:

- Agrodomain Postgres password for Supabase project `bfklsgyuipjkxilxtfvt`, or
- a full working connection string for that project.

Authoritative pooler metadata from Supabase management API:

- project ref: `bfklsgyuipjkxilxtfvt`
- pooler host: `aws-1-us-east-1.pooler.supabase.com`
- pooler port: `6543`
- pooler username: `postgres.bfklsgyuipjkxilxtfvt`
- database: `postgres`

Expected connection string shape:

```text
postgresql://postgres.bfklsgyuipjkxilxtfvt:<PASSWORD>@aws-1-us-east-1.pooler.supabase.com:6543/postgres
```

## Execution Commands

Install API dependencies if needed:

```bash
cd /mnt/vault/MWH/Projects/Agrodomain/apps/api
./.venv/bin/python -m pip install -e .
```

Run the RB-070 harness against Postgres with an isolated schema:

```bash
cd /mnt/vault/MWH/Projects/Agrodomain
PYTHONPATH=apps/api apps/api/.venv/bin/python tests/load/run_rb070.py \
  --tag postgres-parity \
  --database-url "postgresql://postgres.bfklsgyuipjkxilxtfvt:<PASSWORD>@aws-1-us-east-1.pooler.supabase.com:6543/postgres" \
  --database-schema "rb070_postgres_parity" \
  --web-concurrency 4
```

Primary artifact emitted by that command:

- `.benchmarks/rb070/summary-postgres-parity.json`

## Benchmark Assumptions

- API workers remain at `4` to keep runtime comparison close to the final SQLite lane.
- The benchmark harness and seeded scenarios remain unchanged.
- Isolation happens at the schema level, not by mutating shared application tables.
- The pooler endpoint is acceptable for concurrency parity; if transaction-pool semantics distort results, repeat once against a direct Postgres host when an IPv6-capable runtime is available.

## Minimum Path To Clear R8

1. Provide the Agrodomain Supabase Postgres password or full connection string.
2. Run the command above.
3. Compare `.benchmarks/rb070/summary-postgres-parity.json` against the existing SQLite summaries in `.benchmarks/rb070/`.
4. If RB-070 passes, update:
   - `docs/load-test-report.md`
   - `R8-RB-070-BUILDER-ARTIFACT.md`
5. If RB-070 still fails, keep Postgres as the benchmark baseline and remediate remaining application hot paths rather than returning to SQLite tuning.

## If The Pooler Is Not Sufficient

Use a deploy runtime with IPv6 egress or a colocated Postgres service and rerun the same command against a direct connection string. The harness changes already made in this lane do not need further modification for that escalation.

## Direct Connectivity Follow-Up

2026-04-25 verification from this runtime still fails on the direct host:

- direct host: `db.bfklsgyuipjkxilxtfvt.supabase.co:5432`
- DNS resolves to IPv6 only: `2600:1f18:2e13:9d1b:4b20:43e3:ed68:bbf3`
- raw TCP connect result: `OSError(101, 'Network is unreachable')`
- `psycopg.connect(...)` result: `OperationalError: connection to server ... failed: Network is unreachable`
- control probe to another IPv6 target (`google.com:80`) fails with the same `Network is unreachable` result
- `/proc/net/if_inet6` in this container shows only loopback IPv6 and no usable non-loopback IPv6 route

Minimum next step:

- provide this task with a runtime/container that has real outbound IPv6 egress, or
- run the same benchmark command from a colocated host that can reach `db.bfklsgyuipjkxilxtfvt.supabase.co:5432`
