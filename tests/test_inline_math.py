"""Inline `$x$` maths draws as maths, not as a Unicode stand-in.

INBOX 423(c): Read view (`renderMarkdown`, notes, chat, the documents Read
pane, all built on `renderInlineMarkdown`/`appendInline` in app.js) ran every
inline `$…$` span through `unlatex`, whose job was to turn the dozen LaTeX
commands it knows (`\\alpha`, `\\rightarrow`, …) into a plain Unicode
character so a stray formula in a bullet point did not need a whole maths
engine. That is the right call for a single arrow, and the wrong one for an
actual formula: `$x^2$` has no command for the symbol table to swap, so it
never even tried, and a genuine `$\\alpha$` came out as the bare letter "α"
instead of the same TeX-to-MathML rendering the `$$…$$` blocks already get
(`docMathRender` in documents.js, `tests/test_doc_math.py`).

The fix is `INLINE_MATH_RE` (app.js, beside `unlatex`): a `$…$` span that
matches its rule (no space just inside either delimiter, the closing `$` not
immediately followed by a digit or a second `$`) is now carried through
`unlatex` untouched, so `renderInlineMarkdown` can draw it as real maths
downstream instead. Everything that does not match, a price ("$5 and
$10"), a `$$…$$` display block, a stray `\\rightarrow` with no dollars
around it at all, keeps exactly the behaviour it had before.

This only exercises `unlatex` and `INLINE_MATH_RE`, which are pure string/
regex work with no DOM in them (the same reason `test_doc_math.py` tests
`docMathTree` rather than the `document.createElementNS` calls around it):
node can run them directly, so a mistake here shows up without a browser.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "frontend" / "app.js"


def unlatex_source() -> str:
    text = APP.read_text(encoding="utf-8")
    start = text.index("const LATEX_SYMBOLS = {")
    fn_start = text.index("function unlatex(text) {", start)
    end = text.index("\n}\n", fn_start) + 3
    return text[start:end]


DRIVER = r"""
const results = [];
const check = (name, ok, detail) => results.push({ name, ok: !!ok, detail: detail == null ? null : String(detail) });

// --- unlatex: what survives untouched for the maths renderer to draw ------

// A span INLINE_MATH_RE claims comes back byte for byte: no symbol swap, no
// stripped delimiters, whether or not it holds a \command at all.
const PRESERVED = [
  "$x$",                       // a bare variable: never touched at all before
  "$\\alpha$",                 // used to become the bare letter "α"
  "$x^2$",                     // no \command, so the old rule never noticed it either
  "$\\rightarrow$",            // used to become the bare arrow "→"
  "$a+b=c$",
];
for (const tex of PRESERVED) {
  const got = unlatex(tex);
  check(`preserved/${tex}`, got === tex, got);
}

// A sentence around one still leaves the rest of the sentence alone.
{
  const got = unlatex("The value of $x^2$ is shown below.");
  check("preserved in a sentence", got === "The value of $x^2$ is shown below.", got);
}

// --- what still does not qualify, and keeps its old behaviour -------------

// A price, or two: the closing $ is immediately followed by a digit, or (in
// the two-price case) the second $ is preceded by a space, and either one
// alone is enough to keep INLINE_MATH_RE from ever matching.
check("price untouched", unlatex("It costs $5 today") === "It costs $5 today", unlatex("It costs $5 today"));
check(
  "two prices untouched",
  unlatex("cost $5 and $10 today") === "cost $5 and $10 today",
  unlatex("cost $5 and $10 today"),
);
check(
  "a price range untouched",
  unlatex("Between $20 and $30 for one") === "Between $20 and $30 for one",
  unlatex("Between $20 and $30 for one"),
);

// A space just inside a delimiter does not qualify as maths either, so the
// span falls back to the old rule: swap what resolves, delimiters and all
// (the extra space in the result is the old rule's own behaviour, carried
// over unchanged: the inner text, spaces included, is what replaces the
// whole "$…$" span once its command resolves).
check(
  "space after open falls back to symbol swap",
  unlatex("Jokes $ \\rightarrow$ Social Skills") === "Jokes  → Social Skills",
  unlatex("Jokes $ \\rightarrow$ Social Skills"),
);
check(
  "space before close falls back to symbol swap",
  unlatex("Jokes $\\rightarrow $ Social Skills") === "Jokes →  Social Skills",
  unlatex("Jokes $\\rightarrow $ Social Skills"),
);

// A bare command with no dollars around it at all is untouched by this
// change: it is not inline maths, it is the model reaching for notation,
// and the plain symbol table still catches it (§35H comment beside
// LATEX_SYMBOLS).
check(
  "bare command, no dollars, still swaps",
  unlatex("Jokes \\rightarrow Social Skills") === "Jokes → Social Skills",
  unlatex("Jokes \\rightarrow Social Skills"),
);

// A display block reached through unlatex directly (rather than the
// rawLines path renderMarkdown gives $$ blocks) is not corrupted: neither
// dollar of a $$ pair can open or close an inline match.
check(
  "$$ display block untouched",
  unlatex("$$x^2$$") === "$$x^2$$",
  unlatex("$$x^2$$"),
);
check(
  "$$ display block inside a sentence untouched",
  unlatex("see $$x^2$$ above") === "see $$x^2$$ above",
  unlatex("see $$x^2$$ above"),
);

// --- INLINE_MATH_RE directly: the capture is the exact TeX, no more -------

{
  const m = /(?<!\$)\$(?!\$|\s)([^$\n]{1,300}?)(?<!\s)\$(?!\$|\d)/.exec("solve $x^2 + 1$ for x");
  check("capture is the exact tex", !!m && m[1] === "x^2 + 1", m && m[1]);
}

process.stdout.write(JSON.stringify(results));
"""


@pytest.fixture(scope="module")
def math_checks(tmp_path_factory) -> list[dict]:
    node = shutil.which("node")
    if not node:  # pragma: no cover - node is in the sandbox and in CI
        pytest.skip("node is not available")
    script = tmp_path_factory.mktemp("inlinemath") / "run.js"
    script.write_text(unlatex_source() + DRIVER, encoding="utf-8")
    out = subprocess.run([node, str(script)], capture_output=True, text=True, timeout=60, check=False)
    assert out.returncode == 0, out.stderr
    return json.loads(out.stdout)


def test_the_checks_ran(math_checks: list[dict]) -> None:
    assert len(math_checks) >= 13


def test_inline_maths_survives_for_the_mathml_renderer(math_checks: list[dict]) -> None:
    failed = [c for c in math_checks if not c["ok"]]
    assert not failed, "\n".join(f"{c['name']}: {c['detail']}" for c in failed[:20])


def test_render_inline_markdown_draws_inline_maths_through_the_shared_renderer() -> None:
    """`renderInlineMarkdown` must build inline maths the same way `mdMathElement`
    (the `$$` block renderer) does, through `docMathRender`, not a second
    implementation, or the two forms of the same formula can drift apart."""
    text = APP.read_text(encoding="utf-8")
    assert "function mdInlineMathElement(tex)" in text
    # Once in unlatex (deciding what to preserve), once in renderInlineMarkdown
    # (cutting maths out before the rest of the grammar runs): the same rule,
    # read from the same object, in both places.
    assert text.count("INLINE_MATH_RE.lastIndex = 0") == 2
    # Both the block and the inline element go through the one function that
    # calls docMathRender, so a fix to one can never silently miss the other.
    assert 'mdMathBox("div", "md-math-block", tex, true)' in text
    assert 'mdMathBox("span", "md-math-inline", tex, false)' in text
