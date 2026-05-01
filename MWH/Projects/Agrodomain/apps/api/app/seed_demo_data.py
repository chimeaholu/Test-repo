"""EH2 demo-tenant seed and reset tooling.

Seeds deterministic synthetic actors, commerce scenarios, transport traces,
climate evidence, advisory history, and operator sessions inside the shared
demo tenant. All synthetic identifiers and visible names are reserved so they
cannot be confused with future operational or AgroIntelligence graph entities.
"""

from __future__ import annotations

import argparse
import json
import logging
from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import get_session_factory
from app.core.demo import (
    DEMO_DATA_ORIGIN,
    DEMO_EMAIL_DOMAIN,
    DEMO_ID_PREFIX,
    DEMO_NAME_PREFIX,
    DEMO_OPERATOR_ACTOR_ID,
    DEMO_OPERATOR_PASSWORD,
    DEMO_PERSONA_CATALOG,
    DEMO_PROVENANCE_TAG,
    DEMO_SCENARIO_PACK_VERSION,
    DEMO_TENANT_ID,
    DEMO_TENANT_LABEL,
    DEMO_WATERMARK,
)
from app.core.identity_security import build_password_hash, hash_access_token
from app.db.models.advisory import (
    AdvisoryRequestRecord,
    AdvisorySourceDocument,
    ReviewerDecisionRecord,
)
from app.db.models.climate import (
    ClimateAlert,
    ClimateObservation,
    FarmProfile,
    MrvEvidenceRecord,
)
from app.db.models.farm import CropCycle, FarmActivity, FarmField, FarmInput
from app.db.models.ledger import (
    EscrowRecord,
    EscrowTimelineEntry,
    WalletAccount,
    WalletLedgerEntry,
)
from app.db.models.marketplace import (
    Listing,
    ListingRevision,
    NegotiationMessage,
    NegotiationThread,
)
from app.db.models.platform import (
    ConsentRecord,
    CountryPolicy,
    IdentityAccount,
    IdentityMagicLinkChallenge,
    IdentityMembership,
    IdentityPasswordCredential,
    IdentitySessionRecord,
)
from app.db.models.transport import Shipment, ShipmentEvent, TransportLoad

LOGGER = logging.getLogger("agrodomain.api.seed_demo")
POLICY_VERSION = "2026.04"


def _scenario_metadata(
    *,
    actor_id: str | None = None,
    country_code: str | None = None,
    scenario: str,
    extra: dict[str, object] | None = None,
) -> dict[str, object]:
    payload: dict[str, object] = {
        "data_origin": DEMO_DATA_ORIGIN,
        "demo": True,
        "provenance_tag": DEMO_PROVENANCE_TAG,
        "scenario": scenario,
        "scenario_pack_version": DEMO_SCENARIO_PACK_VERSION,
        "tenant_id": DEMO_TENANT_ID,
        "tenant_label": DEMO_TENANT_LABEL,
        "watermark": DEMO_WATERMARK,
    }
    if actor_id is not None:
        payload["actor_id"] = actor_id
    if country_code is not None:
        payload["country_code"] = country_code
    if extra:
        payload.update(extra)
    return payload


def _actor_ids() -> list[str]:
    return [str(persona["actor_id"]) for persona in DEMO_PERSONA_CATALOG]


def _persona_by_actor_id(actor_id: str) -> dict[str, Any]:
    for persona in DEMO_PERSONA_CATALOG:
        if persona["actor_id"] == actor_id:
            return persona
    raise KeyError(actor_id)


def _demo_session_token(actor_id: str) -> str:
    suffix = actor_id.replace("demo:", "").replace(":", "-")
    return f"demo-session-{suffix}"


def _country_policies() -> list[tuple[str, str]]:
    return [("GH", "en-GH"), ("NG", "en-NG")]


def seed_demo_data(session: Session) -> dict[str, int]:
    """Seed the shared demo tenant in-place. Safe to replay."""
    seeded_at = datetime.now(tz=UTC).replace(microsecond=0)
    counts: dict[str, int] = {}

    counts["country_policies"] = _ensure_country_policies(session)
    counts["identity_accounts"] = _ensure_identity_accounts(session)
    counts["memberships"] = _ensure_memberships(session)
    counts["consents"] = _ensure_consents(session)
    counts["sessions"] = _ensure_sessions(session, seeded_at=seeded_at)
    counts["listings"] = _ensure_listings(session, seeded_at=seeded_at)
    counts["negotiations"] = _ensure_negotiations(session, seeded_at=seeded_at)
    counts["wallet_accounts"] = _ensure_wallet_accounts(session)
    counts["wallet_entries"] = _ensure_wallet_entries(session, seeded_at=seeded_at)
    counts["escrows"] = _ensure_escrows(session, seeded_at=seeded_at)
    counts["transport"] = _ensure_transport(session, seeded_at=seeded_at)
    counts["farm_profiles"] = _ensure_farms(session)
    counts["farm_management"] = _ensure_farm_management(session)
    counts["climate"] = _ensure_climate(session, seeded_at=seeded_at)
    counts["advisory"] = _ensure_advisory(session, seeded_at=seeded_at)

    session.flush()
    LOGGER.info("seed_demo_data.finish counts=%s", counts)
    return counts


