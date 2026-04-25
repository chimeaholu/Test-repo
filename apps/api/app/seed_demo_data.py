"""RB-009 — Demo data seeding script for R0 smoke coverage.

Creates realistic demo users (one per role), marketplace listings,
wallet accounts, a negotiation thread, a farm profile, climate data,
and advisory source documents.  Idempotent — safe to run repeatedly.

Depends on the base migration seed (``app.db.migrations.seed``) having
already run (country policies, workflow definitions, advisory sources).
"""

from __future__ import annotations

import logging
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import (
    AuditBase,
    CommerceBase,
    PlatformBase,
    WorkflowBase,
)
from app.db.models.climate import ClimateAlert, ClimateObservation, FarmProfile
from app.db.models.farm import CropCycle, FarmActivity, FarmField, FarmInput
from app.db.models.ledger import WalletAccount, WalletLedgerEntry
from app.db.models.marketplace import Listing, NegotiationMessage, NegotiationThread
from app.db.models.platform import (
    ConsentRecord,
    CountryPolicy,
    IdentityMembership,
    IdentitySessionRecord,
)

LOGGER = logging.getLogger("agrodomain.api.seed_demo")

POLICY_VERSION = "2026.04"

# ── Demo actor definitions ───────────────────────────────────────────

DEMO_ACTORS: list[dict[str, str]] = [
    {
        "actor_id": "demo:farmer",
        "role": "farmer",
        "country_code": "GH",
        "display_name": "Kwame Asante",
        "email": "kwame@demo.agrodomain.io",
    },
    {
        "actor_id": "demo:buyer",
        "role": "buyer",
        "country_code": "GH",
        "display_name": "Ama Mensah",
        "email": "ama@demo.agrodomain.io",
    },
    {
        "actor_id": "demo:cooperative",
        "role": "cooperative",
        "country_code": "GH",
        "display_name": "Yaw Frimpong",
        "email": "yaw@demo.agrodomain.io",
    },
    {
        "actor_id": "demo:transporter",
        "role": "transporter",
        "country_code": "NG",
        "display_name": "Chidi Okafor",
        "email": "chidi@demo.agrodomain.io",
    },
    {
        "actor_id": "demo:investor",
        "role": "investor",
        "country_code": "GH",
        "display_name": "Nana Adjei",
        "email": "nana@demo.agrodomain.io",
    },
    {
        "actor_id": "demo:extension_agent",
        "role": "extension_agent",
        "country_code": "NG",
        "display_name": "Fatima Ibrahim",
        "email": "fatima@demo.agrodomain.io",
    },
]

# Deterministic session tokens so E2E tests can authenticate as any role.
_SESSION_TOKENS: dict[str, str] = {
    "demo:farmer": "demo-token-farmer-00000000",
    "demo:buyer": "demo-token-buyer-000000000",
    "demo:cooperative": "demo-token-coop-0000000000",
    "demo:transporter": "demo-token-transport-000000",
    "demo:investor": "demo-token-investor-0000000",
    "demo:extension_agent": "demo-token-extension-00000",
}

_ORG_NAMES: dict[str, str] = {
    "GH": "Ghana Growers Network",
    "NG": "Nigeria Produce Exchange",
}


def _uid(prefix: str, index: int) -> str:
    """Deterministic short ID for seeded entities."""
    return f"{prefix}-demo-{index:04d}"


# ── Public entry point ────────────────────────────────────────────────


def seed_demo_data(session: Session) -> dict[str, int]:
    """Insert full demo dataset.  Returns counts of seeded entities."""
    LOGGER.info("seed_demo_data.start")
    counts: dict[str, int] = {}

    counts["country_policies"] = _ensure_country_policies(session)
    counts["memberships"] = _seed_memberships(session)
    counts["consents"] = _seed_consents(session)
    counts["sessions"] = _seed_sessions(session)
    counts["listings"] = _seed_listings(session)
    counts["negotiation_threads"] = _seed_negotiations(session)
    counts["wallet_accounts"] = _seed_wallets(session)
    counts["farm_profiles"] = _seed_farms(session)
    counts["farm_management_records"] = _seed_farm_management(session)
    counts["climate_observations"] = _seed_climate(session)

    session.flush()
    LOGGER.info("seed_demo_data.finish counts=%s", counts)
    return counts


