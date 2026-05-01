"""F-023 route loader and mutation services backed by typed frontend DTOs."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from .frontend_contract_adapters import (
    FrontendContractAdapters,
    FrontendMutationDto,
    FrontendRouteDtoEnvelope,
)


class FrontendRouteServiceError(ValueError):
    """Raised when frontend route loaders or mutations are missing or malformed."""


@dataclass(frozen=True)
class FrontendRouteLoaderRequest:
    route_name: str
    role: str
    params: dict[str, str]
    schema_version: str = "frontend.loader.v1"


@dataclass(frozen=True)
class FrontendRouteLoaderResult:
    route_name: str
    loader_name: str
    envelope: FrontendRouteDtoEnvelope
    cache_tags: tuple[str, ...]
    revalidate_seconds: int
    transport: str


@dataclass(frozen=True)
class FrontendMutationReceipt:
    action: str
    route_name: str
    status: str
    invalidated_routes: tuple[str, ...]
    queued_offline: bool
    envelope: FrontendRouteDtoEnvelope


@dataclass(frozen=True)
class _LoaderRegistration:
    loader: Callable[[FrontendRouteLoaderRequest], object]
    source_bead_ids: tuple[str, ...]
    cache_tags: tuple[str, ...]
    revalidate_seconds: int
    loader_name: str
    transport: str


@dataclass(frozen=True)
class _MutationRegistration:
    handler: Callable[[FrontendMutationDto], object]
    source_bead_ids: tuple[str, ...]
    invalidates_routes: tuple[str, ...]
    offline_capable: bool
    handler_name: str


class FrontendRouteDataServices:
    """Registers route loaders and mutation handlers for frontend surface delivery."""

    def __init__(self, *, adapters: FrontendContractAdapters | None = None) -> None:
        self._adapters = adapters or FrontendContractAdapters()
        self._loaders: dict[str, _LoaderRegistration] = {}
        self._mutations: dict[tuple[str, str], _MutationRegistration] = {}

    def register_loader(
        self,
        *,
        route_name: str,
        loader: Callable[[FrontendRouteLoaderRequest], object],
        source_bead_ids: tuple[str, ...],
        cache_tags: tuple[str, ...] = (),
        revalidate_seconds: int = 60,
        transport: str = "in_memory",
    ) -> None:
        if route_name in self._loaders:
            raise FrontendRouteServiceError(f"loader already registered for route: {route_name}")
        if revalidate_seconds <= 0:
            raise FrontendRouteServiceError("revalidate_seconds must be greater than zero")
        self._loaders[route_name] = _LoaderRegistration(
            loader=loader,
            source_bead_ids=source_bead_ids,
            cache_tags=cache_tags,
            revalidate_seconds=revalidate_seconds,
            loader_name=getattr(loader, "__name__", loader.__class__.__name__),
            transport=transport,
        )

    def load(self, request: FrontendRouteLoaderRequest) -> FrontendRouteLoaderResult:
        registration = self._loaders.get(request.route_name)
        if registration is None:
            raise FrontendRouteServiceError(f"loader not registered for route: {request.route_name}")
        payload = registration.loader(request)
        envelope = self._adapters.adapt_payload(
            route_name=request.route_name,
            role=request.role,
            source_bead_ids=registration.source_bead_ids,
            payload=payload,
            schema_version=request.schema_version,
        )
        return FrontendRouteLoaderResult(
            route_name=request.route_name,
            loader_name=registration.loader_name,
            envelope=envelope,
            cache_tags=registration.cache_tags,
            revalidate_seconds=registration.revalidate_seconds,
            transport=registration.transport,
        )

    def register_mutation(
        self,
        *,
        action: str,
        route_name: str,
        handler: Callable[[FrontendMutationDto], object],
        source_bead_ids: tuple[str, ...],
        invalidates_routes: tuple[str, ...] = (),
        offline_capable: bool = True,
    ) -> None:
        key = (action, route_name)
        if key in self._mutations:
            raise FrontendRouteServiceError(
                f"mutation already registered for action/route: {action} {route_name}"
            )
        self._mutations[key] = _MutationRegistration(
            handler=handler,
            source_bead_ids=source_bead_ids,
            invalidates_routes=invalidates_routes,
            offline_capable=offline_capable,
            handler_name=getattr(handler, "__name__", handler.__class__.__name__),
        )

    def mutate(
        self,
        *,
        action: str,
        route_name: str,
        role: str,
        payload: object,
        idempotency_key: str,
        schema_version: str = "frontend.mutation.v1",
        prefer_offline_queue: bool = False,
    ) -> FrontendMutationReceipt:
        key = (action, route_name)
        registration = self._mutations.get(key)
        if registration is None:
            raise FrontendRouteServiceError(
                f"mutation not registered for action/route: {action} {route_name}"
            )
        mutation = self._adapters.build_mutation(
            action=action,
            route_name=route_name,
            payload=payload,
            idempotency_key=idempotency_key,
            invalidates_routes=registration.invalidates_routes,
            offline_capable=registration.offline_capable,
            schema_version=schema_version,
        )
        result_payload = registration.handler(mutation)
        envelope = self._adapters.adapt_payload(
            route_name=route_name,
            role=role,
            source_bead_ids=registration.source_bead_ids,
            payload=result_payload,
            schema_version="frontend.mutation.result.v1",
        )
        queued_offline = prefer_offline_queue and registration.offline_capable
        return FrontendMutationReceipt(
            action=action,
            route_name=route_name,
            status="queued" if queued_offline else "applied",
            invalidated_routes=registration.invalidates_routes,
            queued_offline=queued_offline,
            envelope=envelope,
        )
