"""The installed app is a share target, and what is shared lands in Capture.

UI_MODERNISATION_PLAN Phase 11 item 5, "upload from the share sheet". The
manifest declares the GET form (no service worker, and the query survives
the lock screen), and app.js takes the three parameters once the entries
have loaded. The suite cannot open a share sheet; it can hold the two
halves to the same three names, which is the one way this silently breaks.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from tests._app_js import app_js_text

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "frontend" / "manifest.webmanifest"
def test_the_manifest_declares_a_get_share_target():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    target = manifest["share_target"]
    assert target["method"] == "GET", "the GET form needs no service worker"
    assert target["action"] == "/"
    assert target["params"] == {"title": "share_title", "text": "share_text", "url": "share_url"}


def test_the_app_reads_exactly_the_names_the_manifest_sends():
    app = app_js_text()
    declared = re.search(r"const SHARE_PARAMS = \[([^\]]*)\]", app)
    assert declared, "SHARE_PARAMS is missing from app.js"
    names = set(re.findall(r'"([^"]+)"', declared.group(1)))
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assert names == set(manifest["share_target"]["params"].values())
    assert "takeSharedIntake" in app[app.index("function startApp()") :], "the intake is not a boot step"
    assert "history.replaceState" in app[app.index("function takeSharedIntake()") :][:1600], (
        "the query must be cleared, or a reload shares it again"
    )


def test_the_manifest_has_no_em_dash():
    assert "\u2014" not in MANIFEST.read_text(encoding="utf-8")