# ── Country policies (prerequisite for everything) ────────────────────


def _ensure_country_policies(session: Session) -> int:
    created = 0
    for code, locale in [("GH", "en-GH"), ("NG", "en-NG")]:
        if session.get(CountryPolicy, code) is None:
            session.add(
                CountryPolicy(
                    country_code=code,
                    locale=locale,
                    legal_basis="consent_required",
                    policy_version=POLICY_VERSION,
                    metadata_json={"seeded": True, "demo": True},
                )
            )
            created += 1
    session.flush()
    return created


# ── Identity: memberships, consents, sessions ─────────────────────────


def _seed_memberships(session: Session) -> int:
    created = 0
    for actor in DEMO_ACTORS:
        stmt = select(IdentityMembership).where(
            IdentityMembership.actor_id == actor["actor_id"],
            IdentityMembership.role == actor["role"],
        )
        if session.execute(stmt).scalar_one_or_none() is None:
            session.add(
                IdentityMembership(
                    actor_id=actor["actor_id"],
                    role=actor["role"],
                    country_code=actor["country_code"],
                    provenance={"seeded": True, "demo": True},
                )
            )
            created += 1
    session.flush()
    return created


def _seed_consents(session: Session) -> int:
    created = 0
    for actor in DEMO_ACTORS:
        stmt = select(ConsentRecord).where(
            ConsentRecord.actor_id == actor["actor_id"],
            ConsentRecord.consent_type == "regulated_mutation",
            ConsentRecord.policy_version == POLICY_VERSION,
        )
        if session.execute(stmt).scalar_one_or_none() is None:
            session.add(
                ConsentRecord(
                    actor_id=actor["actor_id"],
                    consent_type="regulated_mutation",
                    status="granted",
                    policy_version=POLICY_VERSION,
                    country_code=actor["country_code"],
                )
            )
            created += 1
    session.flush()
    return created


def _seed_sessions(session: Session) -> int:
    created = 0
    now = datetime.now(tz=UTC)
    for actor in DEMO_ACTORS:
        actor_id = actor["actor_id"]
        stmt = select(IdentitySessionRecord).where(
            IdentitySessionRecord.actor_id == actor_id,
        )
        if session.execute(stmt).scalar_one_or_none() is None:
            cc = actor["country_code"]
            session.add(
                IdentitySessionRecord(
                    actor_id=actor_id,
                    session_token=_SESSION_TOKENS[actor_id],
                    display_name=actor["display_name"],
                    email=actor["email"],
                    role=actor["role"],
                    country_code=cc,
                    locale=f"en-{cc}",
                    organization_id=f"org-{cc.lower()}-01",
                    organization_name=_ORG_NAMES[cc],
                    consent_state="consent_granted",
                    policy_version=POLICY_VERSION,
                    consent_scope_ids=["identity.core", "workflow.audit"],
                    consent_channel="pwa",
                    consent_captured_at=now,
                    consent_revoked_at=None,
                )
            )
            created += 1
    session.flush()
    return created


# ── Marketplace: listings ─────────────────────────────────────────────

_DEMO_LISTINGS = [
    {
        "listing_id": _uid("lst", 1),
        "actor_id": "demo:farmer",
        "country_code": "GH",
        "title": "Premium White Maize — Tamale",
        "commodity": "maize",
        "quantity_tons": 25.0,
        "price_amount": 850.00,
        "price_currency": "GHS",
        "location": "Tamale, Northern Region",
        "summary": "Grade-A white maize, 2026 harvest. Moisture < 13 %. Available for immediate pickup.",
        "status": "published",
        "revision_number": 1,
        "published_revision_number": 1,
    },
    {
        "listing_id": _uid("lst", 2),
        "actor_id": "demo:farmer",
        "country_code": "GH",
        "title": "Organic Cocoa Beans — Ashanti",
        "commodity": "cocoa",
        "quantity_tons": 10.0,
        "price_amount": 4200.00,
        "price_currency": "GHS",
        "location": "Kumasi, Ashanti Region",
        "summary": "Certified organic cocoa, sun-dried, export quality.",
        "status": "published",
        "revision_number": 1,
        "published_revision_number": 1,
    },
    {
        "listing_id": _uid("lst", 3),
        "actor_id": "demo:cooperative",
        "country_code": "NG",
        "title": "Parboiled Rice — Kebbi",
        "commodity": "rice",
        "quantity_tons": 50.0,
        "price_amount": 320000.00,
        "price_currency": "NGN",
        "location": "Birnin Kebbi, Kebbi State",
        "summary": "Locally milled parboiled rice. Draft listing pending quality attestation.",
        "status": "draft",
        "revision_number": 1,
        "published_revision_number": None,
    },
]


