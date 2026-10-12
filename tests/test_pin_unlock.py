"""The PIN quick unlock (owner, 2026-10-12): this computer only, five
strikes, and nothing a stolen notebook or backup could carry.

The OS store is faked behind `pinstore.Store`; the one real round trip, the
Linux Secret Service, runs only where `secret-tool` and a keyring answer.
"""

from __future__ import annotations

import base64
import json

import pytest
from fastapi.testclient import TestClient

from tessellate.api import routes_auth
from tessellate.core import deps, pinstore, vault

PASSWORD = "the owner's password"
NEW_PASSWORD = "a brand new passphrase"
PIN = "482613"
SECRET = "the spare key is under the mat"


class FakeStore(pinstore.Store):
    name = "fake"

    def __init__(self, ok: bool = True) -> None:
        self.ok = ok
        self.items: dict[str, str] = {}

    def available(self) -> bool:
        return self.ok

    def put(self, account: str, secret: str) -> None:
        self.items[account] = secret

    def get(self, account: str) -> str | None:
        return self.items.get(account)

    def delete(self, account: str) -> None:
        self.items.pop(account, None)


@pytest.fixture()
def fake():
    store = FakeStore()
    pinstore.set_store(store)
    yield store
    pinstore.set_store(None)


@pytest.fixture(autouse=True)
def _clean(client):
    from tessellate.core import lantrust

    routes_auth._active_tokens.clear()
    routes_auth._media_tickets.clear()
    routes_auth._clear_unlock_failures()
    vault.close()
    lantrust.set_flag(deps.get_config().data_dir, "ask_new_devices", False)
    yield
    lantrust.reset_for_tests()
    routes_auth._active_tokens.clear()
    routes_auth._media_tickets.clear()
    routes_auth._clear_unlock_failures()
    vault.close()


def _local(client) -> TestClient:
    return TestClient(client.app, base_url="http://127.0.0.1:8795", client=("127.0.0.1", 50000))


def _lan(client) -> TestClient:
    return TestClient(client.app, base_url="http://192.168.1.10:8795", client=("192.168.1.20", 50000))


def _auth(token: str) -> dict:
    return {"X-Auth-Token": token}


def _restart() -> None:
    routes_auth._active_tokens.clear()
    routes_auth._media_tickets.clear()
    vault.close()


def _notebook(client) -> tuple[TestClient, str, int]:
    local = _local(client)
    token = local.post("/auth/setup", json={"password": PASSWORD}).json()["token"]
    entry = local.post("/entries", json={"content": SECRET}, headers=_auth(token)).json()
    made = local.post(f"/entries/{entry['id']}/privacy", json={"private": True}, headers=_auth(token))
    assert made.status_code == 200, made.text
    return local, token, entry["id"]


def _set_pin(local, token, pin=PIN, password=PASSWORD):
    return local.post("/auth/pin", json={"current_password": password, "pin": pin}, headers=_auth(token))


def _with_pin(client) -> tuple[TestClient, int]:
    local, token, note = _notebook(client)
    answer = _set_pin(local, token)
    assert answer.status_code == 200, answer.text
    _restart()
    return local, note


def _unlock(c, typed):
    return c.post("/auth/unlock", json={"password": typed})


# --- setting it up ------------------------------------------------------------


def test_status_says_whether_a_pin_unlocks_here_and_nothing_more(client, fake):
    local, token, _ = _notebook(client)
    assert local.get("/auth/status").json()["pin_here"] is False
    assert _set_pin(local, token).status_code == 200
    assert local.get("/auth/status").json()["pin_here"] is True
    lan = _lan(client).get("/auth/status").json()
    assert lan["pin_here"] is False


def test_setting_a_pin_needs_the_password(client, fake):
    local, token, _ = _notebook(client)
    assert _set_pin(local, token, password="not it at all").status_code == 401
    assert fake.items == {}


@pytest.mark.parametrize("pin", ["123", "1234567890123", "12a4", " 1234", "１２３４"])
def test_a_pin_is_4_to_12_ascii_digits(client, fake, pin):
    local, token, _ = _notebook(client)
    assert _set_pin(local, token, pin=pin).status_code in (400, 422)
    assert fake.items == {}


