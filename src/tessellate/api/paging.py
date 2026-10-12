"""Cursor pagination, one contract for every list (WORLD_CLASS_PLAN B7, F2).

**The contract.** Every list route that pages takes `?limit=&cursor=` and,
when there is more after the rows it sent, answers with an `X-Next-Cursor`
header holding the cursor for the next page. No header means the list is
finished. The body is untouched: a header rather than a `next_cursor` field,
because twenty of these routes answer with a bare JSON array that the app's
own screens (and anything else already calling them) read as one, and
wrapping it would break every one of those callers at once. `offset` still
works exactly as it did, so nothing that pages by offset today has to change;
a request that sends both is answered by the cursor.

**Two kinds of cursor, one shape on the wire.** A cursor is opaque base64url
text and a client never builds one, it only hands back what it was given.

- A *keyset* cursor (`k`) carries the sort key of the last row sent, and the
  next page is "the rows that sort after this one". It is what a list a
  person scrolls needs: a note saved while page one is on screen does not
  shift page two by a row, so no row is shown twice and none is skipped.
  `/entries` uses it, since it is the list every surface scrolls and the one
  that is written to while it is read.
- An *offset* cursor (`o`) carries a position. It is used by the lists that
  are small, ordered by something other than a column (a score, a merge of
  sources), or read once into a dialog; for those a keyset buys nothing and
  costs a bespoke query each. It still gives every client one way to walk
  every list, which is the half of the contract that is about the API rather
  than the database.

A cursor of the wrong kind for its route is a 422, not a silent first page.
"""

from __future__ import annotations

import base64
import binascii
import json
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from fastapi import HTTPException, Query, Response

#: The response header that carries the next page's cursor.
NEXT_CURSOR = "X-Next-Cursor"

_BAD = "That page cursor is not one this list gave out; start again from the first page."


def _pack(kind: str, payload: Any) -> str:
    raw = json.dumps([kind, payload], separators=(",", ":"), default=_jsonable)
    return base64.urlsafe_b64encode(raw.encode()).decode().rstrip("=")


def _jsonable(value: Any) -> Any:
    if isinstance(value, datetime):
        return {"dt": value.isoformat()}
    raise TypeError(f"not a cursor value: {type(value).__name__}")


def _unpack(cursor: str) -> tuple[str, Any]:
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        kind, payload = json.loads(base64.urlsafe_b64decode(padded.encode()).decode())
    except (ValueError, TypeError, binascii.Error, UnicodeDecodeError):
        raise HTTPException(status_code=422, detail=_BAD) from None
    if kind not in ("k", "o"):
        raise HTTPException(status_code=422, detail=_BAD)
    return kind, payload


def _revive(value: Any) -> Any:
    if isinstance(value, dict) and set(value) == {"dt"}:
        try:
            return datetime.fromisoformat(value["dt"])
        except (TypeError, ValueError):
            raise HTTPException(status_code=422, detail=_BAD) from None
    return value


def keyset_cursor(values: tuple) -> str:
    """The cursor for "after the row whose sort key is `values`"."""
    return _pack("k", list(values))


def offset_cursor(offset: int) -> str:
    return _pack("o", int(offset))


def read_keyset(cursor: str, width: int) -> tuple:
    """The sort key a keyset cursor carries, checked for its width."""
    kind, payload = _unpack(cursor)
    if kind != "k" or not isinstance(payload, list) or len(payload) != width:
        raise HTTPException(status_code=422, detail=_BAD)
    return tuple(_revive(v) for v in payload)


def read_offset(cursor: str) -> int:
    kind, payload = _unpack(cursor)
    if kind != "o" or not isinstance(payload, int) or isinstance(payload, bool) or payload < 0:
        raise HTTPException(status_code=422, detail=_BAD)
    return payload


@dataclass
class OffsetPage:
    """One page of an offset-paged list, resolved from `cursor` or `offset`.

    Used as `page: OffsetPage = Depends(offset_page)`: the route reads
    `page.offset`, runs its query, and calls `page.finish(returned)` (or
    `page.finish(returned, total)` when it knows the total) before returning,
    which writes the next page's cursor when there is one.
    """

    offset: int
    limit: int | None
    response: Response = field(repr=False)

    def finish(self, returned: int, total: int | None = None) -> None:
        if self.limit is None:
            return
        more = (self.offset + returned < total) if total is not None else returned >= self.limit
        if more and returned:
            self.response.headers[NEXT_CURSOR] = offset_cursor(self.offset + returned)


def resolve(response: Response, *, offset: int, limit: int | None, cursor: str | None) -> OffsetPage:
    """An `OffsetPage` from a route's own `offset`/`limit`/`cursor` values."""
    start = read_offset(cursor) if cursor else offset
    return OffsetPage(offset=start, limit=limit, response=response)


def start(cursor: str | None, offset: int) -> int:
    """Where an offset-paged route starts: the cursor's position when one was
    sent, the route's own `offset` otherwise."""
    return read_offset(cursor) if cursor else offset


def finish(response: Response, offset: int, limit: int, total: int) -> None:
    """Write the next page's cursor when the list goes past this page."""
    if offset + limit < int(total):
        response.headers[NEXT_CURSOR] = offset_cursor(offset + limit)


def cursor_param() -> Any:
    """The `cursor` query parameter, declared once so every route documents it
    the same way in the OpenAPI schema."""
    return Query(
        default=None,
        max_length=512,
        description="The `X-Next-Cursor` value from the previous page; leave out for the first page.",
    )
