from __future__ import annotations

import argparse
import json
import os
import signal
import subprocess
import sys
import time
from pathlib import Path
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen

from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL, make_url


ROOT = Path(__file__).resolve().parents[2]
API_VENV_PYTHON = ROOT / "apps" / "api" / ".venv" / "bin" / "python"
BENCHMARK_DIR = ROOT / ".benchmarks" / "rb070"


def ensure_python() -> str:
    if API_VENV_PYTHON.exists():
        return str(API_VENV_PYTHON)
    return sys.executable


def _normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    return database_url


def _safe_schema_name(name: str) -> str:
    if not name:
        raise ValueError("schema name must not be empty")
    if not all(character.isalnum() or character == "_" for character in name):
        raise ValueError(f"unsupported schema name: {name}")
    if name[0].isdigit():
        raise ValueError(f"schema name must not start with a digit: {name}")
    return name


def _reset_postgres_schema(database_url: str, schema_name: str) -> None:
    url = make_url(_normalize_database_url(database_url))
    if not url.drivername.startswith("postgresql"):
        return
    safe_schema_name = _safe_schema_name(schema_name)
    admin_url: URL = url.set(query={key: value for key, value in url.query.items() if key != "options"})
    engine = create_engine(
        admin_url.render_as_string(hide_password=False),
        future=True,
        isolation_level="AUTOCOMMIT",
        pool_pre_ping=True,
    )
    try:
        with engine.connect() as connection:
            connection.execute(text(f'DROP SCHEMA IF EXISTS "{safe_schema_name}" CASCADE'))
            connection.execute(text(f'CREATE SCHEMA "{safe_schema_name}"'))
    finally:
        engine.dispose()


def _redact_database_url(database_url: str) -> str:
    url = make_url(database_url)
    return url.render_as_string(hide_password=True)


def wait_for_http(url: str, timeout_seconds: float = 30.0) -> None:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            request = Request(url, method="GET")
            with urlopen(request, timeout=2.0) as response:  # noqa: S310
                if 200 <= response.status < 500:
                    return
        except URLError:
            time.sleep(0.25)
        except Exception:
            time.sleep(0.25)
    raise TimeoutError(f"server did not become ready: {url}")


def read_rss_kb(pid: int) -> int | None:
    try:
        status_path = Path(f"/proc/{pid}/status")
        for line in status_path.read_text(encoding="utf-8").splitlines():
            if line.startswith("VmRSS:"):
                return int(line.split()[1])
    except FileNotFoundError:
        return None
    return None


def child_pids(pid: int) -> list[int]:
    children_file = Path(f"/proc/{pid}/task/{pid}/children")
    try:
        raw = children_file.read_text(encoding="utf-8").strip()
    except FileNotFoundError:
        return []
    if not raw:
        return []
    return [int(item) for item in raw.split()]


def read_process_tree_rss_kb(pid: int) -> int | None:
    pids = [pid, *child_pids(pid)]
    values = [read_rss_kb(item) for item in pids]
    valid_values = [value for value in values if value is not None]
    if not valid_values:
        return None
    return sum(valid_values)


