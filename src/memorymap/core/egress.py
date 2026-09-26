"""Every connection this process opens, recorded where it cannot be missed.

The privacy receipt (WORLD_CLASS_PLAN §2, standout 5) is "a page that proves,
from the app's own logs, that nothing left the machine". A log that each
network call had to remember to write would prove only that the calls which
remembered stayed home: the one that matters is the library three imports
deep that phones home on its own. So this is not a logger the fetch sites
call. It is a Python audit hook (PEP 578), installed once, which the
interpreter itself calls on every `socket.connect` and `socket.getaddrinfo`
in the process, from any module, any thread, any library, including the ones
this project did not write. Nothing can open a TCP connection or ask DNS for
a name without passing through `_hook`.

Three rules shape it, each because an audit hook is an unusual place to run
code:

- **It never raises.** An exception inside a hook propagates into the code
  that raised the event and aborts its operation: a receipt must never be
  the reason a connect failed. `_hook` catches everything.
- **It is cheap on every other event.** The interpreter calls every hook for
  every audited event (each `open`, each `import`), so the first line is one
  frozenset lookup and anything else returns at once.
- **It does no I/O.** Writing the ledger from inside a connect would put a
  disk write on the network path and re-enter the hook through `open`; the
  ledger is written by `flush`, from the receipt route and at shutdown.

What it cannot see, said here and on the receipt: other programs. The model
server (Ollama, LM Studio, llama.cpp) and a SearXNG the app starts are
separate processes with their own sockets. The receipt names their addresses
instead (S6: "show the configured URL in the privacy receipt").
"""

from __future__ import annotations

import ipaddress
import json
import socket
import sys
import threading
import time
from collections import deque
from datetime import datetime, timezone
from pathlib import Path

#: The file under the data folder that carries the totals across launches.
LEDGER_NAME = "egress-ledger.json"
#: Destinations kept, per launch and in the ledger. A web search can touch
#: many hosts; past this the least recently used one is dropped from the
#: table, and the totals still count every connection, so bounding the table
#: never makes the receipt quieter than what happened.
MAX_DESTINATIONS = 256
#: The recent non-local events kept for the receipt's "last seen" list.
MAX_RECENT = 100

SCOPES = ("this_computer", "local_network", "internet")

_WATCHED = frozenset({"socket.connect", "socket.getaddrinfo"})
_LOOPBACK_NAMES = frozenset({"localhost", "localhost.localdomain", "ip6-localhost"})

#: The modules that are *allowed* to reach out (tests/test_outbound_fetch_guard's
#: REACHES_THE_NETWORK), named the way a person reads them. A destination
#: reached from anywhere else shows its module name, which is itself a finding.
FEATURES = {
    "memorymap.search.websearch": "Web search",
    "memorymap.ai.ollama_client": "Model server",
    "memorymap.ai.openai_client": "Model server",
    "memorymap.ai.provider_http": "Model server",
    "memorymap.search.searxng_install": "SearXNG install",
    "memorymap.search.searxng_docker": "SearXNG",
    "memorymap.api.routes_update": "Update check",
    "memorymap.core.extra_downloads": "Optional downloads",
    "memorymap.core.embedmodels": "Embedding model download",
    "memorymap.ai.embeddings": "Embedding model",
}

_lock = threading.Lock()
_installed = False
_since = time.time()
# (kind, host, port) -> {"count", "first", "last", "via", "name"}
_destinations: dict[tuple[str, str, int | None], dict] = {}
# (kind, host, port) -> count already written to the ledger by `flush`
_flushed: dict[tuple[str, str, int | None], int] = {}
_totals = {scope: 0 for scope in SCOPES}
_flushed_totals = {scope: 0 for scope in SCOPES}
_recent: deque = deque(maxlen=MAX_RECENT)
# The last name each thread looked up, so a connect to an address can say
# which name it was probably for ("140.82.112.3" is "api.github.com").
_last_lookup = threading.local()
_own_names: frozenset[str] = frozenset()


def _now_iso(ts: float) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat(timespec="seconds")


