from dataclasses import dataclass, field


@dataclass(slots=True)
class CommandRejectedError(Exception):
    status_code: int
    error_code: str
    reason_code: str
    payload: dict[str, object] = field(default_factory=dict)

