"""Web search is the one feature that leaves the machine, so what it reveals
about the user while it's out there is worth pinning down in tests.

Each of these guards a property that is easy to regress silently — nothing
here fails loudly in normal use, it just quietly starts identifying you again.
"""

from __future__ import annotations

import ipaddress

from memorymap.search import websearch


def test_user_agent_does_not_name_the_app():
    """The old UA was "MemoryMapAI/0.1 (personal notebook)".

    That string is a unique fingerprint: it told DuckDuckGo and every page
    opened in the reader precisely which app was asking, on every request. A
    common browser string puts these requests in the same bucket as everyone
    else's, which is the whole point.
    """
    assert "MemoryMap" not in websearch.USER_AGENT
    assert "Mozilla/5.0" in websearch.USER_AGENT


def test_privacy_headers_carry_the_do_not_track_signals():
    headers = websearch.PRIVACY_HEADERS
    assert headers["DNT"] == "1"
    assert headers["Sec-GPC"] == "1"
    # A Referer would tell the destination what was searched for to reach it.
    assert "Referer" not in headers


def test_private_session_starts_with_no_cookies():
    """Cookies are how one query gets linked to the next."""
    session = websearch._private_session()
    try:
        assert len(session.cookies) == 0
        assert session.headers["User-Agent"] == websearch.USER_AGENT
        # trust_env must stay on: it is how a user's own proxy (Tor, a VPN)
        # and the system CA bundle reach requests at all.
        assert session.trust_env is True
    finally:
        session.close()


def test_tracking_parameters_are_stripped_from_result_urls():
    dirty = "https://example.com/article?id=7&utm_source=ddg&fbclid=abc&gclid=xyz"
    cleaned = websearch.strip_tracking(dirty)
    assert "utm_source" not in cleaned
    assert "fbclid" not in cleaned
    assert "gclid" not in cleaned
    assert "id=7" in cleaned  # the parameters the page actually needs survive


def test_strip_tracking_leaves_clean_urls_alone():
    for url in ("https://example.com/page", "https://example.com/p?q=cats"):
        assert websearch.strip_tracking(url) == url


def test_duckduckgo_results_come_back_without_tracking_params(monkeypatch):
    page = (
        '<a class="result__a" href="https://example.com/x?utm_campaign=spring">'
        "A result</a>"
    )
    results = websearch._parse_results(page, limit=5)
    assert results and "utm_campaign" not in results[0]["url"]


def test_pin_url_swaps_in_the_checked_address_and_keeps_the_host():
    """The connection must go to the address that passed the check.

    Resolving once for the check and again for the connection leaves a window
    where a hostile nameserver answers the two differently (DNS rebinding).
    """
    pinned, host = websearch._pin_url(
        "https://example.com/page", ipaddress.ip_address("93.184.216.34")
    )
    assert pinned == "https://93.184.216.34:443/page"
    assert host == "example.com"


def test_pin_url_brackets_ipv6_and_keeps_an_explicit_port():
    pinned, host = websearch._pin_url(
        "http://example.com:8080/p", ipaddress.ip_address("2606:2800:220:1:248:1893:25c8:1946")
    )
    assert pinned.startswith("http://[2606:2800:220:1:248:1893:25c8:1946]:8080/")
    assert host == "example.com:8080"


def test_assert_external_returns_the_addresses_it_validated(monkeypatch):
    monkeypatch.setattr(
        websearch,
        "_host_addresses",
        lambda host: [ipaddress.ip_address("93.184.216.34")],
    )
    assert websearch._assert_external("https://example.com/") == [
        ipaddress.ip_address("93.184.216.34")
    ]


def test_assert_external_still_refuses_local_addresses(monkeypatch):
    monkeypatch.setattr(
        websearch, "_host_addresses", lambda host: [ipaddress.ip_address("127.0.0.1")]
    )
    try:
        websearch._assert_external("http://sneaky.example/")
    except websearch.WebSearchError as exc:
        assert "local address" in str(exc)
    else:  # pragma: no cover - the guard is the point of the test
        raise AssertionError("a loopback address must be refused")
