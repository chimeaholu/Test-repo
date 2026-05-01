from datetime import date

from app.db.repositories.climate import ClimateRepository
from app.db.repositories.farm import FarmRepository


class _FakeWeatherProvider:
    provider_name = "open_meteo"

    def fetch_forecast(self, *, latitude: float, longitude: float, days: int = 7):
        return _dataset(
            kind="forecast",
            days=[
                _day("2026-04-29", 35.0, 24.0, 72.0, 88.0, 5.0, 80),
                _day("2026-04-30", 34.0, 23.0, 4.0, 22.0, 5.2, 1),
            ],
        )

    def fetch_history(self, *, latitude: float, longitude: float, start_date: date, end_date: date):
        return _dataset(
            kind="history",
            days=[
                _day("2026-04-26", 31.0, 21.0, 0.0, None, 5.1, 1),
                _day("2026-04-27", 32.0, 22.0, 1.0, None, 5.1, 1),
                _day("2026-04-28", 33.0, 23.0, 2.0, None, 5.0, 2),
            ],
            source_window_start=start_date.isoformat(),
            source_window_end=end_date.isoformat(),
        )


def _dataset(kind: str, days: list[dict[str, object]], source_window_start=None, source_window_end=None):
    return type(
        "Dataset",
        (),
        {
            "kind": kind,
            "provider": "open_meteo",
            "provider_mode": "live",
            "latitude": 9.4,
            "longitude": -0.8,
            "timezone": "Africa/Accra",
            "generated_at": "2026-04-29T06:00:00Z",
            "degraded_mode": False,
            "degraded_reasons": [],
            "days": [type("Day", (), item) for item in days],
            "source_window_start": source_window_start,
            "source_window_end": source_window_end,
        },
    )()


def _day(day: str, tmax: float, tmin: float, rain: float, rain_prob: float | None, et0: float, code: int):
    return {
        "date": day,
        "temperature_max_c": tmax,
        "temperature_min_c": tmin,
        "precipitation_mm": rain,
        "precipitation_probability_pct": rain_prob,
        "evapotranspiration_mm": et0,
        "weather_code": code,
    }


def _sign_in_and_consent(client, *, name: str, email: str, role: str, country_code: str) -> tuple[str, str]:
    register = client.post(
        "/api/v1/identity/register/password",
        json={
            "display_name": name,
            "email": email,
            "phone_number": "+233241234567",
            "password": "Harvest2026!",
            "role": role,
            "country_code": country_code,
        },
    )
    assert register.status_code == 200
    token = register.json()["access_token"]
    actor_id = register.json()["session"]["actor"]["actor_id"]
    consent = client.post(
        "/api/v1/identity/consent",
        json={
            "policy_version": "2026.04.eh5",
            "scope_ids": ["identity.core", "workflow.audit", "climate.runtime"],
            "captured_at": "2026-04-29T06:00:00+00:00",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert consent.status_code == 200
    return token, actor_id


def test_weather_outlook_and_action_pack_route_use_provider_data(client, session) -> None:
    token, actor_id = _sign_in_and_consent(
        client,
        name="Ama Mensah",
        email="ama.climate@example.com",
        role="farmer",
        country_code="GH",
    )
    client.app.state.weather_provider = _FakeWeatherProvider()

    climate_repository = ClimateRepository(session)
    farm_repository = FarmRepository(session)
    farm = climate_repository.upsert_farm_profile(
        farm_id="farm-gh-eh5-001",
        actor_id=actor_id,
        country_code="GH",
        farm_name="Ama North Plot",
        district="Tamale",
        crop_type="Maize",
        hectares=3.5,
        latitude=9.4,
        longitude=-0.8,
    )
    field = farm_repository.create_field(
        field_id="field-gh-eh5-001",
        farm_id=farm.farm_id,
        actor_id=actor_id,
        country_code="GH",
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
    farm_repository.create_crop_cycle(
        crop_cycle_id="cycle-gh-eh5-001",
        farm_id=farm.farm_id,
        field_id=field.field_id,
        actor_id=actor_id,
        country_code="GH",
        crop_type="Maize",
        variety="Obatanpa",
        planting_date=date(2026, 4, 1),
        harvest_date=date(2026, 8, 15),
        yield_tons=None,
        revenue=None,
        status="active",
    )
    climate_repository.create_alert(
        alert_id="alert-gh-eh5-001",
        farm_id=farm.farm_id,
        actor_id=actor_id,
        country_code="GH",
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
    session.commit()

    headers = {"Authorization": f"Bearer {token}"}
    weather = client.get(f"/api/v1/climate/farms/{farm.farm_id}/weather-outlook", headers=headers)
    action_pack = client.get(f"/api/v1/climate/farms/{farm.farm_id}/action-pack", headers=headers)

    assert weather.status_code == 200
    assert action_pack.status_code == 200
    assert weather.json()["forecast"]["provider"] == "open_meteo"
    assert len(weather.json()["forecast"]["days"]) == 2
    assert action_pack.json()["action_pack"]["risks"]
    assert any(
        "drainage" in item["title"].lower()
        for item in action_pack.json()["action_pack"]["tasks"]
    )
    assert action_pack.json()["action_pack"]["advisory"]["draft_response"]
