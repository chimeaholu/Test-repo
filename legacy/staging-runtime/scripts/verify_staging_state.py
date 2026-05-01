#!/usr/bin/env python3
"""Verify persisted staging state via file or runtime API."""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request

from agro_v2.staging_runtime import (
    load_state,
    resolve_state_path,
    verify_check,
    verify_checks,
)


def fetch_json(url: str, verify_key: str | None) -> dict[str, object]:
    request = urllib.request.Request(url)
    if verify_key:
        request.add_header("X-E2E-Verify-Key", verify_key)
    with urllib.request.urlopen(request) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source",
        choices=("file", "api"),
        default="file",
    )
    parser.add_argument("--check", default="full-critical")
    parser.add_argument("--state-path", default=None)
    parser.add_argument("--base-url", default=os.getenv("PLAYWRIGHT_BASE_URL", "http://127.0.0.1:8000"))
    args = parser.parse_args()

    if args.source == "api":
        verify_key = os.getenv("AGRODOMAIN_E2E_VERIFY_KEY")
        if args.check == "all":
            payload = fetch_json(f"{args.base_url}/api/e2e/state/checks", verify_key)
        else:
            payload = fetch_json(f"{args.base_url}/api/e2e/state/checks/{args.check}", verify_key)
    else:
        state = load_state(resolve_state_path(args.state_path))
        payload = verify_checks(state) if args.check == "all" else verify_check(state, args.check)

    print(json.dumps(payload, indent=2, sort_keys=True))
    passed = payload.get("passed") if isinstance(payload, dict) and "passed" in payload else None
    if passed is None and isinstance(payload, dict):
        passed = all(item.get("passed") for item in payload.values())
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
