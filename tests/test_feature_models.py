"""A model per feature, layered over the roles that already exist.

Asked for directly: *"allow the user to alter the model they use for that
specific feature if they wish such as for the write with ai area, the chat tab
and document ai assistant. allow these to be easily individually altered and
reset and for there to be a mass reset for all individually altered ai model
preferences."*

The point of the feature is that two surfaces really do run on two different
models, so the assertions below are about **the model that reached the
provider**, not about a setting that round-tripped through the API. A
preference that saves and never reaches `chat()` is the "feature that never ran
once" of CLAUDE.md section 6, and it would pass a round-trip test perfectly.

The other rule with a test of its own is that an unset feature stores nothing
(decision 5): if it stored the resolved name, changing the chat model in
Settings would leave every unset feature behind on the old one, silently, and
nobody would connect the two events.
"""

from __future__ import annotations

import pytest

from memorymap.ai import model_manager as mm
from memorymap.core import deps


def _manager(app_state):
    return mm.ModelManager(app_state)


def _save(client, content: str) -> dict:
    """A note, so a chat turn has something to answer from: the librarian
    short-circuits an empty notebook without ever calling the model, and the
    assertions below are all about the model that was called."""
    response = client.post("/entries", json={"content": content})
    assert response.status_code == 201
    return response.json()


def _doc(client, title: str, content: str) -> dict:
    response = client.post("/documents", json={"title": title, "content": content})
    assert response.status_code == 201
    return response.json()


# --- the table ----------------------------------------------------------------


def test_every_feature_falls_back_to_a_role_that_exists():
    """One table, and a new feature is one row in it (decision 1)."""
    assert mm.FEATURES, "the feature table is empty"
    for feature in mm.FEATURES:
        assert feature.role in {"chat", "utility"}, feature.key
        assert feature.label, feature.key
        assert feature.key == feature.key.lower()


def test_the_first_pass_covers_the_three_surfaces_that_were_asked_for():
    keys = {feature.key for feature in mm.FEATURES}
    assert {"chat", "writing", "documents"} <= keys


# --- resolving ----------------------------------------------------------------


def test_an_unset_feature_resolves_to_its_role(app_state):
    manager = _manager(app_state)
    manager.set_chat_model("llama3.2")
    manager.set_utility_model("phi3.5")

    for feature in mm.FEATURES:
        expected = "llama3.2" if feature.role == "chat" else "phi3.5"
        assert manager.feature_model(feature.key) == expected, feature.key
        assert manager.feature_override(feature.key) == ""


def test_an_unset_feature_follows_the_global_model_rather_than_copying_it(app_state):
    """Decision 5: absence is stored, the name is resolved at read time."""
    manager = _manager(app_state)
    manager.set_chat_model("llama3.2")
    assert manager.feature_model("writing") == "llama3.2"

    manager.set_chat_model("qwen3.5:4b")
    assert manager.feature_model("writing") == "qwen3.5:4b"
    assert manager.feature_override("writing") == ""


def test_setting_one_feature_leaves_the_others_inherited(app_state):
    manager = _manager(app_state)
    manager.set_chat_model("llama3.2")
    manager.set_feature_model("writing", "gemma4:12b")

    assert manager.feature_model("writing") == "gemma4:12b"
    assert manager.feature_override("writing") == "gemma4:12b"
    for other in ("chat", "documents"):
        assert manager.feature_model(other) == "llama3.2", other
        assert manager.feature_override(other) == ""
    # And the role's own preference is untouched: an override is a second
    # layer, never a write-through to the setting it falls back to.
    assert manager.chat_model() == "llama3.2"


def test_clearing_one_feature_returns_it_to_inherited(app_state):
    manager = _manager(app_state)
    manager.set_chat_model("llama3.2")
    manager.set_feature_model("documents", "mistral-nemo")
    assert manager.feature_model("documents") == "mistral-nemo"

    manager.clear_feature_model("documents")
    assert manager.feature_override("documents") == ""
    assert manager.feature_model("documents") == "llama3.2"


def test_an_empty_name_clears_rather_than_storing_an_empty_override(app_state):
    manager = _manager(app_state)
    manager.set_feature_model("chat", "gemma4:12b")
    manager.set_feature_model("chat", "   ")
    assert manager.feature_override("chat") == ""


