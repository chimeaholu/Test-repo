from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.admin import router as admin_router
from app.api.routes.advisory import router as advisory_router
from app.api.routes.audit import router as audit_router
from app.api.routes.climate import router as climate_router
from app.api.routes.commands import router as command_router
from app.api.routes.identity import router as identity_router
from app.api.routes.marketplace import router as marketplace_router
from app.api.routes.notifications import router as notifications_router
from app.api.routes.system import router as system_router
from app.api.routes.traceability import router as traceability_router
from app.api.routes.wallet import router as wallet_router
from app.core.config import Settings, get_settings
from app.core.logging import configure_logging
from app.core.request_context import RequestContextMiddleware
from app.core.telemetry import TelemetryService


def create_app(settings: Settings | None = None) -> FastAPI:
    active_settings = settings or get_settings()
    configure_logging(active_settings.log_level)

    app = FastAPI(
        title=active_settings.app_name,
        version=active_settings.app_version,
        docs_url="/docs",
        redoc_url="/redoc",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=active_settings.cors_allowed_origins,
        allow_origin_regex=active_settings.cors_allowed_origin_regex,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.state.settings = active_settings
    app.state.telemetry = TelemetryService()
    app.add_middleware(RequestContextMiddleware)
    app.include_router(system_router)
    app.include_router(admin_router)
    app.include_router(identity_router)
    app.include_router(marketplace_router)
    app.include_router(advisory_router)
    app.include_router(audit_router)
    app.include_router(climate_router)
    app.include_router(traceability_router)
    app.include_router(command_router)
    app.include_router(wallet_router)
    app.include_router(notifications_router)
    return app
