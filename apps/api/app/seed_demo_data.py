"""
Comprehensive demo-data seed for Agrodomain development / staging.

Populates realistic West-African (Ghana-focus) data across every domain:
identity, marketplace, negotiation, escrow, ledger, climate, advisory,
traceability, and audit.

Idempotent: uses upsert helpers or existence checks so the script can run
repeatedly without duplicating rows.

Usage:
    cd apps/api
    python3 -m app.seed_demo_data          # module mode (preferred)
    python3 app/seed_demo_data.py          # direct
"""

from __future__ import annotations

import logging
import sys
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.marketplace import Listing, NegotiationThread
from app.db.models.ledger import EscrowRecord
from app.db.models.climate import ClimateAlert, FarmProfile
from app.db.models.advisory import AdvisoryRequestRecord
from app.db.models.traceability import ConsignmentRecord
from app.db.models.audit import AuditEvent
from app.db.models.platform import IdentityMembership
from app.db.repositories.advisory import AdvisoryRepository
from app.db.repositories.audit import AuditRepository
from app.db.repositories.climate import ClimateRepository
from app.db.repositories.identity import IdentityRepository
from app.db.repositories.ledger import EscrowRepository, LedgerRepository
from app.db.repositories.marketplace import MarketplaceRepository
from app.db.repositories.traceability import TraceabilityRepository

LOGGER = logging.getLogger("agrodomain.api.seed_demo")

# ---------------------------------------------------------------------------
# Deterministic IDs -- make idempotency checks easy
# ---------------------------------------------------------------------------
SEED_PREFIX = "seed"

ACTOR_FARMER = "actor-farmer-kwame"
ACTOR_BUYER = "actor-buyer-amara"
ACTOR_COOP = "actor-coop-ashanti"
ACTOR_ADVISOR = "actor-advisor-akua"
ACTOR_FINANCE = "actor-finance-nana"
ACTOR_ADMIN = "actor-admin-sys"

ALL_ACTORS = [
    ACTOR_FARMER,
    ACTOR_BUYER,
    ACTOR_COOP,
    ACTOR_ADVISOR,
    ACTOR_FINANCE,
    ACTOR_ADMIN,
]

NOW = datetime.now(tz=UTC)
POLICY_VERSION = "2026.04"


# ── helpers ──────────────────────────────────────────────────────────────────
def _sid(domain: str, index: int) -> str:
    """Stable seed id for idempotent lookups."""
    return f"{SEED_PREFIX}-{domain}-{index:03d}"


def _exists(session: Session, model: type, column: str, value: str) -> bool:
    """Return True if a row with `column == value` already exists."""
    stmt = select(model).where(getattr(model, column) == value)
    return session.execute(stmt).scalar_one_or_none() is not None


# ── 1. Identity / Users ─────────────────────────────────────────────────────
USERS = [
    {
        "actor_id": ACTOR_FARMER,
        "display_name": "Kwame Mensah",
        "email": "kwame.mensah@agrodomain.dev",
        "role": "farmer",
        "country_code": "GH",
    },
    {
        "actor_id": ACTOR_BUYER,
        "display_name": "Amara Trading Co.",
        "email": "amara.trading@agrodomain.dev",
        "role": "buyer",
        "country_code": "GH",
    },
    {
        "actor_id": ACTOR_COOP,
        "display_name": "Ashanti Farmers Coop",
        "email": "ashanti.coop@agrodomain.dev",
        "role": "cooperative_manager",
        "country_code": "GH",
    },
    {
        "actor_id": ACTOR_ADVISOR,
        "display_name": "Dr. Akua Boateng",
        "email": "akua.boateng@agrodomain.dev",
        "role": "advisor",
        "country_code": "GH",
    },
    {
        "actor_id": ACTOR_FINANCE,
        "display_name": "Nana Osei",
        "email": "nana.osei@agrodomain.dev",
        "role": "finance_officer",
        "country_code": "GH",
    },
    {
        "actor_id": ACTOR_ADMIN,
        "display_name": "System Admin",
        "email": "admin@agrodomain.dev",
        "role": "admin",
        "country_code": "GH",
    },
]


def seed_users(session: Session) -> None:
    LOGGER.info("seed_demo.users.start")
    identity_repo = IdentityRepository(session)
    for user in USERS:
        identity_repo.ensure_membership(
            actor_id=user["actor_id"],
            role=user["role"],
            country_code=user["country_code"],
        )
        identity_repo.create_or_rotate_session(
            actor_id=user["actor_id"],
            display_name=user["display_name"],
            email=user["email"],
            role=user["role"],
            country_code=user["country_code"],
        )
        # Grant consent so every user can perform regulated mutations.
        # grant_consent upserts the ConsentRecord internally, so no need
        # to pre-create one.
        identity_repo.grant_consent(
            actor_id=user["actor_id"],
            country_code=user["country_code"],
            policy_version=POLICY_VERSION,
            scope_ids=["identity.core", "workflow.audit"],
            captured_at=NOW,
        )
    session.flush()
    LOGGER.info("seed_demo.users.done count=%d", len(USERS))



