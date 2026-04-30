import pytest

from app.modules.finance.payments import PaystackPaymentProvider, PaymentProviderError


class _FakeClient:
    def __init__(self, response):
        self.response = response

    def request(self, *, method: str, url: str, headers: dict[str, str], payload=None):
        assert url.startswith("https://api.paystack.co/")
        assert headers["Authorization"].startswith("Bearer ")
        return self.response


def test_paystack_initialize_normalizes_session() -> None:
    provider = PaystackPaymentProvider(
        secret_key="sk_test_123",
        base_url="https://api.paystack.co",
        timeout_seconds=2,
        live_enabled=False,
        client=_FakeClient(
            {
                "status": True,
                "message": "Authorization URL created",
                "data": {
                    "authorization_url": "https://checkout.paystack.com/test",
                    "access_code": "test-code",
                    "reference": "agro-ref-1",
                },
            }
        ),
    )

    session = provider.initialize_collection(
        amount_minor=40000,
        currency="GHS",
        email="ama@example.com",
        reference="agro-ref-1",
        callback_url=None,
        channels=["mobile_money"],
        metadata={"escrow_id": "escrow-1"},
    )

    assert session.provider == "paystack"
    assert session.provider_mode == "test"
    assert session.provider_reference == "agro-ref-1"
    assert session.authorization_url == "https://checkout.paystack.com/test"


def test_paystack_live_key_stays_gated_without_activation() -> None:
    provider = PaystackPaymentProvider(
        secret_key="sk_live_123",
        base_url="https://api.paystack.co",
        timeout_seconds=2,
        live_enabled=False,
        client=_FakeClient({}),
    )

    with pytest.raises(PaymentProviderError) as excinfo:
        provider.initialize_collection(
            amount_minor=40000,
            currency="NGN",
            email="ama@example.com",
            reference="agro-ref-2",
            callback_url=None,
            channels=["ussd"],
            metadata={},
        )

    assert excinfo.value.code == "provider_live_gate_closed"
