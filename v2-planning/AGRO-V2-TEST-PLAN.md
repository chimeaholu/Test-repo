# AGRO-V2-TEST-PLAN

## 1) Test Plan Metadata
- Product Token: `[[PRODUCT_NAME]]`
- Scope: SOP 15 Step 1b + expanded enterprise readiness
- Blocking rule: all `Critical`, `Error`, `Responsive`, and `Data Integrity` journeys must pass before go-live in any country pack.

## 2) Environment Matrix
- Channels: USSD, WhatsApp, PWA
- Viewports: Desktop `1440x900`, Mobile `375x812`
- Connectivity profiles:
  - `NET-A`: stable broadband
  - `NET-B`: intermittent 3G
  - `NET-C`: constrained 2G/session timeout prone

## 3) Critical Journeys (Blocking)
| ID | Journey | Channels | Requirement Links |
|---|---|---|---|
| `CJ-001` | New user onboarding + consent + profile completion | USSD/WA/PWA | `FR-001`, `COMP-001` |
| `CJ-002` | Listing creation and edit lifecycle | USSD/WA/PWA | `FR-010`, `FR-013` |
| `CJ-003` | Bid/offer negotiation and human confirmation | WA/PWA | `FR-011`, `FR-012` |
| `CJ-004` | Wallet funding to escrow to release | WA/PWA | `FR-020`, `FR-021`, `FR-022` |
| `CJ-005` | Advisory query with citation + confidence | WA/PWA | `FR-030`, `FR-031` |
| `CJ-006` | Climate alert received and acknowledged | USSD/WA/PWA | `FR-040`, `FR-004` |
| `CJ-007` | Traceability event chain for shipment | WA/PWA | `FR-060`, `FR-061` |
| `CJ-008` | Admin audit trail review for sensitive operation | PWA | `SEC-003`, `COMP-004` |

## 4) Error Path Journeys (Blocking)
| ID | Error Scenario | Expected Behavior | Requirement Links |
|---|---|---|---|
| `EP-001` | Invalid login/identity failure | clear rejection + recovery steps | `FR-001`, `SEC-001` |
| `EP-002` | USSD session timeout mid-transaction | preserve intent token + restart flow | `FR-003`, `NFR-002` |
| `EP-003` | WhatsApp template send failure | SMS fallback for critical event | `FR-004` |
| `EP-004` | Payment partner timeout | idempotent retry + pending status | `FR-023`, `NFR-002` |
| `EP-005` | Unauthorized offer approval attempt | reject + audit event | `SEC-001`, `SEC-003` |
| `EP-006` | Low-confidence advisory output | block or escalate to HITL | `FR-032` |
| `EP-007` | Missing consent in regulated flow | hard stop + consent capture prompt | `COMP-001`, `COMP-005` |
| `EP-008` | MRV source data unavailable | explicit degraded mode + assumptions displayed | `FR-041`, `FR-042` |

## 5) Responsive Journeys (Blocking)
| ID | Journey | Desktop | Mobile | Notes |
|---|---|---|---|---|
| `RJ-001` | PWA onboarding and consent | Pass | Pass | usability for low literacy |
| `RJ-002` | PWA listing + bid flow | Pass | Pass | large-form resilience |
| `RJ-003` | Advisory conversation view | Pass | Pass | citation display readability |
| `RJ-004` | Wallet and escrow timeline | Pass | Pass | accessibility contrast + clarity |
| `RJ-005` | Admin audit panel | Pass | Pass | filter/search usability |

## 6) Data Integrity Checks (Blocking)
| ID | Check | Verification |
|---|---|---|
| `DI-001` | Create listing in one channel, read in another | canonical record parity |
| `DI-002` | Offer update reflected in all channels | no stale state after refresh |
| `DI-003` | Escrow state transitions immutable | audit log and ledger match |
| `DI-004` | Consent revocation propagates to workflows | blocked operations honor policy |
| `DI-005` | Advisory record stores source IDs and model metadata | reviewer log and response align |
| `DI-006` | Traceability milestone update survives retry/reconnect | no duplicate or missing events |

