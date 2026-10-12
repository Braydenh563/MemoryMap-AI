"""The category or tag a listing names, split out of reading.py so commands.py can use it
without importing the reader that imports commands (an import cycle)."""

from __future__ import annotations

import re


#: "list my work notes", "show me all my baking notes", "notes in Work",
#: "my notes tagged harbor": a listing narrowed to one category or tag
#: (ledger row 442). The name is checked against the notebook by the route.
_FILED_LISTING = re.compile(
    r"^(?:(?:can|could|would) you |please |pls )?(?:(?:list|show|give)(?: me)?(?: all| every)?(?: of)? )?"
    r"(?:(?:my |the )(?P<a>[a-z][\w&-]{1,30}(?: [a-z][\w&-]{1,30})?) (?:notes|entries)"
    r"|(?:my |the )?(?:notes|entries) (?:in|under|filed under|tagged(?: with)?|with the tag) #?(?P<b>[a-z][\w&-]{1,30}(?: [a-z][\w&-]{1,30})?))"
    r"(?: (?:please|pls|plz))?[?.]*$",
    re.I,
)
#: Words before "notes" that are not a filing: "my recent notes", "all notes".
_NOT_FILED = frozenset({
    "recent", "newest", "latest", "last", "old", "oldest", "all", "every", "pinned", "favourite", "favorite",
    "starred", "new", "own", "other", "first", "untagged", "uncategorised", "uncategorized", "these", "those",
    "my", "the", "your", "some", "any", "more", "most", "older", "earlier", "today's", "todays",
})


def filed_listing(text: str) -> str | None:
    """The category or tag a listing names ("work" in "list my work notes"),
    else None."""
    found = _FILED_LISTING.match(" ".join((text or "").split()))
    if not found:
        return None
    name = (found.group("a") or found.group("b") or "").strip()
    name = re.sub(r"^(?:all|every|my|the) ", "", name, flags=re.I)
    return name if name and name.split()[0].lower() not in _NOT_FILED else None
