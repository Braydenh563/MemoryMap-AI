"""Brief 86 (a) and (b): every search box suggests as you type, and every
box's recent searches can be removed one by one or cleared.

The suggestion logic and the recents store are pure enough to run under node
with a fake storage; the sweep `scratchpad/ui-sweeps/searchsuggest86.js` drives
the real list, the ghost text and the keys at 1440 and 390.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "frontend" / "js"
PREFS = JS / "prefs.js"
SUGGEST = JS / "search-suggest.js"
DATA = JS / "settings-data.js"
INDEX = ROOT / "frontend" / "index.html"


def _node(script: str) -> str:
    if shutil.which("node") is None:
        pytest.skip("node is not installed")
    result = subprocess.run(["node", "-e", script], capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, result.stderr
    return result.stdout.strip()


HARNESS = f"""
const store = new Map();
globalThis.window = {{
  addEventListener() {{}},
  localStorage: {{
    get length() {{ return store.size; }},
    key: (i) => [...store.keys()][i] ?? null,
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  }},
}};
globalThis.document = {{ addEventListener() {{}} }};
globalThis.navigator = {{ platform: "Linux" }};
const fs = require("fs");
eval(fs.readFileSync({str(PREFS)!r}, "utf8") + "; globalThis.prefs = prefs; globalThis.prefsStore = prefsStore;");
eval(fs.readFileSync({str(SUGGEST)!r}, "utf8") + "; globalThis.searchRecent = searchRecent; globalThis.SEARCH_RECENT_PREFIX = SEARCH_RECENT_PREFIX; globalThis.searchSuggestItems = searchSuggestItems;");
//: The "every box at once" helpers live in settings-data.js (lazy): lifted by name.
const data = fs.readFileSync({str(DATA)!r}, "utf8");
for (const name of ["searchRecentAll", "searchRecentClearAll", "searchRecentRestore"]) {{
  const start = data.indexOf("function " + name);
  const end = data.indexOf(String.fromCharCode(10) + "}}", start) + 2;
  eval(data.slice(start, end) + "; globalThis." + name + " = " + name + ";");
}}
globalThis.allEntries = [
  {{ id: 1, title: "Quarterly budget review", category: "Money", tags: ["money", "budget"] }},
  {{ id: 2, title: "Budget for trip", category: "Money", tags: ["money", "travel"] }},
  {{ id: 3, title: "Garden plan", category: "Home and garden", tags: ["garden"] }},
  {{ id: 4, title: "Secret budget", category: "Money", tags: ["budget-private"], is_private: true }},
  {{ id: 5, title: "Binned budget", category: "Money", tags: ["budget-bin"], deleted_at: "2026-01-01" }},
];
const box = (value, scope = "notes") => ({{ value, dataset: {{ searchScope: scope }} }});
const labels = (items) => items.map((i) => i.kind + ":" + i.label);
"""


def test_recents_are_one_store_per_scope_newest_first_with_no_repeats() -> None:
    out = _node(
        HARNESS
        + """
searchRecent.push("notes", "budget");
searchRecent.push("notes", "garden");
searchRecent.push("notes", "Budget");
searchRecent.push("notes", "a");
searchRecent.push("web", "weather");
console.log(JSON.stringify({ notes: searchRecent.load("notes"), web: searchRecent.load("web"), key: [...store.keys()].sort() }));
"""
    )
    got = json.loads(out)
    assert got["notes"] == ["Budget", "garden"], "newest first, a repeat moves up, one letter is not a search"
    assert got["web"] == ["weather"]
    assert got["key"] == ["searchRecent:notes", "webSearchHistory"], "the web panel keeps the key it always had"


def test_remove_clear_all_and_restore() -> None:
    out = _node(
        HARNESS
        + """
for (const q of ["one", "two", "three"]) searchRecent.push("notes", q);
searchRecent.push("web", "weather");
searchRecent.push("boards", "plan");
searchRecent.remove("notes", "TWO");
const afterRemove = searchRecent.load("notes");
const count = Object.values(searchRecentAll()).reduce((n, l) => n + l.length, 0);
const before = searchRecentClearAll();
const afterClear = [Object.keys(searchRecentAll()).length, store.size];
searchRecentRestore(before);
console.log(JSON.stringify({ afterRemove, count, afterClear, restored: searchRecentAll() }));
"""
    )
    got = json.loads(out)
    assert got["afterRemove"] == ["three", "one"]
    assert got["count"] == 4
    assert got["afterClear"] == [0, 0], "clearing everywhere leaves no key behind"
    assert got["restored"] == {"notes": ["three", "one"], "web": ["weather"], "boards": ["plan"]}


def test_a_notes_box_offers_recents_then_titles_tags_and_categories() -> None:
    out = _node(
        HARNESS
        + """
