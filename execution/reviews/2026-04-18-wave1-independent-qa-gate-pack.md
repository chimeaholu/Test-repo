# Agrodomain Wave 1 Independent QA Gate Pack

Date: `2026-04-18`
Scope: independent QA/review lane for Wave 1 readiness against `G1` through `G3`
Source packet: `execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md`
Repo root: `/mnt/vault/MWH/Projects/Agrodomain`

## 1. Purpose

This pack is the review-side control document for Wave 1. It does not authorize implementation scope changes. It defines:

- the executable gate checklist for `G1` contract lock, `G2` migration lock, and `G3` boundary lock
- the minimum required test matrix the contracts, API, web, and QA lanes must satisfy
- the integration risk log that should be updated as each lane lands evidence
- automatic failure criteria that block progression even if a lane reports local success

Use this pack as the QA source of truth for go or no-go decisions while the build lanes run in parallel.

## 2. Current Readiness Snapshot

Snapshot taken from the live repo state on `2026-04-18`.

| Gate | Packet pass rule | Current observed evidence | Status | Blocking gap |
|---|---|---|---|---|
| `G1` Contract lock | envelope package exists; generated schemas committed; every mutating contract has `idempotency_key` and `schema_version` | `packages/contracts` exists, but source directories and generated outputs are placeholders only; `src/index.ts` is a stub; generated directories contain only `.gitkeep` | `RED` | no canonical envelope implementation, no committed schemas, no mutating contract proof |
| `G2` Migration lock | `0001` through `0004` implemented; clean bootstrap and replay succeed; seed replay idempotent | `apps/api/app/db/migrations/versions` contains only `.gitkeep`; no seed runner evidence found | `RED` | no migrations, no replay evidence, no seed idempotency proof |
| `G3` Boundary lock | web imports only shared contracts/client helpers; API owns all writes; channel adapters have no direct aggregate writes | topology and ownership docs exist; implementation surfaces are mostly skeletal; boundary compliance is not yet provable from code | `AMBER` | no static import proof, no write-path proof, no channel adapter review target yet |

## 3. Lane-to-Gate Tracking Map

| Lane | Primary packet acceptance | Gates influenced | What QA must wait for |
|---|---|---|---|
| Contracts | schemas committed; OpenAPI fragments generated; `AIJ-002` and `IDI-003` green | `G1`, `G3` | concrete envelope and DTO source files, generated artifacts, contract tests |
| API | app boots; migrations repeatable; duplicate mutation green; listing integration green | `G2`, `G3` | migrations `0001` to `0004`, seed runner, idempotency and audit evidence |
| Web | shell mobile and desktop; consent flow against API; offline seam exists; listing wizard uses generated client only | `G3` | route groups, generated client usage, responsive and consent evidence |
| QA | packet-mandated journey mapping plus CI evidence path | `G1`, `G2`, `G3` | committed test inventory, named evidence paths under `execution/heartbeats` or CI artifacts |

## 4. Executable Gate Checklist

Run all commands from `/mnt/vault/MWH/Projects/Agrodomain` unless noted. A gate is not reviewable until every checklist item has both command output and saved evidence.

### 4.1 Gate `G1` Contract Lock

#### Entry conditions

- `C-001`, `C-002`, `C-003`, and listing contracts from `V-001` are merged into the working branch.
- `packages/contracts` contains real source files, not placeholder-only directories.

#### Evidence commands

```bash
find packages/contracts/src -type f ! -name '.gitkeep' | sort
find packages/contracts/generated/json-schema -type f ! -name '.gitkeep' | sort
find packages/contracts/generated/openapi -type f ! -name '.gitkeep' | sort
grep -R "schema_version" packages/contracts/src
grep -R "idempotency_key" packages/contracts/src
corepack pnpm --filter @agrodomain/contracts test
corepack pnpm --filter @agrodomain/contracts build
```

#### Reviewer checks

- Confirm an envelope implementation exists under `packages/contracts/src/envelope`.
- Confirm generated schema artifacts are committed, stable, and derived from current contract source.
- Confirm every mutating command DTO exposes at minimum:
  - `request_id`
  - `idempotency_key`
  - `actor_id`
  - `country_code`
  - `channel`
  - `schema_version`
- Confirm negative-path tests cover invalid schema or tool calls for `AIJ-002`.
- Confirm audit-facing contract metadata preserves `schema_version` for `IDI-003`.

#### Pass criteria

- All evidence commands succeed.
- Generated artifacts exist in both `json-schema` and `openapi`.
- No mutating contract is missing the required envelope fields.
- Contract tests explicitly map to `AIJ-002` and `IDI-003`.

#### Automatic fail criteria

- Any mutating contract omits `idempotency_key` or `schema_version`.
- Generated artifacts are produced locally but not committed.
- API or web packages redefine transport DTOs outside `packages/contracts`.
- Unknown-field or invalid-schema calls are accepted, coerced silently, or logged without rejection.

