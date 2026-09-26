"""An answer that finishes behind a closed panel says so (the owner,
2026-09-23: "if an AI response is started in the popup agent or the Atlas
guide and the user closes the panel before it finishes, post a
notification ... clicking it reopens the panel on that answer").

Closing either panel never stopped the turn, so the answer was written into a
transcript nobody could see. These pin the three halves in the source: each
panel's end-of-turn posts through `noticeUnwatchedAnswer` only while it is
closed and not stopped, the notice's action is plain data (notifications live
in localStorage), and the bell's row knows what to do with it. The behaviour
itself is driven in a browser by `scratchpad/ui-sweeps/unwatched.js`.
"""

from pathlib import Path
from tests._app_js import app_js_text

ROOT = Path(__file__).resolve().parents[1]
#: app.js plus palette.js: the popup agent (Ctrl+K) was split out of app.js
#: on 2026-09-24, and these tests read it wherever it lives.
APP = app_js_text() + "\n" + (
    ROOT / "frontend" / "palette.js"
).read_text(encoding="utf-8")
SETTINGS = (ROOT / "frontend" / "settings.js").read_text(encoding="utf-8")


def _body(source: str, head: str) -> str:
    start = source.index(head)
    return source[start : source.index("\n}\n", start)]


def test_the_popup_agent_posts_only_when_it_is_shut_and_not_stopped():
    body = _body(APP, "async function cmdPaletteAsk(")
    finally_block = body[body.rindex("} finally {") :]
    assert 'noticeUnwatchedAnswer("agent"' in finally_block
    assert 'cmdPaletteOverlay.classList.contains("hidden")' in finally_block
    assert "!stopped" in finally_block, "a turn the reader stopped needs no notice"
    assert "stopped = true" in body


def test_atlas_posts_only_when_its_sheet_is_gone_and_not_stopped():
    body = _body(SETTINGS, "async function submitHelpChatQuestion(")
    finally_block = body[body.rindex("} finally {") :]
    assert 'noticeUnwatchedAnswer("guide"' in finally_block
    assert "[data-sheet=\"guide\"]" in finally_block
    assert "!signal.aborted" in finally_block


def test_the_notice_carries_a_way_back_that_survives_storage():
    body = _body(APP, "function noticeUnwatchedAnswer(")
    assert "const action = { panel, answer:" in body, "plain data: it is stored in localStorage"
    assert "onOpen: () => reopenAnswerPanel(action)" in body
    notice = _body(APP, "function agentActivityNotice(")
    assert "toastAction(message, \"Open\", onOpen)" in notice
    assert "notificationsMuted()" in notice, "the mute still binds"


def test_the_bell_row_reopens_the_panel():
    start = APP.index("item.action && (item.action.tab || item.action.exports || item.action.panel")
    block = APP[start : start + 700]
    assert "reopenAnswerPanel(item.action)" in block
