"""Budgets per interaction (WORLD_CLASS_PLAN 25g, decision 54).

Six interactions, each with a time written down in `routes_bench.BUDGETS`:
boot to first paint, first interaction, list paint, search, board open at 500
objects, document open at 50,000 words. The numbers were measured on the
500-note fixture plus those two heavy items (`tests/fixtures/
budget_notebook.py`) on the four-core sandbox, and each cap is 1.5 times its
measurement.

Two halves, one table. This file holds the server's half, which every push
runs: the route each interaction waits on, timed against the fixture, so a
slowdown in a query or a serializer fails here. The browser's half (paint,
layout, the editor) is `tests-e2e/specs/budgets.spec.js`, which reads the same
caps from `GET /models/bench/budgets`. `scratchpad/ui-sweeps/budgets.js`
takes the browser numbers the README table is made from.

Timing tests run serially (`-p no:xdist` or a single worker): two of them
sharing four cores measure each other. A miss is repeated three times before
it counts, because the machine is shared; a number that misses three times is
real and is reported as it is, never absorbed by raising the cap.
"""

from __future__ import annotations

import math
import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from memorymap.ai import model_manager
from memorymap.api import routes_bench
from memorymap.core import deps, taskhistory, vault
from tests.fixtures import budget_notebook

ROOT = Path(__file__).resolve().parents[1]
README = (ROOT / "README.md").read_text(encoding="utf-8")
SPEC = (ROOT / "tests-e2e" / "specs" / "budgets.spec.js").read_text(encoding="utf-8")
KEYS = ["first_paint", "first_interaction", "list", "search", "board", "document"]
ROUNDS = 3


def _cap(measured: int) -> int:
    """1.5 times the measurement, rounded up to 10 ms."""
    return math.ceil(measured * 1.5 / 10) * 10


@pytest.fixture(scope="module")
def notebook(tmp_path_factory):
    """The fixture, built once for the module (about 8 s), with the same
    singleton reset `conftest.app_state` does around a test."""
    from tests.fakes import FakeEmbeddingService, FakeOllama

    data = tmp_path_factory.mktemp("budgets") / "data"
    mp = pytest.MonkeyPatch()
    mp.setenv("MEMORYMAP_DATA_DIR", str(data))
    deps.reset_app_state()
    model_manager.reset_jobs()
    vault.close()
    taskhistory.clear()
    deps.init_app_state(data_dir=data)
    deps.override_ai(ollama=FakeOllama(running=False), embeddings=FakeEmbeddingService(available=False))
    session = deps.get_db().session()
    made = budget_notebook.build(session, deps.get_config().uploads_dir)
    session.close()
    from memorymap.api.app import create_app

    yield TestClient(create_app()), {"board": made["board_id"], "document": made["document_id"]}
    vault.close()
    deps.reset_app_state()
    model_manager.reset_jobs()
    taskhistory.clear()
    mp.undo()


def test_there_are_six_budgets_and_each_cap_is_one_and_a_half_times_its_measurement():
    assert [b.key for b in routes_bench.BUDGETS] == KEYS
    for budget in routes_bench.BUDGETS:
        assert budget.measured_ms > 0, f"{budget.key} has no measurement; a budget is a measured number"
        assert budget.cap_ms == _cap(budget.measured_ms), f"{budget.key}: cap {budget.cap_ms} is not 1.5 x {budget.measured_ms}"
        if budget.server_path:
            assert budget.server_measured_ms > 0, f"{budget.key}: the server share has no measurement"
            assert budget.server_cap_ms == _cap(budget.server_measured_ms), f"{budget.key}: server cap is not 1.5 x its measurement"


@pytest.mark.parametrize("budget", [b for b in routes_bench.BUDGETS if b.server_path], ids=lambda b: b.key)
def test_each_server_share_stays_inside_its_cap(notebook, budget):
    client, ids = notebook
    path = budget.server_path.format(**ids)
    rounds = [routes_bench.time_share(client.get, path)]
    while rounds[-1] > budget.server_cap_ms and len(rounds) < ROUNDS:
        rounds.append(routes_bench.time_share(client.get, path))
    print(f"\n{budget.key}: {path} p50 {[round(r, 1) for r in rounds]} ms, cap {budget.server_cap_ms} ms")
    assert min(rounds) <= budget.server_cap_ms, (
        f"{budget.label} ({path}) took {min(rounds):.1f} ms at best of {len(rounds)} rounds; "
        f"the cap is {budget.server_cap_ms} ms (measured {budget.server_measured_ms} ms)"
    )


def test_the_fixture_is_the_size_the_budgets_name(notebook):
    client, ids = notebook
    assert len(client.get("/whiteboard/", params={"board_id": ids["board"]}).json()["objects"]) == budget_notebook.OBJECTS
    words = len(client.get(f"/documents/{ids['document']}").json()["content"].split())
    assert words == budget_notebook.DOC_WORDS


def test_the_route_serves_the_table_and_reads_the_notebook_live(notebook, monkeypatch):
    client, ids = notebook
    monkeypatch.setattr(routes_bench, "loopback", lambda base, headers: lambda path: client.get(path, headers=headers))
    table = client.get("/models/bench/budgets").json()["budgets"]
    assert [row["key"] for row in table] == KEYS
    live = client.get("/models/bench/budgets", params={"live": "true"}).json()
    assert live["ids"] == ids
    timed = {row["key"]: row["live_ms"] for row in live["budgets"] if "live_ms" in row}
    assert set(timed) == {"first_paint", "list", "search", "board", "document"}
    assert all(ms is not None and ms > 0 for ms in timed.values()), timed


def test_the_readme_table_holds_every_measurement_and_cap():
    section = README[README.index("## Performance"):]
    section = section.split("\n## ", 1)[0]
    for budget in routes_bench.BUDGETS:
        row = next((line for line in section.splitlines() if line.startswith("|") and budget.label in line), None)
        assert row, f"the README performance table has no row for {budget.label}"
        numbers = [int(n.replace(",", "")) for n in re.findall(r"\b\d[\d,]*\b", " ".join(row.split("|")[2:]))]
        assert budget.measured_ms in numbers and budget.cap_ms in numbers, (
            f"{budget.label}: README row {row!r} does not carry measured {budget.measured_ms} and cap {budget.cap_ms}"
        )


def test_the_browser_spec_times_every_interaction_against_the_route_caps():
    assert "/models/bench/budgets" in SPEC, "the spec must read its caps from the route"
    for key in KEYS:
        assert f'"{key}"' in SPEC, f"tests-e2e/specs/budgets.spec.js does not check {key}"
