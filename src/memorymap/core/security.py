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
_INLINE_SCRIPT = re.compile(
    rb"<script(?![^>]*\ssrc=)[^>]*>(.*?)</script>", re.DOTALL | re.IGNORECASE
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
