import logging
from time import perf_counter
from uuid import uuid4

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

LOGGER = logging.getLogger("agrodomain.api.request")


def _extract_trace_id(request: Request) -> str:
    trace_id = request.headers.get("X-Trace-ID", "").strip()
    if trace_id:
        return trace_id[:64]
    traceparent = request.headers.get("traceparent", "").strip()
    parts = traceparent.split("-")
    if len(parts) == 4 and len(parts[1]) == 32:
        return parts[1]
    return uuid4().hex


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid4()))
        correlation_id = request.headers.get("X-Correlation-ID", request_id)
        trace_id = _extract_trace_id(request)
        span_id = uuid4().hex[:16]
        request.state.request_id = request_id
        request.state.correlation_id = correlation_id
        request.state.trace_id = trace_id
        request.state.span_id = span_id
        started_at = perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((perf_counter() - started_at) * 1000, 2)
            telemetry = getattr(request.app.state, "telemetry", None)
            if telemetry is not None:
                telemetry.observe_request(
                    method=request.method,
                    path=request.url.path,
                    status_code=500,
                    duration_ms=duration_ms,
                )
            LOGGER.exception(
                "request.failed",
                extra={
                    "request_id": request_id,
                    "correlation_id": correlation_id,
                    "trace_id": trace_id,
                    "span_id": span_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": 500,
                    "duration_ms": duration_ms,
                },
            )
            raise

        response.headers["X-Request-ID"] = request_id
        response.headers["X-Correlation-ID"] = correlation_id
        response.headers["X-Trace-ID"] = trace_id
        response.headers["X-Span-ID"] = span_id
        route = request.scope.get("route")
        route_path = getattr(route, "path", request.url.path)
        duration_ms = round((perf_counter() - started_at) * 1000, 2)
        telemetry = getattr(request.app.state, "telemetry", None)
        if telemetry is not None:
            telemetry.observe_request(
                method=request.method,
                path=route_path,
                status_code=response.status_code,
                duration_ms=duration_ms,
            )
        LOGGER.info(
            "request.completed",
            extra={
                "request_id": request_id,
                "correlation_id": correlation_id,
                "trace_id": trace_id,
                "span_id": span_id,
                "method": request.method,
                "path": route_path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            },
        )
        return response
