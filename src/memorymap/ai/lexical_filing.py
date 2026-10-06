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
import threading
import time
from dataclasses import dataclass, field

from sqlalchemy import func, select
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


def category_support(
    session: Session, content: str, category: str, exclude_entry_id: int | None = None
) -> tuple[float | None, int]:
    """How the notebook's own words see `category` for `content`: (its share
    of the vote, how many notes it holds).

    The share is None when the words have no real opinion (nothing in common
    with a filed note, or the best vote under `MIN_VOTE`), because "the words
    know nothing" must not read as "the words disagree". Names compare
    without case, since a model answers "work" for "Work". Read by
    `filing_certainty`, which lowers a model's number when this disagrees."""
    wanted = (category or "").strip().lower()
    held = session.scalar(
        select(func.count(Entry.id))
        .join(Category, Entry.category_id == Category.id)
        .where(
            func.lower(Category.name) == wanted,
            Entry.is_deleted == False,  # noqa: E712
            Entry.is_board == False,  # noqa: E712
            Entry.id != (exclude_entry_id or 0),
        )
    )
    tally = _tally(session, content, exclude_entry_id)
    share: float | None = None
    if tally is not None:
        votes, _supporters = tally
        total = sum(votes.values())
        if votes and total > 0 and max(votes.values()) >= MIN_VOTE:
            share = sum(v for name, v in votes.items() if name.lower() == wanted) / total
    return share, int(held or 0)


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
    with _corpus_lock:
        corpus = _corpus_for(session)
        scope = _scope(session)
        docs = [
            (entry_id, doc)
            for entry_id, doc in corpus.docs.items()
            if doc.tags and entry_id != exclude_entry_id and scope(doc)
        ]
        if not docs:
            return []
        query_bag: dict[str, float] = {}
        for word in wanted:
            query_bag[word] = query_bag.get(word, 0.0) + 1.0
        scored = corpus.nearest(query_bag, "words", docs)
        have_folded = {tag.casefold() for tag in have}
        votes: dict[str, float] = {}
        spelled: dict[str, str] = {}
        for similarity, doc in scored[:TAG_NEIGHBOURS]:
            for tag in doc.tags:
                key = tag.casefold()
                spelled.setdefault(key, tag)
                votes[key] = votes.get(key, 0.0) + similarity
        #: A tag the note names outright ("some cardio after work").
        wanted_set = set(wanted)
        vocabulary = {tag.casefold(): tag for _id, doc in docs for tag in doc.tags}
    for key, tag in vocabulary.items():
        words = _tag_words(tag)
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
    names = dict(session.execute(select(Category.id, Category.name)).all())
    with _corpus_lock:
        corpus = _corpus_for(session)
        scope = _scope(session)
        docs = [
            (entry_id, doc)
            for entry_id, doc in corpus.docs.items()
            if entry_id != exclude_entry_id
            and not doc.board
            and doc.tagged
            and names.get(doc.category_id, UNCATEGORISED) != UNCATEGORISED
            and scope(doc)
        ]
        if not docs:
            return None

        #: **Nearest notes by shared rare words** (TF-IDF cosine), each voting
        #: for its category by how close it is. Naive Bayes was tried first
        #: and measured on a 100-note, ten-category notebook (scratchpad/
        #: filing_eval.py): 46% right when it filed. On notes this short, the
        #: words two notes share are the whole signal, and a rare shared word
        #: ("squats", "lentils") says far more than a common one.
        query_bag: dict[str, float] = {}
        for word in wanted:
            query_bag[word] = query_bag.get(word, 0.0) + 1.0
        notes_in: dict[str, int] = {}
        for _id, doc in docs:
            name = names[doc.category_id]
            notes_in[name] = notes_in.get(name, 0) + 1
        scored = [
            (similarity, names[doc.category_id], USER_FILED_WEIGHT if doc.by_hand else 1)
            for similarity, doc in corpus.nearest(query_bag, "tagged", docs)
        ]
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


