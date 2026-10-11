"""A general speller for typed questions (Brief 90, INBOX 837).

`question_noise.repair` read the asking words and left the rest of a question
as typed, on the reasoning that a subject word is the person's own. The
owner's real typing says otherwise ("redeisgn", "knoe", "thier", "noficiations",
"westen"): most of what people mistype is ordinary words, and a misspelt
word reaches every reader downstream (the intent rules, the place a clock is
asked for, the Guide's keywords). This module is the general pass:

* a word list (`common_words`, plus the app's own help text, whose counts
  also settle a tie: "user" beats "sure" here), with endings and prefixes
  worked out rather than listed;
* an edit-distance search that is strict about what it will change. A short
  word must be a cheap slip (a swap, a neighbouring key, a doubled letter) or
  a dropped letter with its first and last letters kept; "pasta" is not
  "past", and "tacos" is not "tacks";
* split words joined and run-together words split ("a nd", "thes ebuttons",
  "whena ny"), only where the pieces are words;
* words the person's notes hold, names, capitals and acronyms never changed.

A word it is unsure of is reported with the other reading it was near, so the
composer offers "Did you mean" instead of guessing silently.
"""

from __future__ import annotations

import re
from collections import Counter
from functools import lru_cache

from memorymap.ai.common_words import WORDS
from memorymap.ai.common_words_more import MORE

#: Abbreviations typed as they are: never read as a typo of a small word.
KNOWN_SHORT = frozenset(
    "ai ui ux pc tv ok os js id ip ocr pdf url api app css html gps sms qr usb vpn wifi lan pin gb mb kb ms tag faq pr ci "
    "ml nlp llm gpu cpu ram rom ssd hd md png jpg gif csv txt doc xls "
    "yo vs ty ya ye hm uh um oh ah eh ha hi he we us ex re ta np ik ig tbh imo idk irl brb".split()
)

#: Small words a one-letter slip in a short token is read towards, with how
#: common each is: the prior that makes "odf the" "of" and not "off".
FUNCTION_PRIOR = {
    "of": 0.6, "in": 0.4, "on": 0.4, "to": 0.4, "and": 0.6, "the": 0.6, "for": 0.3, "with": 0.3, "from": 0.3,
    "but": 0.3, "not": 0.3, "you": 0.3, "are": 0.3, "was": 0.3, "can": 0.3, "all": 0.1, "or": 0.3, "is": 0.3,
    "it": 0.3, "at": 0.2, "by": 0.2, "an": 0.2, "my": 0.2, "me": 0.2, "if": 0.2, "so": 0.2, "do": 0.2,
    "must": 0.2, "will": 0.2, "that": 0.3, "this": 0.3, "have": 0.3, "what": 0.3, "when": 0.3, "how": 0.3,
}
#: Words that are not the head of a phrase after an article ("the suer" is
#: "the user", not "the sure"): a near tie goes to the other reading.
NOT_AFTER_ARTICLE = frozenset("sure such very quite just even only also too so still then than now here there really maybe".split())
#: Small words that take no ending: "thes" is a slip for "these", not "the" + s.
NO_ENDINGS = frozenset("the and but for not you are was can her his its our who how why may any all one off out per via yet nor too".split())
PREPOSITIONS = frozenset("of in on to for at by with from about off up".split())
DETERMINERS = frozenset("the a an my your this that these those his her our their its some any".split())

#: A trailing "n" is "n't" with the apostrophe left out ("doesn follow").
CONTRACTION_STEMS = {
    "doesn": "does not", "didn": "did not", "isn": "is not", "wasn": "was not", "weren": "were not", "aren": "are not",
    "hasn": "has not", "haven": "have not", "hadn": "had not", "wouldn": "would not", "couldn": "could not",
    "shouldn": "should not", "mustn": "must not", "needn": "need not", "don": "do not",
}

_PREFIXES = ("re", "un", "dis", "mis", "pre", "non", "over", "under", "out", "inter", "sub", "semi", "anti", "auto", "multi")
#: (ending, letters to put back on the stem). "ise" endings come off whole:
#: "professionalising" is "professional" + "ising".
_ENDINGS = (
    ("isations", ("",)), ("isation", ("",)), ("izations", ("",)), ("ization", ("",)),
    ("ising", ("",)), ("izing", ("",)), ("ised", ("",)), ("ized", ("",)), ("ises", ("",)), ("izes", ("",)),
    ("ise", ("",)), ("ize", ("",)),
    ("ings", ("", "e")), ("ing", ("", "e")), ("ies", ("y",)), ("ied", ("y",)), ("ed", ("", "e")), ("es", ("",)), ("s", ("",)),
    ("ers", ("", "e")), ("er", ("", "e")), ("est", ("", "e")), ("ly", ("",)), ("ness", ("",)), ("ment", ("",)),
    ("ments", ("",)), ("ful", ("",)), ("less", ("",)), ("able", ("", "e")),
)