def scope_of(host: str) -> str:
    """Where `host` is: this computer, the local network, or the internet.

    A name that is not an address and not recognisably local is counted as
    the internet. The receipt errs toward saying more left, never less.
    """
    text = (host or "").strip().strip("[]").lower()
    if "%" in text:  # fe80::1%eth0, a scoped IPv6 address
        text = text.split("%", 1)[0]
    if text in _LOOPBACK_NAMES or text in _own_names:
        return "this_computer"
    try:
        address = ipaddress.ip_address(text)
    except ValueError:
        if text.endswith((".local", ".lan", ".home.arpa", ".internal")):
            return "local_network"
        return "internet"
    mapped = getattr(address, "ipv4_mapped", None)
    if mapped is not None:
        address = mapped
    if address.is_loopback or address.is_unspecified:
        return "this_computer"
    if address.is_private or address.is_link_local or not address.is_global:
        return "local_network"
    return "internet"


def _caller() -> str | None:
    """The first frame on the stack from this app's own code, not this file."""
    try:
        frame = sys._getframe(2)
    except ValueError:
        return None
    depth = 0
    while frame is not None and depth < 80:
        name = frame.f_globals.get("__name__", "")
        if isinstance(name, str) and name.startswith("memorymap.") and name != __name__:
            return name
        frame = frame.f_back
        depth += 1
    return None


def _record(kind: str, host: str, port: int | None) -> None:
    scope = scope_of(host)
    now = time.time()
    via = _caller() if scope != "this_computer" else None
    name = None
    if kind == "connect":
        looked = getattr(_last_lookup, "value", None)
        if looked and now - looked[1] < 30 and looked[0] != host:
            name = looked[0]
    else:
        _last_lookup.value = (host, now)
    if scope == "this_computer":
        # Counted, not tabled: a local model answers on loopback every turn,
        # and a table of those would bury the one line that matters.
        with _lock:
            _totals[scope] += 1
        return
    key = (kind, host, port)
    with _lock:
        _totals[scope] += 1
        row = _destinations.get(key)
        if row is None:
            if len(_destinations) >= MAX_DESTINATIONS:
                oldest = min(_destinations, key=lambda k: _destinations[k]["last"])
                del _destinations[oldest]
            row = _destinations[key] = {"count": 0, "first": now, "last": now, "via": via, "name": name}
        row["count"] += 1
        row["last"] = now
        row["via"] = via or row["via"]
        row["name"] = name or row["name"]
        _recent.append({"at": now, "kind": kind, "host": host, "port": port, "scope": scope, "via": via})


def _hook(event: str, args: tuple) -> None:
    if event not in _WATCHED:
        return
    try:
        if event == "socket.connect":
            address = args[1] if len(args) > 1 else None
            # AF_UNIX addresses are a path (str or bytes): a file, not a host.
            if not isinstance(address, tuple) or not address:
                return
            host = address[0]
            if isinstance(host, bytes):
                host = host.decode("ascii", "replace")
            if not isinstance(host, str):
                return
            port = address[1] if len(address) > 1 and isinstance(address[1], int) else None
            _record("connect", host, port)
        else:
            host = args[0] if args else None
            if isinstance(host, bytes):
                host = host.decode("ascii", "replace")
            if not isinstance(host, str) or not host:
                return
            port = args[1] if len(args) > 1 and isinstance(args[1], int) else None
            _record("lookup", host, port)
    except BaseException:  # noqa: BLE001, S110 - a hook that raises aborts the caller's connect (module docstring)
        return


def install() -> None:
    """Start watching. Idempotent; an audit hook cannot be removed again,
    which is the property that makes it a record rather than a courtesy."""
    global _installed, _own_names
    with _lock:
        if _installed:
            return
        _installed = True
    # This machine's own names count as this computer. Read before the hook
    # goes in: `gethostname` raises no watched event, but the names are
    # compared against every later one.
    try:
        own = socket.gethostname().lower()
        _own_names = frozenset({own, own.split(".", 1)[0], f"{own.split('.', 1)[0]}.local"})
    except OSError:
        _own_names = frozenset()
    sys.addaudithook(_hook)


def installed() -> bool:
    return _installed


