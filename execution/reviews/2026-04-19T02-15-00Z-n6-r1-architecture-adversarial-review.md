# N6-R1 Architecture Adversarial Review Memo

- Timestamp: `2026-04-19T02:15:00Z`
- Tranche: `N6-R1`
- Baseline: `integration/agrodomain-n5-baseline-sparse@cd254ff7c2658cdf2d7ced07d8bcc2bb3dfea729`
- Baseline root: `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7`
- Topology lock: `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/docs/architecture/2026-04-18-wave0-topology-lock.md`

## Verdict

`FAIL / RELEASE-BLOCKING ARCHITECTURAL GAPS PRESENT`.

The promoted baseline is still structurally an N5 system. It does not yet provide the control-plane boundaries, operator-facing observability surfaces, or rollback instrumentation demanded by N6.

## Findings

### Release-blocking

1. The API boundary does not expose any N6 admin observability or rollout-control routes.
   Evidence:
   - `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/apps/api/app/core/application.py:39`
   - `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/apps/api/app/core/application.py:46`
   - `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/apps/api/app/api/routes/system.py:14`
   - `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/apps/api/app/api/routes/system.py:37`
   Detail:
   - The application registers only `system`, `identity`, `marketplace`, `advisory`, `audit`, `climate`, `traceability`, and `commands`.
   - The `system` router exposes only `/healthz`, `/readyz`, and `/api/v1/system/settings`. There is no admin analytics read model, rollout-control endpoint, telemetry summary endpoint, SLO endpoint, or release-readiness endpoint.

2. The contracts boundary is missing N6 transport definitions.
   Evidence:
   - `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/packages/contracts/src/catalog.ts:91`
   - `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/packages/contracts/src/catalog.ts:156`
   - `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/packages/contracts/src/client.ts:127`
   Detail:
   - The catalog stops at N5-era marketplace, negotiation, climate, finance, and traceability contracts.
   - The only generic telemetry shape is `event/trace_id/timestamp/detail`, which is insufficient for N6’s required `schema_version`, `request_id`, `actor_id`, `country_code`, `channel`, `service_name`, `slo_id`, `alert_severity`, and `audit_event_id` metadata.

3. The current telemetry implementation cannot support operator-grade observability or rollback triggers.
   Evidence:
   - `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/apps/api/app/core/telemetry.py:6`
   - `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/apps/api/app/core/telemetry.py:223`
   Detail:
   - `TelemetryService` logs point events in-process with hand-built `extra` payloads.
   - It has no persistence layer, no SLO evaluator, no channel/service aggregation surface, no alert decision model, and no replay protection for telemetry ingestion.
   - That means rollback triggers cannot be derived from durable operator state.

4. The admin web surface is explicitly placeholder-only.
   Evidence:
   - `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/apps/web/app/app/admin/analytics/page.tsx:1`
   - `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/apps/web/app/app/admin/analytics/page.tsx:10`
   Detail:
   - The only admin analytics route renders `PlaceholderPage`.
   - This directly violates the tranche build gate: no placeholder metrics, faux alerting, or mock-only rollout actions.

5. The worker and config seams required by the topology lock are still scaffolds.
   Evidence:
   - `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/apps/worker/app/main.py:1`
   - `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/packages/config/src/index.ts:1`
   Detail:
   - `apps/worker` is a scaffold that prints a placeholder string.
   - `packages/config` exports only a package marker and no typed flags or country-pack rollout policy.
   - If N6 expects async alerting, freeze controls, or country-scoped release posture, those ownership seams are not implemented.

### Pre-release-remediate

6. The existing audit read path is too narrow for operator-wide rollout accountability.
   Evidence:
   - `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/apps/api/app/api/routes/audit.py:15`
   - `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/apps/api/app/api/routes/audit.py:35`
   Detail:
   - The route filters returned events to the authenticated actor or null actor rows.
   - That is safer than overexposure, but N6 requires explicit operator oversight across rollout actions. A dedicated admin-scoped audit projection is needed instead of broadening this route implicitly.

7. There is no packaged evidence of stale/degraded telemetry handling.
   Evidence:
   - `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/apps/api/tests/unit/test_system.py:8`
   - `/ductor/agents/engineering/workspace/worktrees/agrodomain-n5-web-cd254ff7/tests/e2e`
   Detail:
   - Existing visible tests cover health/settings and N5 journeys, not stale-health masking, duplicate telemetry ingestion, or alert-loss conditions.

### Post-release-follow-up

8. Once N6 exists, the architecture should add an operator-facing reconciliation stream for alert acknowledgement and rollback drill history.
   Detail:
   - This is not needed before first N6 close because the tranche is not yet implemented, but it should follow immediately after successful release readiness to keep operations evidence durable.

## Boundary And Security Assessment

| Area | Assessment |
| --- | --- |
| Transport source of truth | `FAIL` |
| Admin/operator boundary | `FAIL` |
| Rollout authz boundary | `FAIL` |
| Observability durability | `FAIL` |
| UI stale/degraded explicitness | `FAIL` |
| Rollback trigger readiness | `FAIL` |

## Architecture Recommendation

`NO-GO`.

The safe architectural path is:

- add N6 contracts first in `packages/contracts`
- add explicit admin observability and rollout-control routers in `apps/api`
- move any async SLO or alert evaluation into `apps/worker` if it exceeds request-time ownership
- add typed country/flag policy in `packages/config`
- replace the placeholder admin analytics route with live, degraded-aware operator surfaces
- produce Q1 evidence before any release-readiness claim
