"""Kinds of link a person adds (GRAPH_PLAN KG3, INBOX 528).

The six built-ins (`LINK_TYPES`) stay in code and are listed first; a person
adds their own here, each with the name it has from the other end ("Part of"
/ "Has part", "Cites" / "Cited by"). A custom type's key is its name made
safe (`part_of`), which is what `EntryLink.link_type` stores, so a rename
never touches a link. Deleting one leaves its links untyped, never gone.
"""

from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from memorymap.core.database import EntryLink, RelationType
from memorymap.core.deps import get_session
from memorymap.entry import manager

router = APIRouter(prefix="/relation-types", tags=["relation-types"])

#: A type's colour is a palette key or `#rrggbb`, as a category's is.
_COLOUR = re.compile(r"^(#[0-9a-fA-F]{6}|[a-z]{3,12})$")


def _key(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", name.casefold()).strip("_")[:24]


def _clean(text: str | None) -> str | None:
    text = " ".join((text or "").split())
    return text[:60] or None


class RelationIn(BaseModel):
    name: str = Field(max_length=60)
    inverse: str | None = Field(default=None, max_length=60)
    directed: bool = True
    colour: str | None = Field(default=None, max_length=16)
    #: Undo's door (undo-1005): a deleted kind made again as it was. Its key
    #: is sent, not derived, because a rename keeps the key (`part_of` named
    #: "Piece of"); `link_ids` are the links its delete left untyped, which
    #: take the kind back unless they have been given another one since.
    restore: bool = False
    key: str | None = Field(default=None, max_length=24)
    link_ids: list[int] = Field(default_factory=list, max_length=100_000)


class RelationPatch(BaseModel):
    name: str | None = Field(default=None, max_length=60)
    inverse: str | None = Field(default=None, max_length=60)
    directed: bool | None = None
    colour: str | None = Field(default=None, max_length=16)


def _colour(value: str | None) -> str | None:
    if value and not _COLOUR.match(value):
        raise HTTPException(status_code=422, detail="A colour is a palette name or #rrggbb.")
    return value or None


@router.get("")
def list_types(
    response: Response,
    limit: int = Query(default=500, ge=1, le=500),
    session: Session = Depends(get_session),
) -> list[dict]:
    rows = list(manager.relation_types(session).values())
    response.headers["X-Total-Count"] = str(len(rows))
    return rows[:limit]


@router.post("", status_code=201)
def create_type(body: RelationIn, session: Session = Depends(get_session)) -> dict:
    name = _clean(body.name)
    key = _key(name or "")
    if body.restore and body.key:
        key = _key(body.key)
    if not name or not key:
        raise HTTPException(status_code=422, detail="A kind of link needs a name.")
    known = manager.relation_types(session)
    if key in known or any(k["name"].casefold() == name.casefold() for k in known.values()):
        raise HTTPException(status_code=409, detail="There is already a kind of link with that name.")
    row = RelationType(key=key, name=name, inverse=_clean(body.inverse), directed=body.directed, colour=_colour(body.colour))
    session.add(row)
    if body.restore and body.link_ids:
        links = EntryLink.__table__  # every space's, as the delete was
        for start in range(0, len(body.link_ids), 500):
            chunk = body.link_ids[start:start + 500]
            session.execute(
                update(links).where(links.c.id.in_(chunk), links.c.link_type.is_(None)).values(link_type=key)
            )
    session.commit()
    manager.forget_relation_types(session)
    return manager.relation_types(session)[key]


def _custom(session: Session, key: str) -> RelationType:
    row = session.scalar(select(RelationType).where(RelationType.key == key))
    if row is None:
        if key in manager.relation_types(session):
            raise HTTPException(status_code=400, detail="The built-in kinds of link can't be changed.")
        raise HTTPException(status_code=404, detail="That kind of link could not be found.")
    return row


@router.patch("/{key}")
def patch_type(key: str, body: RelationPatch, session: Session = Depends(get_session)) -> dict:
    row = _custom(session, key)
    sent = body.model_fields_set
    if "name" in sent:
        name = _clean(body.name)
        if not name:
            raise HTTPException(status_code=422, detail="A kind of link needs a name.")
        row.name = name
    if "inverse" in sent:
        row.inverse = _clean(body.inverse)
    if "directed" in sent and body.directed is not None:
        row.directed = body.directed
    if "colour" in sent:
        row.colour = _colour(body.colour)
    session.commit()
    manager.forget_relation_types(session)
    return manager.relation_types(session)[key]


@router.delete("/{key}")
def delete_type(key: str, session: Session = Depends(get_session)) -> dict:
    row = _custom(session, key)
    # Everything Undo needs to put it back exactly (undo-1005): the row and
    # which links carried it, since after this they carry nothing.
    #
    # On the table, not the mapped class: a kind is the whole notebook's, and
    # an ORM statement here took the request's space filter, so a delete made
    # while one space was open left that kind on every other space's links.
    links = EntryLink.__table__
    link_ids = list(session.scalars(select(links.c.id).where(links.c.link_type == key)))
    restore = {
        "key": row.key, "name": row.name, "inverse": row.inverse,
        "directed": bool(row.directed), "colour": row.colour, "link_ids": link_ids,
    }
    untyped = session.execute(update(links).where(links.c.link_type == key).values(link_type=None)).rowcount
    session.delete(row)
    session.commit()
    manager.forget_relation_types(session)
    return {"deleted": key, "links_untyped": untyped or 0, "restore": restore}
