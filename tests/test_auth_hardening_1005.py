"""The password checks the security audit of 2026-10-05 found open.

- SEC-04: `/auth/change-password` and `/auth/rotate-vault-key` checked the
  password with no throttle, so a session started without one (sign-in off)
  could guess it at bcrypt speed, and a hit through change-password also
  locked the owner out. Both now share the unlock throttle.
- SEC-09: bcrypt 5 raises on more than 72 bytes, so a long passphrase was a
  500 at setup, unlock and change. Long ones are pre-hashed now.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from memorymap.api import routes_auth
from memorymap.core import vault

PASSWORD = "the owner's password"


@pytest.fixture(autouse=True)
def _clean():
    routes_auth._active_tokens.clear()
    routes_auth._media_tickets.clear()
    routes_auth._clear_unlock_failures()
    vault.close()
    yield
    routes_auth._active_tokens.clear()
    routes_auth._media_tickets.clear()
    routes_auth._clear_unlock_failures()
    vault.close()


def _local(client) -> TestClient:
    return TestClient(client.app, base_url="http://127.0.0.1:8795", client=("127.0.0.1", 50000))


def _signed_in_off(client) -> dict:
    """The repro's shape: sign-in off, a session that never gave the password."""
    local = _local(client)
    token = local.post("/auth/setup", json={"password": PASSWORD}).json()["token"]
    owner = {"X-Auth-Token": token}
    off = local.post("/auth/password-on-open", json={"enabled": False, "current_password": PASSWORD}, headers=owner)
    assert off.status_code == 200, off.text
    routes_auth._active_tokens.clear()
    vault.close()
    auto = local.post("/auth/auto-session").json()
    assert auto["vault_open"] is False
    return {"X-Auth-Token": auto["token"]}


@pytest.mark.parametrize(
    ("path", "body"),
    [
        ("/auth/change-password", lambda guess: {"current_password": guess, "new_password": "whatever1"}),
        ("/auth/rotate-vault-key", lambda guess: {"current_password": guess}),
    ],
)
def test_wrong_current_passwords_are_throttled_like_an_unlock(client, path, body):
    headers = _signed_in_off(client)
    local = _local(client)
    codes = [
        local.post(path, json=body(f"guess{i}"), headers=headers).status_code
        for i in range(routes_auth._FAILURE_ALLOWANCE + 2)
    ]
    assert codes[0] == 401
    assert 429 in codes, codes
    # And the guesses count against the same bucket an unlock reads.
    assert local.post("/auth/unlock-vault", json={"password": PASSWORD}, headers=headers).status_code == 429


def test_a_long_passphrase_sets_up_unlocks_and_changes(client):
    long_one = "correct horse battery staple " * 4  # 116 bytes
    local = _local(client)
    setup = local.post("/auth/setup", json={"password": long_one})
    assert setup.status_code == 200, setup.text
    routes_auth._active_tokens.clear()
    vault.close()
    assert local.post("/auth/unlock", json={"password": long_one[:-1] + "x"}).status_code == 401
    unlocked = local.post("/auth/unlock", json={"password": long_one})
    assert unlocked.status_code == 200, unlocked.text
    headers = {"X-Auth-Token": unlocked.json()["token"]}
    emoji = "\U0001F511" * 25  # 100 bytes in UTF-8
    changed = local.post("/auth/change-password", json={"current_password": long_one, "new_password": emoji}, headers=headers)
    assert changed.status_code == 200, changed.text
    routes_auth._active_tokens.clear()
    vault.close()
    assert local.post("/auth/unlock", json={"password": emoji}).status_code == 200


def test_a_password_of_up_to_72_bytes_keeps_the_plain_bcrypt_hash():
    """No migration: every hash made before this change was of a password of
    72 bytes or fewer (bcrypt 5 refused anything longer), and still verifies."""
    import bcrypt

    old = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt()).decode()
    assert routes_auth._password_matches(PASSWORD, old)
    assert not routes_auth._password_matches("not it", old)
    assert routes_auth._password_matches("x" * 72, routes_auth._hash_password("x" * 72))
    assert not routes_auth._password_matches("x" * 73, routes_auth._hash_password("x" * 72))


