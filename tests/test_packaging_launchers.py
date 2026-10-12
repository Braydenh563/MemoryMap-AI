"""The root launchers stay out of the packaged app (owner order, 2026-10-11).

`start.*`, `tools.*`, `doctor.*`, `reinstall.*` and `uninstall.*` rebuild a
`.venv`, which a frozen app does not have. The specs bundle named folders and
files only, and the installer copies the frozen folder and nothing else, so no
launcher reaches an installed copy. The packaged app's own repair is the
`--reinstall` flag on its exe (the Start Menu's Repair shortcut), and Settings,
About, Maintenance hides the script-backed reinstall there (its own tests, on
the aboutkit branch, hold that half).
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAUNCHERS = ("start", "start-desktop", "tools", "doctor", "reinstall", "uninstall")


def _datas(spec: Path) -> str:
    text = spec.read_text(encoding="utf-8")
    start = text.index("datas=[")
    return text[start : text.index("],", start)]


def test_neither_spec_bundles_a_launcher_script():
    for spec in (ROOT / "packaging" / "windows" / "tessellate.spec", ROOT / "packaging" / "linux" / "tessellate.spec"):
        block = _datas(spec)
        for name in LAUNCHERS:
            assert not re.search(rf"{name}\.(sh|bat)", block), (spec.name, name)
        assert not re.search(r"REPO_ROOT / \"(?!frontend|migrations|requirements|alembic|src)[A-Za-z_-]+\.(sh|bat)\"", block)


def test_the_installer_copies_only_the_frozen_folder():
    iss = (ROOT / "packaging" / "windows" / "installer.iss").read_text(encoding="utf-8")
    files = re.search(r"^\[Files\]\n(.*?)^\[", iss, re.M | re.S).group(1)
    sources = re.findall(r'^Source: "([^"]+)"', files, re.M)
    assert sources, files
    for source in sources:
        assert not re.search(r"\.(bat|sh)\b", source), source
        assert "dist" in source or source.startswith("{tmp}") or "install-extras" in source or "splash" in source, source


def test_the_packaged_repair_is_the_exe_flag_not_a_script():
    iss = (ROOT / "packaging" / "windows" / "installer.iss").read_text(encoding="utf-8")
    assert 'Parameters: "--desktop --reinstall"' in iss
    assert "reinstall.bat" not in iss and "tools.bat" not in iss and "doctor.bat" not in iss
