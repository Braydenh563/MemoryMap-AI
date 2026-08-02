"""Two browser-facing defences: where a request came from, and what a page
is allowed to load.

Both exist for the same reason, and it is not the one people expect of a
local-only app. Binding 127.0.0.1 stops the *network* reaching MemoryMap. It
does nothing about the browser already running on this machine: any page in
any other tab can ask that browser to send a request to http://localhost:8000,
and the browser will, because it is the target's job to say no, not the
attacker's. This is not hypothetical — it is how local dev servers and Ollama
itself have actually been attacked.

  ORIGIN CHECK — refuse a request that a page on another site caused.
  CSP         — bound what our own page may load, so injected markup in a
                note cannot fetch or execute anything.

The two cover different halves and neither substitutes for the other.
"""

from __future__ import annotations

import hashlib
import re
from base64 import b64encode
from pathlib import Path
from urllib.parse import urlsplit

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

# Loopback spellings that all mean this machine. A person who typed
# "localhost:8000" and a desktop shell that loaded "127.0.0.1:8000" are the
# same user on the same notebook, and neither should be told they are
# cross-origin.
_LOOPBACK_HOSTS = frozenset({"localhost", "127.0.0.1", "::1"})

# Methods a browser will send cross-origin without a preflight, and which
# therefore reach the app before CORS has any say. GET and HEAD are here too
# because the risk is reading a response, not only writing.
_CHECKED_METHODS = frozenset({"GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"})


def _origin_of(url: str) -> tuple[str, str, int | None] | None:
    """(scheme, host, port) for a URL, or None if it isn't one we can judge."""
    try:
        parts = urlsplit(url)
    except ValueError:
        return None
    if parts.scheme not in ("http", "https") or not parts.hostname:
        return None
    port = parts.port
    if port is None:
        port = 443 if parts.scheme == "https" else 80
    return (parts.scheme, parts.hostname.lower(), port)


def _is_same_site(candidate: str, host_header: str | None, scheme: str) -> bool:
    """Did `candidate` (an Origin or Referer) come from this app's own page?

    Compared against the Host header the request actually arrived with, not a
    configured hostname: an attacker's page cannot choose the Host, only the
    Origin, so a mismatch between the two is exactly the signal wanted.
    """
    origin = _origin_of(candidate)
    if origin is None:
        return False
    _, host, port = origin

    mine = _origin_of(f"{scheme}://{host_header}") if host_header else None
    if mine is not None and (host, port) == (mine[1], mine[2]):
        return True
    # Loopback aliases of each other on the same port: 127.0.0.1 and localhost
    # are one machine, and which one appears depends on what the user typed.
    if mine is not None and host in _LOOPBACK_HOSTS and mine[1] in _LOOPBACK_HOSTS:
        return port == mine[2]
    return False


class OriginCheckMiddleware(BaseHTTPMiddleware):
    """Refuse requests a *different* site's page caused a browser to send.

    The rule is narrow on purpose: a request is refused only when it carries
    an Origin (or, failing that, a Referer) that disagrees with the Host it was
    sent to. A request with neither header is allowed through, which is not the
    hole it looks like — browsers attach Origin to exactly the cross-site
    requests this is meant to stop, and the requests without one are the local
    tools that legitimately have no origin: curl, the pywebview desktop shell,
    the test client, a shortcut on the desktop.

    Note this matters *most* before a password is ever set. Until then
    `require_unlock` waves everything through, because there is nothing to
    protect yet — but that window is also when a drive-by POST to /auth/setup
    could claim the notebook and lock the real owner out of it.
    """

    async def dispatch(self, request, call_next):
        if request.method.upper() in _CHECKED_METHODS:
            stated = request.headers.get("origin")
            # Referer is the fallback, not an equal: it is absent under a
            # strict referrer policy, so it can only ever be used to reject
            # something, never as the reason to trust something.
            if stated is None or stated == "null":
                stated = request.headers.get("referer")
            if stated is not None and stated != "null":
                host = request.headers.get("host")
                scheme = request.url.scheme or "http"
                if not _is_same_site(stated, host, scheme):
                    return JSONResponse(
                        status_code=403,
                        content={
                            "detail": (
                                "This request came from another site. MemoryMap "
                                "only answers its own pages."
                            )
                        },
                    )
        return await call_next(request)


