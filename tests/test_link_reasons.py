"""Tests for the link-reason audit (`ai.links`) and the pieces around it.

A previous agent's version of `audit_vague_links` called
`provider.run_prompt`, which does not exist anywhere in `ai.provider` — every
call raised `AttributeError`, was swallowed by the broad `except Exception`,
and the function always returned 0. The feature had never run once. These
tests exercise the fixed version against the same fake Ollama transport
(`tests/fakes.py::FakeOllama`, via the `fake_ollama` fixture) the rest of the
AI-facing suite uses, so the audit is actually observed running rather than
silently no-op'ing again.
"""

from __future__ import annotations

import pytest

from memorymap.ai import links, tools
from memorymap.core import deps
from memorymap.core.database import AuditLog, Entry, EntryLink
from memorymap.entry import manager


@pytest.fixture(autouse=True)
def _clear_failure_tracking():
    """`links._failed_attempts` is process-global, keyed by `EntryLink.id` —
    and every test here gets a fresh SQLite file whose autoincrement starts
    back at 1, so a link marked "failed" by one test's id=1 would otherwise
    silently poison the next test's own id=1. Clearing before and after
    keeps each test's view of the guard isolated, the way a fresh DB isolates
    everything else."""
    links._failed_attempts.clear()
    yield
    links._failed_attempts.clear()


def _linked_pair(session, reason=manager.AUTO_REASON_TEXT, reason_confidence=0.8):
    """Two notes linked the way `create_link` leaves them when nobody gives a
    reason and the embedding score clears `AUTO_REASON_THRESHOLD`: a generic
    reason plus a confidence score — exactly what `audit_vague_links` looks
    for. Inserted directly rather than through `create_link`, the same way
    `test_waven_api.py`'s backfill tests do, so each pair is independent of
    the embedding backend."""
    a = Entry(content="Planning the Denver move — dates and logistics", ai_confidence=0)
    b = Entry(content="More on the Denver move: packing and movers", ai_confidence=0)
    session.add_all([a, b])
    session.commit()
    link = EntryLink(
        source_entry_id=a.id,
        target_entry_id=b.id,
        reason=reason,
        reason_confidence=reason_confidence,
    )
    session.add(link)
    session.commit()
    return a, b, link


# --- (a) the audit actually rewrites a vague reason -----------------------------


def test_audit_rewrites_a_vague_reason(session, fake_ollama):
    _, _, link = _linked_pair(session)
    fake_ollama.librarian_reply = "both about the Denver move"

    updated = links.audit_vague_links(session, deps.get_model_manager(), fake_ollama, limit=10)

    assert updated == 1
    session.refresh(link)
    assert link.reason == "both about the Denver move"
    # A reason the AI wrote out in words is no longer a similarity guess.
    assert link.reason_confidence is None


def test_audit_also_rewrites_a_reason_confidence_guess_without_the_text(session, fake_ollama):
    """The other shape `_deduce_reason` can leave behind: `reason_confidence`
    set with a reason that isn't literally `AUTO_REASON_TEXT` (e.g. carried
    over from an older version of the app). The WHERE clause matches on
    `reason_confidence IS NOT NULL` for exactly this case."""
    _, _, link = _linked_pair(session, reason="similar in meaning", reason_confidence=0.61)
    fake_ollama.librarian_reply = "both mention the movers"

    updated = links.audit_vague_links(session, deps.get_model_manager(), fake_ollama, limit=10)

    assert updated == 1
    session.refresh(link)
    assert link.reason == "both mention the movers"
    assert link.reason_confidence is None


# --- (b) a vague model reply is rejected, the link is left alone ----------------


def test_a_vague_model_reply_is_rejected_and_the_link_left_unchanged(session, fake_ollama):
    _, _, link = _linked_pair(session)
    fake_ollama.librarian_reply = "similar in meaning"  # exactly the complaint

    updated = links.audit_vague_links(session, deps.get_model_manager(), fake_ollama, limit=10)

    assert updated == 0
    session.refresh(link)
    assert link.reason == manager.AUTO_REASON_TEXT
    assert link.reason_confidence == 0.8


