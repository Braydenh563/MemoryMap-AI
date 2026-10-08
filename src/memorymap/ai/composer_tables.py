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
        "natural": [
            "Here is what your notes say: ", "Your notes say: ", "Looking through your notes: ",
            "Here is what I found in your notes: ", "What your notes have: ", "Hmm, let me look. Your notes say: ",
            "Let's see. Here is what your notes have: ", "Give me a second to check. Your notes say: ",
            "Alright, based on your notes: ", "Okay, checking your notes: ", "Found it. Your notes say: ",
            "Just checked your notes: ", "According to what you jotted down: ", "Here's the relevant note: "
        ],
        "professional": [
            "According to your notes: ", "Your notes record the following: ", "Per your notes: ",
            "The relevant entry in your notes reads: ", "Your records show: ", "From the notes on file: ",
            "A review of your records indicates: ", "The documentation shows: ", "As documented in your notes: ",
            "Based on the available records: ", "The corresponding file notes: ", "Referencing your entries: "
        ],
    },
    "open_wrote": {
        "natural": [
            "This is what you wrote: ", "You wrote: ", "Here is how you put it: ", "Your own words: ",
            "Here is what you jotted down: ", "This is how you worded it: ", "In your own words: ",
            "Exactly as you wrote it: ", "You mentioned this: ", "This is what you had to say: "
        ],
        "professional": [
            "You recorded the following: ", "As you wrote it: ", "In your own words: ",
            "The entry reads: ", "Your entry states: ", "The exact phrasing in your records is: ",
            "Your documentation notes: ", "As stated in the log: ", "The record indicates: "
        ],
    },
    "open_put": {
        "natural": [
            "Here is how your notes put it: ", "This is how you put it: ", "Your notes word it like this: ",
            "In your notes it reads: ", "This is how it's phrased: ", "Your notes put it this way: ",
            "Here is the phrasing you used: ", "This is exactly how it is noted: ", "The notes express it as: "
        ],
        "professional": [
            "Your notes state it as follows: ", "Your notes phrase it as follows: ", "The wording in your notes is: ",
            "Your notes describe it thus: ", "It is expressed in the records as: ", "The entry articulates this as: ",
            "The formal entry states: ", "As phrased in the respective note: ", "The phrasing recorded is: "
        ],
    },
    "open_figure": {
        "natural": [
            "Here is the figure you noted: ", "The figure in your notes: ", "You noted this number: ",
            "The number written down: ", "Here's the amount you jotted down: ", "The number you saved: ",
            "I found this figure: ", "This is the exact amount in your notes: ", "Here's the number: "
        ],
        "professional": [
            "The figure recorded in your notes: ", "The recorded figure: ", "The number on record: ",
            "Your notes give the figure as follows: ", "The designated amount is: ", "The recorded value is: ",
            "According to the entry, the figure is: ", "The stated numerical value is: ", "The specific amount noted is: "
        ],
    },
    "open_date": {
        "natural": [
            "Here is the date you noted: ", "The date in your notes: ", "You noted this date: ",
            "The date written down: ", "Here's the exact date: ", "This is the day you saved: ",
            "The day noted down: ", "I found this date: ", "This is the time you mentioned: "
        ],
        "professional": [
            "The date recorded in your notes: ", "The recorded date: ", "The date on record: ",
            "Your notes give the date as follows: ", "The specified date is: ", "The scheduled date recorded is: ",
            "The timestamp noted is: ", "The assigned date in the log is: ", "As dated in the records: "
        ],
    },
    "open_where": {
        "natural": [
            "This is where you noted it: ", "The place in your notes: ", "You noted the place like this: ",
            "Where it says: ", "Here's the location you saved: ", "The spot mentioned in your notes: ",
            "This is the location: ", "I found this place: ", "The whereabouts noted: "
        ],
        "professional": [
            "The location recorded in your notes: ", "Your notes give the location as follows: ", "The recorded location: ",
            "The place on record: ", "The designated location is: ", "The address specified in the entry is: ",
            "The site documented is: ", "The recorded whereabouts are: ", "According to the entry, the location is: "
        ],
    },
    "closest_a": {
        "natural": [
            "The nearest thing in your notes is this: ", "Not quite, but this is close: ", "Your notes come closest with this: ",
            "This is the closest I can find: ", "I couldn't find an exact match, but here is the closest note: ",
            "This isn't an exact match, but it's the closest: ", "Here's the most relevant thing I could find: ",
            "It doesn't say it perfectly, but this comes close: ", "The best match I could find is this: "
        ],
        "professional": [
            "The nearest entry in your notes reads: ", "The closest relevant entry is: ", "No entry answers this directly. The closest reads: ",
            "The most relevant entry on file is: ", "An exact match is unavailable; the most related entry states: ",
            "While indirect, the closest record indicates: ", "The most pertinent note available reads: ",
            "There is no direct reference. The nearest approximation is: ", "The closest match on record is as follows: "
        ],
    },
    "closest_b": {
        "natural": [
            "Nothing says that outright. The nearest is: ", "Your notes do not say it directly. The closest is: ",
            "No note puts it exactly. The nearest is: ", "I couldn't find a direct answer. The closest is: ",
            "Nothing hits the nail on the head. The nearest note is: ", "There's no direct mention, but this comes close: ",
            "Your notes don't state it plainly. Here is the closest match: ", "No direct answer found, but here is the next best thing: "
        ],
        "professional": [
            "Nothing states this directly. The nearest entry is: ", "No entry answers this directly. The closest is: ",
            "The notes do not state this outright. The nearest entry is: ", "An explicit answer is not recorded. The closest relevant entry is: ",
            "There is no unequivocal statement on this matter. The most pertinent entry is: ", "No direct documentation exists. The most adjacent note is: ",
            "Direct clarification is absent. The nearest equivalent is: ", "Without a definitive entry, the closest match is: "
        ],
    },
    "going_by": {
        "natural": [
            "Based on your notes", "From what your notes say", "Judging by your notes", "Reading your notes",
            "According to what you wrote", "Going by what is jotted down", "Looking at your records",
            "If we go by your notes", "As far as your notes say", "From the looks of your notes"
        ],
        "professional": [
            "According to your notes", "Based on the notes on file", "Per your notes", "As your notes record it",
            "On the evidence of your notes", "As indicated by the records", "Based on the documentation",
            "According to the available entries", "As documented", "In light of the recorded notes"
        ],
    },
    "notes_have": {
        "natural": [
            "Your notes say this on that: ", "This is what your notes say on that: ", "Here is what your notes have on that: ",
            "On that, your notes say: ", "As for that, your notes say: ", "Regarding that, here is what you wrote: ",
            "Here's what is jotted down on the matter: ", "This is what you saved about that: ", "On this topic, your notes say: "
        ],
        "professional": [
            "Your notes record the following on that: ", "On this point, your notes state: ", "The relevant notes state: ",
            "Your notes say the following on that: ", "Regarding this matter, the records show: ", "The associated documentation reads: ",
            "The entry corresponding to this subject states: ", "In relation to this, the file reads: ", "The record states the following on this topic: "
        ],
    },
    "and_join": {
        "natural": [
            "Also ", "Plus ", "As well, ", "And ", "In addition, ", "Not to mention, ", "And also, ",
            "Along with that, ", "Together with that, ", "Plus, ", "Oh, and ", "Also, "
        ],
        "professional": [
            "In addition, ", "Additionally, ", "Furthermore, ", "Moreover, ", "Further, ",
            "As an additional point, ", "Complementary to this, ", "Also noted: ", "In parallel, "
        ],
    },
    "on_top": {
        "natural": [
            "Besides that", "On top of this", "Beyond that", "As well as that", "Along with that",
            "Not only that, but", "To add to that", "Another thing", "More than that"
        ],
        "professional": [
            "In addition to this", "Moreover", "Further to this", "Beyond this", "As a supplementary point",
            "Coupled with this", "Building on this", "Additionally", "In conjunction with this"
        ],
    },
    "separately": {
        "natural": [
            "On a separate note", "Apart from that", "Aside from that", "In a different note",
            "Unrelated to that", "Moving to something else", "On another topic", "Elsewhere", "Meanwhile"
        ],
        "professional": [
            "As a separate point", "Distinct from the above", "As a distinct matter", "In a separate context",
            "Independently", "Separately noted", "Addressing a separate matter", "On an unrelated point"
        ],
    },
    "elsewhere": {
        "natural": [
            "In another place", "Somewhere else", "Over in another note", "In a different spot",
            "From a different note", "Another entry says", "I also found this elsewhere", "Elsewhere in your notes"
        ],
        "professional": [
            "In a separate entry", "Elsewhere in your notes", "In a further entry", "In another location",
            "Documented elsewhere", "In a distinct file", "An alternative entry shows", "In a different section of the records"
        ],
    },
    "another_note": {
        "natural": [
            "Changing tack", "Moving on", "On a different note", "Switching gears",
            "Looking at something else", "In another entry", "From another angle", "Turning to another note"
        ],
        "professional": [
            "Turning to another matter", "On a different matter", "As for a different entry", "Addressing a distinct topic",
            "Transitioning to a separate point", "With regard to another note", "In reference to a separate entry", "Shifting focus to another record"
        ],
    },
    "later_on": {
        "natural": [
            "Later still, on ", "A little later, on ", "After that, on ", "Fast forward to ",
            "Then, moving forward to ", "Some time later, on ", "Further along, on ", "Down the line, on "
        ],
        "professional": [
            "Subsequently, on ", "At a later date, on ", "Afterwards, on ", "In a subsequent entry, dated ",
            "Following that time, on ", "Further in time, on ", "Progressing chronologically to ", "At a later juncture, on "
        ],
    },
    "then_on": {
        "natural": [
            "Next, on ", "Following that, on ", "Soon after, on ", "Right after, on ",
            "Then on ", "Moving to ", "And then on ", "The next note, on "
        ],
        "professional": [
            "Thereafter, on ", "Following this, on ", "At the next entry, on ", "In the following record, dated ",
            "Subsequently, on ", "The subsequent entry on ", "Continuing on ", "In due course, on "
        ],
    },
    "earlier_on": {
        "natural": [
            "Earlier still, on ", "A little earlier, on ", "Going back, on ", "Before all that, on ",
            "Stepping back to ", "Looking back at ", "In a past note, on ", "Beforehand, on "
        ],
        "professional": [
            "Previously, on ", "At an earlier date, on ", "Prior to this, on ", "In a preceding entry, dated ",
            "Earlier in the timeline, on ", "Historically, on ", "Dating back to ", "In a prior record, on "
        ],
    },
    "and_on": {
        "natural": [
            "Also on ", "Plus on ", "And again on ", "Another one on ", "There's also this on ",
            "And here is another on ", "As well as on ", "Not forgetting this from "
        ],
        "professional": [
            "In addition, on ", "Additionally, on ", "Furthermore, on ", "A further entry on ",
            "Also recorded on ", "Moreover, on ", "Supplementary to this, on ", "In a concurrent entry on "
        ],
    },
    "before_that": {
        "natural": [
            "Before then, on ", "Prior to that, on ", "Even earlier, on ", "Just before that, on ",
            "Rewinding a bit to ", "Back before that, on ", "Beforehand, on ", "Preceding that, on "
        ],
        "professional": [
            "Preceding this, on ", "Before this, on ", "At an earlier point, on ", "Prior to that occurrence, on ",
            "In a prior instance, dated ", "Antecedent to this, on ", "Chronologically prior, on ", "In the preceding entry on "
        ],
    },
    "latest_a": {
        "natural": [
            "Latest of all, on ", "The most recent one, on ", "Newest of all, on ", "The very latest from ",
            "Right at the end, on ", "The newest update on ", "Bringing it up to date on ", "Most recently, on "
        ],
        "professional": [
            "Most recently, as of ", "The most recent entry, dated ", "The latest entry, on ", "The final record, dated ",
            "Concluding the timeline on ", "The ultimate entry on ", "The latest available data, as of ", "Updating to the most recent record on "
        ],
    },
    "latest_b": {
        "natural": [
            "The freshest, from ", "The latest, from ", "Newest of all, from ", "The most recent update, from ",
            "The absolute newest, from ", "Bringing us to the present, from ", "The latest word, from "
        ],
        "professional": [
            "The most recent entry, from ", "The latest entry, from ", "The newest entry, from ", "The most current record, originating from ",
            "The concluding note, dated ", "The definitive recent entry, from ", "The latest documentation from "
        ],
    },
    "latest_c": {
        "natural": [
            "Up to ", "As things stood on ", "Right up until ", "As of ",
            "Where things left off on ", "The status as of ", "By the time of "
        ],
        "professional": [
            "As recorded on ", "Current as of ", "Effective until ", "As of the record dated ",
            "The status documented on ", "Reflecting the state as of ", "Until the point of "
        ],
    },
    "latest_undated": {
        "natural": [
            "The newest one: ", "The latest one: ", "The last one: ", "The freshest note: ",
            "The most recent update: ", "Here is the latest: ", "The newest thing saved: ", "The most current note: "
        ],
        "professional": [
            "The most recent entry: ", "The latest entry: ", "The newest entry: ", "The most current record: ",
            "The final documented point: ", "The most recent update available: ", "The latest recorded observation: "
        ],
    },
    "of_found": {
        "natural": [
            "Among the notes found, ", "Looking at the notes found, ", "Out of the notes I looked at, ",
            "From the notes I could find, ", "Of the ones retrieved, ", "Taking these notes, ",
            "Looking through this batch, ", "Of the relevant notes, "
        ],
        "professional": [
            "Of the notes retrieved, ", "Among the notes retrieved, ", "From the compiled entries, ",
            "Reviewing the retrieved documentation, ", "Out of the dataset evaluated, ", "Of the pertinent records, ",
            "Within the scope of the found notes, ", "Considering the recovered entries, "
        ],
    },
    "across_found": {
        "natural": [
            "Looking across the notes found, ", "Taking the notes found together, ", "If we look at all these notes, ",
            "Across the board in these notes, ", "Combining what I found, ", "Taking everything retrieved into account, ",
            "In summary of the found notes, ", "Across all the results, "
        ],
        "professional": [
            "Across the notes retrieved, ", "Taken together, the notes retrieved show that ", "A holistic view of the entries indicates ",
            "Aggregating the retrieved records, ", "Synthesizing the found notes, ", "Consolidating the data from the entries, ",
            "In aggregate, the documentation shows ", "Evaluating the records collectively, "
        ],
    },
    # Disagreement.
    "disagree_lead": {
        "natural": [
            "Your notes might not agree here. ", "Your notes may say different things here. ", "Careful, your notes may disagree here. ",
            "There's a bit of a contradiction in your notes here. ", "Watch out, your notes conflict on this. ",
            "It looks like you have conflicting notes on this. ", "Your notes don't completely align here. ",
            "Just a heads up, your notes differ here. "
        ],
        "professional": [
            "Your notes may conflict on this point. ", "There may be a discrepancy in your notes. ", "Your notes appear to differ here. ",
            "The records contain contradictory information. ", "A potential inconsistency exists in the documentation. ",
            "The entries do not appear to align on this matter. ", "Note a discrepancy within the records regarding this. ",
            "The documented evidence presents conflicting details. "
        ],
    },
    "but_newer": {
        "natural": [
            "Yet in a newer note", "Then again, in a newer note", "But looking at a newer note", "However, a more recent note says",
            "On the other hand, a newer note", "Although a fresher note says", "Conversely, a newer note", "Then a later note mentions"
        ],
        "professional": [
            "However, in a newer note", "By contrast, in a newer note", "Conversely, in a newer note", "A more recent entry, however, indicates",
            "Nevertheless, a subsequent record shows", "In a more recent document, however", "Notwithstanding, a newer entry", "A later file states"
        ],
    },
    "but_older": {
        "natural": [
            "Yet in an older note", "Then again, in an older note", "But looking at an older note", "However, a past note says",
            "On the other hand, an older note", "Although a prior note says", "Conversely, an older note", "Then an earlier note mentions"
        ],
        "professional": [
            "However, in an older note", "By contrast, in an older note", "Conversely, in an older note", "An earlier entry, however, indicates",
            "Nevertheless, a prior record shows", "In a preceding document, however", "Notwithstanding, an older entry", "An antecedent file states"
        ],
    },
    "but_other": {
        "natural": [
            "Yet in another note", "Then again, in another note", "But looking elsewhere", "However, a different note says",
            "On the other hand, another note", "Although a separate note says", "Conversely, a different note", "Then a separate entry mentions"
        ],
        "professional": [
            "However, in another note", "By contrast, in another note", "Conversely, in another note", "A separate entry, however, indicates",
            "Nevertheless, an alternative record shows", "In a distinct document, however", "Notwithstanding, another entry", "A separate file states"
        ],
    },
    "disagree_check": {
        "natural": [
            " They may disagree, so it is worth checking which is current.", " That may not match, so it is worth checking which is current.",
            " These could conflict, so check which one is current.", " Since they differ, you might want to see which is correct.",
            " It's worth verifying which one is right since they conflict.", " Because of this mismatch, you should check the latest status.",
            " You might want to double-check this discrepancy.", " Take a look to see which one still applies."
        ],
        "professional": [
            " These entries may conflict, so it is advisable to confirm which is current.", " These may be inconsistent, so please confirm which is current.",
            " The two may differ, so it is worth confirming which is current.", " Due to this discrepancy, verification of the current status is recommended.",
            " It is prudent to cross-reference these entries for accuracy.", " Resolution of this inconsistency is advised.",
            " Please verify the correct information, given the discrepancy.", " Confirmation of the accurate record is recommended."
        ],
    },
    # Lists and comparisons.
    "timeline": {
        "natural": [
            "Oldest first:", "Here they are, oldest first:", "In the order they were written:", "Going chronologically:",
            "From the beginning:", "Starting with the oldest:", "In timeline order:", "Here is the timeline:"
        ],
        "professional": [
            "In chronological order:", "Listed chronologically:", "In order of entry:", "Presented in chronological sequence:",
            "Ordered by date of entry:", "Sequenced chronologically:", "Following the timeline of records:", "Listed from earliest to latest:"
        ],
    },
    "each_side": {
        "natural": [
            "Here is what each one says.", "This is what each says.", "Here is each side.", "Looking at both:",
            "Here is the breakdown for each.", "This covers both of them.", "For each of them, here's the detail:", "Here is what we have for both."
        ],
        "professional": [
            "Each is set out below.", "Each side follows.", "The notes on each side follow.", "Details for each are provided below.",
            "The respective entries are as follows.", "Information pertaining to each follows.", "The documentation for both is detailed below.", "A breakdown of each is presented."
        ],
    },
    "side_none": {
        "natural": [
            "Nothing found is about this one by itself.", "Nothing here is only about this one.", "I didn't find anything specifically on this.",
            "There's no standalone note for this one.", "This one doesn't have its own specific mention.", "Nothing focuses solely on this.",
            "I have nothing on just this one alone.", "There isn't a note isolated to this."
        ],
        "professional": [
            "Nothing found addresses this side on its own.", "No entry found concerns this side alone.", "There is no isolated documentation for this subject.",
            "No specific record pertains solely to this.", "An exclusive entry for this was not retrieved.", "The records lack a standalone mention of this.",
            "No independent documentation is available for this.", "This topic lacks an isolated entry in the records."
        ],
    },
    "both": {
        "natural": [
            "Both at once", "Both in one place", "Combining both", "Looking at the two together",
            "Taking both into account", "For the two combined", "Together", "Both sides considered"
        ],
        "professional": [
            "Both combined", "Taken together", "In combination", "Evaluating both simultaneously",
            "Synthesizing both subjects", "Considered jointly", "When aggregated", "Viewed concurrently"
        ],
    },
    "missing": {
        "natural": [
            "None of these notes say anything about ", "These notes do not mention ", "I couldn't find any mention of ",
            "There's nothing in these notes regarding ", "None of the notes bring up ", "These don't talk about ",
            "No note seems to mention ", "I see no reference to "
        ],
        "professional": [
            "None of the notes found mention ", "No note found mentions ", "The notes found make no mention of ",
            "The retrieved documentation lacks any reference to ", "There is no recorded information regarding ", "The entries omit any discussion of ",
            "The provided records do not address ", "An absence of documentation was noted for "
        ],
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
        "natural": [
            "You wrote this on ", "Back on ", "On ", "Written on ", "Jotted down on ",
            "Saved on ", "Noted on ", "From "
        ],
        "professional": [
            "Recorded on ", "Dated ", "Entered on ", "As of ", "Documented on ",
            "Logged on ", "Filed on ", "Registered on "
        ],
    },
    "wrote_on_b": {
        "natural": [
            ": ", " you wrote: ", " you noted: ", " it says: ", " you recorded: ",
            " you mentioned: ", " you saved this: ", " you had this: "
        ],
        "professional": [
            ": ", ": ", ": ", ", your notes state: ", ", it is documented: ",
            ", the entry reads: ", ", the log indicates: ", ", the record shows: "
        ],
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
    
    # New massive expansion:
    r"^(?:quick question|i have a quick question)\b[,.:]?\s+(?=(?:what|when|where|who|why|how|is|are|do|does|did|can|could)\b)",
    r"^(?:do you know|would you know)\b[,.:]?\s+(?=(?:what|when|where|who|why|how)\b)",
    r"^(?:i )?(?:cant|cannot|can't) (?:remember|recall|think of)\b[,.:]?\s+(?=(?:what|when|where|who|why|how)\b)",
    r"^(?:by any chance)\b[,.:]?\s+(?=(?:do|does|did|is|are|was|were|can|could)\b)",
    r"^(?:let me ask you|let me ask)\b[,.:]?\s+",
    r"^(?:im not sure|i am not sure|i'm not sure)\b[,.:]?\s+(?=(?:if|whether|what|when|where|who|why|how)\b)",
    r"^(?:can you|could you|would you) (?:help me (?:with|remember)|refresh my memory (?:on|about)?)\b[,.:]?\s+",
    r"^(?:hey )?(?:bot|ai|assistant|computer)[,.:]?\s+",
    r"^(?:tell me|remind me) (?:again )?\b[,.:]?\s+(?=(?:what|when|where|who|why|how)\b)",
    r"^(?:can you|could you) (?:check|find) (?:my notes|the notes) (?:for|on)?\b[,.:]?\s+",
    r"^(?:what does it say|what do my notes say) (?:about|on|regarding)\b\s+",
    r"^(?:give me|show me) (?:the latest on|everything on|all notes on)\b\s+",
    r"^(?:pull up|bring up|search for) (?:my notes|the notes) (?:on|about)?\b\s+",
    r"^(?:any idea|any clue)\b\s+(?=(?:what|when|where|who|why|how|if)\b)",
    r"^(?:i was wondering|i am wondering)\b\s+(?=(?:what|when|where|who|why|how|if)\b)",
)

