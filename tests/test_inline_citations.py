"""Numbered citations inside an AI answer, not only in a row beneath it.

Asked for directly: *"inline referencing with hyperlinks in ai chat messages
would be amazing."*

The data always existed — `ground_answer_sentences` returns {sentence,
note_id} pairs — and only ever reached a chip row under the answer, which is
the one place a claim and its source are *not* read together.

Asserted against the source because this app has no DOM in its Python suite
(same reason `test_frontend_ids.py` exists). The behaviour itself was driven
in Chromium: two grounded sentences in one paragraph produced markers 1 and 2
in the right places, a grounded sentence that does not appear in the answer
produced none, and the chips renumbered to match.
"""

from __future__ import annotations

from pathlib import Path

import pytest

SOURCE = Path(__file__).resolve().parents[1] / "frontend" / "app.js"


@pytest.fixture(scope="module")
def app_js() -> str:
    return SOURCE.read_text(encoding="utf-8")


def test_the_function_exists(app_js):
    assert "function addInlineCitations(" in app_js


def test_it_is_actually_called(app_js):
    """CLAUDE.md's own "features that never ran once" category: a function
    with no call site is not a feature. `renderAnswerGrounding` is the one
    place that has both the sentences and the answer element."""
    assert "addInlineCitations(answerEl, sentences, rawResults)" in app_js


def test_every_grounding_call_site_passes_the_answer_element(app_js):
    """Three surfaces render grounding — the Ask box, a live chat turn, and a
    reopened conversation. A call site that forgets the fourth argument gets
    the chips and silently no markers, which is exactly the half-wired state
    this file exists to prevent."""
    calls = app_js.count("renderAnswerGrounding(")
    # One definition plus three call sites.
    assert calls == 4, f"expected 4 mentions, found {calls}"
    for needle in ("answerBox\n", 'bubble.querySelector(".bubble-answer")', 'handles.bubble?.querySelector(".bubble-answer")'):
        assert needle in app_js


def test_a_sentence_split_across_markup_is_skipped_not_reassembled(app_js):
    """A citation attached to the wrong half of a sentence is worse than no
    citation, and the chip row still lists every source either way."""
    body = app_js.split("function addInlineCitations(")[1].split("\nfunction renderAnswerGrounding(")[0]
    assert "indexOf(" in body, "matching must stay a whole-sentence search inside one text node"
    assert "NodeFilter.SHOW_TEXT" in body


def test_both_halves_of_a_split_node_are_rescanned(app_js):
    """The measured bug: placing a marker splits the text node, and a
    paragraph routinely holds several grounded sentences. Re-queueing only
    the tail left the first sentence of a paragraph unmarked whenever the
    second one happened to be longer (they are matched longest-first)."""
    body = app_js.split("function addInlineCitations(")[1].split("\nfunction renderAnswerGrounding(")[0]
    assert "queue.unshift(tail)" in body
    assert "queue.unshift(node)" in body


def test_the_chips_are_numbered_to_match_the_markers(app_js):
    body = app_js.split("function renderAnswerGrounding(")[1].split("\n}")[0]
    assert "${n}." in body, "the chip row is the key to the markers, so it has to count"
