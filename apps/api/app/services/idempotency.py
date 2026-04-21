from app.db.models.workflow import CommandReceipt
from app.db.repositories.workflow import WorkflowRepository


class IdempotencyService:
    def __init__(self, workflow_repository: WorkflowRepository) -> None:
        self.workflow_repository = workflow_repository

    def get_receipt(self, idempotency_key: str) -> CommandReceipt | None:
        return self.workflow_repository.get_receipt(idempotency_key)
