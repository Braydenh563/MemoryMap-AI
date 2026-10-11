"""Who may use LAN mode, and from which networks (INBOX 867).

The owner: "what if memory map is open to lan on a public network or wifi??
Is that a security risk?? ... Just make sure everything is handled for the
user automatically with possible manual overrides". Three rules, each on by
default, each loosened only by a password-gated override in Settings, Other
devices (api/routes_auth.py):

- **Allowed networks.** Turning the switch on remembers the network it was
  turned on in (core/netid.py: the router's hardware address plus the
  subnet). On any other network the LAN port stays closed, and Settings and
  the bell say so, with "Allow on this network". A network that cannot be
  read is "unknown" and asks too. Override: "Allow on any network". Windows'
  Public category is never opened without asking, the override included.
- **New devices wait.** The first sign-in from a device over the network is
  held until this computer allows it; allowed devices are remembered by a
  random id in a cookie, kept here only as a hash, and listed with Remove.
  Override: "Ask before a new device signs in", on by default.
- **Nearby clients only** is core/lanserve.py's, with no override.

Kept in `lan-trust.json` in the data folder (0600), never in preferences:
`PUT /preferences` cannot reach it, and a file that cannot be read gives the
defaults, which are the closed ones.
"""

from __future__ import annotations

import contextlib
import hashlib
import json
import os
import threading
import time
from pathlib import Path

from memorymap.core import netid

FILE_NAME = "lan-trust.json"
DEVICE_COOKIE = "mm_device"
#: How long a held sign-in waits for an answer on this computer.
PENDING_SECONDS = 10 * 60
#: A device that keeps asking cannot fill this computer's screen.
MAX_PENDING = 8
MAX_DEVICES = 50
MAX_NETWORKS = 20

_lock = threading.RLock()
_changed = threading.Condition(_lock)
_gate: dict = {"open": False, "reason": "off", "network": None, "checked": 0.0}
_run_allowance: dict | None = None
_pending: dict[str, dict] = {}
_version = 0


def _bump() -> None:
    global _version
    _version += 1
    _changed.notify_all()


def version() -> int:
    return _version


# --- the file ------------------------------------------------------------------


def _path(data_dir: Path) -> Path:
    return Path(data_dir) / FILE_NAME


