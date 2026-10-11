"""Code as documents (INBOX 788; DOCUMENTS_PLAN "Placed from INBOX,
2026-10-10 (code as documents)").

The owner: "can you add code templates as document templates as well??",
"maybe even add a code modules library like with the whiteboard and
mindmap??" and "a way to better interact with the ai as a coding asistant
like in vs code??". These hold the templates (each one valid in its own
language, each opening as its own file type), the snippets library and the
assistant panel's contracts. The UI itself is measured by
`scratchpad/ui-sweeps/codedocs.js` at 1440 and 390.
"""

from __future__ import annotations

import json
import shutil
import sqlite3
import subprocess
from pathlib import Path

import pytest

from memorymap.core import filetypes

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "frontend" / "js"
NODE = shutil.which("node") or "/opt/node22/bin/node"


def _templates() -> list[dict]:
    """DOC_TEMPLATES, evaluated by node, each filled as the button fills it."""
    source = (JS / "documents.js").read_text(encoding="utf-8")
    start = source.index("const DOC_TEMPLATES = [")
    end = source.index("\n];\n", start) + 4
    fill_start = source.index("function docTemplateFill(")
    fill_end = source.index("\n}\n", fill_start) + 3
    script = (
        "const docNextName = () => 'Untitled document 1';\n"
        + source[start:end]
        + source[fill_start:fill_end]
        + "console.log(JSON.stringify(DOC_TEMPLATES.map((t) => ({...t, filled: docTemplateFill(t)}))));"
    )
    out = subprocess.run([NODE, "-e", script], capture_output=True, text=True, check=True, timeout=30)
    return json.loads(out.stdout)


@pytest.fixture(scope="module")
def templates() -> list[dict]:
    if not Path(NODE).exists():
        pytest.skip("node is not installed")
    return _templates()


def _code(templates: list[dict], template_id: str) -> str:
    return next(t for t in templates if t["id"] == template_id)["filled"]["content"]


def test_every_language_the_brief_names_has_a_code_template(templates):
    code = {t["id"]: t for t in templates if t.get("group") == "code"}
    assert set(code) >= {"py-script", "py-cli", "fastapi", "js-module", "html-page", "sql-schema", "readme", "notebook", "p5"}
    for template in code.values():
        filled = template["filled"]
        assert "{{" not in filled["content"] and "{{" not in filled["title"], template["id"]
        kind = filled.get("file_type", filetypes.DEFAULT_FILE_TYPE)
        #: The type is one the server keeps as given, so the document opens in
        #: the code view of that language rather than falling back to Markdown.
        assert filetypes.normalise(kind) == kind, template["id"]
    #: Writing first, then Code: the gallery's group heads change once.
    groups = [t.get("group") or "writing" for t in templates]
    assert groups == sorted(groups, key=lambda g: g == "code")


@pytest.mark.parametrize("template_id", ["py-script", "py-cli", "fastapi", "notebook"])
def test_the_python_templates_compile(templates, template_id):
    compile(_code(templates, template_id), template_id, "exec")


def test_the_python_script_and_the_cli_run_as_written(templates, capsys):
    script = _code(templates, "py-script")
    namespace: dict = {"__name__": "__main__"}
    exec(compile(script, "py-script", "exec"), namespace)  # noqa: S102 - our own template
    namespace["test_greet"]()
    cli: dict = {"__name__": "__main__"}
    exec(compile(_code(templates, "py-cli"), "py-cli", "exec"), cli)  # noqa: S102
    assert capsys.readouterr().out.count("Hello, Ada") == 2


def test_the_sql_template_runs_in_sqlite(templates):
    db = sqlite3.connect(":memory:")
    db.executescript(_code(templates, "sql-schema"))
    rows = db.execute(
        "SELECT authors.name, books.title FROM books JOIN authors ON authors.id = books.author_id ORDER BY published"
    ).fetchall()
    assert rows == [("Italo Calvino", "Invisible Cities"), ("Ursula K. Le Guin", "The Dispossessed")]


