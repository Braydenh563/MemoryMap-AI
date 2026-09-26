"""The privacy receipt (WORLD_CLASS_PLAN §2 standout 5, row 35; §12 S6).

"A page that proves, from the app's own logs, that nothing left the
machine." The proof is `core/egress.py`: a Python audit hook that sees
every `socket.connect` and `socket.getaddrinfo` this process makes, from any
library, on any path, without anybody having to remember to call a logger.
These tests drive the hook through `sys.audit`, which raises exactly the
event the socket module raises, so nothing here touches the network; one
test makes a real loopback connect to prove the event shape is the one the
interpreter really sends.
"""

from __future__ import annotations

import json
import socket
import sys

import pytest

from memorymap.core import egress


@pytest.fixture(autouse=True)
def fresh_ledger(app_state):
    egress.install()
    egress.reset()
    yield
    egress.reset()


def _receipt(client, **headers):
    response = client.get("/privacy/receipt", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


# --- the hook ------------------------------------------------------------


def test_a_connect_to_the_internet_is_recorded_with_its_scope():
    sys.audit("socket.connect", None, ("93.184.216.34", 443))
    rows = egress.destinations()
    assert [(r["host"], r["port"], r["scope"], r["count"]) for r in rows] == [
        ("93.184.216.34", 443, "internet", 1)
    ]


def test_scopes_this_computer_local_network_and_internet():
    assert egress.scope_of("127.0.0.1") == "this_computer"
    assert egress.scope_of("::1") == "this_computer"
    assert egress.scope_of("localhost") == "this_computer"
    assert egress.scope_of("192.168.1.20") == "local_network"
    assert egress.scope_of("10.0.0.5") == "local_network"
    assert egress.scope_of("fe80::1") == "local_network"
    assert egress.scope_of("nas.local") == "local_network"
    assert egress.scope_of("1.1.1.1") == "internet"
    # A name nobody can place is assumed to leave: the receipt errs toward
    # saying more went out, never less.
    assert egress.scope_of("example.com") == "internet"


def test_a_real_loopback_connect_is_seen_and_counted_as_this_computer():
    """The interpreter's own event, not one this file raised by hand."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
        listener.bind(("127.0.0.1", 0))
        listener.listen(1)
        port = listener.getsockname()[1]
        with socket.create_connection(("127.0.0.1", port), timeout=2):
            pass
    counts = egress.totals()
    assert counts["this_computer"] >= 1
    assert counts["internet"] == 0 and counts["local_network"] == 0


def test_a_name_lookup_is_recorded_because_the_question_leaves_too():
    sys.audit("socket.getaddrinfo", "updates.example.org", 443, 0, 0, 0)
    sys.audit("socket.getaddrinfo", "localhost", 8000, 0, 0, 0)
    rows = egress.destinations()
    assert [(r["kind"], r["host"], r["scope"]) for r in rows] == [
        ("lookup", "updates.example.org", "internet")
    ]


def test_a_numeric_lookup_asks_no_resolver_and_is_not_recorded():
    """Found by the LAN test: the web reader "looks up" 10.0.0.1 before it
    refuses it, which is parsed locally; recording it read as a connection to
    the local network that never happened."""
    sys.audit("socket.getaddrinfo", "10.0.0.1", 80, 0, 0, 0)
    sys.audit("socket.getaddrinfo", "::ffff:10.0.0.1", 80, 0, 0, 0)
    assert egress.destinations() == []
    assert egress.totals() == {"this_computer": 0, "local_network": 0, "internet": 0}


def test_the_hook_never_raises_on_a_shape_it_does_not_know():
    """An exception inside an audit hook aborts the caller's own operation:
    a receipt must never be the reason a connect failed."""
    sys.audit("socket.connect", None, b"/tmp/some.sock")
    sys.audit("socket.connect", None, object())
    sys.audit("socket.getaddrinfo", None, None, 0, 0, 0)
    sys.audit("socket.connect")
    assert egress.totals()["internet"] == 0


def test_the_module_that_asked_is_named():
    code = compile(
        "import sys\nsys.audit('socket.connect', None, ('140.82.112.3', 443))\n",
        "<updates>",
        "exec",
    )
    exec(code, {"__name__": "memorymap.api.routes_update"})  # noqa: S102
    (row,) = egress.destinations()
    assert row["via"] == "memorymap.api.routes_update"
    assert row["feature"] == "Update check"


def test_the_table_is_bounded():
    for i in range(egress.MAX_DESTINATIONS + 40):
        sys.audit("socket.connect", None, (f"8.8.{i // 250}.{i % 250}", 53))
    assert len(egress.destinations()) == egress.MAX_DESTINATIONS
    # The totals still count every one: bounding the table must not make the
    # receipt quieter than what happened.
    assert egress.totals()["internet"] == egress.MAX_DESTINATIONS + 40


# --- the ledger on disk ----------------------------------------------------


def test_the_ledger_survives_a_restart(app_state):
    sys.audit("socket.connect", None, ("93.184.216.34", 443))
    path = app_state.data_dir / egress.LEDGER_NAME
    egress.flush(path)
    egress.reset()  # the process ends
    sys.audit("socket.connect", None, ("93.184.216.34", 443))
    egress.flush(path)
    stored = json.loads(path.read_text())
    (row,) = stored["destinations"]
    assert row["count"] == 2
    assert stored["totals"]["internet"] == 2


def test_flushing_twice_does_not_count_twice(app_state):
    sys.audit("socket.connect", None, ("93.184.216.34", 443))
    path = app_state.data_dir / egress.LEDGER_NAME
    egress.flush(path)
    egress.flush(path)
    assert json.loads(path.read_text())["totals"]["internet"] == 1


def test_a_corrupt_ledger_starts_over_rather_than_failing(app_state):
    path = app_state.data_dir / egress.LEDGER_NAME
    path.write_text("{not json")
    sys.audit("socket.connect", None, ("93.184.216.34", 443))
    egress.flush(path)
    assert json.loads(path.read_text())["totals"]["internet"] == 1


# --- the route ---------------------------------------------------------------


def test_a_quiet_notebook_gets_the_verdict_nothing_left(client):
    body = _receipt(client)
    assert body["verdict"] == "stayed_on_this_computer"
    assert body["totals"]["internet"] == 0
    assert body["destinations"] == []
    assert body["watching_since"]
    # What the receipt cannot see is said, not implied.
    assert "model server" in body["covers"].lower()


def test_an_internet_connect_changes_the_verdict_and_is_listed(client):
    sys.audit("socket.connect", None, ("93.184.216.34", 443))
    body = _receipt(client)
    assert body["verdict"] == "internet"
    assert body["destinations"][0]["host"] == "93.184.216.34"


def test_the_model_server_address_is_on_the_receipt(client, app_state):
    """S6's second half: the configured model address, and where it is."""
    body = _receipt(client)
    assert body["model_server"]["scope"] == "this_computer"
    app_state.set_preference("llm_base_url", "http://192.168.1.50:11434")
    body = _receipt(client)
    assert body["model_server"]["url"] == "http://192.168.1.50:11434"
    assert body["model_server"]["scope"] == "local_network"
    assert "192.168.1.50" in body["model_server"]["note"]


def test_a_connect_to_the_model_server_is_labelled_as_one(client, app_state):
    app_state.set_preference("llm_base_url", "http://192.168.1.50:11434")
    sys.audit("socket.connect", None, ("192.168.1.50", 11434))
    body = _receipt(client)
    (row,) = body["destinations"]
    assert row["role"] == "model server"
    assert body["verdict"] == "local_network"


def test_the_switches_that_can_reach_out_are_listed(client, app_state):
    body = _receipt(client)
    by_key = {f["key"]: f for f in body["switches"]}
    assert by_key["web_search_enabled"]["on"] is False
    assert by_key["update_check_enabled"]["on"] is False
    app_state.set_preference("web_search_enabled", True)
    by_key = {f["key"]: f for f in _receipt(client)["switches"]}
    assert by_key["web_search_enabled"]["on"] is True


def test_the_receipt_is_behind_the_lock(client):
    assert client.post("/auth/setup", json={"password": "hunter22"}).status_code == 200
    assert client.get("/privacy/receipt").status_code == 401


def test_the_receipt_reads_the_ledger_from_before_this_launch(client, app_state):
    sys.audit("socket.connect", None, ("93.184.216.34", 443))
    egress.flush(app_state.data_dir / egress.LEDGER_NAME)
    egress.reset()
    body = _receipt(client)
    assert body["verdict"] == "stayed_on_this_computer"  # this launch
    assert body["ledger"]["totals"]["internet"] == 1  # since the ledger began
    assert body["ledger"]["verdict"] == "internet"