# ── 2. Listings (15 total) ───────────────────────────────────────────────────
LISTING_DATA = [
    # 10 published listings
    {
        "listing_id": _sid("listing", 1),
        "actor_id": ACTOR_FARMER,
        "title": "White Maize - Premium Grade",
        "commodity": "maize",
        "quantity_tons": 5.0,  # 50 bags ~= 5 tons
        "price_amount": 850.0,
        "price_currency": "GHS",
        "location": "Ashanti Region, Kumasi",
        "summary": "Premium white maize, 50 bags at 100kg each, harvested this season from irrigated farmland near Kumasi.",
        "status": "published",
    },
    {
        "listing_id": _sid("listing", 2),
        "actor_id": ACTOR_FARMER,
        "title": "Fresh Tomatoes - Kumasi",
        "commodity": "tomatoes",
        "quantity_tons": 0.2,  # 200 kg
        "price_amount": 15.0,
        "price_currency": "GHS",
        "location": "Kumasi Metropolitan, Ashanti",
        "summary": "Freshly harvested tomatoes, 200 kg available for immediate pickup at the Kumasi central market area.",
        "status": "published",
    },
    {
        "listing_id": _sid("listing", 3),
        "actor_id": ACTOR_COOP,
        "title": "Cocoa Beans Grade A",
        "commodity": "cocoa",
        "quantity_tons": 1.95,  # 30 bags ~ 65kg each
        "price_amount": 3200.0,
        "price_currency": "GHS",
        "location": "Western Region, Sefwi",
        "summary": "Grade-A cocoa beans, fermented and sun-dried to standard moisture, sourced from cooperative members in Western Region.",
        "status": "published",
    },
    {
        "listing_id": _sid("listing", 4),
        "actor_id": ACTOR_FARMER,
        "title": "Cassava Fresh - Eastern Region",
        "commodity": "cassava",
        "quantity_tons": 0.5,  # 500 kg
        "price_amount": 8.0,
        "price_currency": "GHS",
        "location": "Eastern Region, Koforidua",
        "summary": "Fresh cassava tubers, 500 kg, harvested from red-soil farmlands in Eastern Region. Suitable for gari or fufu processing.",
        "status": "published",
    },
    {
        "listing_id": _sid("listing", 5),
        "actor_id": ACTOR_COOP,
        "title": "Jasmine Rice - Northern",
        "commodity": "rice",
        "quantity_tons": 5.0,  # 100 bags ~ 50kg each
        "price_amount": 420.0,
        "price_currency": "GHS",
        "location": "Northern Region, Tamale",
        "summary": "Locally grown Jasmine rice, 100 bags at 50 kg, milled and polished. From Northern Region irrigated paddies.",
        "status": "published",
    },
    {
        "listing_id": _sid("listing", 6),
        "actor_id": ACTOR_FARMER,
        "title": "Yam Tubers - Brong Ahafo",
        "commodity": "yam",
        "quantity_tons": 3.0,  # ~1000 tubers avg 3kg
        "price_amount": 12.0,
        "price_currency": "GHS",
        "location": "Bono Region (Brong Ahafo), Techiman",
        "summary": "1000 Pona yam tubers from Techiman district. Average weight 3 kg per tuber, stored in barn.",
        "status": "published",
    },
    {
        "listing_id": _sid("listing", 7),
        "actor_id": ACTOR_COOP,
        "title": "Groundnuts - Upper East",
        "commodity": "groundnuts",
        "quantity_tons": 4.0,  # 80 bags ~ 50kg
        "price_amount": 650.0,
        "price_currency": "GHS",
        "location": "Upper East Region, Bolgatanga",
        "summary": "Shelled groundnuts, 80 bags at 50 kg. High-oil variety from Upper East cooperative members.",
        "status": "published",
    },
    {
        "listing_id": _sid("listing", 8),
        "actor_id": ACTOR_FARMER,
        "title": "Palm Oil - Western Region",
        "commodity": "palm_oil",
        "quantity_tons": 0.18,  # 200 litres ~ 180 kg
        "price_amount": 35.0,
        "price_currency": "GHS",
        "location": "Western Region, Tarkwa",
        "summary": "Cold-pressed red palm oil, 200 litres in food-grade jerrycans. Small-batch artisanal quality.",
        "status": "published",
    },
    {
        "listing_id": _sid("listing", 9),
        "actor_id": ACTOR_FARMER,
        "title": "Plantain Bunches - Ashanti",
        "commodity": "plantain",
        "quantity_tons": 2.25,  # 300 bunches ~ 7.5kg
        "price_amount": 25.0,
        "price_currency": "GHS",
        "location": "Ashanti Region, Offinso",
        "summary": "300 bunches of ripe-ready plantain from Offinso. Suitable for kelewele or ampesi.",
        "status": "published",
    },
    {
        "listing_id": _sid("listing", 10),
        "actor_id": ACTOR_COOP,
        "title": "Soybeans - Northern Region",
        "commodity": "soybeans",
        "quantity_tons": 3.0,  # 60 bags ~50kg
        "price_amount": 580.0,
        "price_currency": "GHS",
        "location": "Northern Region, Yendi",
        "summary": "Clean, dried soybeans, 60 bags. Protein-rich variety, ideal for feed mills or soy processing.",
        "status": "published",
    },
    # 3 draft listings
    {
        "listing_id": _sid("listing", 11),
        "actor_id": ACTOR_FARMER,
        "title": "Ginger Root - Volta Region (DRAFT)",
        "commodity": "ginger",
        "quantity_tons": 0.3,
        "price_amount": 22.0,
        "price_currency": "GHS",
        "location": "Volta Region, Hohoe",
        "summary": "Organic ginger root, being prepared for market. Pricing to be confirmed.",
        "status": "draft",
    },
    {
        "listing_id": _sid("listing", 12),
        "actor_id": ACTOR_COOP,
        "title": "Shea Butter - Upper West (DRAFT)",
        "commodity": "shea_butter",
        "quantity_tons": 0.5,
        "price_amount": 45.0,
        "price_currency": "GHS",
        "location": "Upper West Region, Wa",
        "summary": "Hand-processed shea butter from women's cooperative. Awaiting quality certification.",
        "status": "draft",
    },
    {
        "listing_id": _sid("listing", 13),
        "actor_id": ACTOR_FARMER,
        "title": "Millet - Upper East (DRAFT)",
        "commodity": "millet",
        "quantity_tons": 2.0,
        "price_amount": 380.0,
        "price_currency": "GHS",
        "location": "Upper East Region, Navrongo",
        "summary": "Pearl millet, post-harvest drying in progress.",
        "status": "draft",
    },
    # 2 unpublished (were published, then unpublished)
    {
        "listing_id": _sid("listing", 14),
        "actor_id": ACTOR_FARMER,
        "title": "Cowpeas - Northern (Seasonal)",
        "commodity": "cowpeas",
        "quantity_tons": 1.5,
        "price_amount": 480.0,
        "price_currency": "GHS",
        "location": "Northern Region, Damongo",
        "summary": "Season ended, listing unpublished. Will re-list next harvest cycle.",
        "status": "unpublished",
    },
    {
        "listing_id": _sid("listing", 15),
        "actor_id": ACTOR_COOP,
        "title": "Peppers - Greater Accra (Sold Out)",
        "commodity": "peppers",
        "quantity_tons": 0.1,
        "price_amount": 18.0,
        "price_currency": "GHS",
        "location": "Greater Accra Region, Tema",
        "summary": "Batch fully sold. Unpublished pending next supply.",
        "status": "unpublished",
    },
]


