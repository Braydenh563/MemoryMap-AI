"""The composer's wider vocabulary, as data (2026-10-06, the owner: "expand the
available sentence sections, grammar, lingo, understanding ... more natural
language and professional language options ... just expand its vocabulary").

Nothing here is logic. `composer.py` merges these tables into its own:

- **Voices.** The composer writes in one of two registers, `natural` (the
  default: plain, friendly) or `professional` (formal, record-keeping), read
  from the `composer_voice` preference. Every joining phrase and opener has
  several variants in each voice; `VOICE_VARIANTS[voice][key]` lists the
  `PHRASES` keys that say what `key` says in that voice. A variant is an
  ordinary `PHRASES` entry, so the closed-set rule holds: the traceability
  check and the copy-rule test cover them all. A variant keeps the shape of
  the phrase it varies (a trailing space stays a trailing space, a phrase
  that ends before a date still ends before a date), so the code around it
  needs no new cases.
- **Synonyms, comparison words, wrappers, lead-ins, small talk, next steps**:
  more of each, in the same shape as the tables they extend.

Every phrase follows the copy rules: sentence case, no em-dashes, no
exclamation marks, no "Oops"; facts stay quoted from the notes, so nothing
here says anything about a note's contents.
"""

from __future__ import annotations

import re

VOICES = ("natural", "professional")
DEFAULT_VOICE = "natural"


def voice_of(value: object) -> str:
    """`value` as a voice name: anything unknown is the default."""
    return value if value in VOICES else DEFAULT_VOICE


# --- phrase variants ---------------------------------------------------------------