# --- the corpus, kept rather than rebuilt (audit 2026-10-05, ARCH-02) ---------
#
# **A save used to read the notebook.** Both passes above read up to
# `MAX_EXAMPLES` notes' full text and tokenised every one of them, on every
# save, to rebuild the same TF-IDF tables: 490 ms of a 1,415 ms save at 610
# notes, and the main reason seeding fell from 11 notes a second at 40 notes
# to 1 a second at 750. The tables are now kept per notebook and brought up
# to date by a diff: one query of small columns (id, when it changed, its
# tags, its category) finds what changed since the last call, and only those
# notes are read and tokenised again. Scoring then reads only the notes that
# share a word with the one being filed, through an inverted index.
#
# The stamp is what an edit moves: `updated_at` (`onupdate`, so every ORM
# write), and the tags and category themselves, because a notebook-wide tag
# or category rename is one UPDATE statement that does not.


@dataclass
class _Doc:
    stamp: tuple
    workspace: str
    category_id: int | None
    by_hand: bool
    board: bool
    tags: list[str]
    #: `1 + log(count)` per word of the text: the tag pass's bag.
    words: dict[str, float]
    #: The same over the text and the tags (a tag counting `TAG_WEIGHT`
    #: times): the filing pass's bag.
    tagged: dict[str, float]
    #: `{kind: (epoch, length)}`: the bag's TF-IDF length, kept until the
    #: corpus has grown enough to move every word's rarity (`_Corpus.epoch`).
    lengths: dict[str, tuple[int, float]] = field(default_factory=dict)


#: Past this many postings, candidates come from the query's rarest words
#: only, and only the best `RESCORE` of them are scored in full. A shared
#: rare word is what puts a note among the nearest seven ("squats",
#: "lentils"); a word half the notebook uses moves the score a little and the
#: order of the top hardly at all, and reading its postings was most of the
#: cost on a notebook with a small vocabulary.
POSTINGS_BUDGET = 4_000
RESCORE = 64
#: How far the corpus may grow or shrink before every kept length is stale.
EPOCH_DRIFT = 0.1


