# AGRO-V2-AGENT-BEST-PRACTICES-MATRIX

## 1) Matrix
| ID | Best Practice | Priority | Owner | Adoption Stage | Evidence Required |
|---|---|---|---|---|---|
| `BP-01` | Plan gate before non-trivial actions | `P0` | `@architect` | Wave 1 | Tests showing high-risk intents cannot execute without planner artifact |
| `BP-02` | Verifier loop independent from executor | `P0` | `@review-arch` | Wave 1-2 | Reject/approve outcomes logged with reason codes |
| `BP-03` | Strict tool JSON schemas + versioning | `P0` | `@builder` | Wave 1 | Contract tests fail on schema drift |
| `BP-04` | Permission policy allow/deny/challenge | `P0` | `@architect` | Wave 1 | Policy matrix tests across roles/countries |
| `BP-05` | Idempotency on all mutating tools | `P0` | `@builder` | Wave 1-2 | Duplicate request replay tests produce single state change |
| `BP-06` | Typed memory with freshness checks | `P0` | `@architect` | Wave 1-2 | Memory recall tests include stale-memory revalidation path |
| `BP-07` | Selective top-k memory retrieval | `P1` | `@architect` | Wave 2 | Context budget tests show reduced token usage with equal outcome quality |
| `BP-08` | Context checkpoint/compaction between phases | `P1` | `@qa-engineer` | Wave 2 | Long-session regression tests with no quality collapse |
| `BP-09` | Model router with tiered cost policy | `P0` | `@builder` | Wave 1-2 | Routing tests by risk/confidence and budget ceiling |
| `BP-10` | Degraded-mode fallback across channels | `P0` | `@frontend` | Wave 1 | Connectivity simulation tests for PWA->WA->USSD fallback |
| `BP-11` | Hook-style pre/post action policy checks | `P1` | `@review-plan` | Wave 2 | Audit events include pre-action decisions and post-action outcomes |
| `BP-12` | HITL gate for high-stakes actions | `P0` | `@qa-engineer` | Wave 2 | E2E tests block release/credit actions without approval |
| `BP-13` | Transcript lineage and audit completeness | `P0` | `@builder` | Wave 1 | Traceability test from intent to commit record |
| `BP-14` | Tool discovery and capability late-binding | `P2` | `@architect` | Wave 3-4 | Dynamic capability tests in multi-provider environment |
| `BP-15` | Continuous eval harness (quality/cost/latency) | `P0` | `@qa-engineer` | Wave 2 | Benchmark suite run artifacts with pass/fail thresholds |

## 2) Priority Rules
- `P0`: build in MVP path; must be test-complete before regional launch.
- `P1`: build before scaling to additional countries.
- `P2`: post-MVP optimization and resilience depth.

## 3) Evidence Artifacts
- Test reports tied to journey IDs (`CJ-*`, `EP-*`, `DI-*`).
- Audit log extracts for policy, verifier, and HITL decisions.
- Cost-routing report by model tier and outcome quality.

## 4) Naming Placeholder Continuity
- Use `[[PRODUCT_NAME]]` in new implementation docs and code comments.
