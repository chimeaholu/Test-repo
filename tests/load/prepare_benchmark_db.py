from __future__ import annotations

import argparse
import json
import os
import sys
from collections.abc import Iterable
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from uuid import uuid4

from alembic import command
from alembic.config import Config
from sqlalchemy import select
from sqlalchemy.orm import Session

APP_ROOT = Path(__file__).resolve().parents[2] / "apps" / "api"
if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

from app.core.config import Settings, clear_settings_cache
from app.core.contracts_catalog import get_envelope_schema_version
from app.core.db import _normalize_database_url, clear_db_caches, get_session_factory
from app.db.migrations.seed import run_seed
from app.db.models.advisory import AdvisoryRequestRecord, ReviewerDecisionRecord
from app.db.models.climate import ClimateAlert, ClimateObservation, FarmProfile, MrvEvidenceRecord
from app.db.models.farm import CropCycle, FarmActivity, FarmField, FarmInput
from app.db.models.fund import FundingOpportunity, Investment
from app.db.models.ledger import EscrowRecord, EscrowTimelineEntry, WalletAccount, WalletLedgerEntry
from app.db.models.marketplace import Listing, ListingRevision, NegotiationMessage, NegotiationThread
from app.db.models.platform import ConsentRecord, CountryPolicy, IdentityMembership, IdentitySessionRecord
from app.db.models.transport import Shipment, ShipmentEvent, TransportLoad
from app.seed_demo_data import seed_demo_data


def build_alembic_config(database_url: str) -> Config:
    config = Config(str(APP_ROOT / "alembic.ini"))
    config.set_main_option(
        "sqlalchemy.url",
        _normalize_database_url(database_url).replace("%", "%%"),
    )
    config.set_main_option("script_location", str(APP_ROOT / "app" / "db" / "migrations"))
    return config


def reset_settings(database_url: str, database_schema: str | None = None) -> Settings:
    clear_settings_cache()
    clear_db_caches()
    return Settings(
        database_url=database_url,
        database_schema=database_schema,
        environment="benchmark",
        log_level="WARNING",
    )


def now_utc() -> datetime:
    return datetime.now(tz=UTC)


def ensure_actor(
    session: Session,
    *,
    actor_id: str,
    role: str,
    country_code: str,
    display_name: str,
    email: str,
    consent_granted: bool = True,
) -> IdentitySessionRecord:
    membership = session.execute(
        select(IdentityMembership).where(
            IdentityMembership.actor_id == actor_id,
            IdentityMembership.role == role,
        )
    ).scalar_one_or_none()
    if membership is None:
        membership = IdentityMembership(
            actor_id=actor_id,
            role=role,
            country_code=country_code,
            provenance={"seeded": True, "source": "rb070"},
        )
        session.add(membership)

    if consent_granted:
        consent = session.execute(
            select(ConsentRecord).where(
                ConsentRecord.actor_id == actor_id,
                ConsentRecord.consent_type == "regulated_mutation",
                ConsentRecord.policy_version == "2026.04",
            )
        ).scalar_one_or_none()
        if consent is None:
            consent = ConsentRecord(
                actor_id=actor_id,
                consent_type="regulated_mutation",
                status="granted",
                policy_version="2026.04",
                country_code=country_code,
            )
            session.add(consent)
        else:
            consent.status = "granted"
            consent.country_code = country_code

    record = session.execute(
        select(IdentitySessionRecord).where(IdentitySessionRecord.actor_id == actor_id)
    ).scalar_one_or_none()
    token = f"rb070-token-{actor_id.replace(':', '-').replace('_', '-')}"
    timestamp = now_utc()
    if record is None:
        record = IdentitySessionRecord(
            actor_id=actor_id,
            session_token=token,
            display_name=display_name,
            email=email,
            role=role,
            country_code=country_code,
            locale=f"en-{country_code}",
            organization_id=f"org-{country_code.lower()}-rb070",
            organization_name=f"{country_code} Benchmark Cooperative",
            consent_state="consent_granted" if consent_granted else "identified",
            policy_version="2026.04" if consent_granted else None,
            consent_scope_ids=["identity.core", "workflow.audit"] if consent_granted else [],
            consent_channel="pwa" if consent_granted else None,
            consent_captured_at=timestamp if consent_granted else None,
            consent_revoked_at=None,
        )
        session.add(record)
    else:
        record.session_token = token
        record.display_name = display_name
        record.email = email
        record.role = role
        record.country_code = country_code
        record.locale = f"en-{country_code}"
        record.organization_id = f"org-{country_code.lower()}-rb070"
        record.organization_name = f"{country_code} Benchmark Cooperative"
        record.consent_state = "consent_granted" if consent_granted else "identified"
        record.policy_version = "2026.04" if consent_granted else None
        record.consent_scope_ids = ["identity.core", "workflow.audit"] if consent_granted else []
        record.consent_channel = "pwa" if consent_granted else None
        record.consent_captured_at = timestamp if consent_granted else None
        record.consent_revoked_at = None
    session.flush()
    return record