#: canonical key -> {voice: [texts besides the canonical one]}. The canonical
#: text (`composer.PHRASES[key]`) is the first natural variant.
_FAMILIES: dict[str, dict[str, list[str]]] = {
    # Openers: said before the strongest sentence, which is the answer.
    "open_notes": {
        "natural": ["Here is what your notes say: ", "Your notes say: ", "Looking through your notes: ", "Here is what I found in your notes: ", "What your notes have: ", "Hmm, let me look. Your notes say: ", "Let's see. Here is what your notes have: ", "Give me a second to check. Your notes say: "],
        "professional": ["According to your notes: ", "Your notes record the following: ", "Per your notes: ", "The relevant entry in your notes reads: ", "Your records show: ", "From the notes on file: "],
    },
    "open_wrote": {
        "natural": ["This is what you wrote: ", "You wrote: ", "Here is how you put it: ", "Your own words: "],
        "professional": ["You recorded the following: ", "As you wrote it: ", "In your own words: ", "The entry reads: ", "Your entry states: "],
    },
    "open_put": {
        "natural": ["Here is how your notes put it: ", "This is how you put it: ", "Your notes word it like this: ", "In your notes it reads: "],
        "professional": ["Your notes state it as follows: ", "Your notes phrase it as follows: ", "The wording in your notes is: ", "Your notes describe it thus: "],
    },
    "open_figure": {
        "natural": ["Here is the figure you noted: ", "The figure in your notes: ", "You noted this number: ", "The number written down: "],
        "professional": ["The figure recorded in your notes: ", "The recorded figure: ", "The number on record: ", "Your notes give the figure as follows: "],
    },
    "open_date": {
        "natural": ["Here is the date you noted: ", "The date in your notes: ", "You noted this date: ", "The date written down: "],
        "professional": ["The date recorded in your notes: ", "The recorded date: ", "The date on record: ", "Your notes give the date as follows: "],
    },
    "open_where": {
        "natural": ["This is where you noted it: ", "The place in your notes: ", "You noted the place like this: ", "Where it says: "],
        "professional": ["The location recorded in your notes: ", "Your notes give the location as follows: ", "The recorded location: ", "The place on record: "],
    },
    "closest_a": {
        "natural": ["The nearest thing in your notes is this: ", "Not quite, but this is close: ", "Your notes come closest with this: ", "This is the closest I can find: "],
        "professional": ["The nearest entry in your notes reads: ", "The closest relevant entry is: ", "No entry answers this directly. The closest reads: ", "The most relevant entry on file is: "],
    },
    "closest_b": {
        "natural": ["Nothing says that outright. The nearest is: ", "Your notes do not say it directly. The closest is: ", "No note puts it exactly. The nearest is: "],
        "professional": ["Nothing states this directly. The nearest entry is: ", "No entry answers this directly. The closest is: ", "The notes do not state this outright. The nearest entry is: "],
    },
    "going_by": {
        "natural": ["Based on your notes", "From what your notes say", "Judging by your notes", "Reading your notes"],
        "professional": ["According to your notes", "Based on the notes on file", "Per your notes", "As your notes record it", "On the evidence of your notes"],
    },
    "notes_have": {
        "natural": ["Your notes say this on that: ", "This is what your notes say on that: ", "Here is what your notes have on that: ", "On that, your notes say: "],
        "professional": ["Your notes record the following on that: ", "On this point, your notes state: ", "The relevant notes state: ", "Your notes say the following on that: "],
    },
    # Joiners: how the next note is brought in. A trailing space means the
    # quote follows straight on; no trailing space means a comma comes first.
    "and_join": {
        "natural": ["Also ", "Plus ", "As well, "],
        "professional": ["In addition, ", "Additionally, ", "Furthermore, "],
    },
    "on_top": {
        "natural": ["Besides that", "On top of this", "Beyond that", "As well as that"],
        "professional": ["In addition to this", "Moreover", "Further to this", "Beyond this"],
    },
    "separately": {
        "natural": ["On a separate note", "Apart from that", "Aside from that"],
        "professional": ["As a separate point", "Distinct from the above", "As a distinct matter"],
    },
    "elsewhere": {
        "natural": ["In another place", "Somewhere else", "Over in another note"],
        "professional": ["In a separate entry", "Elsewhere in your notes", "In a further entry"],
    },
    "another_note": {
        "natural": ["Changing tack", "Moving on", "On a different note"],
        "professional": ["Turning to another matter", "On a different matter", "As for a different entry"],
    },
    "later_on": {
        "natural": ["Later still, on ", "A little later, on ", "After that, on "],
        "professional": ["Subsequently, on ", "At a later date, on ", "Afterwards, on "],
    },
    "then_on": {
        "natural": ["Next, on ", "Following that, on ", "Soon after, on "],
        "professional": ["Thereafter, on ", "Following this, on ", "At the next entry, on "],
    },
    "earlier_on": {
        "natural": ["Earlier still, on ", "A little earlier, on ", "Going back, on "],
        "professional": ["Previously, on ", "At an earlier date, on ", "Prior to this, on "],
    },
    "and_on": {
        "natural": ["Also on ", "Plus on ", "And again on "],
        "professional": ["In addition, on ", "Additionally, on ", "Furthermore, on "],
    },
    "before_that": {
        "natural": ["Before then, on ", "Prior to that, on ", "Even earlier, on "],
        "professional": ["Preceding this, on ", "Before this, on ", "At an earlier point, on "],
    },
    "latest_a": {
        "natural": ["Latest of all, on ", "The most recent one, on ", "Newest of all, on "],
        "professional": ["Most recently, as of ", "The most recent entry, dated ", "The latest entry, on "],
    },
    "latest_b": {
        "natural": ["The freshest, from ", "The latest, from ", "Newest of all, from "],
        "professional": ["The most recent entry, from ", "The latest entry, from ", "The newest entry, from "],
    },
    "latest_c": {
        "natural": ["Up to ", "As things stood on "],
        "professional": ["As recorded on ", "Current as of "],
    },
    "latest_undated": {
        "natural": ["The newest one: ", "The latest one: ", "The last one: "],
        "professional": ["The most recent entry: ", "The latest entry: ", "The newest entry: "],
    },
    "of_found": {
        "natural": ["Among the notes found, ", "Looking at the notes found, "],
        "professional": ["Of the notes retrieved, ", "Among the notes retrieved, "],
    },
    "across_found": {
        "natural": ["Looking across the notes found, ", "Taking the notes found together, "],
        "professional": ["Across the notes retrieved, ", "Taken together, the notes retrieved show that "],
    },
    # Disagreement.
    "disagree_lead": {
        "natural": ["Your notes might not agree here. ", "Your notes may say different things here. ", "Careful, your notes may disagree here. "],
        "professional": ["Your notes may conflict on this point. ", "There may be a discrepancy in your notes. ", "Your notes appear to differ here. "],
    },
    "but_newer": {
        "natural": ["Yet in a newer note", "Then again, in a newer note"],
        "professional": ["However, in a newer note", "By contrast, in a newer note", "Conversely, in a newer note"],
    },
    "but_older": {
        "natural": ["Yet in an older note", "Then again, in an older note"],
        "professional": ["However, in an older note", "By contrast, in an older note", "Conversely, in an older note"],
    },
    "but_other": {
        "natural": ["Yet in another note", "Then again, in another note"],
        "professional": ["However, in another note", "By contrast, in another note", "Conversely, in another note"],
    },
    "disagree_check": {
        "natural": [" They may disagree, so it is worth checking which is current.", " That may not match, so it is worth checking which is current.", " These could conflict, so check which one is current."],
        "professional": [" These entries may conflict, so it is advisable to confirm which is current.", " These may be inconsistent, so please confirm which is current.", " The two may differ, so it is worth confirming which is current."],
    },
    # Lists and comparisons.
    "timeline": {
        "natural": ["Oldest first:", "Here they are, oldest first:", "In the order they were written:"],
        "professional": ["In chronological order:", "Listed chronologically:", "In order of entry:"],
    },
    "each_side": {
        "natural": ["Here is what each one says.", "This is what each says.", "Here is each side."],
        "professional": ["Each is set out below.", "Each side follows.", "The notes on each side follow."],
    },
    "side_none": {
        "natural": ["Nothing found is about this one by itself.", "Nothing here is only about this one."],
        "professional": ["Nothing found addresses this side on its own.", "No entry found concerns this side alone."],
    },
    "both": {
        "natural": ["Both at once", "Both in one place"],
        "professional": ["Both combined", "Taken together"],
    },
    "missing": {
        "natural": ["None of these notes say anything about ", "These notes do not mention "],
        "professional": ["None of the notes found mention ", "No note found mentions ", "The notes found make no mention of "],
    },
    # No answer: one voice each, since the wording must stay a question.
    "nothing": {
        "natural": [],
        "professional": ["None of the notes found answers that. Which note might hold it, or how else might it be phrased?"],
    },
}