#: Spelling limits by length of the stem being matched; see `_accept`.
_CHEAP = 0.6


def _limit(n: int) -> float:
    if n <= 3:
        return 0.0
    if n == 4:
        return _CHEAP
    if n <= 6:
        return 1.0
    if n <= 8:
        return 1.1
    if n <= 11:
        return 1.5
    return 2.0


@lru_cache(maxsize=1)
def _app_counts() -> Counter:
    """Word counts over the app's own help text: its vocabulary, and what
    breaks a tie between two readings. Empty when the help is not loadable
    (the speller then runs on the word list alone)."""
    try:
        from memorymap.ai import help_chat
        from memorymap.ai.help_topics_more import MORE_TOPICS

        text = " ".join(
            " ".join([str(t.get("title", "")), str(t.get("body", "")), " ".join(t.get("keywords") or [])])
            for t in [*help_chat.HELP_TOPICS, *MORE_TOPICS]
            if isinstance(t, dict)
        )
    except Exception:  # noqa: BLE001 - a missing help must not stop a question being read
        return Counter()
    return Counter(w for w in re.findall(r"[a-z]+", text.lower()) if len(w) >= 3)


@lru_cache(maxsize=1)
def _dictionary() -> dict[str, float]:
    """The words a misspelling is corrected towards, each with a weight: the
    word list at 1, the app's own words by how often its help uses them, and
    the documentation's long words (seven letters or more) at half: a short
    real word is too near other short words to be a target."""
    weights: dict[str, float] = {w: 1.0 for w in WORDS}
    for word, count in _app_counts().items():
        weights[word] = weights.get(word, 0.0) + count
    for word in MORE:
        if len(word) >= 7:
            weights.setdefault(word, 0.5)
    return weights


@lru_cache(maxsize=1)
def _recognised() -> frozenset:
    """Every word that is a word, so is left alone: the targets and all the
    documentation's words besides."""
    return frozenset(_dictionary()) | MORE


def _mask(word: str) -> int:
    bits = 0
    for ch in word:
        bits |= 1 << (ord(ch) - 97) if "a" <= ch <= "z" else 0
    return bits


@lru_cache(maxsize=1)
def _index() -> dict[int, list[tuple[str, int]]]:
    """Base words by length, each with its letter mask: the cheap filter that
    keeps the edit-distance search to a few dozen words."""
    by_len: dict[int, list[tuple[str, int]]] = {}
    for word in _dictionary():
        by_len.setdefault(len(word), []).append((word, _mask(word)))
    return by_len


def _stems(word: str):
    """(prefix, stem, ending, how) readings of a word: the stem is a candidate
    base. `how` says what was done to the stem, so the ending can be put back
    ("hoping" is "hope" + ing; "stopped" is "stop" + ped)."""
    yield "", word, "", ""
    for ending, backs in _ENDINGS:
        if word.endswith(ending) and len(word) - len(ending) >= 3:
            core = word[: -len(ending)]
            for back in backs:
                yield "", core + back, ending, "e" if back == "e" else "y" if back == "y" else ""
            if len(core) >= 4 and core[-1] == core[-2]:
                yield "", core[:-1], ending, "dbl"


def _readings(word: str):
    for stem_prefix, stem, ending, how in _stems(word):
        yield stem_prefix, stem, ending, how
    for prefix in _PREFIXES:
        if word.startswith(prefix) and len(word) - len(prefix) >= 5:
            rest = word[len(prefix):]
            for _, stem, ending, how in _stems(rest):
                yield prefix, stem, ending, how


def is_word(word: str, known=(), strict: bool = False) -> bool:  # noqa: ANN001
    """Whether `word` (lower case) is a word: listed, or a listed word with an
    ending or prefix, or one the person's notes hold. `strict` is the listed
    words alone: "lastest" is "last" and "est" to the long rule and no word."""
    if word in known:
        return True
    if strict:
        return not word.isalpha() or word in _recognised()
    return _is_word(word)