def ensure_wallet_and_balance(
    session: Session,
    *,
    actor_id: str,
    country_code: str,
    currency: str,
    available_balance: float,
) -> WalletAccount:
    wallet_id = f"wallet-{country_code.lower()}-{currency.lower()}-{actor_id}"
    wallet = session.execute(
        select(WalletAccount).where(WalletAccount.wallet_id == wallet_id)
    ).scalar_one_or_none()
    if wallet is None:
        wallet = WalletAccount(
            wallet_id=wallet_id,
            actor_id=actor_id,
            country_code=country_code,
            currency=currency,
        )
        session.add(wallet)
        session.flush()

    existing = session.execute(
        select(WalletLedgerEntry)
        .where(WalletLedgerEntry.wallet_id == wallet_id)
        .order_by(WalletLedgerEntry.entry_sequence.desc(), WalletLedgerEntry.id.desc())
        .limit(1)
    ).scalar_one_or_none()
    if existing is None:
        session.add(
            WalletLedgerEntry(
                entry_id=f"entry-{uuid4().hex[:12]}",
                wallet_id=wallet.wallet_id,
                wallet_actor_id=actor_id,
                counterparty_actor_id="system:benchmark",
                country_code=country_code,
                currency=currency,
                direction="credit",
                reason="wallet_seed_funding",
                amount=available_balance,
                available_delta=available_balance,
                held_delta=0.0,
                resulting_available_balance=available_balance,
                resulting_held_balance=0.0,
                balance_version=1,
                entry_sequence=1,
                escrow_id=None,
                request_id=f"rb070-wallet-seed-{actor_id}",
                idempotency_key=f"rb070-wallet-seed-{actor_id}",
                correlation_id=f"rb070-wallet-seed-{actor_id}",
                reconciliation_marker=f"rb070-seed-{actor_id}",
                entry_metadata={"seeded": True},
            )
        )
    session.flush()
    return wallet


def create_listing(
    session: Session,
    *,
    listing_id: str,
    actor_id: str,
    country_code: str,
    title: str,
    commodity: str,
    quantity_tons: float,
    price_amount: float,
    price_currency: str,
    location: str,
    summary: str,
    published: bool = True,
) -> Listing:
    now = now_utc()
    listing = Listing(
        listing_id=listing_id,
        actor_id=actor_id,
        country_code=country_code,
        title=title,
        commodity=commodity,
        quantity_tons=quantity_tons,
        price_amount=price_amount,
        price_currency=price_currency,
        location=location,
        summary=summary,
        status="published" if published else "draft",
        revision_number=1,
        published_revision_number=1 if published else None,
        revision_count=1,
        published_at=now if published else None,
    )
    session.add(listing)
    session.flush()
    session.add(
        ListingRevision(
            listing_id=listing_id,
            revision_number=1,
            change_type="published" if published else "created",
            actor_id=actor_id,
            country_code=country_code,
            status="published" if published else "draft",
            title=title,
            commodity=commodity,
            quantity_tons=quantity_tons,
            price_amount=price_amount,
            price_currency=price_currency,
            location=location,
            summary=summary,
            changed_at=now,
        )
    )
    session.flush()
    return listing