#: Pairs said around a measured value: the second takes the first's index, so
#: "Recorded on 3 March: ..." never meets "you wrote: ". Equal lengths.
_PAIRS: dict[str, dict[str, list[str]]] = {
    "wrote_on_a": {
        "natural": ["You wrote this on ", "Back on ", "On "],
        "professional": ["Recorded on ", "Dated ", "Entered on ", "As of "],
    },
    "wrote_on_b": {
        "natural": [": ", " you wrote: ", " you noted: "],
        "professional": [": ", ": ", ": ", ", your notes state: "],
    },
}
#: The canonical `wrote_on_b` pairs with the canonical `wrote_on_a`.
PAIRED = {"wrote_on_b": "wrote_on_a"}


def _build() -> tuple[dict[str, str], dict[str, dict[str, tuple[str, ...]]], dict[str, str]]:
    extra: dict[str, str] = {}
    voices: dict[str, dict[str, tuple[str, ...]]] = {"natural": {}, "professional": {}}
    canon: dict[str, str] = {}
    for key, by_voice in {**_FAMILIES, **_PAIRS}.items():
        for voice, texts in by_voice.items():
            tag = "n" if voice == "natural" else "p"
            keys = [f"{key}_{tag}{i}" for i in range(1, len(texts) + 1)]
            for name, text in zip(keys, texts):
                extra[name] = text
                canon[name] = key
            #: Natural keeps the original phrase as its first variant; the
            #: professional list is its own words only (a key with none in
            #: one voice says its original in both).
            voices[voice][key] = (key, *keys) if voice == "natural" else tuple(keys) or (key,)
    return extra, voices, canon


EXTRA_PHRASES, VOICE_VARIANTS, CANON = _build()


# --- synonyms ---------------------------------------------------------------------