def test_a_utility_role_feature_overrides_only_the_utility_side(app_state):
    """The guide runs on the utility model, so its override lands there and
    the chat model it does not use stays exactly where it was."""
    guide = next((f for f in mm.FEATURES if f.key == "guide"), None)
    if guide is None:
        pytest.skip("the guide is not a feature row on this build")
    manager = _manager(app_state)
    manager.set_chat_model("llama3.2")
    manager.set_utility_model("phi3.5")
    manager.set_feature_model("guide", "qwen3.5:2b")

    view = manager.for_feature("guide")
    assert view.utility_model() == "qwen3.5:2b"
    assert view.chat_model() == "llama3.2"
    assert manager.utility_model() == "phi3.5"


def test_an_explicit_override_survives_smart_routing_being_off(app_state):
    """Routing off means "background jobs use the chat model". A feature the
    user pointed at a model by hand is not a background job guess."""
    guide = next((f for f in mm.FEATURES if f.key == "guide"), None)
    if guide is None:
        pytest.skip("the guide is not a feature row on this build")
    app_state.set_preference("smart_model_routing_enabled", False)
    manager = _manager(app_state)
    manager.set_chat_model("llama3.2")
    manager.set_feature_model("guide", "qwen3.5:2b")
    assert manager.for_feature("guide").utility_model() == "qwen3.5:2b"


# --- refusing what is not a feature -------------------------------------------


def test_an_unknown_feature_key_is_refused_rather_than_stored(app_state):
    manager = _manager(app_state)
    with pytest.raises(ValueError):
        manager.set_feature_model("nonesuch", "llama3.2")
    with pytest.raises(ValueError):
        manager.feature_model("nonesuch")
    with pytest.raises(ValueError):
        manager.for_feature("nonesuch")
    # Nothing was written on the way to the refusal.
    assert app_state.get_preference("feature_model_nonesuch", "") == ""


# --- the mass reset -----------------------------------------------------------


def test_the_mass_reset_clears_every_override_and_says_how_many(app_state):
    manager = _manager(app_state)
    manager.set_chat_model("llama3.2")
    manager.set_feature_model("chat", "gemma4:12b")
    manager.set_feature_model("writing", "mistral-nemo")

    assert manager.reset_feature_models() == 2
    for feature in mm.FEATURES:
        assert manager.feature_override(feature.key) == "", feature.key
    assert manager.feature_model("chat") == "llama3.2"


def test_the_mass_reset_is_a_no_op_when_nothing_is_overridden(app_state):
    manager = _manager(app_state)
    assert manager.reset_feature_models() == 0
    assert manager.reset_feature_models() == 0


def test_the_rows_say_which_model_and_whether_it_is_inherited(app_state):
    manager = _manager(app_state)
    manager.set_chat_model("llama3.2")
    manager.set_feature_model("writing", "gemma4:12b")
    rows = {row["key"]: row for row in manager.feature_rows()}

    assert rows["writing"]["model"] == "gemma4:12b"
    assert rows["writing"]["overridden"] is True
    assert rows["chat"]["model"] == "llama3.2"
    assert rows["chat"]["overridden"] is False
    # An inherited row names what it inherits, so Settings can say so without
    # a second lookup per row.
    assert rows["chat"]["inherits"] == "llama3.2"
    assert rows["chat"]["label"]


# --- the API ------------------------------------------------------------------


def test_status_reports_one_row_per_feature(client):
    body = client.get("/models/status").json()
    rows = body["feature_models"]
    assert {row["key"] for row in rows} == {f.key for f in mm.FEATURES}
    assert all(row["overridden"] is False for row in rows)
    assert body["feature_models_overridden"] == 0


def test_setting_a_feature_model_offline_still_saves(client):
    """Ollama is down in this fixture. Clearing must always work, and so must
    setting: the same trust `/models/utility-model` already extends."""
    assert client.post("/models/feature-model", json={"feature": "chat", "name": ""}).status_code == 200


def test_the_api_refuses_an_unknown_feature(client):
    response = client.post(
        "/models/feature-model", json={"feature": "nonesuch", "name": "llama3.2"}
    )
    assert response.status_code == 400


def test_the_api_reset_clears_everything_and_reports_the_count(ai_client):
    manager = deps.get_model_manager()
    manager.set_feature_model("chat", "llama3.2:latest")
    manager.set_feature_model("writing", "llama3.2:latest")

    body = ai_client.post("/models/feature-models/reset").json()
    assert body["cleared"] == 2
    assert all(not row["overridden"] for row in body["feature_models"])
    assert ai_client.post("/models/feature-models/reset").json()["cleared"] == 0


