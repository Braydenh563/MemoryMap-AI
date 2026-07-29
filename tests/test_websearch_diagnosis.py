"""Telling apart the three ways a web search ends up with nothing.

"Web search returns nothing" was filed against the parser and investigated
there more than once. It was the wrong place to look: an empty result list
means the request failed, or it was refused, or it genuinely matched nothing,
and those need different fixes from the person reading the message. These
tests pin the distinction so it can't quietly collapse back into one case.
"""

from __future__ import annotations

import logging

import pytest
import requests

from memorymap.search import websearch


class _Response:
    def __init__(self, body: str, status: int = 200):
        self.text = body
        self.status_code = status

    def raise_for_status(self):
        return None


def _session_returning(response):
    class FakeSession:
        def post(self, url, data=None, timeout=None):
            return response

        def close(self):
            return None

    return FakeSession


# A results page with nothing on it is still a big page.
_EMPTY_BUT_REAL = "<html><body>" + ("<div>no matches here</div>" * 400) + "</body></html>"


def test_a_challenge_page_is_reported_as_rate_limiting(monkeypatch):
    """A 200 carrying an anomaly notice is not 'no results'."""
    page = "<html><body>Our systems have detected unusual traffic.</body></html>"
    monkeypatch.setattr(websearch, "_private_session", _session_returning(_Response(page)))

    with pytest.raises(websearch.WebSearchError) as caught:
        websearch._search_duckduckgo("anything", 5)

    message = str(caught.value)
    assert "rate-limiting" in message
    # It has to point somewhere useful, not just say no.
    assert "SearXNG" in message


def test_a_tiny_body_is_reported_as_not_a_results_page(monkeypatch):
    """A real results page is tens of kilobytes even when it finds nothing."""
    monkeypatch.setattr(
        websearch, "_private_session", _session_returning(_Response("<html></html>"))
    )

    with pytest.raises(websearch.WebSearchError) as caught:
        websearch._search_duckduckgo("anything", 5)
    assert "unexpected page" in str(caught.value)


def test_a_genuine_no_results_page_returns_empty_without_raising(monkeypatch):
    """The one case that really is 'nothing matched' must stay quiet."""
    monkeypatch.setattr(
        websearch, "_private_session", _session_returning(_Response(_EMPTY_BUT_REAL))
    )
    assert websearch._search_duckduckgo("anything", 5) == []


def test_a_transport_failure_names_the_transport(monkeypatch):
    """No egress and a rate limit are not the same problem."""

    class FailingSession:
        def post(self, url, data=None, timeout=None):
            raise requests.exceptions.ProxyError("Tunnel connection failed: 403")

        def close(self):
            return None

    monkeypatch.setattr(websearch, "_private_session", FailingSession)
    with pytest.raises(websearch.WebSearchError) as caught:
        websearch._search_duckduckgo("anything", 5)
    assert "Tunnel connection failed" in str(caught.value)


def test_every_search_logs_status_and_body_length(monkeypatch, caplog):
    """What the Logs screen needs to answer this without a debugger."""
    body = _EMPTY_BUT_REAL
    monkeypatch.setattr(websearch, "_private_session", _session_returning(_Response(body)))

    with caplog.at_level(logging.INFO, logger=websearch.logger.name):
        websearch._search_duckduckgo("anything", 5)

    logged = " ".join(record.getMessage() for record in caplog.records)
    assert "HTTP 200" in logged
    assert str(len(body)) in logged
    assert "0 results parsed" in logged


def test_the_query_itself_is_never_logged(monkeypatch, caplog):
    """Search is the one feature that leaves the machine; the log is a file."""

    class FailingSession:
        def post(self, url, data=None, timeout=None):
            raise requests.exceptions.ConnectTimeout("timed out")

        def close(self):
            return None

    monkeypatch.setattr(websearch, "_private_session", FailingSession)
    with caplog.at_level(logging.DEBUG, logger=websearch.logger.name):
        with pytest.raises(websearch.WebSearchError):
            websearch._search_duckduckgo("my private medical question", 5)

    logged = " ".join(record.getMessage() for record in caplog.records)
    assert "medical" not in logged


def test_the_reader_collects_the_articles_links_but_not_the_chrome():
    """Links come back [{text, url}] so an agent can cite and follow up
    without a second search — from the article only, cleaned the same way
    every reader URL is: absolute, tracking-stripped, http(s) or nothing."""
    page = (
        "<html><body><nav><a href='/home'>Home</a></nav><article>"
        "<p><a href='/wiki/Ability?utm_source=x'>Ability</a>"
        "<a href='javascript:alert(1)'>bad</a>"
        "<a href='mailto:a@b.c'>mail</a></p></article></body></html>"
    )
    links = websearch._page_links(page, "https://wiki.example/wiki/Seraphine")
    assert {"text": "Ability", "url": "https://wiki.example/wiki/Ability"} in links
    assert all(link["url"].startswith("http") for link in links)
    assert not any(link["text"] == "Home" for link in links)


def test_a_bot_wall_is_named_rather_than_dumped_as_a_status(monkeypatch):
    """Reported: 'Couldn't open that page: 403 Client Error: Forbidden for
    url: https://162.159.142.170:443/…'. The IP-literal is our pinning, not
    something the user typed, and the 403 is the site's bot protection — the
    message should say that instead of leaving both to be puzzled over."""
    import requests

    def refuse(url):
        response = requests.Response()
        response.status_code = 403
        raise requests.HTTPError(response=response)

    monkeypatch.setattr(websearch, "_get_external", refuse)
    with pytest.raises(websearch.WebSearchError) as caught:
        websearch.fetch_readable("https://wiki.example/wiki/Seraphine")
    message = str(caught.value)
    assert "bot protection" in message
    assert "wiki.example" in message
    assert "162." not in message and "http" not in message
