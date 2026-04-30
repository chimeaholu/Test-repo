"""load read-path indexes for r8 performance remediation"""

import logging

from alembic import op

revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None

LOGGER = logging.getLogger("agrodomain.api.migrations")


def upgrade() -> None:
    LOGGER.info("migration.upgrade revision=0015")
    op.execute(
        """
        CREATE INDEX ix_listings_published_feed
        ON listings(country_code, status, published_at DESC, updated_at DESC, id DESC)
        WHERE published_revision_number IS NOT NULL
        """
    )
    op.execute(
        """
        CREATE INDEX ix_negotiation_threads_seller_feed
        ON negotiation_threads(country_code, seller_actor_id, updated_at DESC, id DESC)
        """
    )
    op.execute(
        """
        CREATE INDEX ix_negotiation_threads_buyer_feed
        ON negotiation_threads(country_code, buyer_actor_id, updated_at DESC, id DESC)
        """
    )
    op.execute(
        """
        CREATE INDEX ix_negotiation_messages_thread_created
        ON negotiation_messages(thread_id, created_at ASC, id ASC)
        """
    )
    op.execute(
        """
        CREATE INDEX ix_farm_profiles_actor_country_updated
        ON farm_profiles(actor_id, country_code, updated_at DESC, id DESC)
        """
    )
    op.execute(
        """
        CREATE INDEX ix_farm_fields_farm_created
        ON farm_fields(farm_id, created_at ASC, id ASC)
        """
    )
    op.execute(
        """
        CREATE INDEX ix_farm_activities_farm_activity_date
        ON farm_activities(farm_id, activity_date DESC, id DESC)
        """
    )
    op.execute(
        """
        CREATE INDEX ix_farm_inputs_farm_purchase_date
        ON farm_inputs(farm_id, purchase_date DESC, id DESC)
        """
    )
    op.execute(
        """
        CREATE INDEX ix_crop_cycles_farm_planting_date
        ON crop_cycles(farm_id, planting_date DESC, id DESC)
        """
    )
    op.execute(
        """
        CREATE INDEX ix_climate_alerts_actor_country_created
        ON climate_alerts(actor_id, country_code, created_at DESC, id DESC)
        """
    )
    op.execute(
        """
        CREATE INDEX ix_climate_observations_farm_observed
        ON climate_observations(farm_id, observed_at DESC, id DESC)
        """
    )
    op.execute(
        """
        CREATE INDEX ix_mrv_evidence_records_actor_country_created
        ON mrv_evidence_records(actor_id, country_code, created_at DESC, id DESC)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_mrv_evidence_records_actor_country_created")
    op.execute("DROP INDEX IF EXISTS ix_climate_observations_farm_observed")
    op.execute("DROP INDEX IF EXISTS ix_climate_alerts_actor_country_created")
    op.execute("DROP INDEX IF EXISTS ix_crop_cycles_farm_planting_date")
    op.execute("DROP INDEX IF EXISTS ix_farm_inputs_farm_purchase_date")
    op.execute("DROP INDEX IF EXISTS ix_farm_activities_farm_activity_date")
    op.execute("DROP INDEX IF EXISTS ix_farm_fields_farm_created")
    op.execute("DROP INDEX IF EXISTS ix_farm_profiles_actor_country_updated")
    op.execute("DROP INDEX IF EXISTS ix_negotiation_messages_thread_created")
    op.execute("DROP INDEX IF EXISTS ix_negotiation_threads_buyer_feed")
    op.execute("DROP INDEX IF EXISTS ix_negotiation_threads_seller_feed")
    op.execute("DROP INDEX IF EXISTS ix_listings_published_feed")