#: Closing phrases dropped after the question ("... if you can", "... thank you
#: in advance"): joined into the `_TRAILERS` pattern.
EXTRA_TRAILERS: tuple[str, ...] = (
    "if you can", "if possible", "if you could", "when you get a chance", "thanks in advance", "thank you in advance",
    "at your convenience", "kindly", "if that is ok", "if that's ok", "if you do not mind", "if you don't mind",
    "much appreciated", "appreciate it",
    "when you can", "whenever you can", "no rush", "no hurry", "just curious", "out of curiosity", "for reference",
    "for the record", "thanks a lot", "many thanks", "thanks so much",
    
    # New massive expansion:
    "if you wouldn't mind", "if you wouldnt mind", "please and thank you", "pls and ty", "pretty please",
    "when you have a sec", "when you have a second", "when you have a minute", "when you have time",
    "if it's not too much trouble", "if its not too much trouble", "if it is not too much trouble",
    "if it's easy", "if its easy", "if that's alright", "if that is alright",
    "i'd appreciate it", "id appreciate it", "i would appreciate it", "thank you", "thanks", "ty", "tysm",
    "just wondering", "just asking", "just so i know", "just so I know",
    "as soon as you can", "whenever you're ready", "whenever youre ready",
    "if you don't mind me asking", "if you do not mind me asking", "por favor",
    "if you'd be so kind", "if you would be so kind", "if you wouldn't mind looking", "if you wouldnt mind looking",
    "if you can find it", "if you could find it", "if you manage to find it"
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
    
    # New massive expansion:
    "important note", "quick update", "just an update", "update", "memo to self", "note to self",
    "reminder", "just a reminder", "quick reminder", "brief note", "small reminder",
    "to recap", "recap", "tl;dr", "tldr", "long story short", "the bottom line is", "bottom line",
    "key takeaway", "takeaway", "in a nutshell", "simply put", "to cut a long story short",
    "by the way", "btw", "oh and", "oh, and", "also", "and another thing", "moving on",
    "on a related note", "speaking of which", "incidentally", "as an aside",
    "for what it's worth", "fwiw", "to be honest", "tbh", "to be fair", "tbf", "not gonna lie", "ngl",
    "at the end of the day", "basically", "essentially", "fundamentally", "ultimately",
    "anyway", "anyhow", "regardless", "nevertheless", "that being said", "having said that",
    "on second thought", "wait", "hold on", "actually, scratch that", "scratch that",
    "so", "well", "okay", "ok", "right", "sure", "listen", "look", "see",
    "guess what", "fun fact", "believe it or not", "you know what",
    "just to clarify", "to be clear", "for clarity", "let me clarify", "just making sure",
    "as expected", "no surprise", "unsurprisingly", "naturally", "obviously", "clearly"
)

