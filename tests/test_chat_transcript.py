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


def test_a_reply_head_is_drawn_once_per_face_and_copied() -> None:
    """Opening a 150-turn chat took 939ms when every reply built its own
    head (a p5 emblem each); copying the first cut it to 410ms. The persona
    heads (2026-09-27) keep that: the first reply of a face draws it, every
    later one is a deep copy, and no reply head starts a p5 sketch
    (chatheads.js: 0 canvases in 150 replies)."""
    app = app_js_text()
    paint = _function(app, "paintPersonaAvatar") + _function(app, "assistantAvatar")
    assert "renderEmblem" not in paint, "a reply head builds a p5 sketch again"
    assert "chatHeadSources.get(key)" in paint
    assert "source.cloneNode(true)" in paint or "face.cloneNode(true)" in paint
    assert paint.count("chatHeadSources.set(") == 2, "one per kind of face: a persona's, Atlas's"
    key = _function(app, "chatHeadKey")
    for part in ("size", "atlasLook()", "atlasStyle()", "name"):
        assert part in key, f"the copy is not keyed on {part}: a stale face would be copied"


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


def test_escape_leaves_an_answer_being_written_in_another_chat_alone() -> None:
    """The review of 2026-09-27: `chatController` outlives a switch, since a
    turn keeps streaming into the chat it was asked in while the reader opens
    another (`releaseChatComposer` hides Stop and hands the box back). Escape
    keyed on the controller alone, so an Escape in the new chat's box stopped
    an answer nobody could see. Measured with the fake answer model: streaming
    in chat A, New chat, Escape in the box: A's answer stopped (after: still
    streaming). The Stop button is on screen exactly while the chat on screen
    is being answered, so Escape asks it."""
    app = app_js_text()
    esc = app[app.index("//: **Escape stops the answer being written**") :]
    esc = esc[: esc.index("\n});\n")]
    guard = esc.index('$("chat-stop").classList.contains("hidden")')
    assert guard < esc.index("chatController.abort()")


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
    (chatkeys.js, the review of 2026-09-27: Enter, then Tab, both left the
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
    #: from inside the peek left it on the page, measured by chatkeys.js).
    assert "citationPeekState.restoring = true" in close
    focus = marker[marker.index('link.addEventListener("focus"') :]
    focus = focus[: focus.index("\n  });\n")]
    assert "if (citationPeekState.restoring) return;" in focus


def test_tab_off_either_end_of_a_pinned_peek_closes_it_at_the_mark() -> None:
    """The peek is at the end of <body> and a pinned one ignores focusout, so
    Tab past Open note left it open until Escape (OPEN.md, 2026-09-27)."""
    peek = _function(app_js_text(), "openCitationPeek")
    keys = peek[peek.index('panel.addEventListener("keydown"') :]
    keys = keys[: keys.index("\n  });\n")]
    assert 'event.key !== "Tab"' in keys and "event.shiftKey ? 0 : stops.length - 1" in keys
    assert "closeCitationPeek({ restoreFocus: true })" in keys


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
    10 by 13px: a tap 8px off any edge missed. An invisible box `--target-min`
    tall takes it (23 by 44px measured at 390, the line's own height unchanged
    at 46px); at every width since Brief 88, where it was 10 by 13 at 1440."""
    sheet = (ROOT / "frontend" / "css" / "02-chat-graph.css").read_text(encoding="utf-8")
    after = sheet[sheet.index("\n.answer-citation-link::after {") :]
    after = after[: after.index("\n}\n")]
    assert "height: var(--target-min)" in after, "the mark's touch box is not the touch floor's height"
    assert "position: absolute" in after, "the touch box must not take room in the line"


def test_a_bubbles_hover_row_hangs_over_its_own_foot_not_the_next_message() -> None:
    """CHAT_PLAN (OPEN.md triage): hung 2px under its bubble, the 25px row
    overran the 13px between messages and lay 7 to 13px across the answer
    under a question at 640 to 820. It now starts inside its own bubble's
    foot padding, 2px under the last line (a probe, 640 and 1280).

    2026-10-06 (the owner: "these buttons are too high and clash with the
    message bubble"): the row now hangs just below its bubble, in the room
    #chat-messages' gap keeps for it (measured: 2px under the bubble, 15px
    clear of the next message at 1440)."""
    rule = CSS[CSS.index(".msg-actions {\n  position: absolute;") :]
    rule = rule[: rule.index("\n}")]
    assert "top: calc(100% + var(--space-1));" in rule
    assert "100% + 2px" not in rule