def test_the_javascript_template_passes_its_own_tests(templates):
    if not Path(NODE).exists():
        pytest.skip("node is not installed")
    harness = """
const results = [];
const describe = (name, fn) => fn();
const it = (name, fn) => { fn(); results.push(name); };
const expect = (a) => ({ toBe: (b) => { if (a !== b) throw new Error(`${a} !== ${b}`); } });
"""
    script = harness + _code(templates, "js-module") + "\nconsole.log(results.length);"
    out = subprocess.run([NODE, "-e", script], capture_output=True, text=True, check=True, timeout=30)
    assert out.stdout.strip() == "2"


def test_the_html_template_is_one_page_with_its_title_filled(templates):
    page = _code(templates, "html-page")
    assert page.startswith("<!doctype html>") and page.count("<title>") == 1
    assert "`Clicked ${clicks} times`" in page


def test_a_code_file_uses_the_panes_width_and_prose_keeps_its_measure():
    css = (ROOT / "frontend" / "css" / "09-editor.css").read_text(encoding="utf-8")
    rule = css[css.index(".doc-editor .cm-editor.doc-content-code {"):]
    rule = rule[: rule.index("}")]
    assert "max-width: min(100%, 100rem)" in rule and "margin-inline: 0" in rule
    #: The prose measure is still the `:not(.doc-content-code)` rule's.
    assert ".doc-editor .cm-editor:not(.doc-content-code) {\n    max-width: calc(var(--doc-measure)" in css


# --- the snippets library (step 2) ---------------------------------------------


def _snippet(client, name="Read a file", language="py", code="with open(path) as f:\n    text = f.read()\n", tags=("io",)):
    response = client.post("/code-snippets", json={"name": name, "language": language, "code": code, "tags": list(tags)})
    assert response.status_code == 201, response.text
    return response.json()


def test_a_snippet_saves_lists_by_language_and_tag_and_searches(client):
    first = _snippet(client)
    _snippet(client, name="Fetch JSON", language="mjs", code="const data = await (await fetch(url)).json();\n", tags=("http", "IO"))
    assert first["kind"] == "snippet" and first["payload"] == {"language": "py", "code": "with open(path) as f:\n    text = f.read()\n"}
    everything = client.get("/code-snippets").json()
    assert [i["name"] for i in everything["items"]] == ["Fetch JSON", "Read a file"]
    #: The language is normalised the way a document's type is.
    assert [i["name"] for i in client.get("/code-snippets", params={"language": "js"}).json()["items"]] == ["Fetch JSON"]
    assert [i["name"] for i in client.get("/code-snippets", params={"q": "io"}).json()["items"]] == ["Fetch JSON", "Read a file"]
    assert [i["name"] for i in client.get("/code-snippets", params={"q": "http fetch"}).json()["items"]] == ["Fetch JSON"]


def test_a_snippet_deletes_into_the_bin_and_its_undo_restores_it(client):
    snippet = _snippet(client)
    deleted = client.delete(f"/board-library/{snippet['id']}")
    assert deleted.status_code == 200
    assert client.get("/code-snippets").json()["items"] == []
    restored = client.post(f"/board-library/{snippet['id']}/restore")
    assert restored.status_code == 200
    assert [i["id"] for i in client.get("/code-snippets").json()["items"]] == [snippet["id"]]


def test_a_snippet_renames_and_retags_and_is_refused_empty(client):
    snippet = _snippet(client)
    renamed = client.put(f"/code-snippets/{snippet['id']}", json={"name": "Read text", "tags": ["Files", "files"]}).json()
    assert renamed["name"] == "Read text" and renamed["tags"] == ["files"] and renamed["payload"]["code"].startswith("with open")
    blank = client.post("/code-snippets", json={"name": "Blank", "code": "   \n"})
    missing = client.put("/code-snippets/999999", json={"name": "x"})
    assert blank.status_code == 422 and missing.status_code == 404


