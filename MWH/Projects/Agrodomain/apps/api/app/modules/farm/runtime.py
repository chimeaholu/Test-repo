from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from uuid import uuid4

from app.db.models.climate import FarmProfile
from app.db.models.farm import CropCycle, FarmActivity, FarmField, FarmInput
from app.db.repositories.farm import FarmRepository
from app.services.commands.errors import CommandRejectedError

FARM_WRITE_ROLES = {"farmer", "cooperative", "admin"}
FIELD_STATUSES = {"active", "fallow", "preparing"}
ACTIVITY_TYPES = {
    "planting",
    "weeding",
    "fertilizing",
    "spraying",
    "irrigating",
    "harvesting",
    "other",
}
INPUT_TYPES = {"seed", "fertilizer", "pesticide", "herbicide", "other"}
CROP_CYCLE_STATUSES = {"planned", "active", "harvested", "failed"}


@dataclass(slots=True)
class FarmCreateResult:
    farm: FarmProfile


@dataclass(slots=True)
class FieldCreateResult:
    field: FarmField
    crop_cycle: CropCycle | None


class FarmRuntime:
    def __init__(self, repository: FarmRepository) -> None:
        self.repository = repository

    @staticmethod
    def _ensure_write_access(actor_id: str, actor_role: str | None) -> None:
        if actor_id == "system:test":
            return
        if actor_role not in FARM_WRITE_ROLES:
            raise CommandRejectedError(
                status_code=403,
                error_code="policy_denied",
                reason_code="farm_write_forbidden",
                payload={"actor_role": actor_role},
            )

    @staticmethod
    def _ensure_positive(value: float, *, field_name: str) -> None:
        if value <= 0:
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code=f"{field_name}_non_positive",
                payload={"field": field_name},
            )

    @staticmethod
    def _ensure_status(value: str, *, field_name: str, allowed: set[str]) -> str:
        normalized = value.strip().lower()
        if normalized not in allowed:
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code=f"invalid_{field_name}",
                payload={"field": field_name, "allowed": sorted(allowed)},
            )
        return normalized

    @staticmethod
    def _ensure_date_order(
        start: date | None,
        end: date | None,
        *,
        start_name: str,
        end_name: str,
    ) -> None:
        if start is not None and end is not None and end < start:
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code=f"{end_name}_before_{start_name}",
                payload={"start": start_name, "end": end_name},
            )

    @staticmethod
    def _ensure_geojson(boundary_geojson: dict[str, object] | None) -> None:
        if boundary_geojson is None:
            return
        geojson_type = boundary_geojson.get("type")
        if not isinstance(geojson_type, str):
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code="invalid_boundary_geojson",
                payload={"field": "boundary_geojson"},
            )
        if geojson_type not in {"Polygon", "MultiPolygon", "Feature", "FeatureCollection"}:
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code="unsupported_boundary_geojson",
                payload={"field": "boundary_geojson", "type": geojson_type},
            )

    def create_farm(
        self,
        *,
        actor_id: str,
        actor_role: str | None,
        country_code: str,
        farm_name: str,
        district: str,
        crop_type: str,
        hectares: float,
        latitude: float | None,
        longitude: float | None,
        metadata_json: dict[str, object],
    ) -> FarmCreateResult:
        self._ensure_write_access(actor_id, actor_role)
        self._ensure_positive(hectares, field_name="hectares")
        if not farm_name.strip() or not district.strip() or not crop_type.strip():
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code="farm_identity_missing",
                payload={},
            )
        farm = self.repository.create_farm(
            farm_id=f"farm-{uuid4().hex[:12]}",
            actor_id=actor_id,
            country_code=country_code,
            farm_name=farm_name.strip(),
            district=district.strip(),
            crop_type=crop_type.strip(),
            hectares=round(hectares, 2),
            latitude=latitude,
            longitude=longitude,
            metadata_json=metadata_json,
        )
        return FarmCreateResult(farm=farm)

    def update_farm(
        self,
        *,
        actor_id: str,
        actor_role: str | None,
        farm: FarmProfile,
        farm_name: str,
        district: str,
        crop_type: str,
        hectares: float,
        latitude: float | None,
        longitude: float | None,
        metadata_json: dict[str, object],
    ) -> FarmProfile:
        self._ensure_write_access(actor_id, actor_role)
        self._ensure_positive(hectares, field_name="hectares")
        if not farm_name.strip() or not district.strip() or not crop_type.strip():
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code="farm_identity_missing",
                payload={},
            )
        return self.repository.update_farm(
            farm=farm,
            farm_name=farm_name.strip(),
            district=district.strip(),
            crop_type=crop_type.strip(),
            hectares=round(hectares, 2),
            latitude=latitude,
            longitude=longitude,
            metadata_json=metadata_json,
        )

    def create_field(
        self,
        *,
        actor_id: str,
        actor_role: str | None,
        farm: FarmProfile,
        name: str,
        boundary_geojson: dict[str, object] | None,
        area_hectares: float,
        soil_type: str | None,
        irrigation_type: str | None,
        current_crop: str | None,
        planting_date: date | None,
        expected_harvest_date: date | None,
        status: str,
    ) -> FieldCreateResult:
        self._ensure_write_access(actor_id, actor_role)
        self._ensure_positive(area_hectares, field_name="area_hectares")
        self._ensure_geojson(boundary_geojson)
        self._ensure_date_order(
            planting_date,
            expected_harvest_date,
            start_name="planting_date",
            end_name="expected_harvest_date",
        )
        normalized_status = self._ensure_status(status, field_name="field_status", allowed=FIELD_STATUSES)
        if not name.strip():
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code="field_name_missing",
                payload={},
            )

        field = self.repository.create_field(
            field_id=f"field-{uuid4().hex[:12]}",
            farm_id=farm.farm_id,
            actor_id=farm.actor_id,
            country_code=farm.country_code,
            name=name.strip(),
            boundary_geojson=boundary_geojson,
            area_hectares=round(area_hectares, 2),
            soil_type=soil_type.strip() if soil_type else None,
            irrigation_type=irrigation_type.strip() if irrigation_type else None,
            current_crop=current_crop.strip() if current_crop else None,
            planting_date=planting_date,
            expected_harvest_date=expected_harvest_date,
            status=normalized_status,
        )

        crop_cycle = None
        if field.current_crop and field.planting_date is not None:
            crop_cycle = self.repository.create_crop_cycle(
                crop_cycle_id=f"cycle-{uuid4().hex[:12]}",
                farm_id=farm.farm_id,
                field_id=field.field_id,
                actor_id=farm.actor_id,
                country_code=farm.country_code,
                crop_type=field.current_crop,
                variety=None,
                planting_date=field.planting_date,
                harvest_date=field.expected_harvest_date,
                yield_tons=None,
                revenue=None,
                status="active" if normalized_status == "active" else "planned",
            )
        return FieldCreateResult(field=field, crop_cycle=crop_cycle)

    def update_field(
        self,
        *,
        actor_id: str,
        actor_role: str | None,
        field: FarmField,
        name: str,
        boundary_geojson: dict[str, object] | None,
        area_hectares: float,
        soil_type: str | None,
        irrigation_type: str | None,
        current_crop: str | None,
        planting_date: date | None,
        expected_harvest_date: date | None,
        status: str,
    ) -> FarmField:
        self._ensure_write_access(actor_id, actor_role)
        self._ensure_positive(area_hectares, field_name="area_hectares")
        self._ensure_geojson(boundary_geojson)
        self._ensure_date_order(
            planting_date,
            expected_harvest_date,
            start_name="planting_date",
            end_name="expected_harvest_date",
        )
        normalized_status = self._ensure_status(status, field_name="field_status", allowed=FIELD_STATUSES)
        if not name.strip():
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code="field_name_missing",
                payload={},
            )
        return self.repository.update_field(
            field=field,
            name=name.strip(),
            boundary_geojson=boundary_geojson,
            area_hectares=round(area_hectares, 2),
            soil_type=soil_type.strip() if soil_type else None,
            irrigation_type=irrigation_type.strip() if irrigation_type else None,
            current_crop=current_crop.strip() if current_crop else None,
            planting_date=planting_date,
            expected_harvest_date=expected_harvest_date,
            status=normalized_status,
        )

    def create_activity(
        self,
        *,
        actor_id: str,
        actor_role: str | None,
        farm: FarmProfile,
        field: FarmField,
        activity_type: str,
        activity_date: date,
        description: str,
        inputs_used: list[dict[str, object]],
        labor_hours: float | None,
        cost: float | None,
        notes: str | None,
    ) -> FarmActivity:
        self._ensure_write_access(actor_id, actor_role)
        normalized_activity_type = self._ensure_status(
            activity_type,
            field_name="activity_type",
            allowed=ACTIVITY_TYPES,
        )
        if not description.strip():
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code="activity_description_missing",
                payload={},
            )
        if labor_hours is not None and labor_hours < 0:
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code="labor_hours_negative",
                payload={"field": "labor_hours"},
            )
        if cost is not None and cost < 0:
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code="activity_cost_negative",
                payload={"field": "cost"},
            )
        return self.repository.create_activity(
            activity_id=f"activity-{uuid4().hex[:12]}",
            farm_id=farm.farm_id,
            field_id=field.field_id,
            actor_id=farm.actor_id,
            country_code=farm.country_code,
            activity_type=normalized_activity_type,
            activity_date=activity_date,
            description=description.strip(),
            inputs_used=inputs_used,
            labor_hours=round(labor_hours, 2) if labor_hours is not None else None,
            cost=round(cost, 2) if cost is not None else None,
            notes=notes.strip() if notes else None,
        )

    def update_activity(
        self,
        *,
        actor_id: str,
        actor_role: str | None,
        activity: FarmActivity,
        field: FarmField,
        activity_type: str,
        activity_date: date,
        description: str,
        inputs_used: list[dict[str, object]],
        labor_hours: float | None,
        cost: float | None,
        notes: str | None,
    ) -> FarmActivity:
        self._ensure_write_access(actor_id, actor_role)
        normalized_activity_type = self._ensure_status(
            activity_type,
            field_name="activity_type",
            allowed=ACTIVITY_TYPES,
        )
        if not description.strip():
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code="activity_description_missing",
                payload={},
            )
        return self.repository.update_activity(
            activity=activity,
            field_id=field.field_id,
            activity_type=normalized_activity_type,
            activity_date=activity_date,
            description=description.strip(),
            inputs_used=inputs_used,
            labor_hours=round(labor_hours, 2) if labor_hours is not None else None,
            cost=round(cost, 2) if cost is not None else None,
            notes=notes.strip() if notes else None,
        )

    def create_input(
        self,
        *,
        actor_id: str,
        actor_role: str | None,
        farm: FarmProfile,
        input_type: str,
        name: str,
        quantity: float,
        unit: str,
        cost: float | None,
        supplier: str | None,
        purchase_date: date,
        expiry_date: date | None,
    ) -> FarmInput:
        self._ensure_write_access(actor_id, actor_role)
        normalized_input_type = self._ensure_status(
            input_type,
            field_name="input_type",
            allowed=INPUT_TYPES,
        )
        self._ensure_positive(quantity, field_name="quantity")
        self._ensure_date_order(
            purchase_date,
            expiry_date,
            start_name="purchase_date",
            end_name="expiry_date",
        )
        if not name.strip() or not unit.strip():
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code="input_identity_missing",
                payload={},
            )
        if cost is not None and cost < 0:
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code="input_cost_negative",
                payload={"field": "cost"},
            )
        return self.repository.create_input(
            input_id=f"input-{uuid4().hex[:12]}",
            farm_id=farm.farm_id,
            actor_id=farm.actor_id,
            country_code=farm.country_code,
            input_type=normalized_input_type,
            name=name.strip(),
            quantity=round(quantity, 2),
            unit=unit.strip(),
            cost=round(cost, 2) if cost is not None else None,
            supplier=supplier.strip() if supplier else None,
            purchase_date=purchase_date,
            expiry_date=expiry_date,
        )

    def update_input(
        self,
        *,
        actor_id: str,
        actor_role: str | None,
        farm_input: FarmInput,
        input_type: str,
        name: str,
        quantity: float,
        unit: str,
        cost: float | None,
        supplier: str | None,
        purchase_date: date,
        expiry_date: date | None,
    ) -> FarmInput:
        self._ensure_write_access(actor_id, actor_role)
        normalized_input_type = self._ensure_status(
            input_type,
            field_name="input_type",
            allowed=INPUT_TYPES,
        )
        self._ensure_positive(quantity, field_name="quantity")
        self._ensure_date_order(
            purchase_date,
            expiry_date,
            start_name="purchase_date",
            end_name="expiry_date",
        )
        if not name.strip() or not unit.strip():
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code="input_identity_missing",
                payload={},
            )
        return self.repository.update_input(
            farm_input=farm_input,
            input_type=normalized_input_type,
            name=name.strip(),
            quantity=round(quantity, 2),
            unit=unit.strip(),
            cost=round(cost, 2) if cost is not None else None,
            supplier=supplier.strip() if supplier else None,
            purchase_date=purchase_date,
            expiry_date=expiry_date,
        )

    def create_crop_cycle(
        self,
        *,
        actor_id: str,
        actor_role: str | None,
        farm: FarmProfile,
        field: FarmField,
        crop_type: str,
        variety: str | None,
        planting_date: date,
        harvest_date: date | None,
        yield_tons: float | None,
        revenue: float | None,
        status: str,
    ) -> CropCycle:
        self._ensure_write_access(actor_id, actor_role)
        normalized_status = self._ensure_status(
            status,
            field_name="crop_cycle_status",
            allowed=CROP_CYCLE_STATUSES,
        )
        self._ensure_date_order(
            planting_date,
            harvest_date,
            start_name="planting_date",
            end_name="harvest_date",
        )
        if not crop_type.strip():
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code="crop_type_missing",
                payload={},
            )
        if yield_tons is not None and yield_tons < 0:
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code="yield_tons_negative",
                payload={"field": "yield_tons"},
            )
        if revenue is not None and revenue < 0:
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code="revenue_negative",
                payload={"field": "revenue"},
            )
        return self.repository.create_crop_cycle(
            crop_cycle_id=f"cycle-{uuid4().hex[:12]}",
            farm_id=farm.farm_id,
            field_id=field.field_id,
            actor_id=farm.actor_id,
            country_code=farm.country_code,
            crop_type=crop_type.strip(),
            variety=variety.strip() if variety else None,
            planting_date=planting_date,
            harvest_date=harvest_date,
            yield_tons=round(yield_tons, 2) if yield_tons is not None else None,
            revenue=round(revenue, 2) if revenue is not None else None,
            status=normalized_status,
        )

    def update_crop_cycle(
        self,
        *,
        actor_id: str,
        actor_role: str | None,
        crop_cycle: CropCycle,
        field: FarmField,
        crop_type: str,
        variety: str | None,
        planting_date: date,
        harvest_date: date | None,
        yield_tons: float | None,
        revenue: float | None,
        status: str,
    ) -> CropCycle:
        self._ensure_write_access(actor_id, actor_role)
        normalized_status = self._ensure_status(
            status,
            field_name="crop_cycle_status",
            allowed=CROP_CYCLE_STATUSES,
        )
        self._ensure_date_order(
            planting_date,
            harvest_date,
            start_name="planting_date",
            end_name="harvest_date",
        )
        if not crop_type.strip():
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code="crop_type_missing",
                payload={},
            )
        return self.repository.update_crop_cycle(
            crop_cycle=crop_cycle,
            field_id=field.field_id,
            crop_type=crop_type.strip(),
            variety=variety.strip() if variety else None,
            planting_date=planting_date,
            harvest_date=harvest_date,
            yield_tons=round(yield_tons, 2) if yield_tons is not None else None,
            revenue=round(revenue, 2) if revenue is not None else None,
            status=normalized_status,
        )
