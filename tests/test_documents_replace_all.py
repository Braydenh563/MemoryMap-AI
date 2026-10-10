"""DOCUMENTS_PLAN 24 row 9 (Brief 76): replace in every document, one undo step.

`POST /documents/contents` writes many documents' text in one transaction:
the replace sends the results, its undo the originals. Driven in the app by
`scratchpad/ui-sweeps/docreplace76.js` (fifty documents, one Ctrl+Z).
"""

from __future__ import annotations


def _make(client, title, content):
    return client.post("/documents", json={"title": title, "content": content}).json()


def test_fifty_documents_are_written_and_written_back_whole(client):
    docs = [_make(client, f"Doc {n}", f"colour {n} and colour") for n in range(50)]
    replaced = [{"id": d["id"], "content": d["content"].replace("colour", "color")} for d in docs]
    first = client.post("/documents/contents", json={"documents": replaced})
    assert first.status_code == 200 and len(first.json()["updated"]) == 50
    did = docs[7]["id"]
    seven = client.get(f"/documents/{did}").json()
    assert seven["content"] == "color 7 and color"
    history = client.get(f"/documents/{did}/revisions").json()
    assert len(history) == 1, "the version it replaced is kept"
    back = client.post("/documents/contents", json={"documents": [{"id": d["id"], "content": d["content"]} for d in docs]})
    assert len(back.json()["updated"]) == 50
    after = [client.get(f"/documents/{d['id']}").json()["content"] for d in docs]
    assert after == [d["content"] for d in docs]


def test_an_unknown_id_writes_nothing(client):
    doc = _make(client, "Kept", "same words")
    refused = client.post(
        "/documents/contents",
        json={"documents": [{"id": doc["id"], "content": "changed"}, {"id": 999999, "content": "x"}]},
    )
    assert refused.status_code == 404
    kept = client.get(f"/documents/{doc['id']}").json()
    assert kept["content"] == "same words"


def test_an_unchanged_document_is_not_history(client):
    doc = _make(client, "Same", "unchanged")
    same = client.post("/documents/contents", json={"documents": [{"id": doc["id"], "content": "unchanged"}]})
    assert same.json()["updated"] == []
    twice = client.post("/documents/contents", json={"documents": [{"id": doc["id"], "content": "a"}, {"id": doc["id"], "content": "b"}]})
    assert twice.status_code == 422


def test_the_dialog_replaces_through_one_request_and_one_undo_step():
    from tests._app_js import INDEX_HTML, JS_DIR

    js = (JS_DIR / "documents.js").read_text(encoding="utf-8")
    start = js.index("async function runDocReplace(")
    body = js[start: js.index("\n}\n", start)]
    assert "offerUndo(" in body and "docWriteContents(before)" in body
    assert '"/documents/contents"' in js
    assert 'id: "replace-documents"' in js and "openDocReplace()" in js
    html = INDEX_HTML.read_text(encoding="utf-8")
    for control in ("doc-replace-find", "doc-replace-with", "doc-replace-regex", "doc-replace-case", "doc-replace-run"):
        assert f'id="{control}"' in html, control
