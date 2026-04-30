import json
import logging
from datetime import UTC, datetime

_STANDARD_LOG_RECORD_FIELDS = frozenset(logging.makeLogRecord({}).__dict__.keys())


def _coerce_json_value(value: object) -> object:
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    if isinstance(value, dict):
        return {str(key): _coerce_json_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_coerce_json_value(item) for item in value]
    return str(value)


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "timestamp": datetime.now(tz=UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        request_id = getattr(record, "request_id", None)
        if request_id:
            payload["request_id"] = request_id
        correlation_id = getattr(record, "correlation_id", None)
        if correlation_id:
            payload["correlation_id"] = correlation_id
        for key, value in record.__dict__.items():
            if key in _STANDARD_LOG_RECORD_FIELDS or key.startswith("_"):
                continue
            payload[key] = _coerce_json_value(value)
        return json.dumps(payload, default=str, sort_keys=True)


def configure_logging(level: str) -> None:
    root_logger = logging.getLogger()
    if getattr(root_logger, "_agrodomain_configured", False):
        root_logger.setLevel(level)
        return

    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(level)
    root_logger._agrodomain_configured = True  # type: ignore[attr-defined]
