from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.climate import FarmProfile
from app.db.models.farm import CropCycle, FarmActivity, FarmField, FarmInput


class FarmRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_farms_for_actor(self, *, actor_id: str, country_code: str) -> list[FarmProfile]:
        statement = (
            select(FarmProfile)
            .where(
                FarmProfile.actor_id == actor_id,
                FarmProfile.country_code == country_code,
            )
            .order_by(FarmProfile.updated_at.desc(), FarmProfile.id.desc())
        )
        return list(self.session.execute(statement).scalars().all())

    def create_farm(
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
        metadata_json: dict[str, object],
    ) -> FarmProfile:
        record = FarmProfile(
            farm_id=farm_id,
            actor_id=actor_id,
            country_code=country_code,
            farm_name=farm_name,
            district=district,
            crop_type=crop_type,
            hectares=hectares,
            latitude=latitude,
            longitude=longitude,
            metadata_json=metadata_json,
        )
        self.session.add(record)
        self.session.flush()
        return record

    def get_farm(self, *, farm_id: str) -> FarmProfile | None:
        statement = select(FarmProfile).where(FarmProfile.farm_id == farm_id)
        return self.session.execute(statement).scalar_one_or_none()

    def get_farm_for_actor(
        self, *, farm_id: str, actor_id: str, country_code: str
    ) -> FarmProfile | None:
        statement = select(FarmProfile).where(
            FarmProfile.farm_id == farm_id,
            FarmProfile.actor_id == actor_id,
            FarmProfile.country_code == country_code,
        )
        return self.session.execute(statement).scalar_one_or_none()

    def update_farm(
        self,
        *,
        farm: FarmProfile,
        farm_name: str,
        district: str,
        crop_type: str,
        hectares: float,
        latitude: float | None,
        longitude: float | None,
        metadata_json: dict[str, object],
    ) -> FarmProfile:
        farm.farm_name = farm_name
        farm.district = district
        farm.crop_type = crop_type
        farm.hectares = hectares
        farm.latitude = latitude
        farm.longitude = longitude
        farm.metadata_json = metadata_json
        self.session.flush()
        return farm

    def list_fields(self, *, farm_id: str) -> list[FarmField]:
        statement = (
            select(FarmField)
            .where(FarmField.farm_id == farm_id)
            .order_by(FarmField.created_at.asc(), FarmField.id.asc())
        )
        return list(self.session.execute(statement).scalars().all())

    def list_fields_for_farms(self, *, farm_ids: list[str]) -> dict[str, list[FarmField]]:
        if not farm_ids:
            return {}
        statement = (
            select(FarmField)
            .where(FarmField.farm_id.in_(farm_ids))
            .order_by(FarmField.farm_id.asc(), FarmField.created_at.asc(), FarmField.id.asc())
        )
        items = list(self.session.execute(statement).scalars().all())
        grouped: dict[str, list[FarmField]] = {farm_id: [] for farm_id in farm_ids}
        for item in items:
            grouped.setdefault(item.farm_id, []).append(item)
        return grouped

    def create_field(
        self,
        *,
        field_id: str,
        farm_id: str,
        actor_id: str,
        country_code: str,
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
        record = FarmField(
            field_id=field_id,
            farm_id=farm_id,
            actor_id=actor_id,
            country_code=country_code,
            name=name,
            boundary_geojson=boundary_geojson,
            area_hectares=area_hectares,
            soil_type=soil_type,
            irrigation_type=irrigation_type,
            current_crop=current_crop,
            planting_date=planting_date,
            expected_harvest_date=expected_harvest_date,
            status=status,
        )
        self.session.add(record)
        self.session.flush()
        return record

    def get_field(self, *, field_id: str) -> FarmField | None:
        statement = select(FarmField).where(FarmField.field_id == field_id)
        return self.session.execute(statement).scalar_one_or_none()

    def get_field_for_farm(self, *, farm_id: str, field_id: str) -> FarmField | None:
        statement = select(FarmField).where(
            FarmField.farm_id == farm_id,
            FarmField.field_id == field_id,
        )
        return self.session.execute(statement).scalar_one_or_none()

    def update_field(
        self,
        *,
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
        field.name = name
        field.boundary_geojson = boundary_geojson
        field.area_hectares = area_hectares
        field.soil_type = soil_type
        field.irrigation_type = irrigation_type
        field.current_crop = current_crop
        field.planting_date = planting_date
        field.expected_harvest_date = expected_harvest_date
        field.status = status
        self.session.flush()
        return field

    def delete_field(self, *, field: FarmField) -> None:
        self.session.delete(field)
        self.session.flush()

    def list_activities(self, *, farm_id: str) -> list[FarmActivity]:
        statement = (
            select(FarmActivity)
            .where(FarmActivity.farm_id == farm_id)
            .order_by(FarmActivity.activity_date.desc(), FarmActivity.id.desc())
        )
        return list(self.session.execute(statement).scalars().all())

    def list_activities_for_farms(self, *, farm_ids: list[str]) -> dict[str, list[FarmActivity]]:
        if not farm_ids:
            return {}
        statement = (
            select(FarmActivity)
            .where(FarmActivity.farm_id.in_(farm_ids))
            .order_by(FarmActivity.farm_id.asc(), FarmActivity.activity_date.desc(), FarmActivity.id.desc())
        )
        items = list(self.session.execute(statement).scalars().all())
        grouped: dict[str, list[FarmActivity]] = {farm_id: [] for farm_id in farm_ids}
        for item in items:
            grouped.setdefault(item.farm_id, []).append(item)
        return grouped

    def create_activity(
        self,
        *,
        activity_id: str,
        farm_id: str,
        field_id: str,
        actor_id: str,
        country_code: str,
        activity_type: str,
        activity_date: date,
        description: str,
        inputs_used: list[dict[str, object]],
        labor_hours: float | None,
        cost: float | None,
        notes: str | None,
    ) -> FarmActivity:
        record = FarmActivity(
            activity_id=activity_id,
            farm_id=farm_id,
            field_id=field_id,
            actor_id=actor_id,
            country_code=country_code,
            activity_type=activity_type,
            activity_date=activity_date,
            description=description,
            inputs_used=inputs_used,
            labor_hours=labor_hours,
            cost=cost,
            notes=notes,
        )
        self.session.add(record)
        self.session.flush()
        return record

    def get_activity_for_farm(self, *, farm_id: str, activity_id: str) -> FarmActivity | None:
        statement = select(FarmActivity).where(
            FarmActivity.farm_id == farm_id,
            FarmActivity.activity_id == activity_id,
        )
        return self.session.execute(statement).scalar_one_or_none()

    def update_activity(
        self,
        *,
        activity: FarmActivity,
        field_id: str,
        activity_type: str,
        activity_date: date,
        description: str,
        inputs_used: list[dict[str, object]],
        labor_hours: float | None,
        cost: float | None,
        notes: str | None,
    ) -> FarmActivity:
        activity.field_id = field_id
        activity.activity_type = activity_type
        activity.activity_date = activity_date
        activity.description = description
        activity.inputs_used = inputs_used
        activity.labor_hours = labor_hours
        activity.cost = cost
        activity.notes = notes
        self.session.flush()
        return activity

    def delete_activity(self, *, activity: FarmActivity) -> None:
        self.session.delete(activity)
        self.session.flush()

    def list_inputs(self, *, farm_id: str) -> list[FarmInput]:
        statement = (
            select(FarmInput)
            .where(FarmInput.farm_id == farm_id)
            .order_by(FarmInput.purchase_date.desc(), FarmInput.id.desc())
        )
        return list(self.session.execute(statement).scalars().all())

    def list_inputs_for_farms(self, *, farm_ids: list[str]) -> dict[str, list[FarmInput]]:
        if not farm_ids:
            return {}
        statement = (
            select(FarmInput)
            .where(FarmInput.farm_id.in_(farm_ids))
            .order_by(FarmInput.farm_id.asc(), FarmInput.purchase_date.desc(), FarmInput.id.desc())
        )
        items = list(self.session.execute(statement).scalars().all())
        grouped: dict[str, list[FarmInput]] = {farm_id: [] for farm_id in farm_ids}
        for item in items:
            grouped.setdefault(item.farm_id, []).append(item)
        return grouped

    def create_input(
        self,
        *,
        input_id: str,
        farm_id: str,
        actor_id: str,
        country_code: str,
        input_type: str,
        name: str,
        quantity: float,
        unit: str,
        cost: float | None,
        supplier: str | None,
        purchase_date: date,
        expiry_date: date | None,
    ) -> FarmInput:
        record = FarmInput(
            input_id=input_id,
            farm_id=farm_id,
            actor_id=actor_id,
            country_code=country_code,
            input_type=input_type,
            name=name,
            quantity=quantity,
            unit=unit,
            cost=cost,
            supplier=supplier,
            purchase_date=purchase_date,
            expiry_date=expiry_date,
        )
        self.session.add(record)
        self.session.flush()
        return record

    def get_input_for_farm(self, *, farm_id: str, input_id: str) -> FarmInput | None:
        statement = select(FarmInput).where(
            FarmInput.farm_id == farm_id,
            FarmInput.input_id == input_id,
        )
        return self.session.execute(statement).scalar_one_or_none()

    def update_input(
        self,
        *,
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
        farm_input.input_type = input_type
        farm_input.name = name
        farm_input.quantity = quantity
        farm_input.unit = unit
        farm_input.cost = cost
        farm_input.supplier = supplier
        farm_input.purchase_date = purchase_date
        farm_input.expiry_date = expiry_date
        self.session.flush()
        return farm_input

    def delete_input(self, *, farm_input: FarmInput) -> None:
        self.session.delete(farm_input)
        self.session.flush()

    def list_crop_cycles(self, *, farm_id: str) -> list[CropCycle]:
        statement = (
            select(CropCycle)
            .where(CropCycle.farm_id == farm_id)
            .order_by(CropCycle.planting_date.desc(), CropCycle.id.desc())
        )
        return list(self.session.execute(statement).scalars().all())

    def list_crop_cycles_for_farms(self, *, farm_ids: list[str]) -> dict[str, list[CropCycle]]:
        if not farm_ids:
            return {}
        statement = (
            select(CropCycle)
            .where(CropCycle.farm_id.in_(farm_ids))
            .order_by(CropCycle.farm_id.asc(), CropCycle.planting_date.desc(), CropCycle.id.desc())
        )
        items = list(self.session.execute(statement).scalars().all())
        grouped: dict[str, list[CropCycle]] = {farm_id: [] for farm_id in farm_ids}
        for item in items:
            grouped.setdefault(item.farm_id, []).append(item)
        return grouped

    def create_crop_cycle(
        self,
        *,
        crop_cycle_id: str,
        farm_id: str,
        field_id: str,
        actor_id: str,
        country_code: str,
        crop_type: str,
        variety: str | None,
        planting_date: date,
        harvest_date: date | None,
        yield_tons: float | None,
        revenue: float | None,
        status: str,
    ) -> CropCycle:
        record = CropCycle(
            crop_cycle_id=crop_cycle_id,
            farm_id=farm_id,
            field_id=field_id,
            actor_id=actor_id,
            country_code=country_code,
            crop_type=crop_type,
            variety=variety,
            planting_date=planting_date,
            harvest_date=harvest_date,
            yield_tons=yield_tons,
            revenue=revenue,
            status=status,
        )
        self.session.add(record)
        self.session.flush()
        return record

    def get_crop_cycle_for_farm(self, *, farm_id: str, crop_cycle_id: str) -> CropCycle | None:
        statement = select(CropCycle).where(
            CropCycle.farm_id == farm_id,
            CropCycle.crop_cycle_id == crop_cycle_id,
        )
        return self.session.execute(statement).scalar_one_or_none()

    def update_crop_cycle(
        self,
        *,
        crop_cycle: CropCycle,
        field_id: str,
        crop_type: str,
        variety: str | None,
        planting_date: date,
        harvest_date: date | None,
        yield_tons: float | None,
        revenue: float | None,
        status: str,
    ) -> CropCycle:
        crop_cycle.field_id = field_id
        crop_cycle.crop_type = crop_type
        crop_cycle.variety = variety
        crop_cycle.planting_date = planting_date
        crop_cycle.harvest_date = harvest_date
        crop_cycle.yield_tons = yield_tons
        crop_cycle.revenue = revenue
        crop_cycle.status = status
        self.session.flush()
        return crop_cycle

    def delete_crop_cycle(self, *, crop_cycle: CropCycle) -> None:
        self.session.delete(crop_cycle)
        self.session.flush()
