# N2 API Prereq-Safe Dossier

Date: `2026-04-18`
Spec: `/mnt/vault/MWH/Projects/Agrodomain/execution/specs/2026-04-18-n2-wave2-marketplace-negotiation-tranche.md`
Scope executed:
- `N2-C1` marketplace publish + negotiation contract package work
- `N2-A1` listing schema/read-model redesign

Explicit defer statement:
- `N2-A2` negotiation runtime was deferred in this run.
- No new negotiation runtime behavior was implemented.
- No wallet, escrow, settlement, finance-partner routing, worker retries, channel fallback, advisory, or traceability work was added.

## Commands

1. `python3 -m compileall /ductor/agents/engineering/workspace/worktrees/agrodomain-n2-api-copy/apps/api/app /ductor/agents/engineering/workspace/worktrees/agrodomain-n2-api-copy/apps/api/tests`
Result: passed, Python sources compiled successfully.

2. `corepack pnpm --dir /ductor/agents/engineering/workspace/worktrees/agrodomain-n2-api-copy/packages/contracts test`
Result: `12/12` tests passed.

3. `python3 -m pytest /ductor/agents/engineering/workspace/worktrees/agrodomain-n2-api-copy/apps/api/tests/unit/test_models_and_repositories.py /ductor/agents/engineering/workspace/worktrees/agrodomain-n2-api-copy/apps/api/tests/integration/test_migrations_and_seed.py /ductor/agents/engineering/workspace/worktrees/agrodomain-n2-api-copy/apps/api/tests/integration/test_vertical_slice.py`
Result: `17/17` tests passed in `19.87s`.

4. `corepack pnpm --dir /ductor/agents/engineering/workspace/worktrees/agrodomain-n2-api-copy/packages/contracts generate`
Result: contract artifacts regenerated under `packages/contracts/generated`.

## Results

### `N2-C1`

- Marketplace contracts now model explicit publish/unpublish behavior without allowing publish state to ride through generic listing updates.
- Listing record/read DTOs now carry:
  - `published_revision_number`
  - `revision_count`
  - `has_unpublished_changes`
  - `view_scope`
- Listing revision summaries now carry `change_type`.
- Generated artifacts were regenerated and are ready to commit in this copy:
  - `packages/contracts/generated/manifest.json`
  - `packages/contracts/generated/openapi/contracts.openapi.json`
  - `packages/contracts/generated/json-schema/marketplace/*.schema.json`
  - `packages/contracts/generated/json-schema/negotiation/*.schema.json`

### `N2-A1`

- Added migration `0007_listing_read_model_projection.py` for the listing read-model redesign.
- Listing persistence now tracks:
  - current revision number
  - published revision pointer
  - revision count
  - revision change type
- Buyer discovery/detail reads now project from the published revision snapshot rather than the mutable owner row.
- Owner reads still expose the current mutable row and clearly indicate unpublished changes.
- Publish/unpublish transitions remain explicit commands and emit dedicated publish-transition telemetry with revision counts.
- Duplicate publish and duplicate unpublish attempts now reject with explicit `409` API errors instead of silently no-oping.
- Integration coverage now proves:
  - create defaults to draft
  - publish exposes buyer-visible discovery
  - owner draft edits after publish do not leak to buyer-safe reads until republish
  - unpublish removes listings from buyer discovery
  - duplicate publish and unpublish transitions are rejected
  - revision trail remains queryable with `change_type`

## Changed Files

- `packages/contracts/src/marketplace/index.ts`
- `packages/contracts/tests/contracts.test.ts`
- `packages/contracts/generated/openapi/contracts.openapi.json`
- `packages/contracts/generated/json-schema/marketplace/ListingCreateInput.schema.json`
- `packages/contracts/generated/json-schema/marketplace/ListingUpdateInput.schema.json`
- `apps/api/app/api/routes/commands.py`
- `apps/api/app/core/telemetry.py`
- `apps/api/app/services/commands/handlers.py`
- `apps/api/tests/unit/test_command_bus.py`
- `apps/api/tests/integration/test_migrations_and_seed.py`
- `apps/api/tests/integration/test_vertical_slice.py`
- `execution/reviews/2026-04-18-n2-api-prereq-safe-dossier.md`

## Commit

- Repository note: the supplied copy already contains local `.git` metadata but most project files are intentionally left unstaged in this lane. Only the prereq-safe N2 files above are included in the scoped commit.
