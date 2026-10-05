"""`/graph` is encoded on the worker thread (audit 2026-10-05, ARCH-14).

FastAPI encodes a sync route's returned dict on the event loop (py-spy:
`serialize_response`), so a 2.4 MB graph at 5,000 notes stalled every other
request while it was turned into JSON. The route now returns a response it
encoded itself, which runs where the route runs: the threadpool.
"""

from __future__ import annotations

from fastapi.responses import Response

from memorymap.api import routes_graph


def test_the_graph_route_hands_back_bytes_not_a_dict(client, session):
    client.post("/entries", json={"content": "one note"})
    answer = routes_graph.graph(similarity=False, session=session)
    assert isinstance(answer, Response) and isinstance(answer.body, bytes)
    over_http = client.get("/graph").json()
    assert set(over_http) == {"nodes", "edges", "categories", "type_colours"}
    assert len(over_http["nodes"]) == 1


def test_a_plain_payload_skips_the_generic_encoder_and_is_byte_for_byte_the_same(client, session, monkeypatch):
    """`jsonable_encoder` walked every value of the payload (213,459 calls at
    5,000 notes, 0.96 s of a 1.95 s cold build, cProfile) to hand back the
    same plain dicts, lists, strings and numbers it was given. The payload is
    tried as it is first; the encoder runs only for a value JSON cannot take."""
    import json

    from fastapi.encoders import jsonable_encoder

    a = client.post("/entries", json={"content": "first note #tag"}).json()
    b = client.post("/entries", json={"content": "second note"}).json()
    linked = client.post(f"/entries/{a['id']}/links", json={"target_id": b["id"]})
    assert linked.status_code == 200
    calls = []
    real = routes_graph.jsonable_encoder
    monkeypatch.setattr(routes_graph, "jsonable_encoder", lambda value: calls.append(1) or real(value))
    for slim in (False, True):
        body = routes_graph._build_graph(session=session, slim=slim).body
        assert body == routes_graph.JSONResponse(jsonable_encoder(json.loads(body))).body
    assert calls == []
