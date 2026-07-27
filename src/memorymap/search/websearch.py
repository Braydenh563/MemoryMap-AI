"""Opt-in web search (Wave F) — the ONE feature that leaves the machine.

It's off by default, gated behind the "web_search_enabled" preference, and the
UI labels results clearly as coming from the internet.

Two providers:

- **SearXNG** (recommended) — a self-hosted metasearch engine. If the user
  points `searxng_url` at their own instance we use its JSON API: no scraping,
  no API key, aggregated results, and the query never leaves their network
  beyond whatever SearXNG itself federates.
- **DuckDuckGo HTML** (default) — no setup at all. The request carries only
  the query text. Parsed defensively, since it's markup we don't control.

Whatever the provider, a failure degrades: SearXNG errors fall back to
DuckDuckGo rather than breaking search entirely.
"""

from __future__ import annotations

import html
import ipaddress
import re
import socket
import time
from urllib.parse import parse_qs, parse_qsl, unquote, urlencode, urlparse, urlunparse

import requests

DDG_URL = "https://html.duckduckgo.com/html/"
REQUEST_TIMEOUT = 10

# Blend in, don't announce yourself. The old value — "MemoryMapAI/0.1 (personal
# notebook)" — told DuckDuckGo and every page opened in the reader exactly which
# app was asking, which is a unique fingerprint attached to every query the user
# makes. A common browser string is the single biggest privacy win available
# here: it puts these requests in the same bucket as everyone else's.
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)

# Sent on every outbound request. The point of each one:
#   Referer is omitted entirely — a search result URL in a Referer header tells
#     the destination what you searched for.
#   DNT/Sec-GPC are the two "do not track" signals that some jurisdictions make
#     legally binding.
#   Accept-Language is deliberately generic; a specific locale narrows a
#     fingerprint considerably.
PRIVACY_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept-Language": "en-US,en;q=0.9",
    "DNT": "1",
    "Sec-GPC": "1",
    "Referrer-Policy": "no-referrer",
}


def _private_session() -> requests.Session:
    """A one-shot session that keeps nothing.

    Cookies are the mechanism by which a search engine links one query to the
    next, so the jar is cleared and the session is thrown away after the call —
    nothing about a search survives to be correlated with the next one.
    """
    session = requests.Session()
    session.headers.update(PRIVACY_HEADERS)
    session.cookies.clear()
    # trust_env stays ON deliberately. Turning it off looks like a privacy win
    # — no ambient proxy, no netrc — but it also discards the system CA bundle
    # and the user's proxy settings, which breaks TLS outright for anyone
    # behind a corporate proxy. Someone routing through Tor or a VPN proxy
    # configures it through exactly these variables, so ignoring them would
    # make the app LESS private, not more.
    return session


# Query/tracking parameters that identify the click rather than the page. They
# are stripped from every result URL so opening one doesn't hand the destination
# a campaign id tying the visit back to the search that produced it.
_TRACKING_PARAMS = frozenset(
    {
        "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
        "utm_id", "utm_source_platform", "gclid", "gclsrc", "dclid", "fbclid",
        "msclkid", "mc_eid", "mc_cid", "igshid", "yclid", "twclid", "ttclid",
        "vero_id", "wickedid", "_hsenc", "_hsmi", "oly_anon_id", "oly_enc_id",
        "ref", "referrer", "spm", "scm",
    }
)


def strip_tracking(url: str) -> str:
    """Remove click-tracking parameters from a result URL."""
    try:
        parsed = urlparse(url)
    except ValueError:
        return url
    if not parsed.query:
        return url
    kept = [
        (key, value)
        for key, value in parse_qsl(parsed.query, keep_blank_values=True)
        if key.lower() not in _TRACKING_PARAMS
    ]
    return urlunparse(parsed._replace(query=urlencode(kept, doseq=True)))

# Small in-process cache so repeating a search (or an agent retrying one)
# doesn't hit the network again within the same minute or two.
_CACHE: dict[tuple[str, int], tuple[float, list[dict]]] = {}
CACHE_TTL_SECONDS = 180
CACHE_MAX_ENTRIES = 64


class WebSearchError(RuntimeError):
    """The web couldn't be reached or the response wasn't usable."""


def _cache_get(key: tuple[str, int]) -> list[dict] | None:
    hit = _CACHE.get(key)
    if not hit:
        return None
    stored_at, results = hit
    if time.time() - stored_at > CACHE_TTL_SECONDS:
        _CACHE.pop(key, None)
        return None
    return results