# --- the model that actually reached the provider -----------------------------
#
# The four tests this feature exists for. Each one sets one feature's model and
# asserts on `fake_ollama.chat_models`, which is what the fake records when the
# route really called it.


def test_the_chat_tab_runs_on_its_own_model(ai_client, fake_ollama):
    deps.get_model_manager().set_feature_model("chat", "gemma4:12b")
    _save(ai_client, "a scarecrow joke I want to remember")
    ai_client.post("/chat", json={"question": "what jokes have I saved?"})
    assert fake_ollama.chat_models[-1] == "gemma4:12b"


def test_the_writing_desk_runs_on_its_own_model(ai_client, fake_ollama):
    deps.get_model_manager().set_feature_model("writing", "mistral-nemo")
    ai_client.post("/drafts/compose", json={"thoughts": "bread proving takes ages"})
    assert fake_ollama.chat_models[-1] == "mistral-nemo"


def test_the_document_assistant_runs_on_its_own_model(ai_client, fake_ollama):
    deps.get_model_manager().set_feature_model("documents", "qwen3.5:9b")
    document = _doc(ai_client, "Essay", "A long paragraph that needs tightening.")
    ai_client.post(
        f"/documents/{document['id']}/ai-edit", json={"instruction": "tighten this"}
    )
    assert fake_ollama.chat_models[-1] == "qwen3.5:9b"


def test_the_guide_runs_on_its_own_model(ai_client, fake_ollama):
    guide = next((f for f in mm.FEATURES if f.key == "guide"), None)
    if guide is None:
        pytest.skip("the guide is not a feature row on this build")
    deps.get_model_manager().set_feature_model("guide", "qwen3.5:2b")
    ai_client.post("/help/ask", json={"question": "how do I export a note?"})
    assert fake_ollama.chat_models[-1] == "qwen3.5:2b"


def test_two_features_on_two_models_in_one_session(ai_client, fake_ollama):
    """The whole ask in one test: the chat tab and the writing desk really do
    run on different models, one after the other."""
    manager = deps.get_model_manager()
    manager.set_chat_model("llama3.2")
    manager.set_feature_model("chat", "gemma4:12b")
    manager.set_feature_model("writing", "mistral-nemo")

    _save(ai_client, "a scarecrow joke I want to remember")
    ai_client.post("/chat", json={"question": "what jokes have I saved?"})
    chat_model = fake_ollama.chat_models[-1]
    ai_client.post("/drafts/compose", json={"thoughts": "a few loose thoughts"})
    draft_model = fake_ollama.chat_models[-1]

    assert (chat_model, draft_model) == ("gemma4:12b", "mistral-nemo")


def test_a_feature_left_alone_still_follows_the_chat_model_at_the_provider(
    ai_client, fake_ollama
):
    manager = deps.get_model_manager()
    manager.set_chat_model("qwen3.5:4b")
    ai_client.post("/drafts/compose", json={"thoughts": "loose thoughts"})
    assert fake_ollama.chat_models[-1] == "qwen3.5:4b"


# --- INBOX 288: which model a guide turn really runs on ------------------------
#
# The owner: *"also it doesnt use my utility model as my utility model isnt a
# thinking model."* Measured here rather than reasoned about, because the
# report was inferred from a symptom (a thinking box) rather than observed at
# the provider, and the same claim had been recorded as fixed once before.
#
# What the three tests below measure: with smart routing on, both guide routes
# really do reach the utility model. With it off, the guide reaches the *chat*
# model, which is the one configuration that produces exactly the reported
# symptom on a thinking chat model. That switch says "for background tasks",
# and the Guide is a panel the user is sitting in front of, so the model it
# lands on is no longer a guess either way: the Guide is a feature row, and an
# explicit choice beats both defaults.


def _guide_model(client, fake_ollama, streamed: bool = False) -> str:
    fake_ollama.chat_models.clear()
    body = {"question": "how do I export a note?"}
    if streamed:
        with client.stream("POST", "/help/ask/stream", json=body) as response:
            list(response.iter_lines())
    else:
        client.post("/help/ask", json=body)
    assert fake_ollama.chat_models, "the guide turn never reached the provider"
    return fake_ollama.chat_models[-1]


def test_the_guide_reaches_the_utility_model(ai_client, fake_ollama):
    manager = deps.get_model_manager()
    manager.set_chat_model("qwen3.5:9b")
    manager.set_utility_model("llama3.2")
    assert _guide_model(ai_client, fake_ollama) == "llama3.2"
    assert _guide_model(ai_client, fake_ollama, streamed=True) == "llama3.2"