def create_negotiation_thread(
    session: Session,
    *,
    thread_id: str,
    listing: Listing,
    buyer_actor_id: str,
    offer_amount: float,
    note: str,
) -> NegotiationThread:
    now = now_utc()
    thread = NegotiationThread(
        thread_id=thread_id,
        listing_id=listing.listing_id,
        seller_actor_id=listing.actor_id,
        buyer_actor_id=buyer_actor_id,
        country_code=listing.country_code,
        status="open",
        current_offer_amount=offer_amount,
        current_offer_currency=listing.price_currency,
        last_action_at=now,
    )
    session.add(thread)
    session.flush()
    session.add(
        NegotiationMessage(
            thread_id=thread.thread_id,
            actor_id=buyer_actor_id,
            action="offer_created",
            amount=offer_amount,
            currency=listing.price_currency,
            note=note,
            created_at=now,
        )
    )
    session.add(
        NegotiationMessage(
            thread_id=thread.thread_id,
            actor_id=listing.actor_id,
            action="offer_countered",
            amount=offer_amount + 5,
            currency=listing.price_currency,
            note="Seeded seller counter",
            created_at=now + timedelta(minutes=5),
        )
    )
    session.flush()
    return thread


def create_farm_workspace(
    session: Session,
    *,
    actor_id: str,
    country_code: str,
    farm_index: int,
    field_count: int = 5,
) -> FarmProfile:
    farm_id = f"rb070-farm-{farm_index:03d}"
    profile = FarmProfile(
        farm_id=farm_id,
        actor_id=actor_id,
        country_code=country_code,
        farm_name=f"RB070 Farm {farm_index}",
        district="Tamale",
        crop_type="Maize",
        hectares=15 + farm_index,
        latitude=9.403,
        longitude=-0.842,
        metadata_json={"seeded": True, "benchmark": True},
    )
    session.add(profile)
    session.flush()

    for field_offset in range(field_count):
        field_id = f"{farm_id}-field-{field_offset:02d}"
        field = FarmField(
            field_id=field_id,
            farm_id=farm_id,
            actor_id=actor_id,
            country_code=country_code,
            name=f"Field {field_offset + 1}",
            boundary_geojson=None,
            area_hectares=3.5 + field_offset,
            soil_type="loam",
            irrigation_type="rainfed",
            current_crop="Maize",
            planting_date=date(2026, 4, 1),
            expected_harvest_date=date(2026, 8, 1) + timedelta(days=field_offset * 3),
            status="active",
        )
        session.add(field)
        session.flush()
        session.add(
            CropCycle(
                crop_cycle_id=f"{field_id}-cycle",
                farm_id=farm_id,
                field_id=field_id,
                actor_id=actor_id,
                country_code=country_code,
                crop_type="Maize",
                variety="Obatanpa",
                planting_date=date(2026, 4, 1),
                harvest_date=None,
                yield_tons=None,
                revenue=None,
                status="active",
            )
        )
        session.add(
            FarmInput(
                input_id=f"{farm_id}-input-{field_offset:02d}",
                farm_id=farm_id,
                actor_id=actor_id,
                country_code=country_code,
                input_type="fertilizer",
                name=f"NPK {field_offset + 1}",
                quantity=40 + field_offset,
                unit="kg",
                cost=120 + field_offset,
                supplier="Benchmark Supplier",
                purchase_date=date(2026, 3, 15),
                expiry_date=date(2027, 3, 15),
            )
        )
        session.add(
            FarmActivity(
                activity_id=f"{farm_id}-activity-{field_offset:02d}",
                farm_id=farm_id,
                field_id=field_id,
                actor_id=actor_id,
                country_code=country_code,
                activity_type="fertilization",
                activity_date=date(2026, 4, 20),
                description=f"Applied fertilizer batch {field_offset + 1}",
                inputs_used=[
                    {
                        "input_id": f"{farm_id}-input-{field_offset:02d}",
                        "quantity": 5 + field_offset,
                        "unit": "kg",
                    }
                ],
                labor_hours=3.5,
                cost=45.0,
                notes="Seeded benchmark activity",
            )
        )

    for alert_index in range(6):
        observation_id = f"{farm_id}-observation-{alert_index:02d}"
        observed_at = now_utc() - timedelta(hours=alert_index * 3)
        session.add(
            ClimateObservation(
                observation_id=observation_id,
                farm_id=farm_id,
                actor_id=actor_id,
                country_code=country_code,
                source_id=f"source-{farm_id}-{alert_index:02d}",
                source_type="weather_api",
                observed_at=observed_at,
                source_window_start=observed_at - timedelta(hours=3),
                source_window_end=observed_at,
                rainfall_mm=16.5 + alert_index,
                temperature_c=29.0 + alert_index / 2,
                soil_moisture_pct=42.0 - alert_index,
                anomaly_score=0.1 * alert_index,
                ingestion_state="accepted",
                degraded_mode=alert_index == 0,
                degraded_reason_codes=["source_window_missing"] if alert_index == 0 else [],
                assumptions=["Fallback source window in use."] if alert_index == 0 else [],
                provenance=[{"source": "rb070", "index": alert_index}],
                normalized_payload={"humidity_pct": 70 - alert_index},
            )
        )
        session.add(
            ClimateAlert(
                alert_id=f"{farm_id}-alert-{alert_index:02d}",
                farm_id=farm_id,
                actor_id=actor_id,
                country_code=country_code,
                observation_id=observation_id,
                alert_type="rainfall",
                severity="high" if alert_index % 2 == 0 else "medium",
                precedence_rank=alert_index,
                headline=f"Benchmark climate alert {alert_index + 1}",
                detail="Rainfall anomaly benchmark signal.",
                source_confidence="high",
                degraded_mode=alert_index == 0,
                degraded_reason_codes=["source_window_missing"] if alert_index == 0 else [],
                farm_context={"farm_name": profile.farm_name},
                status="open",
            )
        )
    session.add(
        MrvEvidenceRecord(
            evidence_id=f"{farm_id}-evidence-01",
            farm_id=farm_id,
            actor_id=actor_id,
            country_code=country_code,
            evidence_type="climate_snapshot",
            method_tag="benchmark_method",
            method_references=["benchmark_method_v1"],
            source_window_start=now_utc() - timedelta(days=1),
            source_window_end=now_utc(),
            source_observation_ids=[f"{farm_id}-observation-00"],
            alert_ids=[f"{farm_id}-alert-00"],
            assumptions=["Benchmark evidence aggregation."],
            provenance=[{"source_id": f"{farm_id}-observation-00"}],
            source_completeness_state="degraded",
            degraded_mode=True,
            degraded_reason_codes=["source_window_missing"],
            summary={"message": "Benchmark evidence summary"},
        )
    )
    session.flush()
    return profile


