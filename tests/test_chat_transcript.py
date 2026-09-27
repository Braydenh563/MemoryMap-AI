"""The chat transcript: what it costs to draw, and what a reply looks like
(the 2026-09-26 chat pass, `scratchpad/ui-sweeps/chataudit.js`).

The numbers live in the sweep, which needs a browser; what these hold is the
shape that produced them, so a later change cannot quietly undo it.
"""

from __future__ import annotations

import re
from pathlib import Path

from tests._app_js import app_js_text

ROOT = Path(__file__).resolve().parents[1]
CSS = "\n".join(p.read_text(encoding="utf-8") for p in sorted((ROOT / "frontend" / "css").glob("*.css")))


def _function(source: str, name: str) -> str:
    start = source.index(f"function {name}(")
    return source[start : source.index("\n}\n", start)]


def test_a_reply_label_copies_the_emblem_rather_than_starting_a_sketch() -> None:
    """Opening a 150-turn chat took 939ms, 763ms of it in `renderEmblem`: a
    p5 instance per reply for the same pixels. Only the first reply of a key
    draws with p5; the rest copy its canvas (939 to 409ms measured)."""
    app = app_js_text()
    paint = _function(app, "paintPersonaAvatar")
    assert "paintChatEmblem(holder, size)" in paint
    assert "renderEmblem" not in paint, "the reply label builds a p5 sketch per bubble again"
    emblem = _function(app, "paintChatEmblem")
    assert emblem.count("renderEmblem(") == 1, "only the first of a key may draw with p5"
    assert "drawImage(source, 0, 0)" in emblem
    key = _function(app, "chatEmblemKey")
    for part in ("size", "currentAccentHex", 'appearancePref("motion")'):
        assert part in key, f"the copy is not keyed on {part}: a stale mark would be copied"


def test_a_code_block_in_an_answer_is_not_a_run_of_inline_chips() -> None:
    """`.msg.assistant .bubble-answer code` matched a fenced block's `code`
    too and out-ranked its reset, so every line wore an inline chip."""
    rules = re.findall(r"\.msg\.assistant \.bubble-answer ([^{]*)code \{", CSS)
    assert rules, "the answer's inline code rule is gone"
    for prefix in rules:
        assert ":not(pre) >" in prefix, "inline code styling reaches the code inside a <pre> again"


def test_escape_stops_the_answer_and_the_stop_button_holds_the_keyboard() -> None:
    """CHAT_PLAN section 6: "Escape stops streaming". Only Ctrl+. did, and the
    composer is disabled mid-answer, so the focus fell to the page. Measured
    by chataudit.js, part keys: Escape stopped nothing before; after, 34ms,
    with the Stop button holding the focus while the answer streams."""
    app = app_js_text()
    esc = app[app.index("//: **Escape stops the answer being written**") :]
    esc = esc[: esc.index("\n});\n")]
    assert 'document.addEventListener("keydown"' in esc, "Escape must be heard on the page: the box is disabled mid-answer"
    assert "chatController.abort()" in esc
    assert '$("tab-chat").classList.contains("hidden")' in esc, "Escape on another tab must not stop a chat"
    assert "event.defaultPrevented" in esc, "an Escape a menu or dialog already used must be left alone"
    send = _function(app, "sendChatMessage")
    assert '$("chat-stop").focus(' in send, "the Stop button no longer takes the focus while the answer streams"


def test_the_streams_end_gives_the_box_the_focus_only_from_the_stop_button() -> None:
    """The review of the chat pass (2026-09-27): the stream's end called
    `input.focus()` whenever the chat was on screen, so a reader who had
    moved to the search box or the sidebar while the answer streamed had
    the box take the focus from them as it ended. Only from the Stop button
    (which took it when the answer began) or from nowhere."""
    app = app_js_text()
    end = app[app.index("// The composer belongs to whatever conversation is on screen.") :]
    end = end[: end.index("clearPending();")]
    assert 'document.activeElement === $("chat-stop")' in end
    assert "if (fromStop) input.focus();" in end
    assert "\n      input.focus();\n" not in end, "the box takes the focus unconditionally again"


