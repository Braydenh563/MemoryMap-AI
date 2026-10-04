"""A request the browser abandoned is not a server error, and no middleware
in the stack is `BaseHTTPMiddleware` (security.py, INBOX 472).

The traceback this file used to pin a workaround for ("Exception in ASGI
application ... No response returned." in the owner's Windows log on
2026-09-28, from a fetch aborted by a tab switch) came from that base class:
it is what raises when the app below it sends nothing. The two middlewares
that used it are pure ASGI now, which removes the cause rather than catching
it, and costs 0.3 to 0.8 ms less per request (scratchpad/asgi_bench.py: a
task group and a re-wrapped streaming response per request). So the rule is
that none comes back.
"""

from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware


def test_no_middleware_in_the_stack_is_base_http_middleware(client):
    app = client.app
    classes = [m.cls for m in app.user_middleware]
    offenders = [
        c.__name__ for c in classes if isinstance(c, type) and issubclass(c, BaseHTTPMiddleware)
    ]
    assert offenders == [], f"BaseHTTPMiddleware is back in the stack: {offenders}"


def test_a_cross_site_request_is_still_refused(client):
    response = client.get("/health", headers={"Origin": "https://evil.example"})
    assert response.status_code == 403
    assert "another site" in response.json()["detail"]
    # The refusal carries the security headers too: they are the outer layer.
    assert response.headers["x-frame-options"] == "DENY"


def test_every_response_carries_the_security_headers(client):
    response = client.get("/health")
    assert response.status_code == 200
    for name in (
        "content-security-policy",
        "x-frame-options",
        "x-content-type-options",
        "referrer-policy",
        "permissions-policy",
    ):
        assert name in response.headers, name
