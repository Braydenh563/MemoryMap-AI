"""Filing by the notebook's own words, with no model at all (INBOX 434).

The owner: notes must file "amazing even when the ai isn't available or
accessible and then even better with it". Before this, with no chat model
and no embedding model loaded, every new note went to Uncategorised: the
log line said "the keyword fallback", and there was no keyword fallback.

This is that fallback, and it is a real one. It learns from what the person
has already done:

* every filed note is a labelled example of its category (its words and its
  tags, a tag counting as three words because it is a deliberate label);
* a note the person filed or moved by hand counts twice, because that is the
  strongest statement anyone made about where a note belongs;
* a category's own name, said in the note, is evidence for it ("gym: 5x5
  squats" belongs in Gym whatever else it says).

It is nearest neighbours by shared rare words (TF-IDF cosine): the closest
notes vote for their categories by how close they are, the classical answer
for short text with few examples. No training step, exact to recompute, a
thousand-note notebook in milliseconds. It abstains rather than guesses: a
category needs two notes to be chosen, and the winner must hold most of the
vote with two notes (or its own name) behind it, or the note stays in
Uncategorised with nothing pretending to have decided. A wrong category is
worse than none, because a note filed wrongly is a note the person cannot
find. Measured on a hand-written 100-note, ten-category notebook
(`scratchpad/filing_eval.py`, leave one out): right 80% of the times it
files, filing 15% of notes that share little vocabulary on purpose; a real
notebook repeats its own words more than that one does.

Not used when a model answered: the chain in `janitor.categorise` is the model
first (when there is one), then filing by meaning, then this.
"""

from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap.core.database import Category, Entry
from memorymap.entry.manager import UNCATEGORISED

#: Words with no say in where a note belongs. Short on purpose: anything
#: frequent across *every* category already cancels out in the likelihoods,
#: so this list only has to catch the words that would otherwise dominate a
#: short note.
_STOP = frozenset(
    """a about after again all also am an and any are as at be because been
    before being but by can could did do does doing done for from get got had
    has have having he her here him his how i if in into is it its just like
    me more most my no not now of off on once only or other our out over own
    really same she should so some still such than that the their them then
    there these they this those through to too up us very was we were what
    when where which while who why will with would you your yes ok okay im
    ive dont didnt cant wont thats today tomorrow yesterday""".split()
)

_WORD = re.compile(r"[a-z0-9]+(?:'[a-z]+)?")

#: A tag is a label the person chose, so it says more than a word in passing.
TAG_WEIGHT = 3
#: A note filed or moved by hand: the strongest evidence there is.
USER_FILED_WEIGHT = 2
#: A category needs this many notes before it can be chosen.
MIN_EXAMPLES = 2
#: How many nearest notes vote.
NEIGHBOURS = 7
#: The category's own name in the note, as a vote.
NAME_VOTE = 0.6
#: To file, the winner needs this much summed similarity, this share of
#: all the votes, and this many notes (or its name) behind it. Tuned on
#: `scratchpad/filing_eval.py` for precision first: a wrong category is a
#: note lost, an Uncategorised one is a note waiting.
MIN_VOTE = 0.35
MIN_SHARE = 0.7
MIN_SUPPORT = 2
#: How many notes it reads, newest first; enough for any real notebook's
#: vocabulary and bounded so a huge one stays fast.
MAX_EXAMPLES = 4000


def tokens(text: str) -> list[str]:
    """Lower-case words, stop words out, a light plural fold ("squats" and
    "squat" are one word), digits kept ("5x5" is a gym word)."""
    out = []
    for word in _WORD.findall((text or "").lower()):
        word = word.replace("'", "")
        if len(word) < 2 or word in _STOP:
            continue
        if len(word) > 4 and word.endswith("ies"):
            word = word[:-3] + "y"
        elif len(word) > 3 and word.endswith("s") and not word.endswith("ss"):
            word = word[:-1]
        out.append(word)
    return out


@dataclass
class LexicalMatch:
    name: str
    confidence: int
    margin: float


def _tags(raw: str | None) -> list[str]:
    try:
        tags = json.loads(raw or "[]")
    except (TypeError, ValueError):
        return []
    return [str(tag) for tag in tags if tag] if isinstance(tags, list) else []


