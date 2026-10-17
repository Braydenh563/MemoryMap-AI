"""The owner's 2026-10-17 composer reports (INBOX 904), each reproduced first
through `/chat/stream` with no model, as the owner met it."""

from __future__ import annotations

import json

from tessellate.ai import composer
from tessellate.entry import manager


def _ask(client, question: str, **body) -> dict:
    events: dict[str, list] = {}
    with client.stream("POST", "/chat/stream", json={"question": question, "answer_from": "notes", **body}) as response:
        assert response.status_code == 200
        for line in response.iter_lines():
            if line.strip():
                event = json.loads(line)
                events.setdefault(event["type"], []).append(event)
    events["text"] = "".join(e["delta"] for e in events.get("answer", []))
    return events


def _seed(session) -> None:
    manager.create_entry(session, "Grocery list: milk and eggs for Friday")
    manager.create_entry(session, "Golf practice after work, hit some balls")
    session.commit()


def test_saved_recently_lists_the_newest_notes_not_the_word_saved(ai_client, session):
    """B30 (screenshot): "What have I saved recently?" answered 'I found no
    mention of "saved"'. Retrieval already read it as a recency ask; the
    composer threw that away because "saved" survived as a subject word."""
    _seed(session)
    text = _ask(ai_client, "What have I saved recently?", notes_only=True, use_tools=False)["text"]
    assert "no mention" not in text.lower(), text
    assert "Grocery list" in text and "Golf practice" in text, text


def test_a_key_mash_is_a_mash_not_a_name_for_the_assistant(ai_client, session):
    """B08: "asdkjhfgs" was answered "Asdkjhfgs, reporting in", as if it were a
    nickname. Keys pressed at random are said to be that, and the reply offers
    what the app can do."""
    from tessellate.ai import intent

    for mash in ("asdkjhfgs", "jkjkjkjk", "xzxzxz", "hhhhhhh", "asdf asdf", "kjhgf lkjh", "sdfsdfsdf"):
        assert intent.is_mash(mash), mash
    for word in ("test", "brotatockiibidyrizzler", "rhythms", "strengths", "dentist", "hello there", "Tessellate"):
        assert not intent.is_mash(word), word
    _seed(session)
    text = _ask(ai_client, "asdkjhfgs", notes_only=True, use_tools=False)["text"]
    assert "reporting in" not in text.lower() and "asdkjhfgs" not in text.lower(), text
    from tessellate.ai import composer

    assert any(text.startswith(line.split("{")[0]) for line in composer.SOCIAL["unclear"]), text


def test_a_test_message_is_acknowledged_as_a_test(ai_client, session):
    """B08: "test" got 'I found no mention of "test"'. A test message gets a
    reply that says the test arrived and what to try next, in any of the ways
    people type one."""
    _seed(session)
    for message in ("test", "testing", "Test 123", "testing testing", "is this thing on?", "hello world"):
        text = _ask(ai_client, message, notes_only=True, use_tools=False)["text"]
        assert "no mention" not in text.lower() and "nothing in your notes" not in text.lower(), (message, text)
        assert text in composer.SOCIAL["test"] + composer.SOCIAL_PROFESSIONAL["test"], (message, text)


def test_the_capability_rundown_is_composed_and_sized_to_the_request():
    """B10: the rundown was one stored answer and called itself Atlas. It is
    now composed: it names itself Atlas's assistant, says how to reach Atlas
    (connect a model), varies, and is shorter or longer as asked."""
    from tessellate.ai import capability

    medium = {capability.overview("what can you do", seed=str(i)) for i in range(12)}
    assert len(medium) > 4, "the same words every time"
    for text in medium:
        assert "assistant" in text.lower() and "Atlas" in text
        assert "connect a model" in text.lower() or "add one" in text.lower(), text
        assert text.count("**") == 6, text
    short = capability.overview("what can you do, briefly?", seed="a")
    long = capability.overview("tell me everything you can do", seed="a")
    assert len(short) < 200 < len(long), (len(short), len(long))
    assert long.count("**") == 12
    on = capability.overview("what can you do", model_running=True, seed="a")
    assert "connect a model" not in on.lower() and "connected" in on.lower(), on
    pro = capability.overview("what can you do", voice="professional", seed="a")
    assert "I'm" not in pro.split("\n")[0], pro


def test_who_are_you_says_it_is_the_assistant_not_atlas(ai_client, session):
    """B10: the composer is Atlas's assistant; Atlas is the model. Asked who it
    is, it says so, and every identity line stays in that voice."""
    for table in (composer.SOCIAL, composer.SOCIAL_PROFESSIONAL):
        for line in table["who"]:
            assert "assistant" in line.lower(), line
        for line in table["who"] + table["about_app"]:
            assert not line.startswith(("I'm Atlas.", "I am Atlas.", "Atlas,", "Atlas ", "Atlas.")), line
    text = _ask(ai_client, "who are you", notes_only=True, use_tools=False)["text"]
    assert "assistant" in text.lower(), text


def test_the_rundown_follows_the_length_the_person_asked_for(ai_client, session):
    short = _ask(ai_client, "what can you do briefly", notes_only=True, use_tools=False)["text"]
    long = _ask(ai_client, "tell me everything you can do", notes_only=True, use_tools=False)["text"]
    assert "no note" not in long.lower() and "**Private:**" in long, long
    assert len(short) < 200 < len(long), (len(short), len(long))


def test_what_do_my_notes_cover_is_answered_about_the_notebook(ai_client, session):
    """B02 (screenshot): "what do my notes cover so far??" said none of the notes
    mention "cover" or "far". It is a question about the whole notebook, so it
    is answered with what the notebook holds: areas, tags and the span."""
    manager.create_entry(session, "Squats 5x5 and bench 3x8 today", "Gym", ["fitness", "legs"])
    manager.create_entry(session, "Rows and pull-ups, felt strong", "Gym", ["fitness"])
    manager.create_entry(session, "Design assignment 2 due next Friday", "Uni", ["design"])
    session.commit()
    for question in (
        "what do my notes cover so far??",
        "what's in my notebook",
        "what have I been writing about",
        "give me an overview of my notes",
        "what topics do I write about",
    ):
        text = _ask(ai_client, question, notes_only=True, use_tools=False)["text"]
        assert "mention" not in text.lower() and "couldn't find" not in text.lower(), (question, text)
        assert "Gym" in text and "Uni" in text and "fitness" in text, (question, text)
        assert "3 notes" in text, (question, text)
