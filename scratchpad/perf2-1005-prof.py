"""Profile one route function directly (cProfile cannot see TestClient's worker thread).

    PYTHONPATH=src .venv/bin/python scratchpad/perf2-1005-prof.py FIXTURE_DB "python expression"

The expression sees `s` (a session), `ids` (60 note ids) and `routes_*`
modules imported by name, e.g.
    "routes_entries.entry_reference_counts(ids=','.join(map(str, ids)), session=s)"
"""

import importlib
import os
import shutil
import sys
import tempfile
import time
import cProfile
import pstats
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scratchpad"))
tmp = Path(tempfile.mkdtemp(prefix="perf2-1005-"))
data = tmp / "data"
data.mkdir()
shutil.copy(sys.argv[1], data / "memorymap.db")
os.environ["MEMORYMAP_DATA_DIR"] = str(data)
bench = importlib.import_module("perf2-1005-bench")
from memorymap.core import deps  # noqa: E402
from tests.fakes import FakeOllama  # noqa: E402
from memorymap.ai.embeddings import EmbeddingService  # noqa: E402


class HashEmbedder(EmbeddingService):
    def __init__(self):
        super().__init__(model_manager=None, ollama_client=None)

    def backend_id(self):
        return "bench:hash"

    def active_model(self):
        return "bench-hash"

    def is_ready(self):
        return True

    def embed_text(self, text):
        return bench._hash_vector(text)


deps.init_app_state(data_dir=data)
deps.override_ai(ollama=FakeOllama(running=False), embeddings=HashEmbedder())
from memorymap.api.app import create_app  # noqa: E402

create_app()
ns = {}
for name in os.listdir(ROOT / "src/memorymap/api"):
    if name.startswith("routes_") and name.endswith(".py"):
        ns[name[:-3]] = importlib.import_module(f"memorymap.api.{name[:-3]}")
s = deps.get_db().session()
from memorymap.core.database import Entry  # noqa: E402

ns["ids"] = [r[0] for r in s.query(Entry.id).order_by(Entry.id.desc()).limit(60)]
ns["s"] = s
ns["deps"] = deps
expr = sys.argv[2]
eval(expr, ns)  # warm
t = time.perf_counter()
eval(expr, ns)
print(f"warm call {(time.perf_counter() - t) * 1000:.0f} ms")
prof = cProfile.Profile()
prof.runcall(eval, expr, ns)
pstats.Stats(prof).sort_stats(os.environ.get("SORT", "cumulative")).print_stats(int(os.environ.get("N", "30")))
shutil.rmtree(tmp, ignore_errors=True)
os._exit(0)
