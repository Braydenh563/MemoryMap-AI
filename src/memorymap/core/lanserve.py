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

INBOX 867 ("what if memory map is open to lan on a public network"): a
client whose address is not private, shared or link-local is closed before
its first byte is read (`client_allowed`): a forwarded port or a network
that hands out public addresses never reaches the lock screen.
"""

from __future__ import annotations

import asyncio
import contextlib
import ipaddress
import logging
import re
import socket
import ssl
from concurrent.futures import ThreadPoolExecutor

from memorymap.core import netbind

log = logging.getLogger(__name__)

TLS_HANDSHAKE = 0x16
#: How long a new connection may stay silent before it is dropped.
FIRST_BYTE_SECONDS = 10.0
HEAD_LIMIT = 8192
#: The peeks run on threads, because the Windows event loop (Proactor) has
#: no `add_reader` and `sock_recv` cannot peek; a client's first byte comes
#: with its first packet, so a thread is held for microseconds.
_PEEKERS = ThreadPoolExecutor(max_workers=8, thread_name_prefix="lan-peek")
_SAFE_PATH = re.compile(r"^/[\x21-\x7e]*$")
#: The addresses a device beside this computer has: private (RFC 1918 and
#: IPv6 unique-local), carrier-grade shared space (a phone hotspot, some
#: mesh VPNs), link-local, and this computer itself. Listed rather than
#: `is_private`, whose meaning has moved between Python versions.
_NEARBY = tuple(
    ipaddress.ip_network(n)
    for n in (
        "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "100.64.0.0/10", "169.254.0.0/16",
        "127.0.0.0/8", "::1/128", "fc00::/7", "fe80::/10",
    )
)


#: The /64 of each of this computer's global IPv6 addresses. An iPhone on the
#: same Wi-Fi often connects from its own global IPv6 address, which is not
#: private, but shares the /64 the router hands this whole network (the owner's
#: Windows machine, 2026-10-11: two 2001:8003:... addresses, one temporary).
_own_v6_prefixes: frozenset = frozenset()
#: How often the prefixes (and the network gate) are read again: temporary
#: IPv6 addresses rotate, and a laptop changes networks without restarting.
REFRESH_SECONDS = 30.0


def own_v6_prefixes(addresses: list[str]) -> frozenset:
    """The /64s of the global IPv6 addresses in `addresses`."""
    found = set()
    for text in addresses:
        try:
            ip = ipaddress.ip_address(text.strip("[]").split("%", 1)[0])
        except ValueError:
            continue
        if ip.version == 6 and ip.is_global:
            found.add(ipaddress.ip_network(f"{ip}/64", strict=False))
    return frozenset(found)


def refresh_own_prefixes() -> None:
    global _own_v6_prefixes
    try:
        _own_v6_prefixes = own_v6_prefixes(netbind.lan_addresses(include_v6=True))
    except OSError:
        _own_v6_prefixes = frozenset()


def client_allowed(address: str | None, prefixes: frozenset | None = None) -> bool:
    """Is this client address one on this network? Unreadable means no."""
    if not isinstance(address, str):
        return False
    try:
        ip = ipaddress.ip_address(address.split("%", 1)[0])
    except ValueError:
        return False
    ip = getattr(ip, "ipv4_mapped", None) or ip
    if any(ip.version == net.version and ip in net for net in _NEARBY):
        return True
    shared = _own_v6_prefixes if prefixes is None else prefixes
    return ip.version == 6 and any(ip in net for net in shared)


def _first_byte(conn: socket.socket) -> bytes:
    conn.settimeout(FIRST_BYTE_SECONDS)
    try:
        return conn.recv(1, socket.MSG_PEEK)
    finally:
        conn.setblocking(False)


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
        first = await loop.run_in_executor(_PEEKERS, _first_byte, conn)
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
    refreshed = 0.0
    try:
        while not running.done() and not server.should_exit:
            if loop.time() - refreshed >= REFRESH_SECONDS:
                refreshed = loop.time()
                await loop.run_in_executor(_PEEKERS, refresh_own_prefixes)
            try:
                conn, addr = await asyncio.wait_for(loop.sock_accept(sock), 0.5)
            except asyncio.TimeoutError:
                continue
            except OSError as exc:
                log.debug("LAN accept failed: %s", exc)
                await asyncio.sleep(0.1)
                continue
            if not client_allowed(addr[0] if addr else None):
                log.info("Refused a connection from %s: not an address on this network.", addr[0] if addr else "?")
                with contextlib.suppress(OSError):
                    conn.close()
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
