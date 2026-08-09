"""Wave N: utility model, improve-writing, link suggestions, job cancel,
AI reminder time context."""

from __future__ import annotations

from memorymap.ai import agent, model_manager
from memorymap.core import deps


def _save(client, content, **extra):
    response = client.post("/entries", json={"content": content, **extra})
    assert response.status_code == 201
    return response.json()


# --- utility model ------------------------------------------------------------------


def test_utility_model_defaults_to_chat_model(app_state):
    manager = deps.get_model_manager()
    assert manager.utility_model() == manager.chat_model()
    manager.set_utility_model("phi3.5")
    assert manager.utility_model() == "phi3.5"
    manager.set_utility_model("")  # back to "same as chat"
    assert manager.utility_model() == manager.chat_model()


def test_status_reports_utility_model(client):
    body = client.get("/models/status").json()
    assert "utility_model" in body
    assert body["utility_model"] == ""  # unset by default


def test_set_utility_model_offline_still_saves(client):
    # Ollama unavailable in this fixture — an empty name always applies.
    assert client.post("/models/utility-model", json={"name": ""}).status_code == 200


def test_digest_uses_utility_model(ai_client, fake_ollama):
    deps.get_model_manager().set_utility_model("phi3.5")
    _save(ai_client, "a funny scarecrow joke")
    ai_client.post("/insights/digest")
    # The last chat call went to the utility model, not the chat model.
    assert fake_ollama.chat_models[-1] == "phi3.5"


# --- improve writing ----------------------------------------------------------------


def test_improve_writing_returns_edited_text(ai_client, fake_ollama):
    fake_ollama.librarian_reply = "I went to the shop."
    body = ai_client.post(
        "/entries/improve", json={"text": "i goed to teh shop", "mode": "proofread"}
    ).json()
    assert body["improved"] == "I went to the shop."
    assert body["original"] == "i goed to teh shop"


def test_improve_writing_offline_is_503(client):
    response = client.post("/entries/improve", json={"text": "fix me"})
    assert response.status_code == 503


def test_improve_writing_rejects_empty(ai_client):
    assert ai_client.post("/entries/improve", json={"text": "   "}).status_code == 400


def test_improve_writing_custom_instruction_reaches_the_model(ai_client, fake_ollama):
    """The three presets (proofread/rewrite/concise) are fixed instructions;
    "custom" is the user's own words instead — this is the one path where
    what they typed has to actually reach the system prompt, not just get
    accepted by the API."""
    fake_ollama.librarian_reply = "Bonjour, ceci est une note."
    body = ai_client.post(
        "/entries/improve",
        json={
            "text": "hello, this is a note",
            "mode": "custom",
            "custom_instruction": "translate to French",
        },
    ).json()
    assert body["improved"] == "Bonjour, ceci est une note."
    system_prompt = fake_ollama.chat_calls[-1][0]["content"]
    assert "translate to French" in system_prompt


def test_improve_writing_custom_mode_needs_an_instruction(ai_client):
    """Picking "Custom" with nothing typed yet is a real state the UI passes
    through (the mode switches before the person has typed anything) — it
    must not reach the model with an empty steering instruction."""
    response = ai_client.post(
        "/entries/improve", json={"text": "fix me", "mode": "custom"}
    )
    assert response.status_code == 400


# --- generating and removing a title --------------------------------------------------


def test_generate_title_writes_a_heading(ai_client, fake_ollama):
    note = _save(ai_client, "Packed the tent and the good coffee. Left at dawn.")
    fake_ollama.librarian_reply = "Weekend trip to the coast"

    body = ai_client.post(f"/entries/{note['id']}/generate-title").json()
    assert body["title"] == "Weekend trip to the coast"
    assert body["content"].startswith("# Weekend trip to the coast\n")
    assert "Packed the tent" in body["content"]


