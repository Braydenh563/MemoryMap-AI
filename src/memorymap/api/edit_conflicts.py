"""Two windows, one note: the optimistic check on a save (WORLD_CLASS_PLAN 22.1 item 5).

Every read of a note or a document carries `content_hash`, the hash of the
text it shows. An editor that saves sends back the hash of the text it
started from as `base_hash`; if the text on the server is no longer that
text (another window, another device on the LAN or the agent saved in
between), the save is refused with 409 and the text that is there, so the
editor can offer "keep mine", "take theirs" or "compare" instead of the
later save silently overwriting the earlier one.

The text, not `updated_at`, because `Entry.updated_at` moves on every
write to the row (a pin, the AI filing the note, a link resolved) and each
of those would read as a conflict with the person typing. Two saves of the
same text are not a conflict either: nothing would be lost.

A save that sends no `base_hash` is not checked, so every writer that does
not edit from an open copy (the agent's tools, undo, a restore, a checkbox
ticked on a card) behaves exactly as before.
"""

from __future__ import annotations

import hashlib
from collections.abc import Callable
from typing import Any

from fastapi import HTTPException

#: The error's machine name, which the frontend keys its prompt on.
EDIT_CONFLICT = "edit_conflict"


def content_hash(text: str | None) -> str:
    """A short, stable fingerprint of a text: 16 hex characters of SHA-256.

    Sixty-four bits is far past what two versions of one note could collide
    in, and short enough to ride on every list row for free.
    """
    return hashlib.sha256((text or "").encode("utf-8")).hexdigest()[:16]


def refuse_if_stale(
    *,
    base_hash: str | None,
    current_text: str | None,
    new_text: str | None,
    current: Callable[[], Any],
    noun: str,
) -> None:
    """Raise 409 when a save started from text that is no longer there.

    `current` builds the object as a read would return it (a Pydantic model
    or a dict), sent back so the editor can show or take it without a second
    request; a callable, so a save that passes costs no second read.
    """
    if not base_hash or new_text is None:
        return
    if content_hash(current_text) == base_hash or (current_text or "") == new_text:
        return
    body = current()
    body = body.model_dump(mode="json") if hasattr(body, "model_dump") else body
    raise HTTPException(
        status_code=409,
        detail={
            "code": EDIT_CONFLICT,
            "message": f"This {noun} was changed in another window since you started editing it.",
            "current": body,
        },
    )
