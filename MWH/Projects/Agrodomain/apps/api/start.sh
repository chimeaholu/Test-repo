#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
VENV_PYTHON="$SCRIPT_DIR/.venv/bin/python"

if [ -n "${WEB_CONCURRENCY:-}" ]; then
  WORKERS="$WEB_CONCURRENCY"
elif [ -n "${AGRO_API_WEB_CONCURRENCY:-}" ]; then
  WORKERS="$AGRO_API_WEB_CONCURRENCY"
else
  WORKERS=$(python3 - <<'PY'
import os

cpu_count = os.cpu_count() or 2
print(max(2, min(4, cpu_count)))
PY
)
fi

if [ -x "$VENV_PYTHON" ]; then
  exec "$VENV_PYTHON" -m uvicorn app.main:app \
    --app-dir "$SCRIPT_DIR" \
    --host "${HOST:-0.0.0.0}" \
    --port "${PORT:-8000}" \
    --workers "$WORKERS"
fi

exec uvicorn app.main:app \
  --app-dir "$SCRIPT_DIR" \
  --host "${HOST:-0.0.0.0}" \
  --port "${PORT:-8000}" \
  --workers "$WORKERS"