def lexical_category(
    session: Session, content: str, exclude_entry_id: int | None = None
) -> LexicalMatch | None:
    """The category the notebook's own words point to, or None to abstain."""
    tally = _tally(session, content, exclude_entry_id)
    if tally is None:
        return None
    votes, supporters = tally
    if not votes:
        return None
    ranked = sorted(votes.items(), key=lambda pair: pair[1], reverse=True)
    best_name, best = ranked[0]
    share = best / sum(votes.values())
    margin = best - (ranked[1][1] if len(ranked) > 1 else 0.0)
    if best < MIN_VOTE or share < MIN_SHARE or supporters[best_name] < MIN_SUPPORT:
        return None
    #: Confidence from how much of the vote the winner took, kept between 50
    #: and 85: this is word overlap, and saying so keeps it below anything a
    #: model reports.
    confidence = max(50, min(85, round(40 + 50 * share)))
    return LexicalMatch(name=best_name, confidence=confidence, margin=margin)


def suggest_categories(
    session: Session, content: str, exclude_entry_id: int | None = None, limit: int = 3
) -> list[str]:
    """Up to `limit` categories to offer as one-tap choices when nothing was
    sure enough to file the note (INBOX 434): the categories its words lean
    to, best first, then the ones used most recently. A guess shown as a
    choice costs a glance; a guess filed is a note lost."""
    out: list[str] = []
    tally = _tally(session, content, exclude_entry_id)
    if tally is not None:
        votes, _supporters = tally
        out.extend(name for name, _ in sorted(votes.items(), key=lambda pair: pair[1], reverse=True))
    if len(out) < limit:
        recent = session.execute(
            select(Category.name)
            .join(Entry, Entry.category_id == Category.id)
            .where(Entry.is_deleted == False, Category.name != UNCATEGORISED)  # noqa: E712
            .order_by(Entry.id.desc())
            .limit(200)
        ).scalars()
        for name in recent:
            if name not in out:
                out.append(name)
            if len(out) >= limit:
                break
    return out[:limit]


#: Tag suggestions: the nearest notes vote for their tags by closeness, and a
#: tag the person already uses whose words all appear in the note votes too.
TAG_NEIGHBOURS = 6
TAG_MIN_VOTE = 0.25
TAG_NAME_VOTE = 0.5


def suggest_tags(
    session: Session,
    content: str,
    have: list[str],
    exclude_entry_id: int | None = None,
    limit: int = 4,
) -> list[str]:
    """Tags this note probably wants, from the notebook's own (INBOX 440):
    "pre suggested tags that are made and kept when filing", with no AI. Only
    tags the person already uses are ever offered, so a suggestion is always
    one of their own words, best first; [] when nothing is close enough."""
    wanted = tokens(content)
    if not wanted:
        return []
    query = (
        select(Entry.content, Entry.tags)
        .where(Entry.is_deleted == False, Entry.tags != "[]")  # noqa: E712
        .order_by(Entry.id.desc())
        .limit(MAX_EXAMPLES)
    )
    if exclude_entry_id is not None:
        query = query.where(Entry.id != exclude_entry_id)
    rows = [(text, _tags(raw)) for text, raw in session.execute(query).all()]
    rows = [(text, tags) for text, tags in rows if tags]
    if not rows:
        return []
    have_folded = {tag.casefold() for tag in have}
    frequency: dict[str, int] = {}
    bags = []
    for text, _tags_of in rows:
        bag: dict[str, float] = {}
        for word in tokens(text):
            bag[word] = bag.get(word, 0.0) + 1.0
        for word in bag:
            frequency[word] = frequency.get(word, 0) + 1
        bags.append(bag)
    total = len(bags)
    idf = {word: math.log((1 + total) / (1 + count)) + 1.0 for word, count in frequency.items()}

    def vector(bag: dict[str, float]) -> dict[str, float]:
        out = {word: (1.0 + math.log(n)) * idf.get(word, 0.0) for word, n in bag.items() if word in idf}
        norm = math.sqrt(sum(v * v for v in out.values())) or 1.0
        return {word: v / norm for word, v in out.items()}

    query_bag: dict[str, float] = {}
    for word in wanted:
        query_bag[word] = query_bag.get(word, 0.0) + 1.0
    target = vector(query_bag)
    scored = []
    for (text, tags_of), bag in zip(rows, bags):
        doc = vector(bag)
        similarity = sum(value * doc.get(word, 0.0) for word, value in target.items())
        if similarity > 0:
            scored.append((similarity, tags_of))
    scored.sort(key=lambda pair: pair[0], reverse=True)
    votes: dict[str, float] = {}
    spelled: dict[str, str] = {}
    for similarity, tags_of in scored[:TAG_NEIGHBOURS]:
        for tag in tags_of:
            key = tag.casefold()
            spelled.setdefault(key, tag)
            votes[key] = votes.get(key, 0.0) + similarity
    #: A tag the note names outright ("some cardio after work").
    wanted_set = set(wanted)
    vocabulary = {tag.casefold(): tag for _text, tags_of in rows for tag in tags_of}
    for key, tag in vocabulary.items():
        words = tokens(tag.replace("/", " "))
        if words and all(word in wanted_set for word in words):
            spelled.setdefault(key, tag)
            votes[key] = votes.get(key, 0.0) + TAG_NAME_VOTE
    ranked = sorted(
        (key for key, vote in votes.items() if vote >= TAG_MIN_VOTE and key not in have_folded),
        key=lambda key: votes[key],
        reverse=True,
    )
    return [spelled[key] for key in ranked[:limit]]