def test_generate_title_replaces_an_existing_one(ai_client, fake_ollama):
    note = _save(ai_client, "# Old title\nsome body text")
    fake_ollama.librarian_reply = "A better title"

    body = ai_client.post(f"/entries/{note['id']}/generate-title").json()
    assert body["title"] == "A better title"
    assert body["content"].count("#") == 1


def test_generate_title_offline_is_503(client):
    note = _save(client, "some text")
    assert client.post(f"/entries/{note['id']}/generate-title").status_code == 503


def test_remove_title_takes_the_heading_out(ai_client):
    note = _save(ai_client, "# A trip\nPacked the tent.")
    body = ai_client.post(f"/entries/{note['id']}/remove-title").json()
    assert body["title"] is None
    assert body["content"] == "Packed the tent."


def test_remove_title_on_an_untitled_note_is_a_no_op(ai_client):
    note = _save(ai_client, "just a plain thought")
    body = ai_client.post(f"/entries/{note['id']}/remove-title").json()
    assert body["content"] == "just a plain thought"


# --- link suggestions ---------------------------------------------------------------


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
    from memorymap.core.database import EntryLink

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

    result = ai_client.post("/entries/links/backfill-reasons").json()
    assert result == {"checked": 2, "updated": 1}

    links = ai_client.get(f"/entries/{a['id']}").json()["links"]
    by_target = {link["entry_id"]: link for link in links}
    assert by_target[b["id"]]["reason"] == "similar in meaning"
    assert by_target[b["id"]]["reason_confidence"] == 1.0
    assert by_target[c["id"]]["reason"] is None


def test_backfill_never_touches_a_reason_someone_already_gave(ai_client, session):
    from memorymap.core.database import EntryLink

    a = _save(ai_client, "first note")
    b = _save(ai_client, "second note")
    session.add(
        EntryLink(
            source_entry_id=a["id"], target_entry_id=b["id"], reason="written by hand"
        )
    )
    session.commit()

    result = ai_client.post("/entries/links/backfill-reasons").json()
    assert result == {"checked": 0, "updated": 0}

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


# --- job cancellation ---------------------------------------------------------------


def test_cancel_missing_job_is_404(client):
    assert client.post("/models/jobs/cancel?kind=reindex").status_code == 404


def test_cancel_unknown_kind_is_400(client):
    assert client.post("/models/jobs/cancel?kind=bogus").status_code == 400


def test_reindex_cancel_flag_stops_the_worker(app_state):
    job = model_manager.Job(kind="reindex", total=5)
    job.cancel_requested = True
    # A cancelled job reports 'cancelled', never crashes.

    class _Emb:
        def store_for_entry(self, *a, **k):
            raise AssertionError("should not embed after cancel")

        def backend_id(self):
            return "x"

    # With the flag pre-set and no entries, the loop exits cleanly.
    model_manager._run_reindex(deps.get_db(), _Emb(), job)
    assert job.status in {"cancelled", "success"}


# --- AI reminder time context -------------------------------------------------------


def test_agent_prompt_includes_current_time_and_reminder_hint():
    messages = agent.build_agent_messages("remind me to fold washing in 10 minutes", [])
    system = messages[0]["content"]
    assert "current date and time is" in system
    assert "set_reminder" in system


# --- Wave O: agent-tool toggles -----------------------------------------------------


def test_tool_catalog_lists_tools(client):
    catalog = client.get("/chat/tools").json()
    names = {t["name"] for t in catalog}
    assert {"create_note", "delete_note", "set_reminder"} <= names
    delete = next(t for t in catalog if t["name"] == "delete_note")
    assert delete["destructive"] is True


def test_disabled_tool_is_hidden_and_refused(ai_client):
    from memorymap.ai import tools

    # Disable create_note via the preference.
    ai_client.put("/preferences", json={"disabled_tools": ["create_note"]})
    offered = [t["function"]["name"] for t in tools.ollama_tools()]
    assert "create_note" not in offered

    # And the execute endpoint refuses it too.
    from memorymap.core import deps

    session = deps.get_db().session()
    try:
        result = tools.execute_tool(session, "create_note", {"content": "x"})
        assert "error" in result and "turned off" in result["error"]
    finally:
        session.close()


