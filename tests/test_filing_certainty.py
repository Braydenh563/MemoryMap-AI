"""A model's own "how sure I am" is not shown as a probability.

Found by running a real small model (a 1.5B Qwen) end to end: a dentist
appointment was filed under Work and shown as "100% sure". A small model's
self-reported number says how it phrases itself, not how often it is right,
so what is displayed is calibrated: capped at 95, lowered when the notebook's
own words point somewhere else, and lowered for a category with few notes.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from memorymap.ai import filing_certainty
from memorymap.ai.filing_certainty import CAP, calibrate
from memorymap.api.app import create_app
from memorymap.core import deps
from memorymap.entry import manager
from tests.fakes import FakeEmbeddingService, FakeOllama

# --- the pure calibration ------------------------------------------------------


def test_a_model_pick_never_reads_one_hundred():
    assert calibrate(100, "llm", support=0.9, category_notes=30) == CAP == 95
    assert calibrate(100, "llm", support=None, category_notes=30) == 95


def test_a_match_by_meaning_or_by_words_is_capped_too():
    assert calibrate(100, "semantic-match", support=None, category_notes=30) == 95
    assert calibrate(100, "semantic-neighbours", support=None, category_notes=30) == 95
    assert calibrate(100, "words", support=None, category_notes=30) == 95
    # The words filer already stays between 50 and 85: nothing to lower.
    assert calibrate(70, "words", support=0.0, category_notes=2) == 70


def test_agreeing_evidence_leaves_the_number_alone():
    assert calibrate(88, "llm", support=0.9, category_notes=30) == 88
    assert calibrate(88, "llm", support=0.5, category_notes=30) == 88


def test_disagreeing_evidence_lowers_it_below_the_review_line():
    # The notebook's words put every vote on another category.
    assert calibrate(100, "llm", support=0.0, category_notes=30) < manager.REVIEW_CONFIDENCE
    half = calibrate(100, "llm", support=0.25, category_notes=30)
    assert calibrate(100, "llm", support=0.0, category_notes=30) < half < 95


def test_no_opinion_from_the_words_is_not_disagreement():
    assert calibrate(80, "llm", support=None, category_notes=30) == 80


def test_a_category_with_few_notes_is_trusted_less():
    sizes = [calibrate(90, "llm", support=None, category_notes=n) for n in range(0, 8)]
    assert sizes == sorted(sizes)
    assert sizes[0] < sizes[5] == sizes[7] == 90


def test_no_decision_stays_no_decision():
    assert calibrate(0, "none", support=0.0, category_notes=0) == 0
    assert calibrate(0, "llm", support=0.0, category_notes=0) == 0


def test_a_decision_never_calibrates_to_zero():
    # Zero reads as "nothing decided" everywhere; a real pick stays visible.
    assert calibrate(1, "llm", support=0.0, category_notes=0) >= 1


def test_what_is_shown_is_capped_unless_the_person_filed_it():
    assert filing_certainty.shown(100, user_filed=False) == 95
    assert filing_certainty.shown(60, user_filed=False) == 60
    assert filing_certainty.shown(100, user_filed=True) == 100


# --- the evidence, read from a notebook -----------------------------------------


def _seed(session):
    for content, category in (
        ("Dentist appointment Tuesday, teeth cleaning and a check up", "Health"),
        ("Dentist said the filling needs replacing, teeth sore", "Health"),
        ("Doctor appointment about the cough, check up booked", "Health"),
        ("Sprint planning meeting notes, roadmap and backlog", "Work"),
        ("Quarterly roadmap review with the team, backlog grooming", "Work"),
        ("Sent the invoice to the client, meeting on Friday", "Work"),
        ("Standup notes: blockers on the release, sprint scope", "Work"),
        ("Hiring plan for next quarter, interview loop and roadmap", "Work"),
    ):
        manager.create_entry(session, content, category_name=category)
    session.commit()


def test_the_words_disagreeing_with_the_model_lowers_what_is_shown(session, app_state):
    _seed(session)
    note = "Dentist appointment on Thursday, teeth check up"
    work = filing_certainty.calibrated(session, note, "Work", 100, "llm")
    health = filing_certainty.calibrated(session, note, "Health", 100, "llm")
    assert work < manager.REVIEW_CONFIDENCE
    assert health > work
    assert health <= CAP


def test_a_category_name_matches_regardless_of_case(session, app_state):
    _seed(session)
    note = "Dentist appointment on Thursday, teeth check up"
    assert filing_certainty.calibrated(session, note, "health", 100, "llm") == (
        filing_certainty.calibrated(session, note, "Health", 100, "llm")
    )


def test_an_invented_category_is_trusted_less_than_a_known_one(session, app_state):
    _seed(session)
    note = "something quite unrelated to any word above, zebra"
    invented = filing_certainty.calibrated(session, note, "Zoo trips", 90, "llm")
    assert invented < 90


# --- the filed note, through the API ---------------------------------------------


class _SureWorkOllama(FakeOllama):
    """The reported failure: a small model files everything under Work and
    says 100."""

    def _reply_text(self, messages):
        if "filing assistant" in messages[0]["content"].lower():
            self.chat_calls.append(messages)
            return '{"category": "Work", "confidence": 100}'
        return super()._reply_text(messages)


@pytest.fixture()
def sure_work_client(app_state):
    deps.override_ai(
        ollama=_SureWorkOllama(running=True),
        embeddings=FakeEmbeddingService(available=False),
    )
    return TestClient(create_app())


def test_a_model_that_says_one_hundred_is_not_shown_as_sure(sure_work_client, session):
    _seed(session)
    created = sure_work_client.post(
        "/entries", json={"content": "Dentist appointment on Thursday, teeth check up"}
    ).json()
    assert created["category"] == "Work"
    assert 0 < created["ai_confidence"] < manager.REVIEW_CONFIDENCE
    status = sure_work_client.get(f"/entries/{created['id']}/filing").json()
    assert status["ai_confidence"] == created["ai_confidence"]
    assert status["filed_by"] == "ai"


def test_a_low_certainty_pick_offers_the_other_categories(sure_work_client, session):
    _seed(session)
    created = sure_work_client.post(
        "/entries", json={"content": "Dentist appointment on Thursday, teeth check up"}
    ).json()
    status = sure_work_client.get(f"/entries/{created['id']}/filing").json()
    assert status["suggestions"] and status["suggestions"][0] == "Health"
    assert "Work" not in status["suggestions"]


def test_a_sure_pick_the_words_agree_with_offers_nothing(sure_work_client, session):
    _seed(session)
    created = sure_work_client.post(
        "/entries", json={"content": "Sprint planning meeting, roadmap and backlog review"}
    ).json()
    assert created["category"] == "Work"
    assert created["ai_confidence"] == 95
    status = sure_work_client.get(f"/entries/{created['id']}/filing").json()
    assert status["suggestions"] == []


def test_a_note_the_person_filed_is_not_a_percentage(sure_work_client):
    created = sure_work_client.post(
        "/entries", json={"content": "Dentist on Thursday", "category": "Health"}
    ).json()
    status = sure_work_client.get(f"/entries/{created['id']}/filing").json()
    assert status["filed_by"] == "user"
    assert created["ai_confidence"] == 100  # stored, never shown: the UI keys on filed_by/user_filed


def test_an_old_row_stored_as_one_hundred_is_shown_capped(sure_work_client, session):
    entry = manager.create_entry(
        session, "an older note", category_name="Work", ai_confidence=100
    )
    session.commit()
    out = sure_work_client.get(f"/entries/{entry.id}").json()
    assert out["ai_confidence"] == 95
    assert sure_work_client.get(f"/entries/{entry.id}/filing").json()["ai_confidence"] == 95
