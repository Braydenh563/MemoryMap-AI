"""Phrases as filters (CHAT_PLAN section 2, the graph, library and settings
row): "connected to Harbor", "untouched since June", "tagged work",
"pinned", "edited last week" typed into the graph's or the Library's search
become filters, and the rest of the words stay a search.

`read(text, now)` gives `{filters, rest}`; `resolve(session, filters, now)`
gives the notes they leave. Days and stretches of days are the recogniser's
(`recognise.span`, `recognise.days_since`, decision 46): this file names the
verbs ("connected to", "untouched since") and never a date word.
`tests/fixtures/composer/filters_1010.json` is the 40-phrase set, at 1.0.

Settings are searched by what they do: `SETTING_WORDS` groups the words a
person says for one thing ("dark", "night", "theme"), served to the Settings
search (`GET /read/words`), which matches a setting when any word of a group
the query names is in it.
"""

from __future__ import annotations

import re
from datetime import date, datetime, time, timedelta

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from memorymap.ai import recognise

_CONNECTED = re.compile(r"\b(?:connected|linked|links?|joined|related)\s+(?:to|with)\s+(?!nothing\b)(.+?)(?=\s+(?:and|that|which|tagged|edited|created|untouched)\b|[,;]|$)", re.I)
_ORPHAN = re.compile(r"\b(?:connected to nothing|not connected(?: to anything)?|unlinked|no links|orphans?|on their own|with no links)\b", re.I)
_UNTOUCHED = re.compile(r"\b(?:untouched|not (?:touched|edited|changed|opened|updated|looked at)|unchanged|stale|forgotten|neglected)\s+(since|for|in)\s+(.+?)(?=\s+(?:and|that|tagged|connected)\b|[,;]|$)", re.I)
_EDITED = re.compile(r"\b(?:edited|changed|updated|touched|modified)\s+(.+?)(?=\s+(?:and|that|tagged|connected)\b|[,;]|$)", re.I)
_CREATED = re.compile(r"\b(?:created|written|made|added|new)\s+(.+?)(?=\s+(?:and|that|tagged|connected)\b|[,;]|$)", re.I)
_TAG = re.compile(r"(?:\btagged\s+(?:with\s+)?|\bwith the tag\s+|\btag\s+|(?<![\w&])#)([A-Za-z][\w-]{0,40})", re.I)
_CATEGORY = re.compile(r"\b(?:filed (?:in|under)|in the category|category|in the folder|under)\s+([A-Za-z][\w -]{0,40}?)(?=\s+(?:and|that|tagged|connected|edited)\b|[,;]|$)", re.I)
_PINNED = re.compile(r"\b(?:pinned|starred|favourites?|favorites?)\b", re.I)
_HAS = (
    ("image", re.compile(r"\bwith (?:a )?(?:pictures?|images?|photos?|screenshots?)\b", re.I)),
    ("file", re.compile(r"\bwith (?:an? )?(?:attachments?|files?|pdfs?)\b", re.I)),
    ("reminder", re.compile(r"\bwith (?:a )?reminders?\b", re.I)),
    ("link", re.compile(r"\bwith (?:a )?(?:web )?(?:links?|urls?)\b", re.I)),
)
_KINDS = (("board", re.compile(r"\b(?:boards?|whiteboards?|mind ?maps?|maps)\b", re.I)),)
_MENTION = re.compile(r"\b(?:mentioning|mentions|naming|that mention)\s+(.+?)(?=\s+(?:and|that|tagged|connected|edited)\b|[,;]|$)", re.I)
_FILLER = re.compile(r"\b(?:show|me|all|the|notes?|ones|everything|anything|that|which|are|is|were|was|only|just|my|and|with|find|list)\b", re.I)


def _past_day(phrase: str, now: datetime) -> date | None:
    """The first day of a stretch said in the past ("june", "last week"), or
    the day a length back ("3 months" before now)."""
    today = now.date()
    found = recognise.span(phrase, today, "past")
    if found is not None:
        return found[0]
    days = recognise.days_since(f"{phrase} ago", now)
    return today - timedelta(days=days) if days is not None else None


def _window(phrase: str, now: datetime) -> tuple[date, date] | None:
    from memorymap.search import query

    understood = query.understand(phrase, now)
    if understood.since is None:
        return None
    return understood.since, understood.until or now.date()


def read(text: str, now: datetime) -> dict:
    """`{filters: [{kind, ...}], rest}`; no filter when nothing is read."""
    raw = re.sub(r"\s+", " ", str(text or "")).strip()
    filters: list[dict] = []
    taken: list[tuple[int, int]] = []

    def free(found: re.Match) -> bool:
        return not any(found.start() < end and start < found.end() for start, end in taken)

    def take(found: re.Match, item: dict) -> None:
        filters.append({**item, "said": found.group(0).strip()})
        taken.append((found.start(), found.end()))

    if found := _ORPHAN.search(raw):
        take(found, {"kind": "orphan"})
    elif found := _CONNECTED.search(raw):
        name = re.sub(r"^(?:the|my|a|an)\s+", "", found.group(1).strip(" .\"'“”"), flags=re.I)
        take(found, {"kind": "connected", "name": name})
    if found := _UNTOUCHED.search(raw):
        phrase = found.group(2).strip()
        day = _past_day(phrase, now)
        if day is not None:
            take(found, {"kind": "untouched", "since": day.isoformat()})
    for pattern, kind in ((_EDITED, "edited"), (_CREATED, "created")):
        if (found := pattern.search(raw)) and free(found):
            span = _window(found.group(1), now)
            if span is not None:
                take(found, {"kind": kind, "start": span[0].isoformat(), "end": span[1].isoformat()})
    for found in _TAG.finditer(raw):
        take(found, {"kind": "tag", "name": found.group(1).lower()})
    if found := _CATEGORY.search(raw):
        take(found, {"kind": "category", "name": found.group(1).strip()})
    if found := _PINNED.search(raw):
        take(found, {"kind": "pinned"})
    for name, pattern in _HAS:
        if found := pattern.search(raw):
            take(found, {"kind": "has", "what": name})
    for name, pattern in _KINDS:
        if found := pattern.search(raw):
            take(found, {"kind": "type", "what": name})
    if found := _MENTION.search(raw):
        take(found, {"kind": "mention", "name": found.group(1).strip()})
    rest = raw
    for start, end in sorted(taken, reverse=True):
        rest = rest[:start] + " " + rest[end:]
    rest = re.sub(r"\s+", " ", _FILLER.sub(" ", rest)).strip(" ,;.") if filters else raw
    return {"filters": filters, "rest": rest}


