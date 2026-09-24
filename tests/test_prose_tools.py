"""The document editor's prose tools (INBOX 401 and 404, the prose side).

Grammar through Harper, vendored and run in a worker. What a Python test can
hold of it is the contract around the browser: the binary and its licence are
in the tree, the policy lets WebAssembly compile without letting `eval` in,
the binary is not gzipped on every cold fetch, the switch is a preference that
round-trips, and the checker is reached lazily rather than at boot. What it
does in the page is `scratchpad/ui-sweeps/p2-harper.js`.
"""

from __future__ import annotations

import re
from pathlib import Path

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
