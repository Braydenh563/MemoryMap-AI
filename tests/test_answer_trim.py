"""The answer without its greeting or its sign-off (the owner, 2026-09-21).

"I feel like intro baggage like these {"Hello there! I've taken a look at your
notes regarding your courses and studies."} at the start and also lines like
'let me know if' and ai closers should get stripped from the ask tab ai
responses."

The prompt already asks for none of it and a small local model writes it
anyway, so it is taken off afterwards. These cases are the contract, and half
of them are the things that must **not** be taken: a trimmer that eats a
qualifier is worse than a greeting nobody minded.
"""

import pytest

from memorymap.ai.answer_trim import trim_assistant_padding


@pytest.mark.parametrize(
    "raw, want",
    [
        #: The owner's own example, which is two openers in a row.
        (
            "Hello there! I've taken a look at your notes regarding your "
            "courses and studies.\n\nYou are taking IT.",
            "You are taking IT.",
        ),
        ("Sure. Your notes cover the gym.", "Your notes cover the gym."),
        ("Certainly! You train five days a week.", "You train five days a week."),
        ("Great question. You train five days a week.", "You train five days a week."),
        (
            "Hi! Here is a summary of your notes. You train five days a week.",
            "You train five days a week.",
        ),
        #: Closers, inline and as a paragraph of their own.
        (
            "Your notes cover the gym. Let me know if you want more detail.",
            "Your notes cover the gym.",
        ),
        ("- one\n- two\n\nI hope this helps!", "- one\n- two"),
        (
            "You train five days a week. Feel free to ask about the split. "
            "Happy to help!",
            "You train five days a week.",
        ),
        (
            "You take IT. Would you like me to list the assignments?",
            "You take IT.",
        ),
    ],
)
def test_the_padding_comes_off(raw, want):
    assert trim_assistant_padding(raw) == want


@pytest.mark.parametrize(
    "raw",
    [
        #: A qualifier is part of the claim, not a greeting.
        "Based on your notes, you train five days a week.",
        "According to your notes, the assignment is due Friday.",
        #: A heading is not an announcement.
        "## Courses\n\nYou take IT.",
        #: The pleasantry *is* the answer: an empty answer says less than a
        #: useless one, and this is the shape a failed turn takes.
        "Let me know if you need anything.",
        "Hello there!",
        #: Nothing to do.
        "You take IT.",
        "",
    ],
)
def test_what_must_be_left_alone(raw):
    assert trim_assistant_padding(raw) == raw


def test_a_greeting_inside_a_sentence_is_not_a_greeting():
    """"Hello" as content, which is the case an anchored rule has to get right."""
    raw = "Hello World is the name of the note you saved on Tuesday."
    assert trim_assistant_padding(raw) == raw
