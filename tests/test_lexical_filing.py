"""Filing with no model: the notebook's own words (INBOX 434).

Before, with no chat model and no embedding model, every note went to
Uncategorised while the log said "the keyword fallback". These pin the real
fallback: it files from the notes already filed, says so, abstains when
unsure, and a move by hand afterwards is a correction it learns from.
"""

from __future__ import annotations

import time

from memorymap.ai import lexical_filing
from memorymap.ai.lexical_filing import tokens


def _wait_settled(client, entry_id, timeout=10.0):
    deadline = time.time() + timeout
    status = {}
    while time.time() < deadline:
        status = client.get(f"/entries/{entry_id}/filing").json()
        if status["filing_state"] != "pending":
            return status
        time.sleep(0.05)
    return status


def _seed(client):
    for content, category in (
        ("Leg day: squats 5x5 at 80kg, deadlifts after", "Gym"),
        ("Bench press PR today, 60kg for 3 reps", "Gym"),
        ("Rowing machine 2k in 8 minutes, then squats", "Gym"),
        ("Pasta with garlic, chilli and lemon, serves two", "Recipes"),
        ("Banana bread: three bananas, flour, sugar, bake 50 minutes", "Recipes"),
        ("Lemon chicken traybake with potatoes and garlic", "Recipes"),
    ):
        client.post("/entries", json={"content": content, "category": category})


def _file(client, content):
    created = client.post("/entries", json={"content": content, "defer_filing": True}).json()
    return _wait_settled(client, created["id"]), created["id"]


def test_words_are_folded_and_stop_words_dropped():
    assert tokens("The Squats and the bananas, Cities!") == ["squat", "banana", "city"]
    assert tokens("5x5 at 80kg") == ["5x5", "80kg"]
    assert tokens("it is what it is") == []


def test_a_note_files_by_the_notebooks_own_words_with_no_model(client):
    _seed(client)
    status, _ = _file(client, "squats and deadlifts again, felt strong")
    assert status["category"] == "Gym"
    assert status["filed_by"] == "words"
    status, _ = _file(client, "garlic and lemon pasta for dinner")
    assert status["category"] == "Recipes"


def test_it_abstains_rather_than_guessing(client):
    _seed(client)
    status, _ = _file(client, "call the plumber about the boiler")
    assert status["category"] == "Uncategorised"
    assert status["filed_by"] == "none"


def test_a_category_named_in_the_note_counts(client):
    _seed(client)
    status, _ = _file(client, "gym: new shoes arrived")
    assert status["category"] == "Gym"


def test_a_category_needs_two_examples(client):
    client.post("/entries", json={"content": "quarterly tax return lodged", "category": "Tax"})
    status, _ = _file(client, "tax return reminder")
    assert status["category"] == "Uncategorised"


def test_moving_a_words_filed_note_is_a_correction(client):
    _seed(client)
    status, entry_id = _file(client, "squats and deadlifts again")
    assert status["filing_state"] == "words"
    moved = client.put(f"/entries/{entry_id}", json={"category": "Recipes"})
    assert moved.status_code == 200
    after = client.get(f"/entries/{entry_id}/filing").json()
    assert after["filing_state"] == "done"
    assert after["filed_by"] == "user"


def test_it_stays_fast_on_a_large_notebook(client):
    from memorymap.core import deps

    words = "alpha beta gamma delta epsilon zeta eta theta iota kappa".split()
    with deps.get_db().session() as session:
        from memorymap.entry import manager

        for i in range(800):
            manager.create_entry(session, f"{words[i % 10]} note {i} about {words[(i * 3) % 10]}", category_name=f"C{i % 8}")
        session.commit()
        started = time.perf_counter()
        lexical_filing.lexical_category(session, "alpha gamma note")
        assert time.perf_counter() - started < 0.5