def test_an_absurd_password_is_refused_before_any_hashing(client):
    response = _local(client).post("/auth/unlock", json={"password": "a" * 5000})
    assert response.status_code == 422


# --- SEC-05: a rebinding page on loopback ---------------------------------------


def _rebinding(client) -> TestClient:
    """What a DNS-rebinding page's requests look like: they arrive on this
    computer's loopback address, but name the attacker's domain."""
    return TestClient(
        client.app,
        base_url="http://127.0.0.1:8795",
        client=("127.0.0.1", 50001),
        headers={"Host": "evil.example:8795", "Origin": "http://evil.example:8795"},
    )


def test_a_name_that_is_not_this_computer_is_refused_on_loopback_too(client):
    local = _local(client)
    local.post("/auth/setup", json={"password": PASSWORD})
    page = _rebinding(client)
    for _ in range(routes_auth._FAILURE_ALLOWANCE + 2):
        assert page.post("/auth/unlock", json={"password": "wrongwrong"}).status_code == 421
    # The owner's own bucket was never touched.
    assert local.post("/auth/unlock", json={"password": PASSWORD}).status_code == 200
    assert local.get("/health", headers={"Host": "localhost:8795"}).status_code == 200
    assert local.get("/health", headers={"Host": "[::1]:8795"}).status_code == 200


def test_lock_without_a_valid_session_closes_nothing(client):
    headers = _signed_in_off(client)
    local = _local(client)
    opened = local.post("/auth/unlock-vault", json={"password": PASSWORD}, headers=headers)
    assert opened.status_code == 200 and opened.json()["vault_open"] is True
    # A bodyless no-cors POST from any page: no token, and Origin null.
    stray = local.post("/auth/lock", headers={"Origin": "null", "Content-Type": "text/plain"})
    assert stray.status_code in (200, 403)
    assert local.post("/auth/lock").status_code == 200  # no token, from this computer
    assert local.get("/auth/account", headers=headers).json()["vault_open"] is True
    # The owner's own lock still locks.
    assert local.post("/auth/lock", headers=headers).json()["locked"] is True


def _asgi_post(app, path: str, chunks: list[bytes], headers: list[tuple[bytes, bytes]]) -> tuple[int | None, int]:
    """Drive one POST through the ASGI app by hand, so the body can arrive
    chunked with no Content-Length. Returns (status, bytes the app pulled)."""
    import asyncio

    pulled = 0
    queue = list(chunks)

    async def receive():
        nonlocal pulled
        if not queue:
            return {"type": "http.disconnect"}
        chunk = queue.pop(0)
        pulled += len(chunk)
        return {"type": "http.request", "body": chunk, "more_body": bool(queue)}

    sent = []

    async def send(message):
        sent.append(message)

    scope = {
        "type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1", "method": "POST",
        "scheme": "http", "path": path, "raw_path": path.encode(), "query_string": b"",
        "root_path": "", "headers": [(b"host", b"127.0.0.1:8795"), *headers],
        "client": ("127.0.0.1", 50002), "server": ("127.0.0.1", 8795),
    }
    asyncio.run(app(scope, receive, send))
    status = next((m["status"] for m in sent if m["type"] == "http.response.start"), None)
    return status, pulled


def test_a_huge_body_before_sign_in_is_refused_unread(client):
    """SEC-06: one unauthenticated 300 MB unlock cost about 800 MB of RAM."""
    local = _local(client)
    local.post("/auth/setup", json={"password": PASSWORD})
    big = b'{"password": "' + b"a" * (2 * 1024 * 1024) + b'"}'
    assert local.post("/auth/unlock", content=big, headers={"content-type": "application/json"}).status_code == 413
    # Declared: refused before a byte is read.
    status, pulled = _asgi_post(
        client.app, "/auth/unlock", [big],
        [(b"content-type", b"application/json"), (b"content-length", str(len(big)).encode())],
    )
    assert (status, pulled) == (413, 0)
    # Chunked, nothing declared: cut off once past the cap, not read to the end.
    chunks = [b'{"password": "'] + [b"a" * 65536] * 64 + [b'"}']
    status, pulled = _asgi_post(client.app, "/auth/unlock", chunks, [(b"content-type", b"application/json")])
    assert status == 413 and pulled < 2 * 1024 * 1024
    # A data route without a session is held to the same small cap.
    status, _ = _asgi_post(
        client.app, "/entries", [big],
        [(b"content-type", b"application/json"), (b"content-length", str(len(big)).encode())],
    )
    assert status == 413


