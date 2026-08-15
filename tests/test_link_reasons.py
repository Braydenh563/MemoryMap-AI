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


def _save(client, content, **extra):
    response = client.post("/entries", json={"content": content, **extra})
    assert response.status_code == 201
    return response.json()


# --- link suggestions (unlinked pairs the deduction would reason about) -----------


def test_link_suggestions_pairs_similar_unlinked_notes(ai_client):
    # The fake embedder puts both "joke" notes on the same axis (cosine 1).
    a = _save(ai_client, "a funny scarecrow joke")
    b = _save(ai_client, "another funny pun")
    _save(ai_client, "buy milk and eggs")  # different topic

    suggestions = ai_client.get("/entries/link-suggestions").json()
    pairs = {frozenset((s["source_id"], s["target_id"])) for s in suggestions}
    assert frozenset((a["id"], b["id"])) in pairs
    assert all(s["similarity"] >= 0.55 for s in suggestions)


def test_link_suggestions_skips_already_linked(ai_client):
    a = _save(ai_client, "a funny scarecrow joke")
    b = _save(ai_client, "another funny pun")
    ai_client.post(f"/entries/{a['id']}/links", json={"target_id": b["id"]})
    suggestions = ai_client.get("/entries/link-suggestions").json()
    pairs = {frozenset((s["source_id"], s["target_id"])) for s in suggestions}
    assert frozenset((a["id"], b["id"])) not in pairs


def test_link_suggestions_empty_without_embeddings(client):
    _save(client, "note one")
    _save(client, "note two")
    assert client.get("/entries/link-suggestions").json() == []


def test_link_suggestions_carry_the_reason_linking_would_deduce(ai_client):
    """Asked directly: a suggestion showed a bare percentage with nothing
    saying *why*, unlike an actual link. `LINK_SUGGESTION_THRESHOLD` equals
    `manager.AUTO_REASON_THRESHOLD` exactly, so every suggestion here would
    get this same text if it were linked with no reason given — showing it
    up front is a preview of that outcome, not a separate guess."""
    a = _save(ai_client, "a funny scarecrow joke")
    b = _save(ai_client, "another funny pun")

    suggestions = ai_client.get("/entries/link-suggestions").json()
    match = next(
        s for s in suggestions if frozenset((s["source_id"], s["target_id"])) == frozenset((a["id"], b["id"]))
    )
    assert match["reason"] == "similar in meaning"


# --- link reason: deduced with a confidence score, and editable by hand -------------
#
# "whenever a link is made, it should try to find a reason and that reason
# should probably have a confidence score. if a sufficient reason cant be
# deduced or the reason doesnt match then that reason can be left as invalid"
# (user-reported). The fake embedder puts same-topic notes on the same axis
# (cosine 1.0) and different-topic notes on different axes (cosine 0.0), which
# is exactly the signal `create_link` checks when nobody gives it a reason.


def test_a_link_with_no_reason_gets_one_deduced_from_similarity(ai_client):
    a = _save(ai_client, "a funny scarecrow joke")
    b = _save(ai_client, "another funny pun")

    linked = ai_client.post(f"/entries/{a['id']}/links", json={"target_id": b["id"]})
    link = linked.json()["links"][0]
    assert link["reason"] == "similar in meaning"
    assert link["reason_confidence"] == 1.0


def test_an_unrelated_pair_is_left_with_no_reason_at_all(ai_client):
    a = _save(ai_client, "a funny scarecrow joke")
    b = _save(ai_client, "buy milk and eggs")

    linked = ai_client.post(f"/entries/{a['id']}/links", json={"target_id": b["id"]})
    link = linked.json()["links"][0]
    assert link["reason"] is None
    assert link["reason_confidence"] is None


def test_a_reason_someone_gave_is_never_overridden_by_a_guess(ai_client):
    """Two notes close enough to be auto-reasoned still keep the human's own
    words — and a stated reason never carries a similarity score, since it
    isn't one."""
    a = _save(ai_client, "a funny scarecrow joke")
    b = _save(ai_client, "another funny pun")

    linked = ai_client.post(
        f"/entries/{a['id']}/links",
        json={"target_id": b["id"], "reason": "both jokes I heard at the party"},
    )
    link = linked.json()["links"][0]
    assert link["reason"] == "both jokes I heard at the party"
    assert link["reason_confidence"] is None


def test_no_reason_is_deduced_without_embeddings(client):
    """The plain `client` fixture has no working embedding backend — the same
    case `/entries/link-suggestions` already returns empty for."""
    a = _save(client, "first note")
    b = _save(client, "second note")

    linked = client.post(f"/entries/{a['id']}/links", json={"target_id": b["id"]})
    link = linked.json()["links"][0]
    assert link["reason"] is None
    assert link["reason_confidence"] is None


