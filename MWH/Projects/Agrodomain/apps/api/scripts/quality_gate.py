#!/usr/bin/env python3
"""Deterministic quality gates for the API package."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parents[1]
DIST_DIR = ROOT / "dist"
BUILD_DIR = ROOT / "build"
CONTRACTS_MANIFEST = REPO_ROOT / "packages" / "contracts" / "generated" / "manifest.json"
REQUIRED_CONTRACT_IDS = {
    "envelope.request",
    "marketplace.listing_create_input",
    "marketplace.listing_update_input",
    "marketplace.listing_record",
}


def _run(step: str, command: list[str]) -> None:
    print(f"[api:{step}] starting: {' '.join(command)}", flush=True)
    completed = subprocess.run(command, cwd=ROOT)
    if completed.returncode != 0:
        print(
            f"[api:{step}] failed with exit code {completed.returncode}",
            file=sys.stderr,
            flush=True,
        )
        raise SystemExit(completed.returncode)
    print(f"[api:{step}] passed", flush=True)


def _clean_build_outputs() -> None:
    for path in (BUILD_DIR, DIST_DIR):
        if path.exists():
            shutil.rmtree(path)
    for egg_info in ROOT.glob("*.egg-info"):
        if egg_info.is_dir():
            shutil.rmtree(egg_info)


def contracts() -> None:
    print("[api:contracts] validating canonical contract artifacts", flush=True)
    if not CONTRACTS_MANIFEST.exists():
        print(
            f"[api:contracts] failed: missing {CONTRACTS_MANIFEST}. Run `corepack pnpm --filter @agrodomain/contracts generate`.",
            file=sys.stderr,
            flush=True,
        )
        raise SystemExit(1)

    manifest = json.loads(CONTRACTS_MANIFEST.read_text(encoding="utf-8"))
    contracts_by_id = {item["id"]: item for item in manifest.get("contracts", [])}
    missing_ids = sorted(REQUIRED_CONTRACT_IDS - contracts_by_id.keys())
    if missing_ids:
        print(
            "[api:contracts] failed: manifest is missing required contract ids: "
            + ", ".join(missing_ids)
            + ". Run `corepack pnpm --filter @agrodomain/contracts generate`.",
            file=sys.stderr,
            flush=True,
        )
        raise SystemExit(1)

    missing_schema_paths = []
    for contract_id in REQUIRED_CONTRACT_IDS:
        schema_path = (
            REPO_ROOT
            / "packages"
            / "contracts"
            / contracts_by_id[contract_id]["schema_path"]
        )
        if not schema_path.exists():
            missing_schema_paths.append(str(schema_path))

    if missing_schema_paths:
        print(
            "[api:contracts] failed: missing generated schema files:\n"
            + "\n".join(missing_schema_paths),
            file=sys.stderr,
            flush=True,
        )
        raise SystemExit(1)

    print("[api:contracts] passed", flush=True)


def build() -> None:
    contracts()
    print("[api:build] cleaning old build artifacts", flush=True)
    _clean_build_outputs()
    _run("build", [sys.executable, "-m", "build", "--wheel", "--sdist"])

    wheel_count = len(list(DIST_DIR.glob("*.whl")))
    sdist_count = len(list(DIST_DIR.glob("*.tar.gz")))
    if wheel_count != 1 or sdist_count != 1:
        print(
            f"[api:build] failed: expected 1 wheel and 1 sdist, found {wheel_count} wheel(s) and {sdist_count} sdist(s)",
            file=sys.stderr,
            flush=True,
        )
        raise SystemExit(1)
    print("[api:build] produced exactly one wheel and one sdist", flush=True)


def lint() -> None:
    _run("lint", [sys.executable, "-m", "ruff", "check", "app", "tests", "scripts"])


def typecheck() -> None:
    _run(
        "typecheck",
        [sys.executable, "-m", "mypy", "--config-file", "pyproject.toml", "app", "tests", "scripts"],
    )


def test_migrations() -> None:
    contracts()
    _run(
        "test:migrations",
        [
            sys.executable,
            "-m",
            "pytest",
            "-q",
            "tests/integration/test_migrations_and_seed.py",
        ],
    )


def test() -> None:
    test_migrations()
    _run("test", [sys.executable, "-m", "pytest", "-q", "tests"])


def verify() -> None:
    contracts()
    lint()
    typecheck()
    test()
    build()


def main() -> None:
    commands = {
        "build": build,
        "contracts": contracts,
        "lint": lint,
        "typecheck": typecheck,
        "test": test,
        "test:migrations": test_migrations,
        "verify": verify,
    }
    if len(sys.argv) != 2 or sys.argv[1] not in commands:
        valid = ", ".join(sorted(commands))
        print(f"usage: {Path(sys.argv[0]).name} <{valid}>", file=sys.stderr)
        raise SystemExit(2)
    commands[sys.argv[1]]()


if __name__ == "__main__":
    main()
