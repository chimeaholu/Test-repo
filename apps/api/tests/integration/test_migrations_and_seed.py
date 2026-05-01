from sqlalchemy import create_engine, func, inspect, select
from sqlalchemy.orm import Session

from app.db.migrations.seed import run_seed
from app.db.models.platform import ConsentRecord, CountryPolicy, IdentityMembership
from app.db.models.workflow import WorkflowDefinition


def test_clean_migration_cycle_creates_expected_tables(migrated_database) -> None:
    inspector = inspect(create_engine(migrated_database, future=True))
    table_names = set(inspector.get_table_names())

    assert {
        "country_policies",
        "identity_memberships",
        "identity_accounts",
        "identity_password_credentials",
        "identity_magic_link_challenges",
        "consent_records",
        "identity_sessions",
        "listings",
        "listing_revisions",
        "negotiation_threads",
        "negotiation_messages",
        "workflow_definitions",
        "workflow_executions",
        "command_receipts",
        "audit_events",
        "outbox_messages",
        "partner_boundary_deliveries",
        "partner_inbound_records",
        "agro_intelligence_consent_artifacts",
        "agro_intelligence_entities",
        "agro_intelligence_source_documents",
        "agro_intelligence_relationships",
        "agro_intelligence_verification_claims",
        "agro_intelligence_freshness_signals",
        "funding_opportunities",
        "investments",
        "farm_fields",
        "farm_activities",
        "farm_inputs",
        "crop_cycles",
        "transport_loads",
        "transport_shipments",
        "transport_shipment_events",
    }.issubset(table_names)


def test_seed_replay_is_idempotent(seeded_database) -> None:
    engine = create_engine(seeded_database, future=True)
    with Session(engine) as session:
        run_seed(session)
        session.commit()

        assert session.execute(select(func.count()).select_from(CountryPolicy)).scalar_one() == 2
        assert session.execute(select(func.count()).select_from(IdentityMembership)).scalar_one() == 1
        assert session.execute(select(func.count()).select_from(ConsentRecord)).scalar_one() == 1
        assert session.execute(select(func.count()).select_from(WorkflowDefinition)).scalar_one() == 1
