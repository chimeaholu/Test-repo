# Wave 1 API Lane Gate Evidence

Date: `2026-04-18`
Branch: `master` (canonical) and `feat/agrodomain-wave1-api-spine` (source worktree)
Worktree: `/ductor/agents/engineering/workspace/worktrees/agrodomain-wave1-api` (source)
Scope: `A-001`, `A-002`, `A-003`

## Contracts Lane Coordination

- Follow-up run confirms contracts lane artifacts are now present on canonical `master`:
  - `d8047e6d` `feat(contracts): add shared wave1 contract schemas`
  - `70b5720a` `chore(contracts): commit generated schemas and lane handoff`
  - `e234a226` `chore(contracts): ignore local build output`
- API transport adapter is now package-backed:
  - loads `packages/contracts/generated/manifest.json`
  - resolves `envelope.request` schema metadata and version
  - validates request payloads against `packages/contracts/generated/json-schema/envelope/RequestEnvelope.schema.json`
  - retains legacy payload normalization (`command_name` + `payload`) as compatibility input
- Settings defaults now derive from canonical contract version (`2026-04-18.wave1`) via shared catalog loader.

## Delivered Beads

### `A-001` API shell and health surface

- FastAPI app factory with typed settings, request ID middleware, structured logging, telemetry stub, and route/dependency structure
- `GET /healthz`
- `GET /readyz`
- `GET /api/v1/system/settings`

### `A-002` Database and migration spine

- SQLAlchemy metadata split into platform, workflow, and audit groups
- Alembic added with revisions `0001` through `0004`
- Idempotent seed runner for country policy, identity membership, consent, and workflow definition baseline data

### `A-003` Command bus, idempotency, and audit seam

- Local canonical command envelope adapter enforcing `request_id`, `idempotency_key`, `actor_id`, `country_code`, `channel`, and `schema_version`
- Protected mutation route at `POST /api/v1/workflow/commands`
- Command dispatch, single-effect idempotency replay, audit writes for accept/replay/reject, and outbox persistence seam

## Gate Runs

### Full API suite (canonical)

Command:

```bash
pytest -q
```

Result:

```text
11 passed in 7.01s
```

### Package-level gate

Command:

```bash
corepack pnpm --filter @agrodomain/api test
```

Result:

```text
11 passed in 7.56s
```

Note:

- `package.json` was corrected from `python` to `python3` after the first gate attempt exposed the container runtime mismatch.

### Migration bootstrap and seed replay

Command:

```bash
python3 - <<'PY'
# alembic upgrade head
# run_seed() twice against a fresh sqlite db
PY
```

Result:

```text
{'counts': {'country_policies': 2, 'identity_memberships': 1, 'consent_records': 1, 'workflow_definitions': 1}}
```

Interpretation:

- bootstrap was clean
- all four revisions applied in order
- seed replay was idempotent

## Commit Set

### Source worktree commits

- `2361b9b3` `feat(agrodomain-api): add shell and migration spine`
- `8f4a8e2f` `feat(agrodomain-api): add command idempotency audit seam`
- `3fce5c75` `docs(agrodomain-api): capture wave1 gate evidence`

### Canonical cherry-picked commits on `master`

- `3c35603a` `feat(agrodomain-api): add shell and migration spine`
- `ab9f95cb` `feat(agrodomain-api): add command idempotency audit seam`
- `4705bba3` `docs(agrodomain-api): capture wave1 gate evidence`
- `eb9329b2` `feat(agrodomain-api): bind command adapter to canonical contracts artifacts`
- `6071dc98` `docs(agrodomain-api): append canonical follow-up SHA to gate evidence`
