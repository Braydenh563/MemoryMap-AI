"""The LAN port's accept loop: TLS for the app, a redirect for plain http.

INBOX 866, "the connection ... issues when trying to access it on phone over
lan". A phone that is given `192.168.1.5:8443` without `https://` (typed, or
read off the terminal) asks over plain http, which every phone browser does
for an address, and a TLS-only socket answered that with nothing: Safari's
"the server unexpectedly dropped the connection", Chrome's ERR_EMPTY_RESPONSE.
So the first byte decides. 0x16 opens a TLS handshake, and the connection goes
to uvicorn's own HTTP protocol over TLS, exactly as uvicorn would have made it;
anything else gets a `301` to the same address over https, and only for a Host
that names this computer (`netbind.host_allowed`), so the redirect can never
send anyone elsewhere.

uvicorn is given no socket of its own (`serve(sockets=[])`): it still runs
its loop, keeps the connections this loop hands it in `server_state`, and
closes them at shutdown, so Ctrl+C ends both listeners as before.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import re
import select
import socket
import ssl
import threading
import time
from concurrent.futures import ThreadPoolExecutor

from memorymap.core import netbind

log = logging.getLogger(__name__)

TLS_HANDSHAKE = 0x16
#: How long a new connection may stay silent before it is dropped.
FIRST_BYTE_SECONDS = 10.0
HEAD_LIMIT = 8192
#: Plain-http answers run on threads, because the Windows event loop
#: (Proactor) has no `add_reader`; their request head is already in hand.
_PEEKERS = ThreadPoolExecutor(max_workers=4, thread_name_prefix="lan-http")
_SAFE_PATH = re.compile(r"^/[\x21-\x7e]*$")


class _FirstByteWatcher:
    """One thread that waits for every new connection's first byte with
    `select`, which works on every platform's sockets.

    The owner, 2026-10-11, Safari on an iPhone: "its taking a very long
    time". Safari opens connections ahead of need and sends nothing on
    them; a thread per peek held one of eight workers for up to ten seconds
    each, so the page's real requests queued behind silent sockets. One
    watcher holds any number of silent sockets at no cost."""

    TICK = 0.05
    #: Windows' select takes at most 512 sockets; the rest wait a tick.
    BATCH = 500

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._waiting: dict[socket.socket, tuple[asyncio.AbstractEventLoop, asyncio.Future, float]] = {}
        self._thread: threading.Thread | None = None

    def wait(self, conn: socket.socket, timeout: float = FIRST_BYTE_SECONDS) -> asyncio.Future:
        loop = asyncio.get_running_loop()
        future = loop.create_future()
        conn.setblocking(False)
        with self._lock:
            self._waiting[conn] = (loop, future, time.monotonic() + timeout)
            if self._thread is None:
                self._thread = threading.Thread(target=self._run, name="lan-first-byte", daemon=True)
                self._thread.start()
        return future

    @staticmethod
    def _settle(loop, future, value) -> None:  # noqa: ANN001
        def done() -> None:
            if future.done():
                return
            if isinstance(value, BaseException):
                future.set_exception(value)
            else:
                future.set_result(value)

        with contextlib.suppress(RuntimeError):  # the loop has closed
            loop.call_soon_threadsafe(done)

    def _run(self) -> None:
        while True:
            with self._lock:
                if not self._waiting:
                    self._thread = None
                    return
                socks = list(self._waiting)
            batch = socks[: self.BATCH]
            try:
                ready, _, broken = select.select(batch, [], batch, self.TICK)
            except (OSError, ValueError):  # a socket closed under us
                ready, broken = [], [s for s in batch if s.fileno() < 0]
            now = time.monotonic()
            for sock in socks:
                with self._lock:
                    entry = self._waiting.get(sock)
                if entry is None:
                    continue
                loop, future, deadline = entry
                value: bytes | OSError
                if sock in ready or sock in broken:
                    try:
                        value = sock.recv(1, socket.MSG_PEEK)
                    except BlockingIOError:
                        continue
                    except OSError as exc:
                        value = exc
                elif now >= deadline or future.cancelled():
                    value = b""
                else:
                    continue
                with self._lock:
                    self._waiting.pop(sock, None)
                self._settle(loop, future, value)


_WATCHER = _FirstByteWatcher()


def redirect_response(head: bytes, port: int) -> bytes:
    """The answer to a plain-http request head: a 301 to https, or a 400."""
    text = head.decode("latin-1", "replace")
    lines = text.split("\r\n")
    parts = lines[0].split(" ")
    path = parts[1] if len(parts) == 3 and parts[2].startswith("HTTP/") else "/"
    if not _SAFE_PATH.match(path) or path.startswith("//"):
        path = "/"
    host = ""
    for line in lines[1:]:
        name, _, value = line.partition(":")
        if name.strip().lower() == "host":
            host = value.strip()
            break
    if not host or not netbind.host_allowed(host) or not re.fullmatch(r"[A-Za-z0-9.\-:\[\]%]+", host):
        body = b"Open this address with https:// in front.\n"
        return (
            b"HTTP/1.1 400 Bad Request\r\nContent-Type: text/plain; charset=utf-8\r\n"
            b"Connection: close\r\nContent-Length: " + str(len(body)).encode() + b"\r\n\r\n" + body
        )
    if host.startswith("["):
        name = host.split("]", 1)[0] + "]"
    else:
        name = host.rsplit(":", 1)[0] if host.count(":") == 1 else host
    location = f"https://{name}:{port}{path}"
    return (
        b"HTTP/1.1 301 Moved Permanently\r\nLocation: " + location.encode("ascii") + b"\r\n"
        b"Content-Length: 0\r\nConnection: close\r\n\r\n"
    )


def _answer_plain_http(conn: socket.socket, port: int) -> None:
    conn.settimeout(FIRST_BYTE_SECONDS)
    head = b""
    with contextlib.suppress(OSError):
        while b"\r\n\r\n" not in head and len(head) < HEAD_LIMIT:
            chunk = conn.recv(1024)
            if not chunk:
                break
            head += chunk
        conn.sendall(redirect_response(head, port))
    with contextlib.suppress(OSError):
        conn.shutdown(socket.SHUT_RDWR)
    conn.close()


async def _route(conn: socket.socket, make_protocol, context: ssl.SSLContext, port: int) -> None:  # noqa: ANN001
    loop = asyncio.get_running_loop()
    try:
        first = await _WATCHER.wait(conn)
    except OSError:
        conn.close()
        return
    if not first:
        conn.close()
        return
    if first[0] != TLS_HANDSHAKE:
        await loop.run_in_executor(_PEEKERS, _answer_plain_http, conn, port)
        return
    try:
        await loop.connect_accepted_socket(make_protocol, conn, ssl=context)
    except (OSError, ssl.SSLError, asyncio.TimeoutError, ConnectionError):
        # A failed handshake: a phone refusing the certificate, a scanner.
        # asyncio has closed the transport; the socket may still be open.
        conn.close()


async def serve(server, sock: socket.socket) -> None:  # noqa: ANN001  # a uvicorn.Server with ssl set
    """Run `server` (TLS configured, `config.load()`ed) on `sock`, sniffing
    each connection's first byte. Returns once the server has exited."""
    config = server.config
    context = config.ssl
    port = sock.getsockname()[1]
    running = asyncio.ensure_future(server.serve(sockets=[]))
    while not server.started and not running.done():
        await asyncio.sleep(0.02)

    def make_protocol() -> asyncio.Protocol:
        return config.http_protocol_class(
            config=config, server_state=server.server_state, app_state=server.lifespan.state
        )

    loop = asyncio.get_running_loop()
    sock.setblocking(False)
    pending: set[asyncio.Task] = set()
    try:
        while not running.done() and not server.should_exit:
            try:
                conn, _addr = await asyncio.wait_for(loop.sock_accept(sock), 0.5)
            except asyncio.TimeoutError:
                continue
            except OSError as exc:
                log.debug("LAN accept failed: %s", exc)
                await asyncio.sleep(0.1)
                continue
            task = asyncio.ensure_future(_route(conn, make_protocol, context, port))
            pending.add(task)
            task.add_done_callback(pending.discard)
    finally:
        sock.close()
        server.should_exit = True
        for task in list(pending):
            task.cancel()
        await asyncio.gather(running, *pending, return_exceptions=True)