def test_enter_on_a_citation_mark_moves_the_keyboard_into_the_peek() -> None:
    """The peek is lifted to <body>, so Tab from a mark reaches the next mark,
    never the peek: its preview and Open note were unreachable in sequence
    (peekkeys.js, the review of 2026-09-27: Enter, then Tab, both left the
    keyboard on the marks). A click with no pointer (`detail` 0) moves the
    focus onto the preview; Escape brings it back."""
    app = app_js_text()
    marker = _function(app, "citationMarker")
    click = marker[marker.index('link.addEventListener("click"') :]
    click = click[: click.index("\n  });\n")]
    assert "event.detail === 0" in click
    assert '.citation-peek-preview")?.focus(' in click
    close = _function(app, "closeCitationPeek")
    assert "link.focus({ preventScroll: true })" in close
    #: And that focus must not open the peek again: the mark opens its peek
    #: on focus, so the focus a closing peek handed back reopened it (Escape
    #: from inside the peek left it on the page, measured by peekkeys.js).
    assert "citationPeekState.restoring = true" in close
    focus = marker[marker.index('link.addEventListener("focus"') :]
    focus = focus[: focus.index("\n  });\n")]
    assert "if (citationPeekState.restoring) return;" in focus


def test_a_grounding_chip_fits_its_answer_and_says_its_sentences_in_characters() -> None:
    """At 390 an answer is 288px wide and the chips were 352px, running 79px
    past the bubble; and the chip's tooltip printed the answer's Markdown
    (6 of 9 tooltips in the seeded chats showed `**`, 0 after)."""
    chip = re.search(r"\n\.result-reason-chip \{([^}]*)\}", CSS)
    assert chip, "the chip rule is gone"
    assert "max-width: min(22rem, 100%)" in chip.group(1), "the chip may be wider than the answer holding it again"
    grounding = _function(app_js_text(), "renderAnswerGrounding")
    assert 'chip.title = plainText(forSentences.join(" "))' in grounding, "the tooltip prints raw Markdown again"


def test_a_touch_action_row_has_room_of_its_own_under_its_message() -> None:
    """Under `(hover: none)` the action row is always shown, positioned below
    its bubble; with no room kept for it, a question's Copy, Edit and Delete
    lay 31px over the answer beneath (0 after, chataudit.js at 390)."""
    sheet = (ROOT / "frontend" / "css" / "02-chat-graph.css").read_text(encoding="utf-8")
    touch = sheet[sheet.index("@media (hover: none)") :]
    touch = touch[: touch.index("\n}\n")]
    assert re.search(
        r"#chat-messages > \.msg:has\(> \.msg-actions\) \{\s*margin-bottom: calc\(var\(--target-min\) \+ var\(--space-2\)\);",
        touch,
    ), "the always-shown touch row has no room of its own and sits on the next message"


def test_a_citation_mark_takes_a_finger_sized_tap_on_a_touch_screen() -> None:
    """The mark opens the peek, the only way to a source on a phone, and was
    10 by 13px: a tap 8px off any edge missed. Under the touch floor an
    invisible box `--target-min` tall takes it (23 by 44px measured at 390,
    the line's own height unchanged at 46px)."""
    sheet = (ROOT / "frontend" / "css" / "02-chat-graph.css").read_text(encoding="utf-8")
    block = sheet[sheet.index("@media (max-width: 819.98px), (pointer: coarse) {\n  .answer-citation-link {") :]
    block = block[: block.index("\n}\n")]
    after = block[block.index(".answer-citation-link::after") :]
    assert "height: var(--target-min)" in after, "the mark's touch box is not the touch floor's height"
    assert "position: absolute" in after, "the touch box must not take room in the line"
