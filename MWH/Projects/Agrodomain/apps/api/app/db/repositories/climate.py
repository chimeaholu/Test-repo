from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.climate import ClimateAlert, ClimateObservation, FarmProfile, MrvEvidenceRecord


@dataclass(frozen=True)
class SourceWindowCoverage:
    fully_covered: bool
    degraded: bool
    reason_codes: list[str]


class ClimateRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def upsert_farm_profile(
        self,
        *,
        farm_id: str,
        actor_id: str,
        country_code: str,
        farm_name: str,
        district: str,
        crop_type: str,
        hectares: float,
        latitude: float | None,
        longitude: float | None,
        metadata_json: dict[str, object] | None = None,
    ) -> FarmProfile:
        profile = self.get_farm_profile(farm_id=farm_id)
        if profile is None:
            profile = FarmProfile(
                farm_id=farm_id,
                actor_id=actor_id,
                country_code=country_code,
                farm_name=farm_name,
                district=district,
                crop_type=crop_type,
                hectares=hectares,
                latitude=latitude,
                longitude=longitude,
                metadata_json=metadata_json or {},
            )
            self.session.add(profile)
            self.session.flush()
            return profile

        profile.actor_id = actor_id
        profile.country_code = country_code
        profile.farm_name = farm_name
        profile.district = district
        profile.crop_type = crop_type
        profile.hectares = hectares
        profile.latitude = latitude
        profile.longitude = longitude
        profile.metadata_json = metadata_json or {}
        self.session.flush()
        return profile

    def get_farm_profile(self, *, farm_id: str) -> FarmProfile | None:
        statement = select(FarmProfile).where(FarmProfile.farm_id == farm_id)
        return self.session.execute(statement).scalar_one_or_none()

    def list_farm_profiles(self, *, farm_ids: list[str]) -> dict[str, FarmProfile]:
        if not farm_ids:
            return {}
        statement = select(FarmProfile).where(FarmProfile.farm_id.in_(farm_ids))
        items = list(self.session.execute(statement).scalars().all())
        return {item.farm_id: item for item in items}

    def get_farm_profile_for_actor(
        self, *, farm_id: str, actor_id: str, country_code: str
    ) -> FarmProfile | None:
        statement = select(FarmProfile).where(
            FarmProfile.farm_id == farm_id,
            FarmProfile.actor_id == actor_id,
            FarmProfile.country_code == country_code,
        )
        return self.session.execute(statement).scalar_one_or_none()

    def create_observation(
        self,
        *,
        observation_id: str,
        farm_id: str,
        actor_id: str,
        country_code: str,
        source_id: str,
        source_type: str,
        observed_at: datetime,
        source_window_start: datetime,
        source_window_end: datetime,
        rainfall_mm: float | None,
        temperature_c: float | None,
        soil_moisture_pct: float | None,
        anomaly_score: float | None,
        ingestion_state: str,
        degraded_mode: bool,
        degraded_reason_codes: list[str],
        assumptions: list[str],
        provenance: list[dict[str, object]],
        normalized_payload: dict[str, object],
    ) -> ClimateObservation:
        record = ClimateObservation(
            observation_id=observation_id,
            farm_id=farm_id,
            actor_id=actor_id,
            country_code=country_code,
            source_id=source_id,
            source_type=source_type,
            observed_at=observed_at,
            source_window_start=source_window_start,
            source_window_end=source_window_end,
            rainfall_mm=rainfall_mm,
            temperature_c=temperature_c,
            soil_moisture_pct=soil_moisture_pct,
            anomaly_score=anomaly_score,
            ingestion_state=ingestion_state,
            degraded_mode=degraded_mode,
            degraded_reason_codes=degraded_reason_codes,
            assumptions=assumptions,
            provenance=provenance,
            normalized_payload=normalized_payload,
        )
        self.session.add(record)
        self.session.flush()
        return record

    def get_observation(self, *, observation_id: str) -> ClimateObservation | None:
        statement = select(ClimateObservation).where(
            ClimateObservation.observation_id == observation_id
        )
        return self.session.execute(statement).scalar_one_or_none()

    def list_observations_by_ids(
        self, *, observation_ids: list[str]
    ) -> dict[str, ClimateObservation]:
        if not observation_ids:
            return {}
        statement = select(ClimateObservation).where(
            ClimateObservation.observation_id.in_(observation_ids)
        )
        items = list(self.session.execute(statement).scalars().all())
        return {item.observation_id: item for item in items}

    def list_observations_for_window(
        self, *, farm_id: str, window_start: datetime, window_end: datetime
    ) -> list[ClimateObservation]:
        statement = (
            select(ClimateObservation)
            .where(
                ClimateObservation.farm_id == farm_id,
                ClimateObservation.source_window_end >= window_start,
                ClimateObservation.source_window_start <= window_end,
            )
            .order_by(ClimateObservation.observed_at.asc(), ClimateObservation.id.asc())
        )
        return list(self.session.execute(statement).scalars().all())

    def list_observations_for_farm(self, *, farm_id: str) -> list[ClimateObservation]:
        statement = (
            select(ClimateObservation)
            .where(ClimateObservation.farm_id == farm_id)
            .order_by(ClimateObservation.observed_at.desc(), ClimateObservation.id.desc())
        )
        return list(self.session.execute(statement).scalars().all())

    def list_observations_for_farms(
        self, *, farm_ids: list[str]
    ) -> dict[str, list[ClimateObservation]]:
        if not farm_ids:
            return {}
        statement = (
            select(ClimateObservation)
            .where(ClimateObservation.farm_id.in_(farm_ids))
            .order_by(
                ClimateObservation.farm_id.asc(),
                ClimateObservation.observed_at.desc(),
                ClimateObservation.id.desc(),
            )
        )
        items = list(self.session.execute(statement).scalars().all())
        grouped: dict[str, list[ClimateObservation]] = {farm_id: [] for farm_id in farm_ids}
        for item in items:
            grouped.setdefault(item.farm_id, []).append(item)
        return grouped

    def create_alert(
        self,
        *,
        alert_id: str,
        farm_id: str,
        actor_id: str,
        country_code: str,
        observation_id: str | None,
        alert_type: str,
        severity: str,
        precedence_rank: int,
        headline: str,
        detail: str,
        source_confidence: str,
        degraded_mode: bool,
        degraded_reason_codes: list[str],
        farm_context: dict[str, object],
    ) -> ClimateAlert:
        alert = ClimateAlert(
            alert_id=alert_id,
            farm_id=farm_id,
            actor_id=actor_id,
            country_code=country_code,
            observation_id=observation_id,
            alert_type=alert_type,
            severity=severity,
            precedence_rank=precedence_rank,
            headline=headline,
            detail=detail,
            source_confidence=source_confidence,
            degraded_mode=degraded_mode,
            degraded_reason_codes=degraded_reason_codes,
            farm_context=farm_context,
        )
        self.session.add(alert)
        self.session.flush()
        return alert

    def list_alerts_for_actor(
        self, *, actor_id: str, country_code: str, farm_id: str | None = None
    ) -> list[ClimateAlert]:
        statement = (
            select(ClimateAlert)
            .where(ClimateAlert.actor_id == actor_id, ClimateAlert.country_code == country_code)
            .order_by(ClimateAlert.created_at.desc(), ClimateAlert.id.desc())
        )
        if farm_id is not None:
            statement = statement.where(ClimateAlert.farm_id == farm_id)
        return list(self.session.execute(statement).scalars().all())

    def list_alerts_for_farms(
        self, *, actor_id: str, country_code: str, farm_ids: list[str]
    ) -> dict[str, list[ClimateAlert]]:
        if not farm_ids:
            return {}
        statement = (
            select(ClimateAlert)
            .where(
                ClimateAlert.actor_id == actor_id,
                ClimateAlert.country_code == country_code,
                ClimateAlert.farm_id.in_(farm_ids),
            )
            .order_by(ClimateAlert.farm_id.asc(), ClimateAlert.created_at.desc(), ClimateAlert.id.desc())
        )
        items = list(self.session.execute(statement).scalars().all())
        grouped: dict[str, list[ClimateAlert]] = {farm_id: [] for farm_id in farm_ids}
        for item in items:
            grouped.setdefault(item.farm_id, []).append(item)
        return grouped

    def get_alert_for_actor(
        self, *, alert_id: str, actor_id: str, country_code: str
    ) -> ClimateAlert | None:
        statement = select(ClimateAlert).where(
            ClimateAlert.alert_id == alert_id,
            ClimateAlert.actor_id == actor_id,
            ClimateAlert.country_code == country_code,
        )
        return self.session.execute(statement).scalar_one_or_none()

    def acknowledge_alert(
        self,
        *,
        alert: ClimateAlert,
        actor_id: str,
        acknowledged_at: datetime,
        note: str | None,
    ) -> ClimateAlert:
        alert.status = "acknowledged"
        alert.acknowledged_by_actor_id = actor_id
        alert.acknowledged_at = acknowledged_at
        alert.acknowledgement_note = note
        self.session.flush()
        return alert

    def create_mrv_evidence_record(
        self,
        *,
        evidence_id: str,
        farm_id: str,
        actor_id: str,
        country_code: str,
        evidence_type: str,
        method_tag: str,
        method_references: list[str],
        source_window_start: datetime,
        source_window_end: datetime,
        source_observation_ids: list[str],
        alert_ids: list[str],
        assumptions: list[str],
        provenance: list[dict[str, object]],
        source_completeness_state: str,
        degraded_mode: bool,
        degraded_reason_codes: list[str],
        summary: dict[str, object],
    ) -> MrvEvidenceRecord:
        record = MrvEvidenceRecord(
            evidence_id=evidence_id,
            farm_id=farm_id,
            actor_id=actor_id,
            country_code=country_code,
            evidence_type=evidence_type,
            method_tag=method_tag,
            method_references=method_references,
            source_window_start=source_window_start,
            source_window_end=source_window_end,
            source_observation_ids=source_observation_ids,
            alert_ids=alert_ids,
            assumptions=assumptions,
            provenance=provenance,
            source_completeness_state=source_completeness_state,
            degraded_mode=degraded_mode,
            degraded_reason_codes=degraded_reason_codes,
            summary=summary,
        )
        self.session.add(record)
        self.session.flush()
        return record

    def list_mrv_evidence_for_actor(
        self, *, actor_id: str, country_code: str, farm_id: str | None = None
    ) -> list[MrvEvidenceRecord]:
        statement = (
            select(MrvEvidenceRecord)
            .where(MrvEvidenceRecord.actor_id == actor_id, MrvEvidenceRecord.country_code == country_code)
            .order_by(MrvEvidenceRecord.created_at.desc(), MrvEvidenceRecord.id.desc())
        )
        if farm_id is not None:
            statement = statement.where(MrvEvidenceRecord.farm_id == farm_id)
        return list(self.session.execute(statement).scalars().all())

    def get_alerts_for_farm(self, *, farm_id: str, actor_id: str, country_code: str) -> list[ClimateAlert]:
        statement = (
            select(ClimateAlert)
            .where(
                ClimateAlert.farm_id == farm_id,
                ClimateAlert.actor_id == actor_id,
                ClimateAlert.country_code == country_code,
            )
            .order_by(ClimateAlert.created_at.desc(), ClimateAlert.id.desc())
        )
        return list(self.session.execute(statement).scalars().all())

    @staticmethod
    def _coerce_utc(value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value.astimezone(UTC)

    @staticmethod
    def evaluate_source_window_coverage(
        *,
        observations: list[ClimateObservation],
        source_window_start: datetime,
        source_window_end: datetime,
    ) -> SourceWindowCoverage:
        reason_codes: list[str] = []
        degraded = False
        if not observations:
            return SourceWindowCoverage(
                fully_covered=False,
                degraded=True,
                reason_codes=["source_window_unavailable"],
            )

        earliest_start = min(ClimateRepository._coerce_utc(item.source_window_start) for item in observations)
        latest_end = max(ClimateRepository._coerce_utc(item.source_window_end) for item in observations)
        source_window_start = ClimateRepository._coerce_utc(source_window_start)
        source_window_end = ClimateRepository._coerce_utc(source_window_end)
        if earliest_start > source_window_start or latest_end < source_window_end:
            degraded = True
            reason_codes.append("source_window_unavailable")
        if any(item.degraded_mode for item in observations):
            degraded = True
            reason_codes.append("source_window_inconsistent")
        return SourceWindowCoverage(
            fully_covered=not degraded,
            degraded=degraded,
            reason_codes=reason_codes,
        )