def create_funding_dataset(
    session: Session,
    *,
    actor_id: str,
    country_code: str,
    farm_ids: Iterable[str],
) -> list[FundingOpportunity]:
    items: list[FundingOpportunity] = []
    for index, farm_id in enumerate(farm_ids):
        opportunity_id = f"rb070-opportunity-{index:03d}"
        opportunity = FundingOpportunity(
            opportunity_id=opportunity_id,
            farm_id=farm_id,
            actor_id=actor_id,
            country_code=country_code,
            currency="GHS",
            title=f"Benchmark Opportunity {index + 1}",
            description="Working capital for harvest logistics and storage.",
            funding_goal=5000 + index * 250,
            current_amount=2500 + index * 100,
            expected_return_pct=12.5,
            timeline_months=6,
            status="open",
            min_investment=250,
            max_investment=2000,
        )
        session.add(opportunity)
        items.append(opportunity)
    session.flush()
    return items


def create_investments(
    session: Session,
    *,
    investor_ids: list[str],
    opportunities: list[FundingOpportunity],
    country_code: str,
) -> list[Investment]:
    investments: list[Investment] = []
    for index, investor_id in enumerate(investor_ids):
        opportunity = opportunities[index % len(opportunities)]
        investment = Investment(
            investment_id=f"rb070-investment-{index:03d}",
            opportunity_id=opportunity.opportunity_id,
            investor_actor_id=investor_id,
            country_code=country_code,
            amount=500 + index * 25,
            currency="GHS",
            status="active",
            invested_at=now_utc() - timedelta(days=index + 1),
            expected_return_date=now_utc() + timedelta(days=180),
            actual_return_amount=None,
        )
        session.add(investment)
        investments.append(investment)
    session.flush()
    return investments


