"""Turning a document's markdown into something to hand somebody else.

DOCUMENTS_PLAN Phase 5 item 1 and Phase 7. Two jobs live here:

* **Comments as footnotes.** A document's remarks are `==words== %%about
  them%%` in its own text (the model, and the reasons for that syntax, are in
  `frontend/documents.js` between `DOC-COMMENT-BEGIN` and `DOC-COMMENT-END`).
  Read view hides them; an export turns each one into a footnote, so a file
  handed to somebody carries the remarks rather than dropping them.
* **The other formats** a document can leave as: self-contained HTML, a .docx,
  and a markdown bundle with its images beside it (Phase 7).

**The comment conversion exists twice**, here and in documents.js, because the
browser renders Read view and the server writes the downloads and neither can
call the other. `tests/test_doc_comments.py` runs both over one fixture and
fails if their output differs by a byte, which is the only thing that keeps two
implementations of one rule honest.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

#: Where a `%%…%%` is not a comment: inside a fence or inline code it is an
#: example of the syntax, and in frontmatter it is a property's value. Same
#: three as `DOC_COMMENT_SKIP` in documents.js.
_SKIP = [
    re.compile(r"(^|\n)[ \t]*(```|~~~)[^\n]*\n[\s\S]*?(\n[ \t]*\2[^\n]*|$)"),
    re.compile(r"`[^`\n]+`"),
    re.compile(r"^---\n[\s\S]*?\n---"),
]

_COMMENT = re.compile(r"%%([^\n]*?)%%")
_TARGET = re.compile(r"==([^=\n]{1,400})==$")


@dataclass(frozen=True)
class Comment:
    """One remark, with the spans the editor's own model hands back."""

    start: int
    end: int
    body: str
    target: str
    target_start: int


def _skip_mask(text: str) -> bytearray:
    mask = bytearray(len(text))
    for pattern in _SKIP:
        for match in pattern.finditer(text):
            if match.start() == match.end():
                continue
            mask[match.start() : match.end()] = b"\x01" * (match.end() - match.start())
    return mask


def parse_comments(text: str) -> list[Comment]:
    """Every remark in the document, in document order."""
    body = text or ""
    if not body:
        return []
    mask = _skip_mask(body)
    out: list[Comment] = []
    for match in _COMMENT.finditer(body):
        start, end = match.start(), match.end()
        if mask[start]:
            continue
        note = match.group(1).strip()
        #: `%%%%` is a typo, not an empty remark.
        if not note:
            continue
        head = re.sub(r"[ \t]$", "", body[:start])
        gap = start - len(head)
        target = _TARGET.search(head)
        #: At most one space between the words and the remark about them, the
        #: same rule the editor's model states.
        anchored = target is not None and gap <= 1
        out.append(
            Comment(
                start=start,
                end=end,
                body=note,
                target=target.group(1) if anchored else "",
                target_start=(start - len(target.group(0)) - gap) if anchored else start,
            )
        )
    return out


def strip_comments(text: str) -> str:
    """The document without its remarks. The highlights stay: a highlight is
    something an author did to their own text and renders as one."""
    body = text or ""
    if not body:
        return ""
    out = body
    for comment in reversed(parse_comments(body)):
        start, end = comment.start, comment.end
        #: The space the remark was written after belongs to the remark; left
        #: behind it reads as a typo in the sentence it was about.
        if start and out[start - 1] == " ":
            start -= 1
        elif end < len(out) and out[end] == " ":
            end += 1
        line_start = out.rfind("\n", 0, max(0, start)) + 1
        line_break = out.find("\n", end)
        line_end = len(out) if line_break == -1 else line_break
        if not out[line_start:start].strip() and not out[end:line_end].strip():
            #: A line that was nothing but a comment goes whole, newline and
            #: all, or resolving the last remark leaves a paragraph break
            #: nobody wrote.
            out = out[:line_start] + out[min(line_end + 1, len(out)) :]
            continue
        out = out[:start] + out[end:]
    return out


def comments_to_footnotes(text: str, prefix: str = "c") -> str:
    """The document with its remarks as footnotes: what an export carries."""
    body = text or ""
    if not body:
        return ""
    comments = parse_comments(body)
    if not comments:
        return body
    out = body
    notes: list[str] = []
    for index in range(len(comments) - 1, -1, -1):
        comment = comments[index]
        label = f"{prefix}{index + 1}"
        notes.insert(0, f"[^{label}]: {comment.body}")
        #: The reference replaces the remark and nothing else, so the marker
        #: sits against the words it is about.
        out = f"{out[: comment.start]}[^{label}]{out[comment.end :]}"
    tail = "" if out.endswith("\n") else "\n"
    return f"{out}{tail}\n" + "\n".join(notes) + "\n"
