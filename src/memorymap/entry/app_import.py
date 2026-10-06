"""Bringing notes in from another app: Notion, Obsidian, Evernote and Apple
Notes (WORLD_CLASS_PLAN H6 and 5.7, row 25).

One reader per app, each turning that app's export into the same plain
record (`Imported`), and one writer (`write`) that makes the notes. The
readers never touch the database and the writer never parses a file, so a
fifth app is one more reader.

**Idempotent by source.** Every note carries a key that names where it came
from, stored in `Entry.source_path` as `<app>:<key>`: Notion's page id,
Evernote's own note fingerprint (title, created time and the start of its
text), the path inside an Obsidian vault or an Apple Notes export. Importing
the same export twice makes nothing the second time; a note whose source
moved on is still the note the person may have edited since, so it is left
alone rather than overwritten, and the summary says how many were already
there. `source_path` is also what `manager.came_from_outside` reads, so an
imported note is text from outside for the agent's injection guard.

**What each export looks like** (checked against the apps' own exports):

- *Notion*, "Markdown & CSV": a zip (sometimes a zip of zips) of
  ``Page Title <32 hex>.md`` files, sub-pages in a folder of the same name,
  links between pages as relative ``.md`` paths. HTML exports are read the
  same way. Database CSVs are the rows' table; their rows are also pages, so
  the CSVs themselves are left out and said so.
- *Obsidian*: a vault, as a zip or as the files themselves with their
  relative paths. YAML front matter gives the category and tags; the
  ``[[wiki links]]`` are kept as written, which this app reads natively.
- *Evernote*: ``.enex``, one XML file per notebook, each ``<note>`` with its
  title, ENML body (XHTML), created time and tags. Parsed with defusedxml
  (no entity expansion, no external fetches); the notebook's file name is
  the category.
- *Apple Notes*: Apple has no bulk export, so this reads what the common
  exporters write: one ``.html``, ``.md`` or ``.txt`` per note in a folder
  per Notes folder. The folder is the category.
"""

from __future__ import annotations

import hashlib
import io
import posixpath
import re
import zipfile
from dataclasses import dataclass, field
from datetime import datetime
from urllib.parse import unquote

SOURCES = ("notion", "obsidian", "evernote", "apple")
LABELS = {"notion": "Notion", "obsidian": "Obsidian", "evernote": "Evernote", "apple": "Apple Notes"}

#: Per file, and over a whole archive once unpacked: a zip bomb stops here.
MAX_FILE_BYTES = 5 * 1024 * 1024
MAX_ARCHIVE_BYTES = 200 * 1024 * 1024
MAX_NOTES = 5000

#: Every pattern here runs on an uploaded file, so none may backtrack
#: quadratically (CodeQL's `py/polynomial-redos`; the final scan measured
#: 2 to 10 s on 20 to 180 KB of the old shapes): a run that could restart at
#: every position is bounded by a character it may not contain (`[^\[\]]`,
#: `[^<>]`), and the Notion id is a fixed-width tail, not a regex.
_NOTION_LINK = re.compile(r"\[([^\[\]]*)\]\(([^()\[\]\s]+?\.(?:md|html))\)")
_HEX = frozenset("0123456789abcdefABCDEF")
_TEXT_SUFFIXES = (".md", ".markdown", ".txt")
_HTML_SUFFIXES = (".html", ".htm")


@dataclass
class Imported:
    key: str
    title: str
    body: str
    tags: list[str] = field(default_factory=list)
    category: str | None = None
    created: datetime | None = None
    #: Front matter keys other than category and tags, kept in the text.
    path: str = ""


@dataclass
class ReadResult:
    notes: list[Imported] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)


class TooBig(ValueError):
    pass


# --- files in, files out ------------------------------------------------------


def expand(files: list[tuple[str, bytes]]) -> list[tuple[str, bytes]]:
    """Every file, with zips (and zips inside zips, one level) opened.

    Nothing is written to disk: members are read into memory, so a name with
    `..` in it is only a string. The sizes are capped as they are read.
    """
    out: list[tuple[str, bytes]] = []
    total = 0

    def add(name: str, data: bytes, depth: int) -> None:
        nonlocal total
        if name.lower().endswith(".zip") and depth < 2:
            try:
                archive = zipfile.ZipFile(io.BytesIO(data))
            except zipfile.BadZipFile:
                return
            for info in archive.infolist():
                if info.is_dir():
                    continue
                #: The declared size, checked before a byte is inflated; a
                #: member that lies about it is cut by `read`'s own CRC check.
                total += info.file_size
                if total > MAX_ARCHIVE_BYTES:
                    raise TooBig("That export is larger than 200 MB unpacked.")
                inner = info.filename.replace("\\", "/")
                if inner.startswith("__MACOSX/") or posixpath.basename(inner).startswith("._"):
                    continue
                add(inner, archive.read(info), depth + 1)
            return
        if len(data) > MAX_FILE_BYTES and not name.lower().endswith(".enex"):
            return
        out.append((name.replace("\\", "/").lstrip("/"), data))

    for name, data in files:
        add(name, data, 0)
    return out


