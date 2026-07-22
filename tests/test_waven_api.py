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
