"""The emblem can be drawn before settings.js has run (the owner's log,
2026-10-04: "ReferenceError: ACCENTS is not defined at renderEmblem
(phone-shell.js) at assistant-avatar.js"). phone-shell.js loads before
settings.js, and the assistant avatar draws an emblem at boot, so nothing on
that path may name a settings.js binding unguarded."""

import re
from pathlib import Path

JS = Path(__file__).resolve().parents[1] / "frontend" / "js"


def test_the_emblem_does_not_reach_for_settings_js_names():
    source = (JS / "phone-shell.js").read_text(encoding="utf-8")
    body = source[source.index("function renderEmblem") :]
    body = body[: body.index("\nfunction ", 10)]
    code = re.sub(r"^\s*//.*$", "", body, flags=re.M)
    assert "ACCENTS" not in code
    #: Every settings.js function it calls is behind a `typeof` guard (the
    #: owner's second log: "appearancePref is not defined").
    for name in ("currentAccentHex", "appearancePref", "activeAccent", "applyAppearance"):
        calls = len(re.findall(rf"\b{name}\(", code))
        guards = len(re.findall(rf'typeof {name} === "function"', code))
        assert calls <= guards, f"{name} is called unguarded in renderEmblem"
