"""INBOX 434: making a note is the fastest, safest thing in the app.

Measured with `scratchpad/ui-sweeps/captureaudit.js`; each test names the
number it holds."""

from __future__ import annotations

from pathlib import Path

from tests._app_js import app_js_text

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "frontend" / "js"


def test_a_paste_or_drop_on_the_mounted_editor_reaches_its_note_box():
    """An image pasted into Capture and a file dropped on it both vanished
    (0 attachment cards) because the listeners only answered a bare
    textarea; the live editor is mounted over it. After: 1 and 2 cards."""
    code = app_js_text()
    assert "function fileDropBox(el)" in code
    assert '?.closest?.(".note-surface")?.noteSurfaceHost' in code
    assert "await handleFileUpload(box, files);\n}, true);" in code


def test_inline_tags_are_read_from_the_text():
    from memorymap.entry.tagnames import inline_tags

    text = (
        "Recipe #cooking and #soup\n# Heading\n#42 https://a.com/p#sec &#39; ##x "
        "#ff0000 #cafe [#link](u) `#code`\n```\n#include\n```\n#project/garden- #Cooking"
    )
    assert inline_tags(text) == ["cooking", "soup", "cafe", "link", "project/garden"]
    assert inline_tags("") == []


def test_a_note_written_with_hashtags_is_tagged_when_asked(client):
    """Before: `#cooking #soup` in Capture saved with tags []."""
    asked = client.post(
        "/entries", json={"content": "Soup tonight #cooking #soup", "tags": ["Cooking", "x"], "inline_tags": True}
    ).json()
    assert asked["tags"] == ["Cooking", "x", "soup"]
    # Off unless asked: an import's or the AI's text is not a person's labels.
    plain = client.post("/entries", json={"content": "Soup #cooking"}).json()
    assert plain["tags"] == []


def test_the_same_note_sent_twice_by_the_outbox_is_saved_once(client):
    body = {"content": "Queued while the server was down", "client_key": "k-434-a", "defer_filing": True}
    first = client.post("/entries", json=body).json()
    again = client.post("/entries", json=body).json()
    assert again["id"] == first["id"]
    other = client.post("/entries", json={**body, "client_key": "k-434-b"}).json()
    assert other["id"] != first["id"]
