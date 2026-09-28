"""`POST /documents/check-syntax`: the diagnostics a code document shows.

The owner, INBOX 392: "the code document types dont act like a code editor
with errors, suggestions". The browser checks what it can on its own (JSON by
`JSON.parse`, JavaScript, CSS and HTML by the parse tree CodeMirror already
builds); the languages whose own parser is Python's are checked here, by the
standard library (`ast`, `tomllib`), `defusedxml`, and PyYAML's composer when
it is installed. Nothing leaves the machine and nothing is executed.

Every diagnostic is 1-based `line` and `col`, the way an editor's status bar
and every compiler count, and the frontend turns them into offsets.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

from memorymap.core import syntaxcheck


def _check(client, language: str, text: str):
    return client.post("/documents/check-syntax", json={"language": language, "text": text})


def test_valid_python_has_no_diagnostics(client):
    response = _check(client, "py", "def ok(a, b):\n    return a + b\n")
    assert response.status_code == 200
    assert response.json() == []


def test_a_python_syntax_error_names_its_line_and_column(client):
    got = _check(client, "py", "x = 1\ndef broken(:\n    pass\n").json()
    assert len(got) == 1
    assert got[0]["line"] == 2
    assert got[0]["col"] >= 1
    assert got[0]["message"]
    assert got[0]["severity"] == "error"


def test_python_indentation_errors_are_reported(client):
    got = _check(client, "py", "if True:\nprint('x')\n").json()
    assert got and got[0]["line"] == 2
    assert "indent" in got[0]["message"].lower()


def test_toml_error_carries_its_position_without_the_suffix(client):
    got = _check(client, "toml", 'title = "ok"\nbroken = \n').json()
    assert len(got) == 1
    assert got[0]["line"] == 2
    # The "(at line 2, column 10)" tomllib appends is the position, which the
    # editor draws itself; repeating it in the message is noise.
    assert "(at line" not in got[0]["message"]


def test_valid_toml_passes(client):
    assert _check(client, "toml", '[tool]\nname = "x"\nn = 3\n').json() == []


def test_xml_error_is_located(client):
    got = _check(client, "xml", "<root>\n  <a>\n</root>\n").json()
    assert len(got) == 1
    assert got[0]["line"] >= 2
    assert got[0]["col"] >= 1


def test_valid_xml_passes(client):
    assert _check(client, "xml", '<?xml version="1.0"?>\n<root><a x="1"/></root>\n').json() == []


def test_xml_entity_expansion_is_refused_not_performed(client):
    """The billion-laughs shape: defusedxml refuses entity declarations
    outright, and the refusal is reported as a note rather than as the file
    being fine or as a crash."""
    bomb = (
        '<?xml version="1.0"?>\n'
        '<!DOCTYPE lolz [<!ENTITY lol "lol"><!ENTITY lol2 "&lol;&lol;&lol;">]>\n'
        "<lolz>&lol2;</lolz>\n"
    )
    response = _check(client, "xml", bomb)
    assert response.status_code == 200
    got = response.json()
    assert len(got) == 1
    assert got[0]["severity"] == "info"


@pytest.mark.skipif(not syntaxcheck.yaml_available(), reason="PyYAML is optional")
def test_yaml_error_is_located(client):
    got = _check(client, "yaml", "a: 1\nb: [1, 2\nc: 3\n").json()
    assert len(got) == 1
    assert got[0]["line"] >= 2


@pytest.mark.skipif(not syntaxcheck.yaml_available(), reason="PyYAML is optional")
def test_valid_yaml_passes(client):
    assert _check(client, "yaml", "a: 1\nb:\n  - x\n  - y\n").json() == []


def test_an_unknown_language_is_refused(client):
    response = _check(client, "cobol", "IDENTIFICATION DIVISION.")
    assert response.status_code == 400


def test_the_size_cap_holds(client):
    response = _check(client, "py", "x = 1\n" * (syntaxcheck.MAX_CHARS // 6 + 10))
    assert response.status_code == 422


def test_pathological_nesting_is_a_diagnostic_not_a_crash(client):
    response = _check(client, "py", "(" * 5000 + ")" * 5000)
    assert response.status_code == 200
    assert response.json() and response.json()[0]["line"] == 1


def test_a_null_byte_is_a_diagnostic_not_a_crash(client):
    response = _check(client, "py", "x = 1\x00\n")
    assert response.status_code == 200
    assert response.json()


def test_python_is_parsed_never_run(client, tmp_path):
    """The checker compiles to a tree and stops there: a file whose only
    effect would be to write a marker leaves no marker."""
    marker = tmp_path / "ran.txt"
    source = f"open({str(marker)!r}, 'w').write('x')\n"
    assert _check(client, "py", source).json() == []
    assert not marker.exists()


def test_supported_languages_are_listed():
    langs = syntaxcheck.languages()
    assert {"py", "toml", "xml"} <= langs
    assert ("yaml" in langs) == syntaxcheck.yaml_available()


# --- the browser's JSON locator ----------------------------------------------
#
# `JSON.parse` says whether a text is JSON but, in current Chromium, not always
# where it stops being JSON (a trailing comma before `}` throws with no
# position). `docJsonErrorAt` in documents.js walks the grammar to find the
# offset. Its region is pure string work, so it runs in node here and its
# offsets are held to Python's own `json` module, which names the position of
# every error it raises.

JSON_CASES = [
    '{\n  "a": 1,\n  "b": \n}\n',
    '{"a": 1,}',
    "[1, 2,]",
    '{"a" 1}',
    '{"a": 1 "b": 2}',
    "[1 2]",
    "tru",
    '{"a": nul}',
    "01",
    '{"a": [1, {"b": }]}',
    "[1, 2] 3",
    '{a: 1}',
    '"tab\there"',
    "",
]


def _json_region() -> str:
    #: documents-code.js since the code side was split out of documents.js.
    text = (Path(__file__).resolve().parents[1] / "frontend" / "documents-code.js").read_text(encoding="utf-8")
    start = text.find("// DOC-JSON-BEGIN")
    end = text.find("// DOC-JSON-END")
    assert start != -1 and end > start, "the DOC-JSON markers are missing from documents-code.js"
    return text[start:end]


@pytest.mark.skipif(shutil.which("node") is None, reason="node is not installed")
def test_the_json_locator_agrees_with_python_about_where():
    script = _json_region() + (
        "\nconst cases = JSON.parse(process.argv[1]);\n"
        "console.log(JSON.stringify(cases.map((c) => { const r = docJsonErrorAt(c); return r && r.at; })));\n"
    )
    out = subprocess.run(
        ["node", "-e", script, json.dumps(JSON_CASES)],
        capture_output=True, text=True, check=True, timeout=30,
    )
    got = json.loads(out.stdout)
    for case, at in zip(JSON_CASES, got):
        try:
            json.loads(case)
        except json.JSONDecodeError as error:
            # Python 3.13 names a trailing comma itself ("Illegal trailing
            # comma", the comma's index); 3.11 and 3.12 name the closer that
            # follows it. Both point at the fault, so either is agreement.
            allowed = {error.pos}
            if "trailing comma" in error.msg.lower():
                after = error.pos + 1
                while after < len(case) and case[after].isspace():
                    after += 1
                allowed.add(after)
            assert at in allowed, f"{case!r}: node says {at}, python says {error.pos} ({error.msg})"
        else:
            assert at is None, f"{case!r} is valid JSON and the locator found an error at {at}"


@pytest.mark.skipif(shutil.which("node") is None, reason="node is not installed")
def test_the_json_locator_passes_valid_json():
    valid = ['{"a": [1, 2.5e3, -0, true, false, null, "x\\u00e9"]}', "  [ ]  ", '"\\"quoted\\""']
    script = _json_region() + (
        "\nconsole.log(JSON.stringify(JSON.parse(process.argv[1]).map((c) => docJsonErrorAt(c))));\n"
    )
    out = subprocess.run(
        ["node", "-e", script, json.dumps(valid)], capture_output=True, text=True, check=True, timeout=30
    )
    assert json.loads(out.stdout) == [None, None, None]
