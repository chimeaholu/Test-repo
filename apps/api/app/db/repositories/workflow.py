from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.workflow import CommandReceipt, WorkflowExecution


class WorkflowRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_receipt(self, idempotency_key: str) -> CommandReceipt | None:
        statement = select(CommandReceipt).where(
            CommandReceipt.idempotency_key == idempotency_key
        )
        return self.session.execute(statement).scalar_one_or_none()

    def create_execution(
        self,
        *,
        request_id: str,
        command_name: str,
        actor_id: str,
        country_code: str,
        channel: str,
        schema_version: str,
        payload: dict[str, object],
        status: str,
    ) -> WorkflowExecution:
        execution = WorkflowExecution(
            request_id=request_id,
            command_name=command_name,
            actor_id=actor_id,
            country_code=country_code,
            channel=channel,
            schema_version=schema_version,
            payload=payload,
            status=status,
        )
        self.session.add(execution)
        self.session.flush()
        return execution

    def create_receipt(
        self,
        *,
        idempotency_key: str,
        request_id: str,
        actor_id: str,
        command_name: str,
        status: str,
        response_code: str,
        response_body: dict[str, object],
    ) -> CommandReceipt:
        receipt = CommandReceipt(
            idempotency_key=idempotency_key,
            request_id=request_id,
            actor_id=actor_id,
            command_name=command_name,
            status=status,
            response_code=response_code,
            response_body=response_body,
        )
        self.session.add(receipt)
        self.session.flush()
        return receipt