def reset_demo_data(session: Session) -> dict[str, int]:
    """Delete reserved synthetic demo records only."""
    actor_ids = _actor_ids()
    deleted: dict[str, int] = {}

    def _run(label: str, statement) -> None:
        deleted[label] = int(getattr(session.execute(statement), "rowcount", 0) or 0)

    _run(
        "reviewer_decisions",
        delete(ReviewerDecisionRecord).where(
            or_(
                ReviewerDecisionRecord.actor_id.in_(actor_ids),
                ReviewerDecisionRecord.decision_id.like(f"{DEMO_ID_PREFIX}%"),
            )
        ),
    )
    _run(
        "advisory_requests",
        delete(AdvisoryRequestRecord).where(
            or_(
                AdvisoryRequestRecord.actor_id.in_(actor_ids),
                AdvisoryRequestRecord.advisory_request_id.like(f"{DEMO_ID_PREFIX}%"),
            )
        ),
    )
    _run(
        "advisory_sources",
        delete(AdvisorySourceDocument).where(
            AdvisorySourceDocument.source_id.like(f"{DEMO_ID_PREFIX}%")
        ),
    )
    _run(
        "mrv_evidence",
        delete(MrvEvidenceRecord).where(
            or_(
                MrvEvidenceRecord.actor_id.in_(actor_ids),
                MrvEvidenceRecord.evidence_id.like(f"{DEMO_ID_PREFIX}%"),
            )
        ),
    )
    _run(
        "climate_alerts",
        delete(ClimateAlert).where(
            or_(ClimateAlert.actor_id.in_(actor_ids), ClimateAlert.alert_id.like(f"{DEMO_ID_PREFIX}%"))
        ),
    )
    _run(
        "climate_observations",
        delete(ClimateObservation).where(
            or_(
                ClimateObservation.actor_id.in_(actor_ids),
                ClimateObservation.observation_id.like(f"{DEMO_ID_PREFIX}%"),
            )
        ),
    )
    _run(
        "crop_cycles",
        delete(CropCycle).where(or_(CropCycle.actor_id.in_(actor_ids), CropCycle.crop_cycle_id.like(f"{DEMO_ID_PREFIX}%"))),
    )
    _run(
        "farm_activities",
        delete(FarmActivity).where(or_(FarmActivity.actor_id.in_(actor_ids), FarmActivity.activity_id.like(f"{DEMO_ID_PREFIX}%"))),
    )
    _run(
        "farm_inputs",
        delete(FarmInput).where(or_(FarmInput.actor_id.in_(actor_ids), FarmInput.input_id.like(f"{DEMO_ID_PREFIX}%"))),
    )
    _run(
        "farm_fields",
        delete(FarmField).where(or_(FarmField.actor_id.in_(actor_ids), FarmField.field_id.like(f"{DEMO_ID_PREFIX}%"))),
    )
    _run(
        "farm_profiles",
        delete(FarmProfile).where(or_(FarmProfile.actor_id.in_(actor_ids), FarmProfile.farm_id.like(f"{DEMO_ID_PREFIX}%"))),
    )
    _run(
        "shipment_events",
        delete(ShipmentEvent).where(or_(ShipmentEvent.actor_id.in_(actor_ids), ShipmentEvent.event_id.like(f"{DEMO_ID_PREFIX}%"))),
    )
    _run(
        "shipments",
        delete(Shipment).where(or_(Shipment.transporter_actor_id.in_(actor_ids), Shipment.shipment_id.like(f"{DEMO_ID_PREFIX}%"))),
    )
    _run(
        "transport_loads",
        delete(TransportLoad).where(or_(TransportLoad.poster_actor_id.in_(actor_ids), TransportLoad.load_id.like(f"{DEMO_ID_PREFIX}%"))),
    )
    _run(
        "escrow_timeline",
        delete(EscrowTimelineEntry).where(EscrowTimelineEntry.escrow_id.like(f"{DEMO_ID_PREFIX}%")),
    )
    _run(
        "escrows",
        delete(EscrowRecord).where(
            or_(
                EscrowRecord.buyer_actor_id.in_(actor_ids),
                EscrowRecord.seller_actor_id.in_(actor_ids),
                EscrowRecord.escrow_id.like(f"{DEMO_ID_PREFIX}%"),
            )
        ),
    )
    _run(
        "wallet_entries",
        delete(WalletLedgerEntry).where(
            or_(
                WalletLedgerEntry.wallet_actor_id.in_(actor_ids),
                WalletLedgerEntry.entry_id.like(f"{DEMO_ID_PREFIX}%"),
            )
        ),
    )
    _run(
        "wallet_accounts",
        delete(WalletAccount).where(or_(WalletAccount.actor_id.in_(actor_ids), WalletAccount.wallet_id.like(f"{DEMO_ID_PREFIX}%"))),
    )
    _run(
        "negotiation_messages",
        delete(NegotiationMessage).where(NegotiationMessage.thread_id.like(f"{DEMO_ID_PREFIX}%")),
    )
    _run(
        "negotiation_threads",
        delete(NegotiationThread).where(
            or_(
                NegotiationThread.seller_actor_id.in_(actor_ids),
                NegotiationThread.buyer_actor_id.in_(actor_ids),
                NegotiationThread.thread_id.like(f"{DEMO_ID_PREFIX}%"),
            )
        ),
    )
    _run(
        "listing_revisions",
        delete(ListingRevision).where(or_(ListingRevision.actor_id.in_(actor_ids), ListingRevision.listing_id.like(f"{DEMO_ID_PREFIX}%"))),
    )
    _run(
        "listings",
        delete(Listing).where(or_(Listing.actor_id.in_(actor_ids), Listing.listing_id.like(f"{DEMO_ID_PREFIX}%"))),
    )
    _run("magic_link_challenges", delete(IdentityMagicLinkChallenge).where(IdentityMagicLinkChallenge.actor_id.in_(actor_ids)))
    _run("sessions", delete(IdentitySessionRecord).where(IdentitySessionRecord.actor_id.in_(actor_ids)))
    _run("consents", delete(ConsentRecord).where(ConsentRecord.actor_id.in_(actor_ids)))
    _run("memberships", delete(IdentityMembership).where(IdentityMembership.actor_id.in_(actor_ids)))
    _run("password_credentials", delete(IdentityPasswordCredential).where(IdentityPasswordCredential.actor_id.in_(actor_ids)))
    _run("identity_accounts", delete(IdentityAccount).where(IdentityAccount.actor_id.in_(actor_ids)))

    session.flush()
    LOGGER.info("reset_demo_data.finish deleted=%s", deleted)
    return deleted


def _ensure_country_policies(session: Session) -> int:
    created = 0
    for code, locale in _country_policies():
        record = session.get(CountryPolicy, code)
        metadata = _scenario_metadata(country_code=code, scenario="tenant-policy")
        if record is None:
            session.add(
                CountryPolicy(
                    country_code=code,
                    locale=locale,
                    legal_basis="consent_required",
                    policy_version=POLICY_VERSION,
                    metadata_json=metadata,
                )
            )
            created += 1
            continue
        record.locale = locale
        record.legal_basis = "consent_required"
        record.policy_version = POLICY_VERSION
        record.metadata_json = {**record.metadata_json, **metadata}
    session.flush()
    return created


def _ensure_identity_accounts(session: Session) -> int:
    created = 0
    settings = get_settings()
    for persona in DEMO_PERSONA_CATALOG:
        actor_id = str(persona["actor_id"])
        country_code = str(persona["country_code"])
        record = session.get(IdentityAccount, actor_id)
        if record is None:
            record = IdentityAccount(
                actor_id=actor_id,
                display_name=str(persona["display_name"]),
                email=str(persona["email"]),
                phone_number=str(persona["phone_number"]),
                home_country_code=country_code,
                locale=f"en-{country_code}",
                password_recovery_required=False,
            )
            session.add(record)
            created += 1
        else:
            record.display_name = str(persona["display_name"])
            record.email = str(persona["email"])
            record.phone_number = str(persona["phone_number"])
            record.home_country_code = country_code
            record.locale = f"en-{country_code}"
            record.password_recovery_required = False

        if actor_id == DEMO_OPERATOR_ACTOR_ID:
            credential = session.get(IdentityPasswordCredential, actor_id)
            password_hash = build_password_hash(
                DEMO_OPERATOR_PASSWORD,
                iterations=settings.auth_password_hash_iterations,
            )
            if credential is None:
                session.add(
                    IdentityPasswordCredential(
                        actor_id=actor_id,
                        password_hash=password_hash,
                        failed_attempts=0,
                        locked_until=None,
                        password_updated_at=datetime.now(tz=UTC),
                    )
                )
            else:
                credential.password_hash = password_hash
                credential.failed_attempts = 0
                credential.locked_until = None
                credential.password_updated_at = datetime.now(tz=UTC)
    session.flush()
    return created