searchRecent.push("notes", "budget meeting");
const items = searchSuggestItems(box("bud"));
const twoWords = searchSuggestItems(box("budget r"));
const hash = searchSuggestItems(box("#tr"));
const catOp = searchSuggestItems(box("cat:home"));
const other = searchSuggestItems(box("bud", "boards"));
const empty = searchSuggestItems(box(""));
console.log(JSON.stringify({
  items: labels(items), twoWords: labels(twoWords), hash: hash.map((i) => i.value),
  catOp: catOp.map((i) => i.value), other: labels(other), empty: labels(empty),
}));
"""
    )
    got = json.loads(out)
    assert got["items"] == [
        "recent:budget meeting",
        "title:Budget for trip",
        "title:Quarterly budget review",
        "tag:budget",
    ], "recents first, a title that starts with the words before one that has the word, never a private or binned note"
    assert got["twoWords"] == ["title:Quarterly budget review"]
    assert got["hash"] == ["#travel"], "a typed # is kept on the completed tag"
    assert got["catOp"] == ['cat:"Home and garden"'], "a category with spaces is quoted after cat:"
    assert got["other"] == [], "a box that is not about notes completes only from its own recents"
    assert got["empty"] == ["recent:budget meeting"], "an empty notes box offers its recents"


def test_every_search_box_names_its_scope_and_the_web_panel_shares_the_store() -> None:
    html = INDEX.read_text(encoding="utf-8")
    scoped = re.findall(r'<input[^>]*\bid="([a-z-]+)"[^>]*\bdata-search-scope="([a-z]+)"', html)
    ids = {name for name, _ in scoped}
    assert ids >= {
        "finder-input", "note-search", "timeline-search", "graph-search", "library-search",
        "library-docs-search", "library-boards-search", "library-images-search", "bookmark-search",
        "recordings-search", "skills-search", "web-query",
    }, f"a search box lost its scope: {sorted(ids)}"
    chat = (JS / "chat.js").read_text(encoding="utf-8")
    assert "localStorage.removeItem(WEB_SEARCH_HISTORY_KEY)" not in chat
    assert "web-recent-remove" in chat and "clearWebSearchHistory" in chat, "the web recents carry a remove per row and a Clear"
    assert 'const SEARCH_RECENT_PREFIX = "searchRecent:"' in SUGGEST.read_text(encoding="utf-8")


def test_the_suggestions_are_a_lazy_bundle_called_from_a_boot_listener() -> None:
    app = (JS / "app.js").read_text(encoding="utf-8")
    assert 'searchSuggest: ["/js/search-suggest.js"]' in app
    capture = (JS / "capture-ask.js").read_text(encoding="utf-8")
    assert "input[data-search-scope]" in capture
    assert 'ensureModule("searchSuggest").then(() => openSearchSuggest(box))' in capture


def test_the_list_follows_the_recipes_and_never_nests_a_control_in_an_option() -> None:
    source = SUGGEST.read_text(encoding="utf-8")
    assert "richPickerRow(" in source and "richPickerGroup(" in source
    assert 'setAttribute("role", "option")' not in source, "rows come from richPickerRow, never by hand"
    # The row's x is a pointer-only span: a <button> in an option is axe's nested-interactive.
    assert re.search(r'remove\.setAttribute\("aria-hidden", "true"\)', source)
    css = (ROOT / "frontend" / "css" / "05-sidebars-themes.css").read_text(encoding="utf-8")
    block = css[css.index(".search-suggest {") : css.index(".search-suggest-ghost.hidden")]
    assert "backdrop-filter" not in block, "an opaque list: nothing to put on the glass-off list"
    assert "var(--shadow-lg)" in block
    assert re.search(r"\.tag-suggest,\s*\.search-suggest,\s*\.search-suggest-ghost \{\s*z-index: 2550;", css), "the escaped menus' one layer, not a new literal"
