"""Saving a generated file, for the shell that can't download one (§35E).

Reported as "I don't think any of the file save features in the whole
application work on the python desktop app", which was exactly right and true
of all of them at once. Every export built a Blob in the browser and clicked a
hidden `<a download>`; pywebview has no download handler, so the click is
swallowed and the user gets no file *and no error*.

The fix is available because this app already runs a local server: it can write
the file itself and say where it went. `POST /files/save` is that, and the
frontend picks it over a download when `/health` says it is being viewed
through the window rather than a browser tab — asked, not sniffed, because
pywebview's user agent is not reliably distinguishable and a wrong guess would
fail silently in the exact direction being fixed.

The filename arrives from the browser and is not trusted. The app is
single-user, but the AI writes some of these names, and "single-user" is not
the same as "every string reaching this route was chosen by the user".
"""

from __future__ import annotations

import base64
from pathlib import Path

import pytest

from memorymap.api.routes_files import EXPORTS_DIRNAME, safe_filename


def _save(client, filename: str, data: bytes):
    return client.post(
        "/files/save",
        json={"filename": filename, "content_base64": base64.b64encode(data).decode()},
    )


# --- the happy path ---------------------------------------------------------


def test_a_file_is_written_and_its_path_reported(client, app_state):
    """Where it went matters more here than in a browser: there is no
    downloads shelf to look at, so an unannounced file is a lost one."""
    response = _save(client, "chat.md", b"# Hello\n")
    assert response.status_code == 200
    body = response.json()
    written = Path(body["path"])
    assert written.read_bytes() == b"# Hello\n"
    assert written.parent.name == EXPORTS_DIRNAME
    assert body["bytes"] == 8


def test_binary_survives_the_round_trip(client, app_state):
    """A support bundle is a zip, not text — the route carries both, which is
    why the payload is base64 rather than a string."""
    blob = bytes(range(256))
    written = Path(_save(client, "bundle.zip", blob).json()["path"])
    assert written.read_bytes() == blob


def test_the_exports_folder_is_created_on_demand(client, app_state):
    """It only has to go missing once — a cleanup tool, a restore that didn't
    include an empty folder — for every export to fail with a traceback."""
    exports = app_state.data_dir / EXPORTS_DIRNAME
    assert not exports.exists()
    _save(client, "first.md", b"x")
    assert exports.is_dir()


def test_saving_twice_does_not_overwrite(client, app_state):
    """Two exports of the same chat on the same day are two files someone may
    want to compare. Silently replacing the first is data loss."""
    first = Path(_save(client, "chat.md", b"one").json()["path"])
    second = Path(_save(client, "chat.md", b"two").json()["path"])
    assert first != second
    assert first.read_bytes() == b"one"
    assert second.read_bytes() == b"two"


# --- the filename is not trusted --------------------------------------------


@pytest.mark.parametrize(
    "hostile",
    [
        "../../etc/passwd",
        "..\\..\\windows\\system32\\evil.dll",
        "/etc/passwd",
        "C:\\Windows\\evil.txt",
        "sub/dir/file.md",
    ],
)
def test_a_path_cannot_escape_the_exports_folder(client, app_state, hostile):
    response = _save(client, hostile, b"nope")
    assert response.status_code == 200  # recovered, not refused
    written = Path(response.json()["path"])
    assert written.parent == (app_state.data_dir / EXPORTS_DIRNAME)
    assert ".." not in written.parts


def test_a_name_that_is_only_punctuation_is_refused(client, app_state):
    """Nothing usable is left after cleaning, and inventing a name would hide
    the fact that something upstream is wrong."""
    assert _save(client, "...", b"x").status_code == 422


def test_safe_filename_keeps_readable_names_readable():
    """Sanitising is not an excuse to mangle. "memorymap-export.json" has to
    come out the other side unchanged, or every saved file is unrecognisable."""
    assert safe_filename("memorymap-export.json") == "memorymap-export.json"
    assert safe_filename("My Chat 2026.md") == "My Chat 2026.md"


def test_unreadable_base64_is_refused(client, app_state):
    response = client.post(
        "/files/save", json={"filename": "x.md", "content_base64": "not base64!!"}
    )
    assert response.status_code == 422


# --- how the frontend chooses its path --------------------------------------


def test_health_says_whether_this_is_the_desktop_window(client, monkeypatch):
    """The frontend asks rather than sniffing the user agent, so this field is
    the whole mechanism for picking server-save over a download."""
    assert client.get("/health").json()["desktop"] is False
    monkeypatch.setenv("MEMORYMAP_DESKTOP", "1")
    assert client.get("/health").json()["desktop"] is True
