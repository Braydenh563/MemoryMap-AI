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