def seed_listings(session: Session) -> None:
    LOGGER.info("seed_demo.listings.start")
    mp = MarketplaceRepository(session)
    created = 0
    for data in LISTING_DATA:
        lid = data["listing_id"]
        if _exists(session, Listing, "listing_id", lid):
            continue
        listing = mp.create_listing(
            listing_id=lid,
            actor_id=data["actor_id"],
            country_code="GH",
            title=data["title"],
            commodity=data["commodity"],
            quantity_tons=data["quantity_tons"],
            price_amount=data["price_amount"],
            price_currency=data["price_currency"],
            location=data["location"],
            summary=data["summary"],
        )
        target_status = data["status"]
        if target_status == "published":
            mp.publish_listing(listing=listing)
        elif target_status == "unpublished":
            mp.publish_listing(listing=listing)
            mp.unpublish_listing(listing=listing)
        # draft stays as-is (create_listing default)
        created += 1
    session.flush()
    LOGGER.info("seed_demo.listings.done created=%d", created)


# ── 3. Negotiation threads (8) ──────────────────────────────────────────────
NEGOTIATION_DATA = [
    # open
    {
        "thread_id": _sid("thread", 1),
        "listing_id": _sid("listing", 1),
        "seller": ACTOR_FARMER,
        "buyer": ACTOR_BUYER,
        "amount": 800.0,
        "note": "Can you do 800 per bag for 50 bags?",
        "status": "open",
    },
    {
        "thread_id": _sid("thread", 2),
        "listing_id": _sid("listing", 5),
        "seller": ACTOR_COOP,
        "buyer": ACTOR_BUYER,
        "amount": 400.0,
        "note": "Offering 400 for bulk rice purchase.",
        "status": "open",
    },
    # counter-offered
    {
        "thread_id": _sid("thread", 3),
        "listing_id": _sid("listing", 3),
        "seller": ACTOR_COOP,
        "buyer": ACTOR_BUYER,
        "amount": 3000.0,
        "note": "Initial offer for cocoa beans.",
        "status": "counter_offered",
        "counter_amount": 3100.0,
        "counter_note": "Cannot go below 3100 for Grade A.",
    },
    {
        "thread_id": _sid("thread", 4),
        "listing_id": _sid("listing", 7),
        "seller": ACTOR_COOP,
        "buyer": ACTOR_BUYER,
        "amount": 600.0,
        "note": "Groundnuts at 600 per bag?",
        "status": "counter_offered",
        "counter_amount": 630.0,
        "counter_note": "Transport costs are high from Upper East. Best I can do is 630.",
    },
    # confirmation_pending
    {
        "thread_id": _sid("thread", 5),
        "listing_id": _sid("listing", 2),
        "seller": ACTOR_FARMER,
        "buyer": ACTOR_BUYER,
        "amount": 14.0,
        "note": "14 per kg for all 200 kg tomatoes.",
        "status": "confirmation_pending",
    },
    # accepted
    {
        "thread_id": _sid("thread", 6),
        "listing_id": _sid("listing", 9),
        "seller": ACTOR_FARMER,
        "buyer": ACTOR_BUYER,
        "amount": 23.0,
        "note": "23 per bunch for 300 plantain bunches.",
        "status": "accepted",
    },
    # rejected
    {
        "thread_id": _sid("thread", 7),
        "listing_id": _sid("listing", 6),
        "seller": ACTOR_FARMER,
        "buyer": ACTOR_BUYER,
        "amount": 8.0,
        "note": "8 per tuber, too low for Pona yam.",
        "status": "rejected",
    },
    # cancelled
    {
        "thread_id": _sid("thread", 8),
        "listing_id": _sid("listing", 10),
        "seller": ACTOR_COOP,
        "buyer": ACTOR_BUYER,
        "amount": 550.0,
        "note": "Buyer withdrew, found alternative supplier.",
        "status": "cancelled",
    },
]