def test_other_vague_phrasings_are_also_rejected(session, fake_ollama):
    _, _, link = _linked_pair(session)
    fake_ollama.librarian_reply = "Both notes discuss related topics"

    updated = links.audit_vague_links(session, deps.get_model_manager(), fake_ollama, limit=10)

    assert updated == 0
    session.refresh(link)
    assert link.reason == manager.AUTO_REASON_TEXT


def test_an_empty_model_reply_is_also_left_unchanged(session, fake_ollama):
    _, _, link = _linked_pair(session)
    fake_ollama.librarian_reply = "   "

    updated = links.audit_vague_links(session, deps.get_model_manager(), fake_ollama, limit=10)

    assert updated == 0
    session.refresh(link)
    assert link.reason == manager.AUTO_REASON_TEXT


# --- (c) the batch commits once and logs once, not per link ---------------------


def test_batch_writes_one_audit_log_row_not_one_per_link(session, fake_ollama):
    _linked_pair(session)
    _linked_pair(session)  # a second, independent vague link

    before = session.query(AuditLog).count()
    fake_ollama.librarian_reply = "shared moving deadline in June"

    updated = links.audit_vague_links(session, deps.get_model_manager(), fake_ollama, limit=10)

    assert updated == 2
    audited_rows = session.query(AuditLog).filter(AuditLog.action == "audited").all()
    assert len(audited_rows) == 1
    assert "2" in (audited_rows[0].detail or "")
    # Exactly one new row for the whole batch, not one per link updated.
    assert session.query(AuditLog).count() == before + 1


def test_no_log_row_at_all_when_nothing_was_updated(session, fake_ollama):
    _linked_pair(session)
    before = session.query(AuditLog).count()
    fake_ollama.librarian_reply = "similar in meaning"  # rejected

    updated = links.audit_vague_links(session, deps.get_model_manager(), fake_ollama, limit=10)

    assert updated == 0
    assert session.query(AuditLog).count() == before


# --- the infinite re-audit loop guard --------------------------------------------


def test_a_repeatedly_failing_link_is_not_retried_forever(session, fake_ollama, monkeypatch):
    """A link whose AI reason generation keeps failing must not be retried
    on every single pass forever — `audit_vague_links`'s own WHERE clause
    would otherwise pick it straight back up next time, since a failed
    attempt changes neither `reason` nor `reason_confidence`."""
    _, _, link = _linked_pair(session)
    links._failed_attempts.clear()

    def _boom(*a, **k):
        raise RuntimeError("model offline")

    monkeypatch.setattr(links.librarian, "generate_link_reason", _boom)

    for _ in range(links.MAX_ATTEMPTS_PER_PROCESS):
        updated = links.audit_vague_links(session, deps.get_model_manager(), fake_ollama, limit=10)
        assert updated == 0
    assert links._failed_attempts[link.id] == links.MAX_ATTEMPTS_PER_PROCESS

    # One more pass: the guard must skip this link WITHOUT calling the model
    # again — proven by making a call raise loudly instead of just failing.
    def _should_not_be_called(*a, **k):
        raise AssertionError("the retry guard should have skipped this link")

    monkeypatch.setattr(links.librarian, "generate_link_reason", _should_not_be_called)
    updated = links.audit_vague_links(session, deps.get_model_manager(), fake_ollama, limit=10)
    assert updated == 0

    links._failed_attempts.clear()


def test_a_link_that_succeeds_is_not_left_in_the_failure_table(session, fake_ollama):
    _, _, link = _linked_pair(session)
    links._failed_attempts.clear()
    fake_ollama.librarian_reply = "both about the Denver move"

    links.audit_vague_links(session, deps.get_model_manager(), fake_ollama, limit=10)

    assert link.id not in links._failed_attempts


