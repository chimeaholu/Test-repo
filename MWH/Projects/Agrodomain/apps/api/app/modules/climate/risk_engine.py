from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

from app.db.models.climate import ClimateAlert, FarmProfile
from app.db.models.farm import CropCycle, FarmField
from app.modules.climate.provider import WeatherDataset


@dataclass(frozen=True, slots=True)
class CropCalendarSummary:
    crop_type: str
    country_code: str
    stage: str
    season_label: str
    reference_date: str
    planting_window_start: str | None
    planting_window_end: str | None
    expected_harvest_window_start: str | None
    expected_harvest_window_end: str | None


@dataclass(frozen=True, slots=True)
class RiskSignal:
    code: str
    severity: str
    title: str
    summary: str
    recommended_due_date: str | None
    linked_alert_id: str | None
    source: str


@dataclass(frozen=True, slots=True)
class TaskRecommendation:
    task_id: str
    title: str
    description: str
    priority: str
    due_date: str | None
    source: str
    advisory_topic: str
    linked_alert_id: str | None


@dataclass(frozen=True, slots=True)
class AdvisoryLink:
    topic: str
    draft_question: str
    draft_response: str
    policy_context: dict[str, object]
    requires_human_review: bool


@dataclass(frozen=True, slots=True)
class ClimateActionPack:
    crop_calendar: CropCalendarSummary
    risks: list[RiskSignal]
    tasks: list[TaskRecommendation]
    advisory: AdvisoryLink
    degraded_mode: bool
    degraded_reasons: list[str]


_CALENDAR_WINDOWS: dict[str, dict[str, tuple[tuple[int, int], tuple[int, int]]]] = {
    "GH": {
        "maize": ((4, 6), (8, 10)),
        "rice": ((4, 6), (9, 11)),
        "cassava": ((3, 6), (11, 12)),
        "yam": ((2, 4), (8, 10)),
        "tomato": ((9, 11), (12, 2)),
    },
    "NG": {
        "maize": ((4, 7), (8, 11)),
        "rice": ((5, 7), (10, 12)),
        "cassava": ((3, 7), (11, 12)),
        "yam": ((2, 4), (8, 10)),
        "tomato": ((10, 12), (1, 3)),
    },
}


def build_action_pack(
    *,
    farm_profile: FarmProfile,
    forecast: WeatherDataset,
    history: WeatherDataset,
    alerts: list[ClimateAlert],
    fields: list[FarmField],
    crop_cycles: list[CropCycle],
    reference_date: date | None = None,
) -> ClimateActionPack:
    today = reference_date or datetime.now(tz=UTC).date()
    active_cycle = _select_active_cycle(crop_cycles=crop_cycles)
    crop_type = (
        active_cycle.crop_type
        if active_cycle is not None
        else next((field.current_crop for field in fields if field.current_crop), None)
    ) or farm_profile.crop_type
    calendar = _build_calendar(
        crop_type=crop_type,
        country_code=farm_profile.country_code,
        reference_date=today,
        active_cycle=active_cycle,
    )
    risks = _build_risks(
        farm_profile=farm_profile,
        calendar=calendar,
        forecast=forecast,
        history=history,
        alerts=alerts,
    )
    tasks = _build_tasks(
        farm_profile=farm_profile,
        calendar=calendar,
        risks=risks,
    )
    advisory = _build_advisory(
        farm_profile=farm_profile,
        calendar=calendar,
        risks=risks,
        forecast=forecast,
    )
    degraded_reasons = list(dict.fromkeys(forecast.degraded_reasons + history.degraded_reasons))
    return ClimateActionPack(
        crop_calendar=calendar,
        risks=risks,
        tasks=tasks,
        advisory=advisory,
        degraded_mode=forecast.degraded_mode or history.degraded_mode,
        degraded_reasons=degraded_reasons,
    )


def _select_active_cycle(*, crop_cycles: list[CropCycle]) -> CropCycle | None:
    active = [cycle for cycle in crop_cycles if cycle.status == "active"]
    if active:
        return max(active, key=lambda cycle: cycle.planting_date)
    if crop_cycles:
        return max(crop_cycles, key=lambda cycle: cycle.planting_date)
    return None


