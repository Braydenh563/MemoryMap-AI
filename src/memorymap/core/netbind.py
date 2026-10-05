"""Which address the server listens on: this computer only, or the network.

LAN mode (WORLD_CLASS_PLAN §12, Brief 15): "Allow other devices on this
network". Off by default, and the default is the point: the launcher binds
127.0.0.1 and nothing on the network can reach the app. On, it binds
0.0.0.0 at the next launch, so a phone or a second computer on the same
network can open the notebook with the password.

Three things live here because the launcher, the auth routes and the privacy
receipt all need the same answer:

- `bind_host(config, has_password=...)`: the address the launcher binds,
  from the one preference, and never beyond loopback without a password. The preference is written only by `POST /auth/lan-access`,
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
#: Every interface, IPv4 and IPv6 at once (WORLD_CLASS_PLAN §12, row 2): one
#: dual-stack socket, which the launcher makes itself (`listening_socket`)
#: because `uvicorn.run(host="::")` is IPv6 only wherever IPV6_V6ONLY
#: defaults on, Windows among them, and would stop answering on IPv4.
ALL_INTERFACES_V6 = "::"
LAN_PREF = "allow_lan"

_LOOPBACK_NAMES = frozenset({"localhost", "127.0.0.1", "::1"})

_current: str | None = None


def lan_enabled(config: ConfigManager) -> bool:
    """Whether the switch is on. Only a literal True counts: the preferences
    file is one a person may edit by hand, and a stray value must not open the
    notebook to the network."""
    return config.get_preference(LAN_PREF, False) is True


def dual_stack() -> bool:
    """Can one socket here take IPv4 and IPv6 both? False on a machine with
    no IPv6 at all (this sandbox: `AF_INET6` is not even a supported family),
    and then LAN mode binds IPv4 as it always did."""
    try:
        return bool(socket.has_ipv6 and socket.has_dualstack_ipv6())
    except (AttributeError, OSError):
        return False


def bind_host(config: ConfigManager, *, has_password: bool) -> str:
    """The address to listen on. Loopback unless the switch is on *and* a
    password exists (SEC-01, audit 2026-10-05): `--reset-password` deletes the
    password and used to leave the switch on, so the next launch put a
    notebook with nothing to ask for on the network. `has_password` has no
    default so no caller can forget to say."""
    if not has_password or not lan_enabled(config):
        return LOOPBACK
    return ALL_INTERFACES_V6 if dual_stack() else ALL_INTERFACES


def listening_socket(host: str, port: int) -> socket.socket | None:
    """The socket the launcher hands uvicorn for the dual-stack bind, or None
    for every other host (uvicorn binds those itself, as before).

    `create_server(..., dualstack_ipv6=True)` clears IPV6_V6ONLY, so the one
    socket answers `[::1]`, a global IPv6 address and every IPv4 address (as
    `::ffff:a.b.c.d`). Should the dual-stack bind fail at the last moment, the
    IPv4 bind LAN mode always made is the fallback, and `set_current` is told.
    """
    if host != ALL_INTERFACES_V6:
        return None
    try:
        return socket.create_server(
            (ALL_INTERFACES_V6, port), family=socket.AF_INET6, dualstack_ipv6=True
        )
    except (OSError, ValueError):
        return None


def url_host(address: str) -> str:
    """An address as it goes in a URL: an IPv6 one in brackets."""
    return f"[{address}]" if ":" in address and not address.startswith("[") else address


def set_current(host: str) -> None:
    """Called by the launcher with the address uvicorn is about to bind."""
    global _current
    _current = host


def current() -> str:
    return _current or LOOPBACK


def is_loopback_bind(host: str | None = None) -> bool:
    return (host or current()) in _LOOPBACK_NAMES


def arrived_on_loopback(server) -> bool:  # noqa: ANN001  # an ASGI scope's `server`, or None
    """Whether a request came in on this computer's own loopback interface.

    The ASGI scope's `server` is the address the listening socket accepted
    on, which is the fact `is_loopback_bind` only remembers the launcher
    saying: a server started any other way on 0.0.0.0 never called
    `set_current`. Only a numeric address off loopback says "the network";
    a name (the test client's `testserver`) or no address at all is read as
    local, since nothing can be judged from it.
    """
    if not isinstance(server, (tuple, list)) or not server or not isinstance(server[0], str):
        return True
    text = server[0].strip().strip("[]").split("%", 1)[0]
    try:
        address = ipaddress.ip_address(text)
    except ValueError:
        return True
    #: On the dual-stack socket an IPv4 client arrives as `::ffff:127.0.0.1`,
    #: which Python does not call loopback: read the IPv4 address inside it.
    mapped = getattr(address, "ipv4_mapped", None)
    return (mapped or address).is_loopback


def arrived_on_socket(server) -> bool:  # noqa: ANN001  # an ASGI scope's `server`, or None
    """Whether the scope names a real listening address (a number), as every
    request uvicorn accepts does. The in-process test client names its
    server (`testserver`) instead, and so does nothing else."""
    if not isinstance(server, (tuple, list)) or not server or not isinstance(server[0], str):
        return False
    try:
        ipaddress.ip_address(server[0].strip().strip("[]").split("%", 1)[0])
    except ValueError:
        return False
    return True


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


def _usable_v6(ip: ipaddress.IPv6Address) -> bool:
    """A global or unique-local IPv6 address another device can type.

    Never link-local (fe80::/10): it needs a zone id (`%eth0`) that no
    browser's address bar accepts, so listing it would be listing a URL that
    cannot be opened. Never loopback, unspecified, multicast or an IPv4
    address in IPv6 clothing (that one is already listed as IPv4).
    """
    return not (
        ip.is_loopback
        or ip.is_link_local
        or ip.is_unspecified
        or ip.is_multicast
        or ip.ipv4_mapped is not None
        or ip.is_site_local
    )


def _proc_v6_addresses() -> list[str]:
    """Linux's own list of this machine's IPv6 addresses, read, not probed."""
    try:
        with open("/proc/net/if_inet6", encoding="ascii") as table:
            rows = table.read().split("\n")
    except OSError:
        return []
    found = []
    for row in rows:
        parts = row.split()
        if parts and len(parts[0]) == 32:
            try:
                found.append(str(ipaddress.IPv6Address(int(parts[0], 16))))
            except ValueError:
                continue
    return found


def lan_addresses(include_v6: bool | None = None) -> list[str]:
    """This machine's addresses other devices could use, best effort: IPv4
    first, then global and unique-local IPv6 when the bind can answer on
    IPv6 (`include_v6`, which defaults to `dual_stack()`).

    No connection is opened to find them (the usual trick, a UDP "connect" to
    a public address, would put a destination on the privacy receipt that
    nothing ever talked to): the addresses the host name resolves to, and on
    Linux each interface's own address by `SIOCGIFADDR` and the kernel's
    IPv6 address table.
    """
    if include_v6 is None:
        include_v6 = dual_stack()
    found: list[str] = []
    found_v6: list[str] = []

    def add(address: str) -> None:
        try:
            ip = ipaddress.ip_address(address.split("%", 1)[0])
        except ValueError:
            return
        if ip.version == 4:
            if not ip.is_loopback and not ip.is_unspecified and str(ip) not in found:
                found.append(str(ip))
        elif include_v6 and _usable_v6(ip) and str(ip) not in found_v6:
            found_v6.append(str(ip))

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
    if include_v6:
        try:
            for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET6):
                add(info[4][0])
        except (OSError, AttributeError):
            pass  # no IPv6 name for this host: the table below may still have some
        if sys.platform.startswith("linux"):
            for address in _proc_v6_addresses():
                add(address)
    return found + found_v6


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
        "addresses": [f"http://{url_host(a)}:{port}" if port else url_host(a) for a in addresses],
    }