def _tally(
    session: Session, content: str, exclude_entry_id: int | None
) -> tuple[dict[str, float], dict[str, int]] | None:
    """Each category's vote for `content` and how many notes (or its name)
    stand behind it; None when there is nothing to count."""
    wanted = tokens(content)
    if not wanted:
        return None
    query = (
        select(Category.name, Entry.content, Entry.tags, Entry.user_filed)
        .join(Entry, Entry.category_id == Category.id)
        .where(
            Entry.is_deleted == False,  # noqa: E712
            Entry.is_board == False,  # noqa: E712
            Category.name != UNCATEGORISED,
        )
        .order_by(Entry.id.desc())
        .limit(MAX_EXAMPLES)
    )
    if exclude_entry_id is not None:
        query = query.where(Entry.id != exclude_entry_id)
    rows = session.execute(query).all()
    if not rows:
        return None

    #: **Nearest notes by shared rare words** (TF-IDF cosine), each voting for
    #: its category by how close it is. Naive Bayes was tried first and
    #: measured on a 100-note, ten-category notebook (scratchpad/
    #: filing_eval.py): 46% right when it filed. On notes this short, the
    #: words two notes share are the whole signal, and a rare shared word
    #: ("squats", "lentils") says far more than a common one.
    docs: list[tuple[str, dict[str, float], int]] = []
    frequency: dict[str, int] = {}
    for name, text, raw_tags, by_hand in rows:
        bag: dict[str, float] = {}
        for word in tokens(text):
            bag[word] = bag.get(word, 0.0) + 1.0
        for tag in _tags(raw_tags):
            for word in tokens(tag.replace("/", " ")):
                bag[word] = bag.get(word, 0.0) + TAG_WEIGHT
        if not bag:
            continue
        for word in bag:
            frequency[word] = frequency.get(word, 0) + 1
        docs.append((name, bag, USER_FILED_WEIGHT if by_hand else 1))
    if not docs:
        return None
    total = len(docs)
    idf = {word: math.log((1 + total) / (1 + count)) + 1.0 for word, count in frequency.items()}

    def vector(bag: dict[str, float]) -> dict[str, float]:
        out = {word: (1.0 + math.log(n)) * idf.get(word, 0.0) for word, n in bag.items() if word in idf}
        norm = math.sqrt(sum(v * v for v in out.values())) or 1.0
        return {word: v / norm for word, v in out.items()}

    query_bag: dict[str, float] = {}
    for word in wanted:
        query_bag[word] = query_bag.get(word, 0.0) + 1.0
    query = vector(query_bag)
    notes_in: dict[str, int] = {}
    for name, _bag, _weight in docs:
        notes_in[name] = notes_in.get(name, 0) + 1

    scored: list[tuple[float, str, int]] = []
    for name, bag, weight in docs:
        if not query:
            break
        doc = vector(bag)
        similarity = sum(value * doc.get(word, 0.0) for word, value in query.items())
        if similarity > 0:
            scored.append((similarity, name, weight))
    scored.sort(reverse=True)
    votes: dict[str, float] = {}
    supporters: dict[str, int] = {}
    for similarity, name, weight in scored[:NEIGHBOURS]:
        if notes_in.get(name, 0) < MIN_EXAMPLES:
            continue
        votes[name] = votes.get(name, 0.0) + similarity * weight
        supporters[name] = supporters.get(name, 0) + 1

    #: Naming the category is a vote of its own ("gym: new shoes").
    for name in notes_in:
        name_words = tokens(name)
        if notes_in[name] >= MIN_EXAMPLES and name_words and all(word in wanted for word in name_words):
            votes[name] = votes.get(name, 0.0) + NAME_VOTE
            supporters[name] = supporters.get(name, 0) + MIN_SUPPORT

    return votes, supporters