#: One thing said several ways, never a broader idea (the rule of
#: `composer.SYNONYM_GROUPS`, which these extend). Everyday topics.
EXTRA_SYNONYM_GROUPS: tuple[tuple[str, ...], ...] = (
    # Time.
    ("deadline", "due", "cutoff"),
    ("schedule", "agenda", "timetable", "calendar", "itinerary"),
    ("late", "delayed", "overdue"),
    ("daily", "everyday"),
    ("yearly", "annual", "annually"),
    ("often", "frequently", "regularly"),
    ("quickly", "fast", "rapid", "speedy", "swift"),
    ("anniversary", "birthday", "bday"),
    ("booking", "reservation"),
    # Money.
    ("salary", "wage", "income", "earnings"),
    ("invoice", "bill", "receipt"),
    ("refund", "reimbursement", "repayment"),
    ("loan", "mortgage", "debt", "borrow"),
    ("rent", "lease", "tenancy"),
    ("tax", "taxes", "vat"),
    ("insurance", "insured", "insurer"),
    ("discount", "sale", "voucher", "coupon"),
    ("expense", "expenses", "outgoings", "spending"),
    # Work.
    ("boss", "manager", "supervisor"),
    ("colleague", "coworker", "teammate", "workmate"),
    ("promotion", "promoted"),
    ("interview", "screening"),
    ("resume", "cv"),
    ("task", "todo", "errand", "chore"),
    ("client", "customer"),
    ("proposal", "pitch", "bid"),
    ("report", "writeup"),
    ("presentation", "slides", "deck"),
    ("email", "mail"),
    ("contract", "agreement"),
    ("office", "workplace"),
    ("feedback", "critique", "evaluation"),
    ("goal", "target", "objective", "aim"),
    ("project", "initiative"),
    # Study.
    ("exam", "quiz", "examination"),
    ("homework", "assignment", "coursework"),
    ("lecture", "lesson", "seminar"),
    ("teacher", "tutor", "professor", "lecturer", "instructor"),
    ("study", "revise", "revision", "learn", "learning"),
    ("student", "pupil"),
    ("university", "college", "uni"),
    ("essay", "paper", "dissertation", "thesis"),
    ("degree", "diploma", "qualification"),
    # Health.
    ("medicine", "medication", "meds", "pills", "tablets", "prescription"),
    ("sick", "ill", "unwell", "poorly"),
    ("pain", "ache", "sore", "hurt", "hurts"),
    ("sleep", "nap", "snooze"),
    ("exercise", "workout", "gym", "fitness"),
    ("diet", "nutrition"),
    ("dentist", "dental", "teeth", "tooth"),
    ("hospital", "clinic", "surgery"),
    ("allergy", "allergic", "allergies"),
    ("vaccine", "vaccination", "jab"),
    ("therapy", "counselling", "therapist", "counsellor"),
    # Travel.
    ("flight", "plane", "airline", "fly", "flying"),
    ("passport", "visa"),
    ("luggage", "baggage", "suitcase", "bags"),
    ("train", "rail", "railway"),
    ("bus", "coach"),
    ("taxi", "cab", "uber"),
    ("ticket", "tickets"),
    ("tour", "sightseeing", "excursion"),
    ("beach", "coast", "seaside", "shore"),
    ("directions", "route"),
    ("arrive", "arrival"),
    ("depart", "departure", "leave", "leaving"),
    ("lodging", "hostel", "bnb", "guesthouse"),
    # Home.
    ("fix", "repair", "mend"),
    ("clean", "cleaning", "tidy"),
    ("sofa", "couch", "settee"),
    ("fridge", "refrigerator"),
    ("tv", "television"),
    ("bin", "trash", "rubbish", "garbage"),
    ("garden", "yard", "lawn"),
    ("bathroom", "toilet", "loo", "washroom"),
    ("neighbour", "neighbor"),
    ("move", "moving", "relocate", "relocation"),
    ("boiler", "heating", "heater", "radiator"),
    ("paint", "painting", "decorate", "decorating"),
    ("roommate", "flatmate", "housemate"),
    # People.
    ("mum", "mom", "mother", "mam"),
    ("dad", "father"),
    ("brother", "bro", "sibling"),
    ("sister", "sis"),
    ("spouse", "partner"),
    ("kid", "kids", "child", "children"),
    ("baby", "infant", "newborn"),
    ("grandma", "granny", "gran", "nan", "nana", "grandmother"),
    ("grandpa", "grandad", "granddad", "grandfather"),
    ("party", "celebration", "gathering", "get-together"),
    # Feelings.
    ("happy", "glad", "pleased", "delighted", "cheerful"),
    ("sad", "unhappy", "upset", "gloomy", "miserable"),
    ("angry", "mad", "furious", "annoyed", "irritated"),
    ("scared", "afraid", "frightened", "fear"),
    ("excited", "thrilled", "eager", "keen"),
    ("tired", "exhausted", "weary", "fatigue"),
    ("bored", "boring", "dull"),
    ("hate", "dislike", "detest"),
    ("proud", "pride"),
    ("lonely", "isolated"),
    ("confused", "puzzled", "unsure", "unclear"),
    ("calm", "relaxed", "peaceful"),
    ("grateful", "thankful"),
    ("worried", "anxious", "nervous", "concerned", "stressed", "stress", "anxiety"),
    # Tasks.
    ("finish", "complete", "done", "finished", "wrap"),
    ("start", "begin", "started", "began"),
    ("delay", "postpone", "defer", "reschedule"),
    ("cancel", "scrap", "abandon"),
    ("urgent", "asap", "pressing"),
    ("prepare", "prep", "preparing"),
    ("blocked", "stuck", "stalled"),
    ("arrange", "organise", "organize"),
    # Places.
    ("restaurant", "cafe", "diner", "bistro", "eatery"),
    ("pub", "tavern"),
    ("shop", "store"),
    ("museum", "gallery"),
    ("cinema", "theater", "theatre"),
    ("address", "location", "street"),
    ("city", "town"),
    ("country", "nation"),
    ("neighbourhood", "neighborhood", "district", "suburb"),
    ("mountain", "peak", "summit"),
    ("church", "chapel", "cathedral"),
    # Comparison words said two ways.
    ("better", "superior", "preferable", "nicer"),
    ("cheaper", "cheapest"),
    ("faster", "quicker", "speedier"),
    ("pros", "advantages", "benefits", "upsides"),
    ("cons", "disadvantages", "drawbacks", "downsides"),
)