def _ensure_memberships(session: Session) -> int:
    created = 0
    for persona in DEMO_PERSONA_CATALOG:
        actor_id = str(persona["actor_id"])
        role = str(persona["role"])
        country_code = str(persona["country_code"])
        record = session.execute(
            select(IdentityMembership).where(
                IdentityMembership.actor_id == actor_id,
                IdentityMembership.role == role,
                IdentityMembership.country_code == country_code,
            )
        ).scalar_one_or_none()
        provenance = _scenario_metadata(
            actor_id=actor_id,
            country_code=country_code,
            scenario=str(persona["scenario_key"]),
            extra={"organization_id": persona["organization_id"]},
        )
        if record is None:
            session.add(
                IdentityMembership(
                    actor_id=actor_id,
                    role=role,
                    country_code=country_code,
                    provenance=provenance,
                )
            )
            created += 1
        else:
            record.provenance = provenance
    session.flush()
    return created


def _ensure_consents(session: Session) -> int:
    created = 0
    for persona in DEMO_PERSONA_CATALOG:
        actor_id = str(persona["actor_id"])
        country_code = str(persona["country_code"])
        record = session.execute(
            select(ConsentRecord).where(
                ConsentRecord.actor_id == actor_id,
                ConsentRecord.consent_type == "regulated_mutation",
                ConsentRecord.policy_version == POLICY_VERSION,
            )
        ).scalar_one_or_none()
        if record is None:
            session.add(
                ConsentRecord(
                    actor_id=actor_id,
                    consent_type="regulated_mutation",
                    status="granted",
                    policy_version=POLICY_VERSION,
                    country_code=country_code,
                )
            )
            created += 1
        else:
            record.status = "granted"
            record.country_code = country_code
    session.flush()
    return created


def _ensure_sessions(session: Session, *, seeded_at: datetime) -> int:
    created = 0
    for persona in DEMO_PERSONA_CATALOG:
        actor_id = str(persona["actor_id"])
        country_code = str(persona["country_code"])
        record = session.execute(
            select(IdentitySessionRecord).where(IdentitySessionRecord.actor_id == actor_id)
        ).scalars().first()
        values = {
            "session_token": hash_access_token(_demo_session_token(actor_id)),
            "display_name": str(persona["display_name"]),
            "email": str(persona["email"]),
            "role": str(persona["role"]),
            "country_code": country_code,
            "locale": f"en-{country_code}",
            "organization_id": str(persona["organization_id"]),
            "organization_name": str(persona["organization_name"]),
            "consent_state": "consent_granted",
            "policy_version": POLICY_VERSION,
            "consent_scope_ids": ["identity.core", "workflow.audit"],
            "consent_channel": "pwa",
            "consent_captured_at": seeded_at - timedelta(days=4),
            "consent_revoked_at": None,
            "issued_via": "demo_seed",
            "expires_at": seeded_at + timedelta(days=3650),
            "last_seen_at": seeded_at - timedelta(minutes=5),
            "refreshed_at": seeded_at - timedelta(hours=1),
            "revoked_at": None,
            "revoke_reason": None,
        }
        if record is None:
            session.add(
                IdentitySessionRecord(
                    session_id=f"{DEMO_ID_PREFIX}session-{actor_id.replace(':', '-')}",
                    actor_id=actor_id,
                    **values,
                )
            )
            created += 1
            continue
        for field_name, value in values.items():
            setattr(record, field_name, value)
    session.flush()
    return created


def _ensure_listings(session: Session, *, seeded_at: datetime) -> int:
    created = 0
    listing_defs: list[dict[str, Any]] = [
        {
            "listing_id": f"{DEMO_ID_PREFIX}listing-gh-maize",
            "actor_id": "demo:gh:farmer:kwame",
            "country_code": "GH",
            "title": f"{DEMO_NAME_PREFIX}Premium white maize",
            "commodity": "maize",
            "quantity_tons": 28.0,
            "price_amount": 865.0,
            "price_currency": "GHS",
            "location": "Tamale, Northern Region",
            "summary": "Reserved synthetic maize lot for the guided Ghana trade walkthrough.",
            "status": "published",
            "revision_number": 2,
            "published_revision_number": 2,
            "revision_count": 2,
            "published_at": seeded_at - timedelta(days=2),
            "scenario": "gh-marketplace",
        },
        {
            "listing_id": f"{DEMO_ID_PREFIX}listing-ng-rice",
            "actor_id": "demo:ng:farmer:chioma",
            "country_code": "NG",
            "title": f"{DEMO_NAME_PREFIX}Parboiled paddy rice",
            "commodity": "rice",
            "quantity_tons": 18.5,
            "price_amount": 1175000.0,
            "price_currency": "NGN",
            "location": "Kaduna, Kaduna State",
            "summary": "Reserved synthetic rice listing for demand discovery and climate response demos.",
            "status": "published",
            "revision_number": 1,
            "published_revision_number": 1,
            "revision_count": 1,
            "published_at": seeded_at - timedelta(days=1),
            "scenario": "ng-marketplace",
        },
    ]
    for definition in listing_defs:
        record = session.execute(
            select(Listing).where(Listing.listing_id == definition["listing_id"])
        ).scalar_one_or_none()
        payload = {key: value for key, value in definition.items() if key != "scenario"}
        if record is None:
            session.add(Listing(**payload))
            created += 1
        else:
            for field_name, value in payload.items():
                setattr(record, field_name, value)
        _ensure_listing_revisions(session, definition=definition, seeded_at=seeded_at)
    session.flush()
    return created


def _ensure_listing_revisions(session: Session, *, definition: dict[str, Any], seeded_at: datetime) -> None:
    revisions = [
        {
            "listing_id": str(definition["listing_id"]),
            "revision_number": 1,
            "change_type": "created",
            "actor_id": str(definition["actor_id"]),
            "country_code": str(definition["country_code"]),
            "status": "draft" if int(definition["revision_number"]) > 1 else str(definition["status"]),
            "title": str(definition["title"]),
            "commodity": str(definition["commodity"]),
            "quantity_tons": float(definition["quantity_tons"]),
            "price_amount": float(definition["price_amount"]) - (15.0 if definition["country_code"] == "GH" else 25000.0),
            "price_currency": str(definition["price_currency"]),
            "location": str(definition["location"]),
            "summary": f"{definition['summary']} Initial synthetic draft.",
            "changed_at": seeded_at - timedelta(days=3),
        }
    ]
    if int(definition["revision_number"]) > 1:
        revisions.append(
            {
                "listing_id": str(definition["listing_id"]),
                "revision_number": 2,
                "change_type": "published",
                "actor_id": str(definition["actor_id"]),
                "country_code": str(definition["country_code"]),
                "status": str(definition["status"]),
                "title": str(definition["title"]),
                "commodity": str(definition["commodity"]),
                "quantity_tons": float(definition["quantity_tons"]),
                "price_amount": float(definition["price_amount"]),
                "price_currency": str(definition["price_currency"]),
                "location": str(definition["location"]),
                "summary": str(definition["summary"]),
                "changed_at": seeded_at - timedelta(days=2),
            }
        )
    for revision in revisions:
        record = session.execute(
            select(ListingRevision).where(
                ListingRevision.listing_id == revision["listing_id"],
                ListingRevision.revision_number == revision["revision_number"],
            )
        ).scalar_one_or_none()
        if record is None:
            session.add(ListingRevision(**revision))
            continue
        for field_name, value in revision.items():
            setattr(record, field_name, value)