### 4.2 Gate `G2` Migration Lock

#### Entry conditions

- `A-001` and `A-002` are landed.
- Alembic is initialized and wired to the API app.
- A repeatable seed entrypoint exists.

#### Evidence commands

```bash
find apps/api/app/db/migrations/versions -maxdepth 1 -type f ! -name '.gitkeep' | sort
cd apps/api && . .venv/bin/activate && alembic upgrade head
cd apps/api && . .venv/bin/activate && alembic downgrade base
cd apps/api && . .venv/bin/activate && alembic upgrade head
cd apps/api && . .venv/bin/activate && pytest tests/integration -k 'migration or seed or listing or consent'
cd apps/api && . .venv/bin/activate && python -m app.db.seed
cd apps/api && . .venv/bin/activate && python -m app.db.seed
```

#### Reviewer checks

- Confirm exactly four baseline revisions exist and correspond to packet `0001` through `0004`.
- Confirm migration replay works without manual SQL or state cleanup.
- Confirm the seed runner is safe to execute twice with no duplicate domain effects.
- Confirm `CJ-001` and `CJ-002` fixtures can be created from the migrated schema.
- Confirm migration and seed logs are preserved under `execution/heartbeats` or CI output.

#### Pass criteria

- Revisions `0001` through `0004` are committed and ordered.
- `upgrade -> downgrade -> upgrade` succeeds cleanly.
- Seed replay succeeds twice with identical resulting state.
- Integration tests prove listing and consent fixtures operate on the migrated schema.

#### Automatic fail criteria

- Missing any of `0001`, `0002`, `0003`, or `0004`.
- Replay requires manual table drops, hand-edited revisions, or environment patching.
- Second seed run changes row counts for baseline entities without explicit upsert semantics.
- Migration revisions encode secrets, environment-specific identifiers, or non-deterministic data transforms.

### 4.3 Gate `G3` Boundary Lock

#### Entry conditions

- `C-002`, `C-003`, `A-003`, `W-001`, `W-002`, and `W-003` are landed or reviewable.
- Route groups, contract clients, and command handling seams exist.

#### Evidence commands

```bash
grep -R "from app\\.db\\|import app\\.db\\|from .*repositories\\|import .*repositories" apps/web || true
grep -R "packages/contracts\\|@agrodomain/contracts" apps/web
grep -R "session\\.add\\|session\\.execute\\|insert\\(|update\\(|delete\\(" apps/api/app/modules/channels apps/api/app/modules/notifications || true
grep -R "audit\\|idempotency\\|outbox" apps/api/app/modules apps/api/app/services
corepack pnpm --filter @agrodomain/web test
cd apps/api && . .venv/bin/activate && pytest tests/integration -k 'idempotency or audit or unauthorized or consent'
```

#### Reviewer checks

- Confirm `apps/web` talks to domain behavior only through generated contract clients and client-safe helpers.
- Confirm `apps/api` is the only layer performing aggregate writes.
- Confirm channel adapters and notification translation paths never mutate marketplace, consent, finance, wallet, or escrow state directly.
- Confirm regulated mutations traverse idempotency, audit, and outbox seams.
- Confirm server authorization remains authoritative even if web route guards exist.

#### Pass criteria

- No forbidden imports or write-path violations are found.
- Channel adapters are translator-only by implementation, not just by docs.
- Unauthorized mutation attempts are rejected and audited.
- Consent revocation blocks downstream regulated actions.

#### Automatic fail criteria

- Any web code imports repositories, ORM models, or server-only write helpers.
- Any non-API component writes directly to persistence or bypasses the command bus.
- Any channel adapter performs direct aggregate mutation.
- Any regulated mutation executes without audit emission or idempotency enforcement.

## 5. Required Test Matrix

The following matrix is the minimum reviewable Wave 1 test surface. A lane cannot claim readiness with broader tests while skipping these packet-linked cases.

| ID | Requirement from packet/test plan | Minimum level | Owning lane | Expected evidence artifact | Gates covered |
|---|---|---|---|---|---|
| `AIJ-002` | invalid schema or tool call hard reject plus audit | contract + API integration | Contracts, API | contract test output plus rejected request evidence | `G1`, `G3` |
| `IDI-003` | schema version recorded on each call | contract + API integration | Contracts, API | audit payload showing `schema_version` | `G1`, `G2` |
| `CJ-001` | onboarding plus consent plus profile completion | API integration + web e2e | API, Web | consent flow run log and browser evidence | `G2`, `G3` |
| `EP-007` | missing consent blocks regulated flow | API integration + web e2e | API, Web | blocked mutation evidence with reason code | `G1`, `G3` |
| `DI-004` | consent revocation propagates to workflows | API integration | API | revocation then blocked follow-on action evidence | `G2`, `G3` |
| `CJ-002` | listing creation and edit lifecycle | API integration + web e2e | API, Web | listing create/read-back evidence | `G2`, `G3` |
| `DI-001` | create listing in one channel and read in another | API integration | API | canonical record parity evidence | `G2`, `G3` |
| `EP-005` | unauthorized mutation rejected and audited | API integration | API | rejected mutation plus audit event | `G2`, `G3` |
| `EP-001` | invalid login or identity failure | web e2e | Web | rejection and recovery path evidence | `G3` |
| `RJ-001` | responsive onboarding and consent | web e2e desktop and mobile | Web | viewport screenshots or Playwright report | `G3` |

