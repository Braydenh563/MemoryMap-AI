"""`GET /documents/outline`: the headings the Library's Contents index nests
under each document (INBOX 445 (1))."""

from __future__ import annotations


def test_outline_lists_headings_with_zero_based_lines(client):
    client.post(
        "/documents",
        json={"title": "Plan", "content": "# Goal\ntext\n## Steps\nmore\n### Detail ###\n"},
    )
    rows = client.get("/documents/outline").json()
    assert [r["title"] for r in rows] == ["Plan"]
    assert rows[0]["headings"] == [
        {"line": 0, "level": 1, "text": "Goal"},
        {"line": 2, "level": 2, "text": "Steps"},
        {"line": 4, "level": 3, "text": "Detail"},
    ]


def test_a_comment_in_fenced_code_is_not_a_section(client):
    client.post(
        "/documents",
        json={"title": "Fenced", "content": "# Real\n```\n# not a heading\n```\n## Also real\n"},
    )
    heads = client.get("/documents/outline").json()[0]["headings"]
    assert [h["text"] for h in heads] == ["Real", "Also real"]


def test_a_code_document_has_no_headings(client):
    client.post("/documents", json={"title": "script", "content": "# a comment\nx = 1\n", "file_type": "py"})
    assert client.get("/documents/outline").json()[0]["headings"] == []


def test_outline_is_not_swallowed_by_the_document_id_route(client):
    assert client.get("/documents/outline").status_code == 200