def _build_calendar(
    *,
    crop_type: str,
    country_code: str,
    reference_date: date,
    active_cycle: CropCycle | None,
) -> CropCalendarSummary:
    normalized_crop = crop_type.strip().lower()
    planting_window = _CALENDAR_WINDOWS.get(country_code, {}).get(normalized_crop, ((4, 6), (9, 11)))
    planting_start, planting_end = _month_window(reference_date.year, *planting_window[0])
    harvest_start, harvest_end = _month_window(reference_date.year, *planting_window[1])
    stage = "seasonal_preparation"
    season_label = "watch_window"
    if active_cycle is not None:
        start = active_cycle.planting_date
        finish = active_cycle.harvest_date or (active_cycle.planting_date + timedelta(days=120))
        total_days = max((finish - start).days, 1)
        progress_days = max((reference_date - start).days, 0)
        progress_ratio = min(max(progress_days / total_days, 0), 1)
        if reference_date < start:
            stage = "pre_planting"
            season_label = "scheduled_cycle"
        elif progress_ratio < 0.25:
            stage = "establishment"
            season_label = "active_cycle"
        elif progress_ratio < 0.7:
            stage = "vegetative_growth"
            season_label = "active_cycle"
        elif progress_ratio < 0.9:
            stage = "maturity"
            season_label = "active_cycle"
        else:
            stage = "harvest_window"
            season_label = "active_cycle"
        planting_start = start
        planting_end = start + timedelta(days=21)
        harvest_start = finish - timedelta(days=14)
        harvest_end = finish + timedelta(days=14)
    else:
        if planting_start <= reference_date <= planting_end:
            stage = "planting_window"
            season_label = "seasonal_window"
        elif harvest_start <= reference_date <= harvest_end:
            stage = "harvest_window"
            season_label = "seasonal_window"
    return CropCalendarSummary(
        crop_type=crop_type,
        country_code=country_code,
        stage=stage,
        season_label=season_label,
        reference_date=reference_date.isoformat(),
        planting_window_start=planting_start.isoformat() if planting_start else None,
        planting_window_end=planting_end.isoformat() if planting_end else None,
        expected_harvest_window_start=harvest_start.isoformat() if harvest_start else None,
        expected_harvest_window_end=harvest_end.isoformat() if harvest_end else None,
    )


def _month_window(year: int, start_month: int, end_month: int) -> tuple[date, date]:
    if end_month >= start_month:
        return date(year, start_month, 1), date(year, end_month, 28)
    return date(year, start_month, 1), date(year + 1, end_month, 28)


