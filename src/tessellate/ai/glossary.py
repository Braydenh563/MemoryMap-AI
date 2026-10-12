"""The person's own abbreviations, learned from their notes (CHAT_PLAN B7).

A student writes "CC" for Cloud Computing in one note and the whole phrase
in another; asked "what's due in CC?", search found the notes that say "CC"
and missed the ones that say "Cloud Computing", and "what does CC stand
for?" had no answer at all. Nothing here is a dictionary: every expansion
is one the notes themselves give, either said outright ("Cloud Computing
(CC)", "CC = Cloud Computing", "CC stands for Cloud Computing") or implied
by a capitalised phrase elsewhere whose initials spell it, when only one
phrase does.
"""

from __future__ import annotations

import re
from collections.abc import Iterable

#: Two to six capitals, digits allowed after the first ("CC", "HCI", "COMP2", "UX").
ABBR = r"[A-Z][A-Z0-9&]{1,5}"
#: Up to six words, each capitalised or a small joining word, opening capitalised.
_PHRASE = r"[A-Z][\w'-]+(?:\s+(?:[A-Z][\w'-]+|of|and|for|the|in|on|to|&))*?\s+[A-Z][\w'-]+"
_SMALL = {"of", "and", "for", "the", "in", "on", "to", "&"}

_SAID = (
    re.compile(rf"(?P<long>{_PHRASE})\s*\((?P<abbr>{ABBR})\)"),
    re.compile(rf"\b(?P<abbr>{ABBR})\s*\((?P<long>[A-Za-z][\w' &-]+?)\)"),
    re.compile(rf"\b(?P<abbr>{ABBR})\s*(?:=|:|-)\s*(?P<long>[A-Za-z][\w'-]+(?:\s+[A-Za-z&][\w'-]*){{1,5}})"),
    re.compile(rf"\b(?P<abbr>{ABBR})\s+(?:stands for|is short for|means|is)\s+(?P<long>[A-Za-z][\w'-]+(?:\s+[A-Za-z&][\w'-]*){{1,5}})", re.I),
)
_ABBR_WORD = re.compile(rf"\b{ABBR}\b")
_CAPITAL_RUN = re.compile(r"\b[A-Z][a-z][\w'-]*(?:\s+(?:of|and|for|the|in|on|to|&)?\s*[A-Z][a-z][\w'-]*){1,5}")
#: Capitals that are words, not abbreviations of something in the notes.
_NOT = {"OK", "AM", "PM", "TV", "ID", "UK", "US", "USA", "EU", "AI", "PDF", "URL", "FAQ", "DIY", "ASAP", "FYI", "TBD", "TODO", "I"}


def initials(phrase: str) -> str:
    """"Cloud Computing" -> "CC"; "Department of Health" -> "DH" and, with
    its small words, "DOH": both are returned by `spells`."""
    return "".join(w[0] for w in phrase.split() if w.lower() not in _SMALL).upper()


def spells(abbr: str, phrase: str) -> bool:
    """Whether `abbr` is `phrase`'s initials, small words counted or not,
    digits ignored ("COMP2" is not checked against a phrase's letters)."""
    letters = re.sub(r"[^A-Z]", "", abbr.upper())
    words = phrase.split()
    if len(letters) < 2:
        return False
    with_small = "".join(w[0] for w in words if w != "&").upper()
    return letters in (initials(phrase), with_small)


def _tidy(phrase: str) -> str:
    phrase = " ".join(phrase.split()).strip(" .,;:")
    return re.sub(r"^(?:the|a|an)\s+", "", phrase, flags=re.I)


def _said_in(text: str, said: dict[str, str]) -> None:
    """Add to `said` each "Long Name (LN)" definition in `text` whose phrase spells its abbreviation."""
    for pattern in _SAID:
        for m in pattern.finditer(text):
            abbr, long = m.group("abbr"), _tidy(m.group("long"))
            if abbr in _NOT or abbr in said:
                continue
            # "CC is due Friday" is not a definition: the phrase must spell it.
            words = long.split()
            for n in range(len(words), 1, -1):
                if spells(abbr, " ".join(words[:n])):
                    said[abbr] = " ".join(words[:n])
                    break


def _runs_in(text: str, runs: dict[str, set[str]]) -> None:
    """Add to `runs` each capitalised phrase in `text`, under the abbreviations its words could spell."""
    for m in _CAPITAL_RUN.finditer(text):
        words = _tidy(m.group(0)).split()
        #: Every run inside a longer one too ("Intro to Cloud Computing"
        #: holds "Cloud Computing").
        for i in range(len(words)):
            for j in range(i + 2, len(words) + 1):
                if words[i].lower() in _SMALL or words[j - 1].lower() in _SMALL:
                    continue
                piece = " ".join(words[i:j])
                for key in {initials(piece), "".join(w[0] for w in words[i:j]).upper()}:
                    runs.setdefault(key, set()).add(piece)


def learn(texts: Iterable[str]) -> dict[str, str]:
    """{abbreviation: phrase} from `texts`. Said outright wins; otherwise a
    capitalised phrase whose initials spell an abbreviation the notes use,
    kept only when exactly one phrase does."""
    said: dict[str, str] = {}
    used: set[str] = set()
    runs: dict[str, set[str]] = {}
    for text in texts:
        text = text or ""
        _said_in(text, said)
        used.update(a for a in _ABBR_WORD.findall(text) if a not in _NOT)
        _runs_in(text, runs)
    out = dict(said)
    for abbr in used - said.keys():
        found = runs.get(re.sub(r"[^A-Z]", "", abbr), set())
        #: The longest reading of each phrase only ("Cloud Computing", not also "Cloud Computing Lab").
        found = {p for p in found if spells(abbr, p)}
        if len({p.lower() for p in found}) == 1:
            out[abbr] = next(iter(found))
    return out


def expand(question: str, glossary: dict[str, str]) -> str:
    """`question` with each known abbreviation followed by its phrase, for
    search: "what's due in CC?" -> "what's due in CC Cloud Computing?". A
    phrase the question already holds is not added twice."""
    def one(m: re.Match) -> str:
        abbr = m.group(0)
        long = glossary.get(abbr)
        if not long or long.lower() in question.lower():
            return abbr
        return f"{abbr} {long}"

    return _ABBR_WORD.sub(one, question)


_ASKS = re.compile(
    rf"^\s*(?:what\s+(?:does|did)\s+(?:the\s+)?(?P<a>{ABBR})\s+(?:stand\s+for|mean)|what(?:'s|\s+is)\s+(?:an?\s+|the\s+)?(?P<b>{ABBR})|(?P<c>{ABBR})\s+(?:stands\s+for|means)\s+what)\s*\??\s*$"
)


def asked(question: str) -> str | None:
    """The abbreviation "what does CC stand for?" asks about, or None."""
    m = _ASKS.match(" ".join((question or "").split()))
    return (m.group("a") or m.group("b") or m.group("c")) if m else None