def _ensure_negotiations(session: Session, *, seeded_at: datetime) -> int:
    created = 0
    thread_defs: list[dict[str, Any]] = [
        {
            "thread_id": f"{DEMO_ID_PREFIX}thread-gh-maize",
            "listing_id": f"{DEMO_ID_PREFIX}listing-gh-maize",
            "seller_actor_id": "demo:gh:farmer:kwame",
            "buyer_actor_id": "demo:gh:buyer:ama",
            "country_code": "GH",
            "status": "accepted",
            "current_offer_amount": 850.0,
            "current_offer_currency": "GHS",
            "confirmation_requested_by_actor_id": "demo:gh:buyer:ama",
            "required_confirmer_actor_id": "demo:gh:farmer:kwame",
            "confirmation_requested_at": seeded_at - timedelta(days=1, hours=6),
            "last_action_at": seeded_at - timedelta(days=1),
            "created_at": seeded_at - timedelta(days=2),
            "messages": [
                ("offer_made", "demo:gh:buyer:ama", 835.0, "Buyer opens with a synthetic floor price."),
                ("counter_offer", "demo:gh:farmer:kwame", 860.0, "Farmer counters after quality review."),
                ("confirmation_requested", "demo:gh:buyer:ama", 850.0, "Buyer asks the farmer to confirm the final walkthrough amount."),
                ("accepted", "demo:gh:farmer:kwame", 850.0, "Farmer accepts the escrow-backed offer."),
            ],
        },
        {
            "thread_id": f"{DEMO_ID_PREFIX}thread-ng-rice",
            "listing_id": f"{DEMO_ID_PREFIX}listing-ng-rice",
            "seller_actor_id": "demo:ng:farmer:chioma",
            "buyer_actor_id": "demo:ng:buyer:emeka",
            "country_code": "NG",
            "status": "open",
            "current_offer_amount": 1160000.0,
            "current_offer_currency": "NGN",
            "confirmation_requested_by_actor_id": None,
            "required_confirmer_actor_id": None,
            "confirmation_requested_at": None,
            "last_action_at": seeded_at - timedelta(hours=7),
            "created_at": seeded_at - timedelta(days=1),
            "messages": [
                ("offer_made", "demo:ng:buyer:emeka", 1150000.0, "Buyer opens with a discovery-stage offer."),
                ("counter_offer", "demo:ng:farmer:chioma", 1160000.0, "Farmer counters while the climate alert remains open."),
            ],
        },
    ]
    for definition in thread_defs:
        record = session.execute(
            select(NegotiationThread).where(NegotiationThread.thread_id == definition["thread_id"])
        ).scalar_one_or_none()
        payload = {key: value for key, value in definition.items() if key != "messages"}
        if record is None:
            session.add(NegotiationThread(**payload))
            created += 1
        else:
            for field_name, value in payload.items():
                setattr(record, field_name, value)

        existing_messages = session.execute(
            select(NegotiationMessage).where(NegotiationMessage.thread_id == definition["thread_id"])
        ).scalars().all()
        if len(existing_messages) != len(definition["messages"]):
            session.execute(delete(NegotiationMessage).where(NegotiationMessage.thread_id == definition["thread_id"]))
            for index, (action, actor_id, amount, note) in enumerate(definition["messages"], start=1):
                session.add(
                    NegotiationMessage(
                        thread_id=str(definition["thread_id"]),
                        actor_id=actor_id,
                        action=action,
                        amount=amount,
                        currency=str(definition["current_offer_currency"]),
                        note=note,
                        created_at=seeded_at - timedelta(days=2) + timedelta(hours=index * 3),
                    )
                )
    session.flush()
    return created


def _ensure_wallet_accounts(session: Session) -> int:
    created = 0
    wallet_defs = [
        ("demo:gh:farmer:kwame", "GH", "GHS"),
        ("demo:gh:buyer:ama", "GH", "GHS"),
        ("demo:gh:transporter:kofi", "GH", "GHS"),
        ("demo:gh:finance:esi", "GH", "GHS"),
        ("demo:ng:farmer:chioma", "NG", "NGN"),
        ("demo:ng:buyer:emeka", "NG", "NGN"),
    ]
    for actor_id, country_code, currency in wallet_defs:
        wallet_id = f"{DEMO_ID_PREFIX}wallet-{country_code.lower()}-{actor_id.split(':')[-1]}-{currency.lower()}"
        record = session.execute(
            select(WalletAccount).where(WalletAccount.wallet_id == wallet_id)
        ).scalar_one_or_none()
        if record is None:
            session.add(
                WalletAccount(
                    wallet_id=wallet_id,
                    actor_id=actor_id,
                    country_code=country_code,
                    currency=currency,
                )
            )
            created += 1
            continue
        record.actor_id = actor_id
        record.country_code = country_code
        record.currency = currency
    session.flush()
    return created