## 7) Security and Compliance Tests
- `SC-001`: role/permission matrix validation for all sensitive actions.
- `SC-002`: PII masking in logs and exports.
- `SC-003`: policy-pack variance test by country.
- `SC-004`: audit export integrity and tamper evidence.
- `SC-005`: prompt/tool policy enforcement for agent calls.

## 8) Performance and Reliability (Flagged, Non-Blocking unless threshold breach)
- `PF-001`: PWA first meaningful interaction under `NET-B`.
- `PF-002`: WhatsApp command response latency distribution.
- `PF-003`: Queue drain time during burst events.
- `PF-004`: Retry success rates for payment/integration failures.

## 9) Test Data and Fixtures
- Synthetic farmers/coops across language groups and regions.
- Commodity scenarios for crops/livestock/fish/poultry/inputs.
- Simulated weather/satellite variance including missing data windows.
- Payment and insurance sandbox stubs with failure mode toggles.

## 10) Entry/Exit Criteria

### Entry
- Environment deployed per wave.
- Required fixtures and partner sandboxes available.
- Country pack config validated.

### Exit
- All `CJ-*`, `EP-*`, `RJ-*`, `DI-*` pass.
- No unresolved critical security/compliance defects.
- Approval by architecture + QA review gates.

## 11) Defect Severity Policy
- `S0`: data corruption/security breach -> launch block.
- `S1`: critical journey blocked -> launch block.
- `S2`: workaround exists but major UX/compliance risk -> fix before country expansion.
- `S3`: non-critical degradation -> backlog with due release.

## 12) Traceability to Beads
- Each bead in `AGRO-V2-BEAD-BACKLOG.md` references at least one of:
  - `CJ-*`
  - `EP-*`
  - `RJ-*`
  - `DI-*`

## 13) Agent Intelligence Journeys (Blocking for High-Risk Domains)
| ID | Journey | Expected Result | Requirement Links |
|---|---|---|---|
| `AIJ-001` | High-risk intent enters planner loop | no execution without planner artifact | `FR-080` |
| `AIJ-002` | Tool call with invalid schema | hard reject + audit event | `FR-081`, `SEC-006` |
| `AIJ-003` | Verifier rejects inconsistent output | action blocked and revised/escalated | `FR-082` |
| `AIJ-004` | Stale memory recalled in advisory flow | revalidation required before response | `FR-084` |
| `AIJ-005` | Budget threshold breach during inference | router downgrade/escalation policy triggered | `FR-085`, `NFR-007` |
| `AIJ-006` | Policy challenge in finance flow | HITL approval path invoked | `FR-087`, `COMP-005` |

## 14) Intelligence Data Integrity Checks (Blocking)
| ID | Check | Verification |
|---|---|---|
| `IDI-001` | Planner artifact linked to action transcript | action has planner reference |
| `IDI-002` | Verifier decision logged with reason code | transcript includes verifier outcome |
| `IDI-003` | Tool schema version recorded on each call | audit event includes schema_version |
| `IDI-004` | Memory freshness metadata persisted | recalled memory includes freshness state |
| `IDI-005` | Model routing decision and tier recorded | inference ledger contains route evidence |

## 15) Android-Representative Matrix (Readiness-Blocking for Native Start)
| Matrix ID | Device/Network Profile | Scenario Focus | Pass Criteria |
|---|---|---|---|
| `ARM-001` | Low RAM Android (2-3GB), unstable 3G | queue/replay reliability | replay success >= target, no duplicate commits |
| `ARM-002` | Mid-tier Android, intermittent background suspension | resumable operations | operation token resumes without data loss |
| `ARM-003` | Low-end Android CPU, packet loss | payload budget pressure | endpoint budgets respected, no timeout cascade |
| `ARM-004` | Android cohort with poor signal transitions | sync conflict behavior | deterministic conflict outcomes with clear user states |

