from collections.abc import Generator

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.db import get_session_factory


def get_request_id(request: Request) -> str:
    return request.state.request_id


def get_correlation_id(request: Request) -> str:
    return request.state.correlation_id


def get_active_settings(request: Request) -> Settings:
    return getattr(request.app.state, "settings", get_settings())


def get_session(
    request: Request, settings: Settings = Depends(get_active_settings)
) -> Generator[Session, None, None]:
    session = get_session_factory(settings.database_url)()
    try:
        yield session
    finally:
        session.close()
