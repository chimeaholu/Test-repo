import pytest

from agro_v2.climate_risk_ingestion import (
    ClimateIngestRecord,
    ClimateRiskIngestionError,
    ClimateRiskIngestionPipeline,
    ClimateSourceType,
)


def build_record(**overrides) -> ClimateIngestRecord:
    payload = {
        "source_record_id": "rec-17-1",
        "source_type": ClimateSourceType.WEATHER,
        "provider": "open-meteo",
        "country_code": "gh",
        "farm_id": "farm-17",
        "observed_at": "2026-04-13T06:00:00Z",
        "metric_name": "precipitation_24h",
        "value": 62.4,
        "unit": "mm",
        "latitude": 5.6037,
        "longitude": -0.1870,
        "confidence": 0.94,
    }
    payload.update(overrides)
    return ClimateIngestRecord(**payload)


def test_weather_precipitation_is_normalized_with_country_context():
    pipeline = ClimateRiskIngestionPipeline()

    [signal] = pipeline.ingest((build_record(),))

    assert signal.country_code == "GH"
    assert signal.region == "west_africa"
    assert signal.normalized_metric == "rainfall_24h_mm"
    assert signal.normalized_value == 62.4
    assert signal.risk_hint == "heavy_rain"
    assert signal.provenance_key == "weather:open-meteo:rec-17-1"


def test_weather_temperature_mapping_covers_heat_watch_path():
    pipeline = ClimateRiskIngestionPipeline()

    [signal] = pipeline.ingest(
        (
            build_record(
                source_record_id="rec-17-2",
                metric_name="temperature_max",
                value=36.2,
                unit="celsius",
            ),
        )
    )

    assert signal.normalized_metric == "temperature_max_c"
    assert signal.normalized_unit == "c"
    assert signal.risk_hint == "heat_watch"


def test_satellite_ndvi_is_scaled_and_deduped():
    pipeline = ClimateRiskIngestionPipeline()
    record = build_record(
        source_record_id="rec-17-3",
        source_type=ClimateSourceType.SATELLITE,
        provider="sentinel-hub",
        metric_name="ndvi",
        value=2450,
        unit="raw",
    )

    first = pipeline.ingest((record,))
    second = pipeline.ingest((record,))

    assert first[0].normalized_metric == "ndvi_ratio"
    assert first[0].normalized_value == 0.245
    assert first[0].risk_hint == "vegetation_stress"
    assert second == ()


def test_satellite_soil_moisture_preserves_ratio_shape():
    pipeline = ClimateRiskIngestionPipeline()

    [signal] = pipeline.ingest(
        (
            build_record(
                source_record_id="rec-17-4",
                source_type=ClimateSourceType.SATELLITE,
                provider="chirps",
                metric_name="soil_moisture",
                value=0.18,
                unit="ratio",
                country_code="jm",
            ),
        )
    )

    assert signal.country_code == "JM"
    assert signal.region == "caribbean"
    assert signal.normalized_metric == "soil_moisture_ratio"
    assert signal.risk_hint == "dryness_watch"


def test_unsupported_metric_mapping_is_rejected():
    pipeline = ClimateRiskIngestionPipeline()

    with pytest.raises(
        ClimateRiskIngestionError,
        match="unsupported metric mapping",
    ):
        pipeline.ingest(
            (
                build_record(
                    source_record_id="rec-17-5",
                    metric_name="wind_speed",
                    value=14.0,
                    unit="mps",
                ),
            )
        )