@lru_cache(maxsize=8192)
def _is_word(word: str) -> bool:
    if not word.isalpha():
        return True
    seen = _recognised()
    if word in seen:
        return True
    return any(stem in seen and len(stem) >= 3 and not (ending and stem in NO_ENDINGS) for _, stem, ending, _ in _readings(word))


def _rebuild(prefix: str, base: str, ending: str, how: str) -> str:
    if how == "e" and base.endswith("e") and ending[:1] in ("a", "e", "i", "o", "u", "y"):
        base = base[:-1]
    elif how == "y" and base.endswith("y"):
        base = base[:-1]
    elif how == "dbl":
        base = base + base[-1]
    return prefix + base + ending


def _accept(typed: str, base: str, d: float) -> bool:
    """Whether a distance is close enough for these two words. A word of the
    same length must be a cheap slip (a swap, a neighbouring key, a doubled
    letter) unless it is long: "hallway" is not "halfway" and "paid" is not
    "pair". A word a letter or more longer or shorter is read when it keeps
    its first and last letters (short) or is long enough to be unmistakable
    ("pasta" is not "past")."""
    n = len(typed)
    if d > _limit(n) or d == 0:
        return False
    if len(typed) == len(base):
        return d <= _CHEAP or (n >= 9 and d <= 1.0)
    if n >= 7:
        return True
    return typed[0] == base[0] and typed[-1] == base[-1]


@lru_cache(maxsize=4096)
def _candidates(stem: str, distance):  # noqa: ANN001
    """The list words near a stem, as (distance, -weight, word); cached, since
    one question is read many times over (`composer.rephrase`)."""
    index = _index()
    weights = _dictionary()
    mask = _mask(stem)
    out: list[tuple[float, float, str]] = []
    for n in range(len(stem) - 2, len(stem) + 3):
        for base, bmask in index.get(n, ()):
            if (mask ^ bmask).bit_count() > 5:
                continue
            d = distance(stem, base)
            if _accept(stem, base, d):
                out.append((d, -weights[base], base))
    return tuple(out)


def _own(stem: str, known, distance):  # noqa: ANN001
    """The person's own words a stem is near, weighted above the word list: a
    note that says "hotel" makes "hotle" a hotel."""
    mask = _mask(stem)
    out = []
    for base in known:
        if abs(len(base) - len(stem)) > 2 or len(base) < 4 or (mask ^ _mask(base)).bit_count() > 5:
            continue
        d = distance(stem, base)
        if _accept(stem, base, d):
            out.append((d, -4.0, base))
    return out


def _fix(word: str, after: str, before: str, distance, known=()):  # noqa: ANN001
    """The chosen reading of a misspelt word and the other reading it was near,
    as (chosen, alternative) or None. `known` are the person's own words (their
    notes'), which a misspelling is read towards before any list word."""
    if len(word) < 4:
        return _fix_short(word, after, before, distance)
    scored: list[tuple[float, str, float]] = []
    for prefix, stem, ending, how in _readings(word):
        if len(stem) < 4:
            continue
        for d, negw, base in [*_candidates(stem, distance), *_own(stem, known, distance)]:
            #: After an article the head is a noun: adverbs lose a near tie.
            penalty = 0.5 if before in DETERMINERS and base in NOT_AFTER_ARTICLE else 0.0
            scored.append((d + penalty, _rebuild(prefix, base, ending, how), -negw))
    if not scored:
        return None
    scored.sort(key=lambda row: (round(row[0] / 0.2), -row[2], row[0]))
    best = scored[0]
    pool = [row for row in scored if row[1] != best[1]]
    #: A rival must be the same kind of reading (not "calendarer" for "calender").
    other = next((row for row in pool if row[0] - best[0] <= 0.35 and _same_shape(best[1], row[1], word)), None)
    #: A rival nearly as near and as common: unsure, so offered.
    return best[1], (other[1] if other else None)


def _same_shape(a: str, b: str, typed: str) -> bool:
    """Two readings of one typed word that differ in length by at most a
    letter: the second is offered only then (not "calendarer" for "calender")."""
    return abs(len(a) - len(b)) <= 1