# --- (d) the tool is registered, in WRITE_TOOLS, and callable -------------------


def test_audit_link_reasons_tool_is_registered_and_callable(session, fake_ollama):
    assert "audit_link_reasons" in tools.TOOLS
    assert "audit_link_reasons" in tools.WRITE_TOOLS

    _, _, link = _linked_pair(session)
    fake_ollama.librarian_reply = "both about the Denver move"

    result = tools.execute_tool(session, "audit_link_reasons", {"limit": 10})

    assert "error" not in result
    assert result["updated"] == 1
    session.refresh(link)
    assert link.reason == "both about the Denver move"


def test_the_audit_link_reasons_skill_names_only_that_tool(session):
    """The skill this feature ships with must be specifically about link
    REASONS, not general link management — it should offer only the one
    tool, not `link_notes`/`unlink_notes`."""
    from memorymap.ai import skills

    skill = skills.find(deps.get_config(), "Audit link reasons", known_tools=set(tools.TOOLS))
    assert skill is not None
    assert skill["tools"] == ["audit_link_reasons"]


# --- creating a link must not block on the model (manager._deduce_reason) -------


def test_creating_a_link_does_not_call_the_model(session, fake_ollama, fake_embeddings):
    """`_deduce_reason` used to call the model synchronously inside
    `create_link` — every link creation, human or agent, stalled on a chat
    round-trip. Two notes similar enough to clear `AUTO_REASON_THRESHOLD`
    must still get a reason (the cheap generic one) without ever asking the
    model."""
    a = manager.create_entry(session, "a funny scarecrow joke")
    b = manager.create_entry(session, "another funny pun")
    fake_embeddings.store_for_entry(session, a)
    fake_embeddings.store_for_entry(session, b)

    link = manager.create_link(session, a, b)

    assert link is not None
    assert link.reason == manager.AUTO_REASON_TEXT
    assert link.reason_confidence == 1.0
    assert fake_ollama.chat_calls == []


def test_backfill_endpoint_runs_the_ai_pass_over_the_reasons_it_just_deduced(
    ai_client, fake_ollama
):
    """The whole point of the button, and the thing it did not do.

    The embedding pass compares two vectors and has no words for what it
    found, so every reason it can write is the literal string "similar in
    meaning". A notebook that pressed "Give links a reason" therefore ended up
    with every link saying nothing — reported as the button appearing to work
    and producing reasons that were useless.

    So the endpoint runs both passes: deduce, then ask the model to name the
    actual connection. This pins that the second one happens, and that its
    result is what ends up on the link.
    """
    fake_ollama.librarian_reply = "both about the Tuesday gym session"
    a = ai_client.post("/entries", json={"content": "a funny scarecrow joke"}).json()
    b = ai_client.post("/entries", json={"content": "another funny pun"}).json()
    ai_client.post(f"/entries/{a['id']}/links", json={"target_id": b["id"]})

    result = ai_client.post("/entries/links/backfill-reasons").json()
    assert result["rewritten"] >= 1

    links = ai_client.get(f"/entries/{a['id']}").json()["links"]
    reasons = [link["reason"] for link in links]
    assert "similar in meaning" not in reasons
    assert any("Tuesday gym" in (r or "") for r in reasons)


def test_backfill_endpoint_can_skip_the_ai_pass(ai_client, fake_ollama):
    """`ai=false` is for when the model is known to be down and you just want
    the links marked — the cheap pass still runs and still commits."""
    a = ai_client.post("/entries", json={"content": "a funny scarecrow joke"}).json()
    b = ai_client.post("/entries", json={"content": "another funny pun"}).json()
    ai_client.post(f"/entries/{a['id']}/links", json={"target_id": b["id"]})

    result = ai_client.post(
        "/entries/links/backfill-reasons", json={"ai": False}
    ).json()
    assert result["rewritten"] == 0