def create_transport_dataset(
    session: Session,
    *,
    poster_actor_ids: list[str],
    transporter_actor_id: str,
    country_code: str,
) -> list[Shipment]:
    shipments: list[Shipment] = []
    for index, poster_actor_id in enumerate(poster_actor_ids[:12]):
        load_id = f"rb070-load-{index:03d}"
        load = TransportLoad(
            load_id=load_id,
            poster_actor_id=poster_actor_id,
            country_code=country_code,
            origin_location=f"Origin {index}",
            destination_location=f"Destination {index}",
            commodity="Maize",
            weight_tons=6.5 + index,
            vehicle_type_required="flatbed",
            pickup_date=date(2026, 5, 1),
            delivery_deadline=date(2026, 5, 7),
            price_offer=450 + index * 10,
            price_currency="GHS",
            status="assigned",
            assigned_transporter_actor_id=transporter_actor_id,
        )
        session.add(load)
        session.flush()
        shipment = Shipment(
            shipment_id=f"rb070-shipment-{index:03d}",
            load_id=load_id,
            transporter_actor_id=transporter_actor_id,
            country_code=country_code,
            status="in_transit",
            vehicle_info={"plate": f"RB{index:03d}GH"},
            pickup_time=now_utc() - timedelta(hours=6),
            delivery_time=None,
            current_location_lat=9.4 + index / 1000,
            current_location_lng=-0.84 - index / 1000,
            proof_of_delivery_url=None,
        )
        session.add(shipment)
        session.flush()
        session.add(
            ShipmentEvent(
                event_id=f"{shipment.shipment_id}-event-01",
                shipment_id=shipment.shipment_id,
                actor_id=transporter_actor_id,
                event_type="picked_up",
                event_at=now_utc() - timedelta(hours=6),
                location_lat=shipment.current_location_lat,
                location_lng=shipment.current_location_lng,
                notes="Seeded pickup event",
            )
        )
        session.add(
            ShipmentEvent(
                event_id=f"{shipment.shipment_id}-event-02",
                shipment_id=shipment.shipment_id,
                actor_id=transporter_actor_id,
                event_type="checkpoint",
                event_at=now_utc() - timedelta(hours=2),
                location_lat=(shipment.current_location_lat or 0) + 0.02,
                location_lng=(shipment.current_location_lng or 0) - 0.02,
                notes="Seeded checkpoint",
            )
        )
        shipments.append(shipment)
    session.flush()
    return shipments