# --- comparison ---------------------------------------------------------------------

_MORE = (
    "better|worse|cheaper|faster|slower|bigger|smaller|larger|longer|shorter|easier|harder|safer|nearer|closer|"
    "nicer|quicker|lighter|heavier|(?:more|less) [a-z]+"
)

#: Two-sided comparison patterns, tried after the originals in
#: `composer._COMPARE_SIDES`: each needs both sides in the question.
EXTRA_COMPARE_SIDES: tuple[re.Pattern[str], ...] = (
    re.compile(rf"^(?:(?:is|are|was|were|does|do|did)\s+)?(?P<a>.+?)\s+(?:(?:is|are|was|were)\s+)?(?:{_MORE}) than (?P<b>.+?)[?.!]*$", re.I),
    re.compile(r"^(?:how|what) (?:does|do|did) (?P<a>.+?) (?:compare|stack up|measure up) (?:with|to|against) (?P<b>.+?)[?.!]*$", re.I),
    re.compile(r"^(?P<a>.+?),? compare[sd]? (?:with|to) (?P<b>.+?)[?.!]*$", re.I),
    re.compile(rf"^which (?:is|are|was|were) (?:{_MORE})[,:]?\s+(?P<a>.+?) or (?P<b>.+?)[?.!]*$", re.I),
    re.compile(r"^(?:(?:what are|what is) )?(?:the )?(?:pros and cons|advantages and disadvantages|upsides and downsides|pros|cons) of (?P<a>.+?) (?:and|or|vs\.?|versus) (?P<b>.+?)[?.!]*$", re.I),
    re.compile(r"^(?:how|what) (?:is|are) (?P<a>.+?) (?:different|difference|differs?) from (?P<b>.+?)[?.!]*$", re.I),
    re.compile(r"^(?P<a>.+?) (?:differs?|is different|is a difference) from (?P<b>.+?)[?.!]*$", re.I),
    re.compile(r"^(?:the )?comparison (?:of|between) (?P<a>.+?) (?:and|with|to|vs\.?|versus) (?P<b>.+?)[?.!]*$", re.I),
    re.compile(r"\b(?:similarities|contrast) between (?P<a>.+?) and (?P<b>.+?)[?.!]*$", re.I),
)

#: The comparison triggers added to the "compare" shape rule: all two-sided,
#: so a question with one subject is never read as a comparison.
COMPARE_SHAPE_EXTRA = (
    rf"\b(?:{_MORE}) than\b|\bcompare[sd]? (?:with|to)\b|\b(?:pros and cons|advantages and disadvantages) of .+? (?:and|or|vs\.?|versus) |"
    rf"^which (?:is|are|was|were) (?:{_MORE})\b.+? or |\b(?:differs?|different|difference) from\b|\bcomparison (?:of|between)\b|"
    r"\b(?:similarities|contrast) between\b|\bstack up against\b|\bmeasure up (?:to|against)\b"
)