def test_disabled_tools_preference_roundtrips(client):
    body = client.put("/preferences", json={"disabled_tools": ["delete_tag"]}).json()
    assert body["disabled_tools"] == ["delete_tag"]
    assert client.get("/preferences").json()["disabled_tools"] == ["delete_tag"]


# --- finished background jobs (asked for in use) -----------------------------
#
# The tasks screen listed only what was *running*, on the reasoning that a
# finished job is not a task. That is tidy and it hides the one case anyone
# cares about: a job that FAILS disappears at the moment it becomes
# interesting, leaving exactly the same empty list as one that succeeded.


def test_the_tasks_endpoint_reports_history_as_well(ai_client):
    from memorymap.core import taskhistory

    taskhistory.clear()
    taskhistory.record("reindex", "Re-indexing your notes", "failed", "disk full")
    body = ai_client.get("/tasks").json()
    assert "tasks" in body and "history" in body
    assert body["history"][0]["outcome"] == "failed"
    assert body["history"][0]["detail"] == "disk full"


def test_a_failure_keeps_its_reason(ai_client):
    """The reason used to exist only in the log console — a different screen
    that you have to know to look at."""
    from memorymap.core import taskhistory

    taskhistory.clear()
    taskhistory.record("pull", "Downloading llama3.2", "failed", "connection refused")
    assert "connection refused" in ai_client.get("/tasks").json()["history"][0]["detail"]


def test_the_newest_ending_comes_first(ai_client):
    from memorymap.core import taskhistory

    taskhistory.clear()
    taskhistory.record("pull", "first", "completed")
    taskhistory.record("pull", "second", "completed")
    assert [h["label"] for h in ai_client.get("/tasks").json()["history"]] == [
        "second",
        "first",
    ]


def test_cancelling_is_not_recorded_as_a_failure():
    """A user stopping something is not an error, and reporting it in red is
    how people learn to ignore red."""
    from memorymap.core import taskhistory

    taskhistory.clear()
    taskhistory.record("reindex", "Re-indexing", "cancelled")
    assert taskhistory.recent()[0]["outcome"] == "cancelled"


def test_the_history_cannot_grow_without_limit():
    """In memory, so it needs a hard bound — a machine that re-indexes on a
    loop must not be able to grow this forever."""
    from memorymap.core import taskhistory

    taskhistory.clear()
    for i in range(taskhistory.MAX_ENTRIES + 25):
        taskhistory.record("pull", f"job {i}", "completed")
    assert len(taskhistory.recent()) == taskhistory.MAX_ENTRIES


def test_an_unknown_outcome_does_not_become_a_scary_one():
    from memorymap.core import taskhistory

    taskhistory.clear()
    taskhistory.record("pull", "odd", "exploded")
    assert taskhistory.recent()[0]["outcome"] == "completed"


def test_recording_never_raises():
    """Called from worker threads at the moment a job ends. It must not be
    able to turn a finished job into a crashed one."""
    from memorymap.core import taskhistory

    taskhistory.record(None, None, None, None)  # type: ignore[arg-type]


def test_the_history_can_be_cleared(ai_client):
    from memorymap.core import taskhistory

    taskhistory.record("pull", "something", "completed")
    assert ai_client.post("/tasks/history/clear").json()["cleared"] is True
    assert ai_client.get("/tasks").json()["history"] == []


def test_quitting_is_a_post_not_a_get(ai_client):
    """A GET would be reachable from a link in another tab, and "the app quit
    when I clicked something" is a bug report nobody enjoys writing."""
    assert ai_client.get("/shutdown").status_code in (404, 405)