def _text(data: bytes) -> str | None:
    for encoding in ("utf-8-sig", "utf-16"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return None


def _title_from_body(body: str) -> str:
    for line in body.splitlines():
        line = line.strip().lstrip("#").strip()
        if line:
            return line[:120]
    return ""


def _with_title(title: str, body: str) -> str:
    """The note's text with its title as the first heading, once."""
    body = body.strip()
    if not title:
        return body
    first = body.split("\n", 1)[0].strip().lstrip("#").strip()
    if first.casefold() == title.casefold():
        return body
    return f"# {title}\n\n{body}" if body else f"# {title}"


def _html_body(html: str) -> str:
    from memorymap.core.docview import html_to_markdown

    return html_to_markdown(html).strip()


# --- Notion -------------------------------------------------------------------


def _notion_name(stem: str) -> tuple[str, str | None]:
    """`("Page Title", "1a2b...")` from `Page Title 1a2b...`."""
    tail = stem[-32:]
    if len(stem) > 32 and stem[-33].isspace() and set(tail) <= _HEX:
        return stem[:-33].strip(), tail.lower()
    return stem.strip(), None


def _notion_links(body: str) -> str:
    """Notion's relative links between pages become `[[wiki links]]`."""

    def swap(match: re.Match) -> str:
        target = unquote(match.group(2))
        if "://" in target:
            return match.group(0)
        stem = posixpath.splitext(posixpath.basename(target))[0]
        title, _ = _notion_name(stem)
        return f"[[{title}]]" if title else match.group(0)

    return _NOTION_LINK.sub(swap, body)


def read_notion(files: list[tuple[str, bytes]]) -> ReadResult:
    result = ReadResult()
    for name, data in files:
        lower = name.lower()
        if lower.endswith(".csv"):
            result.skipped.append(f"{name}: a database table (its rows are imported as pages)")
            continue
        if not lower.endswith(_TEXT_SUFFIXES + _HTML_SUFFIXES):
            continue
        text = _text(data)
        if text is None:
            result.skipped.append(f"{name}: not a text file")
            continue
        stem = posixpath.splitext(posixpath.basename(name))[0]
        title, page_id = _notion_name(stem)
        body = _html_body(text) if lower.endswith(_HTML_SUFFIXES) else text
        body = _notion_links(body)
        if not body.strip() and not title:
            result.skipped.append(f"{name}: empty")
            continue
        parent = posixpath.dirname(name)
        category = _notion_name(posixpath.basename(parent))[0] if parent else None
        result.notes.append(
            Imported(
                key=page_id or name,
                title=title,
                body=_with_title(title, body),
                category=category or None,
                path=name,
            )
        )
    return result


# --- Obsidian -----------------------------------------------------------------


def read_obsidian(files: list[tuple[str, bytes]], parse_frontmatter) -> ReadResult:  # noqa: ANN001
    """`parse_frontmatter` is the markdown importer's own (routes_settings),
    passed in so a vault reads exactly as the existing Import markdown reads
    it, front matter properties kept in the text included."""
    result = ReadResult()
    for name, data in files:
        parts = name.split("/")
        if any(p.startswith(".") for p in parts):  # .obsidian/, .trash/
            continue
        if not name.lower().endswith(_TEXT_SUFFIXES):
            continue
        text = _text(data)
        if text is None:
            result.skipped.append(f"{name}: not a text file")
            continue
        meta, body = parse_frontmatter(text)
        if not body.strip():
            result.skipped.append(f"{name}: empty")
            continue
        tags = meta.get("tags") or []
        result.notes.append(
            Imported(
                key=name,
                title=posixpath.splitext(parts[-1])[0],
                body=body.strip(),
                tags=list(tags) if isinstance(tags, list) else [str(tags)],
                category=meta.get("category") or None,
                path=name,
            )
        )
    return result


# --- Evernote -----------------------------------------------------------------


def _enex_time(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        # Evernote writes UTC; the notebook stores naive UTC (`utcnow`).
        return datetime.strptime(value.strip(), "%Y%m%dT%H%M%SZ")
    except ValueError:
        return None


def _enml(content: str) -> str:
    """An ENML body as markdown: `en-media` (an attached file the export
    carries as base64 elsewhere) and `en-todo` become words, the rest is
    XHTML."""
    content = re.sub(r"<\?xml[^<>]*\?>|<!DOCTYPE[^<>]*>", "", content or "")
    content = re.sub(r"<en-todo\s+checked=\"true\"\s*/>", "[x] ", content)
    content = re.sub(r"<en-todo[^<>]*/>", "[ ] ", content)
    #: An `en-media` element is empty in ENML, so its opening tag is the
    #: attachment and a closing tag is dropped; matching open-to-close with a
    #: lazy `.*?` scanned to the end of the file once per unclosed tag.
    content = re.sub(r"<en-media[^<>]*>", " [attachment] ", content)
    content = content.replace("</en-media>", "")
    content = content.replace("<en-note", "<div").replace("</en-note>", "</div>")
    return _html_body(content)


def read_evernote(files: list[tuple[str, bytes]]) -> ReadResult:
    from defusedxml import ElementTree

    result = ReadResult()
    for name, data in files:
        if not name.lower().endswith(".enex"):
            continue
        try:
            root = ElementTree.fromstring(data)
        except Exception as exc:  # noqa: BLE001  # defusedxml refuses entities by raising
            result.skipped.append(f"{name}: not a readable Evernote export ({type(exc).__name__})")
            continue
        notebook = posixpath.splitext(posixpath.basename(name))[0]
        for note in root.iter("note"):
            title = (note.findtext("title") or "").strip()
            content = note.findtext("content") or ""
            created = note.findtext("created")
            body = _enml(content)
            if not body and not title:
                result.skipped.append(f"{name}: an empty note")
                continue
            fingerprint = hashlib.sha1(f"{title}\n{created}\n{body[:200]}".encode("utf-8")).hexdigest()[:20]
            result.notes.append(
                Imported(
                    key=fingerprint,
                    title=title,
                    body=_with_title(title, body),
                    tags=[t.text.strip() for t in note.findall("tag") if t.text and t.text.strip()],
                    category=notebook or None,
                    created=_enex_time(created),
                    path=f"{name}#{title[:80]}",
                )
            )
    return result


# --- Apple Notes --------------------------------------------------------------


def read_apple(files: list[tuple[str, bytes]]) -> ReadResult:
    result = ReadResult()
    for name, data in files:
        lower = name.lower()
        if not lower.endswith(_TEXT_SUFFIXES + _HTML_SUFFIXES):
            continue
        text = _text(data)
        if text is None:
            result.skipped.append(f"{name}: not a text file")
            continue
        body = _html_body(text) if lower.endswith(_HTML_SUFFIXES) else text.strip()
        if not body:
            result.skipped.append(f"{name}: empty")
            continue
        title = posixpath.splitext(posixpath.basename(name))[0].strip() or _title_from_body(body)
        folder = posixpath.basename(posixpath.dirname(name))
        result.notes.append(Imported(key=name, title=title, body=_with_title(title, body), category=folder or None, path=name))
    return result


def read(source: str, files: list[tuple[str, bytes]], parse_frontmatter=None) -> ReadResult:  # noqa: ANN001
    if source not in SOURCES:
        raise ValueError(source)
    expanded = expand(files)
    if source == "notion":
        result = read_notion(expanded)
    elif source == "obsidian":
        result = read_obsidian(expanded, parse_frontmatter)
    elif source == "evernote":
        result = read_evernote(expanded)
    else:
        result = read_apple(expanded)
    if len(result.notes) > MAX_NOTES:
        result.skipped.append(f"{len(result.notes) - MAX_NOTES} more notes past the {MAX_NOTES} one import takes")
        result.notes = result.notes[:MAX_NOTES]
    return result


# --- the writer ---------------------------------------------------------------


def source_key(source: str, key: str) -> str:
    """What `Entry.source_path` holds for an imported note: the app and its key."""
    return f"{source}:{key}"[:500]


def write(session, source: str, notes: list[Imported]) -> dict:  # noqa: ANN001
    """Make the notes that are not already here. Returns the counts and ids."""
    from sqlalchemy import select

    from memorymap.core.database import Entry
    from memorymap.entry import manager

    keys = [source_key(source, n.key) for n in notes]
    existing: set[str] = set()
    for at in range(0, len(keys), 500):
        existing.update(
            session.scalars(
                select(Entry.source_path).where(Entry.source_path.in_(keys[at : at + 500]), Entry.is_deleted.is_(False))
            ).all()
        )
    ids: list[int] = []
    made: list = []
    seen: set[str] = set()
    already = 0
    for note, key in zip(notes, keys):
        if key in existing or key in seen:
            already += 1
            continue
        seen.add(key)
        entry = manager.create_entry(
            session,
            note.body,
            category_name=note.category or manager.UNCATEGORISED,
            tags=note.tags,
            ai_confidence=100 if note.category else 0,
        )
        entry.source_path = key
        if note.category:
            entry.user_filed = True  # the app it came from said where it belongs
        if note.created is not None:
            entry.created_at = note.created
        ids.append(entry.id)
        made.append(entry)
    session.commit()
    return {"imported": len(ids), "already": already, "ids": ids, "entries": made}
