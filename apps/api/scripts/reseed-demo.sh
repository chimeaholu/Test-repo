#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$API_ROOT"

echo "=== Agrodomain Demo Reseed ==="
echo "Working directory: $API_ROOT"
echo "Database URL: ${AGRO_API_DATABASE_URL:-sqlite:///./agrodomain_api.db}"

if command -v alembic &>/dev/null && [ -f alembic.ini ]; then
    echo ""
    echo "--- Running Alembic migrations ---"
    alembic upgrade head || {
        echo "WARN: Alembic migration failed — continuing with the existing schema."
    }
fi

echo ""
echo "--- Resetting and seeding shared demo tenant ---"
python3 -m app.seed_demo_data --reset --json

echo ""
echo "=== Done ==="
