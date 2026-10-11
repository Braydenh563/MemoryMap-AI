"""What the person calls the assistant, taken off before the question is read.

The owner, 2026-10-11: "what if I call the composer lil bro, brotato, broski
or smth like that?? can it infer anything I call it is like a name or
nickname I feel like calling it at the time yk??", and "what if I make up
smth random like brotatockiibidyrizzler yk??".

A name is found by where it stands and how it is shaped, not by a list of
names: after a greeting ("hey lil bro, ..."), set off by a comma ("...,
broski"), alone before the question ("brotato what's on today") or after it
("what's due this week brotatockiibidyrizzler"). What may be a name is a word
people call each other by (`ADDRESS`), a "lil", "big" or "my" with one, a
"bro" word the dictionary does not hold ("broski", "brotato"), or any word
that is in no dictionary and none of the person's notes (an invented one).
At the bare start or end, where a typo of a real word also stands, an
invented word must also be one the speller cannot place. The same words
after "about", "find", "tagged", "see" and their kind are the question's
object and stay (`OBJECT_HEADS`): "what did I say about Bro the dog".

A message that is only a name, or a greeting and a name, is a call
(`Address.call`): the app answers it, it never searches it.
"""

from __future__ import annotations

import contextvars
import re
from dataclasses import dataclass, field

from memorymap.ai import question_noise, spelling

#: Words people call each other by. Every other name is found by its shape.
ADDRESS = frozenset(
    """bro brother bruh bruv brah dude mate matey buddy bud pal man fam legend
    boss chief champ king queen homie homey dawg guy sis sir mister captain
    cap atlas composer assistant bot robot friend fella boi kiddo sport
    lad""".split()
)
#: The words that make a name of the next word: "lil bro", "big man", "my guy".
_PRE = frozenset("lil little big my ol".split())
#: Greetings that call: with a name and nothing else, the message is a call.
HAILS = frozenset("hey heya hi hiya hello yo oi sup howdy gm morning evening afternoon".split())
#: Greetings that answer: "thanks legend" is thanks, "ok mate" is ok.
_ACKS = frozenset("ok okay k kk thanks thank thx ty tysm cheers cool nice night bye gn cya later".split())
_TWO_WORD = {"hey there", "hi there", "hello there", "good morning", "good evening", "good afternoon", "thank you", "good night"}
#: The words a question starts with, after a bare name ("brotato what's on").
ASK_START = frozenset(
    """what what's whats when when's whens where where's wheres who who's whos
    whose how how's hows why which can could would will should shall is isnt
    isn't are am do does did any anything anyone show find list tell give open
    take remind add make set search look help i i'm im please pls""".split()
)
#: Words a name after them is the object of: "notes about brotato", "find
#: zorgblat", "tagged broski", "when did I last see sarah".
OBJECT_HEADS = frozenset(
    """about on for of with from to by at in into regarding re called named
    titled tagged like as the a an my our your his her their this that these
    those see saw seen meet met call text texted email emailed ask asked tell
    told find search show open visit remind message pay paid owe thank invite
    help mention mentioned add remove delete tag file read watch buy bought
    get got need want use is was are were be am has have had do did does
    know knew love like hate say said write wrote and or than""".split()
)
#: Whether a word is in the person's notes, for the length of one `split`.
_IN_NOTES: contextvars.ContextVar = contextvars.ContextVar("vocative_in_notes", default=None)
_WORD = re.compile(r"[A-Za-z][A-Za-z'-]*")
_BRO = re.compile(r"^br[ou]h?[a-z]*$")


@dataclass
class Address:
    """`question` is the message as it is read; `names` what it called the
    assistant, as typed; `call` whether the message was only that."""

    question: str
    names: list[str] = field(default_factory=list)
    call: bool = False
    greeting: str = ""


def _common() -> frozenset:
    from memorymap.ai.common_words import WORDS

    return WORDS


def _invented(word: str, known, strong: bool) -> bool:  # noqa: ANN001
    """In no dictionary, none of the person's words and none of their notes:
    "brotatockiibidyrizzler", not "isekai" in a notebook that has it."""
    low = word.lower()
    if not low.isalpha() or len(low) < 3 or low in known:
        return False
    if low in question_noise.SLANG or low in question_noise.SOCIAL or low in ASK_START or low in OBJECT_HEADS:
        return False
    if spelling.is_word(low):
        return False
    if question_noise.nearest(low, question_noise.VOCABULARY) is not None:
        return False
    #: At the bare start or end a typo stands where a name would: a word the
    #: speller can place is that word misspelt, not a name.
    if not strong and spelling.fix(low, distance=question_noise.distance) is not None:
        return False
    in_notes = _IN_NOTES.get()
    return not (in_notes and in_notes(low))


