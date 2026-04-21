from __future__ import annotations

import argparse
import json
import os

from app.db import create_session_factory
from app.runtime import WorkerRuntime


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Agrodomain worker runtime")
    parser.add_argument("--database-url", default=os.getenv("AGRO_WORKER_DATABASE_URL"))
    parser.add_argument("--environment", default=os.getenv("AGRO_WORKER_ENVIRONMENT", "local"))
    parser.add_argument("--limit", type=int, default=100)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    if not args.database_url:
        raise SystemExit("AGRO_WORKER_DATABASE_URL is required")
    session_factory = create_session_factory(args.database_url)
    with session_factory() as session:
        summary = WorkerRuntime(session, environment=args.environment).process_available(limit=args.limit)
    print(
        json.dumps(
            {
                "processed_count": summary.processed_count,
                "notification_count": summary.notification_count,
                "replay_record_count": summary.replay_record_count,
            }
        )
    )


if __name__ == "__main__":
    main()
