"""What is the user actually asking for? (chat intent routing)

Every chat message used to take the same path: retrieve five notes, then tell
the model to answer "using ONLY the notes provided". For a real question that
is exactly right. For "hey" it is not: the model dutifully answers a greeting
with a summary of your notebook, which is why saying hello felt like being
handed a filing cabinet.

So messages are sorted first, and only the ones that are actually about the
notebook go through retrieval:

- ``smalltalk``, greetings, thanks, goodbyes. Answer as an assistant would.
- ``about_app``, "what can you do?". Answer from what the app can do.
- ``utility``, "what is 12 * 7", "what time is it": worked out, not searched.
- ``act``, "remind me to call Sam on Friday": done, after a card says what.
- ``notes``, everything else: retrieve, and ground the answer in notes.

The classifier is deliberately a heuristic rather than a model call. It runs on
every message, so it has to be instant and predictable; a local model would add
latency to every turn and could itself misfire. Anything it isn't sure about
falls through to ``notes``, which is the behaviour that was there before, the
worst case is the old behaviour, never something worse.
"""

from __future__ import annotations

import re

SMALLTALK = "smalltalk"
ABOUT_APP = "about_app"
NOTES = "notes"
#: A sum, a conversion, the time, a count of days, a roll of a die: worked out
#: by the app (`ai/utilities.py`, CHAT_PLAN decision 41), never searched for.
UTILITY = "utility"
#: "delete the boiler note", "remind me to call Sam on Friday", "open
#: settings": something to do (`ai/commands.py`, CHAT_PLAN decision 38).
ACT = "act"

# Bare greetings and pleasantries. Matched whole so "hi" routes here but
# "hidden costs of the new plan" does not.
_SMALLTALK_PATTERNS = (
    r"h(?:i|ey|ello|iya|ello+)",
    r"yo|sup|howdy|greetings|salutations",
    r"good (?:morning|afternoon|evening|day|night)",
    r"how(?:'?s| is| are)(?: it going| things| you|you| ya| your day)?",
    r"what'?s up|what'?s good|whats happening",
    r"thanks?(?: you| a lot| so much| a bunch| a million)?|ta|cheers|nice one|appreciate it|gracias",
    r"(?:ok(?:ay)?|cool|great|awesome|nice|lol|haha|sure|right|yep|yes|no|nope|alright|sweet|dope|amazing|brilliant)",
    r"(?:good ?)?(?:bye|night)|see (?:ya|you)|later|cya|catch ya|peace|farewell",
    r"you'?re welcome|no worries|np|not at all|anytime|my pleasure",
    r"sorry|my bad|apologies|excuse me|whoops",
    r"who are you|what(?:'?s| is) your name|tell me about yourself",
    r"are you (?:there|awake|ok|okay|alive|real|human|(?:an )?ai|a (?:robot|bot|person|real person))",
    r"nice to meet you|glad to meet you",
    r"(?:tell|say) (?:me )?(?:a joke|something funny)|make me laugh|know any jokes",
)

# "What can you do?", questions about the assistant rather than the notebook.
_ABOUT_APP_PATTERNS = (
    r"what can (?:you|this|the app|memorymap) do",
    r"what (?:are|do) (?:you|your) (?:capable of|abilities|features|tools|powers|limits|limitations)",
    r"what (?:tools|features|skills|commands|actions) (?:do|can) you (?:have|use|offer|run|execute)",
    r"what are you able to do|how can you help(?: me)?",
    r"how (?:do|does) (?:this|the app|memorymap|you) work",
    r"(?:show|list|tell) me (?:your|the|what) (?:tools|features|commands|skills|capabilities)",
    r"what (?:should|can) i (?:ask|tell you|say)",
    r"(?:help me|how to) get started|how do i (?:start|use this|navigate)",
    r"what are you(?: for)?|why do you exist|what is your purpose",
    r"who made you|who created you",
    #: The app itself, asked about (engine probe, 2026-10-10): how to change a
    #: setting, where a control is, what the app is, what changed in it.
    r"how (?:do|can|would) i (?:change|turn (?:on|off)|switch|enable|disable|set(?: up)?|use|find|open|export|import|back ?up|"
    r"reset|sync|install|update|lock|unlock|share|print) .{0,40}\b(?:theme|dark mode|light mode|settings?|export|backup|"
    r"password|shortcuts?|sidebar|font|language|model|the app|memorymap|graph(?: view)?|tabs?|buttons?|account|vault|"
    r"recovery key|notifications?|phone|another computer|data)\b",
    r"where (?:is|are|do i find|can i find) (?:the |my )?.{0,40}\b(?:button|setting|settings|menu|tab|panel|option|toggle|switch)\b",
    r"what(?:'s| is) (?:memorymap|memory map|this app|atlas)",
    r"(?:can|could) you help(?: me)?",
    r"help",
    r"what(?:'s| is) new(?: in (?:the app|memorymap|this version))?",
)