def seed_negotiations(session: Session) -> None:
    LOGGER.info("seed_demo.negotiations.start")
    mp = MarketplaceRepository(session)
    created = 0
    for data in NEGOTIATION_DATA:
        tid = data["thread_id"]
        if _exists(session, NegotiationThread, "thread_id", tid):
            continue
        thread = mp.create_negotiation_thread(
            thread_id=tid,
            listing_id=data["listing_id"],
            seller_actor_id=data["seller"],
            buyer_actor_id=data["buyer"],
            country_code="GH",
            offer_amount=data["amount"],
            offer_currency="GHS",
            note=data["note"],
            actor_id=data["buyer"],
        )
        status = data["status"]
        if status == "counter_offered":
            mp.update_negotiation_thread(
                thread=thread,
                status="counter_offered",
                actor_id=data["seller"],
                action="counter_offer",
                amount=data.get("counter_amount", data["amount"] + 50),
                currency="GHS",
                note=data.get("counter_note", "Counter-offer submitted."),
            )
        elif status == "confirmation_pending":
            mp.update_negotiation_thread(
                thread=thread,
                status="confirmation_pending",
                actor_id=data["buyer"],
                action="confirm_requested",
                amount=data["amount"],
                currency="GHS",
                note="Buyer requests confirmation.",
                confirmation_requested_by_actor_id=data["buyer"],
                required_confirmer_actor_id=data["seller"],
            )
        elif status == "accepted":
            mp.update_negotiation_thread(
                thread=thread,
                status="accepted",
                actor_id=data["seller"],
                action="accepted",
                amount=data["amount"],
                currency="GHS",
                note="Deal accepted.",
                clear_confirmation_checkpoint=True,
            )
        elif status == "rejected":
            mp.update_negotiation_thread(
                thread=thread,
                status="rejected",
                actor_id=data["seller"],
                action="rejected",
                note="Price too low, offer rejected.",
            )
        elif status == "cancelled":
            mp.update_negotiation_thread(
                thread=thread,
                status="cancelled",
                actor_id=data["buyer"],
                action="cancelled",
                note="Buyer cancelled negotiation.",
            )
        created += 1
    session.flush()
    LOGGER.info("seed_demo.negotiations.done created=%d", created)


# ── 4. Escrows (4) ──────────────────────────────────────────────────────────
ESCROW_DATA = [
    {
        "escrow_id": _sid("escrow", 1),
        "thread_id": _sid("thread", 6),
        "listing_id": _sid("listing", 9),
        "buyer": ACTOR_BUYER,
        "seller": ACTOR_FARMER,
        "amount": 6900.0,  # 300 * 23
        "state": "initiated",
    },
    {
        "escrow_id": _sid("escrow", 2),
        "thread_id": _sid("thread", 5),
        "listing_id": _sid("listing", 2),
        "buyer": ACTOR_BUYER,
        "seller": ACTOR_FARMER,
        "amount": 2800.0,  # 200 * 14
        "state": "pending_funds",
    },
    {
        "escrow_id": _sid("escrow", 3),
        "thread_id": _sid("thread", 3),
        "listing_id": _sid("listing", 3),
        "buyer": ACTOR_BUYER,
        "seller": ACTOR_COOP,
        "amount": 93000.0,  # 30 * 3100
        "state": "funded",
    },
    {
        "escrow_id": _sid("escrow", 4),
        "thread_id": _sid("thread", 4),
        "listing_id": _sid("listing", 7),
        "buyer": ACTOR_BUYER,
        "seller": ACTOR_COOP,
        "amount": 50400.0,  # 80 * 630
        "state": "released",
    },
]


def seed_escrows(session: Session) -> None:
    LOGGER.info("seed_demo.escrows.start")
    escrow_repo = EscrowRepository(session)
    ledger_repo = LedgerRepository(session)
    created = 0
    for data in ESCROW_DATA:
        eid = data["escrow_id"]
        if _exists(session, EscrowRecord, "escrow_id", eid):
            continue
        escrow = escrow_repo.create_escrow(
            escrow_id=eid,
            thread_id=data["thread_id"],
            listing_id=data["listing_id"],
            buyer_actor_id=data["buyer"],
            seller_actor_id=data["seller"],
            country_code="GH",
            currency="GHS",
            amount=data["amount"],
            initiated_by_actor_id=data["buyer"],
        )
        req_id = f"req-{uuid4().hex[:12]}"
        corr_id = f"corr-{uuid4().hex[:12]}"
        # Append "initiated" timeline entry
        escrow_repo.append_timeline_entry(
            escrow_id=eid,
            actor_id=data["buyer"],
            transition="initiate",
            state="initiated",
            note="Escrow initiated by buyer.",
            request_id=req_id,
            idempotency_key=f"seed-escrow-init-{eid}",
            correlation_id=corr_id,
        )
        state = data["state"]
        if state in ("pending_funds", "funded", "released"):
            escrow_repo.transition_escrow(escrow=escrow, state="pending_funds")
            escrow_repo.append_timeline_entry(
                escrow_id=eid,
                actor_id=data["buyer"],
                transition="request_funds",
                state="pending_funds",
                note="Awaiting buyer payment.",
                request_id=f"req-{uuid4().hex[:12]}",
                idempotency_key=f"seed-escrow-pend-{eid}",
                correlation_id=corr_id,
            )
        if state in ("funded", "released"):
            # Credit buyer wallet then fund escrow
            ledger_repo.ensure_wallet(
                actor_id=data["buyer"], country_code="GH", currency="GHS"
            )
            ledger_repo.append_entry(
                actor_id=data["buyer"],
                country_code="GH",
                currency="GHS",
                direction="credit",
                reason="deposit",
                amount=data["amount"],
                available_delta=data["amount"],
                held_delta=0.0,
                request_id=f"req-{uuid4().hex[:12]}",
                idempotency_key=f"seed-wallet-dep-{eid}",
                correlation_id=corr_id,
            )
            # Hold funds
            ledger_repo.append_entry(
                actor_id=data["buyer"],
                country_code="GH",
                currency="GHS",
                direction="hold",
                reason="escrow_hold",
                amount=data["amount"],
                available_delta=-data["amount"],
                held_delta=data["amount"],
                escrow_id=eid,
                request_id=f"req-{uuid4().hex[:12]}",
                idempotency_key=f"seed-wallet-hold-{eid}",
                correlation_id=corr_id,
            )
            escrow_repo.transition_escrow(escrow=escrow, state="funded")
            escrow_repo.append_timeline_entry(
                escrow_id=eid,
                actor_id=data["buyer"],
                transition="fund",
                state="funded",
                note="Buyer funds received and held.",
                request_id=f"req-{uuid4().hex[:12]}",
                idempotency_key=f"seed-escrow-fund-{eid}",
                correlation_id=corr_id,
            )
        if state == "released":
            # Release held funds to seller
            ledger_repo.append_entry(
                actor_id=data["buyer"],
                country_code="GH",
                currency="GHS",
                direction="release",
                reason="escrow_release",
                amount=data["amount"],
                available_delta=0.0,
                held_delta=-data["amount"],
                escrow_id=eid,
                counterparty_actor_id=data["seller"],
                request_id=f"req-{uuid4().hex[:12]}",
                idempotency_key=f"seed-wallet-rel-{eid}",
                correlation_id=corr_id,
            )
            ledger_repo.ensure_wallet(
                actor_id=data["seller"], country_code="GH", currency="GHS"
            )
            ledger_repo.append_entry(
                actor_id=data["seller"],
                country_code="GH",
                currency="GHS",
                direction="credit",
                reason="escrow_payout",
                amount=data["amount"],
                available_delta=data["amount"],
                held_delta=0.0,
                escrow_id=eid,
                counterparty_actor_id=data["buyer"],
                request_id=f"req-{uuid4().hex[:12]}",
                idempotency_key=f"seed-wallet-pay-{eid}",
                correlation_id=corr_id,
            )
            escrow_repo.transition_escrow(escrow=escrow, state="released")
            escrow_repo.append_timeline_entry(
                escrow_id=eid,
                actor_id=data["seller"],
                transition="release",
                state="released",
                note="Funds released to seller after delivery confirmation.",
                request_id=f"req-{uuid4().hex[:12]}",
                idempotency_key=f"seed-escrow-rel-{eid}",
                correlation_id=corr_id,
            )
        created += 1
    session.flush()
    LOGGER.info("seed_demo.escrows.done created=%d", created)


