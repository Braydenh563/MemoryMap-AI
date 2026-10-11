"""The code map lists routes on every router object, not only `router` and `app`."""

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _generator():
    spec = importlib.util.spec_from_file_location("codemap", ROOT / "scripts" / "codemap.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_routes_on_named_routers_are_mapped(tmp_path):
    api = tmp_path / "src" / "memorymap" / "api"
    api.mkdir(parents=True)
    (api / "x.py").write_text(
        "@media_router.get('/m')\ndef m(): ...\n"
        "@router.get('/r')\ndef r(): ...\n"
        "@other.get('/o')\ndef o(): ...\n",
        encoding="utf-8",
    )
    text = repr(_generator()._routes(tmp_path, {}))
    assert "/m" in text and "/r" in text
    assert "/o" not in text, "only routers and app, not any object with a get attribute"