#: Comparison words are asking words: dropped from the subject, so "is Lisbon
#: cheaper than Porto" is about Lisbon and Porto and is never told no note
#: mentions "cheaper".
EXTRA_ASKING_WORDS = frozenset(
    """compared comparison versus better worse cheaper faster slower bigger smaller larger longer shorter
    easier harder safer pros cons advantages disadvantages drawbacks upsides downsides differ differs
    different than similarities contrast""".split()
)

# --- wrappers, trailers and contractions ------------------------------------------

#: More of the wrappers a casual, indirect or formal question comes in, each a
#: pattern for `composer._WRAPPERS` (taken off before the question is read).
EXTRA_WRAPPERS: tuple[str, ...] = (
    r"^(?:could|would|can|will) you (?:kindly |please )?(?:advise|inform|clarify|confirm|help me understand|explain to me|point me to)\s+",
    r"^(?:would|do) you (?:mind|happen to) (?:telling|tell|know|knowing|checking|check|looking up|look up|reminding|remind)\s+(?:me\s+)?",
    r"^i(?:'m| am)? (?:just )?(?:curious|wondering|trying to (?:find out|remember|work out|recall)|hoping you can tell me)\s+(?:about\s+)?",
    r"^i(?:'d| would)? (?:really )?(?:like|love) to (?:know|find out|see|check|confirm)\s+",
    r"^i(?:'d| would)? (?:really )?(?:like|love) (?:you )?to (?:tell me|remind me|show me)\s+",
    r"^(?:out of curiosity|just checking|just to check|just to confirm|just to be sure|for reference|for the record)\b[,:]?\s+",
    r"^(?:may|can|could) i (?:ask|check|confirm|know)\s+",
    r"^is it possible to (?:find out|know|check|see|tell)\s+",
    r"^(?:i )?(?:need|want|have) (?:to )?(?:find out|check|confirm|verify|look up|know)\s+",
    r"^i(?:'m| am| was)? (?:just )?(?:hoping|wondering|thinking) (?:that )?(?:you|if you)(?:'d| would| could| can)? (?:could |can |would )?(?:tell|remind|show|let) me\s+(?:about\s+)?",
    r"^to (?:find out|check|confirm|verify|know|see|remember|recall|look up)\s+(?=(?:what|when|where|who|why|how|which|if|whether)\b)",
    r"^(?:kindly|please kindly|would you be so kind as to)\s+(?:tell|remind|show|let) me\s+",
    r"^(?:could|would|can) you (?:quickly |just )?(?:look|search|dig) (?:up|for|through)\s+",
    r"^(?:do|did) (?:i|we) (?:ever )?(?:note|write|record|mention|jot|save) (?:down )?(?:anything )?(?:about|on)\s+",
    r"^(?:anyone|somebody|someone) (?:know|remember)\s+",
    r"^(?:one more thing|another thing|and finally|finally|lastly|last one|one last thing)\b[,:]?\s+",
    r"^(?:oh and|oh,|also,|and also|and then)\s+(?=\w)",
    r"^(?:sorry|apologies|excuse me|pardon me)\b[,.:]?\s+(?=(?:but |can |could |what |when |where |who |why |how |is |are |do |does |did )\w)",
    r"^(?:hm+|erm+|so then|right then|okay then|ok then|alright then|all right then)\b[,.:]?\s+",
    r"^well[,.:]\s+",
    r"^(?:you know (?:what|that)|guess what|listen)\b[,.:]?\s+",
    r"^(?:good (?:morning|afternoon|evening)|morning|evening)\b[,.:]?\s+(?=\w{3,})(?=(?:what|when|where|who|why|how|is|are|do|does|did|can|could)\b)",
    r"^(?:in your notes|from my notes|in my notes|according to my notes|from your notes)\b[,:]?\s+",
    r"^(?:for me|for my records)\b[,:]?\s+",
    r"^(?:hello|hi|hey|dear (?:assistant|atlas|notebook))\b[,.:]?\s+(?=\w)",
)