# ── 5. Climate alerts (10) ──────────────────────────────────────────────────
FARM_PROFILES = [
    {
        "farm_id": _sid("farm", 1),
        "actor_id": ACTOR_FARMER,
        "farm_name": "Mensah Family Farm",
        "district": "Kumasi Metropolitan",
        "crop_type": "maize",
        "hectares": 4.5,
        "latitude": 6.6885,
        "longitude": -1.6244,
    },
    {
        "farm_id": _sid("farm", 2),
        "actor_id": ACTOR_FARMER,
        "farm_name": "Mensah Tomato Plot",
        "district": "Ejisu-Juaben",
        "crop_type": "tomatoes",
        "hectares": 1.2,
        "latitude": 6.7318,
        "longitude": -1.4553,
    },
    {
        "farm_id": _sid("farm", 3),
        "actor_id": ACTOR_COOP,
        "farm_name": "Ashanti Coop Block A",
        "district": "Offinso North",
        "crop_type": "cocoa",
        "hectares": 12.0,
        "latitude": 7.0344,
        "longitude": -1.9592,
    },
]

CLIMATE_ALERTS = [
    {
        "alert_id": _sid("alert", 1),
        "farm_id": _sid("farm", 1),
        "actor_id": ACTOR_FARMER,
        "alert_type": "drought_warning",
        "severity": "high",
        "precedence_rank": 1,
        "headline": "Severe drought risk for maize in Kumasi Metropolitan",
        "detail": "Rainfall deficit of 45% over the last 21 days. Soil moisture at 18% critical threshold. Consider supplemental irrigation or mulching to conserve moisture.",
    },
    {
        "alert_id": _sid("alert", 2),
        "farm_id": _sid("farm", 1),
        "actor_id": ACTOR_FARMER,
        "alert_type": "pest_outbreak",
        "severity": "critical",
        "precedence_rank": 0,
        "headline": "Fall armyworm detected in Ashanti maize belt",
        "detail": "Regional reports confirm fall armyworm migration into Ashanti. Scout fields urgently, apply approved bio-control where infestation exceeds 20% of plants.",
    },
    {
        "alert_id": _sid("alert", 3),
        "farm_id": _sid("farm", 2),
        "actor_id": ACTOR_FARMER,
        "alert_type": "heavy_rainfall",
        "severity": "medium",
        "precedence_rank": 2,
        "headline": "Heavy rainfall forecast for Ejisu-Juaben tomato plots",
        "detail": "50-70mm rainfall expected over the next 48 hours. Ensure drainage channels are clear to prevent waterlogging and fruit rot.",
    },
    {
        "alert_id": _sid("alert", 4),
        "farm_id": _sid("farm", 3),
        "actor_id": ACTOR_COOP,
        "alert_type": "temperature_anomaly",
        "severity": "low",
        "precedence_rank": 3,
        "headline": "Elevated temperatures in cocoa growing zone",
        "detail": "Daytime temperatures have exceeded 35C for 5 consecutive days. Monitor cocoa canopy stress and consider temporary shade netting for young trees.",
    },
    {
        "alert_id": _sid("alert", 5),
        "farm_id": _sid("farm", 1),
        "actor_id": ACTOR_FARMER,
        "alert_type": "soil_moisture_low",
        "severity": "medium",
        "precedence_rank": 2,
        "headline": "Soil moisture below optimal for maize tasseling",
        "detail": "Current soil moisture at 22%, below the 30% recommended for maize tasseling stage. Irrigation or rainfall needed within 5 days.",
    },
    {
        "alert_id": _sid("alert", 6),
        "farm_id": _sid("farm", 2),
        "actor_id": ACTOR_FARMER,
        "alert_type": "disease_risk",
        "severity": "high",
        "precedence_rank": 1,
        "headline": "Late blight risk elevated for tomatoes",
        "detail": "Combination of high humidity and moderate temperatures creates ideal conditions for Phytophthora infestans. Apply preventive copper-based fungicide.",
    },
    {
        "alert_id": _sid("alert", 7),
        "farm_id": _sid("farm", 3),
        "actor_id": ACTOR_COOP,
        "alert_type": "wind_advisory",
        "severity": "low",
        "precedence_rank": 4,
        "headline": "Gusty harmattan winds forecasted for cocoa region",
        "detail": "Wind speeds up to 40 km/h expected. Secure drying platforms and protect young seedlings from desiccation.",
    },
    {
        "alert_id": _sid("alert", 8),
        "farm_id": _sid("farm", 1),
        "actor_id": ACTOR_FARMER,
        "alert_type": "flood_warning",
        "severity": "critical",
        "precedence_rank": 0,
        "headline": "Flash flood alert for low-lying maize fields",
        "detail": "Dam spillage upstream may cause flash flooding in the next 12 hours. Move harvested grain to higher ground immediately.",
    },
    {
        "alert_id": _sid("alert", 9),
        "farm_id": _sid("farm", 2),
        "actor_id": ACTOR_FARMER,
        "alert_type": "frost_risk",
        "severity": "info",
        "precedence_rank": 5,
        "headline": "Unusual cool spell advisory - Ejisu area",
        "detail": "Night temperatures may dip to 14C, unusual for the region. No immediate crop risk, but monitor sensitive seedlings.",
    },
    {
        "alert_id": _sid("alert", 10),
        "farm_id": _sid("farm", 3),
        "actor_id": ACTOR_COOP,
        "alert_type": "rainfall_surplus",
        "severity": "medium",
        "precedence_rank": 2,
        "headline": "Above-normal rainfall in cocoa zone may cause black pod",
        "detail": "Cumulative rainfall 30% above seasonal average. Black pod disease risk elevated. Apply recommended fungicide and improve canopy aeration through pruning.",
    },
]


