from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.payments import PaymentCollectionRecord


class PaymentRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create_collection(
        self,
        *,
        payment_id: str,
        escrow_id: str,
        actor_id: str,
        country_code: str,
        currency: str,
        amount: float,
        provider: str,
        provider_mode: str,
        provider_reference: str,
        provider_access_code: str | None,
        authorization_url: str | None,
        local_status: str,
        provider_status: str,
        provider_transaction_id: str | None,
        channels: list[str],
        provider_payload: dict[str, object],
        metadata_json: dict[str, object],
        last_error_code: str | None = None,
        last_error_detail: str | None = None,
        verified_at: datetime | None = None,
    ) -> PaymentCollectionRecord:
        record = PaymentCollectionRecord(
            payment_id=payment_id,
            escrow_id=escrow_id,
            actor_id=actor_id,
            country_code=country_code,
            currency=currency,
            amount=amount,
            provider=provider,
            provider_mode=provider_mode,
            provider_reference=provider_reference,
            provider_access_code=provider_access_code,
            authorization_url=authorization_url,
            local_status=local_status,
            provider_status=provider_status,
            provider_transaction_id=provider_transaction_id,
            channels=channels,
            provider_payload=provider_payload,
            metadata_json=metadata_json,
            last_error_code=last_error_code,
            last_error_detail=last_error_detail,
            verified_at=verified_at,
        )
        self.session.add(record)
        self.session.flush()
        return record

    def get_collection(self, *, payment_id: str) -> PaymentCollectionRecord | None:
        statement = select(PaymentCollectionRecord).where(
            PaymentCollectionRecord.payment_id == payment_id
        )
        return self.session.execute(statement).scalar_one_or_none()

    def get_collection_for_actor(
        self, *, payment_id: str, actor_id: str, country_code: str
    ) -> PaymentCollectionRecord | None:
        statement = select(PaymentCollectionRecord).where(
            PaymentCollectionRecord.payment_id == payment_id,
            PaymentCollectionRecord.actor_id == actor_id,
            PaymentCollectionRecord.country_code == country_code,
        )
        return self.session.execute(statement).scalar_one_or_none()

    def list_collections_for_actor(
        self, *, actor_id: str, country_code: str, escrow_id: str | None = None
    ) -> list[PaymentCollectionRecord]:
        statement = (
            select(PaymentCollectionRecord)
            .where(
                PaymentCollectionRecord.actor_id == actor_id,
                PaymentCollectionRecord.country_code == country_code,
            )
            .order_by(PaymentCollectionRecord.created_at.desc(), PaymentCollectionRecord.id.desc())
        )
        if escrow_id is not None:
            statement = statement.where(PaymentCollectionRecord.escrow_id == escrow_id)
        return list(self.session.execute(statement).scalars().all())

    def latest_active_collection_for_escrow(
        self, *, escrow_id: str, actor_id: str, country_code: str
    ) -> PaymentCollectionRecord | None:
        statement = (
            select(PaymentCollectionRecord)
            .where(
                PaymentCollectionRecord.escrow_id == escrow_id,
                PaymentCollectionRecord.actor_id == actor_id,
                PaymentCollectionRecord.country_code == country_code,
                PaymentCollectionRecord.local_status.in_(
                    ["initialized", "pending", "verification_pending"]
                ),
            )
            .order_by(PaymentCollectionRecord.created_at.desc(), PaymentCollectionRecord.id.desc())
            .limit(1)
        )
        return self.session.execute(statement).scalars().first()

    def update_collection_status(
        self,
        *,
        record: PaymentCollectionRecord,
        local_status: str,
        provider_status: str,
        provider_transaction_id: str | None,
        provider_payload: dict[str, object],
        last_error_code: str | None,
        last_error_detail: str | None,
        verified_at: datetime | None = None,
    ) -> PaymentCollectionRecord:
        record.local_status = local_status
        record.provider_status = provider_status
        record.provider_transaction_id = provider_transaction_id
        record.provider_payload = provider_payload
        record.last_error_code = last_error_code
        record.last_error_detail = last_error_detail
        if verified_at is not None:
            record.verified_at = verified_at
        self.session.flush()
        return record

    def mark_wallet_funded(
        self,
        *,
        record: PaymentCollectionRecord,
        wallet_entry_id: str,
        applied_at: datetime,
    ) -> PaymentCollectionRecord:
        record.wallet_entry_id = wallet_entry_id
        record.wallet_funding_applied_at = applied_at
        self.session.flush()
        return record

    def mark_escrow_funded(
        self,
        *,
        record: PaymentCollectionRecord,
        funded_at: datetime,
    ) -> PaymentCollectionRecord:
        record.escrow_funded_at = funded_at
        record.local_status = "funded"
        self.session.flush()
        return record