def _build_risks(
    *,
    farm_profile: FarmProfile,
    calendar: CropCalendarSummary,
    forecast: WeatherDataset,
    history: WeatherDataset,
    alerts: list[ClimateAlert],
) -> list[RiskSignal]:
    risks: list[RiskSignal] = []
    for alert in alerts:
        if alert.status != "open":
            continue
        risks.append(
            RiskSignal(
                code=f"alert_{alert.alert_type}",
                severity=_severity_to_priority(alert.severity),
                title=alert.headline,
                summary=alert.detail,
                recommended_due_date=datetime.now(tz=UTC).date().isoformat(),
                linked_alert_id=alert.alert_id,
                source="climate_alert",
            )
        )
    if forecast.days:
        wettest_day = max(forecast.days, key=lambda item: item.precipitation_mm or 0.0)
        hottest_day = max(forecast.days, key=lambda item: item.temperature_max_c or float("-inf"))
        dry_days = [
            item
            for item in forecast.days[:5]
            if (item.precipitation_mm or 0.0) <= 5 and (item.evapotranspiration_mm or 0.0) >= 4.5
        ]
        if (wettest_day.precipitation_mm or 0.0) >= 70:
            risks.append(
                RiskSignal(
                    code="forecast_flood_risk",
                    severity="critical",
                    title=f"Heavy rainfall risk for {farm_profile.farm_name}",
                    summary="Forecast rainfall exceeds the field access and drainage threshold for this farm.",
                    recommended_due_date=wettest_day.date,
                    linked_alert_id=None,
                    source="weather_provider",
                )
            )
        elif (wettest_day.precipitation_mm or 0.0) >= 40:
            risks.append(
                RiskSignal(
                    code="forecast_waterlogging_watch",
                    severity="high",
                    title=f"Waterlogging watch for {farm_profile.farm_name}",
                    summary="Forecast rainfall is high enough to threaten field access and input storage.",
                    recommended_due_date=wettest_day.date,
                    linked_alert_id=None,
                    source="weather_provider",
                )
            )
        if (hottest_day.temperature_max_c or 0.0) >= 35:
            risks.append(
                RiskSignal(
                    code="forecast_heat_stress",
                    severity="high",
                    title=f"Heat stress pressure for {calendar.crop_type}",
                    summary="Maximum forecast temperatures exceed the crop heat threshold for labor and irrigation planning.",
                    recommended_due_date=hottest_day.date,
                    linked_alert_id=None,
                    source="weather_provider",
                )
            )
        if len(dry_days) >= 3:
            risks.append(
                RiskSignal(
                    code="forecast_moisture_deficit",
                    severity="high",
                    title=f"Moisture deficit risk for {farm_profile.farm_name}",
                    summary="Several low-rainfall, high-evapotranspiration days are forecast in the next operational window.",
                    recommended_due_date=dry_days[0].date,
                    linked_alert_id=None,
                    source="weather_provider",
                )
            )
        if calendar.stage == "harvest_window" and (wettest_day.precipitation_mm or 0.0) >= 25:
            risks.append(
                RiskSignal(
                    code="harvest_delay_risk",
                    severity="medium",
                    title=f"Harvest timing risk for {calendar.crop_type}",
                    summary="Rain in the harvest window raises drying, spoilage, and field access risk.",
                    recommended_due_date=wettest_day.date,
                    linked_alert_id=None,
                    source="weather_provider",
                )
            )
    if history.days:
        recent_rainfall = sum(item.precipitation_mm or 0.0 for item in history.days)
        if recent_rainfall <= 10 and calendar.stage in {"planting_window", "establishment"}:
            risks.append(
                RiskSignal(
                    code="recent_dry_window",
                    severity="medium",
                    title=f"Dry start risk for {calendar.crop_type}",
                    summary="The recent history window has been dry, so emergence and early establishment need checking.",
                    recommended_due_date=datetime.now(tz=UTC).date().isoformat(),
                    linked_alert_id=None,
                    source="weather_history",
                )
            )
    return sorted(risks, key=lambda item: _risk_order(item.severity, item.source))


