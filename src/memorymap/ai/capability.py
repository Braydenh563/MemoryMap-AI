"""A question about Atlas is answered about Atlas (CHAT_PLAN decision 65).

INBOX 810, the owner: "I asked if it could web search and then searched the
web for the word "web" and then didnt even output the results". "Can you
search the web?" is a question about the assistant, not a search: it is
answered here, from what the app can do and the switch that turns each on,
and it never reaches retrieval, the web or a tool.

A request is not a capability question: "can you search the web for
gaming mice" names what to do, and "can you remind me to call mum" is an
act. `asks` reads the difference by what follows the verb: a request
carries its object ("for ...", "my ...", "to <verb> ..."); a capability
question stops at the thing ("the web", "maths", "reminders").
"""

from __future__ import annotations

import re
from dataclasses import dataclass

_LEAD = re.compile(
    r"^(?:hey |so |ok |okay )?(?:atlas,? )?"
    r"(?:can|could|will|would|do|does) (?:you|u|atlas|it|the app|this app)(?: (?:actually|even|also|ever|still))?"
    r"(?: be able to)?\s+(?P<rest>.+)$"
    r"|^(?:are|r) (?:you|u) (?:able|allowed|capable of|good at) (?:to )?(?P<rest2>.+)$"
    r"|^is (?:it|there a way) (?:possible )?(?:to |for (?:you|me) to )?(?P<rest3>.+)$"
    r"|^(?:do you (?:know how to|have|support)|have you got) (?P<rest4>.+)$",
    re.I,
)
_OVERVIEW = re.compile(
    r"^(?:what|which things?) (?:can|could|do) (?:you|u|atlas|i) (?:do|help (?:me )?with)(?: (?:here|for me|in (?:this|the) app|on (?:this|the) app|with (?:you|this|it)))?$"
    r"|^what (?:are|r) (?:you|u) (?:able to do|capable of|good at|for)$"
    r"|^what (?:are )?(?:your|atlas'?s?) (?:abilities|capabilities|features|skills|powers|tools)$"
    r"|^(?:what can i (?:ask|say|do)(?: (?:you|here|in (?:this|the) app|on (?:this|the) app))?)$"
    r"|^how can you help(?: me)?$|^what do you do$",
    re.I,
)
#: What turns a capability question into a request: an object of its own.
_REQUEST = re.compile(
    r"\b(?:for|about|called|named|that says|me to|this note|these|those)\b|\bthe (?:\w+ )?note\b"
    r"|\bmy (?!notes?\b|history\b|files?\b|reminders\b|stuff\b|things\b)|\"|“",
    re.I,
)


@dataclass(frozen=True)
class Capability:
    key: str
    words: re.Pattern
    can: str
    how: str
    #: The preference that turns it on, and where it lives; None is always on.
    switch: str | None = None
    where: str = ""
    #: Needs a model running (translation, writing a draft).
    model: bool = False