class _Corpus:
    def __init__(self, key: str) -> None:
        self.key = key
        self.docs: dict[int, _Doc] = {}
        #: Per bag kind: how many docs hold each word, and which ones.
        self.frequency: dict[str, dict[str, int]] = {"words": {}, "tagged": {}}
        self.postings: dict[str, dict[str, set[int]]] = {"words": {}, "tagged": {}}
        self.totals: dict[str, int] = {"words": 0, "tagged": 0}
        #: Bumped when a kind's total has drifted `EPOCH_DRIFT` from the
        #: total its lengths were taken at; a length from an older epoch is
        #: taken again the next time its doc is scored.
        self.epoch: dict[str, int] = {"words": 0, "tagged": 0}
        self._epoch_total: dict[str, int] = {"words": 0, "tagged": 0}
        #: The newest `updated_at` read, and when the corpus was last read
        #: whole (`_corpus_for`).
        self.mark: str | None = None
        self.full_at = 0.0

    def _bags(self, doc: _Doc) -> dict[str, dict[str, float]]:
        # The tag pass only ever reads tagged notes, so only they count
        # towards its word rarity, as when it read them from the table.
        return {"words": doc.words if doc.tags else {}, "tagged": doc.tagged}

    def remove(self, entry_id: int) -> None:
        doc = self.docs.pop(entry_id, None)
        if doc is None:
            return
        for kind, bag in self._bags(doc).items():
            if not bag:
                continue
            self.totals[kind] -= 1
            frequency, postings = self.frequency[kind], self.postings[kind]
            for word in bag:
                frequency[word] -= 1
                if not frequency[word]:
                    del frequency[word]
                holders = postings.get(word)
                if holders is not None:
                    holders.discard(entry_id)
                    if not holders:
                        del postings[word]

    def add(self, entry_id: int, doc: _Doc) -> None:
        self.remove(entry_id)
        self.docs[entry_id] = doc
        for kind, bag in self._bags(doc).items():
            if not bag:
                continue
            self.totals[kind] += 1
            frequency, postings = self.frequency[kind], self.postings[kind]
            for word in bag:
                frequency[word] = frequency.get(word, 0) + 1
                postings.setdefault(word, set()).add(entry_id)

    def _idf(self, kind: str, word: str) -> float:
        count = self.frequency[kind].get(word)
        return math.log((1 + self.totals[kind]) / (1 + count)) + 1.0 if count else 0.0

    def _length(self, kind: str, doc: _Doc) -> float:
        kept = doc.lengths.get(kind)
        if kept is not None and kept[0] == self.epoch[kind]:
            return kept[1]
        bag = doc.words if kind == "words" else doc.tagged
        frequency, total = self.frequency[kind], self.totals[kind]
        squares = 0.0
        for word, weight in bag.items():
            count = frequency.get(word)
            if count:
                value = weight * (math.log((1 + total) / (1 + count)) + 1.0)
                squares += value * value
        length = math.sqrt(squares) or 1.0
        doc.lengths[kind] = (self.epoch[kind], length)
        return length

    def nearest(
        self, query_bag: dict[str, float], kind: str, docs: list[tuple[int, _Doc]]
    ) -> list[tuple[float, _Doc]]:
        """`(cosine, doc)` for the docs in `docs` that share a word with the
        query, best first: TF-IDF, each word's rarity taken over the whole
        kept corpus of this kind. Bounded work per call (`POSTINGS_BUDGET`,
        `RESCORE`), whatever the notebook's size."""
        total = self.totals[kind]
        if abs(total - self._epoch_total[kind]) > EPOCH_DRIFT * max(self._epoch_total[kind], 1):
            self.epoch[kind] += 1
            self._epoch_total[kind] = total
        target = {word: (1.0 + math.log(n)) * self._idf(kind, word) for word, n in query_bag.items()}
        target = {word: value for word, value in target.items() if value}
        if not target:
            return []
        norm = math.sqrt(sum(v * v for v in target.values())) or 1.0
        #: Each query word's share of a dot product with a doc's `1 + log n`.
        share = {word: value / norm * self._idf(kind, word) for word, value in target.items()}
        allowed = dict(docs)
        postings = self.postings[kind]
        by_words = kind == "words"
        partial: dict[int, float] = {}
        read = 0
        for word in sorted(share, key=lambda w: len(postings.get(w, ()))):
            holders = postings.get(word, ())
            if read and read + len(holders) > POSTINGS_BUDGET:
                break
            read += len(holders)
            weight = share[word]
            for holder in holders:
                doc = allowed.get(holder)
                if doc is not None:
                    partial[holder] = partial.get(holder, 0.0) + weight * (doc.words if by_words else doc.tagged)[word]
        if not partial:
            return []
        ranked = sorted(partial, key=partial.__getitem__, reverse=True)[:RESCORE]
        scored: list[tuple[float, _Doc]] = []
        for holder in ranked:
            doc = allowed[holder]
            bag = doc.words if by_words else doc.tagged
            dot = sum(weight * bag.get(word, 0.0) for word, weight in share.items())
            similarity = dot / self._length(kind, doc)
            if similarity > 0:
                scored.append((similarity, doc))
        scored.sort(key=lambda pair: pair[0], reverse=True)
        return scored


_corpus: _Corpus | None = None
#: Held while the corpus changes or is read. Never across a model call; the
#: only database work under it is the diff's own two small reads.
_corpus_lock = threading.RLock()


def _tag_words(tag: str) -> list[str]:
    return tokens(tag.replace("/", " "))


def _make_doc(stamp: tuple, content: str, tags: list[str], workspace, category_id, by_hand, board) -> _Doc:  # noqa: ANN001
    counts: dict[str, float] = {}
    for word in tokens(content):
        counts[word] = counts.get(word, 0.0) + 1.0
    tagged_counts = dict(counts)
    for tag in tags:
        for word in _tag_words(tag):
            tagged_counts[word] = tagged_counts.get(word, 0.0) + TAG_WEIGHT
    words = {word: 1.0 + math.log(n) for word, n in counts.items()}
    tagged = {word: 1.0 + math.log(n) for word, n in tagged_counts.items()}
    return _Doc(
        stamp=stamp,
        workspace=str(workspace or "default"),
        category_id=category_id,
        by_hand=bool(by_hand),
        board=bool(board),
        tags=tags,
        words=words,
        tagged=tagged,
    )


