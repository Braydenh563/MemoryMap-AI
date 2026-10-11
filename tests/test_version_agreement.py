"""Every place the version string is shown or read agrees (owner order,
2026-10-11: no issues with the installer or the version before release).

The one literal that the code reads is `__version__` in
`src/memorymap/__init__.py`; `pyproject.toml` mirrors it for pip, the
workflows and the launchers read the `__init__.py` line, and the installer
takes it as `/DMyAppVersion`. This pins them to one number: if a release bumps
one and forgets another, the build is red here and not in a customer's About
page. The splash and the window title carry no version at all; that is
pinned too, so a hard-coded one cannot creep in and drift.
"""

from __future__ import annotations

import re
import tomllib
from pathlib import Path

from memorymap import __version__

ROOT = Path(__file__).resolve().parents[1]
VERSIONISH = re.compile(r"\b\d+\.\d+\.\d+\b")


def test_pyproject_and_the_package_say_the_same_version():
    meta = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    assert meta["project"]["version"] == __version__


def test_the_installer_and_release_read_the_package_line():
    """The PowerShell and sed patterns the workflows use find exactly one line
    in `__init__.py`, and it is `__version__`."""
    init = (ROOT / "src" / "memorymap" / "__init__.py").read_text(encoding="utf-8")
    powershell = re.findall(r'^__version__ = "([^"]+)"', init, re.MULTILINE)
    assert powershell == [__version__]
    for name in ("package-check.yml", "release.yml"):
        flow = (ROOT / ".github" / "workflows" / name).read_text(encoding="utf-8")
        assert "src\\memorymap\\__init__.py" in flow or "src/memorymap/__init__.py" in flow, name
    iss = (ROOT / "packaging" / "windows" / "installer.iss").read_text(encoding="utf-8")
    assert "{#MyAppVersion}" in iss and not re.search(r'#define\s+MyAppVersion\s+"', iss)


def test_every_stamped_page_url_carries_this_version():
    for page in ("index.html", "offline.html"):
        text = (ROOT / "frontend" / page).read_text(encoding="utf-8")
        stamps = set(re.findall(r"\?v=([0-9][^\"']*)", text))
        assert stamps == {__version__}, (page, stamps)


def test_about_and_the_capabilities_report_agree(client):
    assert client.get("/health").json()["version"] == __version__
    assert client.get("/capabilities").json()["version"] == __version__


def test_the_splash_and_the_window_title_do_not_hard_code_a_version():
    splash = (ROOT / "scripts" / "splash.ps1").read_text(encoding="utf-8")
    assert not VERSIONISH.search(splash)
    main = (ROOT / "src" / "memorymap" / "__main__.py").read_text(encoding="utf-8")
    for call in re.findall(r"create_window\(\s*([^\n]+)", main):
        assert not VERSIONISH.search(call), call
    # The window is titled by name only; if a version is ever added to it, it
    # must come from `__version__`, which this test would then need to know.
    assert '"MemoryMap AI"' in main
