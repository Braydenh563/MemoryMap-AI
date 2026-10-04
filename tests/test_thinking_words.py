"""Per-persona rotating "thinking words" (the owner: rotating words beside
the thinking dots, like Claude Code's "Pondering...", "Spelunking...",
customisable per persona).

Storage: `PersonaItem.thinking_words` (routes_settings.py), alongside the
persona's `prompt`, in the same `personas` preference list custom overrides
already use; empty means "use the app's default list, or the built-in
persona's own list" (frontend/js/sheets-selects.js resolves which). The
feature's own on/off switch is `progress-motion`'s own kind of setting, a
per-browser `localStorage` appearance preference never sent to the server
(frontend/tests/test_thinking_words_rotation.py covers it), not a field
here. A third route, `POST /personas/suggest-thinking-words`, asks the
utility model for about sixteen in a given persona's voice.
"""

from __future__ import annotations

from memorymap.ai import librarian


def test_a_personas_thinking_words_round_trip(client):
    words = [
        "Reading between the lines", "Consulting the margins", "Untangling",
        "Distilling", "Sifting", "Mulling it over", "Weighing it up",
        "Cross-referencing",
    ]
    updated = client.put(
        "/preferences",
        json={"personas": [{"name": "Analyst", "prompt": "Be precise.", "thinking_words": words}]},
    ).json()
    assert updated["personas"][0]["thinking_words"] == words


def test_an_empty_list_is_accepted_and_means_use_the_default():
    from memorymap.api.routes_settings import PersonaItem

    item = PersonaItem(name="Analyst", prompt="Be precise.", thinking_words=[])
    assert item.thinking_words == []
    # Whitespace-only entries collapse to the same "use the default" empty list.
    item2 = PersonaItem(name="Analyst", prompt="Be precise.", thinking_words=["  ", " "])
    assert item2.thinking_words == []


def test_too_few_or_too_many_thinking_words_are_rejected(client):
    seven = ["Word %d" % i for i in range(7)]
    resp = client.put(
        "/preferences", json={"personas": [{"name": "Analyst", "prompt": "x", "thinking_words": seven}]}
    )
    assert resp.status_code == 422

    forty_one = ["Word %d" % i for i in range(41)]
    resp = client.put(
        "/preferences", json={"personas": [{"name": "Analyst", "prompt": "x", "thinking_words": forty_one}]}
    )
    assert resp.status_code == 422


def test_a_word_over_forty_characters_is_rejected(client):
    eight = ["Word %d" % i for i in range(7)] + ["x" * 41]
    resp = client.put(
        "/preferences", json={"personas": [{"name": "Analyst", "prompt": "x", "thinking_words": eight}]}
    )
    assert resp.status_code == 422


def test_an_exclamation_mark_is_rejected(client):
    eight = ["Word %d" % i for i in range(7)] + ["Excited!"]
    resp = client.put(
        "/preferences", json={"personas": [{"name": "Analyst", "prompt": "x", "thinking_words": eight}]}
    )
    assert resp.status_code == 422


def test_an_em_dash_is_rejected(client):
    eight = ["Word %d" % i for i in range(7)] + [f"Thinking{chr(0x2014)}about it"]
    resp = client.put(
        "/preferences", json={"personas": [{"name": "Analyst", "prompt": "x", "thinking_words": eight}]}
    )
    assert resp.status_code == 422


def test_shouting_is_rejected(client):
    eight = ["Word %d" % i for i in range(7)] + ["THINKING HARD"]
    resp = client.put(
        "/preferences", json={"personas": [{"name": "Analyst", "prompt": "x", "thinking_words": eight}]}
    )
    assert resp.status_code == 422


class _FakeOllama:
    def __init__(self, content):
        self.content = content

    def chat(self, model, messages):
        return {"content": self.content}


class _FakeModelManager:
    def utility_model(self):
        return "fake-utility-model"


def test_suggest_thinking_words_parses_one_per_line_and_cleans_them():
    reply = "\n".join(
        [
            "1. Stargazing",
            "- Charting constellations",
            "Consulting the stars...",
            'Drifting through the "nebula"',
            "",  # a blank line, dropped
            "SHOUTING WORD",  # dropped: shouting
            "This one has an exclamation!",  # dropped
            f"An em{chr(0x2014)}dash line",  # dropped
            "x" * 41,  # dropped: too long
            "Stargazing",  # dropped: duplicate of the first
            "Orbiting the question",
        ]
    )
    words = librarian.suggest_thinking_words(
        "Atlas", "You are Atlas.", _FakeModelManager(), _FakeOllama(reply), limit=16
    )
    assert words == [
        "Stargazing",
        "Charting constellations",
        "Consulting the stars",
        'Drifting through the "nebula"',
        "Orbiting the question",
    ]


def test_the_suggest_endpoint_returns_a_list_and_never_500s_on_a_model_failure(client, monkeypatch):
    def _boom(*args, **kwargs):
        raise RuntimeError("no model")

    monkeypatch.setattr(librarian, "suggest_thinking_words", _boom)
    resp = client.post(
        "/personas/suggest-thinking-words", json={"name": "Atlas", "prompt": "You are Atlas."}
    )
    assert resp.status_code == 200
    assert resp.json() == {"thinking_words": []}


def test_the_suggest_endpoint_round_trips_a_fake_reply(client, monkeypatch):
    monkeypatch.setattr(
        librarian,
        "suggest_thinking_words",
        lambda *a, **k: ["Stargazing", "Charting constellations"],
    )
    resp = client.post(
        "/personas/suggest-thinking-words", json={"name": "Atlas", "prompt": "You are Atlas."}
    )
    assert resp.json() == {"thinking_words": ["Stargazing", "Charting constellations"]}