### 5.1 Minimum package-level placement

| Package | Required tests before review sign-off |
|---|---|
| `packages/contracts/tests` | envelope validation, unknown-field rejection, mutating contract required-field enforcement, `AIJ-002`, `IDI-003` |
| `apps/api/tests/integration` | migration replay, seed replay, consent propagation, unauthorized mutation audit, listing create/read parity, duplicate mutation single-effect |
| `apps/web/tests/e2e` | onboarding and consent desktop/mobile, invalid login, listing wizard submit through generated client, responsive shell |

### 5.2 Evidence storage rule

At least one of the following must exist for every required test family:

- `execution/heartbeats/<date>-<gate>-<test-family>.txt`
- `execution/reviews/<date>-<scope>/...`
- CI artifact bundle collected by `npm run ci:artifacts`

Missing evidence is treated as test not run.

## 6. Integration Risk Log

| Risk ID | Risk | Why it matters now | Gate exposure | Detection trigger | Required mitigation before sign-off |
|---|---|---|---|---|---|
| `RISK-01` | Contract package remains a structural shell without canonical envelope implementation | `G1` can appear partially complete from directories alone | `G1` | no non-placeholder files under `packages/contracts/src/envelope` or generated outputs | fail gate immediately; require real source and generated artifacts |
| `RISK-02` | DTO drift between contracts and API/web local types | breaks contract lock and downstream parity | `G1`, `G3` | duplicate request or response schema definitions outside `packages/contracts` | reject lane until all consumers import generated/shared contracts |
| `RISK-03` | Migration sequence lands as ad hoc revisions rather than packet `0001` to `0004` baseline | replay instability and review ambiguity | `G2` | revision list missing required baseline set or naming order | block gate and require baseline alignment note |
| `RISK-04` | Seed runner is not idempotent | duplicate fixtures will corrupt listing, consent, or audit tests | `G2` | second seed changes row counts or foreign-key layout | require upsert or checksum-based seed protection |
| `RISK-05` | Web shell reaches server mutations through bespoke fetch logic instead of generated clients | boundary discipline erodes immediately | `G3` | web write flows not traceable to generated client surface | fail `G3`; require generated client-only mutation path |
| `RISK-06` | Channel adapters pick up direct write responsibilities during early multi-channel rebuild | violates packet translator-only rule | `G3` | adapter modules contain persistence writes or aggregate mutation imports | fail `G3`; redirect writes through API command handlers |
| `RISK-07` | Idempotency and audit seams are added after listing flow instead of before | duplicate effects and compliance gaps become hard to unwind | `G2`, `G3` | listing mutation passes without duplicate submission proof or audit rows | no sign-off until duplicate single-effect and audit evidence exist |
| `RISK-08` | Review evidence remains scattered in manual notes without stable paths | lanes may claim completion without reproducible proof | `G1`, `G2`, `G3` | required tests pass locally but no saved artifact path exists | treat as incomplete; require artifact commit or CI bundle |

## 7. Review Decision Rules

### Ready to open `G1`

- contracts lane has landed `C-001` through `C-003`
- generated artifacts exist and are committed
- `AIJ-002` and `IDI-003` evidence is attached

### Ready to open `G2`

- API lane has landed `A-001` and `A-002`
- migrations `0001` to `0004` exist
- seed replay and migration replay evidence is attached

### Ready to open `G3`

- API and web lanes have landed boundary-bearing code
- idempotency and audit seams are visible in API code
- web mutation flows demonstrably use shared contract clients only

### Mandatory no-go conditions

- any `RED` gate remains unresolved
- any required test ID in Section 5 is unmapped, unimplemented, or lacks evidence
- any `S0` or `S1` defect is open
- any build lane requests waiver based on “placeholder for now” for contract, migration, audit, or boundary obligations

## 8. Recommended Update Cadence for This QA Lane

Update this pack when any of the following happens:

- contracts lane commits generated schema artifacts
- API lane lands migrations or seed runner changes
- web lane lands generated contract client wiring or responsive shell evidence
- QA lane publishes new evidence under `execution/heartbeats` or CI artifacts

Each update should modify only:

- the readiness snapshot
- the lane-to-gate tracking map
- the risk log status notes
- the evidence paths attached to each required test family
