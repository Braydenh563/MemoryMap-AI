"""A note's properties and the note types (GRAPH_PLAN KG4, INBOX 528).

The properties are the `---` block at the top of the note's own text
(`entry/properties.py`); reading them parses the text, writing them rewrites
that block and saves through `routes_entries.update_entry`, so the revision,
the conflict guard, the wiki sync and the index rebuild happen as on any
save. A type ("Meeting": attendees, date) is a row here; a note is of a type
when its block says `type: Meeting`, and a new note of a type starts with its
fields.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from memorymap.api import routes_entries
from memorymap.api.schemas import EntryOut, EntryUpdate
from memorymap.core.database import NOTE_FIELD_KINDS, NoteType
from memorymap.core.deps import get_session
from memorymap.entry import manager
from memorymap.entry import properties as note_properties

router = APIRouter(tags=["properties"])

#: Bounds: a property table is a header, not a database row of a hundred
#: columns, and a value is a phrase.
MAX_PROPERTIES = 40
MAX_VALUE_CHARS = 300


def _type_row(row: NoteType) -> dict:
    return {
        "id": row.id,
        "name": row.name,
        "icon": row.icon,
        "colour": row.colour,
        "fields": list(row.fields or []),
    }


def _find_type(session: Session, name: str | None) -> NoteType | None:
    if not name:
        return None
    return session.scalar(select(NoteType).where(func.lower(NoteType.name) == name.strip().lower()))


def with_type_fields(session: Session, content: str, type_name: str) -> str:
    """`content` with `type:` and the type's fields first in its block (KG4).
    A field the note already has keeps its value; an unknown type is written
    as the type alone, which is what an imported vault's notes do."""
    row = _find_type(session, type_name)
    found, _ = note_properties.split(content)
    props: dict[str, object] = {"type": row.name if row else type_name.strip()}
    for field in (row.fields or []) if row else []:
        name = field.get("name")
        if name and name not in found:
            props[name] = [] if field.get("kind") == "list" else ""
    for key, values in found.items():
        if key != "type":
            props[key] = values if len(values) != 1 else values[0]
    return note_properties.write(content, props)


@router.get("/entries/{entry_id}/properties")
def entry_properties(entry_id: int, session: Session = Depends(get_session)) -> dict:
    """The note's properties, its type, and that type's fields in order."""
    entry = routes_entries._existing_entry(session, entry_id)
    found, _ = note_properties.split(manager.readable_content(entry))
    kind = note_properties.note_type(found)
    row = _find_type(session, kind)
    return {"properties": found, "type": kind, "fields": list(row.fields or []) if row else []}


class PropertiesIn(BaseModel):
    properties: dict[str, str | int | float | bool | list[str] | None]
    #: The text the editor read, for the same conflict guard a save has.
    base_hash: str | None = None


@router.put("/entries/{entry_id}/properties", response_model=EntryOut)
def put_properties(entry_id: int, body: PropertiesIn, session: Session = Depends(get_session)) -> EntryOut:
    """Replace the note's block with these properties; the body is untouched."""
    if len(body.properties) > MAX_PROPERTIES:
        raise HTTPException(status_code=422, detail=f"A note holds {MAX_PROPERTIES} properties at most.")
    clean: dict[str, object] = {}
    for key, value in body.properties.items():
        name = " ".join(str(key).split())[:60]
        if not name or ":" in name:
            raise HTTPException(status_code=422, detail="A property's name can't be empty or hold a colon.")
        if isinstance(value, list):
            clean[name] = [str(v)[:MAX_VALUE_CHARS] for v in value][:40]
        elif isinstance(value, str):
            clean[name] = value[:MAX_VALUE_CHARS]
        else:
            clean[name] = value
    entry = routes_entries._existing_entry(session, entry_id)
    text = note_properties.write(manager.readable_content(entry), clean)
    return routes_entries.update_entry(entry_id, EntryUpdate(content=text, base_hash=body.base_hash), session)


class FieldIn(BaseModel):
    name: str = Field(max_length=60)
    kind: str = "text"


class NoteTypeIn(BaseModel):
    name: str = Field(max_length=60)
    icon: str | None = Field(default=None, max_length=30)
    colour: str | None = Field(default=None, max_length=16)
    fields: list[FieldIn] = Field(default_factory=list, max_length=30)


class NoteTypePatch(BaseModel):
    name: str | None = Field(default=None, max_length=60)
    icon: str | None = Field(default=None, max_length=30)
    colour: str | None = Field(default=None, max_length=16)
    fields: list[FieldIn] | None = Field(default=None, max_length=30)


def _fields(fields: list[FieldIn]) -> list[dict]:
    out, seen = [], set()
    for field in fields:
        name = " ".join(field.name.split())
        if not name or ":" in name or name.lower() == "type":
            raise HTTPException(status_code=422, detail="A field needs a name (not \"type\", and no colon).")
        if field.kind not in NOTE_FIELD_KINDS:
            raise HTTPException(status_code=422, detail=f"A field is one of: {', '.join(NOTE_FIELD_KINDS)}.")
        if name.lower() not in seen:
            seen.add(name.lower())
            out.append({"name": name, "kind": field.kind})
    return out


@router.get("/note-types")
def list_note_types(session: Session = Depends(get_session)) -> list[dict]:
    return [_type_row(r) for r in session.scalars(select(NoteType).order_by(NoteType.name))]


@router.post("/note-types", status_code=201)
def create_note_type(body: NoteTypeIn, session: Session = Depends(get_session)) -> dict:
    name = " ".join(body.name.split())
    if not name:
        raise HTTPException(status_code=422, detail="A note type needs a name.")
    if _find_type(session, name) is not None:
        raise HTTPException(status_code=409, detail="There is already a note type with that name.")
    row = NoteType(name=name, icon=body.icon, colour=body.colour, fields=_fields(body.fields) or None)
    session.add(row)
    session.commit()
    return _type_row(row)


def _existing_type(session: Session, type_id: int) -> NoteType:
    row = session.get(NoteType, type_id)
    if row is None:
        raise HTTPException(status_code=404, detail="That note type could not be found.")
    return row


@router.patch("/note-types/{type_id}")
def patch_note_type(type_id: int, body: NoteTypePatch, session: Session = Depends(get_session)) -> dict:
    """A rename changes the type's name here only: notes that say the old
    name keep saying it (their text is theirs), which the list shows."""
    row = _existing_type(session, type_id)
    sent = body.model_fields_set
    if "name" in sent and body.name is not None:
        name = " ".join(body.name.split())
        other = _find_type(session, name)
        if not name or (other is not None and other.id != row.id):
            raise HTTPException(status_code=409, detail="There is already a note type with that name.")
        row.name = name
    if "icon" in sent:
        row.icon = body.icon
    if "colour" in sent:
        row.colour = body.colour
    if "fields" in sent and body.fields is not None:
        row.fields = _fields(body.fields) or None
    session.commit()
    return _type_row(row)


@router.delete("/note-types/{type_id}")
def delete_note_type(type_id: int, session: Session = Depends(get_session)) -> dict:
    """The type goes; every note keeps its properties, `type:` included."""
    row = _existing_type(session, type_id)
    session.delete(row)
    session.commit()
    return {"deleted": type_id}