# --- Content-Security-Policy ------------------------------------------------

# The one inline <script> in index.html applies the theme before first paint,
# and has to stay inline — app.js loads at the end of the body, far too late to
# stop the flash. So it is allowed by the hash of its own contents, computed
# from the file at startup rather than written down here. Written down, it
# would be wrong the first time anyone edited the block (which the roadmap
# already expects: the theme table in it is kept in step with THEME_PRESETS by
# hand), and a stale hash fails as a blank unstyled page.
# Two loosenesses here were flagged by CodeQL (`py/bad-tag-filter`), and the
# *reported* risk does not apply while the real bug does — worth writing down
# so the next person does not re-litigate it.
#
# **Not an XSS filter.** This reads `frontend/index.html`, a file shipped with
# the app, to compute the hash of its own inline script. Nothing user-supplied
# reaches it, so "an attacker crafts markup that slips past the regex" has no
# route in. Parsing HTML with a regex is only defensible for exactly that
# reason.
#
# **But the failure mode is real, and it is a blank page.** If the pattern
# misses the script, its hash never enters the CSP and the browser refuses to
# run it — which is the pre-paint theme block, so the app opens unstyled. Both
# gaps below did that:
#
#   - `</script >` — HTML permits whitespace before the closing `>`, and the
#     old pattern required them adjacent, so the match failed outright.
#   - `src = "…"` — the old exclusion looked for `src=` with no spaces, so a
#     spaced attribute made an *external* script look inline and contributed a
#     hash of the empty string.
#
# `\s*` in both places closes them. It is still not an HTML parser and is not
# trying to be; it is a deliberately narrow reader of one known file.
_INLINE_SCRIPT = re.compile(
    rb"<script(?![^>]*\ssrc\s*=)[^>]*>(.*?)</script(?:\s+[^>]*)?>", re.DOTALL | re.IGNORECASE
)


def inline_script_hashes(html_path: Path) -> list[str]:
    """CSP source expressions for every inline script in a page."""
    try:
        html = html_path.read_bytes()
    except OSError:
        return []
    hashes = []
    for body in _INLINE_SCRIPT.findall(html):
        digest = hashlib.sha256(body).digest()
        hashes.append(f"'sha256-{b64encode(digest).decode('ascii')}'")
    return hashes


