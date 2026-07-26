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
import re
import time
from urllib.parse import parse_qs, unquote, urlparse

import requests

DDG_URL = "https://html.duckduckgo.com/html/"
REQUEST_TIMEOUT = 10
USER_AGENT = "MemoryMapAI/0.1 (personal notebook)"

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


def probe_searxng(base_url: str) -> bool:
    """True if a SearXNG instance answers JSON search at this URL."""
    try:
        response = requests.get(
            base_url.rstrip("/") + "/search",
            params={"q": "memorymap ping", "format": "json"},
            headers={"User-Agent": USER_AGENT},
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
    url = base_url.rstrip("/") + "/search"
    try:
        response = requests.get(
            url,
            params={"q": query, "format": "json"},
            headers={"User-Agent": USER_AGENT},
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as exc:
        raise WebSearchError(f"SearXNG search failed: {exc}") from exc

    rows = payload.get("results") if isinstance(payload, dict) else None
    if not isinstance(rows, list):
        raise WebSearchError("SearXNG returned an unexpected response")

    results = []
    for row in rows[:limit]:
        if not isinstance(row, dict):
            continue
        link = str(row.get("url") or "").strip()
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
    try:
        response = requests.post(
            DDG_URL,
            data={"q": query},
            headers={"User-Agent": USER_AGENT},
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise WebSearchError(f"Web search failed: {exc}") from exc
    return _parse_results(response.text, limit)


def _strip_tags(fragment: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", fragment)).strip()


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
        link = _real_url(html.unescape(href))
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


def fetch_readable(url: str) -> dict:
    """Fetch a page and return its readable text.

    This is what makes "open a result" useful without embedding a browser:
    scripts, styles and chrome are stripped and only text comes back, so
    nothing from the page can execute in the app.
    """
    if not url.startswith(("http://", "https://")):
        raise WebSearchError("Only http(s) links can be opened")
    try:
        response = requests.get(
            url,
            headers={"User-Agent": USER_AGENT},
            timeout=REQUEST_TIMEOUT,
            stream=True,
        )
        response.raise_for_status()
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
    body = re.sub(rf"(?is)<({_STRIP_TAGS})[^>]*>.*?</\1>", " ", page)
    # Prefer the main article when the page marks one up.
    article = re.search(r"(?is)<(article|main)[^>]*>(.*?)</\1>", body)
    if article:
        body = article.group(2)

    blocks: list[dict] = []
    pattern = re.compile(
        r"(?is)<(h[1-6]|p|li|blockquote|pre)[^>]*>(.*?)</\1>"
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
    match = re.search(r"<title[^>]*>(.*?)</title>", page, re.S | re.I)
    return _strip_tags(match.group(1)) if match else ""


def _readable_text(page: str) -> str:
    """Strip scripts/styles/markup and collapse whitespace into paragraphs."""
    body = re.sub(r"(?is)<(script|style|noscript|svg|nav|footer|header)[^>]*>.*?</\1>", " ", page)
    # Block-level tags become paragraph breaks so the text stays readable.
    body = re.sub(r"(?i)</(p|div|section|article|li|h[1-6]|tr)\s*>", "\n\n", body)
    body = re.sub(r"(?i)<br\s*/?>", "\n", body)
    text = html.unescape(re.sub(r"<[^>]+>", " ", body))
    lines = [re.sub(r"[ \t ]+", " ", line).strip() for line in text.split("\n")]
    kept: list[str] = []
    for line in lines:
        if not line:
            if kept and kept[-1] != "":
                kept.append("")
            continue
        kept.append(line)
    return "\n".join(kept).strip()
