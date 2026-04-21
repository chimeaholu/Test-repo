from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.worker_runtime import OfflineReplayRecord


class WorkerRuntimeRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_offline_replay_record(self, idempotency_key: str) -> OfflineReplayRecord | None:
        statement = select(OfflineReplayRecord).where(
            OfflineReplayRecord.idempotency_key == idempotency_key
        )
        return self.session.execute(statement).scalar_one_or_none()

    def create_offline_replay_record(
        self,
        *,
        item_id: str,
        idempotency_key: str,
        command_name: str,
        actor_id: str,
        country_code: str,
        disposition: str,
        result_ref: str | None,
        error_code: str | None,
        conflict_state: str,
        conflict_ref: str | None,
    ) -> OfflineReplayRecord:
        record = OfflineReplayRecord(
            item_id=item_id,
            idempotency_key=idempotency_key,
            command_name=command_name,
            actor_id=actor_id,
            country_code=country_code,
            disposition=disposition,
            result_ref=result_ref,
            error_code=error_code,
            conflict_state=conflict_state,
            conflict_ref=conflict_ref,
        )
        self.session.add(record)
        self.session.flush()
        return record
