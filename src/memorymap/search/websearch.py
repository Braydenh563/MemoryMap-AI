"""Opt-in web search (Wave F) — the ONE feature that leaves the machine.

It's off by default, gated behind the "web_search_enabled" preference,
and the UI labels results clearly as coming from the internet. Uses
DuckDuckGo's plain-HTML endpoint: no API key, no account, and the
request carries only the query text.
"""

from __future__ import annotations

import html
import re
from urllib.parse import parse_qs, unquote, urlparse

import requests

DDG_URL = "https://html.duckduckgo.com/html/"
REQUEST_TIMEOUT = 10


class WebSearchError(RuntimeError):
    """The web couldn't be reached or the response wasn't usable."""


def search_web(query: str, limit: int = 5) -> list[dict]:
    """[{title, url, snippet}] for a query, best results first."""
    try:
        response = requests.post(
            DDG_URL,
            data={"q": query},
            headers={"User-Agent": "MemoryMapAI/0.1 (personal notebook)"},
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
    parsed = urlparse(href)
    if parsed.path.startswith("/l/"):
        wrapped = parse_qs(parsed.query).get("uddg", [""])[0]
        if wrapped:
            return unquote(wrapped)
    return href


def _parse_results(page: str, limit: int) -> list[dict]:
    """A deliberately small regex parse of the results page. If DDG ever
    changes its markup this returns [] rather than crashing — the UI
    treats that as 'no results'."""
    titles = re.findall(
        r'<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', page, re.S
    )
    snippets = re.findall(
        r'<a[^>]*class="result__snippet"[^>]*>(.*?)</a>', page, re.S
    )
    results = []
    for index, (href, title) in enumerate(titles[:limit]):
        results.append(
            {
                "title": _strip_tags(title),
                "url": _real_url(html.unescape(href)),
                "snippet": _strip_tags(snippets[index]) if index < len(snippets) else "",
            }
        )
    return results
