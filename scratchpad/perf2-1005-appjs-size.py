"""Served gzip size of app.js and the boot total, as tests/test_static_compression.py measures them.

    PYTHONPATH=src:. .venv/bin/python scratchpad/perf2-1005-appjs-size.py
"""

import os
import tempfile

os.environ["MEMORYMAP_DATA_DIR"] = tempfile.mkdtemp(prefix="perf2-1005-size-")

from fastapi.testclient import TestClient  # noqa: E402

from memorymap import __version__  # noqa: E402
from memorymap.api.app import create_app  # noqa: E402
from memorymap.core import deps  # noqa: E402
from tests._app_js import app_js_files  # noqa: E402

deps.init_app_state()
client = TestClient(create_app())
sizes = {}
for path in app_js_files():
    with client.stream("GET", f"/js/{path.name}?v={__version__}", headers={"Accept-Encoding": "gzip"}) as r:
        sizes[path.name] = len(b"".join(r.iter_raw()))
print("app.js", sizes["app.js"], "total", sum(sizes.values()), "largest", max(sizes.items(), key=lambda kv: kv[1]))
os._exit(0)
