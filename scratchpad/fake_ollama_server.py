"""A stand-in Ollama for UI sweeps (INBOX 444).

    python3 scratchpad/fake_ollama_server.py 11500 &
    OLLAMA_URL=http://127.0.0.1:11500 bash scratchpad/ui-sweeps/serve.sh 8787 /tmp/mm-settings

The Models screen hides its pickers, the installed list and the suggested
downloads whenever Ollama is not running, so a sweep in a sandbox with no
Ollama measures a half-empty pane. This answers just enough for that screen:
`/api/tags` (two installed models), `/api/show`, `/api/delete`, and a slow
`/api/pull` that streams `completed`/`total` so a progress bar and a cancel
can be driven. It is not a model: chat requests get one fixed line.

Not verified against a real Ollama, which is the standing caveat (CLAUDE.md
section 4): the shapes here are the ones `ollama_client.py` reads.
"""

from __future__ import annotations

import json
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

INSTALLED = [
    {"name": "llama3.2:latest", "size": 2_019_393_189, "modified_at": "2026-09-01T10:00:00Z"},
    {"name": "nomic-embed-text:latest", "size": 274_302_450, "modified_at": "2026-09-01T10:00:00Z"},
]


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):  # quiet
        pass

    def _json(self, payload, status=200):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        length = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(length) or b"{}") if length else {}

    def do_GET(self):
        if self.path.startswith("/api/tags"):
            return self._json({"models": INSTALLED})
        if self.path.startswith("/api/version"):
            return self._json({"version": "0.0-fake"})
        return self._json({"error": "not found"}, 404)

    def do_DELETE(self):
        name = self._body().get("name", "")
        INSTALLED[:] = [m for m in INSTALLED if m["name"] != name]
        self._json({})

    def do_POST(self):
        body = self._body()
        if self.path.startswith("/api/show"):
            return self._json({"capabilities": ["completion"], "model_info": {"llama.context_length": 8192}, "details": {"parameter_size": "3B", "quantization_level": "Q4_K_M"}})
        if self.path.startswith("/api/pull"):
            name = body.get("name", "x")
            self.send_response(200)
            self.send_header("Content-Type", "application/x-ndjson")
            self.end_headers()
            total = 3_000_000_000
            try:
                for step in range(0, 101):
                    # Padded past 512 bytes: the client reads the stream in
                    # 512-byte chunks, and real Ollama's progress lines arrive
                    # far faster than this fake's, so an unpadded one shows no
                    # progress for several seconds.
                    line = {"status": "pulling", "digest": "sha256:" + "0" * 480, "total": total, "completed": total * step // 100}
                    self.wfile.write((json.dumps(line) + "\n").encode())
                    self.wfile.flush()
                    time.sleep(0.4)
                INSTALLED.append({"name": name if ":" in name else name + ":latest", "size": total, "modified_at": "2026-10-03T10:00:00Z"})
                self.wfile.write((json.dumps({"status": "success"}) + "\n").encode())
            except (BrokenPipeError, ConnectionResetError):
                # The client cancelled the download: nothing left to send.
                pass
            return None
        if self.path.startswith("/api/chat"):
            line = {"model": body.get("model"), "message": {"role": "assistant", "content": "ok"}, "done": True}
            return self._json(line)
        return self._json({"error": "not found"}, 404)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 11500
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
