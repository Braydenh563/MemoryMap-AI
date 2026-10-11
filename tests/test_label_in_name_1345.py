"""WCAG 2.5.3, Label in Name (INBOX 1345): a control's visible words are part
of its accessible name.

axe's `label-content-name-mismatch` (`scratchpad/ui-sweeps/axe.js`, dashboard,
light, 1440) named three controls: the status bar's notes and reminders counts,
whose `aria-label` was the tooltip alone ("Your notebook: click to browse it"
over the visible "29 notes"), and a finished first step, whose label dropped the
visible "1. " and its note ("Name yourself: done" over "1. Name yourself Done.
Change it..."). The counts' names now start with what is on screen, with a
space between the number and its word that is read but not drawn; the finished
step has no label of its own, its words already say Done.
"""

from __future__ import annotations

from pathlib import Path

JS = Path(__file__).resolve().parents[1] / "frontend" / "js"


def test_a_status_count_is_named_by_what_it_shows() -> None:
    text = (JS / "status.js").read_text(encoding="utf-8")
    assert "const shown = [value, label]" in text
    assert 'button.setAttribute("aria-label", shown ? `${shown}: ${title}` : title)' in text


def test_a_finished_first_step_is_named_by_its_own_words() -> None:
    text = (JS / "first-run.js").read_text(encoding="utf-8")
    assert "aria-label" not in text.split("function firstStepButton", 1)[1].split("\n}\n", 1)[0].replace("No `aria-label` when done", "")
    assert '"Done.' in text, "the done note says so in words"


def test_a_number_and_its_word_are_read_with_a_space() -> None:
    text = (JS / "status.js").read_text(encoding="utf-8")
    assert 'button.append(" ")' in text