def build_csp(script_hashes: list[str]) -> str:
    """The policy. Every source is 'self' or a hash — no host is named at all.

    That is only affordable because of a rule the project already follows: no
    asset comes from a CDN, and d3 and p5 are vendored into frontend/vendor.
    A policy this tight is normally the expensive part of adding CSP; here it
    was already paid for.
    """
    directives = {
        # Anything not named below falls back to this.
        "default-src": "'self'",
        # No 'unsafe-inline' and no 'unsafe-eval': the frontend has neither an
        # eval nor a new Function anywhere in it, so nothing needs them.
        "script-src": " ".join(["'self'", *script_hashes]),
        # No 'unsafe-inline' either — the eight style attributes that used to
        # be in index.html moved into style.css to make this possible. This is
        # the directive that stops injected markup styling itself into a
        # convincing fake dialog over the top of the real app.
        "style-src": "'self'",
        # blob: for anything the app draws and hands back to itself (the sketch
        # pad, an exported chart); data: for the small inline SVGs.
        "img-src": "'self' data: blob:",
        "font-src": "'self'",
        "media-src": "'self' blob:",
        # Same-origin XHR/fetch/EventSource only. The frontend never talks to
        # Ollama directly — every call goes through this server — so there is
        # nothing else to allow.
        "connect-src": "'self'",
        "worker-src": "'self'",
        # <object>/<embed> have no use here and are a classic bypass.
        "object-src": "'none'",
        # Stops injected content re-pointing every relative URL on the page.
        "base-uri": "'self'",
        "form-action": "'self'",
        # Nothing may frame MemoryMap: clickjacking a notebook that is already
        # unlocked is the cheapest attack on it.
        "frame-ancestors": "'none'",
    }
    return "; ".join(f"{name} {value}" for name, value in directives.items())


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Attach the CSP and its neighbours to every response."""

    def __init__(self, app, csp: str) -> None:
        super().__init__(app)
        self._csp = csp

    async def dispatch(self, request, call_next):
        response = await call_next(request)
        headers = response.headers
        # setdefault, not assignment: a route that has deliberately set its own
        # policy knows something this middleware does not.
        headers.setdefault("Content-Security-Policy", self._csp)
        # Belt and braces with frame-ancestors above, for anything that reads
        # the older header instead.
        headers.setdefault("X-Frame-Options", "DENY")
        # Stops a note attachment being sniffed into text/html and run as a
        # page on this origin — same-origin, so it would inherit everything.
        headers.setdefault("X-Content-Type-Options", "nosniff")
        # Never leak a notebook's URLs to a third party.
        headers.setdefault("Referrer-Policy", "no-referrer")
        # This app needs none of these, and saying so stops an injected iframe
        # or script asking the user for them in MemoryMap's name.
        headers.setdefault(
            "Permissions-Policy", "geolocation=(), camera=(), payment=(), usb=()"
        )
        return response


# --- where the AI backend is allowed to live --------------------------------
#
# The chat backend's address is a *setting* now (§6), not a constant, and the
# server posts the user's notes to whatever it names on every turn. That makes
# it a new outbound surface, and it needs a different rule from the web-search
# one above.
#
# The web reader refuses anything that ISN'T public, because it follows
# untrusted links and must never probe this machine. This is the mirror image:
# a backend is *supposed* to be on localhost or the LAN — that is the whole
# product — so private addresses are the normal case and blocking them would
# break it.
#
# What is refused is the narrow set nobody ever serves a model from, where
# being pointed at one is a sign of a mistake or of something worse:
#
#   - a scheme that isn't http(s), so `file://` can't be read back by a
#     library that helpfully supports it;
#   - link-local (169.254.0.0/16, fe80::/10), which on every major cloud is
#     the instance-metadata address — the classic credential-theft target,
#     and never a model server;
#   - multicast, reserved and unspecified addresses, which are not endpoints.
#
# Anything else is allowed and *reported* rather than blocked. Someone who
# deliberately points this at a hosted API is entitled to; what they are not
# entitled to is for it to happen quietly, because the app's headline promise
# is that notes stay on the machine. `is_local` is what the UI warns from.

import ipaddress  # noqa: E402 — grouped with the code it serves
import socket  # noqa: E402
from concurrent.futures import ThreadPoolExecutor  # noqa: E402
from concurrent.futures import TimeoutError as FuturesTimeout  # noqa: E402

_ALLOWED_BACKEND_SCHEMES = ("http", "https")


#: How long to wait for DNS before giving up on judging a hostname.
#:
#: `socket.getaddrinfo` takes **no timeout argument** and ignores
#: `socket.setdefaulttimeout`, so a slow or unreachable resolver blocks the
#: calling thread for however long the platform's resolver decides — tens of
#: seconds is normal. This function runs on a request thread (saving a backend
#: address) and on startup (building the client), so an unbounded wait there is
#: the app hanging, not a slow answer.
_DNS_TIMEOUT_SECONDS = 2.0


def _resolve(host: str) -> list:
    """`getaddrinfo`, or [] if it fails."""
    try:
        return [info[4][0] for info in socket.getaddrinfo(host, None)]
    except (socket.gaierror, UnicodeError, OSError):
        return []


def _backend_addresses(host: str) -> list:
    """Every IP a backend hostname resolves to, or [] if it doesn't resolve.

    A name that doesn't resolve is not an error here: "set the address, then
    start the server" is the normal order, and a docker-compose service name
    resolves only once its container is up. An empty list means "can't judge",
    and the caller decides — under the lock that means refuse, without it that
    means allow-but-unverified.

    **Bounded, because `getaddrinfo` is not.** It takes no timeout and ignores
    `socket.setdefaulttimeout`, so it is run on a worker thread and abandoned
    after `_DNS_TIMEOUT_SECONDS`. A resolver that is slow or absent then reads
    as "couldn't judge" — which is the same answer as a name that doesn't
    exist, and the safe one — instead of holding the request open.
    """
    if not host:
        return []
    # A literal address needs no resolver at all — 127.0.0.1, a LAN IP.
    try:
        return [ipaddress.ip_address(host)]
    except ValueError:
        pass

    # Nor do the loopback *names*, and this is the hot path: `/models/status`
    # judges the backend address on every poll, and the backend is `localhost`
    # for almost everybody. Asking the resolver what `localhost` means, several
    # times a second, to be told what it means on every machine, is a round
    # trip for nothing — and on a host with a slow or misconfigured resolver it
    # is a round trip for nothing that takes seconds.
    if host.lower() in _LOOPBACK_HOSTS:
        return [ipaddress.ip_address("127.0.0.1")]

    with ThreadPoolExecutor(max_workers=1) as pool:
        try:
            raw = pool.submit(_resolve, host).result(timeout=_DNS_TIMEOUT_SECONDS)
        except FuturesTimeout:
            return []
    found = []
    for address in raw:
        try:
            found.append(ipaddress.ip_address(address))
        except ValueError:
            continue
    return found


def _refuses(address) -> str | None:
    """Why this address can't be a model backend, or None if it can be."""
    if isinstance(address, ipaddress.IPv6Address) and address.ipv4_mapped:
        # ::ffff:169.254.169.254 is the metadata address wearing a hat.
        address = address.ipv4_mapped
    # The order of these three blocks is load-bearing, because Python's
    # categories overlap in two places that would each flip an answer:
    #
    #   - 169.254.0.0/16 is link-local AND `is_private`, so an allow-private
    #     rule running first would wave through the cloud metadata address —
    #     the exact thing this function exists to stop.
    #   - `::1` is loopback AND `is_reserved`, so a refuse-reserved rule
    #     running first would reject the most ordinary backend there is.
    #
    # So: refuse the specific bad things, then allow local, then refuse the
    # leftovers.
    if address.is_link_local:
        return (
            f"{address} is a link-local address. On a cloud machine that is "
            "the instance-metadata service, not a model server."
        )
    if address.is_multicast or address.is_unspecified:
        return f"{address} isn't an address something can listen on."
    if address.is_loopback or address.is_private:
        return None
    if address.is_reserved:
        return f"{address} isn't an address something can listen on."
    return None