def _ensure_wallet_entries(session: Session, *, seeded_at: datetime) -> int:
    created = 0
    entry_defs: list[dict[str, Any]] = [
        {
            "entry_id": f"{DEMO_ID_PREFIX}entry-gh-buyer-hold",
            "wallet_id": f"{DEMO_ID_PREFIX}wallet-gh-ama-ghs",
            "wallet_actor_id": "demo:gh:buyer:ama",
            "counterparty_actor_id": "demo:gh:farmer:kwame",
            "country_code": "GH",
            "currency": "GHS",
            "direction": "debit",
            "reason": "escrow_funded",
            "amount": 850.0,
            "available_delta": -850.0,
            "held_delta": 850.0,
            "resulting_available_balance": 3650.0,
            "resulting_held_balance": 850.0,
            "balance_version": 1,
            "entry_sequence": 1,
            "escrow_id": f"{DEMO_ID_PREFIX}escrow-gh-maize",
            "request_id": f"{DEMO_ID_PREFIX}wallet-gh-1",
            "idempotency_key": f"{DEMO_ID_PREFIX}wallet-gh-1",
            "correlation_id": f"{DEMO_ID_PREFIX}wallet-gh-1",
            "reconciliation_marker": "synthetic-gh-ledger-1",
            "entry_metadata": _scenario_metadata(actor_id="demo:gh:buyer:ama", country_code="GH", scenario="gh-wallet"),
            "created_at": seeded_at - timedelta(days=1, hours=10),
        },
        {
            "entry_id": f"{DEMO_ID_PREFIX}entry-gh-farmer-release",
            "wallet_id": f"{DEMO_ID_PREFIX}wallet-gh-kwame-ghs",
            "wallet_actor_id": "demo:gh:farmer:kwame",
            "counterparty_actor_id": "demo:gh:buyer:ama",
            "country_code": "GH",
            "currency": "GHS",
            "direction": "credit",
            "reason": "escrow_released",
            "amount": 850.0,
            "available_delta": 850.0,
            "held_delta": 0.0,
            "resulting_available_balance": 2850.0,
            "resulting_held_balance": 0.0,
            "balance_version": 1,
            "entry_sequence": 1,
            "escrow_id": f"{DEMO_ID_PREFIX}escrow-gh-maize",
            "request_id": f"{DEMO_ID_PREFIX}wallet-gh-2",
            "idempotency_key": f"{DEMO_ID_PREFIX}wallet-gh-2",
            "correlation_id": f"{DEMO_ID_PREFIX}wallet-gh-2",
            "reconciliation_marker": "synthetic-gh-ledger-2",
            "entry_metadata": _scenario_metadata(actor_id="demo:gh:farmer:kwame", country_code="GH", scenario="gh-wallet"),
            "created_at": seeded_at - timedelta(days=1, hours=2),
        },
        {
            "entry_id": f"{DEMO_ID_PREFIX}entry-gh-transporter-earnings",
            "wallet_id": f"{DEMO_ID_PREFIX}wallet-gh-kofi-ghs",
            "wallet_actor_id": "demo:gh:transporter:kofi",
            "counterparty_actor_id": "demo:gh:finance:esi",
            "country_code": "GH",
            "currency": "GHS",
            "direction": "credit",
            "reason": "wallet_transfer_received",
            "amount": 145.0,
            "available_delta": 145.0,
            "held_delta": 0.0,
            "resulting_available_balance": 945.0,
            "resulting_held_balance": 0.0,
            "balance_version": 1,
            "entry_sequence": 1,
            "escrow_id": None,
            "request_id": f"{DEMO_ID_PREFIX}wallet-gh-3",
            "idempotency_key": f"{DEMO_ID_PREFIX}wallet-gh-3",
            "correlation_id": f"{DEMO_ID_PREFIX}wallet-gh-3",
            "reconciliation_marker": "synthetic-gh-ledger-3",
            "entry_metadata": _scenario_metadata(actor_id="demo:gh:transporter:kofi", country_code="GH", scenario="gh-logistics"),
            "created_at": seeded_at - timedelta(hours=18),
        },
        {
            "entry_id": f"{DEMO_ID_PREFIX}entry-ng-buyer-float",
            "wallet_id": f"{DEMO_ID_PREFIX}wallet-ng-emeka-ngn",
            "wallet_actor_id": "demo:ng:buyer:emeka",
            "counterparty_actor_id": None,
            "country_code": "NG",
            "currency": "NGN",
            "direction": "credit",
            "reason": "wallet_transfer_received",
            "amount": 1450000.0,
            "available_delta": 1450000.0,
            "held_delta": 0.0,
            "resulting_available_balance": 1450000.0,
            "resulting_held_balance": 0.0,
            "balance_version": 1,
            "entry_sequence": 1,
            "escrow_id": None,
            "request_id": f"{DEMO_ID_PREFIX}wallet-ng-1",
            "idempotency_key": f"{DEMO_ID_PREFIX}wallet-ng-1",
            "correlation_id": f"{DEMO_ID_PREFIX}wallet-ng-1",
            "reconciliation_marker": "synthetic-ng-ledger-1",
            "entry_metadata": _scenario_metadata(actor_id="demo:ng:buyer:emeka", country_code="NG", scenario="ng-marketplace"),
            "created_at": seeded_at - timedelta(hours=12),
        },
    ]
    for definition in entry_defs:
        record = session.execute(
            select(WalletLedgerEntry).where(WalletLedgerEntry.entry_id == definition["entry_id"])
        ).scalar_one_or_none()
        if record is None:
            session.add(WalletLedgerEntry(**definition))
            created += 1
            continue
        for field_name, value in definition.items():
            setattr(record, field_name, value)
    session.flush()
    return created


def _ensure_escrows(session: Session, *, seeded_at: datetime) -> int:
    created = 0
    escrow_defs: list[dict[str, Any]] = [
        {
            "escrow_id": f"{DEMO_ID_PREFIX}escrow-gh-maize",
            "thread_id": f"{DEMO_ID_PREFIX}thread-gh-maize",
            "listing_id": f"{DEMO_ID_PREFIX}listing-gh-maize",
            "buyer_actor_id": "demo:gh:buyer:ama",
            "seller_actor_id": "demo:gh:farmer:kwame",
            "country_code": "GH",
            "currency": "GHS",
            "amount": 850.0,
            "state": "released",
            "partner_reference": "demo-paystack-gh-850",
            "partner_reason_code": None,
            "initiated_by_actor_id": "demo:gh:buyer:ama",
            "funded_at": seeded_at - timedelta(days=1, hours=10),
            "released_at": seeded_at - timedelta(days=1, hours=2),
            "reversed_at": None,
            "disputed_at": None,
            "timeline": [
                ("initiated", "demo:gh:buyer:ama", "Escrow opened for the guided maize trade."),
                ("funded", "demo:gh:buyer:ama", "Synthetic buyer funding applied."),
                ("released", "demo:gh:finance:esi", "Finance persona completed the demo release step."),
            ],
        }
    ]
    for definition in escrow_defs:
        record = session.execute(
            select(EscrowRecord).where(EscrowRecord.escrow_id == definition["escrow_id"])
        ).scalar_one_or_none()
        payload = {key: value for key, value in definition.items() if key != "timeline"}
        if record is None:
            session.add(EscrowRecord(**payload))
            created += 1
        else:
            for field_name, value in payload.items():
                setattr(record, field_name, value)
        session.execute(delete(EscrowTimelineEntry).where(EscrowTimelineEntry.escrow_id == definition["escrow_id"]))
        for index, (transition, actor_id, note) in enumerate(definition["timeline"], start=1):
            session.add(
                EscrowTimelineEntry(
                    escrow_id=str(definition["escrow_id"]),
                    actor_id=actor_id,
                    transition=transition,
                    state=str(definition["state"]) if transition == "released" else transition,
                    note=note,
                    request_id=f"{DEMO_ID_PREFIX}escrow-{index}",
                    idempotency_key=f"{DEMO_ID_PREFIX}escrow-{index}",
                    correlation_id=f"{DEMO_ID_PREFIX}escrow-{index}",
                    notification_payload=_scenario_metadata(actor_id=actor_id, country_code="GH", scenario="gh-wallet"),
                    created_at=seeded_at - timedelta(days=1, hours=12 - index),
                )
            )
    session.flush()
    return created


