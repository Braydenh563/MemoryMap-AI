"""WORLD_CLASS_PLAN section 21's three open rows (row 33).

Rows 1 and 2: the embedding-model messages are a notice (`.notice.notice-warn`,
DESIGN.md's recipe), not a `.status.error` line. Row 12: the models status says
*why* the runner did not answer, so a wrong address reads "check the address"
rather than the same "isn't running" as an absent server. Row 13: the About
page's update message carries the download size before anything is pressed.
"""

from __future__ import annotations

import re
from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend"
INDEX = (FRONTEND / "index.html").read_text(encoding="utf-8")
STATUS = (FRONTEND / "js" / "status.js").read_text(encoding="utf-8")
UPDATES = (FRONTEND / "js" / "update-dialogs.js").read_text(encoding="utf-8")


def test_the_embedding_messages_are_a_notice_not_an_error_line():
    tag = re.search(r'<p id="embedding-error"[^>]*>', INDEX).group(0)
    assert "notice notice-warn" in tag and "status error" not in tag
    block = STATUS.split("const embeddingError = $(\"embedding-error\");", 1)[1].split("const fixRow", 1)[0]
    # The notice carries its icon as a child, so the text goes through setLabel.
    assert re.search(r"setLabel\(\s*embeddingError", block) and "embeddingError.textContent" not in block


def test_a_runner_that_did_not_answer_says_why(client, monkeypatch):
    from memorymap.ai.ollama_client import OllamaClient, OllamaError
    from memorymap.core import deps

    ollama = OllamaClient("http://127.0.0.1:9")
    monkeypatch.setattr(deps, "get_ollama", lambda: ollama)
    state = {"up": False}

    def list_models():
        if not state["up"]:
            raise OllamaError("Nothing answered at http://127.0.0.1:9. Check the address in Settings, Models, and that the server is running.")
        return [{"name": "m", "size": 1}]

    monkeypatch.setattr(ollama, "list_models", list_models)
    down = client.get("/models/status").json()
    assert down["ollama_running"] is False
    assert down["ollama_problem"].startswith("Nothing answered at http://127.0.0.1:9. Check the address")
    state["up"] = True
    import time

    for _ in range(40):
        up = client.get("/models/status").json()
        if up["ollama_running"]:
            break
        time.sleep(0.05)
    assert up["ollama_running"] is True and up["ollama_problem"] is None


def test_the_status_line_uses_the_providers_sentence():
    block = STATUS.split("ollamaLine.textContent = status.ollama_running", 1)[1].split("renderBackendPicker", 1)[0]
    assert "ollama_problem" in block


def test_the_update_message_says_how_big_it_is():
    assert "result.asset" in UPDATES and "MB" in UPDATES
    msg = UPDATES.split("const msg = `Version ${result.latest}", 1)[1].split("if (status)", 1)[0]
    assert "updateSizeNote(result)" in msg
