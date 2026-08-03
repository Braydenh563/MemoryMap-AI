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

from memorymap.core.database import (
    Attachment,
    AuditLog,
    Category,
    Conversation,
    Document,
    Entry,
)
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


def _notes(session: Session) -> list[dict]:
    """Your live notes.

    The Notes tab is where you *work with* them; this is where you manage them
    — the same distinction the Library draws everywhere else. It is what makes
    the bulk controls mean anything: selecting nine notes and retagging them is
    a management act, and there was nowhere in the app to do it across kinds.

    Private notes appear as a *count* and never as content: hiding them
    entirely would make the Library quietly disagree with the notebook's own
    total, and showing their text would defeat the encryption.
    """
    rows = session.execute(
        select(Entry, Category.name)
        .outerjoin(Category, Entry.category_id == Category.id)
        .where(Entry.is_deleted == False)  # noqa: E712
        .order_by(Entry.pinned.desc(), Entry.created_at.desc())
        .limit(PER_KIND_LIMIT)
    ).all()
    items = []
    for entry, category in rows:
        private = bool(getattr(entry, "is_private", False))
        text = "" if private else (entry.content or "")
        items.append(
            {
                "kind": "note",
                "id": entry.id,
                "title": (_clip(text)[:60] if text else "🔒 Private note") or "Empty note",
                "preview": "" if private else _clip(text),
                "updated_at": entry.created_at.isoformat(),
                "detail": category or "Uncategorised",
                "size": len(text),
                "entry_id": entry.id,
                "mime": None,
                "pinned": bool(entry.pinned),
                "private": private,
            }
        )
    return items


#: What the audit log's verbs mean to a person. The raw values are the app's
#: own vocabulary ("queried", "purged") and reading them back is how a log
#: becomes something only its author can use.
_ACTION_WORDS = {
    "created": "Created",
    "edited": "Edited",
    "deleted": "Moved to the bin",
    "restored": "Restored",
    "purged": "Deleted for good",
    "queried": "Asked",
    "linked": "Linked",
    "unlinked": "Unlinked",
    "pinned": "Pinned",
    "renamed": "Renamed",
    "merged": "Merged",
}

#: What the log's *nouns* are called, article included.
#:
#: The first version glued the verb to the raw `entity_type` and produced
#: "Edited a preferences" and "Unlocked a user". A record of what you did that
#: is written in the schema's vocabulary is a record only its author can read,
#: which is the same reason the verbs above are translated — and getting it
#: half right is arguably worse, because it reads as a bug rather than as
#: jargon. The article lives in the phrase so uncountable things can simply not
#: have one, and an unknown type falls back to itself with no article rather
#: than to broken grammar.
_ENTITY_WORDS = {
    "entry": "a note",
    "category": "a category",
    "document": "a document",
    "conversation": "a chat",
    "chat": "a chat",
    "reminder": "a reminder",
    "skill": "a skill",
    "tag": "a tag",
    "attachment": "a file",
    "preferences": "your settings",
    "user": "the notebook",
    "recycle_bin": "the bin",
}


def _activity(session: Session) -> list[dict]:
    """What you did, as a kind rather than as a panel.

    It was behind a button in the Notes sidebar, which is a strange place for a
    record of everything you did *anywhere* — and a list of things you did is
    the same shape as a list of things you made, so it costs one entry in this
    function rather than a surface of its own.
    """
    rows = session.scalars(
        select(AuditLog).order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).limit(
            PER_KIND_LIMIT
        )
    )
    items = []
    for row in rows:
        word = _ACTION_WORDS.get(row.action, row.action.capitalize())
        thing = _ENTITY_WORDS.get(row.entity_type, row.entity_type)
        items.append(
            {
                "kind": "activity",
                "id": row.id,
                "title": f"{word} {thing}",
                "preview": _clip(row.detail or ""),
                "updated_at": row.created_at.isoformat(),
                "detail": row.entity_type,
                # An event has no size. Its recency is the only ordering that
                # means anything, and "biggest first" falls back to it.
                "size": 0,
                "entry_id": row.entity_id if row.entity_type == "entry" else None,
                "mime": None,
                "pinned": False,
            }
        )
    return items


def _tags(session: Session) -> list[dict]:
    """Tags, with how many notes carry each.

    A tag manager is a finding surface behind a sidebar button, which is the
    exact description of everything else that moved here. Renaming and merging
    still happen through /tags — this is the list, not a second implementation.
    """
    from memorymap.entry import manager

    counts = manager.all_tags(session)
    return [
        {
            "kind": "tag",
            "id": index,
            "title": name,
            "preview": "",
            # Tags have no timestamp of their own. The list is sorted by use,
            # and this keeps "newest first" from shuffling it into nonsense.
            "updated_at": "",
            "detail": f"{count} note{'' if count == 1 else 's'}",
            "size": count,
            "entry_id": None,
            "mime": None,
            "pinned": False,
        }
        for index, (name, count) in enumerate(counts.items())
    ]


def _overview(session: Session, items: list[dict]) -> dict:
    """The state of the notebook, in the numbers a management screen opens with.

    Derived from the list that was just built wherever possible, so the panel
    and the grid can never disagree — a header saying "12 documents" above a
    grid showing 11 is worse than no header.
    """
    kinds: dict[str, int] = {}
    for item in items:
        kinds[item["kind"]] = kinds.get(item["kind"], 0) + 1
    stored = sum(item["size"] for item in items if item["kind"] == "file")
    private = sum(1 for item in items if item.get("private"))
    return {
        "notes": kinds.get("note", 0),
        "private_notes": private,
        "documents": kinds.get("document", 0),
        "chats": kinds.get("chat", 0),
        "files": kinds.get("file", 0),
        "tags": kinds.get("tag", 0),
        "binned": kinds.get("archived", 0),
        "attachment_bytes": stored,
        "attachment_size": _human_size(stored),
        "words": sum(
            item["size"] for item in items if item["kind"] == "document"
        ),
    }


@router.get("/library")
def library(session: Session = Depends(get_session)) -> dict:
    """Everything you made, newest first within each kind.

    One call for seven kinds, because the Library is now the app's management
    screen rather than a browser for two lists: a client assembling this from
    seven endpoints would fire seven requests to paint one page and would still
    miss the eighth kind the next person adds.

    `counts` is sent alongside rather than left for the client to derive: the
    filter chips show them, and a chip reading "Files 0" is a useful thing to
    see *before* pressing it. `overview` is the same argument one level up.
    """
    items = (
        _notes(session)
        + _documents(session)
        + _chats(session)
        + _images(session)
        + _tags(session)
        + _archive(session)
        + _activity(session)
    )
    counts: dict[str, int] = {}
    for item in items:
        counts[item["kind"]] = counts.get(item["kind"], 0) + 1
    return {
        "items": items,
        "counts": counts,
        "overview": _overview(session, items),
    }
