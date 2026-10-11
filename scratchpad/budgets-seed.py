"""Seed MEMORYMAP_DATA_DIR with tests/fixtures/budget_notebook (Brief 53).

    MEMORYMAP_DATA_DIR=<dir> PYTHONPATH=src:. .venv/bin/python scratchpad/budgets-seed.py
"""
from memorymap.core import deps
from tests.fixtures import budget_notebook

with deps.get_db().session() as session:
    print(budget_notebook.build(session, deps.get_config().uploads_dir))
