"""One toast recipe, and every toast action kept in the bell (INBOX 584, 585).

The owner, 2026-10-05: "no spacing between the message and show it link on
this notification" (a toast read "Finished reading this file.Show it": the
progress toast's action was a bare `.link-button` with no margin, the only
toast builder that did not use `.toast-action`), and "all notifiactions that
contain links or buttons need to show and be accessible in the notifications
panel" (a toast's action lived for eight seconds and was gone).

These pin the shape in the source; `scratchpad/ui-sweeps/notif1005-sweep.js`
measures it in a browser (the gap, the centre line, the panel rows, five
kinds of action toast and their rows) at 1440 and 390, light and dark.
"""

from __future__ import annotations

import re
from pathlib import Path

from tests._app_js import app_js_text
from tests._css_paths import css_text

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "frontend" / "js"
STATUS = (JS / "status.js").read_text(encoding="utf-8")
APP = app_js_text()
CSS = css_text()


def _body(source: str, head: str) -> str:
    start = source.index(head)
    return source[start : source.index("\n}\n", start)]


def _read(name: str) -> str:
    return (JS / name).read_text(encoding="utf-8")


# --- the toast recipe -------------------------------------------------------


def test_every_toast_builder_uses_one_message_and_one_action_shape():
    """The message is `.toast-msg`, an action is `toastActionButton`'s
    `.toast-action`, in toast, toastAction, toastProgress and the banner."""
    for head in ("function toast(", "function toastAction(", "function toastProgress(", "function showServerDownBanner("):
        body = _body(STATUS, head)
        assert "toast-msg" in body, head
    assert "link-button" not in _body(STATUS, "function toastProgress("), (
        "the progress toast's action was a bare link with no gap (INBOX 584)"
    )
    assert "toastActionButton(" in _body(STATUS, "function toastProgress(")
    assert "toastActionButton(" in _body(STATUS, "function toastAction(")


def test_the_toast_row_spaces_its_parts_with_a_gap_not_margins():
    rule = re.search(r"/\* One toast recipe.*?\*/\s*\.toast\s*\{([^}]*)\}", CSS, re.S)
    assert rule, "the toast recipe block"
    assert "gap: var(--space-3)" in rule.group(1)
    assert "align-items: flex-start" in rule.group(1), "a wrapped message keeps its actions on its first line"
    msg = re.search(r"\.toast > \.toast-msg\s*\{([^}]*)\}", CSS)
    assert msg and "padding-block" in msg.group(1), "the first line is centred on the controls"


# --- every toast action is kept in the bell ----------------------------------


def test_record_notification_returns_the_row_id():
    body = _body(STATUS, "function recordNotification(")
    assert "return id;" in body


def test_toast_action_records_the_same_action_in_the_bell():
    body = _body(STATUS, "function toastAction(")
    assert "keepToastAction(" in body
    keep = _body(STATUS, "function keepToastAction(")
    assert "recordNotification(" in keep
    assert "noticeLive.set(" in keep, "the live closure, for this session"
    # The progress toast's action as well (the reported "Show it").
    assert "keepToastAction(" in _body(STATUS, "function toastProgress(")


def test_an_undo_is_kept_only_while_it_is_valid():
    keep = _body(STATUS, "function keepToastAction(")
    assert "undoStack" in keep, "an Undo on the app's stack is valid while it is still on it"
    assert "NOTICE_UNDO_MS" in keep, "an Undo off the stack has a time limit"
    row = _body(STATUS, "function notificationActionButton(")
    assert '"Expired"' in row and '"Done"' in row
    assert "disabled = true" in row


def test_an_opener_resolves_its_target_by_id_when_pressed():
    go = _body(STATUS, "async function runNotificationGo(")
    for kind in ("entry", "conversation", "doc", "board"):
        assert f"{kind}:" in STATUS[STATUS.index("const NOTICE_TARGETS"):], kind
    assert "is no longer there" in STATUS
    assert "reopenAnswerPanel(" in go
    assert "openExportsFromNotification()" in go


def test_already_recorded_notices_do_not_record_twice():
    assert 'toastAction(message, "Open", onOpen, { record: false })' in _body(STATUS, "function agentActivityNotice(")
    assert '"Fix it", () => openSettingsModal("searchindex", "embedding-model-select"), { record: false })' in STATUS
    skills = _read("skills.js")
    assert '"Open folder", () => {' in skills
    assert re.search(r'"Open folder", \(\) => \{.*?\}, \{ record: false \}\);', skills, re.S)


#: Openers that name a target the app can find again after a reload. Each
#: caller passes `go`, plain data for localStorage.
OPENERS = {
    "chat.js": ['go: { open: "conversation", id: fork.id }', 'go: { open: "doc", id: doc.id }', 'go: { open: "reminder", id: reminder.id }'],
    "wiring.js": ['go: { open: "conversation", id: fork.id }'],
    "palette.js": ['go: { open: "conversation", id: conversation.id }'],
    "library.js": ['go: { open: "doc", id: made[0].id }'],
    "chat-attach.js": ['go: { tab: "library" }'],
    "lightbox-view.js": ['go: { tab: "library" }'],
    "attach-to.js": ['go: { open: "board", id }', 'go: { open: "doc", id: Number(id) }'],
    "capture-ask.js": ['go: { open: "entry", id: entry.id }', 'go: { open: "entry", id: status.similar.id }'],
    "quick-note.js": ['go: { open: "entry", id: saved.id }', 'go: { open: "entry", id: note.id }', 'go: { open: "capture" }'],
    "selection.js": ['go: { open: "entry", id: created.id }', 'go: { open: "entry", id: entry.id }'],
    "graph-canvas.js": ['go: { open: "entry", id: created.id }'],
    "settings.js": ['go: { settings: "appearance", focus: "perf-mode" }'],
}


def test_openers_carry_a_target_that_survives_a_reload():
    missing = [(name, want) for name, wants in OPENERS.items() for want in wants if want not in _read(name)]
    assert not missing, missing


# --- the panel row ------------------------------------------------------------


def test_a_row_shows_its_action_as_a_button():
    body = _body(STATUS, "async function openNotifications(")
    assert "notificationActionButton(item)" in body
    assert "notif-dot" in body, "the unread dot is an element in its own column"
    assert "notif-side" in body, "time and the row's controls share one column"


def test_the_row_is_one_grid_with_no_overlaid_controls():
    rule = re.search(r"/\* One notification row.*?\*/\s*\.notif-row\s*\{([^}]*)\}", CSS, re.S)
    assert rule, "the row recipe block"
    assert "grid-template-columns: var(--notif-dot) var(--notif-line) minmax(0, 1fr) auto" in rule.group(1)
    tail = CSS[rule.start():]
    assert not re.search(r"\.notif-row-actions\s*\{[^}]*position:\s*absolute", tail), (
        "the controls float over the title again (INBOX 585)"
    )