def reset() -> None:
    """Forget this launch's record (tests; the hook stays installed)."""
    global _since
    with _lock:
        _destinations.clear()
        _flushed.clear()
        _recent.clear()
        for scope in SCOPES:
            _totals[scope] = 0
            _flushed_totals[scope] = 0
        _since = time.time()


def since() -> str:
    return _now_iso(_since)


def totals() -> dict[str, int]:
    with _lock:
        return dict(_totals)


def _row_out(key: tuple, row: dict) -> dict:
    kind, host, port = key
    via = row.get("via")
    return {
        "kind": kind,
        "host": host,
        "port": port,
        "name": row.get("name"),
        "scope": scope_of(host),
        "count": row["count"],
        "first": _now_iso(row["first"]) if isinstance(row["first"], (int, float)) else row["first"],
        "last": _now_iso(row["last"]) if isinstance(row["last"], (int, float)) else row["last"],
        "via": via,
        "feature": FEATURES.get(via or "", via),
    }


def destinations() -> list[dict]:
    """This launch's non-local destinations, most recent first."""
    with _lock:
        rows = [_row_out(key, dict(row)) for key, row in _destinations.items()]
    return sorted(rows, key=lambda r: r["last"], reverse=True)


def recent() -> list[dict]:
    with _lock:
        events = list(_recent)
    return [
        {**event, "at": _now_iso(event["at"]), "feature": FEATURES.get(event["via"] or "", event["via"])}
        for event in reversed(events)
    ]


def verdict(counts: dict[str, int]) -> str:
    """The one-word answer: the widest scope anything reached."""
    if counts.get("internet"):
        return "internet"
    if counts.get("local_network"):
        return "local_network"
    return "stayed_on_this_computer"


def _read_ledger(path: Path) -> dict:
    try:
        data = json.loads(path.read_text())
    except (OSError, ValueError):
        # Missing is the first launch; corrupt is a file somebody edited or a
        # disk that failed mid-write. Either way the ledger starts again
        # rather than the receipt failing, and it says when it started.
        return {}
    return data if isinstance(data, dict) else {}


def flush(path: Path) -> dict:
    """Add what this launch saw since the last flush to the ledger on disk.

    Only the difference is added, so flushing on every receipt read and again
    at shutdown never counts a connection twice. Returns the ledger written.
    """
    from memorymap.core.atomic_io import atomic_write_json

    with _lock:
        added = {
            key: row["count"] - _flushed.get(key, 0)
            for key, row in _destinations.items()
            if row["count"] > _flushed.get(key, 0)
        }
        rows = {key: dict(_destinations[key]) for key in added}
        added_totals = {scope: _totals[scope] - _flushed_totals[scope] for scope in SCOPES}
        for key, row in _destinations.items():
            _flushed[key] = row["count"]
        for scope in SCOPES:
            _flushed_totals[scope] = _totals[scope]
    ledger = _read_ledger(path)
    stored_totals = ledger.get("totals") if isinstance(ledger.get("totals"), dict) else {}
    out_totals = {scope: int(stored_totals.get(scope, 0) or 0) + added_totals[scope] for scope in SCOPES}
    stored = {}
    for item in ledger.get("destinations", []) if isinstance(ledger.get("destinations"), list) else []:
        if isinstance(item, dict) and isinstance(item.get("host"), str):
            stored[(item.get("kind", "connect"), item["host"], item.get("port"))] = item
    for key, count in added.items():
        row = rows[key]
        out = _row_out(key, row)
        previous = stored.get(key)
        if previous is not None:
            out["count"] = int(previous.get("count", 0) or 0) + count
            out["first"] = previous.get("first", out["first"])
        else:
            out["count"] = count
        stored[key] = out
    kept = sorted(stored.values(), key=lambda r: str(r.get("last", "")), reverse=True)[:MAX_DESTINATIONS]
    result = {
        "since": ledger.get("since") or since(),
        "updated": _now_iso(time.time()),
        "totals": out_totals,
        "destinations": kept,
    }
    if added or any(added_totals.values()) or not path.exists():
        try:
            atomic_write_json(path, result)
        except OSError:
            # A full disk costs the ledger an update, never the receipt.
            pass
    return result