def test_a_signed_in_upload_keeps_its_room(client):
    local = _local(client)
    token = local.post("/auth/setup", json={"password": PASSWORD}).json()["token"]
    headers = {"X-Auth-Token": token}
    entry = local.post("/entries", json={"content": "with an attachment"}, headers=headers).json()
    upload = local.post(
        f"/entries/{entry['id']}/files",
        files={"file": ("big.txt", b"x" * (3 * 1024 * 1024), "text/plain")},
        headers=headers,
    )
    assert upload.status_code in (200, 201), upload.text


def test_a_restore_across_a_key_rotation_strands_nothing(client):
    """SEC-07: a backup from before a vault-key rotation, restored, left the
    post-rotation key in memory: the restored private notes read as "couldn't
    be decrypted", and a private note written before the next restart was
    lost for good. A restore now ends every session and closes the vault."""
    local = _local(client)
    token = local.post("/auth/setup", json={"password": PASSWORD}).json()["token"]
    headers = {"X-Auth-Token": token}
    first = local.post("/entries", json={"content": "alpha secret"}, headers=headers).json()["id"]
    assert local.post(f"/entries/{first}/privacy", json={"private": True}, headers=headers).status_code == 200
    name = local.post("/backups", headers=headers).json()["name"]
    rotated = local.post("/auth/rotate-vault-key", json={"current_password": PASSWORD}, headers=headers)
    assert rotated.status_code == 200, rotated.text
    headers = {"X-Auth-Token": rotated.json()["token"]}

    restored = local.post("/backups/restore", json={"name": name}, headers=headers)
    assert restored.status_code == 200, restored.text
    assert restored.json()["signed_out"] is True
    assert local.get("/entries?limit=5", headers=headers).status_code == 401

    headers = {"X-Auth-Token": local.post("/auth/unlock", json={"password": PASSWORD}).json()["token"]}
    assert local.get(f"/entries/{first}", headers=headers).json()["content"] == "alpha secret"
    later = local.post("/entries", json={"content": "gamma secret"}, headers=headers).json()["id"]
    assert local.post(f"/entries/{later}/privacy", json={"private": True}, headers=headers).status_code == 200

    # A restart: no sessions, no key in memory; the password opens both.
    routes_auth._active_tokens.clear()
    vault.close()
    headers = {"X-Auth-Token": local.post("/auth/unlock", json={"password": PASSWORD}).json()["token"]}
    assert local.get(f"/entries/{first}", headers=headers).json()["content"] == "alpha secret"
    assert local.get(f"/entries/{later}", headers=headers).json()["content"] == "gamma secret"


def test_an_attachment_is_never_served_as_script(client):
    """SEC-11: `/files/{id}` served the type the uploader declared, so a
    `.js` attachment came back as text/javascript, which `script-src 'self'`
    would run from a `<script src>` (Content-Disposition does not stop that)."""
    local = _local(client)
    headers = {"X-Auth-Token": local.post("/auth/setup", json={"password": PASSWORD}).json()["token"]}
    entry = local.post("/entries", json={"content": "files"}, headers=headers).json()["id"]
    local.post(f"/entries/{entry}/files", files={"file": ("x.js", b"alert(1)", "text/javascript")}, headers=headers)
    local.post(f"/entries/{entry}/files", files={"file": ("x.html", b"<b>hi</b>", "text/html")}, headers=headers)
    local.post(f"/entries/{entry}/files", files={"file": ("p.png", b"\x89PNG\r\n\x1a\n", "image/png")}, headers=headers)
    files = local.get(f"/entries/{entry}", headers=headers).json()["attachments"]
    served = {f["filename"]: local.get(f"/files/{f['id']}", headers=headers) for f in files}
    assert set(served) >= {"x.js", "x.html", "p.png"}, list(served)
    for name in ("x.js", "x.html"):
        assert served[name].headers["content-type"].startswith("application/octet-stream"), name
    assert served["p.png"].headers["content-type"].startswith("image/png")
    for response in served.values():
        assert "sandbox" in response.headers["content-security-policy"]
        assert response.headers["cross-origin-resource-policy"] == "same-origin"


