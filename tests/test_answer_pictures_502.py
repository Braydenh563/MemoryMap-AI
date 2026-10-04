"""An answer grounded in a note with pictures shows them beside its citation
(INBOX 502).

The owner: "should the ai chats be able to pull images and sketches and render
them in chat responses?? with accompanying references and hyperlinks??"
Decision, taken: yes. The citation chip still opens the note; up to three
lazy, sized thumbnails beside it open the picture in the lightbox; their alt
text is the caption or the text read off the picture; the model is told which
notes have pictures so it can point at one by the note's number. Driven in
Chromium by the session's `pictures502.js`; this is the server half and the
cheap half of the client.
"""

from __future__ import annotations

from pathlib import Path

JS = Path(__file__).resolve().parent.parent / "frontend" / "js"


def test_picture_alts_come_from_the_caption_then_the_reading(session):
    from memorymap.api.routes_chat import _picture_alts
    from memorymap.core.database import Entry, MediaUpload

    session.add_all(
        [
            MediaUpload(filename="cap.png", original_name="board.png", caption="a sprint board", ocr_text="TODO"),
            MediaUpload(filename="ocr.png", original_name="page.png", vision_ocr_text="  Offline\nbanner  ideas "),
            MediaUpload(filename="none.png", original_name="none.png"),
        ]
    )
    session.commit()
    entries = [
        Entry(content="![](/media/cap.png) and ![x](/media/ocr.png)"),
        Entry(content="![](/media/none.png) ![](/media/cap.png)"),
        Entry(content="no pictures"),
    ]
    alts = _picture_alts(session, entries)
    assert alts == {"/media/cap.png": "a sprint board", "/media/ocr.png": "Offline banner ideas"}
    assert _picture_alts(session, [Entry(content="words only")]) == {}


def test_the_chat_answer_carries_the_alts_and_the_prompt_names_the_pictures(ai_client, fake_ollama, session):
    from memorymap.core.database import MediaUpload

    session.add(MediaUpload(filename="moss123.png", original_name="moss.png", caption="moss on a wall"))
    session.commit()
    ai_client.post("/entries", json={"content": "Moss photo from the walk:\n\n![moss.png](/media/moss123.png)"})
    body = ai_client.post("/chat", json={"question": "what did I photograph on the walk? moss"}).json()
    assert body["picture_alts"] == {"/media/moss123.png": "moss on a wall"}
    prompt = "\n".join(str(m.get("content", "")) for m in fake_ollama.chat_calls[-1])
    assert "(has 1 picture, shown beside it;" in prompt
    assert '"the picture in note 1" points at one' in prompt


def test_the_turn_keeps_the_alts_for_a_reopened_chat(client):
    created = client.post(
        "/conversations",
        json={
            "question": "q",
            "answer": "a",
            "picture_alts": {"/media/a.png": "a cat", "javascript:alert(1)": "no"},
        },
    ).json()
    messages = client.get(f"/conversations/{created['id']}").json()["messages"]
    assert messages[1]["picture_alts"] == {"/media/a.png": "a cat"}


def test_the_client_draws_thumbnails_beside_the_chip():
    ask = (JS / "capture-ask.js").read_text(encoding="utf-8")
    start = ask.index("function groundingThumbs(pictures, n, alts)")
    thumbs = ask[start : ask.index("\n}\n", start)]
    for needle in ('img.loading = "lazy"', "img.width = 32", "img.height = 32", "img.alt = words ||", "openLightbox(items, i)"):
        assert needle in thumbs
    grounding = ask[ask.index("function renderAnswerGrounding(") :][:6000]
    assert "support = null, pictureAlts = null" in grounding
    assert "groundingThumbs(pictures, n, pictureAlts)" in grounding
    # Every caller hands the alts on: live Chat, live Ask, a reopened chat.
    assert "meta?.picture_alts || null" in (JS / "chat-attach.js").read_text(encoding="utf-8")
    assert "answerMeta?.picture_alts || null" in ask
    assert "message.picture_alts || null" in (JS / "sheets-selects.js").read_text(encoding="utf-8")