def _seed_listings(session: Session) -> int:
    created = 0
    now = datetime.now(tz=UTC)
    for spec in _DEMO_LISTINGS:
        stmt = select(Listing).where(Listing.listing_id == spec["listing_id"])
        if session.execute(stmt).scalar_one_or_none() is None:
            session.add(
                Listing(
                    listing_id=spec["listing_id"],
                    actor_id=spec["actor_id"],
                    country_code=spec["country_code"],
                    title=spec["title"],
                    commodity=spec["commodity"],
                    quantity_tons=spec["quantity_tons"],
                    price_amount=spec["price_amount"],
                    price_currency=spec["price_currency"],
                    location=spec["location"],
                    summary=spec["summary"],
                    status=spec["status"],
                    revision_number=spec["revision_number"],
                    published_revision_number=spec["published_revision_number"],
                    revision_count=1,
                    published_at=now if spec["status"] == "published" else None,
                )
            )
            created += 1
    session.flush()
    return created


# ── Marketplace: negotiation thread ──────────────────────────────────

_THREAD_ID = _uid("neg", 1)


def _seed_negotiations(session: Session) -> int:
    stmt = select(NegotiationThread).where(NegotiationThread.thread_id == _THREAD_ID)
    if session.execute(stmt).scalar_one_or_none() is not None:
        return 0

    now = datetime.now(tz=UTC)
    session.add(
        NegotiationThread(
            thread_id=_THREAD_ID,
            listing_id=_uid("lst", 1),
            seller_actor_id="demo:farmer",
            buyer_actor_id="demo:buyer",
            country_code="GH",
            status="open",
            current_offer_amount=800.00,
            current_offer_currency="GHS",
            last_action_at=now,
        )
    )
    session.flush()

    session.add(
        NegotiationMessage(
            thread_id=_THREAD_ID,
            actor_id="demo:buyer",
            action="offer",
            amount=800.00,
            currency="GHS",
            note="Can you do 800 GHS/ton for the full 25 tonnes?",
            created_at=now - timedelta(hours=1),
        )
    )
    session.add(
        NegotiationMessage(
            thread_id=_THREAD_ID,
            actor_id="demo:farmer",
            action="counter",
            amount=830.00,
            currency="GHS",
            note="830 GHS/ton is my best — transport included.",
            created_at=now,
        )
    )
    session.flush()
    return 1


# ── Wallet: accounts + initial deposits ──────────────────────────────

_WALLET_SPECS: list[dict[str, str | float]] = [
    {"actor_id": "demo:farmer", "country_code": "GH", "currency": "GHS", "deposit": 5000.00},
    {"actor_id": "demo:buyer", "country_code": "GH", "currency": "GHS", "deposit": 25000.00},
]


