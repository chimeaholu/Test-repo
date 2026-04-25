from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.advisory import router as advisory_router
from app.api.routes.audit import router as audit_router
from app.api.routes.climate import router as climate_router
from app.api.routes.commands import router as command_router
from app.api.routes.farm import router as farm_router
from app.api.routes.fund import router as fund_router
from app.api.routes.identity import router as identity_router
from app.api.routes.marketplace import router as marketplace_router
from app.api.routes.preview import router as preview_router
from app.api.routes.system import router as system_router
from app.api.routes.transport import router as transport_router
from app.api.routes.wallet import router as wallet_router
from app.core.config import Settings, get_settings
from app.core.logging import configure_logging
from app.core.request_context import RequestContextMiddleware
from app.core.security import SecurityHeadersMiddleware
from app.core.telemetry import TelemetryService


def create_app(settings: Settings | None = None) -> FastAPI:
    active_settings = settings or get_settings()
    configure_logging(active_settings.log_level)

    app = FastAPI(
        title=active_settings.app_name,
        version=active_settings.app_version,
        docs_url="/docs" if active_settings.api_docs_enabled() else None,
        redoc_url="/redoc" if active_settings.api_docs_enabled() else None,
        openapi_url="/openapi.json" if active_settings.api_docs_enabled() else None,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=active_settings.cors_allowed_origins,
        allow_origin_regex=active_settings.cors_allowed_origin_regex,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(
        SecurityHeadersMiddleware,
        enable_hsts=active_settings.hsts_enabled(),
    )
    app.state.settings = active_settings
    app.state.telemetry = TelemetryService()
    app.add_middleware(RequestContextMiddleware)
    app.include_router(system_router)
    app.include_router(identity_router)
    app.include_router(marketplace_router)
    app.include_router(transport_router)
    app.include_router(wallet_router)
    app.include_router(fund_router)
    app.include_router(farm_router)
    app.include_router(advisory_router)
    app.include_router(audit_router)
    app.include_router(climate_router)
    app.include_router(command_router)
    app.include_router(preview_router)
    return app
