# Agrodomain Shared Contracts

`packages/contracts` is the transport source of truth for Wave 1 shared contracts.

Rules:

- Define schemas once under `src/`.
- Keep every contract strict and versioned with `schema_version`.
- Every mutating envelope must carry `request_id`, `idempotency_key`, `actor_id`, `country_code`, `channel`, and correlation metadata.
- Commit generated artifacts under `generated/json-schema/` and `generated/openapi/`.
- Regenerate artifacts with `corepack pnpm --filter @agrodomain/contracts run generate` whenever `src/` changes.
- Do not import legacy runtime code into production packages. Legacy files are traceability references only.
