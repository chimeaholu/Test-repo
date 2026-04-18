# Agrodomain Frontend Wave F2 Commit-Pinned QA

Date: 2026-04-13
Timestamp (UTC): `2026-04-13T12:28:00Z`
Reviewer: `engineering`
Repo: `/mnt/vault/MWH/Projects/Agrodomain`
Wave: `F2`
Beads:
- `F-006`
- `F-007`
- `F-008`
- `F-009`
- `F-010`
- `F-011`
- `F-012`
- `F-013`

## Outcome

`PASS`

The delivered F2 frontend journey tranche clears its exact-SHA QA lane in an isolated checkout.

## Commit Resolution

```text
2374b93f5c3d213cbb1aa67127f4d3d74df666e8 2026-04-13T12:27:11+00:00 F2 add frontend journey surfaces for queues market advisory and climate
```

## Exact Execution

```bash
git -C /mnt/vault archive 2374b93f5c3d213cbb1aa67127f4d3d74df666e8 MWH/Projects/Agrodomain | tar -x -C /tmp/<isolated-dir>
cd /tmp/<isolated-dir>/MWH/Projects/Agrodomain
PYTHONPATH=src pytest -q \
  tests/test_frontend_app_shell.py \
  tests/test_frontend_consent_ui.py \
  tests/test_frontend_design_tokens.py \
  tests/test_frontend_state_primitives.py \
  tests/test_frontend_accessibility_primitives.py \
  tests/test_frontend_home_queues.py \
  tests/test_frontend_listing_routes.py \
  tests/test_frontend_listing_wizard.py \
  tests/test_frontend_negotiation_ui.py \
  tests/test_frontend_escrow_wallet_center.py \
  tests/test_frontend_advisory_routes.py \
  tests/test_frontend_citation_drawer.py \
  tests/test_frontend_climate_alert_center.py \
  tests/test_listings.py \
  tests/test_negotiation.py \
  tests/test_escrow.py \
  tests/test_advisory_retrieval.py \
  tests/test_multilingual_delivery.py \
  tests/test_climate_alert_rules.py \
  tests/test_mobile_api_profile.py \
  tests/test_package_exports.py
```

## Output

```text
................................................................         [100%]
64 passed in 1.60s
```

## Evidence

- Raw workspace evidence: `execution/heartbeats/2026-04-13-f2-test-evidence.txt`
- Raw isolated exact-SHA evidence: `execution/heartbeats/2026-04-13-f2-formal-qa.txt`
- Covered obligations: `FJ-R01`, `queue-state-tests`, `FJ-C02`, `FJ-R02`, `FJ-E01`, `FJ-C03`, `FJ-C04`, `FJ-C05`, `citation-inspection-tests`, `FJ-C06`

## Conclusion

Wave F2 is built, test-backed, and formally QA-cleared at its delivered SHA.