def test_a_password_in_the_model_address_never_reaches_the_bundle_or_receipt(client, app_state):
    """SEC-12: `http://bob:hunter2pw@host/v1` went into the support bundle as is."""
    import io
    import zipfile

    local = _local(client)
    headers = {"X-Auth-Token": local.post("/auth/setup", json={"password": PASSWORD}).json()["token"]}
    app_state.set_preference("llm_provider", "openai")
    app_state.set_preference("llm_base_url", "http://bob:hunter2pw@127.0.0.1:9/v1")
    bundle = local.get("/support-bundle", headers=headers)
    assert bundle.status_code == 200
    with zipfile.ZipFile(io.BytesIO(bundle.content)) as zf:
        text = zf.read("preferences.json").decode()
    assert "hunter2pw" not in text and "127.0.0.1:9/v1" in text
    receipt = local.get("/privacy/receipt", headers=headers).text
    assert "hunter2pw" not in receipt


@pytest.mark.skipif(__import__("os").name != "posix", reason="Unix permissions")
def test_the_notebook_folder_is_private_to_its_owner(tmp_path):
    """SEC-13: the data dir was 0755 and the database 0644, readable by every
    account on a shared Unix machine. A folder that is (or is becoming) a
    notebook is made 0700, which closes everything inside it."""
    import stat

    from memorymap.core.config import ConfigManager

    fresh = tmp_path / "new-notebook"
    ConfigManager(fresh)
    assert stat.S_IMODE(fresh.stat().st_mode) == 0o700
    existing = tmp_path / "old-notebook"
    existing.mkdir(mode=0o755)
    (existing / "memorymap.db").write_bytes(b"")
    existing.chmod(0o755)
    ConfigManager(existing)
    assert stat.S_IMODE(existing.stat().st_mode) == 0o700
    # A folder that is something else (a home directory someone pointed the
    # app at) is not the app's to change.
    other = tmp_path / "somebody-else"
    other.mkdir()
    (other / "unrelated.txt").write_text("x")
    other.chmod(0o755)
    ConfigManager(other)
    assert stat.S_IMODE(other.stat().st_mode) == 0o755


def test_a_note_source_is_a_web_address_or_nothing(client):
    """SEC-15: `POST /entries` took any `source_url`, and the card opens it."""
    assert client.post("/entries", json={"content": "x", "source_url": "javascript:alert(1)"}).status_code == 422
    assert client.post("/entries", json={"content": "x", "source_url": "https://example.org/a"}).status_code == 201


def test_every_url_sink_the_audit_named_goes_through_safe_href():
    from pathlib import Path

    root = Path(__file__).resolve().parents[1] / "frontend" / "js"
    for name, needle in (
        ("note-cards.js", "window.open(safeHref(entry.source_url)"),
        ("chat-agent.js", "card.href = safeHref(source.url)"),
        ("palette.js", "row.href = safeHref(source.url)"),
        ("markdown.js", "card.href = safeHref(url)"),
        ("menus.js", "window.open(safeHref(mark.url)"),
    ):
        assert needle in (root / name).read_text(encoding="utf-8"), name


def test_the_json_export_says_which_notes_are_private(client, session):
    """SEC-14 (part): the export decrypts, and said nothing about it."""
    vault.create(session, "test-passphrase")
    session.commit()
    mine = client.post("/entries", json={"content": "kept close"}).json()["id"]
    client.post("/entries", json={"content": "ordinary"})
    client.post(f"/entries/{mine}/privacy", json={"private": True})
    rows = client.get("/export/json").json()["entries"]
    flags = {row["content"]: row["is_private"] for row in rows}
    assert flags == {"kept close": True, "ordinary": False}


def test_origin_null_is_cross_site_for_the_auth_routes(client):
    local = _local(client)
    refused = local.post("/auth/setup", json={"password": PASSWORD}, headers={"Origin": "null"})
    assert refused.status_code == 403
    assert local.get("/auth/status").json()["setup_required"] is True
