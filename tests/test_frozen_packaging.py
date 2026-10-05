"""What the frozen Windows build carries and how it reads it, checked on any
machine.

The packaged app is built and smoked on a real Windows runner only in CI
(`.github/workflows/package-check.yml`). These are the parts of that build
that can be proven from the source tree: the files the spec bundles, the
modules it must name because nothing imports them by name, and the files
the bundle reads in whatever encoding the person's Windows happens to use.
"""

from __future__ import annotations

import ast
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_alembic_ini_is_plain_ascii():
    """Alembic reads `alembic.ini` with `configparser` in the locale's
    encoding, not UTF-8. One em dash in a comment (e2 80 94) is not valid
    cp932, cp936 or cp949, so on a Japanese, Chinese or Korean Windows, and
    in the frozen app under a C locale (measured on the Linux build of the
    Windows spec: `UnicodeDecodeError: 'ascii' codec can't decode byte
    0xe2`), `_ensure_alembic_baseline` failed before any migration ran and
    the database was never stamped or upgraded."""
    raw = (ROOT / "alembic.ini").read_bytes()
    bad = [i for i, byte in enumerate(raw) if byte > 0x7F]
    assert not bad, f"alembic.ini has non-ASCII bytes at {bad[:5]}"


SPECS = (
    ROOT / "packaging" / "windows" / "memorymap.spec",
    ROOT / "packaging" / "linux" / "memorymap.spec",
)


def _spec_app_modules(spec: Path) -> list[str]:
    """Run the spec's own `_app_modules` (and nothing else of the spec, which
    needs PyInstaller's globals) against this checkout."""
    tree = ast.parse(spec.read_text(encoding="utf-8"))
    found = [n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == "_app_modules"]
    assert found, f"{spec.name} has no _app_modules"
    namespace: dict = {"SRC_DIR": ROOT / "src"}
    exec(compile(ast.Module(body=found, type_ignores=[]), str(spec), "exec"), namespace)  # noqa: S102
    return namespace["_app_modules"]()


def _imported_by_name() -> set[str]:
    """Every `importlib.import_module("memorymap...")` with a literal name."""
    pattern = re.compile(r"""import_module\(\s*["'](memorymap(?:\.\w+)+)["']\s*\)""")
    names: set[str] = set()
    for path in (ROOT / "src" / "memorymap").rglob("*.py"):
        names.update(pattern.findall(path.read_text(encoding="utf-8")))
    return names


def test_both_specs_bundle_every_app_module():
    """PyInstaller does not follow `importlib.import_module("x")`. Measured on
    a build of the Windows spec before this list: 198 of 200 modules, and
    `memorymap.ai.needle_provider` (imported only by name, from
    `ai/tool_fallback.py`) was one of the two missing, so the needle extra
    raised ModuleNotFoundError on every packaged install."""
    # `routes_settings._desktop_entry` falls back to importing the entry
    # script by name only outside a packaged build (its docstring).
    by_name = _imported_by_name() - {"memorymap.__main__"}
    assert "memorymap.ai.needle_provider" in by_name
    for spec in SPECS:
        text = spec.read_text(encoding="utf-8")
        assert "*APP_MODULES," in text, f"{spec.name} does not hand APP_MODULES to hiddenimports"
        modules = set(_spec_app_modules(spec))
        missing = sorted(by_name - modules)
        assert not missing, f"{spec.name} misses {missing}"
        assert "memorymap.__main__" not in modules, "the entry script must not be bundled twice"
        assert {"memorymap", "memorymap.core.backup_bundle", "memorymap.core.ocr"} <= modules


def test_the_bootloader_splash_is_asked_for_only_when_the_bootloader_made_one(monkeypatch):
    """Importing `pyi_splash` in a build with no splash prints a traceback on
    its way to failing, and every packaged launch wrote it into the log."""
    import sys
    import types

    from memorymap import __main__ as launcher

    fake = types.ModuleType("pyi_splash")
    monkeypatch.setitem(sys.modules, "pyi_splash", fake)
    monkeypatch.delenv("_PYI_SPLASH_IPC", raising=False)
    without = launcher._bootloader_splash()
    assert without is None
    monkeypatch.setenv("_PYI_SPLASH_IPC", "1")
    with_ipc = launcher._bootloader_splash()
    assert with_ipc is fake



def test_a_packaged_build_writes_no_bytecode_beside_itself():
    """Alembic runs `migrations/` from the files beside the exe, and the
    frozen interpreter cached them in `_internal\\migrations\\__pycache__`,
    which no uninstall removed (measured on a build of the Windows spec)."""
    import os
    import subprocess
    import sys

    code = "import sys; sys.frozen = True; import memorymap.__main__; print(sys.dont_write_bytecode)"
    env = {**os.environ, "PYTHONPATH": str(ROOT / "src"), "PYTHONDONTWRITEBYTECODE": ""}
    env.pop("PYTHONDONTWRITEBYTECODE")
    done = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, env=env, timeout=120)  # noqa: S603
    lines = done.stdout.strip().splitlines()
    assert lines and lines[-1] == "True", (done.stdout, done.stderr[-2000:])


