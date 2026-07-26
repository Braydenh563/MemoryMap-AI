"""Thoughts → draft, and the back-and-forth that follows.

The behaviour that matters most: revising must never silently discard edits
the user made to the draft by hand.
"""

from __future__ import annotations

from memorymap.ai import drafter


def test_first_draft_uses_the_first_draft_prompt(ai_client, fake_ollama):
    fake_ollama.librarian_reply = "# Bread\n\nProving takes about two hours."
    body = ai_client.post(
        "/drafts/compose", json={"thoughts": "bread proving takes ages, like 2 hours"}
    ).json()

    assert body["draft"].startswith("# Bread")
    system = fake_ollama.chat_calls[-1][0]["content"]
    assert "loose thoughts" in system
    assert "revising" not in system.lower()


def test_a_revision_is_given_the_current_draft(ai_client, fake_ollama):
    """The user's edits are in the draft, so the model must see them."""
    fake_ollama.librarian_reply = "The revised note."
    ai_client.post(
        "/drafts/compose",
        json={
            "thoughts": "also it needs a banneton",
            "draft": "# Bread\n\nProving takes two hours. I EDITED THIS LINE MYSELF.",
        },
    )
    system = fake_ollama.chat_calls[-1][0]["content"]
    prompt = fake_ollama.chat_calls[-1][-1]["content"]

    assert "revising" in system.lower()
    assert "source of truth" in system
    assert "I EDITED THIS LINE MYSELF" in prompt
    assert "also it needs a banneton" in prompt


def test_an_instruction_applies_to_this_pass(ai_client, fake_ollama):
    fake_ollama.librarian_reply = "Shorter note."
    ai_client.post(
        "/drafts/compose",
        json={"thoughts": "", "draft": "A long note.", "instruction": "make it shorter"},
    )
    system = fake_ollama.chat_calls[-1][0]["content"]
    assert "make it shorter" in system


def test_an_offline_model_returns_the_draft_untouched(ai_client, fake_ollama):
    """Losing a draft to an outage would be far worse than not improving it."""
    fake_ollama.running = False
    body = ai_client.post(
        "/drafts/compose",
        json={"thoughts": "more thoughts", "draft": "My careful draft."},
    ).json()

    assert body["draft"] == "My careful draft."
    assert body["ollama_running"] is False
    assert "isn't running" in body["message"]


def test_an_empty_reply_does_not_wipe_the_draft(ai_client, fake_ollama):
    fake_ollama.librarian_reply = "   "
    body = ai_client.post(
        "/drafts/compose", json={"thoughts": "x", "draft": "Keep me."}
    ).json()
    assert body["draft"] == "Keep me."


def test_composing_nothing_is_a_clean_400(ai_client):
    response = ai_client.post("/drafts/compose", json={"thoughts": "  ", "draft": ""})
    assert response.status_code == 400


def test_title_suggestion(ai_client, fake_ollama):
    fake_ollama.librarian_reply = "sourdough proving times"
    body = ai_client.post("/drafts/title", json={"draft": "A note about bread."}).json()
    assert body["title"] == "Sourdough proving times"  # sentence-cased


def test_a_rambling_title_is_rejected(ai_client, fake_ollama):
    fake_ollama.librarian_reply = (
        "Certainly! Here is a really excellent title for this particular note about bread."
    )
    body = ai_client.post("/drafts/title", json={"draft": "A note."}).json()
    assert body["title"] == ""


def test_title_without_the_model_is_empty_not_an_error(ai_client, fake_ollama):
    fake_ollama.running = False
    body = ai_client.post("/drafts/title", json={"draft": "A note."}).json()
    assert body["title"] == ""


def test_build_messages_switches_prompt_on_whether_a_draft_exists():
    first = drafter.build_messages("some thoughts", "")
    revise = drafter.build_messages("more", "an existing draft")
    assert "loose thoughts" in first[0]["content"]
    assert "revising" in revise[0]["content"].lower()
    assert "CURRENT DRAFT" in revise[1]["content"]