def _ensure_transport(session: Session, *, seeded_at: datetime) -> int:
    created = 0
    load_defs: list[dict[str, Any]] = [
        {
            "load_id": f"{DEMO_ID_PREFIX}load-gh-maize",
            "poster_actor_id": "demo:gh:farmer:kwame",
            "country_code": "GH",
            "origin_location": "Tamale aggregation point",
            "destination_location": "Kumasi processing hub",
            "commodity": "maize",
            "weight_tons": 24.0,
            "vehicle_type_required": "covered truck",
            "pickup_date": (seeded_at - timedelta(days=1)).date(),
            "delivery_deadline": (seeded_at + timedelta(days=1)).date(),
            "price_offer": 145.0,
            "price_currency": "GHS",
            "status": "assigned",
            "assigned_transporter_actor_id": "demo:gh:transporter:kofi",
            "shipment": {
                "shipment_id": f"{DEMO_ID_PREFIX}shipment-gh-maize",
                "transporter_actor_id": "demo:gh:transporter:kofi",
                "country_code": "GH",
                "vehicle_info": {
                    "plate_number": "DEMO-GH-2041",
                    "driver_name": f"{DEMO_EMAIL_DOMAIN}",
                    "vehicle_type": "covered truck",
                },
                "pickup_time": seeded_at - timedelta(hours=16),
                "delivery_time": seeded_at - timedelta(hours=3),
                "current_location_lat": 6.6885,
                "current_location_lng": -1.6244,
                "status": "delivered",
                "proof_of_delivery_url": "https://agrodomain-demo.invalid/proof/demo-gh-maize",
                "events": [
                    ("picked_up", "demo:gh:transporter:kofi", 9.4067, -0.8393, "Synthetic pickup confirmed."),
                    ("checkpoint", "demo:gh:transporter:kofi", 8.3782, -1.9190, "Transit checkpoint reached."),
                    ("delivered", "demo:gh:transporter:kofi", 6.6885, -1.6244, "Proof captured for the walkthrough."),
                ],
            },
        },
        {
            "load_id": f"{DEMO_ID_PREFIX}load-ng-rice",
            "poster_actor_id": "demo:ng:buyer:emeka",
            "country_code": "NG",
            "origin_location": "Kaduna grain belt",
            "destination_location": "Abuja food reserve depot",
            "commodity": "rice",
            "weight_tons": 16.0,
            "vehicle_type_required": "flatbed",
            "pickup_date": seeded_at.date(),
            "delivery_deadline": (seeded_at + timedelta(days=2)).date(),
            "price_offer": 220000.0,
            "price_currency": "NGN",
            "status": "posted",
            "assigned_transporter_actor_id": None,
            "shipment": None,
        },
    ]
    for definition in load_defs:
        record = session.execute(
            select(TransportLoad).where(TransportLoad.load_id == definition["load_id"])
        ).scalar_one_or_none()
        payload = {key: value for key, value in definition.items() if key != "shipment"}
        if record is None:
            session.add(TransportLoad(**payload))
            created += 1
        else:
            for field_name, value in payload.items():
                setattr(record, field_name, value)
        shipment = definition["shipment"]
        if shipment is not None:
            shipment_record = session.execute(
                select(Shipment).where(Shipment.shipment_id == shipment["shipment_id"])
            ).scalar_one_or_none()
            shipment_payload = {key: value for key, value in shipment.items() if key != "events"}
            shipment_payload["load_id"] = definition["load_id"]
            if shipment_record is None:
                session.add(Shipment(**shipment_payload))
            else:
                for field_name, value in shipment_payload.items():
                    setattr(shipment_record, field_name, value)
            session.execute(delete(ShipmentEvent).where(ShipmentEvent.shipment_id == shipment["shipment_id"]))
            for index, (event_type, actor_id, lat, lng, notes) in enumerate(shipment["events"], start=1):
                session.add(
                    ShipmentEvent(
                        event_id=f"{DEMO_ID_PREFIX}shipment-event-gh-{index}",
                        shipment_id=shipment["shipment_id"],
                        actor_id=actor_id,
                        event_type=event_type,
                        event_at=seeded_at - timedelta(hours=18 - index * 4),
                        location_lat=lat,
                        location_lng=lng,
                        notes=notes,
                    )
                )
    session.flush()
    return created


def _ensure_farms(session: Session) -> int:
    created = 0
    farm_defs = [
        {
            "farm_id": f"{DEMO_ID_PREFIX}farm-gh-kwame",
            "actor_id": "demo:gh:farmer:kwame",
            "country_code": "GH",
            "farm_name": f"{DEMO_NAME_PREFIX}Tamale North Block",
            "district": "Tamale Metropolitan",
            "crop_type": "maize",
            "hectares": 12.4,
            "latitude": 9.4067,
            "longitude": -0.8393,
            "metadata_json": _scenario_metadata(actor_id="demo:gh:farmer:kwame", country_code="GH", scenario="gh-marketplace"),
        },
        {
            "farm_id": f"{DEMO_ID_PREFIX}farm-ng-chioma",
            "actor_id": "demo:ng:farmer:chioma",
            "country_code": "NG",
            "farm_name": f"{DEMO_NAME_PREFIX}Kaduna River Edge",
            "district": "Chikun",
            "crop_type": "rice",
            "hectares": 9.8,
            "latitude": 10.4695,
            "longitude": 7.4386,
            "metadata_json": _scenario_metadata(actor_id="demo:ng:farmer:chioma", country_code="NG", scenario="ng-climate"),
        },
    ]
    for definition in farm_defs:
        record = session.execute(
            select(FarmProfile).where(FarmProfile.farm_id == definition["farm_id"])
        ).scalar_one_or_none()
        if record is None:
            session.add(FarmProfile(**definition))
            created += 1
            continue
        for field_name, value in definition.items():
            setattr(record, field_name, value)
    session.flush()
    return created