def create_escrow_dataset(
    session: Session,
    *,
    threads: list[NegotiationThread],
) -> list[EscrowRecord]:
    escrows: list[EscrowRecord] = []
    for index, thread in enumerate(threads[:10]):
        escrow = EscrowRecord(
            escrow_id=f"rb070-escrow-{index:03d}",
            thread_id=thread.thread_id,
            listing_id=thread.listing_id,
            buyer_actor_id=thread.buyer_actor_id,
            seller_actor_id=thread.seller_actor_id,
            country_code=thread.country_code,
            currency=thread.current_offer_currency,
            amount=thread.current_offer_amount,
            state="funded",
            partner_reference=f"partner-{index:03d}",
            partner_reason_code=None,
            initiated_by_actor_id=thread.buyer_actor_id,
            funded_at=now_utc() - timedelta(hours=12),
        )
        session.add(escrow)
        session.flush()
        for step_index, transition in enumerate(("initiated", "funded", "checkpoint", "released")):
            session.add(
                EscrowTimelineEntry(
                    escrow_id=escrow.escrow_id,
                    actor_id=thread.buyer_actor_id if step_index < 2 else thread.seller_actor_id,
                    transition=transition,
                    state="released" if transition == "released" else transition,
                    note=f"Seeded escrow transition {transition}",
                    request_id=f"rb070-escrow-{index:03d}-{transition}",
                    idempotency_key=f"rb070-escrow-{index:03d}-{transition}",
                    correlation_id=f"rb070-escrow-{index:03d}-{transition}",
                    notification_payload={"seeded": True, "transition": transition},
                )
            )
        escrows.append(escrow)
    session.flush()
    return escrows


def create_advisory_dataset(
    session: Session,
    *,
    actor_id: str,
    country_code: str,
) -> None:
    for index in range(12):
        request = AdvisoryRequestRecord(
            advisory_request_id=f"rb070-advisory-{index:03d}",
            advisory_conversation_id=f"rb070-conversation-{index // 3:03d}",
            request_id=f"rb070-advisory-request-{index:03d}",
            actor_id=actor_id,
            country_code=country_code,
            locale=f"en-{country_code}",
            channel="pwa",
            topic="crop_health",
            question_text=f"Benchmark advisory question {index}",
            response_text="Scout twice weekly and document pressure.",
            status="approved",
            confidence_band="high",
            confidence_score=0.92,
            grounded=True,
            source_ids=["src-gh-fall-armyworm-001"],
            transcript_entries=[],
            policy_context={"seeded": True},
            model_name="benchmark-advisor",
            model_version="rb070-v1",
            correlation_id=f"rb070-advisory-corr-{index:03d}",
            delivered_at=now_utc() - timedelta(days=index),
            created_at=now_utc() - timedelta(days=index),
        )
        session.add(request)
        session.flush()
        session.add(
            ReviewerDecisionRecord(
                decision_id=f"rb070-reviewer-decision-{index:03d}",
                advisory_request_id=request.advisory_request_id,
                request_id=request.request_id,
                actor_id="reviewer:rb070",
                actor_role="reviewer",
                outcome="approved",
                reason_code="benchmark_seed",
                note="Seeded reviewer decision",
                transcript_link=None,
                policy_context={"seeded": True},
            )
        )
    session.flush()


