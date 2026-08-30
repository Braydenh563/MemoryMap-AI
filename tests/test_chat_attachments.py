"""Attachments belong to the message, not just to the composer (§ chat).

Reported directly:

    "images and files uploaded into a chat conversation arent rendered with
     the chat messages, the captions arent viewable under the image cards…
     and they arent previewable or quick navigatable to their stored location
     in the library or documents etc or viewable in a better environment"

All of it was true, and the cause was one missing half: the ids were stored
(the model needs them, and `media_gc` needs them) and nothing on the read path
ever turned an id back into a picture. A bubble cannot render what the server
does not send.
"""

from __future__ import annotations

from pathlib import Path


def _conversation_with(client, **turn):
    body = {"question": "what is this?", "answer": "a picture", **turn}
    return client.post("/conversations", json=body).json()


def _upload(client, name="pic.png"):
    tiny = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
        b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    return client.post("/media/upload", files={"file": (name, tiny, "image/png")}).json()


def test_an_attached_image_comes_back_renderable(client):
    """Ids are what gets stored; a url, a name and the readings are what a
    bubble needs. Resolved once for the whole conversation on read rather than
    one request per attachment per reopen."""
    upload = _upload(client)
    conversation = _conversation_with(client, image_media_ids=[upload["id"]])

    full = client.get(f"/conversations/{conversation['id']}").json()
    user = full["messages"][0]
    assert user["image_media_ids"] == [upload["id"]]
    attachment = user["attachments"][0]
    assert attachment["kind"] == "image"
    assert attachment["url"] == upload["url"]
    assert attachment["name"] == "pic.png"
    # Present even when empty, so the renderer never has to null-check.
    assert attachment["caption"] == ""
    assert attachment["text"] == ""


def test_the_caption_and_the_reading_travel_with_the_picture(client):
    """"the captions arent viewable under the image cards" — they are the
    reason to show a caption at all, and the same two readings the Library
    tile shows, so one picture reads the same way everywhere."""
    from memorymap.core.database import MediaUpload

    upload = _upload(client)
    from memorymap.core import deps

    with deps.get_db().session() as session:
        row = session.get(MediaUpload, upload["id"])
        row.caption = "A leafy pokemon by a pond"
        row.vision_ocr_text = "24-12-2018"
        session.commit()

    conversation = _conversation_with(client, image_media_ids=[upload["id"]])
    attachment = client.get(f"/conversations/{conversation['id']}").json()["messages"][0][
        "attachments"
    ][0]
    assert attachment["caption"] == "A leafy pokemon by a pond"
    assert attachment["text"] == "24-12-2018"


def test_a_vision_reading_wins_over_the_offline_one(client):
    """Same precedence the Library tile uses — the AI reading is the one the
    app keeps working with, and showing both in one line would read as one
    doubled transcription."""
    from memorymap.core.database import MediaUpload

    upload = _upload(client)
    from memorymap.core import deps

    with deps.get_db().session() as session:
        row = session.get(MediaUpload, upload["id"])
        row.ocr_text = "offline"
        row.vision_ocr_text = "by the model"
        session.commit()
    conversation = _conversation_with(client, image_media_ids=[upload["id"]])
    text = client.get(f"/conversations/{conversation['id']}").json()["messages"][0][
        "attachments"
    ][0]["text"]
    assert text == "by the model"


def test_an_attached_document_comes_back_as_a_way_to_open_it(client):
    """A non-image dropped on the chat is imported into Documents. There is
    nothing to preview inline — its text may be a hundred pages — so the
    navigation *is* the render."""
    document = client.post("/documents", json={"title": "Assignment brief"}).json()
    conversation = _conversation_with(client, document_ids=[document["id"]])

    user = client.get(f"/conversations/{conversation['id']}").json()["messages"][0]
    assert user["attachments"] == [
        {"id": document["id"], "kind": "document", "name": "Assignment brief"}
    ]


def test_both_kinds_ride_on_one_message(client):
    """A person attaching a photo and a spreadsheet in one go is doing one
    thing, and the app must not treat it as two."""
    upload = _upload(client)
    document = client.post("/documents", json={"title": "Notes"}).json()
    conversation = _conversation_with(
        client, image_media_ids=[upload["id"]], document_ids=[document["id"]]
    )
    kinds = [
        a["kind"]
        for a in client.get(f"/conversations/{conversation['id']}").json()["messages"][0][
            "attachments"
        ]
    ]
    assert kinds == ["image", "document"]


def test_a_deleted_attachment_is_absent_rather_than_an_error(client):
    """An upload can be deleted from the Library long after the message that
    carried it. The bubble then shows one fewer thumbnail, which is what
    happened before any of this existed — it must not 404 the conversation."""
    upload = _upload(client)
    conversation = _conversation_with(client, image_media_ids=[upload["id"]])
    client.delete(f"/media/{upload['id']}")

    full = client.get(f"/conversations/{conversation['id']}")
    assert full.status_code == 200
    assert "attachments" not in full.json()["messages"][0]


def test_a_message_with_nothing_attached_gains_no_key(client):
    """Absent, not an empty list: every existing turn in every saved chat
    would otherwise grow a key, and the renderer already treats missing as
    nothing to draw."""
    conversation = _conversation_with(client)
    assert "attachments" not in client.get(f"/conversations/{conversation['id']}").json()[
        "messages"
    ][0]


# --- the frontend half, which no Python test can execute ------------------------


def test_the_bubble_renders_the_strip_on_both_paths():
    """A live send and a reopen have to draw the same thing, and they used to
    draw nothing and nothing. Asserted against the source because there is no
    DOM here — the same reason test_frontend_ids.py exists."""
    source = Path("frontend/app.js").read_text(encoding="utf-8")
    assert "function chatAttachmentStrip(" in source
    # The reopen path.
    assert 'addBubble("user", message.content, message.attachments)' in source
    # The live path, which builds its cards from the composer before it is
    # cleared — after that there is nothing left to build them from.
    assert "sentAttachmentCards" in source
    assert 'addBubble("user", opts.displayText || question, sentAttachmentCards)' in source


def test_the_strip_offers_a_preview_and_a_way_back():
    source = Path("frontend/app.js").read_text(encoding="utf-8")
    strip = source.split("function chatAttachmentStrip(")[1].split("\nfunction addBubble(")[0]
    assert "openLightbox(" in strip, "the thumbnail must open the full-size view"
    assert "figcaption" in strip, "the caption has to be visible under the card"
    assert 'switchTab("library")' in strip
    assert 'switchTab("documents")' in strip and "openDocument(" in strip


def test_the_ids_are_persisted_by_the_send_path():
    source = Path("frontend/app.js").read_text(encoding="utf-8")
    assert source.count("document_ids: sentDocuments") == 2, (
        "both save paths — the partial written mid-stream and the final one"
    )