def seed_climate(session: Session) -> None:
    LOGGER.info("seed_demo.climate.start")
    climate_repo = ClimateRepository(session)

    for fp in FARM_PROFILES:
        climate_repo.upsert_farm_profile(
            farm_id=fp["farm_id"],
            actor_id=fp["actor_id"],
            country_code="GH",
            farm_name=fp["farm_name"],
            district=fp["district"],
            crop_type=fp["crop_type"],
            hectares=fp["hectares"],
            latitude=fp["latitude"],
            longitude=fp["longitude"],
            metadata_json={"seeded": True},
        )

    created = 0
    for data in CLIMATE_ALERTS:
        aid = data["alert_id"]
        if _exists(session, ClimateAlert, "alert_id", aid):
            continue
        climate_repo.create_alert(
            alert_id=aid,
            farm_id=data["farm_id"],
            actor_id=data["actor_id"],
            country_code="GH",
            observation_id=None,
            alert_type=data["alert_type"],
            severity=data["severity"],
            precedence_rank=data["precedence_rank"],
            headline=data["headline"],
            detail=data["detail"],
            source_confidence="high",
            degraded_mode=False,
            degraded_reason_codes=[],
            farm_context={"seeded": True, "crop": data["farm_id"]},
        )
        created += 1
    session.flush()
    LOGGER.info("seed_demo.climate.done created=%d", created)


# ── 6. Advisory conversations (5) ───────────────────────────────────────────
ADVISORY_CONVERSATIONS = [
    {
        "advisory_request_id": _sid("advisory", 1),
        "conversation_id": _sid("adv-conv", 1),
        "actor_id": ACTOR_FARMER,
        "topic": "pest_management",
        "question": "How do I identify and manage fall armyworm in my maize field?",
        "response": "Fall armyworm larvae are greyish-green with dark stripes and an inverted Y on the head. Scout your field early morning when larvae are active. For fields with less than 20% infestation, use biological controls such as Bacillus thuringiensis (Bt). For heavier infestations, consult your local extension officer for approved insecticide options. Always follow the recommended application rates and pre-harvest intervals.",
        "source_ids": ["src-gh-fall-armyworm-001"],
        "confidence": 0.88,
    },
    {
        "advisory_request_id": _sid("advisory", 2),
        "conversation_id": _sid("adv-conv", 1),
        "actor_id": ACTOR_FARMER,
        "topic": "pest_management",
        "question": "What is the best time to spray for armyworm?",
        "response": "The most effective time to spray is in the early morning or late evening when larvae are feeding on leaf surfaces. Avoid spraying during the heat of the day as efficacy drops and beneficial insects are more active. Target applications when larvae are in the 1st-3rd instar (small) for maximum effectiveness.",
        "source_ids": ["src-gh-fall-armyworm-001"],
        "confidence": 0.82,
    },
    {
        "advisory_request_id": _sid("advisory", 3),
        "conversation_id": _sid("adv-conv", 2),
        "actor_id": ACTOR_FARMER,
        "topic": "soil_management",
        "question": "My maize is showing drought stress during tasseling. What should I do?",
        "response": "Drought stress at tasseling is critical as it directly affects pollination and grain fill. If irrigation is available, apply 25-30mm immediately. Otherwise, maintain residue cover around plants to conserve soil moisture. Delay any planned top-dressing until moisture conditions improve, as dry soil prevents nutrient uptake.",
        "source_ids": ["src-gh-soil-moisture-001"],
        "confidence": 0.91,
    },
    {
        "advisory_request_id": _sid("advisory", 4),
        "conversation_id": _sid("adv-conv", 3),
        "actor_id": ACTOR_COOP,
        "topic": "post_harvest",
        "question": "How should our cooperative store cocoa beans to maintain grade quality?",
        "response": "Store cocoa beans at moisture content below 7.5% in clean, dry, well-ventilated warehouses on raised platforms (at least 10cm from the floor). Use jute sacks rather than polypropylene. Stack bags no more than 10 high and leave space between stacks for air circulation. Inspect weekly for mould, insect activity, or moisture re-absorption. Keep written records of lot origin and quality checks for traceability.",
        "source_ids": [],
        "confidence": 0.75,
    },
    {
        "advisory_request_id": _sid("advisory", 5),
        "conversation_id": _sid("adv-conv", 4),
        "actor_id": ACTOR_ADVISOR,
        "topic": "climate_adaptation",
        "question": "What climate-smart practices should I recommend to smallholders in Western Region?",
        "response": "Recommend a combination of: (1) Intercropping with nitrogen-fixing legumes to improve soil fertility and provide income diversification, (2) Mulching and minimum tillage to conserve soil moisture, (3) Planting improved drought-tolerant varieties where available, (4) Establishing farm-level water harvesting through small bunds or half-moon structures, (5) Joining cooperative weather alert subscriptions for timely early warnings.",
        "source_ids": ["src-gh-soil-moisture-001"],
        "confidence": 0.85,
    },
]


