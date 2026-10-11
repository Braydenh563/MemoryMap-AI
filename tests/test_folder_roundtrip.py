"""Export then import into an empty notebook, equal on every field
(WORLD_CLASS_PLAN 25b, the gate of Brief 48 step 2).

The comparison is `export_folder.snapshot` before and after: every record
the export writes, with the ids the import made mapped back to the old
ones. `first_difference` names the first field that differs, so a failure
says where rather than "not equal"."""

from __future__ import annotations

import io
import json
import time
import zipfile

import pytest

from memorymap.api.routes_settings import _parse_frontmatter
from memorymap.core import deps
from memorymap.entry import app_import, export_folder
from tests.fixtures import notebook500


def first_difference(a: object, b: object, path: str = "") -> str | None:
    """The path of the first value that differs, or None when equal."""
    if isinstance(a, dict) and isinstance(b, dict):
        for key in sorted(set(a) | set(b), key=str):
            if key not in a or key not in b:
                return f"{path}/{key}: only in {'before' if key in a else 'after'}"
            found = first_difference(a[key], b[key], f"{path}/{key}")
            if found:
                return found
        return None
    if isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            return f"{path}: {len(a)} items before, {len(b)} after"
        for i, (x, y) in enumerate(zip(a, b)):
            found = first_difference(x, y, f"{path}[{i}]")
            if found:
                return found
        return None
    return None if a == b else f"{path}: {a!r} before, {b!r} after"


def _back(snap: dict, idmap: dict) -> dict:
    """The after-snapshot in the before-snapshot's ids."""
    old = {new: was for was, new in idmap.items()}

    def note(record: dict) -> dict:
        record = dict(record, id=old.get(record["id"], record["id"]))
        record["parent_id"] = old.get(record["parent_id"], record["parent_id"])
        record["links"] = [dict(link, target_entry_id=old.get(link["target_entry_id"])) for link in record["links"]]
        if "canvas" in record:
            canvas = record["canvas"]
            record["canvas"] = dict(canvas, nodes=[dict(n, entry_id=old.get(n["entry_id"])) for n in canvas["nodes"]])
        return record

    documents = {}
    for record in snap["documents"].values():
        documents[record["title"]] = dict(record, id=None, notes=[old.get(n) for n in record["notes"]])
    return {
        "notes": {old[k]: note(v) for k, v in snap["notes"].items() if k in old},
        "boards": {old[k]: note(v) for k, v in snap["boards"].items() if k in old},
        "documents": documents,
    }


def _by_title(snap: dict) -> dict:
    return dict(snap, documents={r["title"]: dict(r, id=None) for r in snap["documents"].values()})


@pytest.fixture()
def exported(client, tmp_path):
    """The fixture notebook's snapshot and its folder zip, then a fresh,
    empty notebook open in its place."""
    session = deps.get_db().session()
    notebook500.build(session, deps.get_config().uploads_dir)
    before = export_folder.snapshot(session, deps.get_config().uploads_dir)
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        export_folder.export(session, deps.get_config().uploads_dir, archive)
    session.close()
    deps.reset_app_state()
    deps.init_app_state(data_dir=tmp_path / "empty")
    yield before, buffer.getvalue()


def _import(data: bytes):
    session = deps.get_db().session()
    result = app_import.read("memorymap", [("memorymap-notebook.zip", data)], parse_frontmatter=_parse_frontmatter)
    written = export_folder.write(session, result, deps.get_config().uploads_dir)
    return session, result, written


def test_the_500_note_notebook_comes_back_equal_on_every_field(exported):
    before, data = exported
    t0 = time.perf_counter()
    session, result, written = _import(data)
    took = time.perf_counter() - t0
    after = export_folder.snapshot(session, deps.get_config().uploads_dir)
    session.close()
    print(f"\nimport of {len(result.notes)} notes and boards: {took:.2f} s; skipped {len(result.skipped)}")
    assert result.skipped == []
    assert written["said"] == []
    assert written["imported"] == 503 and written["already"] == 0
    diff = first_difference(_by_title(before), _back(after, written["idmap"]))
    assert diff is None, diff


def test_a_second_import_of_the_same_folder_makes_nothing(exported):
    _, data = exported
    session, _, first = _import(data)
    session.close()
    session, _, second = _import(data)
    session.close()
    assert first["imported"] == 503
    assert (second["imported"], second["already"], second["documents"]) == (0, 503, 0)


def test_the_sidecar_wins_over_the_front_matter(exported):
    _, data = exported
    source = zipfile.ZipFile(io.BytesIO(data))
    manifest = json.loads(source.read("index.json"))
    row = manifest["notes"][1]
    edited = io.BytesIO()
    with zipfile.ZipFile(edited, "w") as archive:
        for name in source.namelist():
            body = source.read(name)
            if name == row["md"]:
                body = body.replace(b"category: ", b"category: Changed by hand ", 1)
            archive.writestr(name, body)
    session, _, written = _import(edited.getvalue())
    sidecar = json.loads(source.read(row["sidecar"]))
    entry_id = written["idmap"][sidecar["id"]]
    after = export_folder.snapshot(session, deps.get_config().uploads_dir)
    session.close()
    assert after["notes"][entry_id]["category"] == sidecar["category"]


def test_a_note_with_no_sidecar_reads_its_front_matter(exported):
    _, data = exported
    source = zipfile.ZipFile(io.BytesIO(data))
    row = json.loads(source.read("index.json"))["notes"][7]
    trimmed = io.BytesIO()
    with zipfile.ZipFile(trimmed, "w") as archive:
        for name in source.namelist():
            if name != row["sidecar"]:
                archive.writestr(name, source.read(name))
    session, result, written = _import(trimmed.getvalue())
    session.close()
    note = next(n for n in result.notes if n.path == row["md"][:-3])
    assert note.record["category"] == "Travel" and note.record["pinned"] is True
    assert export_folder.ATTACHMENTS_MARK not in note.body


def test_the_route_takes_a_memorymap_folder(exported):
    from fastapi.testclient import TestClient

    from memorymap.api.app import create_app

    _, data = exported
    client = TestClient(create_app())
    reply = client.post("/import/app?source=memorymap", files=[("files", ("memorymap-notebook.zip", data, "application/zip"))])
    assert reply.status_code == 201, reply.text
    body = reply.json()
    assert body["imported"] == 503 and body["skipped"] == []
