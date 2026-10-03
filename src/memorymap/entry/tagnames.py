"""The one rule for what a list of tags may hold.

Its own module, with no imports from the app, because two layers need the
same rule and neither may import the other: `api/schemas.py` (every HTTP
write of tags) and `entry/manager.py` (every in-process write: the AI tools,
the librarian, imports, renames). A rule kept in two copies is how this bug
happened in the first place: the schema already dropped blanks while the
manager and the tag rename did not, so a blank tag still reached four notes
through `POST /tags/rename`.
"""

from __future__ import annotations

from collections.abc import Iterable

#: A tag is a label. 50,000 characters was once accepted as one, which is a
#: chip 50,000 characters wide in every list the note appears in. 60 is twice
#: what `librarian.py` already allows itself when it suggests one.
MAX_TAG_LENGTH = 60


def normalise_tags(tags: Iterable[object] | None) -> list[str]:
    """Trimmed, clipped, blank-free, and each tag once regardless of case.

    The first spelling wins: a note tagged "Idea" that is then sent "idea" as
    well keeps "Idea", because that is the spelling the person chose first
    and the one already on screen. Folding by `casefold` rather than `lower`
    so "Straße" and "STRASSE" are the same label, as a reader would take
    them. Stored as sent, ['Idea', 'idea', 'IDEA'] was three chips and three
    rows in the tag list for one idea (measured 2026-10-03).

    Clipped rather than refused: a save that fails because one tag was long
    throws away the note, which is a worse answer than a shortened tag.
    """
    out: list[str] = []
    seen: set[str] = set()
    for raw in tags or ():
        if raw is None:
            continue
        tag = str(raw).strip()[:MAX_TAG_LENGTH].strip()
        if not tag:
            continue
        key = tag.casefold()
        if key in seen:
            continue
        seen.add(key)
        out.append(tag)
    return out