# --- small talk ---------------------------------------------------------------------

#: More natural lines per kind of turn, appended to `composer.SOCIAL`.
SOCIAL_NATURAL_EXTRA: dict[str, tuple[str, ...]] = {
    "greeting": (
        "Hey. What can I find for you?",
        "Hi again. Ask me anything about your notes.",
        "Hello. Your notes are all here, so ask away.",
        "Hey there. Want to look something up?",
        "Hi! What are we looking for today?",
        "Hello again! Need me to find something?",
        "Hey, I'm ready. What's on your mind?",
        "Hi there. How can I help with your notes?"
    ),
    "morning": (
        "Good morning. What would you like to check first?",
        "Morning. Ask me about anything you wrote down.",
        "Good morning. Your notes are all here.",
        "Morning! Ready to dig into your notes?",
        "Good morning to you. What should we look up?",
        "Morning! Let me know what you need from your records.",
        "Good morning. I'm ready when you are.",
        "Morning. Let's find what you're looking for."
    ),
    "compliment": (
        "Aw, thanks! What can I look up for you next?",
        "I try my best! Anything else to check?",
        "Thanks! Ask away when you're ready.",
        "That's very kind. What's next on the agenda?",
        "I appreciate it! Anything else I can find?",
        "Glad I could help. Want me to dig up anything else?",
        "You're too kind. What else can we find in your notes?",
        "Thank you! Ready for the next question whenever you are."
    ),
    "insult": (
        "Ouch, sorry about that. Try asking it another way?",
        "My bad! I'll try to do better. What should we look up?",
        "Sorry! Let's try again. What are we looking for?",
        "Ah, my mistake. Let me try again if you can rephrase that?",
        "Apologies. I'm just a simple bot, but if you say it differently I might get it.",
        "Sorry to let you down. How about we try searching another way?",
        "I'll take the hit. What should we look for instead?",
        "My apologies. Let's see if we can get it right this time."
    ),
    "emotion": (
        "I hear you. Take your time. What can I help you find?",
        "Got it. I'm here when you're ready to check your notes.",
        "That's completely understandable. Let me know what you want to look up.",
        "I'm sorry to hear that. Whenever you're ready, I'm here.",
        "Take a breath. Let me know when you need to search for something.",
        "I understand. Let's focus on what we can find in your notes.",
        "It happens to the best of us. What can I look up for you?",
        "I've got you covered. What do you need from your notes?"
    ),
    "thanks": (
        "No problem. Ask again whenever you like.",
        "Glad to help.",
        "You are most welcome. Anything else to look up?",
        "Any time. Let me know if you need anything else.",
        "Happy to assist. What's next?",
        "You bet. What else can I find?",
        "Of course! Anything more you want to check?",
        "Not a problem. Ask away."
    ),
    "how": (
        "Good, thanks. What would you like to find?",
        "All well here. Anything you want to check in your notes?",
        "Doing fine. What can I look up for you?",
        "I'm doing great, thanks for asking! What should we search for?",
        "Everything's running smoothly here. What's on your mind?",
        "I'm well. Let's dive into your notes.",
        "Doing good! Ready to find whatever you need.",
        "I'm fine. What would you like to review?"
    ),
    "bye": (
        "Goodbye for now. Your notes are saved.",
        "Talk soon. Everything you wrote is here.",
        "See you next time.",
        "Catch you later. Your notes will be right here.",
        "Bye! Come back whenever you need to check something.",
        "Take care! Your notes aren't going anywhere.",
        "Until next time. Have a good one.",
        "Goodbye! I'll be here if you need me."
    ),
    "sorry": (
        "That is fine. What would you like to look up?",
        "No harm done. Ask it again and I will have another look.",
        "Nothing to apologise for. What next?",
        "It's all good. Let's try again.",
        "Don't worry about it. What can I find for you?",
        "No worries at all. What should we search for?",
        "It's fine, really. Let me know what you need.",
        "All good! Let's move on to the next search."
    ),
    "laugh": (
        "Ha, good. What would you like to find next?",
        "Glad that landed. Anything else to look up?",
        "Nice. Ask me whenever you are ready.",
        "Haha, right? Anyway, what's next?",
        "Glad you're amused! What should we look at now?",
        "Heh. Let me know if you need me to find anything else.",
        "Always good for a laugh. Ready for the next question?",
        "Funny stuff. What else is in your notes?"
    ),
    "reaction": (
        "Right. Want me to look anything up about it?",
        "Fair enough. Shall I find something else?",
        "I hear you. What next?",
        "Indeed. Anything else you want me to search?",
        "Totally. Want to check anything else?",
        "Yep. What else can I dig up?",
        "I know, right? What should we look for next?",
        "Makes sense. Need me to find anything else?"
    ),
    "confused": (
        "Sorry about that. Try asking it in different words, or name the note you mean.",
        "That was unclear. Say it another way and I will look again.",
        "Let me try again. Which part would you like me to look at?",
        "I didn't quite catch that. Could you phrase it differently?",
        "I'm a bit lost. Can you try asking in another way?",
        "Hmm, I didn't get that. Maybe try using the exact note title?",
        "I'm not sure I understand. Could you rephrase?",
        "I might have misunderstood. Mind saying that a different way?"
    ),
    "ack": (
        "Sure. Ask when you are ready.",
        "Understood. What next?",
        "Right. Anything else to look up?",
        "Got it. What else?",
        "Okay. Let me know what you need.",
        "Acknowledged. Ready when you are.",
        "Alright. What should we look for now?",
        "Will do. Any other questions?"
    ),
    "who": (
        "I am your notebook's assistant. I find things in your notes and say what they say.",
        "I answer questions from your notes. Ask me when something is, or what you decided.",
        "I'm your assistant for searching notes. Ask me a question and I'll find the answer in your records.",
        "I help you search your notes. Try asking me about something you've written down."
    ),
    "about_app": (
        "Ask me when something is, who said what, how a project stands or what the latest is, and I will answer "
        "from your notes in their own words. Connecting a model adds writing and tools.",
        "I'm designed to retrieve answers directly from your notes. Ask me anything you've recorded, and I'll find it.",
        "I answer questions based solely on what you've jotted down. Ask about a date, a task, or a past decision."
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
    "If you want, I can dig deeper into “{subject}”.",
    "Let me know if you want the full history of “{subject}”.",
    "Say “tell me everything” and I'll find all mentions of “{subject}”.",
    "I can check if there's anything else about “{subject}”.",
    "Would you like me to find related notes for “{subject}”?",
    "Need me to summarize your notes on “{subject}”?",
    "I can also check when “{subject}” first came up.",
    "Say the word and I'll list everything else you wrote on “{subject}”.",
    "Want to review the other notes about “{subject}”?",
    "Should I keep looking for more about “{subject}”?"
)
NEXT_STEPS_PROFESSIONAL: tuple[str, ...] = (
    "I can provide further detail on “{subject}” if required.",
    "Say “tell me more” for additional detail on “{subject}”.",
    "I can also retrieve the latest entry on “{subject}”.",
    "Please ask if you would like the dates recorded for “{subject}”.",
    "I can review the remaining entries on “{subject}” on request.",
    "Would you like the most recent update on “{subject}”?",
    "Further documentation on “{subject}” is available if needed.",
    "I can compile a comprehensive history of “{subject}” for you.",
    "If necessary, I can retrieve all recorded instances of “{subject}”.",
    "Say the word and I will cross-reference entries on “{subject}”.",
    "Should you require it, I can locate earlier records of “{subject}”.",
    "Additional notes concerning “{subject}” can be supplied upon request.",
    "I am able to extract further specifics regarding “{subject}”.",
    "Please advise if you need the full context for “{subject}”.",
    "I can append subsequent findings on “{subject}” if you wish."
)
