"""The LAN port answers plain http with a redirect, and TLS with the app (INBOX 866).

A phone given `192.168.1.5:8443` without `https://` asks over plain http;
a TLS-only socket answered with nothing. `core/lanserve.py` reads the first
byte: a handshake goes to uvicorn over TLS, anything else gets a 301 to
https. Run here against real sockets, with the certificate checked against
the authority `core/lancert.py` makes, name constraints and all, by OpenSSL.
"""

from __future__ import annotations

import asyncio
import contextlib
import http.client
import socket
import ssl
import threading
import time

import pytest
import uvicorn

from memorymap.core import lancert, lanserve


async def _app(scope, receive, send):  # noqa: ANN001
    assert scope["type"] == "http"
    body = f"{scope['scheme']} {scope['path']}".encode()
    await send({"type": "http.response.start", "status": 200, "headers": [(b"content-type", b"text/plain")]})
    await send({"type": "http.response.body", "body": body})


class _Quiet(uvicorn.Server):
    def capture_signals(self):  # noqa: ANN202
        return contextlib.nullcontext()


@pytest.fixture()
def lan(tmp_path):
    info = lancert.ensure(tmp_path, ["localhost", "127.0.0.1"])
    config = uvicorn.Config(
        _app, lifespan="off", log_level="warning",
        ssl_certfile=str(info.cert_path), ssl_keyfile=str(info.key_path),
    )
    config.load()
    server = _Quiet(config)
    sock = socket.create_server(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    thread = threading.Thread(target=lambda: asyncio.run(lanserve.serve(server, sock)), daemon=True)
    thread.start()
    deadline = time.monotonic() + 10
    while not server.started and time.monotonic() < deadline:
        time.sleep(0.02)
    yield port, tmp_path
    server.should_exit = True
    thread.join(10)
    assert not thread.is_alive(), "the LAN listener did not stop"


def _plain(port, host):
    conn = http.client.HTTPConnection("127.0.0.1", port, timeout=5)
    conn.putrequest("GET", "/notes?x=1", skip_host=True)
    conn.putheader("Host", host)
    conn.endheaders()
    response = conn.getresponse()
    conn.close()
    return response


def test_https_reaches_the_app_with_a_certificate_the_authority_vouches_for(lan):
    port, data_dir = lan
    context = ssl.create_default_context(cadata=lancert.authority_pem(data_dir).decode())
    conn = http.client.HTTPSConnection("127.0.0.1", port, context=context, timeout=5)
    conn.request("GET", "/hello")
    response = conn.getresponse()
    assert response.status == 200 and response.read() == b"https /hello"
    conn.close()


def test_silent_connections_do_not_hold_up_the_page(lan):
    """Safari opens connections ahead of need and sends nothing on them
    (the owner, 2026-10-11: "it still hasnt loaded"). Twenty of them must
    not make a real request wait."""
    port, data_dir = lan
    silent = [socket.create_connection(("127.0.0.1", port)) for _ in range(20)]
    try:
        time.sleep(0.2)
        context = ssl.create_default_context(cadata=lancert.authority_pem(data_dir).decode())
        started = time.monotonic()
        conn = http.client.HTTPSConnection("127.0.0.1", port, context=context, timeout=5)
        conn.request("GET", "/hello")
        assert conn.getresponse().status == 200
        conn.close()
        assert time.monotonic() - started < 2
    finally:
        for s in silent:
            s.close()


def test_plain_http_is_sent_to_https_on_the_same_address(lan):
    port, _ = lan
    response = _plain(port, f"127.0.0.1:{port}")
    assert response.status == 301
    assert response.getheader("Location") == f"https://127.0.0.1:{port}/notes?x=1"


def test_a_host_that_is_not_this_computer_is_not_redirected(lan):
    """Never an open redirect: a rebinding page's Host gets a 400."""
    port, _ = lan
    response = _plain(port, "evil.example")
    assert response.status == 400 and response.getheader("Location") is None


def test_a_redirect_never_leaves_this_computer():
    assert b"Location: https://127.0.0.1:8443/\r\n" in lanserve.redirect_response(
        b"GET //evil.example/x HTTP/1.1\r\nHost: 127.0.0.1:8443\r\n\r\n", 8443
    )
    assert b"Location: https://[::1]:8443/a\r\n" in lanserve.redirect_response(
        b"GET /a HTTP/1.1\r\nHost: [::1]:8443\r\n\r\n", 8443
    )
    assert b"301" not in lanserve.redirect_response(b"GET / HTTP/1.1\r\nHost: a\r\nb.example\r\n\r\n", 8443)
