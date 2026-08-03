"""Everything you made before, in one list (§4, §36F).

The Library is the app's *finding* surface, and the decision behind it is worth
stating because it is what makes it worth building at all: **it replaces two
surfaces rather than sitting beside them.** A "library" that duplicated the
Documents tab and the conversation sidebar would be a third place to look for
things that already had two, which is worse than no library. So the Documents
tab's list moves here, the chat sidebar's list moves here, and the tab bar gets
no longer — it was already at the width where another tab hurts (measured: it
wraps to a second row below about 1350px).

The list is assembled **here** rather than in `app.js` out of four fetches, for
the reason `routes_tasks.py` gives for background jobs: a surface that stitches
its own list from whatever endpoints happen to exist is a surface that silently
misses the next thing anybody adds. One shape, one place to add a kind to.

What it does *not* do is filter or sort. Those are the Library's first-class
controls and they have to feel instant as you type, which means the client owns
them and the server hands over the whole (bounded) list once.
"""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap.core.database import Attachment, Conversation, Document, Entry
from memorymap.core.deps import get_session

router = APIRouter(tags=["library"])

#: Per kind, not overall. A notebook with 300 documents and 4 chats should not
#: hand back 300 documents and no chats — every kind gets its own allowance, so
#: the filter chips are never empty for a reason nobody can see.
PER_KIND_LIMIT = 200

#: Enough of a thing to recognise it, not enough to render a card that scrolls.
PREVIEW_CHARS = 160


def _clip(text: str) -> str:
    text = " ".join((text or "").split())
    return text if len(text) <= PREVIEW_CHARS else text[: PREVIEW_CHARS - 1] + "…"


def _human_size(size: int) -> str:
    if size < 1024:
        return f"{size} B"
    if size < 1024 * 1024:
        return f"{size / 1024:.0f} KB"
    return f"{size / (1024 * 1024):.1f} MB"


def _documents(session: Session) -> list[dict]:
    rows = session.scalars(
        select(Document).order_by(Document.updated_at.desc()).limit(PER_KIND_LIMIT)
    )
    items = []
    for doc in rows:
        words = len(doc.content.split())
        items.append(
            {
                "kind": "document",
                "id": doc.id,
                "title": doc.title or "Untitled",
                "preview": _clip(doc.content),
                "updated_at": doc.updated_at.isoformat(),
                "detail": f"{words:,} word{'' if words == 1 else 's'}",
                # What "biggest" means for this kind. Deliberately not
                # normalised across kinds — comparing a document's words with
                # an image's bytes would be a number that sorts and means
                # nothing, so the sort is within a kind or across a mixed list
                # where the person can see what they are looking at.
                "size": words,
                "entry_id": None,
                "mime": None,
                "pinned": False,
            }
        )
    return items


def _chats(session: Session) -> list[dict]:
    rows = session.scalars(
        select(Conversation)
        .order_by(Conversation.pinned.desc(), Conversation.updated_at.desc())
        .limit(PER_KIND_LIMIT)
    )
    items = []
    for chat in rows:
        try:
            messages = json.loads(chat.messages)
        except (ValueError, TypeError):
            # A hand-edited or truncated row costs this chat's preview, not the
            # whole Library.
            messages = []
        first_question = next(
            (m.get("content", "") for m in messages if m.get("role") == "user"), ""
        )
        turns = len(messages) // 2
        items.append(
            {
                "kind": "chat",
                "id": chat.id,
                "title": chat.title or "Untitled chat",
                # The first question, because you remember what you asked far
                # more often than what the chat ended up being called — the
                # same reasoning the conversation list already used.
                "preview": _clip(first_question),
                "updated_at": chat.updated_at.isoformat(),
                "detail": f"{turns} turn{'' if turns == 1 else 's'}",
                "size": turns,
                "entry_id": None,
                "mime": None,
                "pinned": bool(chat.pinned),
            }
        )
    return items


def _images(session: Session) -> list[dict]:
    """Attached files, images first — but not images *only*.

    §4 says "images", and a Library that showed the photo you attached and
    silently hid the PDF beside it would be lying about what it holds. The
    filter is called Files for that reason, and images are what it mostly is.
    """
    rows = session.execute(
        select(Attachment, Entry)
        .join(Entry, Attachment.entry_id == Entry.id)
        .where(
            Entry.is_deleted == False,  # noqa: E712
            # An attachment on a private note is as private as the note. The
            # Library is a browsing surface and would otherwise be the one
            # place a locked-away note's contents show up in plain sight.
            Entry.is_private == False,  # noqa: E712
        )
        .order_by(Attachment.created_at.desc())
        .limit(PER_KIND_LIMIT)
    ).all()
    items = []
    for attachment, entry in rows:
        kind_word = (attachment.mime or "").split("/")[-1].upper() or "FILE"
        items.append(
            {
                "kind": "file",
                "id": attachment.id,
                "title": attachment.filename,
                # The note it hangs on: an attachment with no context is a
                # filename, and the reason you kept it is the note.
                "preview": _clip(entry.content),
                "updated_at": attachment.created_at.isoformat(),
                "detail": f"{_human_size(attachment.size)} · {kind_word}",
                "size": attachment.size,
                "entry_id": entry.id,
                "mime": attachment.mime,
                "pinned": False,
            }
        )
    return items


def _archive(session: Session) -> list[dict]:
    """The recycle bin, under its honest name.

    §4 lists an "archive" and this app has no separate archive — it has a bin
    that keeps notes until it is emptied. Inventing a second concept so the
    word matches would give the user two places deleted notes might be; showing
    the bin here is the same list from the surface built for finding things.
    """
    rows = session.scalars(
        select(Entry)
        .where(
            Entry.is_deleted == True,  # noqa: E712
            Entry.is_private == False,  # noqa: E712
        )
        .order_by(Entry.created_at.desc())
        .limit(PER_KIND_LIMIT)
    )
    items = []
    for entry in rows:
        items.append(
            {
                "kind": "archived",
                "id": entry.id,
                "title": _clip(entry.content)[:60] or "Empty note",
                "preview": _clip(entry.content),
                "updated_at": entry.created_at.isoformat(),
                "detail": "in the bin",
                "size": len(entry.content or ""),
                "entry_id": entry.id,
                "mime": None,
                "pinned": False,
            }
        )
    return items


@router.get("/library")
def library(session: Session = Depends(get_session)) -> dict:
    """Everything you made before, newest first within each kind.

    `counts` is sent alongside rather than left for the client to derive: the
    filter chips show them, and a chip that reads "Files 0" is a useful thing
    to see *before* pressing it — the alternative is pressing a chip to find
    out it was empty.
    """
    items = _documents(session) + _chats(session) + _images(session) + _archive(session)
    counts: dict[str, int] = {}
    for item in items:
        counts[item["kind"]] = counts.get(item["kind"], 0) + 1
    return {"items": items, "counts": counts}
