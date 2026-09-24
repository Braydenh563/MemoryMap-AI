"""The document editor's prose tools (INBOX 401 and 404, the prose side).

Grammar through Harper, vendored and run in a worker. What a Python test can
hold of it is the contract around the browser: the binary and its licence are
in the tree, the policy lets WebAssembly compile without letting `eval` in,
the binary is not gzipped on every cold fetch, the switch is a preference that
round-trips, and the checker is reached lazily rather than at boot. What it
does in the page is `scratchpad/ui-sweeps/p2-harper.js`.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

from memorymap.core import security

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"
HARPER = FRONTEND / "vendor" / "harper"
DOCUMENTS = (FRONTEND / "documents.js").read_text(encoding="utf-8")
WORKER = (FRONTEND / "harper-worker.js").read_text(encoding="utf-8")


def _body(name: str) -> str:
    start = DOCUMENTS.index(f"function {name}(")
    end = DOCUMENTS.find("\n}\n", start)
    return DOCUMENTS[start:end]


# --- grammar -------------------------------------------------------------------


def test_harper_is_vendored_with_its_licence() -> None:
    assert (HARPER / "LICENSE").read_text(encoding="utf-8").lstrip().startswith("Apache License")
    for name in ("slimBinary.js", "harper_wasm_slim_bg.wasm"):
        assert (HARPER / name).is_file(), name
    #: The worker imports the loader by its hashed name; a re-vendor that
    #: changes the hash has to change the import with it.
    for spec in re.findall(r'from "\./vendor/harper/([^"]+)"', WORKER):
        assert (HARPER / spec).is_file(), f"harper-worker.js imports {spec}, which is not vendored"
    assert (HARPER / "harper_wasm_slim_bg.wasm").read_bytes()[:4] == b"\0asm"


def test_the_policy_compiles_wasm_and_still_refuses_eval() -> None:
    policy = security.build_csp([])
    script = next(part for part in policy.split("; ") if part.startswith("script-src "))
    assert "'wasm-unsafe-eval'" in script.split()
    assert "'unsafe-eval'" not in script.split()
    assert "worker-src 'self'" in policy


def test_the_binary_is_served_as_wasm_and_not_gzipped(client) -> None:
    """Measured: 755 ms to gzip it per cold fetch against 60 ms to send it."""
    response = client.get(
        "/vendor/harper/harper_wasm_slim_bg.wasm", headers={"Accept-Encoding": "gzip"}
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/wasm"
    assert "content-encoding" not in response.headers


def test_the_grammar_switch_is_a_preference_on_by_default(client) -> None:
    assert client.get("/preferences").json()["grammar_check"] is True
    assert client.put("/preferences", json={"grammar_check": False}).json()["grammar_check"] is False
    assert client.get("/preferences").json()["grammar_check"] is False


def test_the_worker_is_same_origin_and_started_only_on_demand() -> None:
    """`harper.js`'s own WorkerLinter builds a `blob:` worker, which
    `worker-src 'self'` refuses without a sound; and a worker started at load
    would fetch 15.9 MB on every launch whether or not anything is written."""
    code = "\n".join(line for line in WORKER.splitlines() if not line.lstrip().startswith("//"))
    assert "createObjectURL" not in code and "WorkerLinter" not in code
    assert 'import { slimBinary } from "./vendor/harper/slimBinary.js"' in WORKER
    starts = [m.start() for m in re.finditer(r"new Worker\(`\$\{DOC_GRAMMAR_WORKER_URL\}", DOCUMENTS)]
    assert len(starts) == 1
    assert starts[0] > DOCUMENTS.index("function docGrammarAsk(")
    assert starts[0] < DOCUMENTS.index("function docGrammarMessage(")


def test_harper_spelling_is_left_to_the_dictionary_and_never_fixed_in_bulk() -> None:
    assert 'DOC_GRAMMAR_SKIP_KINDS = new Set(["Spelling"])' in DOCUMENTS
    #: "Fix all" applies every non-null replacement without asking.
    assert "replacement: null," in _body("docGrammarFindings")


def test_a_grammar_finding_is_drawn_filed_and_answered() -> None:
    assert 'return "grammar";' in _body("docFindingKind")
    assert '["grammar", "Grammar"]' in DOCUMENTS
    assert "finding.alternatives" in _body("docSuggestAlternatives")
    assert "docProseExtras(text, docProseFindings(text))" in _body("renderDocProse")


def test_the_note_boxes_get_the_grammar_plugin() -> None:
    assert "noteGrammarPlugin(CM)" in _body("noteSurfaceExtensions")


# --- suggestion mode -----------------------------------------------------------
#
# The model between DOC-SUGGEST-BEGIN and DOC-SUGGEST-END is pure string work,
# run here in node: what one keystroke does to the text and where it leaves
# the caret, which is the whole of the feature's correctness.

SUGGEST_DRIVER = r"""
const results = [];
const eq = (name, got, want) => results.push({ name, ok: JSON.stringify(got) === JSON.stringify(want), detail: JSON.stringify(got) });
const run = (text, from, to, insert, back) => docSuggestEdit(text, from, to, insert, back);

