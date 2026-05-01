from __future__ import annotations

import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool, text

from app.db.base import TARGET_METADATA
from app.db.models import (  # noqa: F401
    advisory,
    audit,
    climate,
    fund,
    ledger,
    marketplace,
    platform,
    transport,
    workflow,
)

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)


target_metadata = TARGET_METADATA


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    schema_name = os.getenv("AGRO_API_DATABASE_SCHEMA")
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        if schema_name:
            safe_schema_name = '"' + schema_name.replace('"', '""') + '"'
            connection.execute(text(f"CREATE SCHEMA IF NOT EXISTS {safe_schema_name}"))
            connection.execute(text(f"SET search_path TO {safe_schema_name}"))
            connection.commit()

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            version_table_schema=schema_name,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
