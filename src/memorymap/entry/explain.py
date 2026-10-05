"""Explain this note (WORLD_CLASS_PLAN section 17 row 6).

The owner's first notes asked for an app that "explains what you entered". This
builds the script a note's Explain action speaks: the note's own words first,
then what it is filed under, then every note it is linked to, which way the
link points, and why, from the link's own reason.

No model: the reasons are already written on the links (by the person, or
deduced when the link was made), so the script is the same with Atlas off and
costs nothing. A private note's words and a linked private note's title never
leave the vault for a script that is then spoken and shown.
"""

from __future__ import annotations

import re

from sqlalchemy.orm import Session

from memorymap.core.database import Entry
from memorymap.entry import manager

#: How much of the body is read aloud before "the note goes on". A note read in
#: full is a lecture; this is about twenty seconds of speech.
BODY_CHARS = 600
#: Links named in the script. The rest are counted ("and 4 more").
LINKS_NAMED = 6

_MARKS = re.compile(r"[*_`#>]+|~~")
_IMAGE = re.compile(r"!\[[^\]]*\]\([^)]*\)")
_LINK = re.compile(r"\[([^\]]*)\]\([^)]*\)")
_FENCE = re.compile(r"```.*?```", re.S)


def _spoken(text: str) -> str:
    """Markdown as plain words: no marks, links as their text, images gone."""
    text = _FENCE.sub(" ", text or "")
    text = _IMAGE.sub(" ", text)
    text = _LINK.sub(r"\1", text)
    text = manager.wiki_plain(text)
    text = _MARKS.sub("", text)
    return re.sub(r"\s+", " ", text).strip()


def _cut(text: str, limit: int) -> tuple[str, bool]:
    """`text` up to `limit` characters, ending on a sentence when one is near."""
    if len(text) <= limit:
        return text, False
    window = text[:limit]
    stop = max(window.rfind(". "), window.rfind("? "), window.rfind("! "))
    if stop >= limit // 2:
        return window[: stop + 1], True
    return window.rsplit(" ", 1)[0].rstrip(",;:") + ".", True


def _sentence(text: str) -> str:
    text = text.strip()
    return text if text[-1:] in ".?!" else text + "."


def explain(session: Session, entry: Entry) -> dict:
    """`{text, title, links}` for one note."""
    from memorymap.entry.properties import strip as strip_properties

    raw = manager.readable_content(entry)
    if entry.is_private and raw.startswith("Private note: unlock"):
        return {
            "title": "Private note",
            "text": "This note is private. Unlock the app to hear it.",
            "links": [],
        }
    title = manager.extract_title(raw) or ""
    body = _spoken(strip_properties(raw))
    # The title is the note's first line when it wrote one; do not say it twice.
    if title and body.lower().startswith(_spoken(title).lower()):
        body = body[len(_spoken(title)):].strip()
    spoken_title = _spoken(title)

    parts: list[str] = []
    if spoken_title:
        parts.append(_sentence(spoken_title))
    if body:
        said, cut = _cut(body, BODY_CHARS)
        parts.append(_sentence(said))
        if cut:
            parts.append("The note goes on.")
    elif not spoken_title:
        parts.append("This note is empty.")

    category = manager.category_name_for(session, entry)
    tags = manager.entry_tags(entry)
    where = f"It is filed under {category}"
    if tags:
        where += f", tagged {', '.join(tags[:5])}"
    parts.append(where + ".")

    links: list[dict] = []
    for link, other in manager.links_for_entry(session, entry):
        if other.is_deleted:
            continue
        # The fact of a link is not secret; a private note's words are.
        label = "a private note" if other.is_private else (
            _spoken(manager.extract_title(manager.readable_content(other)) or "")
            or _spoken(strip_properties(manager.readable_content(other)))[:60]
            or "an untitled note"
        )
        links.append(
            {
                "link_id": link.id,
                "id": other.id,
                "label": label,
                "direction": "out" if link.source_entry_id == entry.id else "in",
                "reason": (link.reason or "").strip() if not other.is_private else "",
            }
        )

    if not links:
        parts.append("It is not linked to any other note yet.")
    else:
        count = "1 note" if len(links) == 1 else f"{len(links)} notes"
        parts.append(f"It links to {count}.")
        for row in links[:LINKS_NAMED]:
            who = row["label"]
            because = f", because {row['reason'].rstrip('.')}" if row["reason"] else ""
            if row["direction"] == "out":
                parts.append(f"It points at {who}{because}.")
            else:
                parts.append(f"{who[:1].upper() + who[1:]} points at it{because}.")
        if len(links) > LINKS_NAMED:
            parts.append(f"And {len(links) - LINKS_NAMED} more.")

    return {"title": spoken_title, "text": " ".join(parts), "links": links}
