#!/usr/bin/env python3
"""Seed deterministic staging data for Agrodomain critical E2E journeys."""

from __future__ import annotations

import argparse
import json

from agro_v2.staging_runtime import resolve_state_path, seed_state


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", default="e2e-critical")
    parser.add_argument("--state-path", default=None)
    args = parser.parse_args()

    report = seed_state(
        state_path=resolve_state_path(args.state_path),
        profile=args.profile,
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
