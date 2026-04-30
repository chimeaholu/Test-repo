import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.repositories.advisory import AdvisoryRepository
from app.db.models.platform import ConsentRecord, CountryPolicy, IdentityMembership
from app.db.models.workflow import WorkflowDefinition

LOGGER = logging.getLogger("agrodomain.api.seed")


def run_seed(session: Session) -> None:
    LOGGER.info("seed.start revision=seed-0001")

    _upsert_country_policy(
        session,
        country_code="GH",
        locale="en-GH",
        legal_basis="consent_required",
        policy_version="2026.04",
    )
    _upsert_country_policy(
        session,
        country_code="NG",
        locale="en-NG",
        legal_basis="consent_required",
        policy_version="2026.04",
    )

    _upsert_membership(
        session,
        actor_id="system:test",
        role="admin",
        country_code="GH",
    )
    _upsert_consent(
        session,
        actor_id="system:test",
        consent_type="regulated_mutation",
        policy_version="2026.04",
        country_code="GH",
    )
    _upsert_workflow_definition(
        session,
        key="workflow.command.dispatch",
        description="Generic command bus entry point.",
    )
    _seed_advisory_sources(session)

    LOGGER.info("seed.finish revision=seed-0001")


def _upsert_country_policy(
    session: Session,
    *,
    country_code: str,
    locale: str,
    legal_basis: str,
    policy_version: str,
) -> None:
    record = session.get(CountryPolicy, country_code)
    if record is None:
        session.add(
            CountryPolicy(
                country_code=country_code,
                locale=locale,
                legal_basis=legal_basis,
                policy_version=policy_version,
                metadata_json={"seeded": True},
            )
        )
        return

    record.locale = locale
    record.legal_basis = legal_basis
    record.policy_version = policy_version
    record.metadata_json = {"seeded": True}


def _upsert_membership(
    session: Session, *, actor_id: str, role: str, country_code: str
) -> None:
    statement = select(IdentityMembership).where(
        IdentityMembership.actor_id == actor_id,
        IdentityMembership.role == role,
    )
    record = session.execute(statement).scalar_one_or_none()
    if record is None:
        session.add(
            IdentityMembership(
                actor_id=actor_id,
                role=role,
                country_code=country_code,
                provenance={"seeded": True},
            )
        )
        return

    record.country_code = country_code
    record.provenance = {"seeded": True}


def _upsert_consent(
    session: Session,
    *,
    actor_id: str,
    consent_type: str,
    policy_version: str,
    country_code: str,
) -> None:
    statement = select(ConsentRecord).where(
        ConsentRecord.actor_id == actor_id,
        ConsentRecord.consent_type == consent_type,
        ConsentRecord.policy_version == policy_version,
    )
    record = session.execute(statement).scalar_one_or_none()
    if record is None:
        session.add(
            ConsentRecord(
                actor_id=actor_id,
                consent_type=consent_type,
                status="granted",
                policy_version=policy_version,
                country_code=country_code,
            )
        )
        return

    record.status = "granted"
    record.country_code = country_code


def _upsert_workflow_definition(
    session: Session, *, key: str, description: str
) -> None:
    record = session.get(WorkflowDefinition, key)
    if record is None:
        session.add(
            WorkflowDefinition(key=key, description=description, state="active")
        )
        return

    record.description = description
    record.state = "active"


def _seed_advisory_sources(session: Session) -> None:
    repository = AdvisoryRepository(session)
    repository.upsert_source_document(
        source_id="src-gh-fall-armyworm-001",
        country_code="GH",
        locale="en-GH",
        source_type="extension",
        title="Ghana maize fall armyworm extension bulletin",
        summary="Scout maize twice weekly, isolate hotspot treatment, and record pressure by field block before spraying.",
        body_markdown=(
            "Scout maize twice weekly, prioritize early-stage fields, and isolate hotspot treatment based on extension officer guidance."
        ),
        citation_url="https://example.com/ghana/fall-armyworm-bulletin",
        method_tag="extension_bulletin",
        risk_tags=["pesticide", "spray"],
        source_metadata={"seeded": True},
        priority=5,
        vetted=True,
        published_at=datetime.fromisoformat("2026-04-10T00:00:00+00:00"),
    )
    repository.upsert_source_document(
        source_id="src-gh-soil-moisture-001",
        country_code="GH",
        locale="en-GH",
        source_type="manual",
        title="Northern Region soil moisture planting guidance",
        summary="Delay top dressing on drought-stressed maize, preserve residue cover, and confirm moisture before replanting weak pockets.",
        body_markdown=(
            "Preserve residue cover, delay top dressing until moisture improves, and confirm soil moisture before replanting weak pockets."
        ),
        citation_url="https://example.com/ghana/soil-moisture-guidance",
        method_tag="field_manual",
        risk_tags=["drought"],
        source_metadata={"seeded": True},
        priority=4,
        vetted=True,
        published_at=datetime.fromisoformat("2026-04-08T00:00:00+00:00"),
    )
    repository.upsert_source_document(
        source_id="src-ng-rice-flood-001",
        country_code="NG",
        locale="en-NG",
        source_type="weather",
        title="Nigeria rice flood preparedness advisory",
        summary="Move inputs to higher ground, clear drainage channels, and document flood exposure for cooperative follow-up.",
        body_markdown=(
            "Move stored inputs to higher ground, clear drainage channels, and document flood exposure to support cooperative response planning."
        ),
        citation_url="https://example.com/nigeria/rice-flood-guidance",
        method_tag="weather_bulletin",
        risk_tags=["flood"],
        source_metadata={"seeded": True},
        priority=4,
        vetted=True,
        published_at=datetime.fromisoformat("2026-04-09T00:00:00+00:00"),
    )


if __name__ == "__main__":
    from app.core.config import get_settings
    from app.core.db import get_session_factory

    settings = get_settings()
    with get_session_factory(settings.database_url)() as session:
        run_seed(session)
        session.commit()
