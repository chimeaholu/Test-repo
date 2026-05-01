#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

if [ -z "${AGRO_DIRECT_POSTGRES_URL:-}" ]; then
  echo "AGRO_DIRECT_POSTGRES_URL is required" >&2
  exit 1
fi

SCHEMA_NAME=${AGRO_DIRECT_POSTGRES_SCHEMA:-rb070_direct_postgres}
WEB_CONCURRENCY=${AGRO_DIRECT_POSTGRES_WEB_CONCURRENCY:-4}
TAG=${AGRO_DIRECT_POSTGRES_TAG:-direct-postgres-proof}

PYTHON_BIN="$ROOT_DIR/apps/api/.venv/bin/python"
if [ ! -x "$PYTHON_BIN" ]; then
  PYTHON_BIN=python3
fi

cd "$ROOT_DIR"

PYTHONPATH=apps/api "$PYTHON_BIN" scripts/direct_postgres_probe.py \
  --database-url "$AGRO_DIRECT_POSTGRES_URL"

PYTHONPATH=apps/api "$PYTHON_BIN" tests/load/run_rb070.py \
  --tag "$TAG" \
  --database-url "$AGRO_DIRECT_POSTGRES_URL" \
  --database-schema "$SCHEMA_NAME" \
  --web-concurrency "$WEB_CONCURRENCY"
