"""Evidence cards: answers you can audit sentence by sentence (WORLD_CLASS_PLAN
I6, H2; row 6).

The grounding row grows per I6's "Data" paragraph: `chunk_ordinal` (the
paragraph the passage sits in, the same split the paragraph vectors were
stored with), the span, `signals: {bm25, cosine, graph}` and a `verdict`.
`grounding.support` lists the sentences no note backs, so the evidence view
can say so beside each one. The frontend half (the card's three bars, the
side-by-side view) is pinned at the bottom against the shipped JS.
"""

from __future__ import annotations

import json
import re

from memorymap.ai import grounding
from memorymap.ai.embeddings import paragraph_chunks
from memorymap.core.database import Entry
from memorymap.search import chunks
from tests._app_js import app_js_text

FILLER = "and the rest of the paragraph carries on with ordinary words about the week"
GARDEN = (
    "Garden plan\n\n"
    f"The runner beans need netting before the pigeons find them, {FILLER}.\n\n"
    f"The scarecrow joke about outstanding in his field still makes the kids laugh, {FILLER}.\n\n"
    f"Buy milk and eggs on the way back from the allotment on Saturday, {FILLER}."
)
BOILER = "The boiler service is booked for the fourteenth with the engineer from town."


def _notes():
    return [
        {"id": 1, "content": GARDEN, "match_info": {"type": "hybrid", "score": 0.7}},
        {"id": 2, "content": BOILER, "match_info": {"type": "connected"}, "connected": True},
    ]


def test_each_row_carries_a_paragraph_and_a_span_inside_its_note():
    answer = "The scarecrow joke about outstanding in his field still makes the kids laugh."
    rows = grounding.ground_answer_sentences(answer, _notes())
    assert rows, "the sentence should ground to the garden note"
    row = rows[0]
    assert row["note_id"] == 1
    start, end = row["start"], row["end"]
    assert 0 <= start < end <= len(GARDEN)
    spans = paragraph_chunks(GARDEN)
    first, last = spans[row["chunk_ordinal"]]
    # The paragraph the passage overlaps most: a forty-word window often
    # starts at the tail of the paragraph before the one it is about.
    assert min(end, last) - max(start, first) > (end - start) / 2
    assert "scarecrow" in GARDEN[first:last]


def test_the_three_signals_are_shares_and_the_verdict_follows_the_words():
    answer = "The scarecrow joke about outstanding in his field still makes the kids laugh."
    row = grounding.ground_answer_sentences(answer, _notes())[0]
    signals = row["signals"]
    assert set(signals) == {"bm25", "cosine", "graph"}
    assert 0.5 <= signals["bm25"] <= 1.0
    assert signals["cosine"] is None  # no backend was offered: no invented bar
    assert signals["graph"] == 1.0
    assert row["verdict"] == "supported"


def test_a_note_reached_by_a_link_is_half_as_near():
    answer = "The boiler service is booked for the fourteenth with the engineer."
    row = grounding.ground_answer_sentences(answer, _notes())[0]
    assert row["note_id"] == 2
    assert row["signals"]["graph"] == 0.5


def test_a_tool_read_note_has_no_graph_signal():
    rows = grounding.ground_answer_sentences(
        "The boiler service is booked for the fourteenth with the engineer.",
        [{"id": 9, "content": BOILER}],
    )
    assert rows[0]["signals"]["graph"] is None


def test_the_meaning_signal_is_read_from_the_callable_and_clamped():
    seen = []

    def meaning(sentence, note_id, start, end):
        seen.append((note_id, start, end))
        return 1.4

    answer = "The scarecrow joke about outstanding in his field still makes the kids laugh."
    row = grounding.ground_answer_sentences(answer, _notes(), meaning=meaning)[0]
    assert row["signals"]["cosine"] == 1.0
    assert seen == [(1, row["start"], row["end"])]


def test_a_failing_meaning_signal_never_fails_the_answer():
    def meaning(*_args):
        raise RuntimeError("backend went away")

    answer = "The scarecrow joke about outstanding in his field still makes the kids laugh."
    row = grounding.ground_answer_sentences(answer, _notes(), meaning=meaning)[0]
    assert row["signals"]["cosine"] is None


def test_an_unsupported_sentence_is_listed_and_counted():
    answer = (
        "The scarecrow joke about outstanding in his field still makes the kids laugh. "
        "Quantum chromodynamics explains why protons hold together under pressure."
    )
    rows = grounding.ground_answer_sentences(answer, _notes())
    trust = grounding.support(answer, rows)
    assert trust["sentences"] == 2
    assert trust["supported"] == 1
    assert trust["unsupported"] == [
        "Quantum chromodynamics explains why protons hold together under pressure."
    ]


def test_the_meaning_scorer_reads_the_paragraph_the_passage_sits_in(session, fake_embeddings):
    """With paragraph vectors stored, a sentence about the joke scores against
    the joke paragraph (1.0 with the keyword fake), not the whole note, whose
    vector also carries the shopping paragraph."""
    entry = Entry(content=GARDEN, tags=json.dumps([]))
    session.add(entry)
    session.commit()
    fake_embeddings.store_for_entry(session, entry)
    score = chunks.meaning_scorer(session, fake_embeddings)
    assert score is not None
    joke_start = GARDEN.index("The scarecrow")
    assert score("The scarecrow joke still works.", entry.id, joke_start, joke_start + 20) == 1.0
    whole = score("The scarecrow joke still works.", entry.id, None, None)
    assert whole is not None and whole < 1.0


def test_no_backend_means_no_meaning_scorer(session):
    class Off:
        def is_ready(self):
            return False

    assert chunks.meaning_scorer(session, Off()) is None


def test_the_ask_stream_sends_the_evidence_fields(ai_client, fake_ollama, session):
    from memorymap.entry import manager

    manager.create_entry(session, "The runner beans need netting before the pigeons find them")
    session.commit()
    fake_ollama.librarian_reply = "The runner beans need netting before the pigeons find them."
    events = []
    with ai_client.stream(
        "POST",
        "/chat/stream",
        json={"question": "what about the beans", "notes_only": True, "use_tools": False},
    ) as response:
        for line in response.iter_lines():
            if line.strip():
                events.append(json.loads(line))
    grounded = [e for e in events if e.get("type") == "grounding"]
    assert grounded, [e.get("type") for e in events]
    row = grounded[0]["sentences"][0]
    assert {"chunk_ordinal", "signals", "verdict"} <= set(row)
    assert "unsupported" in grounded[0]["support"]


# --- the frontend half -----------------------------------------------------------

APP = app_js_text()


def _function(name: str) -> str:
    match = re.search(rf"^function {name}\(.*?^}}", APP, flags=re.S | re.M)
    assert match, name
    return match.group(0)


def test_the_peek_draws_three_signal_bars_and_the_verdict():
    body = _function("evidenceSignals")
    assert "EVIDENCE_SIGNALS" in body
    for key, label in (("bm25", "Words"), ("cosine", "Meaning"), ("graph", "Links")):
        assert f'["{key}", "{label}"]' in APP
    assert "verdict" in _function("openCitationPeek")


def test_the_evidence_view_lists_every_sentence_including_the_unsupported():
    body = _function("renderEvidenceView")
    assert "unsupported" in body
    assert "No note says this" in body
