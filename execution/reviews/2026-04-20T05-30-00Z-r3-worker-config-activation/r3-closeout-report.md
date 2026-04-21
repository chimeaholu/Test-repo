# R3 Worker And Config Activation Closeout

- Timestamp: `2026-04-20T05:30:00Z`
- Execution base: `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7`
- Baseline ref: `cd254ff7c2658cdf2d7ced07d8bcc2bb3dfea729`
- Dependency satisfied: `execution/reviews/2026-04-20T03-38-52Z-r2-api-runtime-closure/r2-closeout-report.md`

## Objective

Execute `R3` from the revised master plan after `R2` closeout with scope limited to:

- real worker runtime activation for rollout policy and async alerting/observability operations
- shared config activation across runtime consumers
- required runtime integration and focused verification only
- no deploy or push

## Completed

### 1. Shared runtime config activation

Replaced the config package scaffold with one source-backed config surface under `packages/config`:

- contract-shaped runtime data:
  - `packages/config/src/data/environment-profiles.json`
  - `packages/config/src/data/feature-flags.json`
  - `packages/config/src/data/rollout-policies.json`
  - `packages/config/src/data/country-pack-runtimes.json`
- JS and declaration exports for shared consumption:
  - `packages/config/src/index.js`
  - `packages/config/src/index.d.ts`

Activated shared config usage in runtime consumers:

- API settings and admin routes consume config-backed environment/country/runtime guardrails:
  - `apps/api/app/core/config.py`
  - `apps/api/app/core/shared_runtime_config.py`
  - `apps/api/app/api/routes/admin.py`
- Web replay and handoff behavior consume the same config surface:
  - `apps/web/lib/api/mock-client.ts`
  - `apps/web/components/app-provider.tsx`

### 2. Real worker runtime

Replaced the worker scaffold with a real outbox processor:

- runtime entry and DB/session helpers:
  - `apps/worker/app/main.py`
  - `apps/worker/app/db.py`
- contract/schema-aware worker logic:
  - `apps/worker/app/contracts.py`
  - `apps/worker/app/runtime_config.py`
  - `apps/worker/app/runtime.py`
  - `apps/worker/app/models.py`

Runtime behavior now includes:

- consuming unpublished `outbox_messages`
- queuing durable operator notification attempts for:
  - `admin.telemetry.ingested`
  - `admin.rollouts.freeze`
  - `admin.rollouts.canary`
  - `admin.rollouts.promote`
  - `admin.rollouts.rollback`
- recording offline replay outcomes for outbox events carrying offline replay metadata
- writing worker audit events and marking processed outbox rows as published

### 3. Runtime schema and backend replay seam

Added worker-backed persistence and command metadata needed for replay and async operations:

- worker runtime table and migration:
  - `apps/api/app/db/models/worker_runtime.py`
  - `apps/api/app/db/repositories/worker_runtime.py`
  - `apps/api/app/db/migrations/versions/0015_worker_runtime_activation.py`
- Alembic/model registration:
  - `apps/api/app/db/migrations/env.py`
  - `apps/api/app/db/models/__init__.py`
- command bus now forwards worker metadata on accepted workflow commands:
  - `apps/api/app/services/commands/bus.py`
  - `apps/api/app/api/routes/commands.py`

### 4. Web offline replay no longer silently self-acks

Removed the reducer-only replay shortcut and replaced it with backend replay execution:

- replay path now posts the stored request envelope back through `/api/v1/workflow/commands`
- queue state is reconciled from backend command results instead of immediate local `ack_item`
- handoff channel derivation is now config-backed rather than hardcoded

Primary refs:

- `apps/web/lib/offline/reducer.ts`
- `apps/web/lib/offline/reducer.test.ts`
- `apps/web/lib/api/mock-client.test.ts`

## Verification

### Shared config gates

Command:

- `corepack pnpm --filter @agrodomain/config test`

Result:

- `PASS` (`4` tests)

Evidence:

- `execution/reviews/2026-04-20T05-30-00Z-r3-worker-config-activation/config-test.log`

### API/runtime gates

Command:

- `pytest tests/integration/test_command_route.py tests/integration/test_n6_admin_observability_reliability.py -q`

Result:

- `PASS` (`14 passed`)

Evidence:

- `execution/reviews/2026-04-20T05-30-00Z-r3-worker-config-activation/api-r3-gates.log`

### Worker runtime gate

Command:

- `python3 -m pytest tests/test_runtime.py -q`

Result:

- `PASS` (`1 passed`)

Evidence:

- `execution/reviews/2026-04-20T05-30-00Z-r3-worker-config-activation/worker-runtime.log`

### Web replay seam gates

Command:

- `corepack pnpm exec vitest run lib/offline/reducer.test.ts lib/api/mock-client.test.ts`

Result:

- `PASS` (`5` tests)

Evidence:

- `execution/reviews/2026-04-20T05-30-00Z-r3-worker-config-activation/web-r3-gates.log`

## Scope Boundary

This tranche does **not** claim:

- deploy, push, staging promotion, or production rollout
- frontend admin route replacement for `R4`
- external notification delivery to downstream providers

## Operational Note

The requested task-memory path `/home/mwh/.ductor/agents/engineering/workspace/tasks/8cad8550/TASKMEMORY.md` could not be updated from this container because `/home/mwh/.ductor` is not writable here (`Permission denied` on directory creation). The execution-tracking updates were still recorded in:

- `execution/WAVE-LOCK.md`
- `execution/state/2026-04-20-r3-worker-config-activation-state.md`

## Verdict

`PASS`

The scoped `R3` activation lane is closed in this execution base with a real worker runtime, shared config consumption across API/web/worker seams, backend-driven offline replay activation, and focused evidence-backed verification.
