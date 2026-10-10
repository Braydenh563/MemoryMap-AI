"""Docker support (Brief 40): the environment handling in the launcher."""

import asyncio

from memorymap.core import first_password, netbind


def test_bind_defaults_to_loopback_and_survives_junk():
    assert netbind.env_bind("") == "127.0.0.1"
    assert netbind.env_bind("localhost") == "127.0.0.1"
    assert netbind.env_bind("not a host") == "127.0.0.1"
    assert netbind.env_bind("0.0.0.0") == "0.0.0.0"
    assert netbind.env_bind(" [::] ") == "::"


def test_first_password_is_taken_once_and_blank_is_none(monkeypatch):
    monkeypatch.setenv(first_password.ENV, "  ")
    assert first_password.take_from_env() is None
    monkeypatch.setenv(first_password.ENV, "a long enough secret")
    assert first_password.take_from_env() == "a long enough secret"
    import os

    assert first_password.ENV not in os.environ  # not inherited by children


def test_seed_only_when_no_password_and_never_logs_it(tmp_path, monkeypatch, caplog):
    from memorymap.core.database import DatabaseManager, User

    db = DatabaseManager(tmp_path / "m.db")
    secret = "correct horse battery"
    assert first_password.seed(db, None) == "none"
    assert first_password.seed(db, "short") == "refused"
    assert first_password.seed(db, secret) == "seeded"
    assert first_password.seed(db, "another long secret") == "already-set"
    assert secret not in caplog.text
    with db.session() as session:
        assert session.query(User).count() == 1


def test_explicit_bind_skips_the_no_password_403_and_default_keeps_it(monkeypatch):
    from memorymap.core import security

    monkeypatch.setattr(security, "_notebook_has_password", lambda: False)
    monkeypatch.setattr(netbind, "_current", "0.0.0.0")

    async def call(explicit):
        netbind.set_explicit_bind(explicit)
        sent = []

        async def app(scope, receive, send):
            sent.append("app")

        async def send(message):
            sent.append(message.get("status"))

        mw = security.HostCheckMiddleware(app)
        scope = {"type": "http", "server": ("172.17.0.2", 8000), "headers": [(b"host", b"localhost:8000")]}
        await mw(scope, None, send)
        return sent

    try:
        assert 403 in asyncio.run(call(False))
        assert asyncio.run(call(True)) == ["app"]
    finally:
        netbind.set_explicit_bind(False)
