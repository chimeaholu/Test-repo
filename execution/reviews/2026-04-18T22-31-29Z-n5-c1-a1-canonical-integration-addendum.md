# N5-C1/A1 Canonical Integration Addendum

Date: `2026-04-18`
Scope: `N5-C1`, `N5-A1` only
Canonical repo: `/mnt/vault`
Canonical branch: `fix/agrodomain-n5-c1-a1-canonical`
Integrated commit: `ecbcf8a9a18ef8644c48f019b97accfc58dcba7d`

## Canonical Reachability

- Created canonical ref `fix/agrodomain-n5-c1-a1-canonical` pointing to `ecbcf8a9a18ef8644c48f019b97accfc58dcba7d`.
- Integration performed without widening scope into `N5-A2`, `N5-W1/W2`, `N5-Q1`, or `B-025..B-030`.

## Focused Rerun On Canonical Checkout

Checkout used: `/tmp/agrodomain-n5-alpha-31181bd9/MWH/Projects/Agrodomain` (worktree attached to `/mnt/vault`).

Executed commands:

```bash
cd /tmp/agrodomain-n5-alpha-31181bd9/MWH/Projects/Agrodomain/packages/contracts
node ../../node_modules/vitest/vitest.mjs run tests/contracts.test.ts
```

Result: `PASS` (`18 passed`)

```bash
cd /tmp/agrodomain-n5-alpha-31181bd9/MWH/Projects/Agrodomain
pytest apps/api/tests/unit/test_command_bus.py \
  apps/api/tests/unit/test_models_and_repositories.py \
  apps/api/tests/integration/test_migrations_and_seed.py \
  apps/api/tests/integration/test_finance_insurance_runtime.py -q
```

Result: `PASS` (`19 passed`)

## Notes

- A full fresh checkout worktree from `/mnt/vault/master` hit repository pack read failures under memory pressure. Canonical integration and reruns were completed on the existing canonical sparse worktree attached to the same repository.
