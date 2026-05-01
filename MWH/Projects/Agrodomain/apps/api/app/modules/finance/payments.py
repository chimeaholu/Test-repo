from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
import json
from typing import Any, Protocol
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from app.core.config import Settings


class PaymentProviderError(RuntimeError):
    def __init__(self, code: str, detail: str) -> None:
        super().__init__(detail)
        self.code = code
        self.detail = detail


@dataclass(frozen=True, slots=True)
class PaymentCollectionSession:
    provider: str
    provider_mode: str
    provider_reference: str
    provider_status: str
    authorization_url: str | None
    access_code: str | None
    provider_transaction_id: str | None
    channels: list[str]
    raw_payload: dict[str, object]
    last_error_code: str | None = None
    last_error_detail: str | None = None


class PaymentProvider(Protocol):
    provider_name: str

    def initialize_collection(
        self,
        *,
        amount_minor: int,
        currency: str,
        email: str,
        reference: str,
        callback_url: str | None,
        channels: list[str],
        metadata: dict[str, object],
    ) -> PaymentCollectionSession: ...

    def verify_collection(self, *, provider_reference: str) -> PaymentCollectionSession: ...


class UrlJsonClient(Protocol):
    def request(
        self,
        *,
        method: str,
        url: str,
        headers: dict[str, str],
        payload: dict[str, object] | None = None,
    ) -> dict[str, Any]: ...


class _UrlJsonClient:
    def __init__(self, *, timeout_seconds: int) -> None:
        self.timeout_seconds = timeout_seconds

    def request(
        self,
        *,
        method: str,
        url: str,
        headers: dict[str, str],
        payload: dict[str, object] | None = None,
    ) -> dict[str, Any]:
        body = None
        if payload is not None:
            body = json.dumps(payload).encode("utf-8")
        request = Request(url=url, method=method, headers=headers, data=body)
        try:
            with urlopen(request, timeout=self.timeout_seconds) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            raise PaymentProviderError("provider_http_error", detail or str(exc)) from exc
        except URLError as exc:
            raise PaymentProviderError("provider_network_error", str(exc.reason)) from exc


class PaystackPaymentProvider:
    provider_name = "paystack"

    def __init__(
        self,
        *,
        secret_key: str | None,
        base_url: str,
        timeout_seconds: int,
        live_enabled: bool,
        client: UrlJsonClient | None = None,
    ) -> None:
        self.secret_key = secret_key
        self.base_url = base_url.rstrip("/")
        self.live_enabled = live_enabled
        self.client = client or _UrlJsonClient(timeout_seconds=timeout_seconds)

    def initialize_collection(
        self,
        *,
        amount_minor: int,
        currency: str,
        email: str,
        reference: str,
        callback_url: str | None,
        channels: list[str],
        metadata: dict[str, object],
    ) -> PaymentCollectionSession:
        self._ensure_configured()
        payload: dict[str, object] = {
            "amount": str(amount_minor),
            "email": email,
            "currency": currency,
            "reference": reference,
            "channels": channels,
            "metadata": metadata,
        }
        if callback_url:
            payload["callback_url"] = callback_url
        response = self.client.request(
            method="POST",
            url=f"{self.base_url}/transaction/initialize",
            headers=self._headers(),
            payload=payload,
        )
        data = response.get("data")
        if not response.get("status") or not isinstance(data, dict):
            raise PaymentProviderError(
                "provider_initialize_failed",
                str(response.get("message") or "Paystack failed to initialize the transaction."),
            )
        return PaymentCollectionSession(
            provider=self.provider_name,
            provider_mode=self._provider_mode(),
            provider_reference=str(data.get("reference") or reference),
            provider_status="pending",
            authorization_url=_optional_str(data.get("authorization_url")),
            access_code=_optional_str(data.get("access_code")),
            provider_transaction_id=_optional_str(data.get("id")),
            channels=channels,
            raw_payload=response,
        )

    def verify_collection(self, *, provider_reference: str) -> PaymentCollectionSession:
        self._ensure_configured()
        response = self.client.request(
            method="GET",
            url=f"{self.base_url}/transaction/verify/{quote(provider_reference, safe='')}",
            headers=self._headers(),
        )
        data = response.get("data")
        if not response.get("status") or not isinstance(data, dict):
            raise PaymentProviderError(
                "provider_verify_failed",
                str(response.get("message") or "Paystack failed to verify the transaction."),
            )
        paystack_status = str(data.get("status") or "pending").lower()
        return PaymentCollectionSession(
            provider=self.provider_name,
            provider_mode=self._provider_mode(),
            provider_reference=str(data.get("reference") or provider_reference),
            provider_status=_map_paystack_status(paystack_status),
            authorization_url=None,
            access_code=None,
            provider_transaction_id=_optional_str(data.get("id")),
            channels=[],
            raw_payload=response,
            last_error_detail=_optional_str(data.get("gateway_response")),
        )

    def _headers(self) -> dict[str, str]:
        assert self.secret_key is not None
        return {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json",
        }

    def _ensure_configured(self) -> None:
        if not self.secret_key:
            raise PaymentProviderError(
                "provider_not_configured",
                "Paystack secret key is not configured for this environment.",
            )
        if self.secret_key.startswith("sk_live_") and not self.live_enabled:
            raise PaymentProviderError(
                "provider_live_gate_closed",
                "Live Paystack credentials are blocked until the production activation gate is explicitly opened.",
            )

    def _provider_mode(self) -> str:
        if not self.secret_key:
            return "unconfigured"
        if self.secret_key.startswith("sk_live_"):
            return "live"
        return "test"


def _map_paystack_status(value: str) -> str:
    if value == "success":
        return "success"
    if value in {"failed", "abandoned"}:
        return value
    return "pending"


def _optional_str(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def minor_units_for_amount(*, amount: float) -> int:
    return int(round(amount * 100))


def build_payment_provider(settings: Settings) -> PaymentProvider:
    return PaystackPaymentProvider(
        secret_key=settings.paystack_secret_key,
        base_url=settings.paystack_base_url,
        timeout_seconds=settings.payment_request_timeout_seconds,
        live_enabled=settings.paystack_live_enabled,
    )


def payment_now_iso() -> str:
    return datetime.now(tz=UTC).isoformat().replace("+00:00", "Z")
