"""The Health page's backend (WORLD_CLASS_PLAN 28.1 rule 14): the last
backup, the last error, what is running, the data dir's size and an
integrity check in one click, each field present and dated."""

from __future__ import annotations

import logging

from memorymap.core import activity


def test_health_carries_every_rule_14_field_dated(client):
    logging.getLogger("memorymap.test").error("a planted failure")
    job = activity.start("generation", "Answering in Chat", stoppable=True)
    try:
        body = client.get("/debug/health").json()
    finally:
        activity.finish(job)
    trust = body["trust"]
    assert trust["checked_at"]
    assert set(trust) >= {"last_backup", "last_error", "running", "data_dir_bytes", "integrity"}
    assert trust["last_backup"] == {"at": None, "name": ""}, "no backup yet is a dated-or-none answer"
    assert trust["last_error"]["at"] and "planted" in trust["last_error"]["line"]
    assert any(row["kind"] == "generation" for row in trust["running"])
    assert trust["data_dir_bytes"] > 0


def test_a_backup_is_named_with_its_date(client):
    made = client.post("/backups")
    assert made.status_code == 201
    trust = client.get("/debug/health").json()["trust"]
    assert trust["last_backup"]["at"] and trust["last_backup"]["name"].startswith("memorymap-")


def test_the_integrity_check_runs_in_one_call_and_is_remembered(client):
    checked = client.post("/debug/health/integrity").json()
    assert checked["ok"] is True and checked["result"] == "ok"
    assert checked["at"] and "notes" in checked["index"]
    trust = client.get("/debug/health").json()["trust"]
    assert trust["integrity"]["at"] == checked["at"]