def prepare_database(
    database_url: str,
    context_out: Path,
    database_schema: str | None = None,
) -> dict[str, object]:
    if database_url.startswith("sqlite:///"):
        db_path = Path(database_url.removeprefix("sqlite:///"))
        db_path.parent.mkdir(parents=True, exist_ok=True)
        if db_path.exists():
            db_path.unlink()

    reset_settings(database_url, database_schema)
    os.environ["AGRO_API_DATABASE_URL"] = database_url
    if database_schema:
        os.environ["AGRO_API_DATABASE_SCHEMA"] = database_schema
    else:
        os.environ.pop("AGRO_API_DATABASE_SCHEMA", None)
    command.upgrade(build_alembic_config(database_url), "head")

    with get_session_factory(database_url)() as session:
        run_seed(session)
        seed_demo_data(session)

        farmers = [
            ensure_actor(
                session,
                actor_id=f"rb070:farmer:{index:03d}",
                role="farmer",
                country_code="GH",
                display_name=f"Benchmark Farmer {index + 1}",
                email=f"rb070.farmer.{index + 1}@agrodomain.io",
            )
            for index in range(60)
        ]
        buyers = [
            ensure_actor(
                session,
                actor_id=f"rb070:buyer:{index:03d}",
                role="buyer",
                country_code="GH",
                display_name=f"Benchmark Buyer {index + 1}",
                email=f"rb070.buyer.{index + 1}@agrodomain.io",
            )
            for index in range(40)
        ]
        investors = [
            ensure_actor(
                session,
                actor_id=f"rb070:investor:{index:03d}",
                role="investor",
                country_code="GH",
                display_name=f"Benchmark Investor {index + 1}",
                email=f"rb070.investor.{index + 1}@agrodomain.io",
            )
            for index in range(20)
        ]
        transporters = [
            ensure_actor(
                session,
                actor_id=f"rb070:transporter:{index:03d}",
                role="transporter",
                country_code="GH",
                display_name=f"Benchmark Transporter {index + 1}",
                email=f"rb070.transporter.{index + 1}@agrodomain.io",
            )
            for index in range(10)
        ]

        for investor in investors:
            ensure_wallet_and_balance(
                session,
                actor_id=investor.actor_id,
                country_code="GH",
                currency="GHS",
                available_balance=25_000.0,
            )
        for buyer in buyers:
            ensure_wallet_and_balance(
                session,
                actor_id=buyer.actor_id,
                country_code="GH",
                currency="GHS",
                available_balance=15_000.0,
            )
        for farmer in farmers[:12]:
            ensure_wallet_and_balance(
                session,
                actor_id=farmer.actor_id,
                country_code="GH",
                currency="GHS",
                available_balance=5_000.0,
            )

        listings = [
            create_listing(
                session,
                listing_id=f"rb070-listing-{index:03d}",
                actor_id=farmers[index % len(farmers)].actor_id,
                country_code="GH",
                title=f"RB070 Published Listing {index + 1}",
                commodity="Maize" if index % 2 == 0 else "Soybean",
                quantity_tons=6.0 + index / 2,
                price_amount=450 + index * 7,
                price_currency="GHS",
                location=f"Tamale Cluster {index % 8}",
                summary="Published benchmark listing for marketplace load browsing.",
            )
            for index in range(120)
        ]

        threads = [
            create_negotiation_thread(
                session,
                thread_id=f"rb070-thread-{index:03d}",
                listing=listings[index],
                buyer_actor_id=buyers[index % len(buyers)].actor_id,
                offer_amount=listings[index].price_amount - 20,
                note="Seeded benchmark offer",
            )
            for index in range(30)
        ]

        farm_profiles = [
            create_farm_workspace(
                session,
                actor_id=farmers[0].actor_id,
                country_code="GH",
                farm_index=index,
            )
            for index in range(1, 9)
        ]

        opportunities = create_funding_dataset(
            session,
            actor_id=farmers[1].actor_id,
            country_code="GH",
            farm_ids=[profile.farm_id for profile in farm_profiles[:6]],
        )
        create_investments(
            session,
            investor_ids=[item.actor_id for item in investors],
            opportunities=opportunities,
            country_code="GH",
        )
        shipments = create_transport_dataset(
            session,
            poster_actor_ids=[item.actor_id for item in farmers[:20]],
            transporter_actor_id=transporters[0].actor_id,
            country_code="GH",
        )
        escrows = create_escrow_dataset(session, threads=threads)
        create_advisory_dataset(
            session,
            actor_id=farmers[0].actor_id,
            country_code="GH",
        )

        session.commit()

    context = {
        "schema_version": get_envelope_schema_version(),
        "database_url": database_url,
        "tokens": {
            "farmers": [
                {
                    "actor_id": item.actor_id,
                    "token": item.session_token,
                    "country_code": item.country_code,
                }
                for item in farmers
            ],
            "buyers": [
                {
                    "actor_id": item.actor_id,
                    "token": item.session_token,
                    "country_code": item.country_code,
                }
                for item in buyers
            ],
            "investors": [
                {
                    "actor_id": item.actor_id,
                    "token": item.session_token,
                    "country_code": item.country_code,
                }
                for item in investors
            ],
            "transporters": [
                {
                    "actor_id": item.actor_id,
                    "token": item.session_token,
                    "country_code": item.country_code,
                }
                for item in transporters
            ],
            "wallet_senders": [
                {
                    "actor_id": item.actor_id,
                    "token": item.session_token,
                    "country_code": item.country_code,
                }
                for item in investors[:10] + buyers[:10]
            ],
            "wallet_recipients": [
                {
                    "actor_id": item.actor_id,
                    "token": item.session_token,
                    "country_code": item.country_code,
                }
                for item in farmers[:12] + buyers[:5]
            ],
            "primary_farmer": {
                "actor_id": farmers[0].actor_id,
                "token": farmers[0].session_token,
                "country_code": farmers[0].country_code,
            },
            "primary_investor": {
                "actor_id": investors[0].actor_id,
                "token": investors[0].session_token,
                "country_code": investors[0].country_code,
            },
            "primary_buyer": {
                "actor_id": buyers[0].actor_id,
                "token": buyers[0].session_token,
                "country_code": buyers[0].country_code,
            },
            "primary_transporter": {
                "actor_id": transporters[0].actor_id,
                "token": transporters[0].session_token,
                "country_code": transporters[0].country_code,
            },
        },
        "token_lookup": {
            item.actor_id: {
                "actor_id": item.actor_id,
                "token": item.session_token,
                "country_code": item.country_code,
            }
            for item in [*farmers, *buyers, *investors, *transporters]
        },
        "ids": {
            "published_listings": [
                {
                    "listing_id": item.listing_id,
                    "actor_id": item.actor_id,
                    "price_amount": item.price_amount,
                    "price_currency": item.price_currency,
                }
                for item in listings
            ],
            "negotiation_targets": [
                {
                    "listing_id": item.listing_id,
                    "actor_id": item.actor_id,
                    "price_amount": item.price_amount,
                    "price_currency": item.price_currency,
                }
                for item in listings[:20]
            ],
            "seeded_threads": [
                {
                    "thread_id": item.thread_id,
                    "listing_id": item.listing_id,
                    "seller_actor_id": item.seller_actor_id,
                    "buyer_actor_id": item.buyer_actor_id,
                    "current_offer_amount": item.current_offer_amount,
                    "current_offer_currency": item.current_offer_currency,
                }
                for item in threads
            ],
            "threads_by_buyer_actor": {
                actor_id: [
                    {
                        "thread_id": item.thread_id,
                        "listing_id": item.listing_id,
                        "seller_actor_id": item.seller_actor_id,
                        "buyer_actor_id": item.buyer_actor_id,
                        "current_offer_amount": item.current_offer_amount,
                        "current_offer_currency": item.current_offer_currency,
                    }
                    for item in threads
                    if item.buyer_actor_id == actor_id
                ]
                for actor_id in {item.actor_id for item in buyers}
            },
            "primary_farm": {
                "farm_id": farm_profiles[0].farm_id,
                "actor_id": farm_profiles[0].actor_id,
            },
            "opportunities": [
                {"opportunity_id": item.opportunity_id, "farm_id": item.farm_id}
                for item in opportunities
            ],
            "shipments": [
                {"shipment_id": item.shipment_id, "load_id": item.load_id}
                for item in shipments
            ],
            "escrows": [
                {"escrow_id": item.escrow_id, "thread_id": item.thread_id}
                for item in escrows
            ],
        },
        "counts": {
            "farmers": len(farmers),
            "buyers": len(buyers),
            "investors": len(investors),
            "transporters": len(transporters),
            "listings": len(listings),
            "threads": len(threads),
            "farms": len(farm_profiles),
            "opportunities": len(opportunities),
            "shipments": len(shipments),
            "escrows": len(escrows),
        },
    }
    context_out.parent.mkdir(parents=True, exist_ok=True)
    context_out.write_text(f"{json.dumps(context, indent=2)}\n", encoding="utf-8")
    return context


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--database-url", required=True)
    parser.add_argument("--database-schema")
    parser.add_argument("--context-out", required=True)
    args = parser.parse_args()

    prepare_database(args.database_url, Path(args.context_out), args.database_schema)


if __name__ == "__main__":
    main()