def _seed_wallets(session: Session) -> int:
    created = 0
    for spec in _WALLET_SPECS:
        actor_id = str(spec["actor_id"])
        country_code = str(spec["country_code"])
        currency = str(spec["currency"])
        deposit = float(spec["deposit"])
        actor_slug = actor_id.split(":")[1]
        wallet_id = f"wallet-{actor_slug}-{country_code.lower()}-{currency.lower()}"
        stmt = select(WalletAccount).where(WalletAccount.wallet_id == wallet_id)
        if session.execute(stmt).scalar_one_or_none() is not None:
            continue

        session.add(
            WalletAccount(
                wallet_id=wallet_id,
                actor_id=actor_id,
                country_code=country_code,
                currency=currency,
            )
        )
        session.flush()

        entry_id = f"entry-seed-{actor_slug}-001"
        session.add(
            WalletLedgerEntry(
                entry_id=entry_id,
                wallet_id=wallet_id,
                wallet_actor_id=actor_id,
                counterparty_actor_id=None,
                country_code=country_code,
                currency=currency,
                direction="credit",
                reason="seed_deposit",
                amount=deposit,
                available_delta=deposit,
                held_delta=0.0,
                resulting_available_balance=deposit,
                resulting_held_balance=0.0,
                balance_version=1,
                entry_sequence=1,
                escrow_id=None,
                request_id=f"req-seed-{actor_slug}",
                idempotency_key=f"idem-seed-{actor_slug}",
                correlation_id=f"corr-seed-{actor_slug}",
                entry_metadata={"seeded": True, "demo": True},
            )
        )
        created += 1

    session.flush()
    return created


# ── Climate: farm profile, observation, alert ─────────────────────────

_FARM_ID = _uid("farm", 1)
_FIELD_ID = _uid("field", 1)
_INPUT_ID = _uid("input", 1)
_ACTIVITY_ID = _uid("activity", 1)
_CROP_CYCLE_ID = _uid("cycle", 1)


def _seed_farms(session: Session) -> int:
    stmt = select(FarmProfile).where(FarmProfile.farm_id == _FARM_ID)
    if session.execute(stmt).scalar_one_or_none() is not None:
        return 0

    session.add(
        FarmProfile(
            farm_id=_FARM_ID,
            actor_id="demo:farmer",
            country_code="GH",
            farm_name="Asante Maize Fields",
            district="Tamale Metropolitan",
            crop_type="maize",
            hectares=12.5,
            latitude=9.4034,
            longitude=-0.8424,
            metadata_json={"seeded": True, "demo": True},
        )
    )
    session.flush()
    return 1


def _seed_climate(session: Session) -> int:
    obs_id = _uid("obs", 1)
    alert_id = _uid("alert", 1)
    created = 0
    now = datetime.now(tz=UTC)

    stmt = select(ClimateObservation).where(ClimateObservation.observation_id == obs_id)
    if session.execute(stmt).scalar_one_or_none() is None:
        session.add(
            ClimateObservation(
                observation_id=obs_id,
                farm_id=_FARM_ID,
                actor_id="demo:farmer",
                country_code="GH",
                source_id="src-demo-gmet-001",
                source_type="satellite",
                observed_at=now - timedelta(hours=6),
                source_window_start=now - timedelta(hours=12),
                source_window_end=now - timedelta(hours=6),
                rainfall_mm=42.0,
                temperature_c=31.5,
                soil_moisture_pct=68.0,
                anomaly_score=0.7,
                ingestion_state="accepted",
                degraded_mode=False,
                degraded_reason_codes=[],
                assumptions=[],
                provenance=[{"source": "demo_seed"}],
                normalized_payload={
                    "rainfall_mm": 42.0,
                    "temperature_c": 31.5,
                    "soil_moisture_pct": 68.0,
                },
            )
        )
        created += 1

    alert_stmt = select(ClimateAlert).where(ClimateAlert.alert_id == alert_id)
    if session.execute(alert_stmt).scalar_one_or_none() is None:
        session.add(
            ClimateAlert(
                alert_id=alert_id,
                farm_id=_FARM_ID,
                actor_id="demo:farmer",
                country_code="GH",
                observation_id=obs_id,
                alert_type="heavy_rainfall",
                severity="warning",
                precedence_rank=2,
                headline="Heavy rainfall expected — Tamale district",
                detail="42 mm recorded in the last 6 hours with more expected. Secure inputs and check drainage channels.",
                status="open",
                source_confidence="high",
                degraded_mode=False,
                degraded_reason_codes=[],
                farm_context={"crop_type": "maize", "hectares": 12.5},
            )
        )
        created += 1

    session.flush()
    return created


