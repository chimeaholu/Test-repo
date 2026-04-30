from functools import lru_cache

from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings, get_settings


def _normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    return database_url


def _quoted_schema_name(schema_name: str) -> str:
    return '"' + schema_name.replace('"', '""') + '"'


def _engine_kwargs(database_url: str, settings: Settings) -> dict[str, object]:
    if database_url.startswith("sqlite"):
        return {
            "connect_args": {
                "check_same_thread": False,
                "timeout": 30,
            }
        }
    return {
        "pool_pre_ping": True,
        "pool_size": settings.database_pool_size,
        "max_overflow": settings.database_max_overflow,
        "pool_timeout": settings.database_pool_timeout_seconds,
        "pool_recycle": settings.database_pool_recycle_seconds,
        "pool_use_lifo": True,
    }


@lru_cache(maxsize=4)
def get_engine(database_url: str | None = None) -> Engine:
    settings = get_settings()
    url = _normalize_database_url(database_url or settings.database_url)
    engine = create_engine(url, future=True, **_engine_kwargs(url, settings))
    if url.startswith("sqlite"):
        @event.listens_for(engine, "connect")
        def _configure_sqlite_connection(dbapi_connection, _connection_record) -> None:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA temp_store=MEMORY")
            cursor.execute("PRAGMA cache_size=-65536")
            cursor.execute("PRAGMA mmap_size=268435456")
            cursor.execute("PRAGMA wal_autocheckpoint=10000")
            cursor.execute("PRAGMA journal_size_limit=134217728")
            cursor.close()
    elif settings.database_schema:
        schema_name = _quoted_schema_name(settings.database_schema)

        @event.listens_for(engine, "checkout")
        def _configure_non_sqlite_schema(
            dbapi_connection, _connection_record, _connection_proxy
        ) -> None:
            cursor = dbapi_connection.cursor()
            cursor.execute(f"SET search_path TO {schema_name}")
            cursor.close()
    return engine


@lru_cache(maxsize=4)
def get_session_factory(database_url: str | None = None) -> sessionmaker[Session]:
    return sessionmaker(
        bind=get_engine(database_url),
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
        future=True,
        class_=Session,
    )


def check_database_health(settings: Settings) -> bool:
    with get_engine(settings.database_url).connect() as connection:
        connection.execute(text("SELECT 1"))
    return True


def clear_db_caches() -> None:
    get_engine.cache_clear()
    get_session_factory.cache_clear()
