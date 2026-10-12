"""How an answer says it read a misspelt question (Brief 90, INBOX 837).

The owner: a repaired question should get an answer "with response
variations". An answer to "hwo do I use live captions" opens by saying how it
was read, in words that change: never the ones the answer before it opened
with, and never the last acknowledgement the conversation made, so two
repaired questions in a row do not hear the same sentence twice.
"""

from __future__ import annotations

import hashlib

#: What an acknowledgement opens with, per voice; the repaired question
#: follows in quotes, then `END`. Every variant is a fixed phrase
#: (`PHRASES`), so the answer's trace still says where each word came from.
STARTS: dict[str, list[str]] = {
    "natural": [
        "Reading that as “",
        "I took that to mean “",
        "Going with “",
        "Assuming you meant “",
        "I read that as “",
        "Taking that as “",
        "Sounds like you are asking “",
        "My reading of that is “",
    ],
    "professional": [
        "Interpreting the question as “",
        "Understood as “",
        "Read as “",
        "Taking the question to be “",
        "Treating this as “",
        "The question is taken as “",
    ],
}

#: Closes the quoted reading and leaves a gap before the answer.
END = "”.\n\n"

#: The phrases, keyed for `composer.PHRASES`.
PHRASES: dict[str, str] = {"reading_end": END}
for _voice, _starts in STARTS.items():
    for _n, _start in enumerate(_starts, 1):
        PHRASES[f"reading_{_voice}_{_n}"] = _start


def last_used(history: list[dict], voice: str) -> str | None:
    """The start the most recent acknowledged answer in `history` opened
    with, or None."""
    for turn in reversed(history or []):
        answer = str(turn.get("answer") or "")
        for start in STARTS[voice]:
            if answer.startswith(start):
                return start
    return None


def acknowledge(repaired: str, *, voice: str, seed: str, history: list[dict] | None = None, previous: str = "") -> list[tuple]:
    """The parts that open an answer to a question read as `repaired`:
    template, the reading, template. The start is chosen by `seed` (the
    question and the chat's salt, so the same question in the same chat is
    always worded the same), leaving out the one the answer before opened
    with and the last one used in the conversation, while another is left."""
    voice = voice if voice in STARTS else "natural"
    recent = last_used(history or [], voice)
    usable = [v for v in STARTS[voice] if v != recent and not (previous and previous.startswith(v))] or [
        v for v in STARTS[voice] if v != recent
    ]
    digest = hashlib.sha1(f"ack:{seed}".encode()).digest()
    start = usable[digest[0] % len(usable)]
    return [("template", start), ("reading", reading_of(repaired)), ("template", END)]


def reading_of(repaired: str) -> str:
    """The repaired question as quoted: without its closing stop."""
    text = repaired.strip()
    while text and (text[-1] in "?.!" or text[-1].isspace()):
        text = text[:-1]
    return text
