import sys
from collections.abc import Generator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

APP_ROOT = Path(__file__).resolve().parents[1]

if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

from app.core.application import create_app
from app.core.config import Settings, clear_settings_cache
from app.core.contracts_catalog import get_envelope_schema_version
from app.core.db import clear_db_caches, get_session_factory
from app.db.migrations.seed import run_seed


def build_settings(database_url: str) -> Settings:
    schema_version = get_envelope_schema_version()
    clear_settings_cache()
    clear_db_caches()
    return Settings(
        database_url=database_url,
        environment="test",
        log_level="DEBUG",
        api_tokens={"test-token": "system:test"},
        allowed_schema_versions=[schema_version],
        public_schema_version=schema_version,
    )


def build_alembic_config(database_url: str) -> Config:
    config = Config(str(APP_ROOT / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", database_url)
    config.set_main_option("script_location", str(APP_ROOT / "app" / "db" / "migrations"))
    return config


@pytest.fixture()
def database_url(tmp_path: Path) -> str:
    return f"sqlite:///{tmp_path / 'agrodomain-test.db'}"


@pytest.fixture()
def migrated_database(database_url: str) -> str:
    config = build_alembic_config(database_url)
    command.upgrade(config, "head")
    return database_url


@pytest.fixture()
def seeded_database(migrated_database: str) -> str:
    with get_session_factory(migrated_database)() as session:
        run_seed(session)
        session.commit()
    return migrated_database


@pytest.fixture()
def client(seeded_database: str) -> TestClient:
    app = create_app(build_settings(seeded_database))
    return TestClient(app)


@pytest.fixture()
def session(seeded_database: str) -> Generator[Session, None, None]:
    with get_session_factory(seeded_database)() as db_session:
        yield db_session
