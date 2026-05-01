#!/usr/bin/env bash
# RB-009 — Demo seed shell entrypoint.
#
# Usage:
#   cd apps/api && bash scripts/seed.sh
#
# Environment:
#   AGRO_API_DATABASE_URL  Override the database URL (default: sqlite:///./agrodomain_api.db)
#
# The script runs migrations (if alembic is available) then executes
# the demo-data seed.  Exit 0 on success, non-zero on failure.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$API_ROOT"

echo "=== Agrodomain Demo Seed ==="
echo "Working directory: $API_ROOT"
echo "Database URL: ${AGRO_API_DATABASE_URL:-sqlite:///./agrodomain_api.db}"

# Run alembic migrations if available.
if command -v alembic &>/dev/null && [ -f alembic.ini ]; then
    echo ""
    echo "--- Running Alembic migrations ---"
    alembic upgrade head || {
        echo "WARN: Alembic migration failed — falling back to create_all."
    }
fi

echo ""
echo "--- Seeding demo data ---"
python3 -m app.seed_demo_data

echo ""
echo "=== Done ==="