CAPABILITIES: tuple[Capability, ...] = (
    Capability("web", re.compile(r"\b(web|internet|online|google|browse|websites?|pages?|look (?:it )?up)\b", re.I),
               "Yes, when web search is on.",
               "Ask \"search the web for ...\" and I answer from the pages I read, with their links under the answer.",
               switch="web_search_enabled", where="Settings, Web search"),
    Capability("reminders", re.compile(r"\b(remind(?:ers?)?|alarms?|alerts?|nudge)\b", re.I),
               "Yes.", "Say \"remind me to call Sam on Friday\" and I set it, with Undo."),
    Capability("maths", re.compile(r"\b(maths?|sums?|calculat\w*|add (?:up|numbers)|arithmetic|percent\w*|multiply|divide)\b", re.I),
               "Yes, with no model.", "Type the sum, \"15% of 80\" or \"12 * 7\", and I work it out."),
    Capability("time", re.compile(r"\b(time ?zones?|the time|clocks?|what time)\b", re.I),
               "Yes, with no model.", "Ask \"what's the time in Perth\" or \"9am London in Tokyo\"."),
    Capability("dates", re.compile(r"\b(dates?|days until|how long until|calendar|countdown)\b", re.I),
               "Yes, with no model.", "Ask \"days until 25 December\" or \"what day is 3 March\"."),
    Capability("stats", re.compile(r"\b(stat(?:istic)?s|averages?|mean|median|count(?:s|ing)?)\b", re.I),
               "Yes, with no model.", "Ask \"average of 3, 8, 10\", or \"notebook stats\" for your notes in numbers."),
    Capability("convert", re.compile(r"\b(convert\w*|units?|currenc\w*|exchange rates?)\b", re.I),
               "Yes, with no model.", "Ask \"5 miles in km\" or \"20 USD in AUD\"."),
    Capability("notes", re.compile(r"\b(notes?|write (?:things )?down|save (?:things|stuff)|capture|remember (?:things|stuff))\b", re.I),
               "Yes.", "Say \"make a note: ...\" and I save it; ask \"what have I saved about uni?\" and I answer from your notes."),
    Capability("search", re.compile(r"\b(search|find|look through)\b", re.I),
               "Yes, your notes always.", "Ask \"what is there about the gaming mouse?\" and I answer from the notes that match."),
    Capability("organise", re.compile(r"\b(tags?|tagging|file|filing|organi[sz]\w*|categor\w*|sort)\b", re.I),
               "Yes.", "New notes are filed for you; say \"tag the gym note strength\" or open Tidy for the rest."),
    Capability("translate", re.compile(r"\b(translat\w*|languages?|french|spanish|german)\b", re.I),
               "Only with a model running.", "Connect a model in Settings, Models, then ask \"translate this into French\".", model=True),
    Capability("write", re.compile(r"\b(write (?:an? |me )?(?:essay|email|story|poem|draft)|draft\w*|essays?|emails?)\b", re.I),
               "Only with a model running.", "Connect a model in Settings, Models; with none I answer from your notes.", model=True),
    Capability("pictures", re.compile(r"\b(pictures?|images?|photos?|screenshots?|ocr|scan\w*)\b", re.I),
               "Yes.", "Attach a picture to a note and I read the words in it, so search finds them."),
    Capability("voice", re.compile(r"\b(voice|speak|talk|read (?:it )?(?:aloud|out)|dictat\w*|microphone|listen)\b", re.I),
               "Yes.", "Press the microphone to dictate, or the speaker under an answer to hear it."),
    Capability("history", re.compile(r"\b(history|records?|what i searched|log)\b", re.I),
               "Yes.", "Ask \"what did I search yesterday\", \"what ran overnight\" or \"when did I last back up\"; History beside the Ask box keeps every answer."),
)

#: The overview, grouped (the gold answer's shape: an opening, three bold lines).
OVERVIEW = (
    "I answer from your notes, do sums, times and dates, and act on the app for you.",
    "**Ask:** what you saved about a topic, what you did on a day, how a habit is going.",
    "**Work things out:** maths, time zones, days until a date, averages.",
    "**Act:** make a note, set a reminder, file or tag notes, open any page.",
)


def _clean(question: str) -> str:
    text = " ".join((question or "").split())
    return re.sub(r"^[\\/'\"`\s]+|[\\/'\"`?.!\s]+$", "", text)


def asks(question: str) -> bool:
    """Whether `question` asks what Atlas can do rather than asking it to."""
    text = _clean(question)
    if _OVERVIEW.match(text):
        return True
    m = _LEAD.match(text)
    if not m:
        return False
    rest = next(g for g in (m.group("rest"), m.group("rest2"), m.group("rest3"), m.group("rest4")) if g)
    if _REQUEST.search(rest) or len(rest.split()) > 6:
        return False
    return any(c.words.search(rest) for c in CAPABILITIES) or bool(re.match(r"^(?:help|do (?:things|stuff|anything))\b", rest, re.I))


def answer(question: str, *, prefs: dict | None = None, model_running: bool = False) -> str:
    """The capability line for `question`: whether, how, and the switch.
    `prefs` are the saved preferences (the switches' state)."""
    prefs = prefs or {}
    text = _clean(question)
    found = [c for c in CAPABILITIES if c.words.search(text)] if not _OVERVIEW.match(text) else []
    if not found:
        model = "A model is connected, so I can also write and translate." if model_running else (
            "With no model connected I do all of this myself; connecting one in Settings, Models adds writing and translating.")
        return "\n\n".join([*OVERVIEW, model, "Try \"what have I saved about uni?\""])
    c = found[0]
    lines = []
    if c.model and model_running:
        lines.append("Yes, with the model you have connected.")
    else:
        lines.append(c.can)
    lines.append(c.how)
    if c.switch:
        on = bool(prefs.get(c.switch, False))
        lines.append(f"It is {'on' if on else 'off'} now, in {c.where}.")
    return " ".join(lines)
