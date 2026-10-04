"""Live queries over the notebook's structure (GRAPH_PLAN KG7, INBOX 528).

The notes filter already reads `tag:`, `cat:`, `is:` and words in the
browser. The structure (a note's type and properties, its links and their
kinds, the people and things it names) lives in tables the browser does not
hold, so this is the one evaluator for it: the Notes list, the table view and
the graph all ask `GET /entries/query` and take the same ids.

Grammar, every term ANDed, `-` before any term negates it:

    type:meeting            the note's `type:` property
    prop:status             has the property at all
    prop:status=open        a value (also != ; > >= < <= compare numbers or dates)
    links:[[Kiln plan]]     linked with that note, either way (or links:Kiln)
    rel:supports            has a link of that kind (a key or a name)
    entity:"Sam Lee"        names that person or thing (or an alias)
    tag:x                   carries the tag (or a tag under it)
    word, "a phrase"        in the text (never a private note's)
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from memorymap.core.database import Entity, EntityMention, Entry, EntryLink, EntryProperty

STRUCTURAL = ("type", "prop", "links", "rel", "entity")
_TOKEN = re.compile(r'(-?)(?:(\w+):)?(\[\[[^\]]{1,120}\]\]|"[^"]{1,200}"|\S+)')
_OPERATORS = ("!=", ">=", "<=", "=", ">", "<")


def _split_compare(text: str) -> tuple[str, str, str] | None:
    """`key<op>value`, split at the first operator character: a plain scan
    rather than a regex, which a scanner reads as a markup filter."""
    at = next((i for i, ch in enumerate(text) if ch in "=<>!"), -1)
    if not 1 <= at <= 60:
        return None
    op = next((o for o in _OPERATORS if text.startswith(o, at)), None)
    return (text[:at], op, text[at + len(op):]) if op else None


@dataclass(frozen=True)
class Term:
    kind: str
    value: str
    key: str | None = None
    op: str = "="
    negate: bool = False


def _unwrap(text: str) -> str:
    text = text.strip()
    if text.startswith("[[") and text.endswith("]]"):
        text = text[2:-2]
    if len(text) >= 2 and text[0] == text[-1] == '"':
        text = text[1:-1]
    return text.strip()


def parse(raw: str) -> list[Term]:
    terms: list[Term] = []
    for match in _TOKEN.finditer(raw or ""):
        negate, kind, rest = match.group(1) == "-", (match.group(2) or "").lower(), match.group(3)
        if kind == "prop":
            compare = _split_compare(_unwrap(rest)) if not rest.startswith('"') else None
            if compare:
                key, op, value = compare
                terms.append(Term("prop", _unwrap(value), key.strip().lower(), op, negate))
            elif _unwrap(rest):
                terms.append(Term("prop", "", _unwrap(rest).lower(), "has", negate))
        elif kind in ("type", "links", "rel", "entity", "tag"):
            value = _unwrap(rest)
            if value:
                terms.append(Term(kind, value.lstrip("#") if kind == "tag" else value, None, "=", negate))
        elif kind:
            # Another app operator (cat:, is:, before:): the browser's.
            continue
        else:
            value = _unwrap(rest).lower()
            if value:
                terms.append(Term("word", value, None, "=", negate))
    return terms


def is_structural(terms: list[Term]) -> bool:
    return any(t.kind in STRUCTURAL for t in terms)


def _number(text: str) -> float | None:
    try:
        return float(text)
    except (TypeError, ValueError):
        return None


def _prop_ids(session: Session, term: Term) -> set[int]:
    rows = session.execute(
        select(EntryProperty.entry_id, EntryProperty.value, EntryProperty.number, EntryProperty.date).where(
            EntryProperty.key == term.key
        )
    ).all()
    if term.op == "has":
        return {r.entry_id for r in rows}
    want = term.value.casefold()
    number = _number(term.value)
    out: set[int] = set()
    for entry_id, value, num, when in rows:
        text = (value or "").casefold()
        if term.op == "=":
            hit = text == want or text == f"[[{want}]]"
        elif term.op == "!=":
            hit = text != want
        else:
            left = num if number is not None else (when.date().isoformat() if when else None)
            right = number if number is not None else term.value
            if left is None:
                continue
            hit = {">": left > right, ">=": left >= right, "<": left < right, "<=": left <= right}[term.op]
        if hit:
            out.add(entry_id)
    return out


def _ids_for(session: Session, term: Term, everyone: dict[int, Entry]) -> set[int]:
    from memorymap.entry import manager

    if term.kind == "type":
        return _prop_ids(session, Term("prop", term.value, "type", "="))
    if term.kind == "prop":
        return _prop_ids(session, term)
    if term.kind == "links":
        target = manager.find_by_wiki_name(session, term.value.lower())
        if target is None:
            return set()
        rows = session.execute(
            select(EntryLink.source_entry_id, EntryLink.target_entry_id).where(
                or_(EntryLink.source_entry_id == target.id, EntryLink.target_entry_id == target.id)
            )
        ).all()
        return {a if b == target.id else b for a, b in rows}
    if term.kind == "rel":
        want = term.value.casefold()
        keys = {
            key for key, kind in manager.relation_types(session).items()
            if want in (key.casefold(), kind["name"].casefold(), (kind["inverse"] or "").casefold())
        }
        rows = session.execute(
            select(EntryLink.source_entry_id, EntryLink.target_entry_id).where(EntryLink.link_type.in_(keys))
        ).all() if keys else []
        return {i for pair in rows for i in pair}
    if term.kind == "entity":
        want = term.value.casefold()
        ids = [
            e.id for e in session.scalars(select(Entity).where(Entity.merged_into.is_(None)))
            if e.name.casefold() == want or want in {str(a).casefold() for a in (e.aliases or [])}
        ]
        return set(session.scalars(select(EntityMention.entry_id).where(EntityMention.entity_id.in_(ids)))) if ids else set()
    if term.kind == "tag":
        return {
            i for i, e in everyone.items()
            if any(t.lower() == term.value.lower() or t.lower().startswith(f"{term.value.lower()}/") for t in manager.entry_tags(e))
        }
    # A word or a phrase, in a readable note's text.
    return {i for i, e in everyone.items() if not e.is_private and term.value in (e.content or "").casefold()}


def run(session: Session, raw: str) -> list[int]:
    """The ids of the live, non-draft notes that match every term, newest
    first; `[]` for a query with no terms."""
    terms = parse(raw)
    if not terms:
        return []
    everyone = {
        e.id: e
        for e in session.scalars(
            select(Entry).where(Entry.is_deleted.is_(False), Entry.is_draft.is_(False), Entry.is_board.is_(False))
        )
    }
    ids = set(everyone)
    for term in terms:
        hits = _ids_for(session, term, everyone)
        ids = ids - hits if term.negate else ids & hits
    return sorted(ids, reverse=True)