def _fix_short(word: str, after: str, before: str, distance):  # noqa: ANN001
    """A two- or three-letter token that is no word: read as a small word only
    when a letter was dropped or swapped, and between words (not alone)."""
    if len(word) < 2 or word in KNOWN_SHORT or not (after or before):
        return None
    if len(word) == 2:
        #: Two letters are read only as a small word with its first letter
        #: dropped ("nd" is "and") or its letters swapped ("ro" is "or").
        pool = [c for c in FUNCTION_PRIOR if (len(c) == 3 and c.endswith(word)) or (len(c) == 2 and c == word[::-1])]
        pool.sort(key=lambda c: -FUNCTION_PRIOR[c])
        return (pool[0], pool[1] if len(pool) > 1 else None) if pool else None
    context_prep = after in DETERMINERS
    pool = PREPOSITIONS if context_prep else frozenset(FUNCTION_PRIOR)
    limit = 1.0 if (context_prep or len(word) == 2) else _CHEAP
    scored = []
    for cand in pool:
        if abs(len(cand) - len(word)) > 1:
            continue
        d = distance(word, cand)
        #: A letter dropped from a small word that keeps its first and last
        #: letters ("mut" for "must") costs a whole edit but is the commonest slip.
        dropped = len(cand) == len(word) + 1 and cand[0] == word[0] and cand[-1] == word[-1]
        if 0 < d <= (1.0 if dropped else limit) and (cand[0] == word[0] or cand[-1] == word[-1] or sorted(cand) == sorted(word)):
            scored.append((d - FUNCTION_PRIOR.get(cand, 0.0), cand))
    if not scored:
        return None
    scored.sort()
    best = scored[0]
    other = next((row for row in scored[1:] if row[0] - best[0] <= 0.35), None)
    return best[1], (other[1] if other else None)


def fix(word: str, *, after: str = "", before: str = "", known=(), distance=None):  # noqa: ANN001
    """`(chosen, alternative)` for a misspelt lower-case word, else None.
    A word the list knows, the person's notes hold, or that carries a digit or
    apostrophe is never changed."""
    if not word.isalpha() or word in known or _is_word(word) or word in KNOWN_SHORT:
        return None
    if distance is None:
        from memorymap.ai.question_noise import distance as distance  # noqa: PLC0415 - same package, cycle
    return _fix(word, after.lower(), before.lower(), distance, known)


def _resegment(a: str, b: str, known) -> tuple[str, str] | None:  # noqa: ANN001
    """Two typed pieces re-cut at another place so that both are words:
    "thes" + "ebuttons" is "these" + "buttons". The nearest cut to the one
    typed, within three letters, with both halves of two letters or more."""
    joined = a + b
    best: tuple[int, int, str, str] | None = None
    for cut in range(2, len(joined) - 1):
        x, y = joined[:cut], joined[cut:]
        if (x, y) == (a, b) or abs(cut - len(a)) > 3:
            continue
        if is_word(x, known) and is_word(y, known):
            key = (abs(cut - len(a)), -min(len(x), len(y)))
            if best is None or key < best[:2]:
                best = (*key, x, y)
    return (best[2], best[3]) if best else None


def rejoin(tokens: list[str], known=(), skip=frozenset(), changes: list | None = None) -> list[str]:  # noqa: ANN001
    """Split words put back together and run-on pairs re-cut: "a nd" is "and",
    "whena ny" is "when any". Only where at least one piece is no word, and
    only into words; capitalised pieces (names), slang and numbers are left."""
    out: list[str] = []
    i = 0
    while i < len(tokens):
        a = tokens[i]
        b = tokens[i + 1] if i + 1 < len(tokens) else ""
        core_b = b.rstrip("?!.,:;")
        tail = b[len(core_b):]
        if b and a.islower() and core_b.islower() and a.isalpha() and core_b.isalpha() and a not in skip and core_b not in skip:
            if not (is_word(a, known) and is_word(core_b, known)) and a not in known and core_b not in known:
                whole = a + core_b
                if len(whole) >= 3 and is_word(whole, known):
                    if changes is not None:
                        changes.append((f"{a} {core_b}", whole))
                    out.append(whole + tail)
                    i += 2
                    continue
                #: A run-on pair is re-cut only when neither piece is a word
                #: ("thes ebuttons"); "the mantis" is a word and a rare word.
                cut = None if is_word(a, known) or is_word(core_b, known) else _resegment(a, core_b, known)
                if cut:
                    if changes is not None:
                        changes.append((f"{a} {core_b}", f"{cut[0]} {cut[1]}"))
                    out.extend([cut[0], cut[1] + tail])
                    i += 2
                    continue
        out.append(a)
        i += 1
    return out