#: How often the corpus is read whole rather than by what changed. Between
#: full reads only notes whose `updated_at` moved are read, which every ORM
#: write does; a statement that writes round the ORM (a space deleted, its
#: notes moved, which calls `forget_corpus`; a hard purge) is caught here.
FULL_REFRESH_SECONDS = 30.0

_STAMP_COLUMNS = "id, updated_at, tags, category_id, user_filed, is_board, workspace_id"


def _corpus_for(session: Session) -> _Corpus:
    """The kept corpus for this notebook, brought up to date. Call under
    `_corpus_lock`.

    Driver SQL, not an ORM select, on purpose: the corpus is every space's
    notes (the space hook would otherwise narrow it to whichever space the
    first caller had), and `_scope` narrows at read time instead.
    """
    global _corpus
    bind = session.get_bind()
    key = str(getattr(bind, "url", ""))
    if _corpus is None or _corpus.key != key:
        _corpus = _Corpus(key)
    corpus = _corpus
    connection = session.connection()
    now = time.monotonic()
    current: dict[int, tuple] = {}
    if corpus.mark is None or now - corpus.full_at > FULL_REFRESH_SECONDS:
        rows = connection.exec_driver_sql(
            f"SELECT {_STAMP_COLUMNS} FROM entries "  # noqa: S608  # constant columns
            "WHERE is_deleted = 0 AND is_private = 0 ORDER BY id DESC LIMIT ?",
            (MAX_EXAMPLES,),
        ).fetchall()
        current = {int(row[0]): tuple(row[1:]) for row in rows}
        for gone in [entry_id for entry_id in corpus.docs if entry_id not in current]:
            corpus.remove(gone)
        corpus.full_at = now
    else:
        # What moved since the last read, binned and made private included:
        # those leave the corpus. `>=`, so a write in the same instant as the
        # mark is read again rather than missed; its stamp then matches.
        for row in connection.exec_driver_sql(
            f"SELECT {_STAMP_COLUMNS}, is_deleted, is_private FROM entries "  # noqa: S608  # constant columns
            "WHERE updated_at >= ?",
            (corpus.mark,),
        ).fetchall():
            entry_id = int(row[0])
            if row[7] or row[8]:
                corpus.remove(entry_id)
            else:
                current[entry_id] = tuple(row[1:7])
    marks = [stamp[0] for stamp in current.values() if stamp[0] is not None]
    if marks:
        corpus.mark = max([*marks, corpus.mark] if corpus.mark is not None else marks)
    elif corpus.mark is None:
        corpus.mark = ""
    stale = [entry_id for entry_id, stamp in current.items() if (doc := corpus.docs.get(entry_id)) is None or doc.stamp != stamp]
    for start in range(0, len(stale), 500):
        batch = stale[start : start + 500]
        placeholders = ",".join("?" for _ in batch)
        for entry_id, content in connection.exec_driver_sql(
            f"SELECT id, content FROM entries WHERE id IN ({placeholders})", tuple(batch)  # noqa: S608  # placeholders only
        ).fetchall():
            stamp = current[int(entry_id)]
            _updated, raw_tags, category_id, by_hand, board, workspace = stamp
            corpus.add(
                int(entry_id),
                _make_doc(stamp, content or "", _tags(raw_tags), workspace, category_id, by_hand, board),
            )
    # The newest `MAX_EXAMPLES`, as the full read takes them.
    if len(corpus.docs) > MAX_EXAMPLES:
        for entry_id in sorted(corpus.docs)[: len(corpus.docs) - MAX_EXAMPLES]:
            corpus.remove(entry_id)
    return corpus


def _scope(session: Session):  # noqa: ANN202
    """Which kept notes this session may see: its space, or every space not
    hidden from "All spaces", as the space hook decides for an ORM read."""
    workspace = session.info.get("workspace_id")
    if workspace and workspace != "all":
        return lambda doc: doc.workspace == workspace
    hidden = set(session.info.get("hidden_workspaces") or ()) if workspace == "all" else set()
    if hidden:
        return lambda doc: doc.workspace not in hidden
    return lambda doc: True


def forget_corpus() -> None:
    """Drop the kept corpus (a restore replaced the notebook underneath it)."""
    global _corpus
    with _corpus_lock:
        _corpus = None
