"""Outbound HTTP that keeps the app's privacy promises, shared by web search
(`search/websearch.py`) and the page clipper (`core/webclip.py`).

Its own module so neither of those has to import the other for it: the
clipper borrowed these from web search and web search borrowed the
clipper's page reader, an import cycle CodeQL reported three times (alerts
439 to 441, INBOX 435) and the code worked around with an `importlib` call.
Moved verbatim; `websearch` still exports the old names.
"""

from __future__ import annotations

from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import requests

# The User-Agent used to be "MemoryMapAI/0.1 (personal notebook)", which is a
# near-unique fingerprint: it announces the exact app on every site visited and
# links those visits together across unrelated domains. That is the opposite of
# what someone asking for private search wants. A plain, extremely common
# browser string is the quiet choice, the aim is to look like everyone else,
# not to be identifiable and polite about it.
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0"
)

# Sent on every outbound request. None of these are a guarantee, a header is a
# request, not a control, but they cost nothing and they are what a browser in
# a privacy mode sends.
PRIVACY_HEADERS = {
    "User-Agent": USER_AGENT,
    # Generic, so the header doesn't narrow anyone down by locale.
    "Accept-Language": "en-US,en;q=0.9",
    "DNT": "1",
    "Sec-GPC": "1",
    # No Referer, ever: where you came from is nobody's business, and on a
    # manually-followed redirect chain we are the ones who decide.
    "Referer": "",
}

# Analytics parameters that exist only to identify the click that brought you.
# Stripped from every result link and from anything opened in the reader, so
# the request the site receives carries no campaign or click identifier.
TRACKING_PARAMS = frozenset(
    """utm_source utm_medium utm_campaign utm_term utm_content utm_id utm_name
    utm_reader utm_place utm_brand utm_social utm_social-type
    gclid gclsrc dclid gbraid wbraid fbclid msclkid twclid igshid ttclid
    yclid _openstat mc_cid mc_eid vero_id vero_conv oly_anon_id oly_enc_id
    hsa_acc hsa_cam hsa_grp hsa_ad hsa_src hsa_tgt hsa_kw hsa_mt hsa_net
    hsa_ver ref_src ref_url spm scm cmpid campaign_id ad_id adset_id
    s_kwcid ei sca_esv usg ved""".split()
)


def strip_tracking(url: str) -> str:
    """Remove click-tracking parameters from a URL, keeping everything else.

    Deliberately an allowlist-of-removals rather than a blanket "drop the
    query string": plenty of URLs need their query to resolve at all (a search
    result, an article id), and silently breaking links would be a worse
    failure than a leaked campaign tag.
    """
    try:
        parsed = urlparse(url)
    except ValueError:
        return url
    if not parsed.query:
        return url
    kept = [
        (key, value)
        for key, value in parse_qsl(parsed.query, keep_blank_values=True)
        if key.lower() not in TRACKING_PARAMS
    ]
    if len(kept) == len(parse_qsl(parsed.query, keep_blank_values=True)):
        return url
    return urlunparse(parsed._replace(query=urlencode(kept)))


def pin_url(url: str, address) -> tuple[str, str]:
    """Rewrite a URL to connect to one already-validated IP.

    Without this the guard above is checkable but not enforceable:
    _assert_external resolves the hostname, then requests resolves it AGAIN to
    open the connection. A hostile nameserver can answer the first lookup with
    a public address and the second with 127.0.0.1, DNS rebinding, and the
    fetch walks straight past the check. Connecting to the exact address that
    passed closes that window.

    Returns (pinned_url, host_header).
    """
    parsed = urlparse(url)
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    literal = f"[{address}]" if address.version == 6 else str(address)
    host_header = (
        parsed.hostname if parsed.port is None else f"{parsed.hostname}:{parsed.port}"
    )
    pinned = urlunparse(parsed._replace(netloc=f"{literal}:{port}"))
    return pinned, host_header


class PinnedAdapter(requests.adapters.HTTPAdapter):
    """Connects to a pinned IP while still doing TLS against the real hostname.

    Aiming a request at an IP literal would otherwise send the wrong SNI and
    check the certificate against the address, so every HTTPS fetch would fail.
    These two put the hostname back where TLS needs it, leaving verification
    fully intact.
    """

    def __init__(self, hostname: str, **kwargs) -> None:
        self._hostname = hostname
        super().__init__(**kwargs)

    def init_poolmanager(self, connections, maxsize, block=False, **pool_kwargs):
        pool_kwargs["server_hostname"] = self._hostname
        pool_kwargs["assert_hostname"] = self._hostname
        super().init_poolmanager(connections, maxsize, block=block, **pool_kwargs)
