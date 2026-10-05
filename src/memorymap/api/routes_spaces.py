import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from memorymap.api.schemas import SpaceResponse, SpaceCreate, SpaceUpdate
from memorymap.core import deps
from memorymap.core.database import Base, Category, Entry, Space, workspace_scoped_models
from memorymap.core.deps import get_session, impersonate_workspace
from sqlalchemy import delete as sa_delete
from sqlalchemy import select as sa_select
from sqlalchemy import update as sa_update
from sqlalchemy.orm import Session

router = APIRouter(tags=["Spaces"])

# "all" is the frontend's "show every space" sentinel and "default" is the
# fallback delete_space reassigns orphaned rows to, a user-created space
# with either id would break both, so neither can ever be created or deleted.
RESERVED_SPACE_IDS = {"all", "default"}

# Phosphor icon names only. The frontend does `class="ph " + icon` with no
# escaping, so an unvalidated icon is a CSS class injection into the page.
_ICON_RE = re.compile(r"^ph-[a-z0-9-]{1,40}$")

_MAX_NAME_LEN = 60


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
    return slug[:49] or "space"


def _generate_space_id(name: str, session: Session) -> str:
    """Server-generated id: slugify(name), de-duplicated with a numeric
    suffix. Chosen over validating a client-supplied id because the
    reserved-sentinel and charset rules a client id would need are exactly
    the rules a generated-and-deduped slug satisfies for free."""
    base = _slugify(name)
    existing = {row[0] for row in session.query(Space.id).all()}
    candidate = base
    n = 2
    while candidate in RESERVED_SPACE_IDS or candidate in existing:
        suffix = f"-{n}"
        candidate = f"{base[: 49 - len(suffix)]}{suffix}"
        n += 1
    return candidate


def _validate_icon(icon: str) -> str:
    if not _ICON_RE.match(icon):
        raise HTTPException(400, "Pick an icon from the list.")
    return icon


def _validate_name(name: str) -> str:
    name = name.strip()
    if not name:
        raise HTTPException(400, "A space needs a name.")
    if len(name) > _MAX_NAME_LEN:
        raise HTTPException(400, f"A space name can be at most {_MAX_NAME_LEN} characters.")
    return name


@router.get("/spaces", response_model=list[SpaceResponse])
def get_spaces(session: Session = Depends(get_session)):
    return session.query(Space).all()


@router.post("/spaces", response_model=SpaceResponse)
def create_space(space_in: SpaceCreate, session: Session = Depends(get_session)):
    # space_in.id is intentionally never read, see SpaceCreate.id's docstring.
    name = _validate_name(space_in.name)
    icon = _validate_icon(space_in.icon)
    space_id = _generate_space_id(name, session)
    space = Space(id=space_id, name=name, icon=icon)
    session.add(space)
    session.commit()
    session.refresh(space)
    return space


@router.put("/spaces/{space_id}", response_model=SpaceResponse)
def update_space(space_id: str, space_in: SpaceUpdate, session: Session = Depends(get_session)):
    space = deps.get_or_404(session, Space, space_id, "That space could not be found.")
    # Only fields the caller actually sent are applied, so an omitted field
    # doesn't get overwritten with None (SpaceUpdate's fields are optional).
    provided = space_in.model_dump(exclude_unset=True)
    if "name" in provided:
        space.name = _validate_name(provided["name"])
    if "icon" in provided:
        space.icon = _validate_icon(provided["icon"])
    if "hidden_from_all" in provided:
        # "default" is where a deleted space's notes land, so hiding it would
        # quietly empty the everything-view of anything that ever fell back
        # to it: refused for the same reason it cannot be deleted.
        if space.id == "default" and provided["hidden_from_all"]:
            raise HTTPException(
                status_code=400,
                detail="The default space cannot be hidden from All spaces.",
            )
        space.hidden_from_all = bool(provided["hidden_from_all"])
    session.commit()
    session.refresh(space)
    return space