def check_backend_url(url: str, local_only: bool = False) -> tuple[bool, str, bool]:
    """Judge a model-backend address.

    Returns `(allowed, reason, is_local)`. `reason` is empty when there is
    nothing to say; `is_local` is False for a backend that would take the
    user's notes off this machine.

    `local_only` is the lock, and it is **on by default in the app** (the
    `local_only_ai` preference). With it on, a backend that is not on this
    machine or this network is *refused* rather than warned about — which is
    the honest reading of "100% offline, on your machine": a promise the app
    keeps, not one it reminds you that you are breaking.

    Turning it off is a deliberate act with a visible switch, and only then
    does the warning-not-refusal behaviour apply. The default direction
    matters more than the choice: someone who wants a hosted API will find the
    switch, and someone who does not will never be one typo away from sending
    their notebook to a stranger.
    """
    parts = urlsplit((url or "").strip())
    if parts.scheme not in _ALLOWED_BACKEND_SCHEMES:
        return (
            False,
            f"A model backend has to be an http:// or https:// address"
            f"{f' — “{parts.scheme}:” is not' if parts.scheme else ''}.",
            False,
        )
    host = (parts.hostname or "").strip()
    if not host:
        return False, "That address has no host in it.", False

    addresses = _backend_addresses(host)
    for address in addresses:
        refusal = _refuses(address)
        if refusal:
            return False, refusal, False

    if not addresses:
        # Unresolvable for now — "set the address, then start the server" is
        # the normal order. Treated as non-local, which is the safe direction:
        # under the lock an unverifiable name is refused rather than trusted,
        # and without it the honest warning is the one that shows.
        unresolved_local = host in _LOOPBACK_HOSTS
        if local_only and not unresolved_local:
            return False, _LOCKED_REASON.format(host=host), False
        return True, "", unresolved_local

    is_local = all(
        address.is_loopback or address.is_private for address in addresses
    )
    if is_local:
        return True, "", True
    if local_only:
        return False, _LOCKED_REASON.format(host=host), False
    return (
        True,
        "This backend is not on your machine or your local network. Your "
        "notes and questions will be sent to it over the internet.",
        False,
    )


_LOCKED_REASON = (
    "“{host}” is not on this machine or your local network, and MemoryMap is "
    "set to keep the AI local — so your notes are never sent anywhere. If you "
    "really do want to use a hosted API, turn off “Keep the AI on this "
    "machine” in Settings → Models first."
)
