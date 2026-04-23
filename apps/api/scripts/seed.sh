#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# seed.sh  --  Populate dev / staging database with realistic demo data
#
# Usage:
#   cd apps/api
#   bash scripts/seed.sh              # uses default SQLite database
#   AGRO_API_DATABASE_URL=... bash scripts/seed.sh   # custom DB URL
#
# The script is idempotent: running it multiple times is safe.
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$API_DIR"

echo "==> Running Agrodomain demo seed from $API_DIR"
echo "    Database: ${AGRO_API_DATABASE_URL:-sqlite:///./agrodomain_api.db}"
echo ""

python3 -m app.seed_demo_data

echo ""
echo "==> Seed complete."
