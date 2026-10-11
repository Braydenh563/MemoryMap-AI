"""Errors from scripts that are not this app's are not logged (the owner's
support bundle, 2026-10-11, Safari on an iPhone: "[browser/csp] blocked
style-src-elem: inline (user-script)" and "[browser/error] Script error.").
"""

from __future__ import annotations

import re
from pathlib import Path

JS = Path(__file__).resolve().parent.parent / "frontend" / "js"


def _foreign() -> re.Pattern[str]:
    text = (JS / "boot-guard.js").read_text(encoding="utf-8")
    return re.compile(re.search(r"var FOREIGN_SOURCE = /(.+)/;", text).group(1))


def test_injected_and_extension_sources_are_foreign():
    foreign = _foreign()
    for source in ("user-script", "user-script:12", "safari-web-extension://abc/x.js",
                   "chrome-extension://abc/c.js", "moz-extension://a/b.js", "webkit-masked-url://hidden/"):
        assert foreign.match(source), source
    for source in ("http://192.168.0.107:8443/js/app.js", "", "self", "inline"):
        assert not foreign.match(source), source


def test_both_reporters_skip_them():
    guard = (JS / "boot-guard.js").read_text(encoding="utf-8")
    csp = guard.split('addEventListener("securitypolicyviolation"', 1)[1].split("report(", 1)[0]
    assert "FOREIGN_SOURCE.test(event.sourceFile" in csp
    error = guard.split('window.addEventListener("error"', 1)[1].split("report(", 1)[0]
    assert "foreignError(event)" in error
    assert '|| !e.filename ? undefined' in (JS / "app.js").read_text(encoding="utf-8")