def test_the_boards_library_leaves_snippets_out(client):
    snippet = _snippet(client)
    board = client.get("/board-library").json()
    assert snippet["id"] not in [i["id"] for i in board["items"]]
    assert [i["id"] for i in client.get("/board-library", params={"kind": "snippet"}).json()["items"]] == [snippet["id"]]
    exported = client.get("/board-library/export").json()
    assert all(i["kind"] != "snippet" for i in exported["items"])


def test_the_code_panel_is_lazy_and_its_ways_in_load_it():
    index = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    docs = (JS / "documents.js").read_text(encoding="utf-8")
    assert 'src="/js/documents-codekit.js' not in index, "lazy: never a boot script"
    assert 'lazyScript("/js/documents-codekit.js")' in docs
    assert 'id="doc-code-snippets-open"' in index and 'data-side="snippets"' in index
    #: A code file only: the button and the panel go for prose.
    css = (ROOT / "frontend" / "css" / "library-lazy.css").read_text(encoding="utf-8")
    assert "#tab-documents:not(.doc-is-code) :is(.doc-code-only, .doc-code-side)" in css
    #: On a phone the panel is the recipe's sheet, never a hand-built one.
    kit = (JS / "documents-codekit.js").read_text(encoding="utf-8")
    assert "openSheet({" in kit and "sidebar-sheet-open" not in kit


def test_every_built_in_library_snippet_is_well_formed():
    if not Path(NODE).exists():
        pytest.skip("node is not installed")
    source = (JS / "documents-codekit.js").read_text(encoding="utf-8")
    start = source.index("const DOC_KIT_LIBRARY = {")
    end = source.index("\n};\n", start) + 4
    out = subprocess.run(
        [NODE, "-e", source[start:end] + "console.log(JSON.stringify(DOC_KIT_LIBRARY));"],
        capture_output=True, text=True, check=True, timeout=30,
    )
    library = json.loads(out.stdout)
    assert {"py", "js", "html", "css", "sql"} <= set(library)
    keys = set()
    for ext, rows in library.items():
        for keyword, name, tags, template in rows:
            assert keyword and name and isinstance(tags, list) and tags, (ext, keyword)
            #: Every `${` opens a stop the engine can close: an unclosed one
            #: would insert the rest of the template as a stop's name.
            depth = 0
            for i, ch in enumerate(template):
                if template.startswith("${", i):
                    depth += 1
                elif ch == "}" and depth:
                    depth -= 1
            assert depth == 0, (ext, keyword)
            assert "${" in template, (ext, keyword)
            keys.add(f"{ext}:{keyword}")
    assert "py:readfile" in keys


# --- the coding assistant (step 3) ---------------------------------------------


def _code_doc(client, content="def add(a, b):\n    return a - b\n"):
    return client.post("/documents", json={"title": "maths.py", "content": content, "file_type": "py"}).json()


def test_a_fix_comes_back_as_code_to_apply_and_the_document_is_untouched(ai_client, fake_ollama):
    doc = _code_doc(ai_client)
    fake_ollama.librarian_reply = "```python\ndef add(a, b):\n    return a + b\n```\nAdd now adds."
    response = ai_client.post(
        f"/documents/{doc['id']}/code-assist",
        json={"action": "fix", "code": "def add(a, b):\n    return a - b\n", "diagnostic": "line 2: test_add failed, 1 != 3"},
    )
    body = response.json()
    assert body["kind"] == "change" and body["code"] == "def add(a, b):\n    return a + b\n"
    assert body["text"] == "Add now adds." and body["answered_by"]
    prompt = fake_ollama.chat_calls[-1][-1]["content"]
    assert "PROBLEM: line 2: test_add failed" in prompt and "return a - b" in prompt
    stored = ai_client.get(f"/documents/{doc['id']}").json()
    assert stored["content"] == "def add(a, b):\n    return a - b\n"


