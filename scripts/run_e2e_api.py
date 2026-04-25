from __future__ import annotations

import os
from pathlib import Path
import sys

from alembic import command
from alembic.config import Config
import uvicorn

APP_ROOT = Path(__file__).resolve().parents[1] / "apps" / "api"
if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

from app.core.db import clear_db_caches, get_session_factory
from app.db.migrations.seed import run_seed


def prepare_database(database_url: str) -> None:
    database_path = os.environ.get("AGRO_E2E_DATABASE_PATH")
    if database_path:
        db_file = Path(database_path)
        db_file.parent.mkdir(parents=True, exist_ok=True)
        if db_file.exists():
            db_file.unlink()

    clear_db_caches()

    config = Config(str(APP_ROOT / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", database_url)
    config.set_main_option("script_location", str(APP_ROOT / "app" / "db" / "migrations"))
    command.upgrade(config, "head")

    with get_session_factory(database_url)() as session:
        run_seed(session)
        session.commit()


def main() -> None:
    database_url = os.environ.get("AGRO_API_DATABASE_URL", "sqlite:////tmp/agrodomain-e2e.db")
    prepare_database(database_url)

    host = os.environ.get("AGRO_E2E_API_HOST", "127.0.0.1")
    port = int(os.environ.get("AGRO_E2E_API_PORT", "8000"))

    uvicorn.run("app.main:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    main()
