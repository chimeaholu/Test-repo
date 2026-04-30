from __future__ import annotations

from datetime import date

import pytest

from app.db.repositories.farm import FarmRepository
from app.modules.farm.runtime import FarmRuntime
from app.services.commands.errors import CommandRejectedError


def test_farm_runtime_auto_creates_crop_cycle_for_active_field(session) -> None:
    repository = FarmRepository(session)
    runtime = FarmRuntime(repository)

    farm = runtime.create_farm(
        actor_id="actor-farmer-gh-unit",
        actor_role="farmer",
        country_code="GH",
        farm_name="Unit Farm",
        district="Tamale",
        crop_type="Maize",
        hectares=4.5,
        latitude=None,
        longitude=None,
        metadata_json={},
    ).farm

    field_result = runtime.create_field(
        actor_id="actor-farmer-gh-unit",
        actor_role="farmer",
        farm=farm,
        name="North Plot",
        boundary_geojson=None,
        area_hectares=2.2,
        soil_type="loam",
        irrigation_type=None,
        current_crop="maize",
        planting_date=date(2026, 4, 10),
        expected_harvest_date=date(2026, 8, 1),
        status="active",
    )

    assert field_result.crop_cycle is not None
    assert field_result.crop_cycle.field_id == field_result.field.field_id
    assert field_result.crop_cycle.status == "active"


def test_farm_runtime_rejects_invalid_field_dates(session) -> None:
    repository = FarmRepository(session)
    runtime = FarmRuntime(repository)

    farm = runtime.create_farm(
        actor_id="actor-farmer-gh-unit-2",
        actor_role="farmer",
        country_code="GH",
        farm_name="Unit Farm 2",
        district="Tamale",
        crop_type="Soy",
        hectares=3.2,
        latitude=None,
        longitude=None,
        metadata_json={},
    ).farm

    with pytest.raises(CommandRejectedError) as exc_info:
        runtime.create_field(
            actor_id="actor-farmer-gh-unit-2",
            actor_role="farmer",
            farm=farm,
            name="Broken Plot",
            boundary_geojson={"type": "Polygon", "coordinates": []},
            area_hectares=1.5,
            soil_type=None,
            irrigation_type=None,
            current_crop="soy",
            planting_date=date(2026, 5, 1),
            expected_harvest_date=date(2026, 4, 1),
            status="active",
        )

    assert exc_info.value.reason_code == "expected_harvest_date_before_planting_date"
