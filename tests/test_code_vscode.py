"""Code documents as a code editor, part four: the rest of VS Code's editing.

The owner, 2026-09-23 (INBOX 402): "are there any other vscode features we
can add to the document editor like emmet for other languages or file
types??" And on Ctrl+/, that it should comment the way VS Code does.

These run the vendored CodeMirror bundle itself in node, with the app's own
language table (`docCmLanguageFor`) and the app's own functions lifted out
of documents.js, so a command is held to the exact text it produces in the
language the app really mounts. The keys reaching them are measured in
Chromium by `scratchpad/ui-sweeps/doccodevs.js`.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
DOCUMENTS_JS = ROOT / "frontend" / "documents.js"
CM_JS = ROOT / "frontend" / "vendor" / "codemirror" / "codemirror.min.js"

node = pytest.mark.skipif(shutil.which("node") is None, reason="node is not installed")


def _source() -> str:
    return DOCUMENTS_JS.read_text(encoding="utf-8")


def _function(name: str) -> str:
    text = _source()
    start = text.index(f"function {name}(")
    return text[start : text.index("\n}\n", start) + 3]


#: What each call gets: a state in the app's language for `ext`, the text
#: with `|` for the caret or `[` `]` for a selection.
_PRELUDE = r"""
const parse = (marked) => {
  const a = marked.indexOf("["), b = marked.indexOf("]"), c = marked.indexOf("|");
  if (c >= 0) return { doc: marked.slice(0, c) + marked.slice(c + 1), anchor: c, head: c };
  if (a >= 0 && b > a) return { doc: marked.slice(0, a) + marked.slice(a + 1, b) + marked.slice(b + 1), anchor: a, head: b - 1 };
  return { doc: marked, anchor: 0, head: 0 };
};
const stateFor = (ext, marked, extra = []) => {
  const { doc, anchor, head } = parse(marked);
  const state = CM.state.EditorState.create({ doc, selection: { anchor, head }, extensions: [docCmLanguageFor(CM, ext), extra] });
  CM.language.ensureSyntaxTree(state, state.doc.length, 5000);
  return state;
};
const target = (state) => {
  const t = { state, dispatch: (tr) => { t.state = tr.state; } };
  return t;
};
"""


def run(functions: list[str], body: str, calls: list) -> list:
    script = (
        CM_JS.read_text(encoding="utf-8")
        + "\nconst CM = CM6;\n"
        + "\n".join(_function(f) for f in ["docCmLanguageFor", *functions])
        + _PRELUDE
        + body
        + f"\nconst calls = {json.dumps(calls)};\n"
        "console.log(JSON.stringify(calls.map(([name, ...args]) => fns[name](...args))));\n"
    )
    #: On stdin: the bundle is 795 KB, past the kernel's limit for one
    #: argument (128 KB), so `node -e` cannot carry it.
    out = subprocess.run(["node", "-"], input=script, capture_output=True, text=True, timeout=60)
    assert out.returncode == 0, out.stderr[-2000:]
    return json.loads(out.stdout)


# --- 1. the comment toggle, by the language at the caret ------------------------

_COMMENT = """
const fns = {
  toggle: (ext, marked, block) => {
    const t = target(stateFor(ext, marked));
    const done = docCodeCommentRun(CM, t, block);
    return done ? t.state.doc.toString() : null;
  },
  twice: (ext, marked) => {
    const t = target(stateFor(ext, marked));
    docCodeCommentRun(CM, t, false);
    docCodeCommentRun(CM, t, false);
    return t.state.doc.toString();
  },
};
"""

_HTML = "<p>x</p>\n<script>\n  let a = 1;|\n</script>\n<style>\n  a { color: red; }\n</style>"


@node
@pytest.mark.parametrize(
    ("ext", "marked", "block", "expected"),
    [
        # The owner's gap: one HTML file, three languages, by the caret.
        ("html", _HTML, False, "<p>x</p>\n<script>\n  // let a = 1;\n</script>\n<style>\n  a { color: red; }\n</style>"),
        (
            "html",
            _HTML.replace("1;|", "1;").replace("red; }", "red; }|"),
            False,
            "<p>x</p>\n<script>\n  let a = 1;\n</script>\n<style>\n  /* a { color: red; } */\n</style>",
        ),
        ("html", "<p>x|</p>", False, "<!-- <p>x</p> -->"),
        # JSX children take braces, the code around them `//`.
        (
            "js",
            "const A = () => (\n  <div>\n    <span>hi</span>|\n  </div>\n);",
            False,
            "const A = () => (\n  <div>\n    {/* <span>hi</span> */}\n  </div>\n);",
        ),
        ("js", "const a = 1;|", False, "// const a = 1;"),
        ("ts", "let a: number = 1;|", False, "// let a: number = 1;"),
        ("css", "a { color: red; }|", False, "/* a { color: red; } */"),
        ("py", "x = 1|", False, "# x = 1"),
        # A grammar from the legacy modes brings its own tokens too.
        ("c", "int x = 1;|", False, "// int x = 1;"),
        ("sql", "select 1;|", False, "-- select 1;"),
        # The marker goes after the indentation, never at column zero.
        ("py", "if x:\n    [y = 1]", False, "if x:\n    # y = 1"),
        # A block keeps its shape: the marker at the block's own indent.
        ("py", "[if x:\n    y = 1]", False, "# if x:\n#     y = 1"),
        # Blank lines are left alone.
        ("py", "[a = 1\n\nb = 2]", False, "# a = 1\n\n# b = 2"),
        # Uncomment only when every line is commented: a real comment inside
        # the selection is not stripped, it is commented with the rest.
        ("py", "[# a\nb = 2]", False, "# # a\n# b = 2"),
        ("py", "[# a\n# b]", False, "a\nb"),
        # Shift+Alt+A: a block comment around the selection.
        ("js", "f([a + b])", True, "f(/* a + b */)"),
        ("css", "a { [color: red;] }", True, "a { /* color: red; */ }"),
        ("html", "<p>[x]</p>", True, "<p><!-- x --></p>"),
    ],
)
def test_the_comment_toggle_follows_the_language_at_the_caret(ext, marked, block, expected):
    assert run(["docCodeCommentRun"], _COMMENT, [["toggle", ext, marked, block]])[0] == expected


@node
@pytest.mark.parametrize(
    ("ext", "marked"),
    [
        ("py", "[if x:\n    y = 1\n\n    z = 2]"),
        ("js", "[function f() {\n  return 1;\n}]"),
        ("html", "<div>\n  <p>x|</p>\n</div>"),
        ("css", "a {\n  color: red;|\n}"),
    ],
)
def test_the_comment_toggle_round_trips_exactly(ext, marked):
    plain = marked.replace("[", "").replace("]", "").replace("|", "")
    assert run(["docCodeCommentRun"], _COMMENT, [["twice", ext, marked]])[0] == plain


def test_ctrl_slash_delegates_for_code_and_keeps_its_rules_for_prose():
    body = _function("toggleDocComment")
    assert body.index("docCodeCommentAtCaret(box)") < body.index("docUndoBreak()"), (
        "a code document is commented by the language at the caret first"
    )
    at = _function("docCodeCommentAtCaret")
    assert "type.previewable" in at and 'docView === "plain"' in at
    #: A grammar with no comment tokens falls back to the file type's marker.
    assert "if (!docCodeCommentRun(CM, target, block)) return false;" in at


def test_ctrl_slash_has_one_owner_per_surface():
    """Measured before the fix: Ctrl+/ on a line of prose left a lone "/".
    The editor's keymap commented the line and selected it, then the global
    registry's `editorMenu` wrote "/" over the selection. In a document the
    comment owns the chord; in a note box the blocks menu does."""
    app = (ROOT / "frontend" / "app.js").read_text(encoding="utf-8")
    assert 'if (id === "editorMenu" && e.defaultPrevented) continue;' in app
    notes = _function("noteSurfaceKeymap")
    assert '"Mod-/"' not in notes, "a note box's Ctrl+/ is the blocks menu, not a comment"
    assert '{ key: "Mod-/", run: () => { toggleDocComment(surface()); return true; } }' in _function("docCmKeymap")


def test_sql_mounts_the_mode_not_the_factory():
    """`sql` in the legacy modes is the function that makes a mode; mounting
    it threw from the parser and a .sql document could not be opened."""
    assert 'case "sql": return stream(CM.standardSQL);' in _function("docCmLanguageFor")


def test_block_comment_is_in_the_palette_on_a_free_key():
    source = _source()
    table = source[source.index("// DOC-COMMANDS-BEGIN") : source.index("// DOC-COMMANDS-END")]
    assert 'keys: "Shift+Alt+A",\n    code: true' in table
    app = (ROOT / "frontend" / "app.js").read_text(encoding="utf-8")
    assert '"Shift+Alt+A"' not in app and '"Alt+Shift+A"' not in app, "Shift+Alt+A is taken in the registry"


# --- 6. bracket pair colours and indentation guides -------------------------------

_BRACKETS = """
const fns = {
  depths: (ext, text) => {
    const state = stateFor(ext, text + "|");
    const tree = CM.language.ensureSyntaxTree(state, state.doc.length, 5000);
    return docBracketDepths(text, 0, (i) => !DOC_BRACKET_NOT_CODE.test(tree.resolveInner(i, 1).name))
      .map(([i, d]) => text[i] + d).join(" ");
  },
};
"""


def _const(name: str) -> str:
    text = _source()
    start = text.index(f"const {name} = ")
    return text[start : text.index("\n", start) + 1]


@node
@pytest.mark.parametrize(
    ("ext", "text", "depths"),
    [
        # Nested pairs take the next tone; a closer takes its opener's.
        ("js", "f(a[b{c}])", "(0 [1 {2 }2 ]1 )0"),
        # A bracket in a string, a comment or a regex is not a bracket.
        ("js", 'f("(", /[(]/)\n// (\ng()', "(0 )0 (0 )0"),
        ("py", "x = [f(1), '(']  # (", "[0 (1 )1 ]0"),
        ("css", 'a { b: url("(") }', "{0 (1 )1 }0"),
        # HTML's text is prose; its script is code.
        ("html", "<p>(a)</p>\n<script>f([1])</script>", "(0 [1 ]1 )0"),
        # A stream mode's own string tokens count too.
        ("c", 'int x = f("(", a[0]);', "(0 [1 ]1 )0"),
    ],
)
def test_bracket_depths_skip_what_is_not_code(ext, text, depths):
    body = _const("DOC_BRACKET_NOT_CODE") + _BRACKETS
    assert run(["docBracketDepths"], body, [["depths", ext, text]])[0] == depths


def test_guides_and_brackets_are_mounted_for_code_and_drawn_quietly():
    extras = _function("docCompletionExtras")
    assert 'docIndentGuides(CM, type.indent || "  ")' in extras and "docBracketColours(CM)" in extras
    theme = _source().split("function docCmTheme(CM) {", 1)[1].split("\nfunction ", 1)[0]
    guide = theme.split('".cm-indent-guide"', 1)[1].split("}", 1)[0]
    assert "var(--border)" in guide
    for k in range(3):
        rule = theme.split(f'".cm-bracket-{k}"', 1)[1].split("}", 1)[0]
        assert "color-mix(in srgb, var(--" in rule and "70%, var(--text))" in rule


@pytest.mark.skipif(shutil.which("node") is None, reason="node is not installed")
@pytest.mark.parametrize(
    ("lead", "unit", "steps"),
    [
        ("        ", "    ", [[0, 4], [4, 8]]),
        ("      ", "    ", [[0, 4]]),
        ("\t\t", "\t", [[0, 1], [1, 2]]),
        ("  ", "  ", [[0, 2]]),
        ("", "    ", []),
        # Tabs and spaces mixed: each tab a step, each full run of spaces one.
        ("\t    ", "    ", [[0, 1], [1, 5]]),
    ],
)
def test_indent_steps(lead, unit, steps):
    script = _function("docIndentSteps") + "\nconst a = JSON.parse(process.argv[1]);\nconsole.log(JSON.stringify(docIndentSteps(a[0], a[1])));\n"
    out = subprocess.run(["node", "-e", script, json.dumps([lead, unit])], capture_output=True, text=True, check=True, timeout=60)
    assert json.loads(out.stdout) == steps


# --- 7. symbols: the outline and the breadcrumb of a code file ---------------------

_SYMBOLS = """
const fns = {
  symbols: (ext, text) => docCodeSymbols(CM, stateFor(ext, text + "|"), ext).map((s) => [s.line, s.level, s.text]),
};
"""


@node
@pytest.mark.parametrize(
    ("ext", "text", "symbols"),
    [
        (
            "js",
            "function f(a) {}\nclass A {\n  m() {}\n  static n = 1;\n}\nconst g = () => 1;\nconst v = 3;\n// function nope() {}\nconst s = 'class B {}';",
            [[0, 1, "f()"], [1, 1, "class A"], [2, 2, "m()"], [5, 1, "g()"]],
        ),
        (
            "ts",
            "interface I { a: number }\ntype T = string;\nenum E { A }\nexport function k(): void {}",
            [[0, 1, "interface I"], [1, 1, "type T"], [2, 1, "enum E"], [3, 1, "k()"]],
        ),
        (
            "py",
            "# class Comment:\ndef f(x):\n    pass\nclass A:\n    def m(self):\n        def inner():\n            pass",
            [[1, 1, "f()"], [3, 1, "class A"], [4, 2, "m()"], [5, 3, "inner()"]],
        ),
        (
            "css",
            ".card > p, a:hover { color: red }\n@media (max-width: 600px) {\n  .x { color: red }\n}",
            [[0, 1, ".card > p, a:hover"], [1, 1, "@media (max-width: 600px)"], [2, 2, ".x"]],
        ),
        ("go", "func main() {}", []),
    ],
)
def test_code_symbols(ext, text, symbols):
    assert run(["docCodeSymbols"], _const("DOC_SYMBOL_EXTS") + _SYMBOLS, [["symbols", ext, text]])[0] == symbols


def test_the_outline_reads_symbols_for_code_and_never_moves_them():
    outline = _function("renderDocOutline")
    assert "if (fileType.previewable) headings = docScanHeadings(text);" in outline
    assert "docCodeSymbols(window.CM6, docCmView.state, fileType.ext)" in outline
    assert "if (!needle && !heading.symbol) {" in outline
    assert "if (heading.symbol) return;" in outline
    source = _source()
    table = source[source.index("// DOC-COMMANDS-BEGIN") : source.index("// DOC-COMMANDS-END")]
    assert 'label: "Go to a symbol in this file", keys: "",\n    code: true, run: () => docOpenSymbols() }' in table
    app = (ROOT / "frontend" / "app.js").read_text(encoding="utf-8")
    assert 'newChat: { keys: "Ctrl+Shift+O"' in app, "if the chord is free again, give it to the symbols"