def _midnight(day: str) -> datetime:
    return datetime.combine(date.fromisoformat(day), time.min)


def resolve(session: Session, filters: list[dict], now: datetime) -> list[int]:
    """The notes every filter leaves, newest first (at most 2,000)."""
    from memorymap.core.database import LIKE_ESCAPE, Category, Entry, EntryLink, Reminder, like_escape
    from memorymap.entry.manager import find_by_wiki_name

    query = select(Entry.id).where(Entry.is_deleted == False, Entry.is_draft == False)  # noqa: E712
    for item in filters:
        kind = item["kind"]
        if kind in ("connected", "orphan"):
            links = session.execute(select(EntryLink.source_entry_id, EntryLink.target_entry_id)).all()
            if kind == "orphan":
                linked = {a for a, _ in links} | {b for _, b in links}
                query = query.where(Entry.id.not_in(linked) if linked else True)
                continue
            hub = find_by_wiki_name(session, item["name"])
            if hub is None:
                like = f"%{like_escape(item['name'])}%"
                hub = session.scalars(select(Entry).where(Entry.is_deleted == False, Entry.content.ilike(like, escape=LIKE_ESCAPE))  # noqa: E712
                                      .order_by(Entry.id).limit(1)).first()
            near = {b for a, b in links if hub and a == hub.id} | {a for a, b in links if hub and b == hub.id}
            query = query.where(Entry.id.in_(near))
        elif kind == "untouched":
            query = query.where(Entry.updated_at < _midnight(item["since"]))
        elif kind in ("edited", "created"):
            column = Entry.updated_at if kind == "edited" else Entry.created_at
            query = query.where(column >= _midnight(item["start"]), column < _midnight(item["end"]) + timedelta(days=1))
        elif kind == "tag":
            query = query.where(Entry.tags.ilike(f'%"{like_escape(item["name"])}"%', escape=LIKE_ESCAPE))
        elif kind == "category":
            query = query.join(Category, Category.id == Entry.category_id).where(
                Category.name.ilike(like_escape(item["name"]), escape=LIKE_ESCAPE))
        elif kind == "pinned":
            query = query.where(Entry.pinned == True)  # noqa: E712
        elif kind == "type":
            query = query.where(Entry.is_board == True)  # noqa: E712
        elif kind == "mention":
            query = query.where(Entry.content.ilike(f"%{like_escape(item['name'])}%", escape=LIKE_ESCAPE))
        elif kind == "has":
            what = item["what"]
            if what == "image":
                query = query.where(Entry.content.ilike("%![%](%"))
            elif what == "file":
                query = query.where(or_(Entry.content.ilike("%/media/%"), Entry.content.ilike("%.pdf%")))
            elif what == "link":
                query = query.where(Entry.content.ilike("%http%"))
            elif what == "reminder":
                query = query.where(Entry.id.in_(select(Reminder.entry_id).where(Reminder.entry_id.is_not(None))))
    return list(session.scalars(query.order_by(Entry.id.desc()).limit(2000)))


#: Words a person says for one thing in Settings, each group searched as one:
#: what a setting does, not only what its label says.
SETTING_WORDS: tuple[tuple[str, ...], ...] = (
    ("dark", "night", "theme", "light mode", "dim", "black"),
    ("text size", "font size", "bigger", "smaller", "zoom", "larger", "scale"),
    ("password", "lock", "pin", "passcode", "sign in", "log in", "unlock"),
    ("backup", "back up", "copy", "restore", "export", "save a copy"),
    ("model", "ollama", "llm", "ai", "local model", "brain"),
    ("battery", "power", "save power", "energy", "laptop", "unplugged"),
    ("privacy", "private", "tracking", "telemetry", "data", "share"),
    ("notification", "notify", "alert", "remind", "sound", "ding"),
    ("language", "spelling", "spellcheck", "dictionary", "proofread"),
    ("phone", "mobile", "other device", "lan", "network", "wifi"),
    ("encrypt", "encryption", "vault", "secret", "secure"),
    ("motion", "animation", "reduce motion", "moving", "still"),
    ("colour", "color", "accent", "palette", "look", "appearance"),
    ("shortcut", "keyboard", "hotkey", "keys", "key binding"),
    ("delete", "bin", "trash", "recycle", "remove"),
    ("import", "obsidian", "markdown files", "bring in", "vault import"),
    ("search", "find", "similar", "semantic", "embedding"),
    ("companion", "atlas", "buddy", "mascot", "character"),
)


#: Words of a request that name no setting ("how do I turn off the
#: animations"): left out of the Settings search, so the rest must match.
SETTING_FILLER = frozenset(
    """a an the my me i to of for in on off how do does can where is are it
    change set make turn stop disable enable switch want please settings
    setting option options notes note notebook everything all""".split()
)


def setting_words() -> list[list[str]]:
    return [list(group) for group in SETTING_WORDS]

