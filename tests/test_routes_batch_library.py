"""Named-route tests: the board library's libraries, copies and restore (ledger 1573)."""

from __future__ import annotations

from tests.test_board_library import _save


def test_a_library_is_created_renamed_and_deleted_and_its_items_move_to_yours(client):
    created = client.post("/board-library/libraries", json={"name": "Flow shapes"})
    assert created.status_code == 201
    library_id = created.json()["id"]
    renamed = client.put(f"/board-library/libraries/{library_id}", json={"name": "Flow"})
    assert renamed.json()["name"] == "Flow"
    deleted = client.delete(f"/board-library/libraries/{library_id}")
    assert deleted.status_code == 200 and deleted.json()["deleted"] == library_id
    gone = client.put(f"/board-library/libraries/{library_id}", json={"name": "Again"})
    assert gone.status_code == 404


def test_a_library_item_is_duplicated_and_a_deleted_one_restored(client):
    item_id = _save(client)["id"]
    copy = client.post(f"/board-library/{item_id}/duplicate")
    assert copy.status_code == 201 and copy.json()["name"].endswith("(copy)")
    client.delete(f"/board-library/{item_id}")
    restored = client.post(f"/board-library/{item_id}/restore")
    assert restored.status_code == 200 and restored.json()["id"] == item_id
