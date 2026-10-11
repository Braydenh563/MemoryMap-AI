"""The whiteboard and files services, called directly (Brief 61, WORLD_CLASS
decision 55: "each tested directly").

The route tests are unchanged and prove the routes still answer the same;
these prove the service functions stand on their own, with no request, so a
later route that calls one gets the same answer the old route body gave.
"""
from __future__ import annotations

import ast
from pathlib import Path

import pytest
from fastapi import HTTPException

from memorymap.core.database import Entry
from memorymap.files import service as files
from memorymap.whiteboard import service as board

ROOT = Path(__file__).resolve().parents[1]
ROUTES = ROOT / "src" / "memorymap" / "api"


def test_a_board_copy_is_a_new_board_with_its_own_title(session):
    source = Entry(content="# Trip plan", is_board=True)
    session.add(source)
    session.commit()

    copy = board.duplicate_board_copy(session, source.id)

    assert copy.id != source.id
    assert copy.title == "Trip plan (copy)"
    assert session.get(Entry, copy.id).is_board


def test_copying_a_missing_board_is_a_404_sentence(session):
    with pytest.raises(HTTPException) as caught:
        board.duplicate_board_copy(session, 999_999)
    assert caught.value.status_code == 404


def test_an_outline_parses_without_a_request():
    title, roots = board._parse_markdown_outline("# Plan\n- one\n  - one a\n- two\n")
    assert title == "Plan"
    assert [r["text"] for r in roots] == ["one", "two"]
    assert [c["text"] for c in roots[0]["children"]] == ["one a"]


def test_branch_colours_follow_the_first_level_topics():
    colours = board._map_branch_colors({1: None, 2: 1, 3: 2, 4: 1}, {}, ["red", "blue"])
    assert colours[2] == colours[3] == "red"
    assert colours[4] == "blue"


def test_a_page_spec_is_one_based_in_and_zero_based_out():
    assert files._parse_page_spec("1,4,7-9", 10) == [0, 3, 6, 7, 8]
    assert files._parse_page_spec("all", 3) == [0, 1, 2]


def test_a_filename_cannot_leave_the_folder(tmp_path):
    assert files.safe_filename("../../etc/passwd") == "passwd"
    with pytest.raises(HTTPException):
        files.safe_filename("..")
    assert files._within_dir(tmp_path, "a.png") == tmp_path.resolve() / "a.png"


@pytest.mark.parametrize("routes, service", [
    ("routes_whiteboard.py", board),
    ("routes_files.py", files),
])
def test_the_routes_module_defines_routes_and_little_else(routes, service):
    """A helper added back to the routes file grows the route file again;
    decision 55 puts it in the service."""
    tree = ast.parse((ROUTES / routes).read_text(encoding="utf-8"))
    loose = [
        node.name
        for node in tree.body
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef))
        and not any("router." in ast.unparse(d) for d in getattr(node, "decorator_list", []))
    ]
    assert loose == [], f"{routes} holds non-route definitions; move them to {service.__name__}: {loose}"
