from __future__ import annotations

import argparse
import json
import socket
import time
from urllib.parse import urlparse

import psycopg


def _address_payload(sockaddr: tuple[object, ...]) -> str:
    host = sockaddr[0]
    port = sockaddr[1]
    return f"{host}:{port}"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--database-url")
    parser.add_argument("--host")
    parser.add_argument("--port", type=int, default=5432)
    parser.add_argument("--connect-timeout", type=float, default=5.0)
    args = parser.parse_args()

    parsed = urlparse(args.database_url) if args.database_url else None
    host = args.host or (parsed.hostname if parsed is not None else None)
    port = parsed.port if parsed is not None and parsed.port is not None else args.port
    if host is None:
        raise SystemExit("either --database-url or --host must be provided")

    started_at = time.perf_counter()
    addresses = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    records: list[dict[str, object]] = []

    for family, socktype, proto, _, sockaddr in addresses:
        family_name = "ipv6" if family == socket.AF_INET6 else "ipv4"
        address = _address_payload(sockaddr)
        outcome = "unattempted"
        error = None
        try:
            with socket.socket(family, socktype, proto) as connection:
                connection.settimeout(args.connect_timeout)
                connection.connect(sockaddr)
            outcome = "connected"
        except OSError as exc:
            outcome = "failed"
            error = str(exc)
        records.append(
            {
                "family": family_name,
                "address": address,
                "outcome": outcome,
                "error": error,
            }
        )

    sql_result = {"outcome": "skipped", "error": None}
    if args.database_url:
        try:
            with psycopg.connect(args.database_url, connect_timeout=args.connect_timeout) as connection:
                with connection.cursor() as cursor:
                    cursor.execute("select 1")
                    cursor.fetchone()
            sql_result["outcome"] = "connected"
        except Exception as exc:  # noqa: BLE001
            sql_result["outcome"] = "failed"
            sql_result["error"] = str(exc)

    print(
        json.dumps(
            {
                "host": host,
                "port": port,
                "elapsed_ms": round((time.perf_counter() - started_at) * 1000, 2),
                "addresses": records,
                "sql": sql_result,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