def run_node_harness(
    *,
    scenario: str,
    context_path: Path,
    output_path: Path,
    base_url: str,
    tag: str,
) -> dict[str, Any]:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    env = os.environ.copy()
    env["AGRO_LOAD_BASE_URL"] = base_url
    env["AGRO_LOAD_TAG"] = tag
    subprocess.run(
        [
            "node",
            str(ROOT / "tests" / "load" / "harness.mjs"),
            str(ROOT / "tests" / "load" / scenario),
            str(context_path),
            str(output_path),
        ],
        check=True,
        cwd=str(ROOT),
        env=env,
    )
    return json.loads(output_path.read_text(encoding="utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tag", required=True, help="baseline or fixed")
    parser.add_argument("--database-url", help="external database URL for non-SQLite runs")
    parser.add_argument("--database-schema", help="schema name to create/reset for Postgres runs")
    parser.add_argument("--web-concurrency", default="4", help="uvicorn worker count for the benchmark API")
    args = parser.parse_args()

    BENCHMARK_DIR.mkdir(parents=True, exist_ok=True)
    context_path = BENCHMARK_DIR / f"context-{args.tag}.json"
    python_bin = ensure_python()
    if args.database_url:
        database_path = None
        database_url = _normalize_database_url(args.database_url)
        if args.database_schema:
            _reset_postgres_schema(database_url, args.database_schema)
            benchmark_database_url = database_url
        else:
            benchmark_database_url = database_url
    else:
        database_path = BENCHMARK_DIR / f"agrodomain-{args.tag}.db"
        database_url = f"sqlite:///{database_path}"
        benchmark_database_url = database_url

    subprocess.run(
        [
            python_bin,
            str(ROOT / "tests" / "load" / "prepare_benchmark_db.py"),
            "--database-url",
            benchmark_database_url,
            *(
                ["--database-schema", args.database_schema]
                if args.database_schema
                else []
            ),
            "--context-out",
            str(context_path),
        ],
        check=True,
        cwd=str(ROOT),
        env={**os.environ, "PYTHONPATH": str(ROOT / "apps" / "api")},
    )

    server_env = os.environ.copy()
    server_env["AGRO_API_DATABASE_URL"] = benchmark_database_url
    if args.database_schema:
        server_env["AGRO_API_DATABASE_SCHEMA"] = args.database_schema
    server_env["AGRO_API_LOG_LEVEL"] = "WARNING"
    server = subprocess.Popen(
        ["/bin/sh", str(ROOT / "apps" / "api" / "start.sh")],
        cwd=str(ROOT),
        env={
            **server_env,
            "HOST": "127.0.0.1",
            "PORT": "8010",
            "WEB_CONCURRENCY": args.web_concurrency,
        },
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    memory_samples_kb: list[int] = []
    try:
        wait_for_http("http://127.0.0.1:8010/healthz")
        for _ in range(4):
            rss_value = read_process_tree_rss_kb(server.pid)
            if rss_value is not None:
                memory_samples_kb.append(rss_value)
            time.sleep(0.25)

        marketplace_result = run_node_harness(
            scenario="marketplace-load.js",
            context_path=context_path,
            output_path=BENCHMARK_DIR / f"marketplace-{args.tag}.json",
            base_url="http://127.0.0.1:8010",
            tag=args.tag,
        )
        rss_value = read_process_tree_rss_kb(server.pid)
        if rss_value is not None:
            memory_samples_kb.append(rss_value)

        mixed_result = run_node_harness(
            scenario="mixed-workload.js",
            context_path=context_path,
            output_path=BENCHMARK_DIR / f"mixed-{args.tag}.json",
            base_url="http://127.0.0.1:8010",
            tag=args.tag,
        )
        rss_value = read_process_tree_rss_kb(server.pid)
        if rss_value is not None:
            memory_samples_kb.append(rss_value)

        result_payload = {
            "tag": args.tag,
            "database_mode": "external" if args.database_url else "sqlite",
            "database_path": str(database_path) if database_path is not None else None,
            "database_url": _redact_database_url(benchmark_database_url),
            "database_schema": args.database_schema,
            "context_path": str(context_path),
            "memory_rss_kb": {
                "samples": memory_samples_kb,
                "min": min(memory_samples_kb) if memory_samples_kb else None,
                "max": max(memory_samples_kb) if memory_samples_kb else None,
                "delta": (max(memory_samples_kb) - min(memory_samples_kb))
                if len(memory_samples_kb) >= 2
                else None,
            },
            "scenarios": {
                "marketplace": marketplace_result,
                "mixed": mixed_result,
            },
        }
        (BENCHMARK_DIR / f"summary-{args.tag}.json").write_text(
            f"{json.dumps(result_payload, indent=2)}\n",
            encoding="utf-8",
        )
    finally:
        if server.poll() is None:
            server.send_signal(signal.SIGTERM)
            try:
                server.wait(timeout=10)
            except subprocess.TimeoutExpired:
                server.kill()


if __name__ == "__main__":
    main()