eq('type/opens an insertion', run('hello world', 5, 5, 'X', false), { text: 'hello{++X++} world', caret: 9 });
eq('type/extends it', run('hello{++X++} world', 9, 9, 'Y', false), { text: 'hello{++XY++} world', caret: 10 });
eq('type/next to an insertion joins it', run('a{++X++}b', 8, 8, 'Z', false), { text: 'a{++XZ++}b', caret: 6 });
eq('backspace/wraps a letter', run('abc', 2, 3, '', true), { text: 'ab{--c--}', caret: 2 });
eq('backspace/a run is one deletion', run('ab{--c--}', 1, 2, '', true), { text: 'a{--bc--}', caret: 1 });
eq('backspace/over your own insertion deletes it', run('a{++XY++}b', 5, 6, '', true), { text: 'a{++X++}b', caret: 5 });
eq('backspace/the last inserted letter leaves nothing', run('a{++X++}b', 4, 5, '', true), { text: 'ab', caret: 1 });
eq('backspace/over a marker reaches the letter', run('a{++X++}b', 5, 8, '', true), { text: 'ab', caret: 1 });
eq('backspace/after a deletion reaches the letter before it', run('x{--abc--}', 7, 10, '', true), { text: '{--xabc--}', caret: 0 });
eq('delete/forward wraps and steps past', run('abc', 0, 1, '', false), { text: '{--a--}bc', caret: 7 });
eq('replace/a selection becomes both', run('the cat', 4, 7, 'dog', false), { text: 'the {--cat--}{++dog++}', caret: 19 });
eq('type/inside a deletion goes after it', run('a{--bc--}d', 5, 5, 'Q', false), { text: 'a{--bc--}{++Q++}d', caret: 13 });
eq('normalise/only near the edit', run('a --}{-- b and more', 18, 18, 'X', false), { text: 'a --}{-- b and mor{++X++}e', caret: 22 });
eq('resolve/accept all', docSuggestResolveAll('a{++X++}b{--c--}d', true), 'aXbd');
eq('resolve/reject all', docSuggestResolveAll('a{++X++}b{--c--}d', false), 'abcd');
eq('resolve/one edit', docSuggestResolve(docSuggestParse('a{--bc--}d')[0], false), { from: 1, to: 9, insert: 'bc' });
eq('parse/code is not a suggestion', docSuggestParse('```\n{++x++}\n```\nand `{--y--}`').length, 0);
eq('parse/kinds and spans', docSuggestParse('a{++X++}b{--c--}').map((m) => [m.kind, m.start, m.end, m.body]), [['ins', 1, 8, 'X'], ['del', 9, 16, 'c']]);
eq('read/struck and highlighted', docSuggestForRead('a{++X++}b{--c--}'), 'a==X==b~~c~~');
process.stdout.write(JSON.stringify(results));
"""


def _suggest_source() -> str:
    start = DOCUMENTS.index("// DOC-SUGGEST-BEGIN")
    stop = DOCUMENTS.index("// DOC-SUGGEST-END")
    return DOCUMENTS[start:stop]


def test_suggestion_mode_edits_as_decided(tmp_path) -> None:
    node = shutil.which("node")
    if not node:  # pragma: no cover - node is in the sandbox and in CI
        pytest.skip("node is not available")
    script = tmp_path / "suggest.js"
    script.write_text(_suggest_source() + SUGGEST_DRIVER, encoding="utf-8")
    out = subprocess.run([node, str(script)], capture_output=True, text=True, timeout=60, check=False)
    assert out.returncode == 0, out.stderr
    failed = [f"{r['name']}: {r['detail']}" for r in json.loads(out.stdout) if not r["ok"]]
    assert not failed, "\n".join(failed)


def test_suggestion_mode_is_wired_and_reachable() -> None:
    html = (FRONTEND / "index.html").read_text(encoding="utf-8")
    for element in ("doc-suggest-mode", "doc-suggest-next", "doc-suggest-accept-all", "doc-suggest-reject-all", "doc-suggest-status"):
        assert f'id="{element}"' in html, element
        assert f'$("{element}")' in DOCUMENTS, element
    assert "docProseToolExtensions(CM)" in _body("docCmExtensions")
    assert "docSuggestForRead(" in _body("renderDocPreview")


# --- read aloud ----------------------------------------------------------------

READ_DRIVER = r"""
const results = [];
const eq = (name, got, want) => results.push({ name, ok: JSON.stringify(got) === JSON.stringify(want), detail: JSON.stringify(got) });
eq('speak/syntax is not said', docSpeakable('## A **bold** [link](http://x) and `code`'), 'A bold link and code');
eq('speak/a suggested deletion is not said', docSpeakable('Keep {--this --}{++that++} word'), 'Keep that word');
eq('speak/a task box is not said', docSpeakable('- [x] Done it'), 'Done it');
eq('speak/a comment is not said', docSpeakable('Words %%note to self%% here.'), 'Words here.');
const text = '# Title\n\nOne. Two!\n\n```\nnot read.\n```\n';
const spans = docReadAloudSentences(text, 0, text.length).map((s) => text.slice(s.from, s.to));
eq('sentences/per line, fences skipped', spans, ['# Title', 'One.', 'Two!']);
const part = docReadAloudSentences(text, text.indexOf('Two'), text.indexOf('Two') + 4).map((s) => text.slice(s.from, s.to));
eq('sentences/clipped to the range', part, ['Two!']);
process.stdout.write(JSON.stringify(results));
"""


def test_read_aloud_says_words_not_markdown(tmp_path) -> None:
    node = shutil.which("node")
    if not node:  # pragma: no cover - node is in the sandbox and in CI
        pytest.skip("node is not available")
    start = DOCUMENTS.index("function docSpeakable(")
    stop = DOCUMENTS.index("let docReadAloud = null;")
    script = tmp_path / "read.js"
    script.write_text(DOCUMENTS[start:stop] + READ_DRIVER, encoding="utf-8")
    out = subprocess.run([node, str(script)], capture_output=True, text=True, timeout=60, check=False)
    assert out.returncode == 0, out.stderr
    failed = [f"{r['name']}: {r['detail']}" for r in json.loads(out.stdout) if not r["ok"]]
    assert not failed, "\n".join(failed)


def test_read_aloud_is_reachable_and_stoppable() -> None:
    html = (FRONTEND / "index.html").read_text(encoding="utf-8")
    for element in ("doc-read-aloud", "doc-read-stop"):
        assert f'id="{element}"' in html and f'$("{element}")' in DOCUMENTS, element
    #: Local voices first: a network voice is the one thing this app avoids.
    assert "localService !== false" in _body("docReadAloudVoice")
    assert "docReadAloudExtension(CM)" in _body("docProseToolExtensions")


# --- accessibility -------------------------------------------------------------

A11Y_DRIVER = r"""
const results = [];
const eq = (name, got, want) => results.push({ name, ok: JSON.stringify(got) === JSON.stringify(want), detail: JSON.stringify(got) });
const rules = (text) => docAccessFindings(text).map((f) => [f.rule, f.text]);
eq('heading/a skipped level', rules('# A\n\n### C\n'), [['heading-order', '### C']]);
eq('heading/the fix is one level down', docAccessFindings('## A\n#### B\n')[0].alternatives, ['### B']);
eq('heading/going back up is fine', rules('# A\n## B\n### C\n# D\n## E\n'), []);
eq('heading/the first heading sets no rule', rules('### Start deep\n'), []);
eq('heading/fences and frontmatter are not headings', rules('---\ntitle: x\n---\n# A\n```\n### not a heading\n```\n'), []);
eq('image/no alt', rules('See ![](pic.png) and ![a cat](cat.png)'), [['image-alt', '![](pic.png)']]);
eq('image/html without alt', rules('<img src="a.png"> <img src="b.png" alt="A chart">'), [['image-alt', '<img src="a.png">']]);
eq('link/vague text', rules('[Click here](http://x). [the report](http://y) and [more](z)'), [['link-text', '[Click here](http://x)'], ['link-text', '[more](z)']]);
eq('link/an address as its text', rules('[https://example.com](https://example.com)'), [['link-text', '[https://example.com](https://example.com)']]);
eq('link/code is not checked', rules('`[here](x)` and\n```\n![](y)\n```\n'), []);
process.stdout.write(JSON.stringify(results));
"""


def test_accessibility_findings_as_decided(tmp_path) -> None:
    node = shutil.which("node")
    if not node:  # pragma: no cover - node is in the sandbox and in CI
        pytest.skip("node is not available")
    a11y = DOCUMENTS[DOCUMENTS.index("// DOC-A11Y-BEGIN") : DOCUMENTS.index("// DOC-A11Y-END")]
    script = tmp_path / "a11y.js"
    script.write_text(_suggest_source() + a11y + A11Y_DRIVER, encoding="utf-8")
    out = subprocess.run([node, str(script)], capture_output=True, text=True, timeout=60, check=False)
    assert out.returncode == 0, out.stderr
    failed = [f"{r['name']}: {r['detail']}" for r in json.loads(out.stdout) if not r["ok"]]
    assert not failed, "\n".join(failed)


def test_accessibility_is_its_own_group_in_the_panel() -> None:
    assert 'return "access";' in _body("docFindingKind")
    assert '["access", "Accessibility"]' in DOCUMENTS
    assert "docAccessFindings(text)" in _body("docProseExtras")