def test_a_pin_is_set_only_on_this_computer(client, fake):
    local, token, _ = _notebook(client)
    lan_token = _unlock(_lan(client), PASSWORD).json()["token"]
    answer = _set_pin(_lan(client), lan_token)
    assert answer.status_code == 403
    assert fake.items == {}


def test_no_protected_store_means_no_pin_and_no_file_fallback(client, fake):
    fake.ok = False
    local, token, _ = _notebook(client)
    answer = _set_pin(local, token)
    assert answer.status_code == 409
    assert "protected" in answer.json()["detail"]
    account = local.get("/auth/account", headers=_auth(token)).json()
    assert account["pin"] == {"available": False, "set": False, "here": True}


# --- unlocking with it ----------------------------------------------------------


def test_the_pin_opens_the_same_vault_on_this_computer(client, fake):
    local, note = _with_pin(client)
    answer = _unlock(local, PIN)
    assert answer.status_code == 200, answer.text
    assert answer.json()["vault_open"] is True
    token = answer.json()["token"]
    assert local.get(f"/entries/{note}", headers=_auth(token)).json()["content"] == SECRET


def test_the_password_still_unlocks_with_a_pin_set(client, fake):
    local, _ = _with_pin(client)
    assert _unlock(local, PASSWORD).status_code == 200


def test_a_lan_request_with_the_right_pin_is_refused_and_costs_no_strike(client, fake):
    local, _ = _with_pin(client)
    for _ in range(6):
        answer = _unlock(_lan(client), PIN)
        assert answer.status_code in (401, 429)
        routes_auth._clear_unlock_failures()
    assert _unlock(local, PIN).status_code == 200


def test_a_forwarded_loopback_request_is_not_this_computer(client, fake):
    local, _ = _with_pin(client)
    answer = local.post("/auth/unlock", json={"password": PIN}, headers={"X-Forwarded-For": "8.8.8.8"})
    assert answer.status_code == 401


def test_five_wrong_pins_delete_it_and_the_password_is_needed(client, fake):
    local, _ = _with_pin(client)
    for n in range(4):
        answer = _unlock(local, "000000")
        assert answer.status_code == 401, n
        routes_auth._clear_unlock_failures()  # the per-address waits are not under test
    last = _unlock(local, "000000")
    assert last.status_code == 401
    assert "password" in last.json()["detail"].lower()
    assert fake.items == {}
    routes_auth._clear_unlock_failures()
    assert _unlock(local, PIN).status_code == 401
    assert local.get("/auth/status").json()["pin_here"] is False
    assert _unlock(local, PASSWORD).status_code == 200


def test_the_strike_count_survives_a_restart(client, fake):
    local, _ = _with_pin(client)
    for _ in range(4):
        _unlock(local, "999999")
        routes_auth._clear_unlock_failures()
    _restart()
    _unlock(local, "999999")
    assert fake.items == {}


def test_a_right_pin_resets_the_count(client, fake):
    local, _ = _with_pin(client)
    for _ in range(4):
        _unlock(local, "999999")
        routes_auth._clear_unlock_failures()
    assert _unlock(local, PIN).status_code == 200
    _restart()
    for _ in range(4):
        _unlock(local, "999999")
        routes_auth._clear_unlock_failures()
    assert fake.items, "four fresh strikes after a right PIN leave it in place"


# --- what it can never do -------------------------------------------------------


def test_the_pin_is_never_a_password_for_the_guarded_actions(client, fake):
    local, _ = _with_pin(client)
    token = _unlock(local, PIN).json()["token"]
    tries = [
        ("/auth/change-password", {"current_password": PIN, "new_password": NEW_PASSWORD}),
        ("/auth/lan-access", {"enabled": True, "current_password": PIN}),
        ("/auth/pin", {"current_password": PIN, "pin": "1111"}),
        ("/auth/pin/forget", {"current_password": PIN}),
        ("/auth/rotate-vault-key", {"current_password": PIN}),
    ]
    for path, body in tries:
        routes_auth._clear_unlock_failures()
        answer = local.post(path, json=body, headers=_auth(token))
        assert answer.status_code == 401, (path, answer.text)
    assert fake.items, "none of those touched the PIN"


