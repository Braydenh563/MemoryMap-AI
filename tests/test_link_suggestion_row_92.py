"""WORLD_CLASS_PLAN row 31, item 92: the Suggested links row, redesigned.

The owner's screenshot: rows of quoted pairs, a wide "Why?" input, a percent
chip, Link and X. The row is now two note chips joined by an arrow (each opens
its note), the score as a small meter, the reason behind "Add a reason" (it
opens by itself where Atlas has already guessed one), Link and Dismiss; the
head has "Link all above 70%". Its CSS lives in a lazy stylesheet.
"""

from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend"
INBOX = (FRONTEND / "js" / "suggestions-inbox.js").read_text(encoding="utf-8")
LAZY = (FRONTEND / "css" / "lazy-inbox.css").read_text(encoding="utf-8")
BOOT = (FRONTEND / "css" / "03-dashboard-widgets.css").read_text(encoding="utf-8")


def _row() -> str:
    return INBOX.split("function inboxLinkRow(", 1)[1].split("\n}\n", 1)[0]


def test_the_row_is_two_note_chips_an_arrow_a_meter_and_a_collapsed_reason():
    row = _row()
    assert "link-suggestion-pair" in row and "ph-arrows-left-right" in row
    # Each chip opens its note.
    assert row.count("flashEntry(") >= 1 and 'chip(' in row
    assert "link-suggestion-meter" in row and 'role", "meter"' in row
    assert "Add a reason" in row and "reason.hidden = true" in row
    # No quoted pair of names with an arrow in one text node any more.
    assert "↔" not in row


def test_a_guessed_reason_opens_its_field_by_itself():
    fill = INBOX.split("const fillReasons = async", 1)[1].split("const suggestReasons", 1)[0]
    assert "reveal" in fill


def test_link_all_above_seventy_percent():
    assert "const LINK_ALL_AT = 0.7;" in INBOX
    assert "Link all above 70%" in INBOX
    tools = INBOX.split('tools.className = "row inbox-tools"', 1)[1].split("list.appendChild(tools)", 1)[0]
    assert "linkAll" in tools
    handler = INBOX.split("const linkAll = smallButton(", 1)[1].split("const tools", 1)[0]
    assert "confirmDialog(" in handler and "LINK_ALL_AT" in handler


def test_the_css_moved_to_the_lazy_sheet_and_the_bundle_links_it():
    assert ".link-suggestion-pair" in LAZY and ".link-suggestion-meter" in LAZY
    assert ".link-suggestion" not in BOOT, "the row's rules belong to the lazy sheet now"
    assert "/css/lazy-inbox.css" in INBOX and "inboxStylesReady" in INBOX
    opener = INBOX.split("async function openSuggestionsInbox(", 1)[1].split("const state =", 1)[0]
    assert "await inboxStylesReady" in opener