def _seed_farm_management(session: Session) -> int:
    created = 0

    if session.execute(select(FarmField).where(FarmField.field_id == _FIELD_ID)).scalar_one_or_none() is None:
        session.add(
            FarmField(
                field_id=_FIELD_ID,
                farm_id=_FARM_ID,
                actor_id="demo:farmer",
                country_code="GH",
                name="North Irrigated Block",
                boundary_geojson={
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [-0.8431, 9.4041],
                            [-0.8416, 9.4041],
                            [-0.8416, 9.4030],
                            [-0.8431, 9.4030],
                            [-0.8431, 9.4041],
                        ]
                    ],
                },
                area_hectares=4.8,
                soil_type="loam",
                irrigation_type="drip",
                current_crop="maize",
                planting_date=date(2026, 4, 2),
                expected_harvest_date=date(2026, 7, 28),
                status="active",
            )
        )
        created += 1
        # Postgres enforces the field foreign key immediately for crop/activity seeds.
        session.flush()

    if session.execute(select(FarmInput).where(FarmInput.input_id == _INPUT_ID)).scalar_one_or_none() is None:
        session.add(
            FarmInput(
                input_id=_INPUT_ID,
                farm_id=_FARM_ID,
                actor_id="demo:farmer",
                country_code="GH",
                input_type="fertilizer",
                name="NPK 15-15-15",
                quantity=18.0,
                unit="bag",
                cost=1650.0,
                supplier="Tamale Agro Inputs",
                purchase_date=date(2026, 3, 29),
                expiry_date=date(2027, 3, 29),
            )
        )
        created += 1

    if session.execute(select(CropCycle).where(CropCycle.crop_cycle_id == _CROP_CYCLE_ID)).scalar_one_or_none() is None:
        session.add(
            CropCycle(
                crop_cycle_id=_CROP_CYCLE_ID,
                farm_id=_FARM_ID,
                field_id=_FIELD_ID,
                actor_id="demo:farmer",
                country_code="GH",
                crop_type="maize",
                variety="Obaatanpa",
                planting_date=date(2026, 4, 2),
                harvest_date=date(2026, 7, 28),
                yield_tons=None,
                revenue=None,
                status="active",
            )
        )
        created += 1

    if session.execute(select(FarmActivity).where(FarmActivity.activity_id == _ACTIVITY_ID)).scalar_one_or_none() is None:
        session.add(
            FarmActivity(
                activity_id=_ACTIVITY_ID,
                farm_id=_FARM_ID,
                field_id=_FIELD_ID,
                actor_id="demo:farmer",
                country_code="GH",
                activity_type="fertilizing",
                activity_date=date(2026, 4, 18),
                description="Top dressed maize after rainfall window",
                inputs_used=[{"input_id": _INPUT_ID, "quantity": 3.0, "unit": "bag"}],
                labor_hours=6.0,
                cost=320.0,
                notes="Completed before forecasted heavy rain.",
            )
        )
        created += 1

    session.flush()
    return created


# ── CLI entry point ───────────────────────────────────────────────────

def _ensure_tables(engine: object) -> None:
    """Create tables for all metadata groups if they don't exist."""
    from sqlalchemy.engine import Engine

    assert isinstance(engine, Engine)
    for base_cls in (PlatformBase, WorkflowBase, AuditBase, CommerceBase):
        base_cls.metadata.create_all(bind=engine)


if __name__ == "__main__":
    import json
    import sys

    from app.core.config import get_settings
    from app.core.db import get_engine, get_session_factory
    from app.db.migrations.seed import run_seed

    logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")

    settings = get_settings()
    engine = get_engine(settings.database_url)

    # Ensure schema exists (handles fresh DBs without alembic).
    _ensure_tables(engine)

    factory = get_session_factory(settings.database_url)
    with factory() as session:
        # Run base seed first (country policies, workflow defs, advisory sources).
        run_seed(session)
        session.commit()

    with factory() as session:
        counts = seed_demo_data(session)
        session.commit()

    print(json.dumps(counts, indent=2))
    total = sum(counts.values())
    print(f"\nDemo seed complete — {total} entity groups seeded.")
    sys.exit(0)