def _move_space_contents(session: Session, source: str, target: str) -> None:
    """Every row of `source` becomes `target`'s. Categories are the one
    per-space unique name: a category the target already has is merged
    into it (its notes re-pointed, the duplicate dropped); the rest move."""
    with impersonate_workspace(session, source):
        doomed = session.query(Category).filter(Category.workspace_id == source).all()
    with impersonate_workspace(session, target):
        existing = {
            c.name: c.id
            for c in session.query(Category).filter(Category.workspace_id == target).all()
        }
    for category in doomed:
        if category.name in existing:
            session.execute(
                sa_update(Entry.__table__)
                .where(Entry.__table__.c.category_id == category.id)
                .values(category_id=existing[category.name])
            )
            _detach_references(session, Category.__table__, [category.id])
            session.execute(sa_delete(Category.__table__).where(Category.__table__.c.id == category.id))
    for model in workspace_scoped_models():
        table = model.__table__
        session.execute(
            sa_update(table).where(table.c.workspace_id == source).values(workspace_id=target)
        )


def _detach_references(session: Session, table, ids: list, depth: int = 0) -> None:  # noqa: ANN001
    """Clear every foreign key that points at `ids` in `table`: set a nullable
    one to NULL, delete the row holding a required one (and, for that row,
    whatever points at it in turn, a few levels deep)."""
    if not ids or depth > 4:
        return
    for other in Base.metadata.sorted_tables:
        for fk in other.foreign_keys:
            if fk.column.table is not table:
                continue
            column = fk.parent
            for start in range(0, len(ids), 500):
                chunk = ids[start:start + 500]
                if column.nullable:
                    session.execute(
                        sa_update(other).where(column.in_(chunk)).values({column.name: None})
                    )
                else:
                    if "id" in other.c and other is not table:
                        child_ids = [
                            row_id
                            for (row_id,) in session.execute(
                                sa_select(other.c.id).where(column.in_(chunk))
                            )
                        ]
                        _detach_references(session, other, child_ids, depth + 1)
                    if other is not table:
                        session.execute(sa_delete(other).where(column.in_(chunk)))


