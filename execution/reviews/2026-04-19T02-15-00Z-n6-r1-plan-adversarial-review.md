# N6-R1 Plan Adversarial Review Memo

- Timestamp: `2026-04-19T02:15:00Z`
- Tranche: `N6-R1`
- Baseline: `integration/agrodomain-n5-baseline-sparse@cd254ff7c2658cdf2d7ced07d8bcc2bb3dfea729`
- Baseline root: `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7`
- Source packet: `/mnt/vault/MWH/Projects/Agrodomain/execution/specs/2026-04-19-n6-wave6-admin-observability-rollout-reliability-tranche.md`
- Wave lock: `/mnt/vault/MWH/Projects/Agrodomain/execution/WAVE-LOCK.md`
- State snapshot: `/mnt/vault/MWH/Projects/Agrodomain/execution/reviews/2026-04-19T01-24-00Z-wave6-state-snapshot.md`

## Verdict

`FAIL / NO-GO FOR N6 CLOSE`.

The tranche packet is directionally sound on scope containment and merge ordering, but it is not currently executable to a release-ready close on the promoted baseline because the plan assumes assets, evidence paths, and gate harnesses that do not exist yet in the packaged tree.

## What The Plan Gets Right

- Scope is narrowly bounded to `B-025` through `B-030`, with explicit exclusion of Wave 7 feature creep.
- Merge order is sane: contracts before runtime, runtime before web, web before QA, QA before review/ops.
- The packet correctly treats `N6-R1` as tranche-close blocking even if implementation starts earlier.
- The wave lock correctly forces all lanes onto the promoted sparse N5 baseline instead of the dirty live vault worktree.

## Findings

### Release-blocking

1. `N6-G1` has no concrete contract surface to validate against the packaged baseline.
   Evidence:
   - `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/packages/contracts/src/catalog.ts:91`
   - `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/packages/contracts/src/catalog.ts:156`
   - The contract catalog contains N1-N5-era domains only. There are no `B-025/B-026/B-027` admin analytics, rollout-control, telemetry envelope, SLO, or release-status contract definitions in the source-of-truth transport catalog.
   Impact:
   - `N6-C1` cannot satisfy its own exit criterion of generated artifacts committed for N6 control-plane DTOs.
   - Every downstream test obligation that depends on contract-backed payloads is currently unbound.

2. The plan’s test matrix references journeys and proof IDs that do not map to a visible N6 harness in the packaged baseline.
   Evidence:
   - `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/tests/e2e/n5-finance-traceability.spec.ts:213`
   - `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/apps/api/tests/unit/test_system.py:8`
   - `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/apps/api/tests`
   - `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/tests/e2e`
   Impact:
   - The packet names `CJ-008`, `EP-005`, `PF-001`, `PF-004`, `DI-002`, and `DI-003`, but the packaged test tree still centers on N5 and earlier checks. No visible N6 reliability harness, fixture suite, or focused admin observability spec is present.
   - `N6-G4` and `N6-G5` cannot be evidenced from this baseline.

3. The plan schedules rollback and operator evidence too late in the sequence.
   Evidence:
   - Source packet section `N6-R1` in `/mnt/vault/MWH/Projects/Agrodomain/execution/specs/2026-04-19-n6-wave6-admin-observability-rollout-reliability-tranche.md`
   Impact:
   - Rollback triggers require telemetry fields, rollout-state audit shape, and degraded-state semantics to be defined before `N6-A1` and `N6-W1`. Deferring that definition until `R1` increases the chance that runtime/web work lands without the data needed to support rollback decisions.

### Pre-release-remediate

4. The tranche packet does not pin expected evidence artifact names for `N6-Q1`.
   Evidence:
   - Source packet `N6-Q1` exit criteria reference only a generic gate pack under `execution/reviews`.
   Impact:
   - Operators cannot distinguish whether a missing artifact is a lane failure, a packaging failure, or a naming mismatch.
   Remediation:
   - Predeclare the expected artifact set for `N6-Q1`: focused API log, focused Playwright log, regression log, artifact index, and gate report.

5. The plan does not explicitly call out topology-lock prerequisites for `apps/worker` and `packages/config`.
   Evidence:
   - `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/docs/architecture/2026-04-18-wave0-topology-lock.md`
   Impact:
   - Rollout controls and SLO evaluation imply feature flags, country-pack config, and potentially async evaluation. The plan assigns all of this to `N6-C1/A1` without naming the worker/config ownership seams required by the topology lock.

### Post-release-follow-up

6. The packet does not require a post-release rollback rehearsal artifact.
   Impact:
   - This does not block a release once N6 exists, but it should be added after tranche close so future ops slices inherit an operator-proven rollback drill.

## Gate Readout Against Current Baseline

| Gate | Status | Basis |
| --- | --- | --- |
| `N6-G1` | `FAIL` | No N6 contracts in `/packages/contracts/src/catalog.ts` |
| `N6-G2` | `FAIL` | No contract-backed admin observability payloads or explicit degraded-state UI evidence |
| `N6-G3` | `FAIL` | No rollout-control contract/runtime/test evidence |
| `N6-G4` | `FAIL` | No N6 reliability pack or regression proof tied to N6 surfaces |
| `N6-G5` | `FAIL` | No release/rollback evidence existed before this memo, and implementation evidence is still absent |

## Plan-Level Recommendation

`NO-GO`.

The plan should proceed only after the tranche owner tightens four items:

- define the N6 contract inventory before runtime coding resumes
- pin the exact Q1 evidence file set and artifact paths
- move rollback-trigger requirements upstream so `N6-A1/W1` emit the needed state
- explicitly assign worker/config ownership where rollout flags or async SLO evaluation are required
