"""Which address the server listens on: this computer only, or the network.

LAN mode (WORLD_CLASS_PLAN §12, Brief 15): "Allow other devices on this
network". Off by default, and the default is the point: the launcher binds
127.0.0.1 and nothing on the network can reach the app. On, it binds
0.0.0.0 at the next launch, so a phone or a second computer on the same
network can open the notebook with the password.

Three things live here because the launcher, the auth routes and the privacy
receipt all need the same answer:

- `bind_host(config)`: the address the launcher binds, from the one
  preference. The preference is written only by `POST /auth/lan-access`,
  which asks for the password to turn it on, never by `PUT /preferences`.
- `set_current` / `current`: the address the launcher *did* bind, so the
  receipt reports what happened rather than what the default is.
- `host_allowed`: the DNS-rebinding guard for LAN mode. A page on
  evil.example re-pointed at this machine's address is same-origin with
  itself, so the Origin check passes it; the Host it sends is still its own
  name. A request is allowed only when the Host names this computer: a
  loopback name, this machine's own name, or an address literal (a
  rebinding page can only ever send a *name*, never a numeric Host).
"""

from __future__ import annotations

import ipaddress
import socket
import struct
import sys

from memorymap.core.config import ConfigManager

LOOPBACK = "127.0.0.1"
ALL_INTERFACES = "0.0.0.0"  # noqa: S104  # LAN mode's whole point, behind a password-gated switch
LAN_PREF = "allow_lan"

_LOOPBACK_NAMES = frozenset({"localhost", "127.0.0.1", "::1"})

_current: str | None = None


def lan_enabled(config: ConfigManager) -> bool:
    """Whether the switch is on. Only a literal True counts: the preferences
    file is one a person may edit by hand, and a stray value must not open the
    notebook to the network."""
    return config.get_preference(LAN_PREF, False) is True


def bind_host(config: ConfigManager) -> str:
    return ALL_INTERFACES if lan_enabled(config) else LOOPBACK


def set_current(host: str) -> None:
    """Called by the launcher with the address uvicorn is about to bind."""
    global _current
    _current = host


def current() -> str:
    return _current or LOOPBACK


def is_loopback_bind(host: str | None = None) -> bool:
    return (host or current()) in _LOOPBACK_NAMES


def _own_names() -> set[str]:
    try:
        name = socket.gethostname().lower()
    except OSError:
        return set()
    short = name.split(".", 1)[0]
    return {name, short, f"{short}.local"}


def host_allowed(host_header: str | None) -> bool:
    """Is this Host one that names this computer? (the rebinding guard)."""
    if not host_header:
        return True  # HTTP/1.0 or a local tool: nothing to judge, nothing to rebind
    text = host_header.strip().lower()
    if text.startswith("["):  # [::1]:8000
        host = text[1:].split("]", 1)[0]
    else:
        host = text.rsplit(":", 1)[0] if text.count(":") == 1 else text
    if host in _LOOPBACK_NAMES:
        return True
    try:
        ipaddress.ip_address(host.split("%", 1)[0])
        return True
    except ValueError:
        pass
    return host in _own_names()


def lan_addresses() -> list[str]:
    """This machine's IPv4 addresses other devices could use, best effort.

    No connection is opened to find them (the usual trick, a UDP "connect" to
    a public address, would put a destination on the privacy receipt that
    nothing ever talked to): the addresses the host name resolves to, and on
    Linux each interface's own address by `SIOCGIFADDR`.
    """
    found: list[str] = []

    def add(address: str) -> None:
        try:
            ip = ipaddress.ip_address(address)
        except ValueError:
            return
        if ip.version == 4 and not ip.is_loopback and not ip.is_unspecified and address not in found:
            found.append(address)

    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            add(info[4][0])
    except OSError:
        pass  # no resolvable hostname: the interface scan below still runs
    if sys.platform.startswith("linux"):
        try:
            import fcntl

            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
                for _index, name in socket.if_nameindex():
                    try:
                        packed = fcntl.ioctl(
                            probe.fileno(), 0x8915, struct.pack("256s", name.encode()[:15])  # SIOCGIFADDR
                        )
                    except OSError:
                        continue  # an interface with no IPv4 address
                    add(socket.inet_ntoa(packed[20:24]))
        except (OSError, ImportError):
            pass  # no ioctl here: the hostname addresses above are all we can offer
    return found


def describe(config: ConfigManager, port: int | None = None) -> dict:
    """What the receipt and Settings say about who can reach the app."""
    host = current()
    other_devices = not is_loopback_bind(host)
    addresses = lan_addresses() if other_devices or lan_enabled(config) else []
    return {
        "host": host,
        "other_devices": other_devices,
        "lan_on_next_launch": lan_enabled(config),
        "restart_required": lan_enabled(config) == is_loopback_bind(host),
        "addresses": [f"http://{a}:{port}" if port else a for a in addresses],
    }
