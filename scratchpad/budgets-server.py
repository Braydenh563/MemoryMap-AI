"""Brief 53: the server share of each budget on the fixture, three rounds of p50 (TestClient, as tests/test_budgets.py does).

    PYTHONPATH=src:. .venv/bin/python scratchpad/budgets-server.py <scratch data dir>
"""
import os
import sys
import tempfile

os.environ["MEMORYMAP_DATA_DIR"] = str(sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp())
from fastapi.testclient import TestClient

from memorymap.api import routes_bench
from memorymap.api.app import create_app
from memorymap.core import deps
from tests.fakes import FakeEmbeddingService, FakeOllama
from tests.fixtures import budget_notebook

deps.init_app_state(data_dir=os.environ["MEMORYMAP_DATA_DIR"])
deps.override_ai(ollama=FakeOllama(running=False), embeddings=FakeEmbeddingService(available=False))
with deps.get_db().session() as session:
    made = budget_notebook.build(session, deps.get_config().uploads_dir)
client = TestClient(create_app())
ids = {"board": made["board_id"], "document": made["document_id"]}
for b in routes_bench.BUDGETS:
    if b.server_path:
        path = b.server_path.format(**ids)
        print(b.key, path, [round(routes_bench.time_share(client.get, path), 1) for _ in range(3)])
