"""Each assistant reply wears the face of the persona that wrote it.

The owner: "if different personas are used in different chats for the chat
messages the avatars need to persist for what persona was used." Before this,
every assistant bubble drew the app's emblem and read its name off the live
persona picker, so switching persona relabelled every reply already on the
page, and a reopened chat claimed the current persona wrote all of it.

The suite cannot open a browser, so these hold the DOM-shaped facts as text:
the bubble builder takes the persona, both paths hand it one, the live path
captures it once and saves it with the turn, and nothing reads the picker to
name a reply after the fact. `scratchpad/ui-sweeps/personamarks.js` measures
the rendered marks.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = (ROOT / "frontend" / "app.js").read_text(encoding="utf-8")


def _function(name: str) -> str:
    return APP.split(f"function {name}(", 1)[1].split("\nfunction ", 1)[0]


def test_the_assistant_bubble_takes_the_persona_that_wrote_it() -> None:
    bubble = _function("addAssistantBubble")
    assert bubble.startswith("persona"), "addAssistantBubble no longer takes a persona"
    #: A persona's mark goes through the one helper (DESIGN.md's recipe index,
    #: "A mark generated from a name"), never a second builder.
    assert "paintPersonaAvatar(avatar," in bubble
    assert "dataset.persona" in bubble, "the bubble does not record whose reply it is"
    #: The name beside the mark is the writer's, not the picker's.
    assert "assistantLabel()" not in bubble


def test_the_default_assistant_keeps_the_live_emblem() -> None:
    """Atlas is the app's own voice and keeps the app's emblem, as today; any
    other persona gets its generated face."""
    painter = _function("paintPersonaAvatar")
    assert "renderEmblem(holder" in painter
    assert "nameMark(" in painter or "fillPersonaMark(" in painter
    assert "aiNameNow()" in painter


def test_a_reopened_reply_is_drawn_with_its_saved_persona() -> None:
    reopen = _function("openConversation")
    assert "addAssistantBubble(message.persona" in reopen, (
        "openConversation draws replies without the persona saved on them"
    )


def test_the_live_reply_captures_the_persona_once_and_saves_it() -> None:
    """Captured before the bubble is drawn, the way `effectiveUseTools` is: the
    picker can move on while this reply is still streaming, and the bubble, the
    request and the saved turn must all name the persona that answered."""
    assert re.search(r"const sentPersona = [^;]*persona-select", APP)
    assert "addAssistantBubble(sentPersona)" in APP
    assert "persona: sentPersona," in APP, "the request does not send the captured persona"
    # The checkpoint and the final save both carry it, as null for the app's
    # own voice so a renamed AI keeps its emblem on older replies.
    assert APP.count("persona: savedPersona(sentPersona),") >= 2
    saved = _function("savedPersona")
    assert "aiNameNow()" in saved and "null" in saved


def test_nothing_names_an_old_reply_after_the_live_picker() -> None:
    """The transcript copy names each reply by its own writer too."""
    transcript = _function("chatTranscriptText")
    assert "assistantLabel()" not in transcript
    assert "dataset.persona" in transcript
