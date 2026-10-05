"""`/graph` is encoded on the worker thread (audit 2026-10-05, ARCH-14).

FastAPI encodes a sync route's returned dict on the event loop (py-spy:
`serialize_response`), so a 2.4 MB graph at 5,000 notes stalled every other
request while it was turned into JSON. The route now returns a response it
encoded itself, which runs where the route runs: the threadpool.
"""

from __future__ import annotations

from fastapi.responses import JSONResponse

from memorymap.api import routes_graph


def test_the_graph_route_hands_back_bytes_not_a_dict(client, session):
    client.post("/entries", json={"content": "one note"})
    answer = routes_graph.graph(similarity=False, session=session)
    assert isinstance(answer, JSONResponse)
    over_http = client.get("/graph").json()
    assert set(over_http) == {"nodes", "edges", "categories"}
    assert len(over_http["nodes"]) == 1