def test_a_links_reason_can_be_added_edited_and_cleared_by_hand(client):
    a = _save(client, "first note")
    b = _save(client, "second note")
    link_id = client.post(
        f"/entries/{a['id']}/links", json={"target_id": b["id"]}
    ).json()["links"][0]["link_id"]

    added = client.put(
        f"/entries/{a['id']}/links/{link_id}/reason", json={"reason": "written by hand"}
    )
    assert added.status_code == 200
    assert added.json()["links"][0]["reason"] == "written by hand"

    edited = client.put(
        f"/entries/{a['id']}/links/{link_id}/reason", json={"reason": "changed my mind"}
    )
    assert edited.json()["links"][0]["reason"] == "changed my mind"

    cleared = client.put(f"/entries/{a['id']}/links/{link_id}/reason", json={"reason": None})
    assert cleared.json()["links"][0]["reason"] is None


def test_backfill_deduces_reasons_for_links_made_before_the_feature_existed(
    ai_client, session
):
    """"none of my notes have a linked reason yet — is there an easy way to
    give them all a reason?" `_deduce_reason` only ever ran at the moment
    `create_link` made a *new* link, so a link made before that shipped (or
    while the embedding backend was off) stays mute forever with nothing to
    revisit it. Simulated here by inserting `EntryLink` rows directly,
    bypassing `create_link`'s own deduction, the way an old link in a real
    notebook would already sit in the table.
    """
    a = _save(ai_client, "a funny scarecrow joke")
    b = _save(ai_client, "another funny pun")
    c = _save(ai_client, "buy milk and eggs")
    session.add(
        EntryLink(source_entry_id=a["id"], target_entry_id=b["id"])
    )  # similar — should clear the bar
    session.add(
        EntryLink(source_entry_id=a["id"], target_entry_id=c["id"])
    )  # unrelated — should not
    session.commit()

    result = ai_client.post("/entries/links/backfill-reasons", json={"ai": False}).json()
    # The endpoint reports a third number now: `rewritten`, the links the AI
    # pass turned from "similar in meaning" into an actual reason. Asserted as
    # a subset rather than an exact dict, so adding a counter is not a test
    # failure — what this test is about is the deduction, not the shape.
    assert result["checked"] == 2
    assert result["updated"] == 1

    links = ai_client.get(f"/entries/{a['id']}").json()["links"]
    by_target = {link["entry_id"]: link for link in links}
    assert by_target[b["id"]]["reason"] == "similar in meaning"
    assert by_target[b["id"]]["reason_confidence"] == 1.0
    assert by_target[c["id"]]["reason"] is None


def test_backfill_never_touches_a_reason_someone_already_gave_directly(ai_client, session):
    a = _save(ai_client, "first note")
    b = _save(ai_client, "second note")
    session.add(
        EntryLink(
            source_entry_id=a["id"], target_entry_id=b["id"], reason="written by hand"
        )
    )
    session.commit()

    result = ai_client.post("/entries/links/backfill-reasons", json={"ai": False}).json()
    assert result["checked"] == 0
    assert result["updated"] == 0

    link = ai_client.get(f"/entries/{a['id']}").json()["links"][0]
    assert link["reason"] == "written by hand"


def test_editing_a_reason_by_hand_clears_a_deduced_confidence(ai_client):
    """Once a person has spoken for the link, the similarity score that
    produced the old reason no longer describes anything — an edited link
    and a fresh auto-reasoned one that hasn't been touched must stay
    tellable apart, so the score is cleared rather than left stale."""
    a = _save(ai_client, "a funny scarecrow joke")
    b = _save(ai_client, "another funny pun")
    link = ai_client.post(f"/entries/{a['id']}/links", json={"target_id": b["id"]}).json()[
        "links"
    ][0]
    assert link["reason_confidence"] == 1.0

    edited = ai_client.put(
        f"/entries/{a['id']}/links/{link['link_id']}/reason",
        json={"reason": "actually, both jokes from work"},
    )
    edited_link = edited.json()["links"][0]
    assert edited_link["reason"] == "actually, both jokes from work"
    assert edited_link["reason_confidence"] is None


def test_editing_a_reason_on_someone_elses_link_id_is_404(client):
    a = _save(client, "first note")
    b = _save(client, "second note")
    c = _save(client, "an unrelated third note")
    link_id = client.post(
        f"/entries/{a['id']}/links", json={"target_id": b["id"]}
    ).json()["links"][0]["link_id"]

    response = client.put(f"/entries/{c['id']}/links/{link_id}/reason", json={"reason": "x"})
    assert response.status_code == 404
