"""Code documents as a code editor, part three: completions, Emmet, ghost text.

The owner, 2026-09-23 (INBOX 394 (c)): "on the document editor code files I
want ALL THE PREFILL SUGGESTIONS AND POPUP BOXES FOR OPTIONS. like if I do
just '!' on a document and press enter it does base html code, or for all
the available css properties for that css feature, or doinf inline
suggestions."

The list itself is CodeMirror's own and is measured in Chromium by
`scratchpad/ui-sweeps/doccomplete.js`. What decides *which words are offered
and what text results* is pure string work in documents.js's `DOC-COMPLETE`
region, run here in node against the vendored Emmet bundle itself, so an
expansion is held to the exact text it must produce.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
DOCUMENTS_JS = ROOT / "frontend" / "documents.js"
EMMET_JS = ROOT / "frontend" / "vendor" / "emmet" / "emmet.min.js"

node = pytest.mark.skipif(shutil.which("node") is None, reason="node is not installed")


def _source() -> str:
    return DOCUMENTS_JS.read_text(encoding="utf-8")


def _region() -> str:
    text = _source()
    start, stop = text.find("// DOC-COMPLETE-BEGIN"), text.find("// DOC-COMPLETE-END")
    assert start != -1 and stop > start, "the DOC-COMPLETE markers are missing from documents.js"
    return text[start:stop]


def _function(name: str) -> str:
    text = _source()
    start = text.index(f"function {name}(")
    return text[start : text.index("\n}\n", start)]


def run(calls: list) -> list:
    """Evaluate `[name, *args]` calls against the region, with `E` the bundle."""
    script = (
        EMMET_JS.read_text(encoding="utf-8")
        + "\n"
        + _region()
        + "\nconst E = EMMET;\n"
        "const fns = {docEmmetAt, docGhostSuffix, docCssValueContext};\n"
        "fns.at = (line, col, syntax, anywhere) => {"
        " const f = docEmmetAt(line, col, syntax, E, anywhere); return f && [f.abbr, f.start, f.end]; };\n"
        "fns.expand = (abbr, syntax) => { const x = docEmmetExpansion(E, abbr, syntax);"
        " return x && [x.preview, x.template]; };\n"
        "fns.values = (property) => docCssValueOptions(property, docCssValueTable(E)).map((o) => o.label);\n"
        "const calls = JSON.parse(process.argv[1]);\n"
        "console.log(JSON.stringify(calls.map(([name, ...args]) => fns[name](...args))));\n"
    )
    out = subprocess.run(
        ["node", "-e", script, json.dumps(calls)], capture_output=True, text=True, check=True, timeout=60
    )
    return json.loads(out.stdout)


def one(name: str, *args):
    return run([[name, *args]])[0]


# --- Emmet: which text is an abbreviation ------------------------------------


@node
@pytest.mark.parametrize(
    ("line", "col", "syntax", "anywhere", "found"),
    [
        # The owner's case: `!` alone on a line.
        ("!", 1, "html", False, ["!", 0, 1]),
        ("  !", 3, "html", False, ["!", 2, 3]),
        ("div.card>ul>li*3", 16, "html", False, ["div.card>ul>li*3", 0, 16]),
        # The closer `closeBrackets` typed ahead of the caret is part of it.
        ("a[href]", 6, "html", False, ["a[href]", 0, 7]),
        ("p{text}", 6, "html", False, ["p{text}", 0, 7]),
        # Straight after a tag on the same line.
        ("<div>ul>li", 10, "html", False, ["ul>li", 5, 10]),
        # A tag's name on its own line is offered; a word of prose is not.
        ("  section", 9, "html", False, ["section", 2, 9]),
        ("  hello", 7, "html", False, None),
        # Mid-sentence, never on typing (a paragraph would pop a list at
        # every "a" and "p"), but Tab asks for it on purpose.
        ("Read this p", 11, "html", False, None),
        ("Read this p", 11, "html", True, ["p", 10, 11]),
        # A caret inside a word is not at the end of an abbreviation.
        ("divider", 3, "html", False, None),
        # CSS: Emmet's own shorthands at a property's place.
        ("  m10", 5, "css", False, ["m10", 2, 5]),
        ("  df", 4, "css", False, ["df", 2, 4]),
        ("a { bgc", 7, "css", False, ["bgc", 4, 7]),
        ("  jcc", 5, "css", False, ["jcc", 2, 5]),
        # A property name being typed is the language's list, not Emmet's,
        # and so is what Emmet could only make `columns: ;` of.
        ("  col", 5, "css", False, None),
        ("  pos", 5, "css", False, None),
        ("  color", 7, "css", False, None),
        # One letter is every property that starts with it: noise.
        ("  c", 3, "css", False, None),
        # In a value, never.
        ("  color: re", 11, "css", False, None),
    ],
)
def test_the_abbreviation_at_the_caret(line, col, syntax, anywhere, found):
    assert one("at", line, col, syntax, anywhere) == found


@node
def test_bang_expands_to_the_html5_boilerplate():
    preview, template = one("expand", "!", "html")
    assert preview.startswith("<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n")
    assert "\t<meta charset=\"UTF-8\">\n" in preview
    assert "<title>Document</title>" in preview
    assert preview.endswith("<body>\n\t\n</body>\n</html>")
    #: Tab stops: the title is a field with its placeholder, the body a bare
    #: one, in CodeMirror's own snippet syntax.
    assert "<title>${5:Document}</title>" in template
    assert "<body>\n\t${6}\n</body>" in template
    #: The viewport's defaults are text: the first stop is the title.
    assert 'content="width=device-width, initial-scale=1.0"' in template
    assert re.findall(r"\$\{(\d+)", template) == ["5", "6"]
    #: An empty attribute keeps its stop.
    assert one("expand", "a[href]", "html")[1] == '<a href="${1}">${2}</a>'


@node
@pytest.mark.parametrize(
    ("abbr", "preview"),
    [
        ("div.card>ul>li*3", "<div class=\"card\">\n\t<ul>\n\t\t<li></li>\n\t\t<li></li>\n\t\t<li></li>\n\t</ul>\n</div>"),
        ("a[href]", "<a href=\"\"></a>"),
        ("p{text}", "<p>text</p>"),
        ("ul>li.item$*2", "<ul>\n\t<li class=\"item1\"></li>\n\t<li class=\"item2\"></li>\n</ul>"),
    ],
)
def test_markup_expansions(abbr, preview):
    got, template = one("expand", abbr, "html")
    assert got == preview
    #: The template is the preview with its tab stops marked and nothing else.
    assert re.sub(r"\$\{\d+(?::([^{}]*))?\}", lambda m: m.group(1) or "", template) == preview


@node
def test_braces_in_the_text_are_escaped_for_the_snippet_parser():
    """CodeMirror reads `${...}` and `#{...}` as fields; a brace that is text
    must reach it escaped or the expansion is cut at it."""
    preview, template = one("expand", "p{a {b} c}", "html")
    assert preview == "<p>a {b} c</p>"
    assert template == "<p>a \\{b\\} c</p>"


@node
@pytest.mark.parametrize(
    ("abbr", "preview"),
    [("m10", "margin: 10px;"), ("df", "display: flex;"), ("bgc", "background-color: #fff;"), ("p10-20", "padding: 10px 20px;")],
)
def test_stylesheet_expansions(abbr, preview):
    assert one("expand", abbr, "css")[0] == preview


# --- CSS: each property's own values -----------------------------------------


@node
@pytest.mark.parametrize(
    ("before", "found"),
    [
        ("a {\n  color: ", {"property": "color", "word": ""}),
        ("a { display: fl", {"property": "display", "word": "fl"}),
        ("a { border: 1px sol", {"property": "border", "word": "sol"}),
        ("a { color: red; marg", None),
        ("a { color: red;", None),
        ("a {", None),
    ],
)
def test_the_value_context(before, found):
    assert one("docCssValueContext", before) == found


@node
def test_each_property_offers_its_own_values():
    display, color, position, width, writing, cursor = run(
        [["values", p] for p in ("display", "color", "position", "width", "writing-mode", "cursor")]
    )
    #: Emmet's table is its abbreviations, not a reference: what it lacks is
    #: added and what is dead is dropped.
    assert "fit-content" in width and "auto" in width
    assert "vertical-rl" in writing and "lr-tb" not in writing
    assert "not-allowed" in cursor and "hand" not in cursor
    for word in ("flex", "grid", "none", "block", "inline-block", "contents"):
        assert word in display
    #: Its own values first, then the four every property takes.
    assert display.index("flex") < display.index("inherit")
    for word in ("red", "rebeccapurple", "transparent", "currentcolor", "inherit"):
        assert word in color
    for word in ("absolute", "relative", "fixed", "static", "sticky"):
        assert word in position
    #: A property with no keyword list still gets the four, not nothing.
    assert {"inherit", "initial", "unset", "revert"} <= set(width)
    assert len(display) == len(set(display)), "a value is offered twice"


# --- the ghost text ------------------------------------------------------------


@node
@pytest.mark.parametrize(
    ("before", "after", "label", "ghost"),
    [
        ("  col", "", "color", "or"),
        ("  Col", "", "color", "or"),
        ("x = docu", ")", "document", "ment"),
        # Only the rest of a word the caret ends; never inside one.
        ("  col", "x", "color", ""),
        # The typed text must be the start of a word, not the tail of one.
        ("  xcol", "", "color", ""),
        # A fuzzy match has no rest to show.
        ("  bgc", "", "background-color", ""),
        ("  color", "", "color", ""),
        ("  !", "", "!", ""),
        ("  de", "", "def\nx", ""),
    ],
)
def test_the_ghost_suffix(before, after, label, ghost):
    assert one("docGhostSuffix", before, after, label) == ghost


# --- wiring, which the sweep measures in Chromium ------------------------------


def test_emmet_is_vendored_with_its_licence_and_loaded_on_demand():
    vendor = ROOT / "frontend" / "vendor" / "emmet"
    for name in ("emmet.min.js", "LICENSE", "build.sh", "package.json", "entry.js"):
        assert (vendor / name).is_file(), f"frontend/vendor/emmet/{name} is missing"
    licence = (vendor / "LICENSE").read_text(encoding="utf-8")
    assert licence.startswith("MIT License") and "emmet 2.4.11" in licence
    html = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    assert "/vendor/emmet" not in html, "Emmet is for HTML and CSS documents, loaded when one opens"
    assert 'DOC_EMMET_BUNDLE = "/vendor/emmet/emmet.min.js"' in _source()


def test_the_tools_stay_off_for_prose_and_plain():
    tools = _function("docCodeTools")
    assert "type.previewable" in tools and 'docView === "plain"' in tools
    #: Prose keeps its inert completer: no sources, no typing trigger.
    assert "override: [], activateOnTyping: false" in tools
    assert "docCompletionExtras(CM, type)" in tools


def test_tab_accepts_the_suggestion_and_enter_stays_the_lists():
    extras = _function("docCompletionExtras")
    assert 'key: "Tab"' in extras and "Prec.highest" in extras
    tab = _function("docCompleteTab")
    assert "acceptCompletion(view)" in tab and "docEmmetExpandAtCaret(view" in tab
    assert "Enter" not in extras, "Enter belongs to the list's own keymap"


def test_css_uses_its_own_source_in_place_of_the_packages():
    """`override` so the value list is the property's own and not the
    package's flat list with it added on top (every value twice)."""
    extras = _function("docCompletionExtras")
    assert 'if (type.ext === "css") config.override = docCssSources(CM);' in extras
    source = _function("docCssCompletionSource")
    assert "CM.css.cssCompletionSource(context)" in source


def test_the_ghost_and_the_preview_are_drawn_in_the_apps_ink():
    theme = _source().split("function docCmTheme(CM) {", 1)[1].split("\nfunction ", 1)[0]
    ghost = theme.split('".cm-ghostText"', 1)[1].split("}", 1)[0]
    assert 'color: "var(--muted)"' in ghost
    info = theme.split('".cm-tooltip.cm-completionInfo"', 1)[1].split("}", 1)[0]
    assert "var(--modal-bg-opaque)" in info
