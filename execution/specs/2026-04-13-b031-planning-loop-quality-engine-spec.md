# B-031 Planning Loop Quality Engine - Initial Scaffold Spec

Date: 2026-04-13
Bead: B-031
Route: @architect

## Objective
Provide a minimal planning-loop quality scaffold that:
- triggers planner artifacts for non-trivial and elevated-risk intents
- enforces ordered phase checkpoints before execution

## Planner Trigger Policy (v0)
- `intent_class=non_trivial` -> planner artifact required
- `risk_class in {medium, high}` -> planner artifact required
- `intent_class=trivial` and `risk_class=low` -> planner artifact optional

## Phase Checkpoint Enforcement (v0)
Default ordered checkpoints:
1. `intent_captured`
2. `context_compacted`
3. `plan_artifact_attached`
4. `phase_review_passed`

Rules:
- checkpoints must be recorded in sequence
- out-of-order checkpoints are rejected
- execution gate fails if any required checkpoint is missing
- execution gate fails if planner artifact is required but absent

## Unit Test Obligations Covered
- Trigger policy by intent/risk class.
- Out-of-order checkpoint rejection.
- Missing checkpoint reporting.
- Execution gate blocking for incomplete phases.
- Execution gate blocking for missing planner artifact when required.
- Execution gate allow path when checkpoints and planner artifact are present.