def seed_advisory(session: Session) -> None:
    LOGGER.info("seed_demo.advisory.start")
    advisory_repo = AdvisoryRepository(session)
    created = 0
    for data in ADVISORY_CONVERSATIONS:
        arid = data["advisory_request_id"]
        if _exists(session, AdvisoryRequestRecord, "advisory_request_id", arid):
            continue
        advisory_repo.create_request(
            advisory_request_id=arid,
            advisory_conversation_id=data["conversation_id"],
            request_id=f"req-{uuid4().hex[:12]}",
            actor_id=data["actor_id"],
            country_code="GH",
            locale="en-GH",
            channel="pwa",
            topic=data["topic"],
            question_text=data["question"],
            response_text=data["response"],
            status="delivered",
            confidence_band="high" if data["confidence"] >= 0.8 else "medium",
            confidence_score=data["confidence"],
            grounded=len(data["source_ids"]) > 0,
            source_ids=data["source_ids"],
            transcript_entries=[
                {"role": "user", "content": data["question"]},
                {"role": "assistant", "content": data["response"]},
            ],
            policy_context={"country_code": "GH", "seeded": True},
            model_name="agrodomain-advisory-v1",
            model_version="1.0.0",
            correlation_id=f"corr-{uuid4().hex[:12]}",
            delivered_at=NOW,
        )
        created += 1
    session.flush()
    LOGGER.info("seed_demo.advisory.done created=%d", created)


# ── 7. Traceability consignments (3) ────────────────────────────────────────
CONSIGNMENT_DATA = [
    {
        "consignment_id": _sid("consign", 1),
        "actor_id": ACTOR_FARMER,
        "partner_ref": "PO-2026-0451",
        "milestones": ["harvested", "handoff_confirmed", "dispatched", "delivered"],
    },
    {
        "consignment_id": _sid("consign", 2),
        "actor_id": ACTOR_COOP,
        "partner_ref": "PO-2026-0452",
        "milestones": ["harvested", "handoff_confirmed", "dispatched"],
    },
    {
        "consignment_id": _sid("consign", 3),
        "actor_id": ACTOR_FARMER,
        "partner_ref": "PO-2026-0453",
        "milestones": ["harvested", "handoff_confirmed"],
    },
]


def seed_traceability(session: Session) -> None:
    LOGGER.info("seed_demo.traceability.start")
    trace_repo = TraceabilityRepository(session)
    created = 0
    for data in CONSIGNMENT_DATA:
        cid = data["consignment_id"]
        if _exists(session, ConsignmentRecord, "consignment_id", cid):
            continue
        corr_id = f"corr-{uuid4().hex[:12]}"
        consignment = ConsignmentRecord(
            consignment_id=cid,
            actor_id=data["actor_id"],
            country_code="GH",
            partner_reference_id=data["partner_ref"],
            status="draft",
            current_custody_actor_id=data["actor_id"],
            correlation_id=corr_id,
        )
        session.add(consignment)
        session.flush()

        prev_ref: str | None = None
        base_time = NOW - timedelta(days=len(data["milestones"]))
        for i, milestone in enumerate(data["milestones"]):
            event_ref = f"ref-{cid}-{milestone}-{i}"
            idem_key = f"seed-trace-{cid}-{milestone}"
            req_id = f"req-{uuid4().hex[:12]}"
            occurred = base_time + timedelta(days=i, hours=i * 3)
            custody_actor = ACTOR_BUYER if milestone in ("dispatched", "delivered") else data["actor_id"]
            trace_repo.append_event(
                consignment=consignment,
                request_id=req_id,
                idempotency_key=idem_key,
                actor_id=data["actor_id"],
                actor_role="farmer" if data["actor_id"] == ACTOR_FARMER else "cooperative_manager",
                country_code="GH",
                correlation_id=corr_id,
                causation_id=None,
                milestone=milestone,
                event_reference=event_ref,
                previous_event_reference=prev_ref,
                occurred_at=occurred,
                current_custody_actor_id=custody_actor,
            )
            prev_ref = event_ref
        created += 1
    session.flush()
    LOGGER.info("seed_demo.traceability.done created=%d", created)