def test_no_pin_material_in_the_database_data_dir_or_a_backup(client, fake):
    local, token, _ = _notebook(client)
    assert _set_pin(local, token).status_code == 200
    assert local.post("/backups", headers=_auth(token)).status_code == 201
    bundle = local.post("/backups/bundle", headers=_auth(token))
    (record,) = fake.items.values()
    fields = json.loads(base64.b64decode(record))
    needles = [record.encode(), PIN.encode()]
    for key in ("salt", "nonce", "ct"):
        needles += [fields[key].encode(), base64.b64decode(fields[key])]
    data_dir = deps.get_config().data_dir
    files = [p for p in data_dir.rglob("*") if p.is_file()]
    assert any(p.suffix == ".db" or "backup" in str(p) for p in files)
    for path in files:
        blob = path.read_bytes()
        for needle in needles[:1] + needles[2:]:
            assert needle not in blob, (path, needle[:12])
    if bundle.status_code == 200:
        for needle in needles[:1] + needles[2:]:
            assert needle not in bundle.content


def test_a_password_change_clears_the_pin(client, fake):
    local, _ = _with_pin(client)
    token = _unlock(local, PASSWORD).json()["token"]
    answer = local.post(
        "/auth/change-password",
        json={"current_password": PASSWORD, "new_password": NEW_PASSWORD},
        headers=_auth(token),
    )
    assert answer.status_code == 200, answer.text
    assert answer.json()["pin_cleared"] is True
    assert fake.items == {}
    _restart()
    assert _unlock(local, PIN).status_code == 401


def test_a_vault_re_key_clears_the_pin(client, fake):
    local, _ = _with_pin(client)
    token = _unlock(local, PASSWORD).json()["token"]
    answer = local.post("/auth/rotate-vault-key", json={"current_password": PASSWORD}, headers=_auth(token))
    assert answer.status_code == 200, answer.text
    assert fake.items == {}


def test_ending_every_session_for_a_restore_clears_the_pin(client, fake):
    _with_pin(client)
    routes_auth.end_every_session()
    assert fake.items == {}


def test_a_record_from_another_vault_opens_nothing(client, fake):
    """A record left behind (a restored backup's different vault row) is
    bound to the old one: the right PIN against it is a strike, not a key."""
    local, _ = _with_pin(client)
    session = deps.get_db().session()
    try:
        user = routes_auth._get_user(session)
        user.password_hash = routes_auth._hash_password("someone else's passphrase")
        session.commit()
    finally:
        session.close()
    assert _unlock(local, PIN).status_code == 401


def test_forget_pin_needs_the_password_and_removes_it(client, fake):
    local, token, _ = _notebook(client)
    _set_pin(local, token)
    assert local.post("/auth/pin/forget", json={"current_password": "wrong one"}, headers=_auth(token)).status_code == 401
    assert fake.items
    answer = local.post("/auth/pin/forget", json={"current_password": PASSWORD}, headers=_auth(token))
    assert answer.status_code == 200 and answer.json()["forgotten"] is True
    assert fake.items == {}
    assert local.get("/auth/status").json()["pin_here"] is False


def test_account_reports_the_pin_state(client, fake):
    local, token, _ = _notebook(client)
    _set_pin(local, token)
    pin = local.get("/auth/account", headers=_auth(token)).json()["pin"]
    assert pin == {"available": True, "set": True, "here": True}


def test_field_descriptions_no_longer_call_the_password_a_pin():
    for model in (routes_auth.PasswordBody, routes_auth.ChangePasswordBody):
        for field in model.model_fields.values():
            assert "4+ characters" not in (field.description or "")


# --- the real Linux store --------------------------------------------------------


def test_secret_service_round_trip(tmp_path):
    real = pinstore.SecretServiceStore()
    if not real.available():
        pytest.skip("no secret-tool with a running keyring here: the Linux path is not verified")
    pinstore.set_store(real)
    try:
        bound = b"x" * 32
        dek = b"k" * 32
        pinstore.save(tmp_path, "2468", dek, bound)
        assert pinstore.is_set(tmp_path)
        assert pinstore.unlock(tmp_path, "2468", bound) == ("ok", dek)
        assert pinstore.forget(tmp_path) is True
        assert not pinstore.is_set(tmp_path)
    finally:
        pinstore.forget(tmp_path)
        pinstore.set_store(None)
