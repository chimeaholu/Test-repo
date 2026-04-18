# Agrodomain Frontend Initial Bead Package

Date: 2026-04-13
Status: Ready for Step `8` swarm launch
Routing tags: `@frontend`, `@builder`, `@qa-engineer`, `@architect`, `@review-plan`, `@review-arch`

| Bead | Title | Route Tag | Depends On | Output | Test Obligations |
| --- | --- | --- | --- | --- | --- |
| `F-001` | Unified app shell and role routing | `@frontend` | `B-050,B-051` | role-aware shell, nav, auth entry | FJ-C01,FJ-R01 |
| `F-002` | Consent and identity UI | `@frontend` | `B-002,B-016,F-001` | onboarding and profile consent surfaces | FJ-C01,FJ-D01 |
| `F-003` | Design token implementation | `@frontend` | `B-050` | token package and base theme | visual regression + a11y base checks |
| `F-004` | Interaction state primitives | `@frontend` | `B-051,F-003` | loading/error/offline/retry/trust wrappers | state component coverage |
| `F-005` | Accessibility and readability primitives | `@frontend` | `B-052,F-003,F-004` | copy rules, field helpers, focus states | keyboard + contrast + reading-level checks |
| `F-006` | Farmer and buyer home queues | `@frontend` | `F-001,F-004` | task-first homes | FJ-R01 + queue state tests |
| `F-007` | Listing index and detail routes | `@frontend` | `B-039,F-001,F-004` | listing browse/detail surfaces | FJ-C02,FJ-R02 |
| `F-008` | Listing create wizard | `@frontend` | `F-007,F-005` | 3-step create/publish flow | FJ-C02,FJ-E01 |
| `F-009` | Negotiation inbox and thread | `@frontend` | `F-007,F-004` | offer thread UI | FJ-C03,FJ-E02 |
| `F-010` | Escrow and wallet center | `@frontend` | `B-013,F-009` | escrow timeline + wallet activity | FJ-C04,FJ-E03,FJ-E04 |
| `F-011` | Advisory request and answer routes | `@frontend` | `B-014,B-016,F-005` | advisory composer and answer detail | FJ-C05 |
| `F-012` | Citation and proof drawer library | `@frontend` | `F-011,F-004` | citation drawer + trust rows | citation inspection tests |
| `F-013` | Climate alerts center and detail | `@frontend` | `B-018,F-004` | alert list and detail | FJ-C06 |
| `F-014` | Finance queue and decision detail | `@frontend` | `B-020,B-021,B-022,F-004` | finance review surfaces | FJ-C07,FJ-E05 |
| `F-015` | Traceability timeline and evidence gallery | `@frontend` | `B-023,B-024,F-004` | timeline + gallery routes | FJ-C08,FJ-D05 |
| `F-016` | Evidence capture and upload queue | `@frontend` | `B-024,B-042,F-015` | camera/file capture flow | FJ-E06 |
| `F-017` | Offline outbox and conflict resolver UI | `@frontend` | `B-006,B-040,B-041,F-004` | queued writes + conflict views | FJ-E01,FJ-E02,FJ-D02 |
| `F-018` | Notifications center | `@frontend` | `B-013,B-043,F-001` | cross-domain notification route | notification deep-link tests |
| `F-019` | Cooperative operations surfaces | `@frontend` | `F-006,F-007,F-015` | members, quality, dispatch, bulk listing | co-op queue and quality tests |
| `F-020` | Advisor workbench surfaces | `@frontend` | `F-011,F-013` | advisor queue and intervention log | advisor follow-up tests |
| `F-021` | Admin analytics and observability | `@frontend` | `B-025,B-027,F-001` | analytics cockpit and health views | FJ-R05,FJ-D06 |
| `F-022` | Contract adapter package | `@builder` | `B-002..B-054` | typed DTO adapters and validation helpers | adapter unit tests |
| `F-023` | Route loader and mutation services | `@builder` | `F-022` | frontend data access layer | integration fixtures |
| `F-024` | Performance instrumentation and budgets | `@builder` | `B-039,B-044,F-001` | bundle and route budget checks | performance CI |
| `F-025` | Frontend Playwright harness | `@qa-engineer` | `F-001..F-024` | critical/error/responsive/data-integrity suite | all FJ journeys |
| `F-026` | Frontend architecture review gate | `@review-arch` | `full bead package` | architecture signoff on route and adapter posture | review artifact |
| `F-027` | Frontend plan traceability review | `@review-plan` | `full bead package` | bead-to-plan consistency audit | review artifact |

## Wave Proposal
- Wave F1: `F-001` to `F-005` foundation shell, tokens, states, and a11y.
- Wave F2: `F-006` to `F-013` farmer/buyer/advisory/climate core journeys.
- Wave F3: `F-014` to `F-021` finance, traceability, cooperative, advisor, admin surfaces.
- Wave F4: `F-022` to `F-027` contract hardening, budgets, automation, and review gates.