# Words that mean the message really is about the notebook, even when it is
# short or opens with a greeting. These win over the smalltalk patterns.
_NOTE_WORDS = re.compile(
    r"\b(note|notes|entry|entries|wrote|written|saved|capture[ds]?|remember(?:ed)?|"
    r"remind(?:er|ers)?|tag|tags|categor(?:y|ies)|notebook|search|find|summar(?:y|ise|ize)|"
    r"digest|todo|task|list|graph|journal|log|brainstorm|idea|ideas|knowledge|docs|"
    r"project|projects|plan|plans|schedule|events|meeting|meetings|draft|drafts|writing|"
    r"document|documents|thoughts|think|thinking|insight|insights)\b",
    re.IGNORECASE,
)


#: Four or more keys in a row of the keyboard, the whole message one word
#: ("asdfgh", "qwerty", "jkl;"): no real word holds a run of four neighbours.
#: Two linear tests, not one `\w*(...)\w*` (quadratic on "000...", CodeQL).
_ONE_WORD = re.compile(r"\w+")
_MASH = re.compile(r"asdf|sdfg|dfgh|fghj|ghjk|hjkl|qwer|wert|erty|rtyu|tyui|yuio|uiop|zxcv|xcvb|cvbn|vbnm|fdsa|lkjh|poiu|rewq")


def _normalise(text: str) -> str:
    """Lowercase, strip punctuation and filler, collapse whitespace."""
    cleaned = (text or "").strip().lower()
    cleaned = re.sub(r"[^\w\s']", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    # Leading filler ("so hey", "um hi") shouldn't stop a greeting matching.
    return re.sub(r"^(?:so|um+|uh+|well|hmm+|ah+|oh)\s+", "", cleaned)


def _matches_any(text: str, patterns: tuple[str, ...]) -> bool:
    """True if the whole message is one of these phrases, allowing a
    trailing name or address ("hey there", "hi mate")."""
    tail = r"(?:\s+(?:there|mate|buddy|friend|again|assistant|memorymap|bot))*"
    return any(re.fullmatch(rf"{pattern}{tail}", text) for pattern in patterns)


def classify(message: str) -> str:
    """Route one chat message. Falls back to ``notes`` whenever unsure."""
    text = _normalise(message)
    if not text:
        return SMALLTALK

    # "ty", "lol", "ok thx", "hahaha", an emoji alone: small talk typed the
    # way people type it (INBOX 741), answered as such, never searched for.
    from memorymap.ai import question_noise

    if question_noise.social_kind(message):
        return SMALLTALK

    from memorymap.ai import utilities

    kind = utilities.kind_of(message)
    if kind and kind != "until_note":
        return UTILITY

    from datetime import datetime

    from memorymap.ai import commands

    act = commands.read(message, datetime.now())
    if act and act["intent"] != "summarise":
        return ACT

    #: A key-mash ("asdfgh"): asked what was meant, never searched for.
    if _ONE_WORD.fullmatch(text) and _MASH.search(text):
        return SMALLTALK

    # "hey, what did I write about pasta" is a question wearing a greeting.
    if _NOTE_WORDS.search(text):
        return NOTES

    if _matches_any(text, _ABOUT_APP_PATTERNS) or any(
        re.search(pattern, text) for pattern in _ABOUT_APP_PATTERNS
    ):
        return ABOUT_APP

    if _matches_any(text, _SMALLTALK_PATTERNS):
        return SMALLTALK

    return NOTES


def is_mash(message: str) -> bool:
    """A key-mash ("asdfgh"): small talk to `classify`, nothing at all to a reading."""
    text = _normalise(message)
    return bool(_ONE_WORD.fullmatch(text) and _MASH.search(text))


def needs_retrieval(intent: str) -> bool:
    """Only note questions are worth searching the notebook for."""
    return intent == NOTES
