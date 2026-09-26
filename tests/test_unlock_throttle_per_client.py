"""The unlock throttle is per client, with a global backstop (§12, S2).

One global list meant five wrong tries from anyone locked the owner out for
up to five minutes: harmless on localhost, where every request is the owner,
and a denial of service the day another device can reach the port. Now each
client address earns its own waits, and the old global list stays as a
second layer with a far larger allowance, so many addresses guessing at once
still slow down together.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from memorymap.api import routes_auth


@pytest.fixture()
def app(client):
    return client.app


def _from(app, address: str) -> TestClient:
    return TestClient(app, client=(address, 50000))


@pytest.fixture(autouse=True)
def _clear():
    routes_auth._active_tokens.clear()
    routes_auth._failed_unlocks.clear()
    routes_auth._failed_by_client.clear()
    yield
    routes_auth._active_tokens.clear()
    routes_auth._failed_unlocks.clear()
    routes_auth._failed_by_client.clear()


def _setup(app):
    assert _from(app, "127.0.0.1").post("/auth/setup", json={"password": "the owner"}).status_code == 200


def test_one_clients_wrong_guesses_do_not_lock_out_another(app):
    _setup(app)
    guesser = _from(app, "192.168.1.50")
    for _ in range(routes_auth._FAILURE_ALLOWANCE + 1):
        guesser.post("/auth/unlock", json={"password": "wrong guess"})
    assert guesser.post("/auth/unlock", json={"password": "the owner"}).status_code == 429
    owner = _from(app, "127.0.0.1")
    assert owner.post("/auth/unlock", json={"password": "the owner"}).status_code == 200


def test_the_guesser_is_still_throttled_after_the_owner_unlocks(app):
    _setup(app)
    guesser = _from(app, "192.168.1.50")
    for _ in range(routes_auth._FAILURE_ALLOWANCE + 1):
        guesser.post("/auth/unlock", json={"password": "wrong guess"})
    _from(app, "127.0.0.1").post("/auth/unlock", json={"password": "the owner"})
    assert guesser.post("/auth/unlock", json={"password": "wrong again"}).status_code == 429


def test_many_addresses_guessing_together_hit_the_global_ceiling(app, monkeypatch):
    """Per-address buckets are what a botnet has plenty of, which is the
    reason the old code gave for having one bucket. So the one bucket stays,
    as the backstop, with a larger allowance."""
    monkeypatch.setattr(routes_auth, "_GLOBAL_FAILURE_ALLOWANCE", 12)
    _setup(app)
    codes = []
    for n in range(20):
        codes.append(_from(app, f"10.0.0.{n}").post("/auth/unlock", json={"password": "wrong"}).status_code)
    assert 429 in codes
    assert all(code == 401 for code in codes[:12])


def test_the_client_table_stays_bounded(app, monkeypatch):
    monkeypatch.setattr(routes_auth, "_MAX_TRACKED_CLIENTS", 5)
    monkeypatch.setattr(routes_auth, "_GLOBAL_FAILURE_ALLOWANCE", 1000)
    _setup(app)
    for n in range(12):
        _from(app, f"10.0.1.{n}").post("/auth/unlock", json={"password": "wrong"})
    assert len(routes_auth._failed_by_client) <= 5
