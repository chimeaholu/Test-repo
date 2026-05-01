from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy.exc import SQLAlchemyError

from app.api.dependencies.request_context import (
    get_active_settings,
    get_request_id,
)
from app.core.config import Settings
from app.core.db import check_database_health

router = APIRouter(tags=["system"])


@router.get("/healthz")
def healthcheck(request_id: str = Depends(get_request_id)) -> dict[str, str]:
    return {"status": "ok", "service": "apps/api", "request_id": request_id}


@router.get("/readyz")
def readiness(settings: Settings = Depends(get_active_settings)) -> dict[str, str]:
    try:
        check_database_health(settings)
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail="database_unavailable") from exc
    return {"status": "ready", "database": "ok"}


@router.get("/api/v1/system/settings")
def public_settings(
    request: Request, settings: Settings = Depends(get_active_settings)
) -> dict[str, str]:
    return {
        "app_name": settings.app_name,
        "environment": settings.environment,
        "schema_version": settings.public_schema_version,
        "request_id": request.state.request_id,
    }


@router.get("/metrics")
def metrics(
    request: Request,
    settings: Settings = Depends(get_active_settings),
) -> Response:
    if not settings.metrics_enabled:
        raise HTTPException(status_code=404, detail="metrics_disabled")
    return Response(
        content=request.app.state.telemetry.render_metrics(settings),
        media_type=request.app.state.telemetry.metrics_content_type,
        headers={"Cache-Control": "no-store"},
    )
