"""Settings, About, Maintenance: the launcher's actions from inside the app.

The owner, 2026-10-11: "Can you add like buttons in settings to run them in
like the about page??" (doctor, reinstall, tools, uninstall). These tests
read the launchers as text and never run reinstall or uninstall; the
shortcut is written under a scratch home, never the real desktop.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from memorymap.api import routes_files, routes_maintenance
from memorymap.api.this_computer import REFUSAL
from memorymap.core import doctor, maintenance

ROOT = Path(__file__).resolve().parents[1]
START_SH = (ROOT / "start.sh").read_text(encoding="utf-8")
START_BAT = (ROOT / "start.bat").read_text(encoding="utf-8", errors="replace")
FAR = {"X-Forwarded-For": "192.168.0.50"}


def _shell_labels(text: str, pattern: str) -> set[str]:
    return {doctor.row_name(label.replace("$MM_PORT", "").replace("!MM_PORT!", "").strip())
            for label in re.findall(pattern, text)}


# --- one doctor, two spellings ----------------------------------------------


def test_the_app_doctor_and_the_shell_doctors_name_shared_rows_alike():
    sh = _shell_labels(START_SH, r'mm_row \w+ "([^"]+)"')
    bat = _shell_labels(START_BAT, r'call :row \w+ "([^"]+)"')
    for name in doctor.SHARED_ROWS:
        assert name in sh, f"start.sh's doctor has no {name} row"
        assert name in bat, f"start.bat's doctor has no {name} row"
    assert not set(doctor.APP_ROWS) & (sh | bat), "an app-only row is in the shell table: list it as shared"


def test_every_app_row_is_shared_or_app_only(client):
    rows = client.get("/system/doctor").json()["rows"]
    names = [doctor.row_name(row["label"]) for row in rows]
    assert set(names) <= set(doctor.SHARED_ROWS) | set(doctor.APP_ROWS), names
    for must in ("Python", "Disk", "Port", "Notes", "Last run", "Search model", "Other devices"):
        assert must in names
    assert {"Ollama", "Provider"} & set(names)
    for row in rows:
        assert row["status"] in {"ok", "warn", "x"} and row["value"]
        assert row["status"] != "ok" or row["fix"] == ""


def test_the_model_row_says_nothing_answered_with_the_fix(client):
    rows = {doctor.row_name(r["label"]): r for r in client.get("/system/doctor").json()["rows"]}
    model = rows.get("Ollama") or rows["Provider"]
    assert model["status"] == "warn" and "nothing answered" in model["value"] and model["fix"]


def test_low_disk_is_a_cross(tmp_path, monkeypatch):
    monkeypatch.setattr(doctor.diskspace, "free_bytes", lambda path: 200 * 1024 * 1024)
    row = doctor.disk_row(tmp_path)
    assert row["status"] == "x" and "Under 1 GB" in row["fix"]


def test_a_notes_folder_that_cannot_be_written_is_a_cross(tmp_path, monkeypatch):
    def refuse(*args, **kwargs):
        raise PermissionError("read-only")

    monkeypatch.setattr(doctor.tempfile, "NamedTemporaryFile", refuse)
    row = doctor.notes_row(tmp_path)
    assert row["status"] == "x" and "not writable" in row["value"]


def test_last_run_reads_the_newest_launcher_log_as_the_shell_does(tmp_path):
    assert doctor.last_run_row(tmp_path)["value"] == "no launcher log yet"
    logs = tmp_path / "logs"
    logs.mkdir()
    (logs / "launcher-2026-10-10.log").write_text("--- start\n  [x] Port 8000 in use\n", encoding="utf-8")
    row = doctor.last_run_row(tmp_path)
    assert row["status"] == "warn" and "Port 8000" in row["value"] and "launcher-2026-10-10.log" in row["fix"]


def test_other_devices_row_says_when_a_restart_is_owed():
    assert doctor.other_devices_row({"other_devices": False})["value"].startswith("off")
    owed = doctor.other_devices_row({"restart_required": True, "lan_on_next_launch": True})
    assert owed["status"] == "warn" and "Restart" in owed["fix"]
    on = doctor.other_devices_row({"other_devices": True, "addresses": ["https://192.168.0.2:8443"]})
    assert "192.168.0.2" in on["value"]


# --- reinstall on next start -------------------------------------------------


def _block_before(text: str, needle: str, anchor: str) -> None:
    at = text.index(needle)
    assert at < text.index(anchor), f"{needle!r} must come before {anchor!r}"


def test_start_sh_treats_the_marker_as_reinstall_once():
    marker = f'"$MM_DATA_DIR/{maintenance.REINSTALL_MARKER}"'
    assert f"if [ -f {marker} ]; then\n  MM_REINSTALL=1\n  rm -f {marker}\nfi" in START_SH
    _block_before(START_SH, marker, 'Removing .venv to rebuild it from scratch')
    #: After --doctor, --logs and --shortcut have exited: those never consume it.
    assert START_SH.index('if [ "$MM_ACTION" = "shortcut" ]') < START_SH.index(marker)


def test_start_bat_treats_the_marker_as_reinstall_once():
    marker = f'"!MM_DATA_DIR!\\{maintenance.REINSTALL_MARKER}"'
    block = START_BAT[START_BAT.index(f"if exist {marker} ("):]
    block = block[: block.index(")")]
    assert 'set "MM_REINSTALL=1"' in block and f"del /q {marker}" in block
    _block_before(START_BAT, f"if exist {marker}", 'if "!MM_REINSTALL!"=="1" if exist ".venv"')
    assert START_BAT.index('if /i "!MM_ACTION!"=="shortcut" goto :do_shortcut') < START_BAT.index(marker)


def test_reinstall_on_start_writes_and_takes_back_the_marker(client, app_state):
    marker = app_state.data_dir / maintenance.REINSTALL_MARKER
    turned_on = client.post("/system/reinstall-on-start", json={"enabled": True}).json()
    assert turned_on == {"reinstall_pending": True} and marker.is_file()
    state = client.get("/system/maintenance").json()
    assert state["reinstall_pending"] is True
    turned_off = client.post("/system/reinstall-on-start", json={"enabled": False}).json()
    assert turned_off == {"reinstall_pending": False} and not marker.exists()


def test_the_packaged_app_has_nothing_to_reinstall(client, monkeypatch):
    monkeypatch.setattr(maintenance, "is_frozen", lambda: True)
    response = client.post("/system/reinstall-on-start", json={"enabled": True})
    assert response.status_code == 409 and "Repair" in response.json()["detail"]
    state = client.get("/system/maintenance").json()
    assert state["source"] is False


# --- logs, shortcut, uninstall -----------------------------------------------


def test_open_logs_folder_creates_and_opens_the_launcher_log_folder(client, app_state, monkeypatch):
    opened = []
    monkeypatch.setattr(routes_files.subprocess, "Popen", lambda args, **k: opened.append(args))
    monkeypatch.setattr(routes_files.sys, "platform", "linux")
    response = client.post("/system/open-logs-folder")
    assert response.status_code == 200
    logs = app_state.data_dir / "logs"
    assert response.json()["path"] == str(logs) and logs.is_dir() and opened == [["xdg-open", str(logs)]]


def _shell_entry_lines() -> list[str]:
    body = START_SH[START_SH.index("mm_shortcut() {"): START_SH.index('if [ "$MM_ACTION" = "shortcut" ]')]
    return re.findall(r'echo "((?:\[Desktop Entry\]|[A-Z][A-Za-z]*=).*)"', body)


def test_the_linux_shortcut_is_the_launchers_entry_at_the_launchers_path(tmp_path):
    home = tmp_path / "home"
    (home / "Desktop").mkdir(parents=True)
    root = Path("/opt/checkout")
    made = maintenance.make_shortcut(home=home, platform="linux", frozen=False, root=root)
    entry = home / ".local" / "share" / "applications" / maintenance.LINUX_ENTRY
    assert made["path"] == str(entry) and made["desktop_copy"] == str(home / "Desktop" / maintenance.LINUX_ENTRY)
    expected = [line.replace("$here", str(root)) for line in _shell_entry_lines()]
    assert len(expected) == 9 and entry.read_text(encoding="utf-8").splitlines() == expected
    assert "memorymap-ai.desktop" in (ROOT / "uninstall.sh").read_text(encoding="utf-8")


def test_the_mac_shortcut_links_start_sh_on_the_desktop(tmp_path):
    (tmp_path / "Desktop").mkdir()
    made = maintenance.make_shortcut(home=tmp_path, platform="darwin", frozen=False, root=Path("/opt/c"))
    link = tmp_path / "Desktop" / maintenance.MAC_LINK
    assert made["path"] == str(link) and link.is_symlink() and str(link.readlink()) == "/opt/c/start.sh"


def test_the_windows_shortcut_is_start_bats_own_powershell(tmp_path):
    calls = []

    def fake_run(args, **kwargs):
        calls.append(args)
        (tmp_path / maintenance.WINDOWS_LINK).write_text("lnk", encoding="utf-8")

    made = maintenance.make_shortcut(
        home=tmp_path, platform="win32", frozen=False, root=Path("C:/Users/O'Brien/mm"), desktop=tmp_path, run=fake_run
    )
    script = calls[0][-1]
    assert made["path"] == str(tmp_path / maintenance.WINDOWS_LINK)
    assert "O''Brien" in script and "start.bat'" in script and "$s.Arguments='--desktop'" in script
    assert "CreateShortcut" in START_BAT and maintenance.WINDOWS_LINK in START_BAT


def test_a_shortcut_that_was_not_made_says_so(tmp_path):
    with pytest.raises(maintenance.ShortcutError, match="not-made"):
        maintenance.make_shortcut(home=tmp_path, platform="win32", frozen=False, desktop=tmp_path,
                                  run=lambda *a, **k: None)


@pytest.mark.parametrize(
    ("platform", "frozen", "command"),
    [("linux", False, "./uninstall.sh"), ("darwin", False, "./uninstall.sh"), ("win32", False, "uninstall.bat"),
     ("win32", True, ""), ("darwin", True, "")],
)
def test_uninstall_is_steps_and_a_command_never_a_button(platform, frozen, command):
    plan = maintenance.uninstall_plan(platform=platform, frozen=frozen, root=Path("/opt/c"))
    assert plan["command"].endswith(command) if command else plan["command"] == ""
    assert plan["steps"][0].startswith("Export your notes first")
    assert not [r for r in routes_maintenance.router.routes if "uninstall" in r.path]


# --- this computer only ------------------------------------------------------


@pytest.mark.parametrize(
    ("method", "path", "body"),
    [("get", "/system/maintenance", None), ("get", "/system/doctor", None),
     ("post", "/system/reinstall-on-start", {"enabled": True}), ("post", "/system/open-logs-folder", None),
     ("post", "/system/desktop-shortcut", None)],
)
def test_another_device_is_refused_every_maintenance_route(client, app_state, method, path, body):
    #: Signed in, so the refusal under test is the route's own (a device with
    #: no password set is turned away by the sign-in check before it gets there).
    token = client.post("/auth/setup", json={"password": "first-pass-1"}).json()["token"]
    kwargs = {"headers": FAR | {"X-Auth-Token": token}} | ({"json": body} if body else {})
    response = getattr(client, method)(path, **kwargs)
    assert response.status_code == 403 and response.json()["detail"] == REFUSAL
    assert not (app_state.data_dir / maintenance.REINSTALL_MARKER).exists()


def test_the_shortcut_route_answers_with_a_sentence_never_an_exception(client, monkeypatch):
    def refuse(**kwargs):
        raise maintenance.ShortcutError("no-desktop")

    monkeypatch.setattr(maintenance, "make_shortcut", refuse)
    response = client.post("/system/desktop-shortcut")
    assert response.status_code == 500 and response.json()["detail"] == maintenance.SHORTCUT_REFUSALS["no-desktop"]

    def broken(**kwargs):
        raise PermissionError("/home/someone/.local: denied")

    monkeypatch.setattr(maintenance, "make_shortcut", broken)
    response = client.post("/system/desktop-shortcut")
    assert response.status_code == 500 and "/home/someone" not in response.json()["detail"]