@router.delete("/spaces/{space_id}", response_model=SpaceResponse)
def delete_space(
    space_id: str,
    move_to: str | None = None,
    session: Session = Depends(get_session),
):
    """Delete a space and everything in it, or, with `move_to`, move
    everything in it to that space first (owner, 0.3.31: "the option to
    delete all its contents, and the other to move its contents to a
    different space")."""
    if space_id in RESERVED_SPACE_IDS:
        raise HTTPException(400, "The default spaces cannot be deleted.")
    space = deps.get_or_404(session, Space, space_id, "That space could not be found.")
    if move_to:
        if move_to == space_id:
            raise HTTPException(400, "Pick a different space to move its contents to.")
        deps.get_or_404(session, Space, move_to, "The space to move to could not be found.")
        response = SpaceResponse.model_validate(space)
        _move_space_contents(session, space_id, move_to)
        session.delete(space)
        session.commit()
        from memorymap.search import index as search_index

        # Every moved row's index entry still names the old space.
        search_index.rebuild(session)
        session.commit()
        return response

    # Capture the response body before deleting: reading attributes off an
    # instance after session.delete()+commit() raises ObjectDeletedError,
    # since SQLAlchemy expires it and then finds no row to refresh from.
    response = SpaceResponse.model_validate(space)

    # **Deleting a space deletes what was in it.** Asked for directly: "make
    # sure that if a specific space is deleted too, that all the content
    # including notes files and images etc originating in that specific
    # space get deleted with it as well." This used to *reassign* every row
    # to "default", which is the opposite of what the word means, the notes
    # did not go away, they turned up in another space.
    #
    # impersonate_workspace(..., "all") disables the session's ambient
    # workspace filter for this block: a request carrying X-Workspace-ID for
    # some *other* space would otherwise AND that id into every DELETE, so
    # deleting "personal" while browsing "work" would remove nothing.
    #
    # Dependents before their parents, because the foreign keys are real
    # (a document delete once failed outright on its revisions). Files on
    # disk are unlinked after the commit: a row that is gone and a file that
    # is still there is recoverable; the reverse is not.
    from pathlib import Path

    from memorymap.core.database import (
        AskTurn, Attachment, Bookmark, Conversation, Document, DocumentAiEdit,
        DocumentBookmark, DocumentLink, DocumentRevision, EmbeddingRecord,
        EntityMention, EntryBookmark, EntryDate, EntryLink, EntryProperty, EntryRevision, MediaUpload,
        PageRead, Reminder, WhiteboardNode, WhiteboardObject, WhiteboardSketch,
    )

    from memorymap.entry import bin as other_bin

    config = deps.get_config()
    to_unlink: list[Path] = []
    #: The space's bin goes with it: a binned document or reminder is hidden
    #: from every ordinary read, so this block reads them on purpose.
    with impersonate_workspace(session, "all"), other_bin.including_binned(session):
        def rows(model):
            return session.query(model).filter_by(workspace_id=space_id)

        attachment_ids = [a.id for a in rows(Attachment).all()]
        to_unlink += [config.uploads_dir / a.stored_name for a in rows(Attachment).all()]
        upload_ids = [u.id for u in rows(MediaUpload).all()]
        to_unlink += [config.data_dir / "media" / u.filename for u in rows(MediaUpload).all()]
        document_ids = [d.id for d in rows(Document).all()]
        entry_ids = [e.id for e in rows(Entry).all()]
        bookmark_ids = [b.id for b in rows(Bookmark).all()]
        reminder_ids = [r.id for r in rows(Reminder).all()]

        # Every delete below is a query-level statement, which the search
        # index's flush hook never sees; without this the space's notes,
        # documents and reminders stayed findable from All spaces after the
        # space itself was gone (measured, tests/test_search_engine.py).
        from memorymap.search import index as search_index

        for model, ids in (
            (Attachment, attachment_ids), (MediaUpload, upload_ids),
            (Document, document_ids), (Entry, entry_ids),
            (Bookmark, bookmark_ids), (Reminder, reminder_ids),
        ):
            search_index.forget(session, model, ids)

        # The unscoped side tables: no workspace column of their own, only a
        # foreign key into a row that is about to go. Each is the table a
        # plain DELETE of its parent tripped over (real FKs, enforced).
        def purge(model, column, ids):
            if ids:
                session.query(model).filter(column.in_(ids)).delete(synchronize_session=False)

        for model, column in (
            (EntityMention, EntityMention.entry_id),
            (EmbeddingRecord, EmbeddingRecord.entry_id),
            (EntryRevision, EntryRevision.entry_id),
            (EntryDate, EntryDate.entry_id),
            (EntryProperty, EntryProperty.entry_id),
            (EntryBookmark, EntryBookmark.entry_id),
            (DocumentLink, DocumentLink.entry_id),
        ):
            purge(model, column, entry_ids)
        for model, column in (
            (DocumentBookmark, DocumentBookmark.document_id),
            (DocumentLink, DocumentLink.document_id),
            (DocumentAiEdit, DocumentAiEdit.document_id),
        ):
            purge(model, column, document_ids)
        purge(EntryBookmark, EntryBookmark.bookmark_id, bookmark_ids)
        purge(DocumentBookmark, DocumentBookmark.bookmark_id, bookmark_ids)

        # A note in *another* space can point at one of this space's
        # categories (the reason the old reassign code merged categories by
        # name). Those notes are not ours to delete; they just lose the
        # pointer, the same as if the category had been deleted on its own.
        category_ids = [c.id for c in rows(Category).all()]
        if category_ids:
            session.query(Entry).filter(Entry.category_id.in_(category_ids)).update(
                {"category_id": None}, synchronize_session=False
            )

        if attachment_ids:
            session.query(PageRead).filter(
                PageRead.kind == "attachment", PageRead.source_id.in_(attachment_ids)
            ).delete(synchronize_session=False)
        if upload_ids:
            session.query(PageRead).filter(
                PageRead.kind == "media", PageRead.source_id.in_(upload_ids)
            ).delete(synchronize_session=False)
        if document_ids:
            session.query(DocumentRevision).filter(
                DocumentRevision.document_id.in_(document_ids)
            ).delete(synchronize_session=False)

        # **Every reference into a doomed row, found from the schema, not a
        # list.** The list above is the tables someone remembered; the
        # owner's delete of a space still failed on `DELETE FROM entries`
        # with "FOREIGN KEY constraint failed" (0.3.31), from a table that
        # points at notes and was on no list. Whatever the schema says
        # points at a row about to go is cleared first: a nullable pointer
        # is emptied, a required one takes its row with it.
        doomed_models = (
            EntryLink, Attachment, AskTurn, Conversation, Reminder, Bookmark,
            WhiteboardSketch, WhiteboardObject, WhiteboardNode, Document,
            Entry, Category, MediaUpload,
        )
        for model in (*doomed_models, *workspace_scoped_models()):
            ids = [row_id for (row_id,) in rows(model).with_entities(model.id).all()] if hasattr(model, "id") else []
            _detach_references(session, model.__table__, ids)

        for model in doomed_models:
            rows(model).delete(synchronize_session=False)

        # Anything with WorkspaceMixin that the ordered list above does not
        # name: a model added later must not survive its space.
        for model in workspace_scoped_models():
            rows(model).delete(synchronize_session=False)

    session.delete(space)
    session.commit()
    for path in to_unlink:
        try:
            path.unlink(missing_ok=True)
        except OSError:
            pass  # the row is gone; a stray file is the recoverable failure
    return response