# ── 8. Audit events (20) ────────────────────────────────────────────────────
AUDIT_EVENTS = [
    {"actor": ACTOR_ADMIN, "event_type": "identity.session.sign_in", "command": "identity.session.sign_in", "status": "success"},
    {"actor": ACTOR_FARMER, "event_type": "identity.session.sign_in", "command": "identity.session.sign_in", "status": "success"},
    {"actor": ACTOR_BUYER, "event_type": "identity.session.sign_in", "command": "identity.session.sign_in", "status": "success"},
    {"actor": ACTOR_FARMER, "event_type": "marketplace.listing.created", "command": "marketplace.listing.create", "status": "success"},
    {"actor": ACTOR_FARMER, "event_type": "marketplace.listing.published", "command": "marketplace.listing.publish", "status": "success"},
    {"actor": ACTOR_COOP, "event_type": "marketplace.listing.created", "command": "marketplace.listing.create", "status": "success"},
    {"actor": ACTOR_BUYER, "event_type": "marketplace.negotiation.offer_created", "command": "marketplace.negotiation.create", "status": "success"},
    {"actor": ACTOR_FARMER, "event_type": "marketplace.negotiation.accepted", "command": "marketplace.negotiation.accept", "status": "success"},
    {"actor": ACTOR_BUYER, "event_type": "ledger.escrow.initiated", "command": "ledger.escrow.initiate", "status": "success"},
    {"actor": ACTOR_BUYER, "event_type": "ledger.escrow.funded", "command": "ledger.escrow.fund", "status": "success"},
    {"actor": ACTOR_FARMER, "event_type": "ledger.escrow.released", "command": "ledger.escrow.release", "status": "success"},
    {"actor": ACTOR_FARMER, "event_type": "climate.alert.created", "command": "climate.alert.ingest", "status": "success"},
    {"actor": ACTOR_FARMER, "event_type": "climate.alert.acknowledged", "command": "climate.alert.acknowledge", "status": "success"},
    {"actor": ACTOR_FARMER, "event_type": "advisory.request.submitted", "command": "advisory.ask", "status": "success"},
    {"actor": ACTOR_FARMER, "event_type": "advisory.request.delivered", "command": "advisory.deliver", "status": "success"},
    {"actor": ACTOR_FARMER, "event_type": "traceability.event.appended", "command": "traceability.event.append", "status": "success"},
    {"actor": ACTOR_COOP, "event_type": "traceability.event.appended", "command": "traceability.event.append", "status": "success"},
    {"actor": None, "event_type": "command.rejected", "command": "marketplace.listing.create", "status": "rejected", "reason": "unauthorized_mutation"},
    {"actor": ACTOR_FINANCE, "event_type": "finance.request.submitted", "command": "finance.request.submit", "status": "success"},
    {"actor": ACTOR_ADVISOR, "event_type": "advisory.review.submitted", "command": "advisory.review.submit", "status": "success"},
]


def seed_audit(session: Session) -> None:
    LOGGER.info("seed_demo.audit.start")
    audit_repo = AuditRepository(session)
    # Simple idempotency: check if we already have 20+ seeded events
    stmt = select(AuditEvent).where(
        AuditEvent.correlation_id == "seed-demo-audit"
    )
    existing_count = len(list(session.execute(stmt).scalars().all()))
    if existing_count >= len(AUDIT_EVENTS):
        LOGGER.info("seed_demo.audit.skip already_seeded=%d", existing_count)
        return

    for i, data in enumerate(AUDIT_EVENTS):
        audit_repo.record_event(
            request_id=f"req-seed-audit-{i:03d}",
            actor_id=data["actor"],
            event_type=data["event_type"],
            command_name=data["command"],
            status=data["status"],
            reason_code=data.get("reason"),
            schema_version="1.0",
            idempotency_key=f"seed-audit-{i:03d}",
            payload={"seeded": True, "index": i},
            correlation_id="seed-demo-audit",
        )
    session.flush()
    LOGGER.info("seed_demo.audit.done created=%d", len(AUDIT_EVENTS))


# ── orchestrator ─────────────────────────────────────────────────────────────
def run_demo_seed(session: Session) -> None:
    """Run the complete demo seed in order of domain dependency."""
    LOGGER.info("seed_demo.start")
    seed_users(session)
    seed_listings(session)
    seed_negotiations(session)
    seed_escrows(session)
    seed_climate(session)
    seed_advisory(session)
    seed_traceability(session)
    seed_audit(session)
    LOGGER.info("seed_demo.finish")


# ── CLI entry point ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    import os
    import time

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
    )

    # Allow working directory to be apps/api or project root
    api_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if os.path.basename(api_dir) == "api":
        os.chdir(api_dir)

    from app.core.config import get_settings
    from app.core.db import get_engine, get_session_factory
    from app.db.base import TARGET_METADATA

    settings = get_settings()
    LOGGER.info("database_url=%s", settings.database_url)

    # Ensure all tables exist (create if needed)
    engine = get_engine(settings.database_url)
    for metadata in TARGET_METADATA:
        metadata.create_all(engine)

    start = time.monotonic()
    with get_session_factory(settings.database_url)() as session:
        # Run the base seed first (country policies, workflow defs, etc.)
        from app.db.migrations.seed import run_seed

        run_seed(session)
        session.flush()

        # Then run the demo seed
        run_demo_seed(session)
        session.commit()

    elapsed = time.monotonic() - start
    LOGGER.info("seed_demo.complete elapsed=%.2fs", elapsed)
    print(f"Demo seed completed in {elapsed:.2f}s")
    sys.exit(0)
