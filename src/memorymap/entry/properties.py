"""A note's properties: the `---` block at the top of its text (GRAPH_PLAN KG4).

The note's text is the source of truth, written the way Obsidian writes it,
so an imported vault keeps its properties and an exported note carries them.
`EntryProperty` is only an index of this, rebuilt on every save.

**Read with the documents' reader.** `core/docmeta.properties` already reads
the subset every editor in the plan's table writes (`key: value`, inline and
block lists, quotes) with its own bounds; this module adds only where the
block ends, so the rest of the app can skip it (a note opening with
properties is named by its first line after them), and a writer.

**The writer rewrites the block and never the body.** A person editing a
property changes the lines between the fences; every character after the
closing fence is copied as it was. A value that would not read back as
itself unquoted (a colon, a leading quote or bracket, a `#`) is quoted.
"""

from __future__ import annotations

import re

from memorymap.core.docmeta import MAX_FENCE_LINES, properties as read_block

_FENCE = re.compile(r"^---[ \t]*$")
_NEEDS_QUOTES = re.compile(r"""^[\s"'\[{>|*&!%@`-]|:\s|\s#|[,\]]|\s$""")


def block_end(text: str) -> int:
    """Where the body starts: the offset just past the closing fence's line,
    or 0 when the text opens with no closed block."""
    source = str(text or "")
    if not source.startswith("---"):
        return 0
    lines = source.split("\n")
    if not _FENCE.match(lines[0]):
        return 0
    offset = len(lines[0]) + 1
    for index in range(1, min(len(lines), MAX_FENCE_LINES + 1)):
        line = lines[index]
        if _FENCE.match(line):
            return min(len(source), offset + len(line) + 1)
        offset += len(line) + 1
    return 0


def split(text: str) -> tuple[dict[str, list[str]], str]:
    """`(properties, body)`; `({}, text)` when there is no block."""
    end = block_end(text)
    if not end:
        return {}, str(text or "")
    return read_block(text), str(text)[end:]


def strip(text: str) -> str:
    """The text after the block, for anything that reads a note's name."""
    end = block_end(text)
    return str(text or "")[end:] if end else str(text or "")


def note_type(props: dict[str, list[str]]) -> str | None:
    values = props.get("type") or []
    return values[0] if values else None


def _scalar(value: object) -> str:
    if value is True:
        return "true"
    if value is False:
        return "false"
    text = " ".join(str(value).split())
    if text and _NEEDS_QUOTES.search(text):
        return '"' + text.replace("\\", "\\\\").replace('"', '\\"') + '"'
    return text


def _line(key: str, value: object) -> str:
    if isinstance(value, (list, tuple)):
        return f"{key}: [{', '.join(_scalar(v) for v in value if str(v).strip())}]"
    text = _scalar(value) if value is not None else ""
    return f"{key}: {text}" if text else f"{key}:"


def write(text: str, props: dict[str, object]) -> str:
    """The text with its block replaced by `props` (or added at the top, or
    removed when `props` is empty); the body is untouched."""
    body = strip(text)
    lines = [_line(" ".join(str(k).split()), v) for k, v in props.items() if str(k).strip()]
    if not lines:
        return body
    return "---\n" + "\n".join(lines) + "\n---\n" + body
