"""The suggestions inbox's decisions bound what they store (sweep 1004): each
signal name is kept in the learning table for ever, so a name is a word, not
a document."""

from __future__ import annotations


def test_a_dismissal_with_a_huge_signal_name_is_refused(client):
    body = {"a": 1, "b": 2, "signals": ["x" * 5000]}
    assert client.post("/suggestions/merges/dismiss", json=body).status_code == 422
    body = {"keep_id": 1, "merge_id": 2, "signals": ["x" * 5000]}
    assert client.post("/suggestions/merges/accept", json=body).status_code == 422


def test_ordinary_signal_names_still_pass(client):
    body = {"a": 1, "b": 2, "signals": ["shared_note", "same_initial"]}
    assert client.post("/suggestions/merges/dismiss", json=body).status_code == 200
