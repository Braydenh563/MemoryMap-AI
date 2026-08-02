"""No element gets its click handler bound twice (roadmap §36D).

Found by accident while making Quit reachable: `$("app-quit").addEventListener`
appeared twice, and so did `$("task-history-clear").addEventListener`. Both
copies had been spliced into the *middle of `renderChatModeSeg()`* by an
editing accident.

That parsed, so nothing complained — but `renderChatModeSeg` runs on every
chat-mode change, so each call bound another listener to both buttons. Clicking
Quit after switching modes a few times opened that many confirm dialogs and
fired that many shutdown requests.

The class of bug is worth a check for the same reason `test_frontend_ids.py`
exists: browsers do not warn, no linter runs on this file, and the Python suite
cannot see the DOM. A duplicate registration is silent until it is several
dialogs deep.

It also catches the genuinely dangerous version — a listener bound inside a
function that runs more than once, which accumulates without bound.
"""

from __future__ import annotations

import re
from collections import Counter
from pathlib import Path

APP = Path(__file__).resolve().parents[1] / "frontend" / "app.js"

#: Two listeners on one element for one event is fine when they do different
#: jobs — the settings overlay has a backdrop-click-to-close and a delegated
#: cross-link handler, and both are correct. What is never fine is a
#: registration that can run more than once, so that is what this checks.
#: (element, event) pairs that legitimately have two handlers, and why.
ALLOWED_DOUBLES = {
    # Two different jobs on the same overlay, both registered once: closing on
    # a backdrop click, and delegating clicks on the "that setting lives over
    # there" cross-links inside it.
    ("settings-modal", "click"),
    # Two unrelated jobs on the capture box, both registered once: driving the
    # `[[wiki link]]` autocomplete, and keeping the character count and the
    # draft in localStorage. Merging them would couple a text-editing aid to a
    # persistence concern for no gain.
    ("entry-content", "input"),
}

BINDING = re.compile(r'\$\("([\w-]+)"\)\??\.addEventListener\(\s*"(\w+)"')


def _source() -> str:
    """app.js with block comments and strings' worth of noise left alone.

    Only comments are stripped: a `$("x").addEventListener` inside a comment is
    documentation of the pattern, not a second registration — this test's own
    docstring would otherwise be quoted back at it.
    """
    return re.sub(r"/\*.*?\*/", "", APP.read_text(encoding="utf-8"), flags=re.S)


def test_no_element_is_bound_to_the_same_event_twice():
    """The check that would have caught it.

    I first tried a stricter rule — that every `$("id").addEventListener` sits
    at the top level, since the two broken ones were nested. That is not this
    codebase's convention: plenty of handlers are registered inside init
    functions that run exactly once, and flagging those would be noise that
    gets suppressed rather than read.

    So the rule is the narrower true one: **the same element bound to the same
    event in two places.** That is what `app-quit` and `task-history-clear`
    were, and it is nearly always either a copy-paste or an editing accident.
    Where two handlers for one event genuinely do different jobs, the pair goes
    in ALLOWED_DOUBLES with the reason — and writing the reason is the point.
    """
    doubles = {
        pair: n for pair, n in Counter(BINDING.findall(_source())).items() if n > 1
    }
    unexplained = {p: n for p, n in doubles.items() if p not in ALLOWED_DOUBLES}
    assert not unexplained, (
        "These elements are bound to the same event in two places:\n  "
        + "\n  ".join(f'$("{el}").addEventListener("{ev}") × {n}' for (el, ev), n in unexplained.items())
        + "\n\nEach registration fires. If one of them sits inside a function "
        "that runs more than once, they accumulate without bound — which is "
        "what Quit did, opening one confirm dialog per chat-mode change.\n"
        "If both are deliberate, add the pair to ALLOWED_DOUBLES with why."
    )


def test_quit_is_reachable_without_opening_settings():
    """"Make the quit app button more available and easy to access rather than
    just being buried in settings." Closing an app is a top-level action, and
    four clicks into a settings panel is the one place nobody looks — most of
    all in the desktop window, where closing the window is not the same thing
    as stopping the server behind it."""
    markup = (APP.parent / "index.html").read_text(encoding="utf-8")
    header = re.search(r"<header id=\"top-bar\">.*?</header>", markup, re.S).group(0)
    assert 'id="quit-btn"' in header


def test_both_quit_buttons_share_one_handler():
    """Two copies of the shutdown sequence would drift — and this file already
    demonstrated exactly that, twice over."""
    source = _source()
    assert source.count("async function quitApp()") == 1
    assert source.count('$("app-quit").addEventListener("click", quitApp)') == 1
    assert source.count('$("quit-btn")?.addEventListener("click", quitApp)') == 1
