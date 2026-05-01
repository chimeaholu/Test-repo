# RB-051 AgroFund Backend Artifact

Date: 2026-04-24
Lane: R5 backend
Scope: AgroFund backend investment endpoints, wallet-linked command flow, contract support, validation coverage

## Files Changed

### Backend domain and API
- `apps/api/app/db/models/fund.py`
- `apps/api/app/db/repositories/fund.py`
- `apps/api/app/modules/fund/runtime.py`
- `apps/api/app/api/routes/fund.py`
- `apps/api/app/db/migrations/versions/0012_fund_opportunities_and_investments.py`

### Existing runtime wiring
- `apps/api/app/core/application.py`
- `apps/api/app/db/models/__init__.py`
- `apps/api/app/db/migrations/env.py`
- `apps/api/app/services/commands/bus.py`
- `apps/api/app/services/commands/handlers.py`

### Tests
- `apps/api/tests/unit/test_fund_runtime.py`
- `apps/api/tests/integration/test_fund_routes_runtime.py`
- `apps/api/tests/unit/test_command_bus.py`
- `apps/api/tests/unit/test_climate_runtime.py`
- `apps/api/tests/integration/test_migrations_and_seed.py`

### Contract sources and generated artifacts
- `packages/contracts/src/finance/index.ts`
- `packages/contracts/src/common/contract.ts`
- `packages/contracts/src/ledger/index.ts`
- `packages/contracts/src/catalog.ts`
- `packages/contracts/src/index.ts`
- `packages/contracts/tests/contracts.test.ts`
- `packages/contracts/generated/manifest.json`
- `packages/contracts/generated/openapi/contracts.openapi.json`
- `packages/contracts/generated/json-schema/finance/*`
- `packages/contracts/generated/json-schema/ledger/WalletLedgerEntry.schema.json`
- `packages/contracts/generated/json-schema/ledger/WalletTransactionCollection.schema.json`

## Checks Run

- `corepack pnpm --dir /mnt/vault/MWH/Projects/Agrodomain/packages/contracts build`
- `corepack pnpm --dir /mnt/vault/MWH/Projects/Agrodomain/packages/contracts generate`
- `corepack pnpm --dir /mnt/vault/MWH/Projects/Agrodomain/packages/contracts test`
  - Pass: `19/19`
- `/mnt/vault/MWH/Projects/Agrodomain/apps/api/.venv/bin/pytest /mnt/vault/MWH/Projects/Agrodomain/apps/api/tests/unit/test_command_bus.py /mnt/vault/MWH/Projects/Agrodomain/apps/api/tests/unit/test_climate_runtime.py /mnt/vault/MWH/Projects/Agrodomain/apps/api/tests/unit/test_fund_runtime.py /mnt/vault/MWH/Projects/Agrodomain/apps/api/tests/integration/test_migrations_and_seed.py /mnt/vault/MWH/Projects/Agrodomain/apps/api/tests/integration/test_fund_routes_runtime.py`
  - Pass: `12/12`
  - Non-blocking warnings: existing pytest config warning for `asyncio_default_fixture_loop_scope`, existing Alembic `path_separator` deprecation warning

## Readiness Notes

- Ready for the R5 backend/API gate.
- Added `GET /api/v1/fund/opportunities`, `GET /api/v1/fund/opportunities/{id}`, `GET /api/v1/fund/investments`, and `GET /api/v1/fund/investments/{id}`.
- Added `fund.opportunities.create`, `fund.investments.create`, and `fund.investments.withdraw` on the existing workflow command bus with unchanged auth, consent, idempotency, audit, and outbox behavior.
- Investment creation now moves wallet balance from `available` to `held`; withdrawal releases held funds back to `available` with a deterministic 5% early-exit penalty.
- Opportunity funding progress and funded/open status now update automatically as investments are created or withdrawn.
- `FundingOpportunity.currency` was added as a safety-driven model field even though the PRD did not list it explicitly; wallet-linked monetary records are not safe without explicit currency.
- Maturity payout and completion settlement flows are still out of scope for this lane; the implemented backend covers current open/funded/withdrawn R5 wallet and portfolio surfaces.
