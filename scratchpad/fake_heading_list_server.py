#!/usr/bin/env python3
"""A stand-in model that always answers with the exact "heading immediately
followed by a two-item list" shape the coordinator's citation report
describes, so `scratchpad/ui-sweeps/citationheading.js` can drive a real
Ask (live) and a real reopen (history) against it and compare.

    .venv/bin/python scratchpad/fake_heading_list_server.py 8810

Speaks the OpenAI `/v1` dialect, the same as `fake_answer_server.py`
(streaming and not), so it is wired the same way: `POST /models/provider`
with `{"provider": "openai", "base_url": "http://127.0.0.1:8810/v1"}`.
"""

from __future__ import annotations

import json
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

MODEL = "fake-heading-list"

ANSWER = (
    "## Overview\n"
    "The overview mentions a key fact from note two.\n\n"
    "## Details\n"
    "A second section names a detail from note five, cited here first.\n\n"
    "## Schedule and Frequency\n"
    "- Your university days this week are noted as **Tuesday and Thursday**.\n"
    "- You have attended multiple lectures for your cloud computing class, "
    "including three lectures last week.\n"
)


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
        if body.get("stream"):
            self._sse(ANSWER)
        else:
            self._json({
                "id": "fake", "object": "chat.completion", "model": MODEL,
                "choices": [{"index": 0, "message": {"role": "assistant", "content": ANSWER},
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
        for word in answer.split(" "):
            chunk = {"choices": [{"index": 0, "delta": {"content": word + " "}}]}
            self.wfile.write(f"data: {json.dumps(chunk)}\n\n".encode())
            self.wfile.flush()
        done = {"choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}]}
        self.wfile.write(f"data: {json.dumps(done)}\n\n".encode())
        self.wfile.write(b"data: [DONE]\n\n")
        self.wfile.flush()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8810
    print(f"fake heading+list answerer on http://127.0.0.1:{port}/v1", flush=True)
    HTTPServer(("127.0.0.1", port), Handler).serve_forever()
