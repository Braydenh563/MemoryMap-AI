"""What a person reads when a request fails (INBOX 472: "official, not a demo").

Every error toast prints `error.message`. Before this, that was the server's
`detail` untouched: a validation failure toasted a raw JSON list, a server
fault the bare words "Internal error", a dropped connection "Failed to
fetch". The one place that decides is `plainHttpError` in app.js, and these
ratchets keep the four places that read a failed response from going around
it. The behaviour itself was measured in a browser (scratchpad/polish-472.md).
"""

from __future__ import annotations

import re
from pathlib import Path

JS = Path(__file__).resolve().parents[1] / "frontend" / "js"


def test_every_failed_response_goes_through_plain_http_error():
    offenders = []
    for path in sorted(JS.glob("*.js")):
        text = path.read_text(encoding="utf-8")
        if path.name != "app.js" and re.search(r"Request failed \(\$\{", text):
            offenders.append(f"{path.name}: builds its own 'Request failed (status)' message")
        if re.search(r"new Error\((detail|body)\.detail\b", text) or re.search(r"toast\(detail\.detail\b", text):
            offenders.append(f"{path.name}: throws the server's detail unfiltered")
        # an HTTP status in parentheses is a developer's word for "it failed"
        # (the log stream's own retry line in settings.js is not shown to anyone)
        if path.name != "settings.js" and re.search(r"\(\$\{(response|res)\.status\}\)", text) and path.name != "app.js":
            offenders.append(f"{path.name}: puts an HTTP status in front of a person")
    assert not offenders, "\n".join(offenders)


def test_api_keeps_the_raw_text_for_the_log_and_gives_the_toast_a_sentence():
    app = (JS / "app.js").read_text(encoding="utf-8")
    # in status.js, not app.js: app.js is at its gzip cap
    assert "function plainHttpError(" in (JS / "status.js").read_text(encoding="utf-8")
    assert "plainHttpError(response.status, detail.detail)" in app
    # the log line carries the raw server text, the error carries the sentence
    assert "${rawMsg}" in app
    # a dropped connection is a sentence, not the browser's "Failed to fetch"
    assert "networkErr instanceof TypeError" in app


def test_copy_a_person_reads_has_no_escaped_em_dash_or_exclamation():
    """`test_no_em_dashes.py` reads the character, so a `\\u2014` inside a
    string slipped past it (the boot splash's failure message carried two).
    The exclamation toasts were the same kind of miss: CLAUDE.md section 6
    says no exclamation marks."""
    boot = (JS / "boot-guard.js").read_text(encoding="utf-8")
    assert "\\u2014" not in boot
    assert 'toast("Linked!")' not in (JS / "notes-list.js").read_text(encoding="utf-8")
    assert "nice work!" not in (JS / "dashboard.js").read_text(encoding="utf-8")
