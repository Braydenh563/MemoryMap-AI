"""Preferences, plus the manual-override/linking/audit/export routes that
don't have a larger domain file of their own.

(Auth flow moved to test_account.py, recycle-bin tests to
test_recycle_bin.py — same domain as their other coverage.)"""

from __future__ import annotations

import csv
import io

from memorymap.core import deps


def _save(client, content, **extra):
    response = client.post("/entries", json={"content": content, **extra})
    assert response.status_code == 201
    return response.json()


# --- manual overrides -----------------------------------------------------------


def test_edit_entry_content_category_tags(client):
    entry = _save(client, "a note the AI got wrong")
    response = client.put(
        f"/entries/{entry['id']}",
        json={"content": "corrected note", "category": "Jokes", "tags": ["fixed"]},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["content"] == "corrected note"
    assert body["category"] == "Jokes"  # created on the fly
    assert body["tags"] == ["fixed"]


def test_guided_entry_skips_janitor(ai_client, fake_ollama):
    calls_before = len(fake_ollama.chat_calls)
    entry = _save(ai_client, "definitely a recipe", category="Recipes")
    assert entry["category"] == "Recipes"
    assert entry["filed_by"] == "user"
    assert entry["ai_confidence"] == 100
    assert len(fake_ollama.chat_calls) == calls_before  # AI never consulted


# --- linking ---------------------------------------------------------------------


def test_link_and_unlink_entries(client):
    first = _save(client, "the joke about cheese")
    second = _save(client, "heard at Dave's party")

    linked = client.post(f"/entries/{first['id']}/links", json={"target_id": second["id"]})
    assert linked.status_code == 200
    links = linked.json()["links"]
    assert len(links) == 1 and links[0]["entry_id"] == second["id"]

    # Both directions see it; duplicates (either way) are rejected.
    assert client.get(f"/entries/{second['id']}").json()["links"][0]["entry_id"] == first["id"]
    dup = client.post(f"/entries/{second['id']}/links", json={"target_id": first["id"]})
    assert dup.status_code == 400
    assert (
        client.post(f"/entries/{first['id']}/links", json={"target_id": first["id"]}).status_code
        == 400
    )

    unlinked = client.delete(f"/entries/{first['id']}/links/{links[0]['link_id']}")
    assert unlinked.json()["links"] == []


# --- audit, export, preferences ---------------------------------------------------


def test_audit_viewer_lists_actions(client):
    entry = _save(client, "watch me get logged")
    client.delete(f"/entries/{entry['id']}")
    actions = [row["action"] for row in client.get("/audit").json()]
    assert "created" in actions and "deleted" in actions
    # Newest first.
    assert actions[0] == "deleted"


def test_export_json_includes_binned_entries(client):
    keep = _save(client, "keeper", tags=["a"])
    binned = _save(client, "binned")
    client.delete(f"/entries/{binned['id']}")

    body = client.get("/export/json").json()
    by_id = {e["id"]: e for e in body["entries"]}
    assert by_id[keep["id"]]["is_deleted"] is False
    assert by_id[binned["id"]]["is_deleted"] is True
    assert by_id[keep["id"]]["tags"] == ["a"]


def test_export_csv_parses(client):
    _save(client, 'tricky "quoted, csv" content')
    response = client.get("/export/csv")
    assert response.status_code == 200
    rows = list(csv.reader(io.StringIO(response.text)))
    assert rows[0][:3] == ["id", "content", "category"]
    assert rows[1][1] == 'tricky "quoted, csv" content'


def test_preferences_roundtrip(client):
    assert client.get("/preferences").json()["recycle_bin_days"] == 30
    updated = client.put(
        "/preferences", json={"recycle_bin_days": 7, "communication_style": "concise"}
    ).json()
    assert updated["recycle_bin_days"] == 7
    assert updated["communication_style"] == "concise"
    # Persisted for real.
    assert deps.get_config().get_preference("recycle_bin_days") == 7


def test_display_name_preference_roundtrip(client):
    assert client.get("/preferences").json()["display_name"] == ""
    updated = client.put("/preferences", json={"display_name": "Brayden"}).json()
    assert updated["display_name"] == "Brayden"
    assert deps.get_config().get_preference("display_name") == "Brayden"
    # An empty string clears it (not excluded like None).
    assert client.put("/preferences", json={"display_name": ""}).json()["display_name"] == ""
    # Over-long names are rejected.
    assert client.put("/preferences", json={"display_name": "x" * 61}).status_code == 422


def test_preferences_validated(client):
    assert client.put("/preferences", json={"recycle_bin_days": 0}).status_code == 422
    assert (
        client.put("/preferences", json={"communication_style": "sarcastic"}).status_code
        == 422
    )


def test_autonomous_and_battery_preferences_round_trip_through_get(client):
    """`get_preferences()` is a hand-built dict, and eight keys — every
    Autonomous Background Workers toggle, the battery mode switch, and smart
    model routing — were settable and correctly *honoured* (`autonomous.py`
    and `model_manager.py` both read them straight from storage) but never
    once echoed back here. Every Settings checkbox bound to one of them
    showed unchecked again the moment the page reloaded, regardless of what
    had actually been saved and was actually in effect."""
    client.put(
        "/preferences",
        json={
            "autonomous_tasks_enabled": True,
            "auto_tag_enabled": False,
            "auto_link_enabled": False,
            "auto_dedupe_enabled": False,
            "autonomous_tasks_interval_hours": 2,
            "autonomous_tasks_model": "phi3.5",
            "battery_efficient_mode": True,
            "smart_model_routing_enabled": False,
        },
    )
    fresh = client.get("/preferences").json()
    assert fresh["autonomous_tasks_enabled"] is True
    assert fresh["auto_tag_enabled"] is False
    assert fresh["auto_link_enabled"] is False
    assert fresh["auto_dedupe_enabled"] is False
    assert fresh["autonomous_tasks_interval_hours"] == 2
    assert fresh["autonomous_tasks_model"] == "phi3.5"
    assert fresh["battery_efficient_mode"] is True
    assert fresh["smart_model_routing_enabled"] is False


def test_notification_mute_preference_round_trips_through_get(client):
    assert client.get("/preferences").json()["notifications_muted_except_reminders"] is False
    client.put("/preferences", json={"notifications_muted_except_reminders": True})
    assert client.get("/preferences").json()["notifications_muted_except_reminders"] is True


def test_saving_an_autonomous_preference_wakes_the_scheduler(client, monkeypatch):
    """Battery mode, the on/off toggle and the interval used to only be read
    once per scheduled tick — up to six hours away — so switching one off
    (or back on) silently did nothing until then. Saving one now has to wake
    the loop so the change is read on the very next tick."""
    from memorymap.ai import autonomous

    woken = []
    monkeypatch.setattr(autonomous, "wake", lambda: woken.append(True))

    client.put("/preferences", json={"battery_efficient_mode": True})
    assert woken == [True]

    woken.clear()
    client.put("/preferences", json={"display_name": "unrelated change"})
    assert woken == []