def test_both_specs_carry_the_standard_library_the_extras_import():
    """An extra installed after the build runs on the bundle's interpreter,
    which carried only the standard modules the app imports. Measured on a
    build of the Windows spec: `transformers` (search by meaning) imports
    `filecmp`, `pypdfium2` (scanned PDFs) `ctypes.util`, `lxml` `optparse`,
    `huggingface_hub` `venv`, and none was in the bundle. The whole standard
    library is named now, apart from Tk, the tests, pip's wheels and IDLE
    (about 3 MB more on that build)."""
    import sys

    for spec in SPECS:
        text = spec.read_text(encoding="utf-8")
        assert "*STDLIB_MODULES," in text, spec.name
        tree = ast.parse(text)
        wanted = [
            node for node in tree.body
            if (isinstance(node, ast.FunctionDef) and node.name == "_stdlib_modules")
            or (isinstance(node, ast.Assign) and any(getattr(t, "id", "") == "_STDLIB_SKIP" for t in node.targets))
        ]
        assert len(wanted) == 2, spec.name
        namespace: dict = {"sys": sys, "Path": Path}
        exec(compile(ast.Module(body=wanted, type_ignores=[]), str(spec), "exec"), namespace)  # noqa: S102
        modules = set(namespace["_stdlib_modules"]())
        for needed in ("filecmp", "ctypes.util", "optparse", "venv", "unittest.mock", "cProfile", "pstats"):
            assert needed in modules, (spec.name, needed)
        assert not {"tkinter", "idlelib", "test", "ensurepip"} & modules
        assert not [m for m in modules if ".test." in f"{m}." or ".tests." in f"{m}."]


def test_the_installer_reads_its_version_from_the_code():
    """No version number typed into installer.iss: it reads `__version__`
    from src/memorymap/__init__.py (and refuses a tag that differs)."""
    text = (ROOT / "packaging" / "windows" / "installer.iss").read_text(encoding="utf-8")
    assert re.search(r'#define\s+MyAppVersion\s+"\d', text) is None
    assert "src\\memorymap\\__init__.py" in text
    assert 'Pos("__version__ = ", VersionLine) == 1' in text
    init = (ROOT / "src" / "memorymap" / "__init__.py").read_text(encoding="utf-8")
    lines = [line for line in init.splitlines() if line.startswith("__version__ = ")]
    assert len(lines) == 1 and lines[0].count('"') == 2, lines


def _smoke():
    """packaging/frozen_smoke.py, the script CI runs against the frozen app."""
    import importlib.util

    spec = importlib.util.spec_from_file_location("frozen_smoke", ROOT / "packaging" / "frozen_smoke.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_the_lazy_bundles_are_read_from_app_js():
    """The smoke's asset list is parsed out of `LAZY_MODULES`, so a file that
    moves into a lazy bundle is fetched from the frozen server the next run.
    The table has to be found and full, or the smoke would check nothing."""
    smoke = _smoke()
    app_js = (ROOT / "frontend" / "js" / "app.js").read_text(encoding="utf-8")
    lazy = smoke.lazy_module_urls(app_js)
    assert len(lazy) >= 40, lazy
    for name in ("drag-edge.js", "companion-menu.js", "atlas-life.js", "atlas-motion.js",
                 "note-edit-panels.js", "chord-guide.js", "library.js"):
        assert f"/js/{name}" in lazy, name
    assert "/css/library-lazy.css" in lazy
    assert "/vendor/d3.v7.min.js" in lazy


def test_every_asset_the_smoke_fetches_is_a_file_with_a_pinned_type():
    """Cross-checks the derived list against the disk: a URL with no file is a
    lazy load that 404s in every build, and one whose extension has no entry
    in `STATIC_MIME_TYPES` would be typed by the Windows registry."""
    smoke = _smoke()
    types = smoke.static_mime_types()
    urls = smoke.asset_urls()
    missing = [url for url in urls if not (ROOT / "frontend" / url.lstrip("/")).is_file()]
    assert not missing, f"named in the frontend's code but not on disk: {missing}"
    untyped = [url for url in urls if smoke.expected_type(url, types) is None]
    assert not untyped, f"no pinned type for {untyped}"


def test_every_script_and_stylesheet_is_reached_by_something_the_smoke_reads():
    """A script no page and no loader names is either dead or loaded in a way
    the smoke's parser cannot see, and then a frozen build missing it would
    pass. Either way the parser (or the file) needs a look."""
    smoke = _smoke()
    html = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    reached = set(smoke.page_urls(html)) | set(smoke.asset_urls())
    on_disk = [f"/js/{p.name}" for p in (ROOT / "frontend" / "js").glob("*.js")]
    on_disk += [f"/css/{p.name}" for p in (ROOT / "frontend" / "css").glob("*.css")]
    unreached = sorted(url for url in on_disk if url not in reached)
    assert not unreached, f"nothing the smoke reads loads {unreached}"


def test_both_specs_ship_the_whole_frontend_tree():
    """One `(frontend, "frontend")` pair copies the folder recursively, the
    vendor files and the lazy bundles included; a per-file list would be the
    drift this replaces."""
    for spec in SPECS:
        text = spec.read_text(encoding="utf-8")
        assert '(str(FRONTEND_DIR), "frontend")' in text, spec
        assert 'FRONTEND_DIR = REPO_ROOT / "frontend"' in text, spec
    assert (ROOT / "frontend" / "vendor" / "harper" / "harper_wasm_slim_bg.wasm").is_file()


def test_the_smoke_knows_the_alembic_head():
    smoke = _smoke()
    head = smoke.alembic_head()
    assert re.fullmatch(r"[0-9a-f]{8,}", head)
