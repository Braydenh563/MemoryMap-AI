"""The note edit form and Capture's title around a property block
(meetings-644 audit, item 6).

A note of a type (every meeting) opens with its `---` block. The edit form
looked for its `# ` title at offset 0, found the fence, left the Title empty
and showed the block's raw lines in the box; a title typed there was written
above the fence, which turned every property into body text. The three
functions involved are pure string work, run here in node.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "frontend" / "js"


def _function(file: str, name: str) -> str:
    text = (JS / file).read_text(encoding="utf-8")
    start = text.index(f"function {name}(")
    return text[start : text.index("\n}\n", start) + 3]


DRIVER = r"""
const out = {};
const meeting = "---\ntype: Meeting\ndate: 2026-10-07 14:00\n---\n# Weekly sync\n\n## Agenda\n\n1. Budget\n";
out.parts = noteFormParts(meeting);
out.plain = noteFormParts("# Title\n\nBody");
out.none = noteFormParts("Just words");
out.titled = withTitle("---\ntype: Meeting\n---\n## Agenda\n", "Standup");
out.untitled = withTitle("Body", "");
out.simple = withTitle("Body", "Name");
const p = out.parts;
out.roundTrip = (stripFrontmatter(p.body) === p.body ? p.block : "") + withTitle(p.body.trim(), p.title);
process.stdout.write(JSON.stringify(out));
"""


@pytest.fixture(scope="module")
def result(tmp_path_factory) -> dict:
    node = shutil.which("node")
    if not node:  # pragma: no cover - node is in the sandbox and in CI
        pytest.skip("node is not available")
    source = "\n".join(
        [
            _function("shell-reminders.js", "stripFrontmatter"),
            _function("capture-ask.js", "withTitle"),
            _function("note-edit-panels.js", "noteFormParts"),
            DRIVER,
        ]
    )
    script = tmp_path_factory.mktemp("noteform") / "run.js"
    script.write_text(source, encoding="utf-8")
    run = subprocess.run([node, str(script)], capture_output=True, text=True, timeout=60, check=False)
    assert run.returncode == 0, run.stderr
    return json.loads(run.stdout)


def test_the_form_holds_the_block_aside_and_finds_the_title(result) -> None:
    parts = result["parts"]
    assert parts["block"] == "---\ntype: Meeting\ndate: 2026-10-07 14:00\n---\n"
    assert parts["title"] == "Weekly sync"
    assert parts["body"] == "## Agenda\n\n1. Budget\n"
    assert result["plain"] == {"block": "", "title": "Title", "body": "Body"}
    assert result["none"] == {"block": "", "title": "", "body": "Just words"}


def test_a_title_goes_under_the_block(result) -> None:
    assert result["titled"] == "---\ntype: Meeting\n---\n# Standup\n\n## Agenda\n"
    assert result["untitled"] == "Body"
    assert result["simple"] == "# Name\n\nBody"


def test_open_then_save_gives_the_same_text(result) -> None:
    assert result["roundTrip"] == "---\ntype: Meeting\ndate: 2026-10-07 14:00\n---\n# Weekly sync\n\n## Agenda\n\n1. Budget"