def test_explain_is_prose_and_tests_ask_for_the_run_panels_harness(ai_client, fake_ollama):
    doc = _code_doc(ai_client)
    fake_ollama.librarian_reply = "It subtracts, though its name says add."
    explained = ai_client.post(f"/documents/{doc['id']}/code-assist", json={"action": "explain"}).json()
    assert explained == {**explained, "kind": "answer", "code": None, "text": "It subtracts, though its name says add."}
    #: An empty `code` means the stored file.
    assert "return a - b" in fake_ollama.chat_calls[-1][-1]["content"]
    fake_ollama.librarian_reply = "```python\ndef test_add():\n    assert add(1, 2) == 3\n```"
    tests = ai_client.post(f"/documents/{doc['id']}/code-assist", json={"action": "tests"}).json()
    assert tests["kind"] == "change" and tests["code"].startswith("def test_add")
    assert "unittest.TestCase classes or plain test_ functions" in fake_ollama.chat_calls[-1][-1]["content"]


def test_with_no_model_it_says_what_needs_one(ai_client, fake_ollama, monkeypatch):
    from memorymap.ai import tool_fallback

    doc = _code_doc(ai_client)
    fake_ollama.running = False
    monkeypatch.setattr(tool_fallback, "for_tools", lambda primary: None)
    body = ai_client.post(f"/documents/{doc['id']}/code-assist", json={"action": "refactor"}).json()
    assert body["kind"] == "needs_model" and "need a model" in body["text"] and body["answered_by"] is None


def test_with_needle_a_request_picks_one_of_the_panels_tools(ai_client, fake_ollama, monkeypatch):
    from memorymap.ai import tool_fallback

    class Needle:
        def __init__(self):
            self.offered = None

        def chat_tools(self, model, messages, tools, mode=None):
            self.offered = [t["function"]["name"] for t in tools]
            return {"tool_calls": [{"name": "find_usages", "arguments": {"name": "add"}}]}

    needle = Needle()
    doc = _code_doc(ai_client)
    fake_ollama.running = False
    monkeypatch.setattr(tool_fallback, "for_tools", lambda primary: needle)
    body = ai_client.post(f"/documents/{doc['id']}/code-assist", json={"action": "ask", "question": "where is add used"}).json()
    assert body["kind"] == "tool" and body["tool"] == "find_usages" and body["args"] == {"name": "add"}
    assert body["answered_by"] == "needle (tools only)"
    assert needle.offered == ["format_code", "quick_fix", "run_tests", "run_file", "find_usages"]


def test_the_asks_that_need_a_model_say_so_and_fix_and_the_tools_do_not():
    index = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    import re

    asks = dict(re.findall(r'<button[^>]*data-assist="(\w+)"([^>]*)>', index))
    assert set(asks) == {"explain", "fix", "tests", "refactor"}
    assert all("data-needs-model" in asks[a] for a in ("explain", "tests", "refactor"))
    #: Fix falls back to the quick fix, so it is never greyed.
    assert "data-needs-model" not in asks["fix"]
    tools = re.findall(r'data-assist-tool="(\w+)"', index)
    assert tools == ["quick_fix", "format_code", "run_tests", "find_usages"]
    #: Every tool the panel offers needle is one the browser can run.
    from memorymap.ai import code_assist

    kit = (JS / "documents-codekit.js").read_text(encoding="utf-8")
    for name in code_assist.TOOL_NAMES:
        assert f"    {name}: () =>" in kit, name


def test_the_assistant_answers_404_for_a_document_that_is_not_there(ai_client):
    """The route by its literal path (tests/test_routes_named.py reads it)."""
    gone = ai_client.post("/documents/999999/code-assist", json={"action": "explain"})
    assert gone.status_code == 404
