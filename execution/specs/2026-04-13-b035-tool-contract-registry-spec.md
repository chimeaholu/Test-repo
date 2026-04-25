# B-035 Tool Contract Registry and Schema Validation Spec

Date: 2026-04-13
Project: `/mnt/vault/MWH/Projects/Agrodomain`
Bead: `B-035`

## Scope

Implement a versioned registry for tool contracts with strict input/output payload validation so agent-facing tools can reject schema drift deterministically before execution.

## Decisions

- Contract definitions are explicit and code-local:
  - `ToolContract`
  - `ContractField`
  - `ContractValueType`
- Versioning key is `(tool_name, version)` to support non-breaking evolution without mutating older contracts.
- Validation is strict:
  - required fields must exist
  - unknown fields are rejected
  - field types must match declared scalar/container type
  - nullable fields are opt-in only
- Registry surface is deliberately small for the scaffold:
  - `register`
  - `get`
  - `validate_input`
  - `validate_output`

## Test Obligations Covered

- Unit:
  - missing required field rejection
  - type mismatch rejection
  - unknown field rejection under strict schema
  - duplicate contract version rejection
- Dependency seam checks:
  - package optional export helper still behaves correctly
  - existing `B-003` and `B-008` suites remain green

## Deferred

- Nested object shape validation
- enum constraints / pattern checks
- backward-compatibility diffing between versions
- runtime coercion or partial acceptance modes