def load(data_dir: Path) -> dict:
    """The saved state, with the closed defaults for anything missing or odd."""
    try:
        raw = json.loads(_path(data_dir).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        raw = {}
    if not isinstance(raw, dict):
        raw = {}
    def listed(name: str) -> list:
        value = raw.get(name)
        return value if isinstance(value, list) else []

    networks = [n for n in listed("networks") if isinstance(n, dict) and isinstance(n.get("key"), str)]
    devices = [d for d in listed("devices") if isinstance(d, dict) and isinstance(d.get("id"), str)]
    return {
        "networks": networks[:MAX_NETWORKS],
        "devices": devices[:MAX_DEVICES],
        # Only a literal True opens anything; only a literal False stops asking.
        "any_network": raw.get("any_network") is True,
        "ask_new_devices": raw.get("ask_new_devices") is not False,
    }


def save(data_dir: Path, state: dict) -> None:
    path = _path(data_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    partial = path.with_suffix(f".{os.getpid()}.part")
    fd = os.open(partial, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as out:
        json.dump(state, out, indent=1)
    os.replace(partial, path)
    with contextlib.suppress(OSError):
        os.chmod(path, 0o600)


def _now_text() -> str:
    return time.strftime("%Y-%m-%d %H:%M")


# --- networks ------------------------------------------------------------------


def evaluate(state: dict, network: netid.Network | None, allowance: dict | None = None) -> tuple[bool, str]:
    """(open, reason). Reasons: allowed, any_network, allowed_this_run,
    unknown_network, new_network, public_network."""
    if network is None:
        if allowance is not None:
            return True, "allowed_this_run"
        return (True, "any_network") if state["any_network"] else (False, "unknown_network")
    if any(n["key"] == network.key for n in state["networks"]):
        return True, "allowed"
    if network.category == "public":
        return False, "public_network"
    if allowance is not None and allowance.get("gateway") == network.gateway:
        return True, "allowed_this_run"
    if state["any_network"]:
        return True, "any_network"
    return False, "new_network"


def _remember(state: dict, network: netid.Network) -> None:
    if any(n["key"] == network.key for n in state["networks"]):
        return
    state["networks"].append(
        {
            "key": network.key,
            "label": network.label,
            "gateway": network.gateway,
            "subnet": network.subnet,
            "public": network.category == "public",
            "added": _now_text(),
        }
    )
    del state["networks"][:-MAX_NETWORKS]


_UNREAD = object()


def refresh(data_dir: Path, network=_UNREAD) -> dict:  # noqa: ANN001  # a netid.Network, None, or unread
    """Read the network again and decide whether the LAN port may be open."""
    global _run_allowance
    if network is _UNREAD:
        network = netid.read()
    with _lock:
        state = load(data_dir)
        allowance = _run_allowance
        # "Allow on this network" on a network that could not be read lasts
        # this run; once the same router answers with its hardware address,
        # it is remembered as the network the person allowed.
        if allowance is not None and network is not None and allowance.get("gateway") in ("", network.gateway):
            _remember(state, network)
            save(data_dir, state)
            _run_allowance = allowance = None
        opened, reason = evaluate(state, network, allowance)
        before = (_gate["open"], _gate["reason"], _gate["network"] and _gate["network"].key)
        _gate.update(open=opened, reason=reason, network=network, checked=time.time())
        if before != (opened, reason, network and network.key):
            _bump()
        return status()


def is_open() -> bool:
    return bool(_gate["open"])


def current_network() -> netid.Network | None:
    return _gate["network"]


_display: dict = {"at": 0.0, "network": None}


def network_for_display() -> netid.Network | None:
    """The network for Settings while the gate is not running (the switch on,
    the app not yet restarted): read at most once a minute."""
    if time.monotonic() - _display["at"] > 60 or _display["at"] == 0.0:
        _display.update(at=time.monotonic(), network=netid.read())
    return _display["network"]


def status() -> dict:
    network = _gate["network"]
    return {
        "open": bool(_gate["open"]),
        "reason": _gate["reason"],
        "network": network.public() if network else None,
    }


def remember_current(data_dir: Path) -> dict:
    """The switch was turned on: this network becomes an allowed one, unless
    Windows calls it Public (that asks, with "Allow on this network")."""
    network = netid.read()
    with _lock:
        if network is not None and network.category != "public":
            state = load(data_dir)
            _remember(state, network)
            save(data_dir, state)
    return refresh(data_dir, network)


def allow_current(data_dir: Path) -> dict:
    """"Allow on this network": remembered when it can be told apart, else
    allowed until the app restarts."""
    global _run_allowance
    network = netid.read()
    with _lock:
        if network is None:
            _run_allowance = {"gateway": ""}
        else:
            state = load(data_dir)
            _remember(state, network)
            save(data_dir, state)
    return refresh(data_dir, network)


def forget_network(data_dir: Path, key: str) -> bool:
    with _lock:
        state = load(data_dir)
        kept = [n for n in state["networks"] if n["key"] != key]
        if len(kept) == len(state["networks"]):
            return False
        state["networks"] = kept
        save(data_dir, state)
    refresh(data_dir, _gate["network"])
    return True


def set_flag(data_dir: Path, name: str, value: bool) -> None:
    if name not in ("any_network", "ask_new_devices"):
        raise ValueError(name)
    with _lock:
        state = load(data_dir)
        state[name] = bool(value)
        save(data_dir, state)
    refresh(data_dir, _gate["network"])


# --- devices -------------------------------------------------------------------


def device_hash(raw: str | None) -> str:
    if not raw:
        return ""
    return hashlib.sha256(raw.encode("utf-8", "replace")).hexdigest()[:32]


def device_known(data_dir: Path, raw: str | None) -> bool:
    found = device_hash(raw)
    return bool(found) and any(d["id"] == found for d in load(data_dir)["devices"])


def touch_device(data_dir: Path, raw: str | None, address: str) -> None:
    found = device_hash(raw)
    with _lock:
        state = load(data_dir)
        for device in state["devices"]:
            if device["id"] == found:
                device["last_seen"] = _now_text()
                device["address"] = address
                save(data_dir, state)
                return


def device_name(user_agent: str | None) -> str:
    """"iPhone, Safari": enough to tell which device is asking."""
    ua = user_agent or ""
    kind = "A device"
    for needle, name in (
        ("iPhone", "iPhone"), ("iPad", "iPad"), ("Android", "Android device"),
        ("Macintosh", "Mac"), ("Windows", "Windows computer"), ("CrOS", "Chromebook"),
        ("Linux", "Linux computer"),
    ):
        if needle in ua:
            kind = name
            break
    browser = ""
    for needle, name in (
        ("Edg/", "Edge"), ("Firefox/", "Firefox"), ("FxiOS", "Firefox"), ("CriOS", "Chrome"),
        ("Chrome/", "Chrome"), ("Safari/", "Safari"),
    ):
        if needle in ua:
            browser = name
            break
    return f"{kind}, {browser}" if browser else kind


def _expire(now: float) -> None:
    for key in [k for k, p in _pending.items() if now - p["at"] > PENDING_SECONDS]:
        del _pending[key]


def hold(raw: str, name: str, address: str) -> dict:
    """Hold a sign-in from a new device until this computer answers."""
    found = device_hash(raw)
    now = time.time()
    with _lock:
        _expire(now)
        held = _pending.get(found)
        #: An answer already given (Deny while the phone was not waiting) is
        #: kept for the device's next try, which `settle`s it.
        if held is None:
            if len(_pending) >= MAX_PENDING:
                oldest = min(_pending, key=lambda k: _pending[k]["at"])
                del _pending[oldest]
            held = {"id": found, "name": name, "address": address, "at": now, "decision": None}
            _pending[found] = held
            _bump()
        return dict(held)


def pending() -> list[dict]:
    with _lock:
        _expire(time.time())
        return [
            {"id": p["id"], "name": p["name"], "address": p["address"], "at": p["at"]}
            for p in _pending.values()
            if p["decision"] is None
        ]


def decide(data_dir: Path, device_id: str, allow: bool) -> bool:
    """Allow or deny a held device. False when there is no such request."""
    with _lock:
        held = _pending.get(device_id)
        if held is None or held["decision"] is not None:
            return False
        held["decision"] = "allowed" if allow else "denied"
        if allow:
            state = load(data_dir)
            if not any(d["id"] == device_id for d in state["devices"]):
                state["devices"].append(
                    {"id": device_id, "name": held["name"], "address": held["address"],
                     "added": _now_text(), "last_seen": _now_text()}
                )
                del state["devices"][:-MAX_DEVICES]
                save(data_dir, state)
        _bump()
        return True


def wait_decision(raw: str, timeout: float) -> str | None:
    """Block until this device's held sign-in is answered: "allowed",
    "denied", or None when the wait ran out."""
    found = device_hash(raw)
    deadline = time.monotonic() + timeout
    with _changed:
        while True:
            held = _pending.get(found)
            if held is None:
                return None
            if held["decision"] is not None:
                return held["decision"]
            left = deadline - time.monotonic()
            if left <= 0:
                return None
            _changed.wait(left)


def settle(raw: str) -> None:
    """The held sign-in got its answer to the device: forget the request."""
    with _lock:
        if _pending.pop(device_hash(raw), None) is not None:
            _bump()


def devices(data_dir: Path) -> list[dict]:
    return [
        {k: d.get(k, "") for k in ("id", "name", "address", "added", "last_seen")}
        for d in load(data_dir)["devices"]
    ]


def forget_device(data_dir: Path, device_id: str) -> bool:
    with _lock:
        state = load(data_dir)
        kept = [d for d in state["devices"] if d["id"] != device_id]
        if len(kept) == len(state["devices"]):
            return False
        state["devices"] = kept
        save(data_dir, state)
        _pending.pop(device_id, None)
        _bump()
    return True


def reset_for_tests() -> None:
    global _run_allowance
    with _lock:
        _gate.update(open=False, reason="off", network=None, checked=0.0)
        _run_allowance = None
        _pending.clear()
        _bump()
