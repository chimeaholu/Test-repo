from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

COMMON_SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
    "Cross-Origin-Opener-Policy": "same-origin",
}

API_CACHE_HEADERS = {
    "Cache-Control": "no-store",
    "Pragma": "no-cache",
    "X-Robots-Tag": "noindex, nofollow",
    "Cross-Origin-Resource-Policy": "cross-origin",
}

NON_API_RESOURCE_HEADERS = {
    "Cross-Origin-Resource-Policy": "same-origin",
}

HSTS_HEADER_VALUE = "max-age=63072000; includeSubDomains; preload"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, *, enable_hsts: bool = False) -> None:
        super().__init__(app)
        self._enable_hsts = enable_hsts

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        for key, value in COMMON_SECURITY_HEADERS.items():
            response.headers.setdefault(key, value)

        if request.url.path.startswith("/api/"):
            for key, value in API_CACHE_HEADERS.items():
                response.headers.setdefault(key, value)
        else:
            for key, value in NON_API_RESOURCE_HEADERS.items():
                response.headers.setdefault(key, value)

        forwarded_proto = request.headers.get("x-forwarded-proto", request.url.scheme)
        if self._enable_hsts and forwarded_proto == "https":
            response.headers.setdefault("Strict-Transport-Security", HSTS_HEADER_VALUE)

        return response
