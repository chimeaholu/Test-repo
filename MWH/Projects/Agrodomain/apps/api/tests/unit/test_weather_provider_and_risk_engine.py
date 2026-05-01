from datetime import UTC, date, datetime

from app.db.repositories.climate import ClimateRepository
from app.db.repositories.farm import FarmRepository
from app.modules.climate.provider import OpenMeteoWeatherProvider
from app.modules.climate.risk_engine import build_action_pack


class _FakeFetcher:
    def __init__(self, payload):
        self.payload = payload

    def get(self, url: str):
        assert "/v1/" in url
        return self.payload


def test_open_meteo_provider_normalizes_daily_payload() -> None:
    payload = {
        "latitude": 9.4,
        "longitude": -0.8,
        "timezone": "Africa/Accra",
        "daily": {
            "time": ["2026-04-29", "2026-04-30"],
            "temperature_2m_max": [34.7, 35.2],
            "temperature_2m_min": [24.0, 23.5],
            "precipitation_sum": [42.1, 3.4],
            "precipitation_probability_max": [85, 20],
            "et0_fao_evapotranspiration": [4.9, 5.3],
            "weather_code": [80, 1],
        },
    }
    provider = OpenMeteoWeatherProvider(
        base_url="https://api.open-meteo.com",
        timeout_seconds=2,
        fetcher=_FakeFetcher(payload),
    )

    forecast = provider.fetch_forecast(latitude=9.4, longitude=-0.8, days=2)

    assert forecast.provider == "open_meteo"
    assert forecast.degraded_mode is False
    assert forecast.days[0].precipitation_mm == 42.1
    assert forecast.days[1].temperature_max_c == 35.2


def test_risk_engine_links_forecast_to_tasks_and_advisory(session) -> None:
    climate_repository = ClimateRepository(session)
    farm_repository = FarmRepository(session)
    farm = climate_repository.upsert_farm_profile(
        farm_id="farm-gh-risk-001",
        actor_id="actor-farmer-gh-ama",
        country_code="GH",
        farm_name="Ama North Plot",
        district="Tamale",
        crop_type="Maize",
        hectares=3.5,
        latitude=9.4,
        longitude=-0.8,
    )
    field = farm_repository.create_field(
        field_id="field-risk-001",
        farm_id=farm.farm_id,
        actor_id=farm.actor_id,
        country_code=farm.country_code,
        name="North Field",
        boundary_geojson=None,
        area_hectares=3.0,
        soil_type="loam",
        irrigation_type="drip",
        current_crop="Maize",
        planting_date=date(2026, 4, 1),
        expected_harvest_date=date(2026, 8, 15),
        status="active",
    )
    crop_cycle = farm_repository.create_crop_cycle(
        crop_cycle_id="cycle-risk-001",
        farm_id=farm.farm_id,
        field_id=field.field_id,
        actor_id=farm.actor_id,
        country_code=farm.country_code,
        crop_type="Maize",
        variety="Obatanpa",
        planting_date=date(2026, 4, 1),
        harvest_date=date(2026, 8, 15),
        yield_tons=None,
        revenue=None,
        status="active",
    )
    alert = climate_repository.create_alert(
        alert_id="alert-risk-001",
        farm_id=farm.farm_id,
        actor_id=farm.actor_id,
        country_code=farm.country_code,
        observation_id=None,
        alert_type="flood_risk",
        severity="critical",
        precedence_rank=10,
        headline="Flood risk for Ama North Plot",
        detail="Heavy rainfall already threatens drainage channels.",
        source_confidence="high",
        degraded_mode=False,
        degraded_reason_codes=[],
        farm_context={"crop_type": "Maize"},
    )

    forecast = OpenMeteoWeatherProvider(
        base_url="https://api.open-meteo.com",
        timeout_seconds=2,
        fetcher=_FakeFetcher(
            {
                "latitude": 9.4,
                "longitude": -0.8,
                "timezone": "Africa/Accra",
                "daily": {
                    "time": ["2026-04-29", "2026-04-30", "2026-05-01"],
                    "temperature_2m_max": [36.0, 33.0, 32.0],
                    "temperature_2m_min": [24.0, 23.0, 22.0],
                    "precipitation_sum": [74.0, 10.0, 1.0],
                    "precipitation_probability_max": [90, 40, 10],
                    "et0_fao_evapotranspiration": [5.1, 4.2, 5.0],
                    "weather_code": [80, 3, 1],
                },
            }
        ),
    ).fetch_forecast(latitude=9.4, longitude=-0.8, days=3)
    history = OpenMeteoWeatherProvider(
        base_url="https://api.open-meteo.com",
        timeout_seconds=2,
        fetcher=_FakeFetcher(
            {
                "latitude": 9.4,
                "longitude": -0.8,
                "timezone": "Africa/Accra",
                "daily": {
                    "time": ["2026-04-26", "2026-04-27", "2026-04-28"],
                    "temperature_2m_max": [31.0, 32.0, 33.0],
                    "temperature_2m_min": [21.0, 22.0, 23.0],
                    "precipitation_sum": [0.0, 2.0, 1.0],
                    "et0_fao_evapotranspiration": [5.2, 5.1, 5.0],
                    "weather_code": [1, 1, 2],
                },
            }
        ),
    ).fetch_history(latitude=9.4, longitude=-0.8, start_date=date(2026, 4, 26), end_date=date(2026, 4, 28))

    pack = build_action_pack(
        farm_profile=farm,
        forecast=forecast,
        history=history,
        alerts=[alert],
        fields=[field],
        crop_cycles=[crop_cycle],
        reference_date=date(2026, 4, 29),
    )

    assert pack.crop_calendar.stage in {"establishment", "vegetative_growth"}
    assert any(item.code == "forecast_flood_risk" for item in pack.risks)
    assert any("drainage" in item.title.lower() for item in pack.tasks)
    assert pack.advisory.topic