## 16) Android Readiness Journeys
| ID | Journey | Expected Behavior | Requirement Links |
|---|---|---|---|
| `ARJ-001` | Mobile API profile request under payload budget | response remains within profile limits | `FR-090`, `NFR-009` |
| `ARJ-002` | Offline action queued then replayed | single effective mutation, deterministic status | `FR-092`, `NFR-010` |
| `ARJ-003` | Simultaneous conflicting updates | resolver applies deterministic precedence | `FR-093`, `NFR-011` |
| `ARJ-004` | Notification event parity (WA/SMS/push semantics) | unified status model and fallback behavior | `FR-095` |
| `ARJ-005` | Session/auth parity under reconnect | token/session flow stays consistent with PWA | `FR-094` |
| `ARJ-006` | Capability abstraction simulation | domain behavior unaffected by client capability implementation | `FR-096` |

## 17) Android Readiness Data Integrity Checks
| ID | Check | Verification |
|---|---|---|
| `ARDI-001` | API profile and schema_version persisted | request/response logs include version and budget metadata |
| `ARDI-002` | Queue depth and replay attempts recorded | telemetry fields complete and queryable |
| `ARDI-003` | Conflict type and resolution persisted | audit event includes conflict and final state |
| `ARDI-004` | Capability abstraction telemetry emitted | capability path trace available without domain coupling |
| `ARDI-005` | Notification broker channel state parity | delivery-state model consistent across channels |

## 18) Native Track Start Acceptance Criteria
- Android native track can start only when:
  1. `ARJ-*` and `ARDI-*` suites are green for two consecutive runs.
  2. Trigger policy thresholds (from PRD Section 21) are breached as defined.
  3. Architecture gate confirms API compatibility and offline contract readiness.

## 19) IoT Readiness Test Suite (Design/Contract Level)
| ID | Journey | Expected Behavior | Requirement Links |
|---|---|---|---|
| `IOTJ-001` | Device registry identity lifecycle | immutable identity + valid state transitions | `FR-100` |
| `IOTJ-002` | Sensor event contract validation | provenance fields and schema version always present | `FR-101` |
| `IOTJ-003` | Ingestion API idempotent/resumable behavior | duplicate/resume-safe ingestion outcomes | `FR-102`, `NFR-014` |
| `IOTJ-004` | Event bus topic partition consistency | routing by country/farm/stream is deterministic | `FR-103` |
| `IOTJ-005` | Digital twin readiness compatibility | twin fields remain additive and backward compatible | `FR-104` |

### IoT Data Integrity Checks
| ID | Check | Verification |
|---|---|---|
| `IOTDI-001` | Device registry provenance persistence | `device_id` lineage and status history persisted |
| `IOTDI-002` | Sensor provenance metadata persistence | confidence/signature/source fields queryable |
| `IOTDI-003` | Ingestion dedupe evidence | duplicate ingests do not duplicate effective state |
| `IOTDI-004` | Topic partition key integrity | partition keys align with schema contract |
| `IOTDI-005` | Governance boundary tagging | sensor-origin data class tags present and enforceable |

## 20) UX Excellence Gate Suite (Release-Blocking)
| ID | Journey | Expected Behavior | Requirement Links |
|---|---|---|---|
| `UXJ-001` | Visual language conformance | typography/color/spacing hierarchy matches system tokens | `FR-110` |
| `UXJ-002` | Interaction feedback consistency | loading/error/offline/retry states are coherent and predictable | `FR-111` |
| `UXJ-003` | Accessibility/readability in low-literacy flow | plain language, contrast, touch targets meet standard | `FR-113` |
| `UXJ-004` | Trust patterns in high-risk steps | explicit confirmation/explainability cues present | `FR-112` |
| `UXJ-005` | Low-end Android mobile UX performance | UX responsiveness within budget targets | `FR-114`, `NFR-016` |

### UX Gate and Integrity Checks
| ID | Check | Verification |
|---|---|---|
| `UXG-001` | Non-generic UX gate | generic/template-like output classification = automatic fail |
| `UXDI-001` | Visual token integrity | component token usage matches approved system |
| `UXDI-002` | Interaction state coverage | all critical flows include required feedback states |
| `UXDI-003` | Accessibility baseline evidence | automated and manual checks pass |
| `UXDI-004` | Mobile cohort UX telemetry integrity | UX performance metrics available by device cohort |
| `UXDI-005` | Design review signoff traceability | pre-build and pre-release signoff records linked |
