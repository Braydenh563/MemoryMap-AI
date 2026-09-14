"""Nothing new reaches the network without somebody deciding it may.

WORLD_CLASS_PLAN section 12, S5: "move the private-IP guard into
`core/security.py` as `assert_public_url()` and call it from every outbound
fetch (bookmarks, clipper, update downloader, provider base URL)". The move is
done; this is the half that keeps it done, and it is the shape
`test_every_route_is_locked.py` already uses for the same reason: a new
outbound fetch added tomorrow reads exactly like one that was reviewed.

The rule is not "every fetch calls the guard". Most of the modules below are
*supposed* to reach an address the person set or the app installed, a local
model or a local SearXNG among them, and asserting the guard there would be
asserting the wrong thing. The rule is
that the list of modules that reach the network at all is short, written down,
and carries a sentence per line saying which kind each is. A module that turns
up here without a line is the finding.
"""

from __future__ import annotations

import ast
import pathlib

import pytest

SRC = pathlib.Path(__file__).resolve().parent.parent / "src" / "memorymap"

#: The calls that leave this machine. `session.get`/`session.post` are not
#: here: SQLAlchemy sessions use the same two names, and the modules that
#: build a `requests.Session` are already in the list below through their
#: `requests.` calls.
OUTBOUND = {"requests.get", "requests.post", "requests.put", "requests.head", "requests.request"}

#: Every module allowed to reach the network, and what it is. Two kinds:
#: "untrusted" means the URL came from somewhere the person did not type and
#: the app does not control, so it must go through
#: `core.security.public_addresses`; "configured" means the address is one the
#: person set or the app installed, where a private address is the point.
REACHES_THE_NETWORK = {
    # Untrusted: a search result, a page the person asked to open. Guarded by
    # `core.security.public_addresses`, every redirect hop re-checked, and the
    # connection pinned to the address that passed.
    "search/websearch.py": "untrusted",
    # Configured: the local model, at the address the person set. Private is
    # the normal case here and refusing it would break the product; what is
    # refused is the cloud metadata address, by `security.check_backend_url`.
    "ai/ollama_client.py": "configured",
    "ai/openai_client.py": "configured",
    # Configured: the app's own SearXNG, which it downloads and starts itself.
    "search/searxng_install.py": "configured",
    # Configured: the update feed and the installer download, both pinned to an
    # https allowlist of GitHub hosts before a byte is written (S11).
    "api/routes_update.py": "configured",
}


def _calls(tree: ast.AST) -> set[str]:
    names = set()
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
            continue
        value = node.func.value
        if isinstance(value, ast.Name):
            names.add(f"{value.id}.{node.func.attr}")
    return names


def _fetchers() -> set[str]:
    found = set()
    for path in sorted(SRC.rglob("*.py")):
        if _calls(ast.parse(path.read_text())) & OUTBOUND:
            found.add(str(path.relative_to(SRC)))
    return found


def test_every_module_that_reaches_the_network_is_written_down():
    new = _fetchers() - set(REACHES_THE_NETWORK)
    assert not new, (
        "these modules make outbound HTTP calls and are not in REACHES_THE_NETWORK: "
        + ", ".join(sorted(new))
        + ". Add a line saying whether the URL is untrusted (it must go through "
        "core.security.public_addresses) or configured (the person set it)."
    )


def test_the_list_names_modules_that_still_fetch():
    """An entry for a module that stopped fetching is an exemption nobody
    granted, waiting for the next thing to be put in that file."""
    gone = set(REACHES_THE_NETWORK) - _fetchers()
    assert not gone, f"REACHES_THE_NETWORK names modules that no longer fetch: {sorted(gone)}"


def test_the_untrusted_fetcher_goes_through_the_shared_guard():
    untrusted = [name for name, kind in REACHES_THE_NETWORK.items() if kind == "untrusted"]
    for name in untrusted:
        source = (SRC / name).read_text()
        assert "public_addresses" in source, (
            f"{name} fetches untrusted URLs but does not call core.security.public_addresses"
        )


def test_the_guard_refuses_every_way_in(monkeypatch):
    import ipaddress

    from memorymap.core import security

    def resolves_to(*addresses: str) -> None:
        monkeypatch.setattr(security, "_resolve", lambda host: list(addresses))

    resolves_to("93.184.216.34")
    assert security.public_addresses("https://example.com/") == [
        ipaddress.ip_address("93.184.216.34")
    ]

    # A scheme that is not http(s), including the ones a link in a note can
    # carry.
    for url in ("file:///etc/passwd", "ftp://example.com/x", "javascript:alert(1)"):
        with pytest.raises(security.UnsafeUrl):
            security.public_addresses(url)

    # Credentials in the URL: "http://trusted.example@evil.example/" reads as
    # one host and resolves to another.
    with pytest.raises(security.UnsafeUrl):
        security.public_addresses("http://example.com@127.0.0.1/")

    # Every address is checked, not the first: a name answering with one
    # public and one loopback address is refused.
    resolves_to("93.184.216.34", "127.0.0.1")
    with pytest.raises(security.UnsafeUrl, match="local address"):
        security.public_addresses("https://example.com/")

    # A lookup that fails is a failed check, never a pass.
    resolves_to()
    with pytest.raises(security.UnsafeUrl, match="look up"):
        security.public_addresses("https://example.com/")

    # The families of address that are local without being 127.0.0.1: the
    # LAN, link-local, and the cloud metadata service.
    for address in ("10.0.0.5", "192.168.1.7", "169.254.169.254", "::1"):
        resolves_to(address)
        with pytest.raises(security.UnsafeUrl, match="local address"):
            security.public_addresses("https://example.com/")
