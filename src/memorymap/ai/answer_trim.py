"""Strip the padding a chat model puts around an answer.

The owner, 2026-09-21: "I feel like intro baggage like these {"Hello there!
I've taken a look at your notes regarding your courses and studies."} at the
start and also lines like 'let me know if' and ai closers should get stripped
from the ask tab ai responses".

The prompt already asks for none of it (`Do NOT end by offering anything
else`, and the Ask box's own system text), and a small local model does it
anyway; a rule the model keeps breaking is a rule worth enforcing after the
fact rather than asking for a fourth time.

**Conservative on purpose.** Only a first sentence that is *nothing but* a
greeting or an announcement of what is about to happen goes, and only a
trailing sentence that offers further help. A sentence that opens with
"Based on your notes" and then says something is left alone, because the
qualifier is part of the claim. When in doubt this returns the text it was
given: a stripped answer that loses a fact is worse than one that keeps a
pleasantry.
"""

from __future__ import annotations

import re

#: A whole first sentence that only announces, greets or acknowledges. Anchored
#: and fully matched, so "Hello there" goes and "Hello, the note about Hello
#: World says..." does not.
_OPENERS = re.compile(
    r"""^\s*(?:
        # A bare pleasantry, which only counts when something ends it. Without
        # the required punctuation, "Hello World is the name of the note you
        # saved" loses its first word.
        (?:
            (?:hello|hi|hey|greetings)(?:\s+there)?
            | (?:sure|certainly|of\s+course|absolutely|okay|ok)
            | (?:great|good|interesting)\s+question
        )\s*[,.!:]+
        |
        # A clause that announces what is about to happen. These run to the end
        # of their own sentence, so the punctuation is where they stop.
        (?:
            i(?:'ve|\s+have)\s+(?:taken\s+a\s+look\s+at|looked\s+(?:at|through)|reviewed|gone\s+through|read)\s+(?:your|the)\s+notes
            # "Here is a quick digest", and the same announcement behind a
            # qualifier: "Based on the notes you provided, here is a quick
            # digest of..." (the weekly digest, reported 2026-09-23). The
            # qualifier only goes when an announcement follows it; "Based on
            # your notes, here is the plan: ..." is content and stays.
            | (?:(?:based\s+on|according\s+to|looking\s+at)\s+(?:the|your)\s+notes[^,.!?]{0,40},\s*)?
              here(?:'s|\s+is)\s+(?:(?:a|an|your|the)\s+)?(?:(?:quick|short|brief|concise|weekly)\s+){0,2}
              (?:summary|overview|rundown|breakdown|digest|recap)
            | let(?:'s|\s+us)\s+(?:take\s+a\s+look|dive\s+in|see)
        )[^.!?]*[.!?:]+
    )\s*""",
    re.IGNORECASE | re.VERBOSE,
)

#: A trailing sentence that offers more rather than saying anything.
_CLOSERS = re.compile(
    r"""(?:
        (?:let\s+me\s+know|just\s+let\s+me\s+know)\b[^.!?]*
        | (?:feel\s+free\s+to)\b[^.!?]*
        | (?:i\s+hope\s+(?:this|that)\s+helps)\b[^.!?]*
        | (?:hope\s+(?:this|that)\s+helps)\b[^.!?]*
        | (?:would\s+you\s+like\s+me\s+to)\b[^.!?]*
        | (?:do\s+you\s+want\s+me\s+to)\b[^.!?]*
        | (?:if\s+you(?:'d|\s+would)\s+like)\b[^.!?]*
        | (?:is\s+there\s+anything\s+else)\b[^.!?]*
        | (?:shall\s+i)\b[^.!?]*
        | (?:happy\s+to\s+(?:help|dig|look))\b[^.!?]*
    )[.!?]*\s*$""",
    re.IGNORECASE | re.VERBOSE,
)


def _strip_opener(text: str) -> str:
    """Remove leading pleasantries, and only while something is left after them.

    A chain, not one: "Hello there! I've taken a look at your notes." is two
    of these in a row and was the owner's own example, so taking one and
    stopping would have left the half that actually annoyed him.
    """
    out = text
    for _ in range(3):
        match = _OPENERS.match(out)
        if not match:
            break
        rest = out[match.end() :]
        #: A greeting that *is* the whole answer stays: an empty answer says
        #: less than a useless one, and this is the shape a failed turn takes.
        if not rest.strip():
            break
        out = rest
    return out


def _is_only_opener(text: str) -> bool:
    """True when the paragraph is nothing but greetings and announcements."""
    rest = text
    for _ in range(3):
        match = _OPENERS.match(rest)
        if not match:
            break
        rest = rest[match.end() :]
    return not rest.strip()


def _strip_closers(text: str) -> str:
    """Remove trailing offers of further help, one sentence at a time.

    A model that writes two of them in a row ("Let me know if you need more.
    Happy to help!") gets both taken, which is why this loops rather than
    substituting once.
    """
    out = text.rstrip()
    for _ in range(4):  # a bounded loop: four is already absurd
        trimmed = _CLOSERS.sub("", out).rstrip()
        if trimmed == out:
            break
        if not trimmed.strip():
            #: The offer was the whole answer. Keep what we had.
            return out
        out = trimmed
    return out


def trim_assistant_padding(text: str) -> str:
    """The answer without its greeting or its sign-off.

    Paragraph structure is preserved: the opener is taken off the first
    paragraph and the closer off the last, so a bulleted answer keeps its
    bullets and a heading stays a heading.
    """
    if not text or not text.strip():
        return text
    paragraphs = text.split("\n\n")
    #: An opening paragraph that is *only* a greeting goes whole. `_strip_opener`
    #: will not empty the text it is handed, which is right when that text is
    #: the answer and wrong when there is more below it, so the caller decides.
    while len(paragraphs) > 1 and _is_only_opener(paragraphs[0]):
        paragraphs = paragraphs[1:]
    paragraphs[0] = _strip_opener(paragraphs[0])
    #: A closing paragraph that is *only* an offer goes whole, which the
    #: per-paragraph strip cannot do on its own: it refuses to empty the text
    #: it was handed, and here there is more above it to keep.
    if len(paragraphs) > 1 and not _CLOSERS.sub("", paragraphs[-1].rstrip()).strip():
        paragraphs.pop()
    else:
        paragraphs[-1] = _strip_closers(paragraphs[-1])
    while len(paragraphs) > 1 and not paragraphs[-1].strip():
        paragraphs.pop()
    out = "\n\n".join(paragraphs).strip()
    return out or text
