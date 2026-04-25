# AGRO-V2-AGENT-INTELLIGENCE-ADDENDUM

## 1) Purpose
Translate concrete Claude Code engineering patterns into production-ready `[[PRODUCT_NAME]]` agent architecture so agent behavior feels "CLI-level smart" while running primarily on open-source models.

## 2) Source Basis (Reviewed)
- `/mnt/vault/MWH/Knowledge-Base/AI-Resources/CLAUDE.md`
- `/mnt/vault/MWH/Knowledge-Base/AI-Resources/Claude_Code_Mastery_Guide.pdf`
- `/mnt/vault/MWH/Knowledge-Base/AI-Resources/Claude Code Complete Guide.pdf`
- `/mnt/vault/MWH/Knowledge-Base/AI-Resources/Claude-Code-Source-Code/src/`
- `/mnt/vault/MWH/Agents/CLAUDE_CODE_SUBAGENTS_PLAN.md`
- `/mnt/vault/MWH/Agents/README.md`
- Existing Agrodomain V2 planning docs and research.

## 3) Extracted Claude Patterns -> Agrodomain Implementation Pattern
| Claude Pattern (Observed) | Agrodomain Implementation Pattern |
|---|---|
| Plan gating before non-trivial execution | `Intent Planner` stage required before high-impact actions (`trade`, `credit`, `insurance`, `MRV publication`) |
| Explicit user clarification tool before approval | `HITL Clarification API` with structured question payloads before final action |
| Tool contracts backed by strict JSON schema | `Tool Contract Registry` with JSON schema validation + version pinning |
| Pre/Post tool hooks for safety and audit | `Policy Hook Engine` for `PreAction`, `PostAction`, `OnFailure`, `OnEscalation` |
| Permission layers (allow/deny/ask) by tool context | `Policy Decision Point (PDP)` enforcing allow/deny/challenge per role/country |
| Typed memory (user/feedback/project/reference) with drift caveats | `Memory Graph` with memory types, TTL/freshness labels, and verification-before-use |
| Selective memory retrieval budget | `Memory Selector` returns top-k memory evidence (k<=5 default) to reduce context noise |
| Context compaction and phase checkpointing | `Session Checkpoints` + `Plan Summary Artifacts` at each workflow phase |
| Multi-agent fork vs fresh specialist | `Forked Agent` for shared-context subproblems, `Specialist Agent` for independent validation |
| Cost tracking by model/tokens/duration | `Inference Ledger` with per-model cost, latency, and cache hit KPIs |
| Deferred tool discovery/search | `Tool Discovery Service` for dynamic capability matching and late binding |
| Session/interaction history with lineage | `Decision Transcript Store` linking user intent -> agent steps -> final action |

## 4) Open-Source Model Strategy (Primary) + Claude-Level Quality Controls

### 4.1 Routing Tiers
- `Tier-0 Fast`: lightweight OSS model for intent classification, language normalization, routing hints.
- `Tier-1 Core Reasoning`: medium OSS instruct/reasoning model for plan drafts and tool selection.
- `Tier-2 Verifier`: stronger OSS model for critique, contradiction check, and policy conformance.
- `Tier-3 Escalation (optional)`: premium model only for unresolved critical ambiguity or regulated edge-cases.

### 4.2 Distillation Strategy
- Distill high-performing verifier traces into:
  - prompt templates
  - policy heuristics
  - rejection/escalation rules
- Keep model-agnostic test harness so provider swaps do not break behavior contracts.

### 4.3 Guardrails Required
- Tool-use must be schema-valid before execution.
- If confidence below threshold or policy conflict exists -> force reviewer loop/HITL.
- Memory facts older than freshness threshold must be revalidated before recommendation.

## 5) Quality Architecture (Implementation-Ready)

### 5.1 Reasoning Depth
- Minimum plan artifact for non-trivial intents:
  - objective
  - assumptions
  - constraints
  - step plan
  - rollback option

### 5.2 Tool-Use Fidelity
- Every tool call must include:
  - `tool_name`
  - `schema_version`
  - `validated_input`
  - `idempotency_key`
  - `policy_decision_id`

### 5.3 Context and Memory
- Context budget manager:
  - compress stale interaction context
  - preserve active task ledger + recent evidence
- Memory selector:
  - top-k relevant memories by type + freshness + confidence
  - stale-memory warning injection before action.

### 5.4 Verification Loop
- `Plan -> Execute -> Verify -> Commit` loop for all high-risk workflows.
- Verifier must independently re-check:
  - policy compliance
  - source traceability
  - numerical consistency
  - user-impact risk class.

## 6) What to Build Now vs Later

### Build Now (MVP-Critical)
1. Tool contract registry + schema validator.
2. Model router with tiered policy and budget guards.
3. Reviewer/verifier loop for finance/advisory high-risk outputs.
4. Memory taxonomy + freshness + selective recall.
5. Policy hook engine with audit transcripts.

### Build Later (Post-MVP Hardening)
1. Automated prompt distillation from verifier traces.
2. Adaptive model routing based on real-time latency/cost curves.
3. Advanced long-horizon memory ranking and contradiction clustering.
4. Semi-autonomous recovery actions for repeated transient failures.

## 7) Testability Requirements
- Each pattern above must map to:
  - unit test on policy/schema behavior
  - integration test with at least one cross-channel journey
  - transcript audit assertion in compliance logs.

## 8) Naming Placeholder Continuity
- Keep `Agrodomain 2.0` as planning-only reference.
- Use `[[PRODUCT_NAME]]` in implementation specs and generated artifacts.