#: Closing phrases dropped after the question ("... if you can", "... thank you
#: in advance"): joined into the `_TRAILERS` pattern.
EXTRA_TRAILERS: tuple[str, ...] = (
    "if you can", "if possible", "if you could", "when you get a chance", "thanks in advance", "thank you in advance",
    "at your convenience", "kindly", "if that is ok", "if that's ok", "if you do not mind", "if you don't mind",
    "much appreciated", "appreciate it",
    "when you can", "whenever you can", "no rush", "no hurry", "just curious", "out of curiosity", "for reference",
    "for the record", "thanks a lot", "many thanks", "thanks so much",
)

#: "what'd", "where're" and the rest: (pattern, replacement) pairs for
#: `composer._CONTRACTIONS`.
EXTRA_CONTRACTIONS: tuple[tuple[str, str], ...] = (
    (r"^(what|how|where|when|who|why)(?:'d)\b", r"\1 did"),
    (r"^(what|how|where|when|who|why)(?:'ll)\b", r"\1 will"),
    (r"^(what|how|where|when|who|why)(?:'ve)\b", r"\1 have"),
    (r"^(?:whadda|whaddya)\b", "what do you"),
    (r"^howd\b", "how did"),
    (r"^whered\b", "where did"),
    (r"^whend\b", "when did"),
    (r"^whod\b", "who did"),
    (r"^whatd\b", "what did"),
)

# --- lead-ins ------------------------------------------------------------------------

#: More filler a note opens with, taken off with the comma or colon after it
#: (`composer.LEAD_INS`).
EXTRA_LEAD_INS: tuple[str, ...] = (
    "just a thought", "quick thought", "thought", "fyi to self", "heads up", "for the record", "for reference",
    "in short", "in summary", "to summarise", "to summarize", "in other words", "as noted", "as discussed",
    "as mentioned", "as promised", "as usual", "as always", "in brief", "side note", "small note", "a note",
    "one more thing", "another thing", "actually", "anyways", "alright", "all right", "yeah", "hmm", "so yeah",
    "ok so then", "right then", "okay then", "update to self",
)

# --- small talk ---------------------------------------------------------------------

#: More natural lines per kind of turn, appended to `composer.SOCIAL`.
SOCIAL_NATURAL_EXTRA: dict[str, tuple[str, ...]] = {
    "greeting": (
        "Hey. What can I find for you?",
        "Hi again. Ask me anything about your notes.",
        "Hello. Your notes are all here, so ask away.",
        "Hey there. Want to look something up?",
    ),
    "morning": (
        "Good morning. What would you like to check first?",
        "Morning. Ask me about anything you wrote down.",
        "Good morning. Your notes are all here.",
    ),
    "compliment": (
        "Aw, thanks! What can I look up for you next?",
        "I try my best! Anything else to check?",
        "Thanks! Ask away when you're ready.",
    ),
    "insult": (
        "Ouch, sorry about that. Try asking it another way?",
        "My bad! I'll try to do better. What should we look up?",
        "Sorry! Let's try again. What are we looking for?",
    ),
    "emotion": (
        "I hear you. Take your time. What can I help you find?",
        "Got it. I'm here when you're ready to check your notes.",
        "That's completely understandable. Let me know what you want to look up.",
    ),
    "thanks": (
        "No problem. Ask again whenever you like.",
        "Glad to help.",
        "You are most welcome. Anything else to look up?",
    ),
    "how": (
        "Good, thanks. What would you like to find?",
        "All well here. Anything you want to check in your notes?",
        "Doing fine. What can I look up for you?",
    ),
    "bye": (
        "Goodbye for now. Your notes are saved.",
        "Talk soon. Everything you wrote is here.",
        "See you next time.",
    ),
    "sorry": (
        "That is fine. What would you like to look up?",
        "No harm done. Ask it again and I will have another look.",
        "Nothing to apologise for. What next?",
    ),
    "laugh": (
        "Ha, good. What would you like to find next?",
        "Glad that landed. Anything else to look up?",
        "Nice. Ask me whenever you are ready.",
    ),
    "reaction": (
        "Right. Want me to look anything up about it?",
        "Fair enough. Shall I find something else?",
        "I hear you. What next?",
    ),
    "confused": (
        "Sorry about that. Try asking it in different words, or name the note you mean.",
        "That was unclear. Say it another way and I will look again.",
        "Let me try again. Which part would you like me to look at?",
    ),
    "ack": (
        "Sure. Ask when you are ready.",
        "Understood. What next?",
        "Right. Anything else to look up?",
    ),
    "who": (
        "I am your notebook's assistant. I find things in your notes and say what they say.",
        "I answer questions from your notes. Ask me when something is, or what you decided.",
    ),
    "about_app": (
        "Ask me when something is, who said what, how a project stands or what the latest is, and I will answer "
        "from your notes in their own words. Connecting a model adds writing and tools.",
    ),
}

