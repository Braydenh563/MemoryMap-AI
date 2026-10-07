"""Small talk with no model running, in the app's own voice (INBOX 741).

The owner: "more social, more engaging". "hi", "thanks", "how are you",
"bye" and "what can you do" get a warm, short reply of the app's own, varied,
never the same as the turn before, and never claiming Chat is closed: with
no model the composer still answers from the notes (CHAT_PLAN decision 22).
"""

from __future__ import annotations

import pytest

from memorymap.ai import composer

EM_DASH = chr(0x2014)


@pytest.mark.parametrize(
    ("message", "kind"),
    [
        ("hi", "greeting"),
        ("hey there", "greeting"),
        ("good morning", "morning"),
        ("thanks", "thanks"),
        ("thank you so much", "thanks"),
        ("how are you", "how"),
        ("bye", "bye"),
        ("sorry", "sorry"),
        ("who are you", "who"),
        ("ok", "ack"),
    ],
)
def test_each_kind_of_small_talk_gets_a_reply_of_its_own_kind(message, kind):
    assert composer.social(message) in composer.SOCIAL[kind]


def test_what_can_you_do_says_what_the_composer_answers():
    reply = composer.social("what can you do", "about_app")
    assert reply in composer.SOCIAL["about_app"]


def test_the_same_greeting_twice_is_not_answered_the_same_way():
    first = composer.social("hi")
    assert composer.social("hi", previous=first) != first


@pytest.mark.parametrize("line", [line for lines in composer.SOCIAL.values() for line in lines])
def test_every_social_line_follows_the_copy_rules(line):
    assert EM_DASH not in line and "!" not in line and "Oops" not in line
    assert line[0].isupper()
    assert "isn't running" not in line


def test_chat_small_talk_with_no_model_uses_the_app_voice(client):
    from tests.test_composer_route_688 import _ask

    out = _ask(client, "thanks", use_tools=False)
    assert out["text"] in composer.SOCIAL["thanks"]