def _one(word: str, known, strong: bool) -> bool:  # noqa: ANN001
    low = word.lower()
    if low in ADDRESS:
        return True
    #: Against the English lists alone: the app's own help names "broski"
    #: as an example, which makes it one of the speller's words.
    if _BRO.match(low) and low not in spelling.english() and low not in _common():
        return True
    return _invented(word, known, strong)


def _name(words: list[str], known, strong: bool) -> bool:  # noqa: ANN001
    """Whether `words` (one, or a "lil" and one) are a name."""
    if len(words) == 1:
        return _one(words[0], known, strong)
    return len(words) == 2 and words[0].lower() in _PRE and _one(words[1], known, True)


def _tokens(text: str) -> list[re.Match]:
    return list(_WORD.finditer(text))


def _greeting(tokens: list[re.Match]) -> tuple[int, str]:
    """How many tokens the greeting at the start takes, and its kind."""
    i, kind = 0, ""
    while i < len(tokens):
        pair = " ".join(t.group(0).lower() for t in tokens[i : i + 2])
        word = tokens[i].group(0).lower()
        if pair in _TWO_WORD:
            kind = kind or ("ack" if pair.startswith(("thank", "good night")) else "hail")
            i += 2
        elif word in HAILS:
            kind = kind or "hail"
            i += 1
        elif word in _ACKS:
            kind = kind or "ack"
            i += 1
        else:
            break
    return i, kind


def _head(text: str, tokens: list[re.Match], known) -> Address | None:  # noqa: ANN001
    start, kind = _greeting(tokens)
    for size in (2, 1):
        end = start + size
        if end > len(tokens):
            continue
        words = [t.group(0) for t in tokens[start:end]]
        after = text[tokens[end - 1].end() :]
        rest = after.lstrip()
        comma = rest.startswith(",")
        alone = not _WORD.search(after)
        next_word = tokens[end].group(0).lower() if end < len(tokens) else ""
        asks = next_word in ASK_START or (next_word and question_noise.nearest(next_word, ASK_START) is not None)
        strong = bool(kind) or comma
        if not (comma or alone or asks):
            continue
        if not _name(words, known, strong):
            #: After a hail and nothing else, any word not in the notes is a
            #: name: "hey potato".
            if not (kind == "hail" and alone and size == 1 and words[0].lower() not in known and words[0].isalpha()):
                continue
        name = " ".join(words)
        greeting = text[: tokens[start].start()].strip(" ,") if start else ""
        if alone:
            if kind == "ack":
                return Address(question=(greeting + after.strip(" ,")).strip(), names=[name], greeting=greeting)
            return Address(question=greeting or "hi", names=[name], call=True, greeting=greeting)
        question = rest.lstrip(", ").strip()
        if kind == "ack":
            question = f"{greeting}, {question}"
        return Address(question=question, names=[name], greeting=greeting)
    return None


def _tail(text: str, tokens: list[re.Match], known) -> Address | None:  # noqa: ANN001
    stripped = text.rstrip(" ?!.")
    mark = text[len(stripped) :].strip()
    for size in (2, 1):
        if len(tokens) <= size:
            continue
        last = tokens[-size:]
        if last[-1].end() != len(stripped):
            continue
        words = [t.group(0) for t in last]
        before = stripped[: last[0].start()]
        comma = before.rstrip().endswith(",")
        if comma:
            if not _name(words, known, True):
                continue
            head = before.rstrip()[:-1].rstrip()
        else:
            previous = tokens[-size - 1].group(0).lower()
            if previous in OBJECT_HEADS or len(tokens) - size < 2:
                continue
            #: A capital mid-sentence is someone talked about ("when did I
            #: meet Zorgblat"); a nickname is typed as it is said.
            if words[-1][0].isupper() and words[-1].lower() not in ADDRESS:
                continue
            if not _name(words, known, False):
                continue
            head = before.rstrip()
        return Address(question=f"{head}{mark}", names=[" ".join(words)])
    return None


def split(text: str, known=frozenset(), in_notes=None) -> Address:  # noqa: ANN001
    """`text` with what it called the assistant taken off. `known` is the
    person's own words (note titles, tags, people), and `in_notes(word)`
    says whether any note holds a word: neither is ever an invented name.
    Asked only of a word that is otherwise invented, so it is rarely run."""
    token = _IN_NOTES.set(in_notes)
    try:
        return _split(text, known)
    finally:
        _IN_NOTES.reset(token)


def _split(text: str, known) -> Address:  # noqa: ANN001
    raw = (text or "").strip()
    tokens = _tokens(raw)
    if not tokens:
        return Address(question=raw)
    known = frozenset(w.lower() for w in known)
    found = _head(raw, tokens, known)
    if found is None:
        found = _tail(raw, tokens, known)
    elif not found.call:
        more = _tail(found.question, _tokens(found.question), known)
        if more is not None:
            found = Address(question=more.question, names=found.names + more.names, greeting=found.greeting)
    return found or Address(question=raw)