def test_with_smart_routing_off_the_guide_falls_to_the_chat_model(ai_client, fake_ollama):
    """The measured cause of INBOX 288, and it is the switch doing what it
    says: routing off means background work uses the chat model."""
    manager = deps.get_model_manager()
    manager.set_chat_model("qwen3.5:9b")
    manager.set_utility_model("llama3.2")
    deps.get_config().set_preference("smart_model_routing_enabled", False)
    assert _guide_model(ai_client, fake_ollama) == "qwen3.5:9b"


def test_the_guide_row_pins_the_model_whatever_routing_says(ai_client, fake_ollama):
    """The way out of both defaults: an explicit model for this one panel."""
    manager = deps.get_model_manager()
    manager.set_chat_model("qwen3.5:9b")
    manager.set_feature_model("guide", "llama3.2")
    deps.get_config().set_preference("smart_model_routing_enabled", False)
    assert _guide_model(ai_client, fake_ollama) == "llama3.2"
    assert _guide_model(ai_client, fake_ollama, streamed=True) == "llama3.2"


# --- the Ask box, a feature of its own (2026-09-23) ----------------------------
#
# The owner: "I want to be able to change the model I use within the features
# themselves using a model dropdown which pairs with the feature-specific model
# selections in settings." The Notes tab's Ask box and the Chat tab share
# `/chat/stream`, so the Ask box ran on the "Chat tab" row without saying so:
# a picker on the Ask box that wrote the chat row would have moved the Chat tab
# too. It is its own row, told apart by the `notes_only` flag the Ask box
# already sends and the Chat tab never does.


def _stream(client, **body) -> None:
    with client.stream("POST", "/chat/stream", json=body) as response:
        list(response.iter_lines())


def test_the_ask_box_is_a_feature_row(client):
    rows = {row["key"]: row for row in client.get("/models/status").json()["feature_models"]}
    assert rows["ask"]["label"] == "Ask tab"
    assert rows["ask"]["role"] == "chat"


def test_the_ask_box_runs_on_its_own_model_and_the_chat_tab_on_its(ai_client, fake_ollama):
    manager = deps.get_model_manager()
    manager.set_chat_model("llama3.2")
    manager.set_feature_model("ask", "qwen3.5:4b")
    manager.set_feature_model("chat", "gemma4:12b")
    _save(ai_client, "a scarecrow joke I want to remember")

    _stream(ai_client, question="what jokes have I saved?", notes_only=True, use_tools=False)
    assert fake_ollama.chat_models[-1] == "qwen3.5:4b"
    _stream(ai_client, question="what jokes have I saved?", use_tools=False)
    assert fake_ollama.chat_models[-1] == "gemma4:12b"


def test_an_unset_ask_box_follows_the_chat_model_not_the_chat_tab(ai_client, fake_ollama):
    """Inherits through its role, like every row: a Chat tab override is that
    tab's choice and does not leak into the Ask box."""
    manager = deps.get_model_manager()
    manager.set_chat_model("llama3.2")
    manager.set_feature_model("chat", "gemma4:12b")
    _save(ai_client, "a scarecrow joke I want to remember")
    _stream(ai_client, question="what jokes have I saved?", notes_only=True, use_tools=False)
    assert fake_ollama.chat_models[-1] == "llama3.2"


def test_every_in_surface_picker_names_a_real_feature_and_a_real_control():
    """`FEATURE_MODEL_SELECTS` (app.js) pairs a `<select>` with a row of the
    table above. A key that is not a row would post a feature the API refuses,
    and an id that is not in the page would be a picker that never drew: both
    silent in the browser, so both pinned here."""
    import re
    from pathlib import Path

    root = Path(__file__).resolve().parent.parent
    app = (root / "frontend" / "app.js").read_text(encoding="utf-8")
    page = (root / "frontend" / "index.html").read_text(encoding="utf-8")
    block = re.search(r"const FEATURE_MODEL_SELECTS = \[(.*?)\];", app, re.S)
    assert block, "FEATURE_MODEL_SELECTS is gone from app.js"
    pairs = re.findall(r'\["([\w-]+)",\s*"(\w+)"\]', block.group(1))
    assert {key for _, key in pairs} >= {"chat", "ask", "writing"}
    for element_id, key in pairs:
        assert key in mm.FEATURES_BY_KEY, key
        assert f'id="{element_id}"' in page, element_id
