"""The "Learned from you" line (WORLD_CLASS_PLAN row 20, I7): how many
corrections, and filing accuracy over the last notes the AI filed, earlier
half against later half, computed from the rows, never estimated."""

from __future__ import annotations

from memorymap.ai import learning
from memorymap.entry import manager


def _auto_filed(session, text: str, category: str):
    entry = manager.create_entry(session, text, category_name=category, tags=[], ai_confidence=80)
    entry.filing_state = manager.AUTO_FILED
    session.commit()
    return entry


def test_a_move_by_hand_out_of_an_auto_filed_category_reaches_the_refile_reader(session):
    """`update_entry` writes the correction with "moved from" in `detail`, and
    `corrections(kind="refile")` narrowed on a "refile:" prefix: every refile
    made in the app was invisible to the filing prompt and the centroid."""
    entry = _auto_filed(session, "side project landing page copy", "Work")
    manager.update_entry(session, entry, category_name="Side project")
    rows = learning.corrections(session, kind="refile")
    assert [(r.from_value, r.to_value) for r in rows] == [("Work", "Side project")]


def test_accuracy_compares_the_earlier_half_with_the_later(session):
    notes = [_auto_filed(session, f"note {i}", "Work") for i in range(20)]
    # Four of the first ten were moved by hand, one of the last ten.
    for entry in notes[:4] + notes[15:16]:
        manager.update_entry(session, entry, category_name="Home")
    manager.create_entry(session, "filed by hand", category_name="Home", tags=[])
    learning.record(session, kind="dismiss_link", subject={"a": 1, "b": 2})
    session.commit()
    out = learning.filing_accuracy(session)
    assert out["notes"] == 20
    assert out["refiles"] == 5
    assert out["corrections"] == 6
    assert out["accuracy"] == 75
    assert (out["earlier"], out["later"]) == (60, 90)


def test_too_few_notes_gives_one_number_and_none_gives_none(session):
    assert learning.filing_accuracy(session)["accuracy"] is None
    for i in range(4):
        _auto_filed(session, f"note {i}", "Work")
    out = learning.filing_accuracy(session)
    assert out["accuracy"] == 100 and out["earlier"] is None


def test_the_window_is_the_last_notes_filed(session):
    for i in range(30):
        _auto_filed(session, f"note {i}", "Work")
    assert learning.filing_accuracy(session, window=10)["notes"] == 10


def test_the_route_reports_it(ai_client):
    body = ai_client.get("/learned/summary").json()
    assert set(body) >= {"corrections", "refiles", "notes", "accuracy", "earlier", "later", "window"}
