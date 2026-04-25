# R6 RB-053 Backend Artifact

## Scope

Implemented RB-053 farm management backend support for the R6 farm, insurance, and weather surfaces on top of the existing `FarmProfile` model.

Delivered:

- `GET/POST /api/v1/farms`
- `GET/PUT /api/v1/farms/{farm_id}`
- `GET/POST /api/v1/farms/{farm_id}/fields`
- `GET/PUT/DELETE /api/v1/farms/{farm_id}/fields/{field_id}`
- `GET/POST /api/v1/farms/{farm_id}/activities`
- `GET/PUT/DELETE /api/v1/farms/{farm_id}/activities/{activity_id}`
- `GET/POST /api/v1/farms/{farm_id}/inputs`
- `GET/PUT/DELETE /api/v1/farms/{farm_id}/inputs/{input_id}`
- `GET/POST /api/v1/farms/{farm_id}/crop-cycles`
- `GET/PUT/DELETE /api/v1/farms/{farm_id}/crop-cycles/{crop_cycle_id}`

Cross-surface support included:

- Farm summaries now expose KPI-ready counts for fields, activities, inventory, crop cycles, next harvest, revenue, and active climate alerts.
- Field payloads expose insurance eligibility and active crop cycle context.
- Input payloads expose usage and remaining stock derived from activity logs.

## Files Changed

- `apps/api/app/api/routes/farm.py`
- `apps/api/app/core/application.py`
- `apps/api/app/db/models/__init__.py`
- `apps/api/app/db/models/farm.py`
- `apps/api/app/db/repositories/farm.py`
- `apps/api/app/modules/farm/runtime.py`
- `apps/api/app/db/migrations/versions/0013_farm_management_tables.py`
- `apps/api/app/seed_demo_data.py`
- `apps/api/tests/integration/test_farm_routes_runtime.py`
- `apps/api/tests/integration/test_migrations_and_seed.py`
- `apps/api/tests/unit/test_farm_runtime.py`

## Checks Run

- `python -m ruff check` on the touched RB-053 files
- `python -m mypy` on the touched RB-053 files
- `pytest tests/unit/test_farm_runtime.py tests/integration/test_farm_routes_runtime.py tests/integration/test_migrations_and_seed.py -q`

Results:

- `ruff`: pass
- `mypy`: pass
- `pytest`: 6 passed

Warnings observed:

- Existing pytest config warning for `asyncio_default_fixture_loop_scope`
- Existing Alembic deprecation warning about `path_separator`

## Readiness Notes

- Existing auth/session flow is preserved. Farm routes require authenticated, country-scoped actors.
- Mutation safety is enforced through actor-role checks, per-actor farm isolation, validation guards, and audit events for completed and rejected farm writes.
- Weather and insurance frontend lanes can consume the new farm summaries plus existing climate APIs without additional backend blockers from RB-053.
- Field deletion is intentionally blocked when dependent activities or crop cycles exist, to avoid silent data loss.

## Gate Readiness

RB-053 backend lane is ready for the R6 gate from a backend/API perspective.
