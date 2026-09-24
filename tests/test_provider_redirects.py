"""A model server's redirect is followed only on its own address (§12, S6).

The model backend's address is one the person set, and by design it is on
this machine or this network, so the address itself is not the risk. A
redirect is: `requests` follows one to anywhere by default, so a server at the
configured address (or anything able to answer as it) could send the app's
requests, prompts and notes included, on to another host on the LAN or to the
cloud metadata address. Now a redirect to another host or port is refused
with a reason, and one on the same host and port is still followed.

Real sockets, not a fake transport: the hook lives inside `requests`'
redirect loop, which a patched `requests.get` would skip entirely.
"""

from __future__ import annotations

import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest

from memorymap.ai.ollama_client import OllamaClient, OllamaError
from memorymap.ai.openai_client import OpenAICompatClient

TAGS = {"models": [{"name": "elsewhere:1b"}]}


def _serve(handler_cls):
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler_cls)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


@pytest.fixture()
def elsewhere():
    """The host a redirect tries to reach: answers every path with models."""

    class Answer(BaseHTTPRequestHandler):
        hits: list[str] = []

        def do_GET(self):  # noqa: N802
            Answer.hits.append(self.path)
            body = json.dumps({**TAGS, "data": [{"id": "elsewhere"}]}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):
            pass

    server = _serve(Answer)
    yield server, Answer.hits
    server.shutdown()


def _redirecting_to(target: str):
    class Redirect(BaseHTTPRequestHandler):
        def do_GET(self):  # noqa: N802
            if self.path.startswith("/moved"):
                body = json.dumps({**TAGS, "data": [{"id": "same-host"}]}).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            self.send_response(302)
            self.send_header("Location", target(self))
            self.send_header("Content-Length", "0")
            self.end_headers()

        def log_message(self, *args):
            pass

    return _serve(Redirect)


def test_ollama_does_not_follow_a_redirect_to_another_host(elsewhere):
    other, hits = elsewhere
    # "localhost" against "127.0.0.1": the same machine, a different host
    # as far as the address the person configured is concerned.
    server = _redirecting_to(lambda h: f"http://localhost:{other.server_port}/api/tags")
    try:
        client = OllamaClient(base_url=f"http://127.0.0.1:{server.server_port}")
        with pytest.raises(OllamaError, match="redirect"):
            client.list_models()
        assert client.is_running() is False
        assert hits == []
    finally:
        server.shutdown()


def test_ollama_does_not_follow_a_redirect_to_another_port(elsewhere):
    other, hits = elsewhere
    server = _redirecting_to(lambda h: f"http://127.0.0.1:{other.server_port}/api/tags")
    try:
        client = OllamaClient(base_url=f"http://127.0.0.1:{server.server_port}")
        with pytest.raises(OllamaError):
            client.list_models()
        assert hits == []
    finally:
        server.shutdown()


def test_a_redirect_on_the_same_host_is_still_followed():
    server = _redirecting_to(lambda h: "/moved")
    try:
        client = OllamaClient(base_url=f"http://127.0.0.1:{server.server_port}")
        assert client.list_models() == TAGS["models"]
    finally:
        server.shutdown()


def test_the_openai_compatible_client_holds_the_same_line(elsewhere):
    other, hits = elsewhere
    server = _redirecting_to(lambda h: f"http://localhost:{other.server_port}{h.path}")
    try:
        client = OpenAICompatClient(base_url=f"http://127.0.0.1:{server.server_port}/v1")
        assert client.is_running() is False
        assert hits == []
    finally:
        server.shutdown()