#: The professional voice's lines, one tuple per kind. Same kinds as `SOCIAL`.
SOCIAL_PROFESSIONAL: dict[str, tuple[str, ...]] = {
    "greeting": (
        "Hello. How may I help you with your notes?",
        "Good day. What would you like to look up in your notes?",
        "Hello. I can answer questions from what you have recorded.",
        "Welcome back. What would you like to review?",
    ),
    "morning": (
        "Good morning. What would you like to review?",
        "Good morning. Your notes are available whenever you are ready.",
        "Good morning. How may I assist?",
    ),
    "thanks": (
        "You are welcome.",
        "My pleasure. Please ask again whenever you need something from your notes.",
        "Glad to be of help.",
        "Not at all. Is there anything else you would like to review?",
    ),
    "how": (
        "Well, thank you. How may I help with your notes?",
        "Very well, thank you. What would you like to look up?",
        "I am well. What would you like to find in your notes?",
    ),
    "bye": (
        "Goodbye. Your notes remain saved.",
        "Thank you. Everything you recorded is saved.",
        "Until next time.",
    ),
    "sorry": (
        "There is no need to apologise. How may I help?",
        "No problem. Please rephrase the question and I will look again.",
        "That is quite all right. What would you like to look up?",
    ),
    "laugh": (
        "Glad to hear it. Is there anything else you would like to review?",
        "Understood. How may I help next?",
        "Very good. Please ask whenever you are ready.",
    ),
    "reaction": (
        "Understood. Would you like me to look up anything related?",
        "Noted. Is there anything else you would like to review?",
        "Of course. How may I help next?",
    ),
    "confused": (
        "My apologies, that was unclear. Please rephrase the question, or name the note you mean.",
        "I may have missed the point. Which part would you like me to review again?",
        "Let me try again. Could you put the question in other words?",
    ),
    "ack": (
        "Understood. Is there anything else?",
        "Noted. Please ask whenever you are ready.",
        "Very good. What would you like to review next?",
    ),
    "who": (
        "I am the notebook's assistant. Without a model running, I answer from your notes in their own words.",
        "I locate entries in your notes and report what they say.",
    ),
    "about_app": (
        "I answer from your notes: when something is, who said what, what the latest is on a project, or what "
        "you have recorded on a subject. Connecting a model adds writing, summaries and tools.",
        "Ask about anything you have recorded: a date, a decision, a list or the status of a project. Several "
        "questions in one message are also answered. Connecting a model adds writing and tools.",
    ),
    "compliment": (
        "Thank you. Is there anything else you would like to review?",
        "I appreciate the feedback. What would you like to review next?",
    ),
    "insult": (
        "My apologies if the results were unhelpful. How may I improve the search?",
        "I will strive to do better. Please rephrase the question and I will look again.",
    ),
    "emotion": (
        "Understood. How may I assist you with your notes?",
        "Noted. What would you like to review today?",
    ),
}

#: Next steps offered after an acknowledgement, each with a "{subject}" slot.
NEXT_STEPS_EXTRA: tuple[str, ...] = (
    "Ask for more on “{subject}” if you like.",
    "I can look up the latest on “{subject}” if you want.",
    "Say “what else” and I will look further into “{subject}”.",
    "Want to know when you last wrote about “{subject}”?",
    "I can pull out the dates for “{subject}” as well.",
    "Say “more” for the rest of what your notes say on “{subject}”.",
)
NEXT_STEPS_PROFESSIONAL: tuple[str, ...] = (
    "I can provide further detail on “{subject}” if required.",
    "Say “tell me more” for additional detail on “{subject}”.",
    "I can also retrieve the latest entry on “{subject}”.",
    "Please ask if you would like the dates recorded for “{subject}”.",
    "I can review the remaining entries on “{subject}” on request.",
    "Would you like the most recent update on “{subject}”?",
)