def _build_tasks(
    *,
    farm_profile: FarmProfile,
    calendar: CropCalendarSummary,
    risks: list[RiskSignal],
) -> list[TaskRecommendation]:
    tasks: list[TaskRecommendation] = []
    if calendar.stage in {"planting_window", "pre_planting"}:
        tasks.append(
            TaskRecommendation(
                task_id=f"task-{farm_profile.farm_id}-prepare-land",
                title=f"Prepare {calendar.crop_type} planting block",
                description="Confirm seed, field prep, drainage lines, and labor cover before the main planting pass.",
                priority="medium",
                due_date=calendar.planting_window_end,
                source="crop_calendar",
                advisory_topic=f"{calendar.crop_type} planting readiness",
                linked_alert_id=None,
            )
        )
    if calendar.stage == "harvest_window":
        tasks.append(
            TaskRecommendation(
                task_id=f"task-{farm_profile.farm_id}-harvest-plan",
                title=f"Schedule {calendar.crop_type} harvest handling",
                description="Lock labor, sacks, and drying or storage capacity before harvest weather shifts.",
                priority="medium",
                due_date=calendar.expected_harvest_window_start,
                source="crop_calendar",
                advisory_topic=f"{calendar.crop_type} harvest timing",
                linked_alert_id=None,
            )
        )
    for risk in risks[:4]:
        if risk.code in {"forecast_flood_risk", "forecast_waterlogging_watch"}:
            tasks.append(
                TaskRecommendation(
                    task_id=f"task-{farm_profile.farm_id}-drainage-{risk.code}",
                    title="Inspect drainage and move vulnerable inputs",
                    description="Open blocked channels, move fertilizer and seed away from wet floors, and confirm field access alternatives.",
                    priority="high" if risk.severity == "critical" else "medium",
                    due_date=risk.recommended_due_date,
                    source=risk.source,
                    advisory_topic="flood and waterlogging mitigation",
                    linked_alert_id=risk.linked_alert_id,
                )
            )
        elif risk.code in {"forecast_heat_stress", "forecast_moisture_deficit", "recent_dry_window"}:
            tasks.append(
                TaskRecommendation(
                    task_id=f"task-{farm_profile.farm_id}-moisture-{risk.code}",
                    title="Review irrigation, mulch, and labor timing",
                    description="Shift labor to cooler hours, prioritize irrigation if available, and check mulch or moisture retention actions.",
                    priority="medium",
                    due_date=risk.recommended_due_date,
                    source=risk.source,
                    advisory_topic="moisture and heat management",
                    linked_alert_id=risk.linked_alert_id,
                )
            )
        elif risk.code == "harvest_delay_risk":
            tasks.append(
                TaskRecommendation(
                    task_id=f"task-{farm_profile.farm_id}-harvest-weather",
                    title="Advance harvest staging before rain",
                    description="Prepare tarpaulins, transport, and buyers so harvest can move inside the drier part of the window.",
                    priority="medium",
                    due_date=risk.recommended_due_date,
                    source=risk.source,
                    advisory_topic="harvest delay mitigation",
                    linked_alert_id=risk.linked_alert_id,
                )
            )
        elif risk.source == "climate_alert":
            tasks.append(
                TaskRecommendation(
                    task_id=f"task-{farm_profile.farm_id}-alert-{risk.linked_alert_id}",
                    title=f"Respond to climate alert: {risk.title}",
                    description=risk.summary,
                    priority="high" if risk.severity in {"critical", "high"} else "medium",
                    due_date=risk.recommended_due_date,
                    source="climate_alert",
                    advisory_topic=risk.title,
                    linked_alert_id=risk.linked_alert_id,
                )
            )
    deduped: list[TaskRecommendation] = []
    seen_titles: set[str] = set()
    for task in tasks:
        if task.title in seen_titles:
            continue
        seen_titles.add(task.title)
        deduped.append(task)
    return deduped


def _build_advisory(
    *,
    farm_profile: FarmProfile,
    calendar: CropCalendarSummary,
    risks: list[RiskSignal],
    forecast: WeatherDataset,
) -> AdvisoryLink:
    top_risks = risks[:3]
    if top_risks:
        topic = top_risks[0].title
        risk_summary = " ".join(item.summary for item in top_risks)
    else:
        topic = f"{calendar.crop_type} weekly planning"
        risk_summary = "No severe risk trigger is active, so the advisory should focus on routine timing and field checks."
    next_day = forecast.days[0] if forecast.days else None
    response = (
        f"For {farm_profile.farm_name} in {farm_profile.district}, keep this week focused on "
        f"{calendar.stage.replace('_', ' ')} for {calendar.crop_type}. {risk_summary}"
    )
    if next_day is not None:
        response += (
            f" The next forecast day shows about {next_day.precipitation_mm or 0} mm rain and "
            f"a maximum temperature near {next_day.temperature_max_c or 0}C."
        )
    return AdvisoryLink(
        topic=topic,
        draft_question=(
            f"What are the top actions for {farm_profile.farm_name} this week given the "
            f"{calendar.crop_type} climate outlook?"
        ),
        draft_response=response,
        policy_context={
            "farm_id": farm_profile.farm_id,
            "crop": calendar.crop_type,
            "country_code": farm_profile.country_code,
            "calendar_stage": calendar.stage,
            "risk_codes": [item.code for item in top_risks],
        },
        requires_human_review=False,
    )


def _risk_order(severity: str, source: str) -> tuple[int, int]:
    severity_rank = {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(severity, 4)
    source_rank = {"climate_alert": 0, "weather_provider": 1, "weather_history": 2}.get(source, 3)
    return severity_rank, source_rank


def _severity_to_priority(severity: str) -> str:
    return {
        "critical": "critical",
        "high": "high",
        "medium": "medium",
        "low": "low",
        "warning": "high",
        "info": "low",
    }.get(severity, "medium")
