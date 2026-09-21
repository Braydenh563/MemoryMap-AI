#!/usr/bin/env python3
"""A stand-in model that answers with prose quoting the notes it was given.

    .venv/bin/python scratchpad/fake_answer_server.py 8809

Grounding (`ai/grounding.py`) works on the *answer text* against the notes
that were retrieved, so testing it end to end needs a model whose answer
really does restate those notes. A canned sentence would ground to nothing
and the probe would report the feature broken when it was the fixture.

So this reads the prompt it is sent, pulls out the note bodies the app put in
it, and answers with one sentence per note built from that note's own words.
That is the shape a real answer has, and it is what makes the citation
numbers testable: sentence 1 must cite the note it was built from.

Speaks the OpenAI `/v1` dialect, streaming and not, like
`scratchpad/fake_openai_server.py`, which does the tool-calling half.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

MODEL = "fake-answerer"
DUMP = os.environ.get("FAKE_DUMP") or ""
#: Milliseconds to wait between streamed words, off by default.
#:
#: A fixture that sends a whole answer inside one tick cannot be used to
#: measure anything the page does *while* it is streaming: the busy
#: affordance of INBOX 298 exists only between the first request and the last
#: token, and a probe polling for it saw either nothing or one frame. A real
#: small model takes seconds per sentence, so pacing the fixture is the
#: honest fixture, not a slower one.
STREAM_DELAY_MS = float(os.environ.get("FAKE_DELAY_MS") or 0)


def _sentences_from_prompt(prompt: str) -> list[str]:
    """One sentence per note the app put in the prompt.

    The app's context block is a numbered list under "My notes:", one note per
    line, shaped `3. [General] (similarity: 0.56) the note's text`. Parsing
    that shape rather than "any long line" matters: the first version took the
    system preamble and the category prefixes with it, and the answer came
    back opening "You are Atlas, this notebook's librarian. General] ...". A
    probe reading that answer would blame the product for a fixture that had
    never quoted a note cleanly in the first place.

    A note's own first sentence is what a model would paraphrase, and echoing
    it verbatim is the strongest possible grounding signal, which is what a
    probe wants: if the numbers are wrong here they are wrong everywhere.
    """
    out: list[str] = []
    for line in prompt.splitlines():
        #: Split rather than matched. CodeQL flagged the regex this replaces
        #: (`^\s*\d+\.\s+(.*)$`, high severity: polynomial backtracking on
        #: uncontrolled data) because the prompt is attacker-shaped input as
        #: far as it is concerned and the two whitespace classes around the
        #: number can be made to backtrack. `partition` cannot backtrack at
        #: all, and says the same thing in fewer characters.
        head, dot, rest = line.strip().partition(".")
        if not dot or not head.isdigit():
            continue
        text = rest.strip()
        text = re.sub(r"^\[[^\]]*\]\s*", "", text)          # [General]
        text = re.sub(r"^\((?:[^)]*)\)\s*", "", text).strip()  # (similarity: 0.56)
        if len(text.split()) < 6:
            continue
        first = re.split(r"(?<=[.!?])\s", text)[0]
        if first not in out:
            out.append(first if first.endswith((".", "!", "?")) else first + ".")
        if len(out) >= 4:
            break
    return out or ["I could not find anything in your notes about that."]


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args) -> None:  # noqa: ANN002
        pass

    def do_GET(self) -> None:  # noqa: N802
        if self.path.rstrip("/").endswith("/models"):
            self._json({"object": "list", "data": [{"id": MODEL, "object": "model"}]})
        else:
            self.send_error(404)

    def do_POST(self) -> None:  # noqa: N802
        length = int(self.headers.get("Content-Length") or 0)
        body = json.loads(self.rfile.read(length) or b"{}")
        prompt = "\n".join(str(m.get("content") or "") for m in body.get("messages", []))
        if DUMP:
            with open(DUMP, "a", encoding="utf-8") as fh:
                fh.write("=== prompt ===\n" + prompt + "\n")
        answer = " ".join(_sentences_from_prompt(prompt))
        if body.get("stream"):
            self._sse(answer)
        else:
            self._json({
                "id": "fake", "object": "chat.completion", "model": MODEL,
                "choices": [{"index": 0, "message": {"role": "assistant", "content": answer},
                             "finish_reason": "stop"}],
            })

    def _json(self, payload: dict) -> None:
        raw = json.dumps(payload).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _sse(self, answer: str) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.end_headers()
        #: Word by word, because the Ask tab renders as it streams and the
        #: citation markers are written against the finished text: a fake that
        #: sent the answer in one chunk would not exercise that ordering.
        for word in answer.split(" "):
            chunk = {"choices": [{"index": 0, "delta": {"content": word + " "}}]}
            self.wfile.write(f"data: {json.dumps(chunk)}\n\n".encode())
            self.wfile.flush()
            if STREAM_DELAY_MS:
                time.sleep(STREAM_DELAY_MS / 1000)
        done = {"choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}]}
        self.wfile.write(f"data: {json.dumps(done)}\n\n".encode())
        self.wfile.write(b"data: [DONE]\n\n")
        self.wfile.flush()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8809
    print(f"fake answerer on http://127.0.0.1:{port}/v1", flush=True)
    HTTPServer(("127.0.0.1", port), Handler).serve_forever()
