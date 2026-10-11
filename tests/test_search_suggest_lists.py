"""A Library box suggests its own list's titles, not recents only (OPEN row 552)."""

from __future__ import annotations

import json
import re
import shutil
import subprocess

import pytest

from tests._app_js import JS_DIR

SOURCE = (JS_DIR / "search-suggest.js").read_text(encoding="utf-8")


def _fn(name: str) -> str:
    match = re.search(rf"^function {name}\(.*?^\}}", SOURCE, re.S | re.M)
    assert match, f"{name} is gone from search-suggest.js"
    return match.group(0)


@pytest.mark.skipif(not shutil.which("node"), reason="needs node")
def test_titles_that_start_with_the_text_come_first():
    titles = ["My garden plan", "Gardening budget", "Garage", "Taxes"]
    script = (
        "const SEARCH_SUGGEST_LIMITS = { title: 4 };\n" + _fn("searchSuggestRank") + "\n" + _fn("searchSuggestTitleHits")
        + f"\nprocess.stdout.write(JSON.stringify(searchSuggestTitleHits({json.dumps(titles)}, 'gar', new Set(['garage']))));"
    )
    out = json.loads(subprocess.run(["node", "-e", script], capture_output=True, text=True, check=True).stdout)
    assert out == ["Gardening budget", "My garden plan"]


def test_every_library_box_has_a_list_to_complete_from():
    from pathlib import Path

    html = (Path(__file__).resolve().parents[1] / "frontend" / "index.html").read_text(encoding="utf-8")
    scopes = set(re.findall(r'data-search-scope="([a-z]+)"', html)) - {"notes", "web"}
    lists = set(re.findall(r"^  ([a-z]+): \"#", SOURCE, re.M))
    assert scopes <= lists | {"images"}, scopes - lists
    for selector in re.findall(r': "(#[a-z-]+) ', SOURCE):
        assert f'id="{selector[1:]}"' in html, selector