class MoveNotesBody(BaseModel):
    ids: list[int] = Field(min_length=1, max_length=500)


@router.post("/spaces/{space_id}/move-notes")
def move_notes_to_space(space_id: str, body: MoveNotesBody, session: Session = Depends(get_session)) -> dict:
    """Move these notes into one space (WORLD_CLASS_PLAN 5 item 5, section 8
    row 30; INBOX 1's "a Move to space bulk action").

    Only notes the request can see move: the ambient space filter reads them,
    so a selection made in one space cannot reach into another. A note keeps
    its category's *name*: categories are per space, so the target's category
    of that name is used, made when it has none. What hangs off the note in
    its old space comes with it (its files, its reminders, its fade score),
    and so do links whose both ends moved; a link to a note left behind stays
    where it was, as a space's delete leaves one. `from` is each note's old
    space, which is what an Undo sends back.
    """
    from memorymap.core.database import Attachment, EntryLink, NoteScore, Reminder
    from memorymap.entry import manager

    if space_id == "all":
        raise HTTPException(400, "Pick one space to move them to.")
    deps.get_or_404(session, Space, space_id, "That space could not be found.")
    wanted = list(dict.fromkeys(body.ids))
    entries = [
        e for e in session.scalars(sa_select(Entry).where(Entry.id.in_(wanted)))
        if (e.workspace_id or "default") != space_id
    ]
    if not entries:
        return {"moved": 0, "from": {}}
    names = manager.bulk_category_names(session, entries)
    moved_ids = [e.id for e in entries]
    before = {str(e.id): e.workspace_id or "default" for e in entries}
    with impersonate_workspace(session, space_id):
        for entry in entries:
            name = names.get(entry.category_id)
            if entry.category_id is not None and name:
                entry.category_id = manager.get_or_create_category(session, name, space_id).id
            entry.workspace_id = space_id
    with impersonate_workspace(session, "all"):
        for model in (Attachment, Reminder, NoteScore):
            for row in session.scalars(sa_select(model).where(model.entry_id.in_(moved_ids))):
                row.workspace_id = space_id
        for link in session.scalars(
            sa_select(EntryLink).where(
                EntryLink.source_entry_id.in_(moved_ids), EntryLink.target_entry_id.in_(moved_ids)
            )
        ):
            link.workspace_id = space_id
    manager.log_action(session, "moved", "entry", None, f"{len(entries)} note(s) to the space {space_id}")
    session.commit()
    return {"moved": len(entries), "from": before}