def _ensure_farm_management(session: Session) -> int:
    created = 0
    field_defs = [
        {
            "field_id": f"{DEMO_ID_PREFIX}field-gh-main",
            "farm_id": f"{DEMO_ID_PREFIX}farm-gh-kwame",
            "actor_id": "demo:gh:farmer:kwame",
            "country_code": "GH",
            "name": f"{DEMO_NAME_PREFIX}North parcel",
            "boundary_geojson": {"type": "Polygon", "coordinates": [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]]},
            "area_hectares": 7.2,
            "soil_type": "Sandy loam",
            "irrigation_type": "Rain fed",
            "current_crop": "maize",
            "planting_date": date(2026, 3, 18),
            "expected_harvest_date": date(2026, 7, 26),
            "status": "active",
        },
        {
            "field_id": f"{DEMO_ID_PREFIX}field-ng-main",
            "farm_id": f"{DEMO_ID_PREFIX}farm-ng-chioma",
            "actor_id": "demo:ng:farmer:chioma",
            "country_code": "NG",
            "name": f"{DEMO_NAME_PREFIX}Floodwatch parcel",
            "boundary_geojson": {"type": "Polygon", "coordinates": [[[1, 1], [1, 2], [2, 2], [2, 1], [1, 1]]]},
            "area_hectares": 5.9,
            "soil_type": "Clay loam",
            "irrigation_type": "Manual hose set",
            "current_crop": "rice",
            "planting_date": date(2026, 4, 2),
            "expected_harvest_date": date(2026, 8, 14),
            "status": "active",
        },
    ]
    input_defs = [
        {
            "input_id": f"{DEMO_ID_PREFIX}input-gh-fertilizer",
            "farm_id": f"{DEMO_ID_PREFIX}farm-gh-kwame",
            "actor_id": "demo:gh:farmer:kwame",
            "country_code": "GH",
            "input_type": "fertilizer",
            "name": f"{DEMO_NAME_PREFIX}NPK 15-15-15",
            "quantity": 24.0,
            "unit": "bags",
            "cost": 2400.0,
            "supplier": f"{DEMO_NAME_PREFIX}Input Desk",
            "purchase_date": date(2026, 3, 12),
            "expiry_date": None,
        },
        {
            "input_id": f"{DEMO_ID_PREFIX}input-ng-seed",
            "farm_id": f"{DEMO_ID_PREFIX}farm-ng-chioma",
            "actor_id": "demo:ng:farmer:chioma",
            "country_code": "NG",
            "input_type": "seed",
            "name": f"{DEMO_NAME_PREFIX}Flood-safe rice seed",
            "quantity": 14.0,
            "unit": "bags",
            "cost": 560000.0,
            "supplier": f"{DEMO_NAME_PREFIX}Seed Buffer",
            "purchase_date": date(2026, 3, 28),
            "expiry_date": None,
        },
    ]
    activity_defs = [
        {
            "activity_id": f"{DEMO_ID_PREFIX}activity-gh-scout",
            "farm_id": f"{DEMO_ID_PREFIX}farm-gh-kwame",
            "field_id": f"{DEMO_ID_PREFIX}field-gh-main",
            "actor_id": "demo:gh:farmer:kwame",
            "country_code": "GH",
            "activity_type": "scouting",
            "activity_date": date(2026, 4, 20),
            "description": "Synthetic field scouting before shipment planning.",
            "inputs_used": [],
            "labor_hours": 3.5,
            "cost": 120.0,
            "notes": "Reserved demo narrative for the Ghana walkthrough.",
        },
        {
            "activity_id": f"{DEMO_ID_PREFIX}activity-ng-drainage",
            "farm_id": f"{DEMO_ID_PREFIX}farm-ng-chioma",
            "field_id": f"{DEMO_ID_PREFIX}field-ng-main",
            "actor_id": "demo:ng:farmer:chioma",
            "country_code": "NG",
            "activity_type": "drainage",
            "activity_date": date(2026, 4, 22),
            "description": "Synthetic drainage channel clearing after alert review.",
            "inputs_used": [{"name": f"{DEMO_NAME_PREFIX}Flood-safe rice seed", "quantity": 2.0}],
            "labor_hours": 6.0,
            "cost": 18000.0,
            "notes": "Links the climate alert to the advisory walkthrough.",
        },
    ]
    cycle_defs = [
        {
            "crop_cycle_id": f"{DEMO_ID_PREFIX}cycle-gh-maize",
            "farm_id": f"{DEMO_ID_PREFIX}farm-gh-kwame",
            "field_id": f"{DEMO_ID_PREFIX}field-gh-main",
            "actor_id": "demo:gh:farmer:kwame",
            "country_code": "GH",
            "crop_type": "maize",
            "variety": f"{DEMO_NAME_PREFIX}Dryland hybrid",
            "planting_date": date(2026, 3, 18),
            "harvest_date": None,
            "yield_tons": None,
            "revenue": None,
            "status": "active",
        },
        {
            "crop_cycle_id": f"{DEMO_ID_PREFIX}cycle-ng-rice",
            "farm_id": f"{DEMO_ID_PREFIX}farm-ng-chioma",
            "field_id": f"{DEMO_ID_PREFIX}field-ng-main",
            "actor_id": "demo:ng:farmer:chioma",
            "country_code": "NG",
            "crop_type": "rice",
            "variety": f"{DEMO_NAME_PREFIX}Early floodwatch",
            "planting_date": date(2026, 4, 2),
            "harvest_date": None,
            "yield_tons": None,
            "revenue": None,
            "status": "active",
        },
    ]
    for model, key_field, definitions in [
        (FarmField, "field_id", field_defs),
        (FarmInput, "input_id", input_defs),
        (FarmActivity, "activity_id", activity_defs),
        (CropCycle, "crop_cycle_id", cycle_defs),
    ]:
        for definition in definitions:
            record = session.execute(
                select(model).where(getattr(model, key_field) == definition[key_field])
            ).scalar_one_or_none()
            if record is None:
                session.add(model(**definition))
                created += 1
                continue
            for field_name, value in definition.items():
                setattr(record, field_name, value)
    session.flush()
    return created


