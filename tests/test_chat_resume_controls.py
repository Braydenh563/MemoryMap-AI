"""The chat's way onward, and the two surfaces that lost it.

The suite cannot open a browser, so these are the DOM-shaped facts held as
text: one function draws the Resume and Edit-step buttons, both the live path
and the reopen path call it, and the state it needs is saved with the turn.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = (ROOT / "frontend" / "app.js").read_text(encoding="utf-8")


def test_one_function_draws_the_resume_controls() -> None:
    assert "function appendRunResumeControls(bubble, spec)" in APP


def test_both_paths_draw_them_through_that_function() -> None:
    """Reported: the buttons "arent persistent and disappeared when I came
    back to the chat". The live stream built them from its own variables and
    the reopen path did not build them at all, which is the same shape the
    Sources panel, the grounding chips and the followups were each fixed in.
    Two call sites, so a fix to one is a fix to both."""
    assert APP.count("appendRunResumeControls(") >= 3, (
        "expected the definition plus a call from the live path and one from "
        "openConversation"
    )
    assert "...message.resume," in APP, "the reopen path rebuilds them from the saved state"


def test_the_saved_turn_carries_the_state_only_when_there_is_one() -> None:
    """An ordinary answer has nowhere to resume to, and should not write five
    null fields onto every row in the notebook to say so."""
    assert "resumeState.stoppedAtStep !== null ||" in APP
    assert "? resumeState" in APP


def test_the_status_bar_names_the_scope_not_the_persona() -> None:
    """The dock button beside "Ask" read "Atlas", so the bar offered two
    buttons that both mean "talk to the AI". The word is the scope now and the
    name is in the tooltip, which also survives renaming the persona."""
    assert 'word.textContent = "Guide";' in APP
    assert "Ask ${guideName} how this app works" in APP
