"""An answer with no model in it: the notes' own words, chosen and ordered.

Asked for directly (INBOX 269, the owner): *"I want to maximise the ability
and function of all the application features without ai, the ai features
should just be the bonus"*, and then again: *"maybe there can be a fill-in
system response/description/explanation that can replace the ai using clever
sentence stringing and composition to give the user a breakdown of the results
on the ask page in place of the ai"*.

**What this is not.** It does not write prose, paraphrase, or infer. Every
sentence it returns was typed by the person whose notebook it is, and it says
so. A generator that stitched half-sentences into fluent-looking text would be
producing claims nobody made, which is the one thing a notebook must never do.

**What it is.** Retrieval has already run by the time this is reached: the
notes are ranked and in hand. The missing step was composition, and the
machinery for it was already here too. `grounding.best_passage` answers "which
passage of this note is this sentence most likely to have come from" with BM25
scored *within the note*, which is exactly the right question asked of the
user's own question: which paragraph of this note is about what they asked.
So the answer is that paragraph, per note, best first, with the note it came
from named.

The result is grounded by construction. An extractive answer cannot be wrong
about where a claim came from, because the claim *is* the passage, so the same
citation markers the model's answers carry can be produced from it exactly
rather than matched back by string search.
"""
from __future__ import annotations

from memorymap.ai import grounding

#: How many notes an answer draws from. Four is the number of passages that
#: still reads as an answer rather than as a search results page: past that
#: the reader is skimming, which is what the Sources panel below the answer is
#: already for.
MAX_PASSAGES = 4

#: **A share of the best score, not a number.** A first version used an
#: absolute floor of 0.35 and returned nothing at all for a question whose
#: three notes matched correctly: BM25's magnitude depends on how many
#: passages a note has and how long they are, so a one-paragraph note scoring
#: a perfectly good 0.288 was discarded while the same match inside a longer
#: note would have passed. Measured exactly that way before this was changed.
#:
#: `best_passage` already returns None when the question and the note share no
#: meaningful word, which is the real floor. This is only the second question:
#: is this passage in the same league as the best one found, or is it a note
#: that happens to use one of the same words.
RELATIVE_FLOOR = 0.35

#: How long one quoted passage may run before it is cut. A paragraph of a
#: hundred and forty words is not an answer, it is the note, and the note is
#: one click away on the card beside it.
MAX_PASSAGE_CHARS = 320

LEAD = (
    "No model is running, so this is not a written answer: it is what your "
    "own notes say, in their words, most relevant first."
)

NOTHING_MATCHED = (
    "No model is running, and none of the notes found share enough with your "
    "question to quote. The matching notes are listed beside this answer."
)


def _trim(text: str) -> str:
    """One passage, shortened at a word boundary rather than mid-word.

    An ellipsis, because a passage that has been cut and does not say so reads
    as a note that ends mid-sentence, which is a bug report waiting to happen.
    """
    flat = " ".join(text.split())
    if len(flat) <= MAX_PASSAGE_CHARS:
        return flat
    cut = flat[:MAX_PASSAGE_CHARS]
    space = cut.rfind(" ")
    return (cut[:space] if space > MAX_PASSAGE_CHARS // 2 else cut).rstrip(" ,;:") + "…"


def passages_for(question: str, notes: list[dict], limit: int = MAX_PASSAGES) -> list[dict]:
    """The best passage of each note, ranked, with its offsets kept.

    Offsets rather than text alone, because the caller turns these into the
    same grounding rows a model's answer produces, and those carry `start` and
    `end` so the citation can highlight the passage inside the note's own card.
    """
    found: list[dict] = []
    for note in notes or []:
        content = str(note.get("content") or "")
        note_id = note.get("id")
        if not content or note_id is None:
            continue
        best = grounding.best_passage(question, content)
        if not best:
            continue
        start, end, score = best
        #: The full stop the passage split left behind. `_passages` ends a
        #: span at the last word, so a quoted paragraph arrived without its
        #: own final punctuation and read as a note cut off mid-thought.
        while end < len(content) and content[end] in ".!?\u2026":
            end += 1
        found.append(
            {
                "note_id": note_id,
                "start": start,
                "end": end,
                "score": score,
                "text": _trim(content[start:end]),
            }
        )
    #: By score, then by the order retrieval put them in, which is itself a
    #: relevance order: a stable sort leaves ties as retrieval ranked them
    #: rather than reordering them arbitrarily on every call.
    found.sort(key=lambda row: row["score"], reverse=True)
    if not found:
        return []
    floor = found[0]["score"] * RELATIVE_FLOOR
    return [row for row in found if row["score"] >= floor][:limit]


def answer(question: str, notes: list[dict], limit: int = MAX_PASSAGES) -> dict:
    """`{"text": str, "grounding": [...]}`, both empty-safe.

    The grounding rows are the same shape `grounding.ground_answer_sentences`
    produces for a model's answer, so the client numbers, links and highlights
    them with the code it already has. Nothing downstream needs to know which
    kind of answer it is looking at, which is the point: an offline answer that
    arrived in a shape of its own would be a second rendering path to keep in
    step with the first.
    """
    rows = passages_for(question, notes, limit)
    if not rows:
        return {"text": NOTHING_MATCHED, "grounding": []}
    #: One blank line between the lead and the first passage, not two: the
    #: join already puts one in, and an empty element added a second.
    text = "\n\n".join([LEAD, *(row["text"] for row in rows)])
    return {
        "text": text,
        "grounding": [
            {
                "sentence": row["text"],
                "note_id": row["note_id"],
                "start": row["start"],
                "end": row["end"],
                "score": row["score"],
            }
            for row in rows
        ],
    }
