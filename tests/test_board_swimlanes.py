"""A pool with lanes in the Frames set (INBOX 797, canvasdepth; WHITEBOARD_PLAN
"canvasdepth, ranked" row 4). draw.io's swimlane is a container with lanes;
here it is a frame round three lane frames, in rows or in columns, placed in
one step. The browser half is `scratchpad/ui-sweeps/wbswimlanes.js`."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

FRAMES = json.loads((Path(__file__).resolve().parents[1] / "frontend" / "board-library" / "frames.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("key", ["swimlanes-rows", "swimlanes-columns"])
def test_a_pool_places_with_its_lanes_inside(ai_client, key):
    board = ai_client.post("/whiteboard/boards", json={"name": "Lanes", "type": "board"}).json()
    out = ai_client.post(f"/whiteboard/boards/{board['id']}/place", json={"builtin": f"frames/{key}", "x": 0, "y": 0})
    assert out.status_code == 201, out.text
    frames = [o for o in out.json()["objects"] if o["kind"] == "frame"]
    assert len(frames) == 4
    pool = max(frames, key=lambda o: o["width"] * o["height"])
    lanes = [o for o in frames if o is not pool]
    assert [o["data"]["content"] for o in lanes] == ["Lane 1", "Lane 2", "Lane 3"]
    for lane in lanes:
        assert pool["x"] < lane["x"] and lane["x"] + lane["width"] < pool["x"] + pool["width"]
        assert pool["y"] < lane["y"] and lane["y"] + lane["height"] < pool["y"] + pool["height"]
        assert lane["z"] > pool["z"]


def test_the_index_counts_them():
    assert {i["key"] for i in FRAMES["items"]} >= {"swimlanes-rows", "swimlanes-columns"}
    index = json.loads((Path(__file__).resolve().parents[1] / "frontend" / "board-library" / "index.json").read_text(encoding="utf-8"))
    assert next(s for s in index["sets"] if s["key"] == "frames")["count"] == len(FRAMES["items"])
