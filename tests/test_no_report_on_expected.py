"""A condition the app expects is said plainly, never as an error with Report
this (INBOX 648, learnability; found by the no-model crawl,
scratchpad/ui-sweeps/e2e648-crawl.js).

An error toast carries "Report this", which mails the owner a support bundle.
Three presses on a plain install raised one for something that is not a fault:
Dictate with the voice add-on not installed (the hint already says to install
it in Settings, Packages), Compress on a chat with nothing to compress, and
Add on an empty reminder.
"""

from __future__ import annotations

from pathlib import Path

JS = Path(__file__).resolve().parent.parent / "frontend" / "js"


def _function(source: str, head: str) -> str:
    start = source.index(head)
    return source[start : source.index("\n}\n", start) + 3]


def test_dictation_without_the_add_on_says_where_to_get_it_not_report_this():
    # The hint is the server's (ai/voice.py): it names Settings, Packages.
    body = _function((JS / "media.js").read_text(encoding="utf-8"), "async function toggleDictation(")
    branch = body[body.index("if (!voiceStatus.available) {") :]
    branch = branch[: branch.index("return;")]
    assert "toast(voiceStatus.hint || \"Voice capture isn't available.\");" in branch


def test_nothing_to_compress_is_not_an_error():
    body = _function((JS / "chat.js").read_text(encoding="utf-8"), "async function compressChatContext(")
    assert 'toast("There isn\'t enough conversation to compress yet.")' in body


def test_a_reminder_with_a_field_left_empty_is_not_an_error():
    # Found by the same crawl: Add on the empty Reminders form.
    body = _function((JS / "shell-reminders.js").read_text(encoding="utf-8"), "async function addReminder(")
    assert 'toast("A reminder needs text and a due time.");' in body