def _cache_put(key: tuple[str, int], results: list[dict]) -> None:
    if len(_CACHE) >= CACHE_MAX_ENTRIES:
        _CACHE.clear()  # tiny cache; simplest correct eviction
    _CACHE[key] = (time.time(), results)


def clear_cache() -> None:
    """Used by tests and when the provider settings change."""
    _CACHE.clear()


# Where a self-hosted SearXNG usually listens. Checked in order, once, so a
# user who has one running never has to type a URL.
SEARXNG_CANDIDATES = (
    "http://localhost:8888",
    "http://127.0.0.1:8888",
    "http://localhost:8080",
    "http://localhost:8081",
    "http://searxng:8080",
)
DISCOVERY_TIMEOUT = 1.5


def _build_pinned_probe_target(base_url: str) -> tuple[str, dict[str, str]] | None:
    parsed = urlparse(base_url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        return None

    host = parsed.hostname
    addresses = _host_addresses(host)
    internal_addresses = [address for address in addresses if _is_internal(address)]
    if not internal_addresses:
        return None

    pinned_ip = internal_addresses[0]
    try:
        ip_obj = ipaddress.ip_address(pinned_ip)
    except ValueError:
        return None

    port = parsed.port
    if port is None:
        port = 443 if parsed.scheme == "https" else 80

    if ip_obj.version == 6:
        netloc = f"[{pinned_ip}]:{port}"
    else:
        netloc = f"{pinned_ip}:{port}"

    probe_url = f"{parsed.scheme}://{netloc}/search"
    host_header = host if parsed.port is None else f"{host}:{parsed.port}"
    headers = {"User-Agent": USER_AGENT, "Host": host_header}
    return probe_url, headers


def probe_searxng(base_url: str) -> bool:
    """True if a SearXNG instance answers JSON search at this URL.

    SearXNG is documented as self-hosted — the app can even run it for you —
    so the URL is required to resolve to this machine or the local network.
    That keeps a mistyped or hostile preference from turning the probe into a
    request against an arbitrary internet host.
    """
    target = _build_pinned_probe_target(base_url)
    if not target:
        return False
    probe_url, headers = target

    try:
        response = requests.get(
            probe_url,
            params={"q": "memorymap ping", "format": "json"},
            headers=headers,
            timeout=DISCOVERY_TIMEOUT,
        )
        if response.status_code != 200:
            return False
        payload = response.json()
    except (requests.RequestException, ValueError):
        return False
    return isinstance(payload, dict) and isinstance(payload.get("results"), list)


def discover_searxng() -> str | None:
    """Find a SearXNG on the usual local ports, or None."""
    for candidate in SEARXNG_CANDIDATES:
        if probe_searxng(candidate):
            return candidate
    return None


def domain_of(url: str) -> str:
    """'https://en.wikipedia.org/wiki/X' -> 'en.wikipedia.org' (for display)."""
    try:
        return urlparse(url).netloc.removeprefix("www.")
    except ValueError:
        return ""


def search_web(
    query: str,
    limit: int = 5,
    searxng_url: str | None = None,
) -> list[dict]:
    """[{title, url, snippet, domain, engine}] for a query, best first."""
    query = (query or "").strip()
    if not query:
        return []

    cache_key = (f"{searxng_url or 'ddg'}::{query.lower()}", limit)
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    results: list[dict] = []
    if searxng_url:
        try:
            results = _search_searxng(query, limit, searxng_url)
        except WebSearchError:
            results = []  # fall through to DuckDuckGo rather than failing

    if not results:
        results = _search_duckduckgo(query, limit)

    _cache_put(cache_key, results)
    return results


# --- SearXNG ------------------------------------------------------------------


def _search_searxng(query: str, limit: int, base_url: str) -> list[dict]:
    """Query a self-hosted SearXNG instance via its JSON API."""
    # Same local-only rule as probe_searxng: the configured instance is meant
    # to be yours, so it can't be used to aim requests at the wider internet.
    scheme, host = _split_url(base_url)
    if not scheme:
        raise WebSearchError("The SearXNG address isn't a valid http(s) URL")
    addresses = _host_addresses(host)
    if not addresses or not all(_is_internal(address) for address in addresses):
        raise WebSearchError("The SearXNG address must be on this machine or your network")
    url = base_url.rstrip("/") + "/search"
    session = _private_session()
    try:
        # Same accepted CodeQL SSRF alert as probe_searxng: a user-configured
        # instance, address-checked immediately above.
        # POST keeps the query out of SearXNG's own access log too — the
        # instance is local, but "local" is not the same as "not written down".
        response = session.post(
            url,
            data={"q": query, "format": "json"},
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as exc:
        raise WebSearchError(f"SearXNG search failed: {exc}") from exc
    finally:
        session.close()

    rows = payload.get("results") if isinstance(payload, dict) else None
    if not isinstance(rows, list):
        raise WebSearchError("SearXNG returned an unexpected response")

    results = []
    for row in rows[:limit]:
        if not isinstance(row, dict):
            continue
        link = strip_tracking(str(row.get("url") or "").strip())
        if not link:
            continue
        results.append(
            {
                "title": str(row.get("title") or link).strip(),
                "url": link,
                "snippet": str(row.get("content") or "").strip(),
                "domain": domain_of(link),
                "engine": "searxng",
            }
        )
    return results


# --- DuckDuckGo ---------------------------------------------------------------


def _search_duckduckgo(query: str, limit: int) -> list[dict]:
    # POST, not GET: the query stays out of the request line, so it never
    # lands in an intermediary's access log or a proxy's history.
    session = _private_session()
    try:
        response = session.post(
            DDG_URL,
            data={"q": query},
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise WebSearchError(f"Web search failed: {exc}") from exc
    finally:
        session.close()  # drop the cookie jar with the session
    return _parse_results(response.text, limit)


def _strip_tags(fragment: str) -> str:
    return html.unescape(re.sub(r"<[^>]{0,2000}>", "", fragment)).strip()


def _real_url(href: str) -> str:
    """DuckDuckGo wraps results in a redirect (…/l/?uddg=<real-url>);
    unwrap it so the user sees where a link actually goes."""
    if href.startswith("//"):
        href = "https:" + href
    parsed = urlparse(href)
    if parsed.path.startswith("/l/"):
        wrapped = parse_qs(parsed.query).get("uddg", [""])[0]
        if wrapped:
            return unquote(wrapped)
    return href


# Two ways of finding results: the long-standing `result__a` markup, and a
# looser anchor-based pass. If DDG changes one, the other usually still works;
# if both fail we return [] and the UI says "no results" instead of crashing.
_TITLE_PATTERNS = (
    r'<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
    r'<a[^>]*href="(/l/\?[^"]+)"[^>]*class="[^"]*result[^"]*"[^>]*>(.*?)</a>',
)
_SNIPPET_PATTERNS = (
    r'<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>(.*?)</a>',
    r'<td[^>]*class="[^"]*result-snippet[^"]*"[^>]*>(.*?)</td>',
)


def _first_matches(patterns: tuple[str, ...], page: str) -> list:
    for pattern in patterns:
        found = re.findall(pattern, page, re.S)
        if found:
            return found
    return []


def _parse_results(page: str, limit: int) -> list[dict]:
    """A deliberately small parse of the results page, with a backup pattern."""
    titles = _first_matches(_TITLE_PATTERNS, page)
    snippets = _first_matches(_SNIPPET_PATTERNS, page)
    results = []
    for index, (href, title) in enumerate(titles[:limit]):
        link = strip_tracking(_real_url(html.unescape(href)))
        results.append(
            {
                "title": _strip_tags(title),
                "url": link,
                "snippet": _strip_tags(snippets[index]) if index < len(snippets) else "",
                "domain": domain_of(link),
                "engine": "duckduckgo",
            }
        )
    return results


# --- reader view --------------------------------------------------------------

_READER_MAX_BYTES = 400_000
_READER_MAX_CHARS = 20_000


def _host_addresses(host: str) -> list[ipaddress.IPv4Address | ipaddress.IPv6Address]:
    """Every IP a hostname resolves to, so a check can't be dodged by a name.

    An empty list means the name doesn't resolve — callers treat that as a
    failed check rather than a pass, so a lookup failure can never open a hole.
    """
    try:
        infos = socket.getaddrinfo(host, None)
    except (socket.gaierror, UnicodeError):
        return []
    found = []
    for info in infos:
        try:
            found.append(ipaddress.ip_address(info[4][0]))
        except ValueError:  # a non-IP sockaddr; nothing to check against
            continue
    return found


def _is_internal(address: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """True for anything on this machine or the local network."""
    return (
        address.is_private
        or address.is_loopback
        or address.is_link_local
        or address.is_reserved
        or address.is_multicast
        or address.is_unspecified
    )


_MAX_REDIRECTS = 5


def _assert_external(url: str) -> list:
    """Refuse a URL that isn't plain http(s) out to the public internet.

    A search result is untrusted input, so it must never make the app fetch
    something on this machine or the local network — that would turn "open a
    result" into a probe of the user's own services.

    Returns the resolved addresses so the caller can connect to one it has
    actually checked (see _pin_url) rather than resolving the name a second
    time.
    """
    scheme, host = _split_url(url)
    if not scheme:
        raise WebSearchError("Only http(s) links can be opened")
    addresses = _host_addresses(host)
    if not addresses:
        raise WebSearchError("Couldn't look up that address")
    if any(_is_internal(address) for address in addresses):
        raise WebSearchError("That link points at a local address, so it wasn't opened")
    return addresses


def _pin_url(url: str, address) -> tuple[str, str]:
    """Rewrite a URL to connect to one already-validated IP.

    Without this the guard is checkable but not enforceable: _assert_external
    resolves the hostname, then requests resolves it AGAIN when it connects.
    A hostile name server can answer the first lookup with a public address and
    the second with 127.0.0.1, and the fetch walks straight past the check
    (DNS rebinding). Connecting to the exact address that passed — carrying the
    original Host header so TLS and vhosts still work — closes that window.

    Returns (pinned_url, host_header).
    """
    parsed = urlparse(url)
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    literal = f"[{address}]" if address.version == 6 else str(address)
    host_header = parsed.hostname if parsed.port is None else f"{parsed.hostname}:{parsed.port}"
    pinned = urlunparse(parsed._replace(netloc=f"{literal}:{port}"))
    return pinned, host_header


class _PinnedAdapter(requests.adapters.HTTPAdapter):
    """Connects to a pinned IP while still doing TLS against the real hostname.

    Without server_hostname/assert_hostname, aiming a request at an IP literal
    would send the wrong SNI and check the certificate against the IP, so every
    HTTPS fetch would fail. These two put the hostname back where TLS needs it,
    leaving verification fully intact.
    """

    def __init__(self, hostname: str, **kwargs) -> None:
        self._hostname = hostname
        super().__init__(**kwargs)

    def init_poolmanager(self, connections, maxsize, block=False, **pool_kwargs):
        pool_kwargs["server_hostname"] = self._hostname
        pool_kwargs["assert_hostname"] = self._hostname
        super().init_poolmanager(connections, maxsize, block=block, **pool_kwargs)


def _get_external(url: str) -> requests.Response:
    """GET a public URL, checking every redirect hop rather than only the first.

    Redirects are followed by hand precisely because `allow_redirects=True`
    would resolve the next hop inside requests, where the address check can't
    see it — a public page answering "302 → http://127.0.0.1/" would otherwise
    walk straight past the guard above.

    Each hop then connects to the exact address that passed the check. That
    part matters more than it looks: resolving the name for the check and
    letting requests resolve it again for the connection leaves a window where
    a hostile nameserver answers the first lookup publicly and the second with
    127.0.0.1 (DNS rebinding), which defeats the check entirely.
    """
    session = _private_session()
    try:
        for _ in range(_MAX_REDIRECTS):
            addresses = _assert_external(url)
            pinned, host_header = _pin_url(url, addresses[0])
            parsed = urlparse(pinned)
            if parsed.scheme == "https":
                session.mount(
                    f"https://{parsed.netloc}", _PinnedAdapter(urlparse(url).hostname)
                )
            # CodeQL reports this as SSRF and always will: opening a link the
            # user picked is the feature. Every hop is address-checked above and
            # then pinned to the checked address, which is as far as this can be
            # constrained without dropping the feature.
            response = session.get(
                pinned,
                headers={"Host": host_header},
                timeout=REQUEST_TIMEOUT,
                stream=True,
                allow_redirects=False,
            )
            if response.is_redirect or response.is_permanent_redirect:
                location = response.headers.get("location", "")
                response.close()
                if not location:
                    raise WebSearchError("That page redirected to nowhere")
                # A relative Location is resolved against the hop it came from —
                # the original URL, not the pinned one, so the next check sees
                # the real hostname.
                url = requests.compat.urljoin(url, location)
                continue
            response.raise_for_status()
            # The body is still unread, so the session has to outlive this
            # function — closing it here would shut the pool the caller is
            # about to stream from. Tying it to the response hands that
            # lifetime to the garbage collector.
            response._memorymap_session = session
            return response
    except BaseException:
        session.close()
        raise
    session.close()
    raise WebSearchError("That page redirected too many times")


def _split_url(url: str) -> tuple[str, str]:
    """(scheme, host) for an http(s) URL, or ("", "") if it isn't one.

    Credentials in the URL are rejected outright: they're never needed here and
    "http://trusted.example@evil.example/" is a classic way to make a URL read
    as one host while resolving to another.
    """
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return "", ""
    if parsed.username or parsed.password:
        return "", ""
    return parsed.scheme, parsed.hostname


def fetch_readable(url: str) -> dict:
    """Fetch a page and return its readable text.

    This is what makes "open a result" useful without embedding a browser:
    scripts, styles and chrome are stripped and only text comes back, so
    nothing from the page can execute in the app.
    """
    try:
        response = _get_external(url)
        content_type = response.headers.get("content-type", "")
        if "html" not in content_type and "text" not in content_type:
            raise WebSearchError("That link isn't a readable page")
        raw = response.raw.read(_READER_MAX_BYTES, decode_content=True) or b""
    except requests.RequestException as exc:
        raise WebSearchError(f"Couldn't open that page: {exc}") from exc

    page = raw.decode(response.encoding or "utf-8", errors="replace")
    return {
        "url": url,
        "domain": domain_of(url),
        "title": _page_title(page) or domain_of(url),
        "text": _readable_text(page)[:_READER_MAX_CHARS],
        "blocks": _readable_blocks(page),
    }


# Keep the article, drop the furniture. Nav bars, cookie banners and menus are
# what make a stripped page unreadable, so they go before the text is taken.
_STRIP_TAGS = (
    "script|style|noscript|svg|nav|footer|header|aside|form|iframe|button|select"
)
_JUNK_PATTERNS = re.compile(
    r"(cookie|subscribe|newsletter|advertisement|sign in|log in|skip to)",
    re.I,
)


def _readable_blocks(page: str) -> list[dict]:
    """Structured [{type, text}] so the reader can lay the page out properly.

    Returning headings and paragraphs separately is what turns a wall of text
    into something you can actually read.
    """
    body = re.sub(rf"(?is)<({_STRIP_TAGS})[^>]{{0,400}}>.{{0,200000}}?</\1>", " ", page)
    # Prefer the main article when the page marks one up.
    article = re.search(r"(?is)<(article|main)[^>]{0,400}>(.{0,500000}?)</\1>", body)
    if article:
        body = article.group(2)

    blocks: list[dict] = []
    pattern = re.compile(
        r"(?is)<(h[1-6]|p|li|blockquote|pre)[^>]{0,400}>(.{0,50000}?)</\1>"
    )
    for match in pattern.finditer(body):
        tag = match.group(1).lower()
        text = _strip_tags(match.group(2))
        text = re.sub(r"[ \t ]+", " ", text).strip()
        if not text or len(text) < 2:
            continue
        # Short lines that look like chrome rather than content.
        if len(text) < 40 and _JUNK_PATTERNS.search(text):
            continue
        kind = "heading" if tag.startswith("h") else tag
        blocks.append({"type": kind, "text": text[:2000]})
        if len(blocks) >= 300:
            break

    # Nothing structured? Fall back to paragraphs of plain text.
    if not blocks:
        plain = _readable_text(page)[:_READER_MAX_CHARS]
        blocks = [
            {"type": "p", "text": para.strip()}
            for para in plain.split("\n\n")
            if para.strip()
        ]
    return blocks


def _page_title(page: str) -> str:
    match = re.search(r"<title[^>]{0,400}>(.{0,2000}?)</title>", page, re.S | re.I)
    return _strip_tags(match.group(1)) if match else ""


def _readable_text(page: str) -> str:
    """Strip scripts/styles/markup and collapse whitespace into paragraphs."""
    body = re.sub(
        r"(?is)<(script|style|noscript|svg|nav|footer|header)[^>]{0,400}>.{0,200000}?</\1>",
        " ",
        page,
    )
    # Block-level tags become paragraph breaks so the text stays readable.
    body = re.sub(r"(?i)</(p|div|section|article|li|h[1-6]|tr)\s*>", "\n\n", body)
    body = re.sub(r"(?i)<br\s*/?>", "\n", body)
    text = html.unescape(re.sub(r"<[^>]{0,2000}>", " ", body))
    lines = [re.sub(r"[ \t ]+", " ", line).strip() for line in text.split("\n")]
    kept: list[str] = []
    for line in lines:
        if not line:
            if kept and kept[-1] != "":
                kept.append("")
            continue
        kept.append(line)
    return "\n".join(kept).strip()