def _ensure_climate(session: Session, *, seeded_at: datetime) -> int:
    created = 0
    observation_defs = [
        {
            "observation_id": f"{DEMO_ID_PREFIX}observation-ng-river-rise",
            "farm_id": f"{DEMO_ID_PREFIX}farm-ng-chioma",
            "actor_id": "demo:ng:farmer:chioma",
            "country_code": "NG",
            "source_id": f"{DEMO_ID_PREFIX}source-climate-ng-river-rise",
            "source_type": "synthetic_satellite",
            "observed_at": seeded_at - timedelta(hours=9),
            "source_window_start": seeded_at - timedelta(hours=15),
            "source_window_end": seeded_at - timedelta(hours=9),
            "rainfall_mm": 68.0,
            "temperature_c": 28.6,
            "soil_moisture_pct": 72.0,
            "anomaly_score": 0.84,
            "ingestion_state": "ready",
            "degraded_mode": False,
            "degraded_reason_codes": [],
            "assumptions": ["Synthetic signal aligned to the reserved demo farm only."],
            "provenance": [_scenario_metadata(actor_id="demo:ng:farmer:chioma", country_code="NG", scenario="ng-climate")],
            "normalized_payload": {"river_rise_index": 0.84},
        }
    ]
    alert_defs = [
        {
            "alert_id": f"{DEMO_ID_PREFIX}alert-ng-floodwatch",
            "farm_id": f"{DEMO_ID_PREFIX}farm-ng-chioma",
            "actor_id": "demo:ng:farmer:chioma",
            "country_code": "NG",
            "observation_id": f"{DEMO_ID_PREFIX}observation-ng-river-rise",
            "alert_type": "flood_risk",
            "severity": "high",
            "precedence_rank": 1,
            "headline": f"{DEMO_NAME_PREFIX}Floodwatch alert",
            "detail": "Synthetic flood-risk escalation for the Kaduna walkthrough. No operational alerting is attached.",
            "status": "open",
            "source_confidence": "high",
            "degraded_mode": False,
            "degraded_reason_codes": [],
            "farm_context": _scenario_metadata(actor_id="demo:ng:farmer:chioma", country_code="NG", scenario="ng-climate"),
            "acknowledged_at": None,
            "acknowledged_by_actor_id": None,
            "acknowledgement_note": None,
        }
    ]
    evidence_defs = [
        {
            "evidence_id": f"{DEMO_ID_PREFIX}evidence-ng-floodwatch",
            "farm_id": f"{DEMO_ID_PREFIX}farm-ng-chioma",
            "actor_id": "demo:ng:extension:fatima",
            "country_code": "NG",
            "evidence_type": "climate_response_bundle",
            "method_tag": "synthetic_demo_grounding",
            "method_references": ["demo-grounding/ng-climate"],
            "source_window_start": seeded_at - timedelta(hours=15),
            "source_window_end": seeded_at - timedelta(hours=8),
            "source_observation_ids": [f"{DEMO_ID_PREFIX}observation-ng-river-rise"],
            "alert_ids": [f"{DEMO_ID_PREFIX}alert-ng-floodwatch"],
            "assumptions": ["Demonstration-only climate posture."],
            "provenance": [_scenario_metadata(actor_id="demo:ng:extension:fatima", country_code="NG", scenario="ng-climate")],
            "source_completeness_state": "complete",
            "degraded_mode": False,
            "degraded_reason_codes": [],
            "summary": {"recommendation": "clear drainage and delay harvest transport for 48h"},
        }
    ]
    for model, key_field, definitions in [
        (ClimateObservation, "observation_id", observation_defs),
        (ClimateAlert, "alert_id", alert_defs),
        (MrvEvidenceRecord, "evidence_id", evidence_defs),
    ]:
        for definition in definitions:
            record = session.execute(
                select(model).where(getattr(model, key_field) == definition[key_field])
            ).scalar_one_or_none()
            if record is None:
                session.add(model(**definition))
                created += 1
                continue
            for field_name, value in definition.items():
                setattr(record, field_name, value)
    session.flush()
    return created


def _ensure_advisory(session: Session, *, seeded_at: datetime) -> int:
    created = 0
    source_defs = [
        {
            "source_id": f"{DEMO_ID_PREFIX}advisory-ng-floodwatch",
            "country_code": "NG",
            "locale": "en-NG",
            "source_type": "synthetic_field_bulletin",
            "title": f"{DEMO_NAME_PREFIX}Kaduna floodwatch bulletin",
            "summary": "Reserved synthetic guidance for the Nigeria climate walkthrough.",
            "body_markdown": "This synthetic bulletin exists only for the shared demo tenant and references no operational farms.",
            "citation_url": "https://agrodomain-demo.invalid/advisory/ng-floodwatch",
            "method_tag": "synthetic_demo_grounding",
            "risk_tags": ["flood_risk", "waterlogging"],
            "source_metadata": _scenario_metadata(country_code="NG", scenario="ng-climate"),
            "priority": 10,
            "vetted": True,
            "published_at": seeded_at - timedelta(days=2),
        }
    ]
    request_defs = [
        {
            "advisory_request_id": f"{DEMO_ID_PREFIX}advisory-request-ng-floodwatch",
            "advisory_conversation_id": f"{DEMO_ID_PREFIX}conversation-ng-floodwatch",
            "request_id": f"{DEMO_ID_PREFIX}request-ng-floodwatch",
            "actor_id": "demo:ng:farmer:chioma",
            "country_code": "NG",
            "locale": "en-NG",
            "channel": "pwa",
            "topic": "Flood response",
            "question_text": "What should I do after the synthetic flood-risk alert on my rice parcel?",
            "response_text": "Open drainage channels, pause harvest transport for 48 hours, and inspect root-zone saturation before the next field pass.",
            "status": "answered",
            "confidence_band": "high",
            "confidence_score": 0.93,
            "grounded": True,
            "source_ids": [f"{DEMO_ID_PREFIX}advisory-ng-floodwatch"],
            "transcript_entries": [
                {"speaker": "farmer", "text": "I received the floodwatch alert."},
                {"speaker": "advisor", "text": "Use the reserved synthetic flood bulletin and inspect the drainage path."},
            ],
            "policy_context": _scenario_metadata(actor_id="demo:ng:farmer:chioma", country_code="NG", scenario="ng-climate"),
            "model_name": "demo-grounded-agent",
            "model_version": DEMO_SCENARIO_PACK_VERSION,
            "correlation_id": f"{DEMO_ID_PREFIX}corr-ng-floodwatch",
            "delivered_at": seeded_at - timedelta(hours=6),
        }
    ]
    reviewer_defs = [
        {
            "decision_id": f"{DEMO_ID_PREFIX}reviewer-ng-floodwatch",
            "advisory_request_id": f"{DEMO_ID_PREFIX}advisory-request-ng-floodwatch",
            "request_id": f"{DEMO_ID_PREFIX}request-ng-floodwatch",
            "actor_id": "demo:ng:extension:fatima",
            "actor_role": "extension_agent",
            "outcome": "approved",
            "reason_code": "synthetic_demo_grounded",
            "note": "Reserved reviewer trail for the guided demo operator lane.",
            "transcript_link": "https://agrodomain-demo.invalid/review/ng-floodwatch",
            "policy_context": _scenario_metadata(actor_id="demo:ng:extension:fatima", country_code="NG", scenario="ng-climate"),
        }
    ]
    definition_groups: list[tuple[Any, str, list[dict[str, Any]]]] = [
        (AdvisorySourceDocument, "source_id", source_defs),
        (AdvisoryRequestRecord, "advisory_request_id", request_defs),
        (ReviewerDecisionRecord, "decision_id", reviewer_defs),
    ]
    for model, key_field, definitions in definition_groups:
        for definition in definitions:
            record = session.execute(
                select(model).where(getattr(model, key_field) == definition[key_field])
            ).scalar_one_or_none()
            if record is None:
                session.add(model(**definition))
                created += 1
                continue
            for field_name, value in definition.items():
                setattr(record, field_name, value)
    session.flush()
    return created


def _run_cli(reset: bool, json_output: bool) -> None:
    session_factory = get_session_factory(get_settings().database_url)
    with session_factory() as session:
        result: dict[str, object] = {}
        if reset:
            result["reset"] = reset_demo_data(session)
        result["seed"] = seed_demo_data(session)
        session.commit()
    if json_output:
        print(json.dumps(result, indent=2, sort_keys=True))
        return
    print("Agrodomain shared demo tenant ready.")
    print(json.dumps(result, indent=2, sort_keys=True))


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed or reseed the EH2 shared demo tenant.")
    parser.add_argument("--reset", action="store_true", help="Delete reserved demo records before reseeding.")
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON output.")
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    _run_cli(reset=args.reset, json_output=args.json)


if __name__ == "__main__":
    main()
