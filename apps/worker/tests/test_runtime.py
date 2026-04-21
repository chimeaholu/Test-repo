from __future__ import annotations

import json
import os
import sqlite3
import subprocess
from pathlib import Path

WORKER_ROOT = Path(__file__).resolve().parents[1]
API_ROOT = WORKER_ROOT.parent / "api"


def test_worker_processes_control_plane_and_offline_events(tmp_path: Path) -> None:
    db_path = tmp_path / "worker-runtime.db"
    database_url = f"sqlite:///{db_path}"
    subprocess.run(
        [
            "python3",
            "-c",
            (
                "from alembic import command;"
                "from alembic.config import Config;"
                f"cfg = Config({str(API_ROOT / 'alembic.ini')!r});"
                f"cfg.set_main_option('sqlalchemy.url', {database_url!r});"
                f"cfg.set_main_option('script_location', {str(API_ROOT / 'app' / 'db' / 'migrations')!r});"
                "command.upgrade(cfg, 'head')"
            ),
        ],
        cwd=API_ROOT,
        check=True,
        env={**os.environ, "PYTHONPATH": str(API_ROOT), "AGRO_API_DATABASE_URL": database_url},
        capture_output=True,
        text=True,
    )

    connection = sqlite3.connect(db_path)
    connection.execute(
        """
        INSERT INTO outbox_messages
            (aggregate_type, aggregate_id, event_type, payload, created_at, published_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, NULL)
        """,
        (
            "telemetry_observation",
            "obs-001",
            "admin.telemetry.ingested",
            json.dumps(
                {
                    "schema_version": "2026-04-18.wave1",
                    "request_id": "req-telemetry-001",
                    "idempotency_key": "idem-telemetry-001",
                    "country_code": "GH",
                    "service_name": "admin_control_plane",
                }
            ),
        ),
    )
    connection.execute(
        """
        INSERT INTO outbox_messages
            (aggregate_type, aggregate_id, event_type, payload, created_at, published_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, NULL)
        """,
        (
            "workflow_execution",
            "wf-listing-001",
            "workflow.command.accepted",
            json.dumps(
                {
                    "command_name": "market.listings.create",
                    "request_id": "req-offline-001",
                    "idempotency_key": "idem-offline-001",
                    "actor_id": "system:test",
                    "country_code": "GH",
                    "channel": "pwa",
                    "journey_ids": ["offline:wf-listing-001"],
                    "offline_queue_item_id": "offline-1",
                }
            ),
        ),
    )
    connection.commit()
    connection.close()

    result = subprocess.run(
        ["python3", "-m", "app.main", "--database-url", database_url, "--environment", "test", "--limit", "10"],
        cwd=WORKER_ROOT,
        check=True,
        capture_output=True,
        text=True,
        env={**os.environ, "PYTHONPATH": str(WORKER_ROOT)},
    )
    summary = json.loads(result.stdout.strip())

    assert summary == {
        "processed_count": 2,
        "notification_count": 1,
        "replay_record_count": 1,
    }

    connection = sqlite3.connect(db_path)
    notification_row = connection.execute(
        "SELECT payload FROM outbox_messages WHERE event_type = 'notifications.dispatch.requested'"
    ).fetchone()
    replay_row = connection.execute(
        "SELECT item_id, result_ref FROM offline_replay_records WHERE idempotency_key = 'idem-offline-001'"
    ).fetchone()
    audit_rows = connection.execute(
        """
        SELECT event_type
        FROM audit_events
        WHERE event_type IN ('worker.notification.queued', 'worker.offline.replay_recorded')
        """
    ).fetchall()
    connection.close()

    assert notification_row is not None
    assert json.loads(notification_row[0])["intent_type"] == "system_alert"
    assert replay_row == ("offline-1", "workflow_execution:wf-listing-001")
    assert len(audit_rows) == 2
