"""The chat controls live with the chat input, not above the conversation.

Asked for directly: *"I was thinking of moving the majority of the ui controls
like the chat/agent pull, web search and stuff to the bottom bar with the chat
input."*

The split the dock encodes is between two questions a control can answer:

- **what happens to the next message** — Chat/Agent, Web, answer length,
  persona, the skill picker, the notes clipped to it. These belong beside the
  box you type in, because that is when you decide them.
- **what this conversation is** — its name, what it has cost, exporting it.
  Those stay in the header, which is now only about the thread as a whole.

This is a lint, not a behaviour test, and it exists for the same reason
`test_frontend_ids.py` does: the Python suite cannot see the DOM and the
sandbox has no browser, so nothing else would notice a control drifting back
up into the header — which is exactly how the header collected eight
unrelated buttons the first time (§36B).

It deliberately checks *containment*, not order or styling. Rearranging the
dock is fine; putting the response-mode picker back above a scrolled
conversation is what this catches.
"""

from __future__ import annotations

import re
from pathlib import Path

INDEX = Path(__file__).resolve().parents[1] / "frontend" / "index.html"

#: Controls that decide what happens to the *next* message.
PER_MESSAGE_IDS = (
    "chat-mode-seg",
    "tools-toggle",
    "web-search-toggle",
    "response-mode-select",
    "persona-select",
    "persona-peek",
    "chat-input",
    "chat-send",
    "chat-skills",
    "chat-attachments",
    "attach-note",
)

#: …and the ones that are about the conversation, not the message.
CONVERSATION_IDS = ("chat-title", "chat-export", "chat-usage")


def _markup() -> str:
    """index.html with comments stripped — they quote tags and ids."""
    return re.sub(r"<!--.*?-->", "", INDEX.read_text(encoding="utf-8"), flags=re.S)


def _block(markup: str, opening: str) -> str:
    """The markup of one element, by walking div depth from its opening tag.

    A regex cannot match nested elements and an HTML parser is a dependency
    this suite does not have. Counting `<div` against `</div>` is enough here
    because both regions are div-nested throughout.
    """
    start = markup.index(opening)
    depth = 0
    for match in re.finditer(r"<div\b|</div>", markup[start:]):
        depth += 1 if match.group(0) == "<div" else -1
        if depth == 0:
            return markup[start : start + match.end()]
    raise AssertionError(f"{opening} is never closed")


def test_every_per_message_control_is_in_the_dock():
    dock = _block(_markup(), '<div class="chat-dock">')
    missing = [name for name in PER_MESSAGE_IDS if f'id="{name}"' not in dock]
    assert not missing, (
        "these controls decide what happens to the next message and belong "
        f"beside the box that sends it: {missing}"
    )


def test_the_header_keeps_only_the_conversation_level_controls():
    markup = _markup()
    toolbar = _block(markup, '<div class="chat-toolbar">')
    for name in CONVERSATION_IDS:
        assert f'id="{name}"' in toolbar, f"{name} is about the conversation"
    strays = [name for name in PER_MESSAGE_IDS if f'id="{name}"' in toolbar]
    assert not strays, (
        "the chat header is about the conversation as a whole; these are about "
        f"the next message and belong in the dock: {strays}"
    )


def test_a_panel_opens_beside_the_button_that_opens_it():
    """Both moved down with their triggers. A toggle at the bottom of the page
    that opens a panel at the top reads as a button that does nothing."""
    dock = _block(_markup(), '<div class="chat-dock">')
    assert 'id="web-panel"' in dock
    assert 'id="persona-peek-panel"' in dock
