"""Generate the Phase 6 eval fixtures (CHAT_PLAN decision 40) into tests/fixtures/composer/.

Rows are built from fixed tables with a fixed seed; every expected value is
worked out here from the row itself (dates, counts, which page holds the
answer), never by running the engine. Run from anywhere:
`python scripts/phase6_fixtures.py`; the floors are in
`tests/test_engine_evals_1010.py`."""
import json
import random
from datetime import date, timedelta
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "composer"
TODAY = date(2026, 10, 6)
MONTHS = "January February March April May June July August September October November December".split()
rng = random.Random(1010)


def day_words(d):
    return f"{d.day} {MONTHS[d.month - 1]}" if d.year == TODAY.year else f"{d.day} {MONTHS[d.month - 1]} {d.year}"


# --- insights -----------------------------------------------------------------
SUBJECTS = [
    ("chess", "Chess club {w}: {x}.", True), ("pottery", "Pottery class {w}, a {x} bowl.", True),
    ("boiler", "The boiler pressure dropped to {x} again.", False), ("piano", "Piano practice {w}, scales in {x}.", True),
    ("cycling", "Cycling session {w}, {x} km along the canal.", True), ("sourdough", "Sourdough loaf {x}, a slow rise overnight.", False),
    ("climbing", "Climbing at the wall {w}, a {x} route.", True), ("spanish", "Spanish lesson {w}: {x} new verbs.", True),
    ("garden", "The garden needs {x} more bags of compost.", False), ("budget", "The budget review found {x} cuts.", False),
    ("swimming", "Swimming {w}, {x} lengths.", True), ("roof", "The roof leak came back over the {x} window.", False),
    ("sketching", "Sketching {w}, {x} pages of hands.", True), ("tennis", "Tennis {w}, lost {x} games.", True),
    ("printer", "The printer jammed {x} times today.", False), ("guitar", "Guitar practice {w}, {x} chords.", True),
    ("yoga", "Yoga class {w}, {x} minutes of holds.", True), ("invoice", "The invoice for {x} is still unpaid.", False),
    ("rowing", "Rowing session {w}, {x} km.", True), ("car", "The car made the {x} noise again.", False),
    ("knitting", "Knitting {w}, {x} rows of the scarf.", True), ("hiking", "Hiking {w}, {x} km of ridge.", True),
    ("insurance", "The insurance quote was {x} pounds.", False), ("baking", "Baking {w}, {x} scones.", True),
]
rows = []
for i, (subject, line, leisure) in enumerate(SUBJECTS):
    n = 3 + i % 4
    gap = 7 + (i % 3) * 3
    start = TODAY - timedelta(days=gap * (n - 1) + 2 + i % 5)
    after = i % 2 == 0 and leisure
    notes = []
    for k in range(n):
        d = start + timedelta(days=gap * k)
        when = "after work" if after else "on the weekend"
        body = line.format(w=when, x=k + 3)
        notes.append({"id": 100 * i + k + 1, "content": f"# {subject.capitalize()} {k + 1}\n\n{body}", "created_at": d.isoformat()})
    rows.append({
        "id": f"recurrence-{i + 1:02d}", "rule": "recurrence", "question": f"tell me about {subject}", "subject": subject,
        "notes": notes, "positive": True,
        "expect": {"count": n, "since": day_words(start), "after": n if after else 0,
                   "hedge": "that may be a hobby forming" if leisure else "that keeps coming up"},
    })
for i, subject in enumerate(("running", "reading", "journaling")):
    notes = [{"id": 5000 + 10 * i + k, "content": f"# {subject.capitalize()} week {k + 1}\n\nA steady week of {subject}.",
              "created_at": (TODAY - timedelta(days=1 + 7 * (2 - k))).isoformat()} for k in range(3)]
    rows.append({"id": f"streak-{i + 1}", "rule": "streak", "question": f"any patterns in my {subject} notes", "subject": subject,
                 "notes": notes, "positive": True, "expect": {"weeks": 3}})
for i, (plan, words) in enumerate((("repaint the shed fence", "fence"), ("book a dentist check", "dentist"), ("sell the old bike", "bike"))):
    written = TODAY - timedelta(days=40 + 5 * i)
    notes = [{"id": 6000 + i, "content": f"# Plans\n\nI plan to {plan}.", "created_at": written.isoformat()},
             {"id": 6100 + i, "content": "# Groceries\n\nMilk, eggs and rice.", "created_at": (TODAY - timedelta(days=3)).isoformat()}]
    rows.append({"id": f"drift-{i + 1}", "rule": "drift", "question": "what patterns do you see", "subject": words,
                 "notes": notes, "positive": True, "expect": {"plan": f"plan to {plan}", "since": day_words(written)}})
NEG = [("two notes", 2, 9), ("two notes", 2, 20), ("two notes", 2, 30), ("two notes", 2, 5), ("one week", 3, 1), ("one week", 3, 2),
       ("one week", 4, 1), ("two weeks", 3, 4), ("two weeks", 3, 5)]
for i, (why, n, gap) in enumerate(NEG):
    subject = ["kayak", "violin", "drone", "orchid", "darts", "fencing", "origami", "bonsai", "archery"][i]
    start = date(2026, 9, 7)  # a Monday, so "one week" rows share it
    notes = [{"id": 7000 + 10 * i + k, "content": f"# {subject.capitalize()} {k + 1}\n\n{subject.capitalize()} after work, a good session.",
              "created_at": (start + timedelta(days=gap * k)).isoformat()} for k in range(n)]
    rows.append({"id": f"negative-{i + 1:02d}", "rule": "none", "why": why, "question": f"tell me about {subject}", "subject": subject,
                 "notes": notes, "positive": False, "expect": None})
rows.append({"id": "negative-10", "rule": "none", "why": "subject absent", "question": "tell me about falconry", "subject": "falconry",
             "notes": rows[0]["notes"], "positive": False, "expect": None})
(OUT / "insights_1010.json").write_text(json.dumps({"today": TODAY.isoformat(), "rows": rows}, indent=1, ensure_ascii=False) + "\n")

# --- dialogues ------------------------------------------------------------------
show = json.loads((OUT / "showcase_725.json").read_text())
questions = [q["question"] for q in show["questions"]]
SUBJECT_SWAPS = ["running", "sourdough", "the boiler", "Lisbon", "pricing", "the dentist", "knives", "the garden"]
TERSE = [("tell me more", "more", "ellipsis"), ("why?", "why", "ellipsis"), ("and last week?", "window", "ellipsis"),
         ("shorter", "length", "control"), ("longer", "length", "control"), ("ty", None, "social"), ("ok", None, "social")]
dialogues = []
for d in range(30):
    turns = []
    base = rng.randrange(len(questions))
    turns.append({"text": questions[base], "base": base, "kind": None, "effect": "none"})
    last_base = 0
    while len(turns) < 20:
        roll = rng.random()
        if roll < 0.3:
            base = rng.randrange(len(questions))
            last_base = len(turns)
            turns.append({"text": questions[base], "base": base, "kind": None, "effect": "none"})
        elif roll < 0.45:
            swap = rng.choice(SUBJECT_SWAPS)
            #: After a question with no subject ("What did I write recently?")
            #: "what about X?" is a question of its own (composer.follow_on).
            if show["questions"][base]["search_mode"] == "recent" and not any(t["text"].startswith("what about") for t in turns[last_base:]):
                turns.append({"text": f"what about {swap}?", "base": base, "kind": None, "effect": "none"})
            else:
                turns.append({"text": f"what about {swap}?", "base": base, "kind": "entity" if swap[:1].isupper() else "subject", "effect": "reference"})
        elif roll < 0.55:
            word = rng.choice(["the gym", "the boiler", "the dentist", "the running", "the launch"])
            turns.append({"text": f"no, {word} one", "base": base, "kind": "correction", "effect": "correction"})
        else:
            text, kind, effect = rng.choice(TERSE)
            turns.append({"text": text, "base": base, "kind": kind, "effect": effect})
    dialogues.append({"id": f"dialogue-{d + 1:02d}", "turns": turns})
(OUT / "dialogues_1010.json").write_text(json.dumps({"today": show["today"], "dialogues": dialogues}, indent=1, ensure_ascii=False) + "\n")

# --- acts ---------------------------------------------------------------------------
ACTS = [
    ("remind me to call the plumber on Friday", "remind", "call the plumber", False),
    ("remind me to renew the passport tomorrow", "remind", "renew the passport", False),
    ("set a reminder to water the plants tonight", "remind", "water the plants", False),
    ("remind me in 2 hours to check the oven", "remind", "check the oven", False),
    ("please remind me to email Priya next Monday", "remind", "email Priya", False),
    ("delete the boiler note", "delete", "boiler", True),
    #: The engine probe's P14 phrases (engine-probe-1010.md).
    ("remind me about the dentist tomorrow", "remind", "the dentist", False),
    ("move the sourdough note to Cooking", "file", "sourdough", True),
    ("tag the knife note with kitchen", "tag", "knife", True),
    ("bin the old pricing note", "delete", "old pricing", True),
    ("trash my wifi password note", "delete", "wifi password", True),
    ("pin the dentist note", "pin", "dentist", False),
    ("unpin the dentist note", "unpin", "dentist", False),
    ("tag my notes about Lisbon with travel", "tag", "Lisbon", True),
    ("tag these notes trip", "tag", "these notes", True),
    ("remove the tag urgent from this note", "untag", "these notes", True),
    ("move my notes about the plumber to Home", "file", "plumber", True),
    ("file the note about taxes under Finance", "file", "taxes", True),
    ("put this note in Projects", "file", "these notes", True),
    ("link the gym note to the running note", "link", "gym", True),
    ("unlink the gym note from the running note", "unlink", "gym", True),
    ("rename the gym note to Strength plan", "rename", "gym", True),
    ("add buy chalk to the gym note", "add", "Buy chalk", True),
    ("note: buy milk and eggs", "create", "Buy milk and eggs", False),
    ("make a note that the boiler code is 4471", "create", "The boiler code is 4471", False),
    ("jot down call the bank about the card", "create", "Call the bank about the card", False),
    ("start a meeting about the budget", "create", "Budget", False),
    ("find my note about the passport", "find", "passport", False),
    ("search for tax receipts", "find", "tax receipts", False),
    ("open the note about the boiler", "open", "boiler", False),
    ("open settings", "open", "settings", False),
    ("go to the graph", "open", "graph", False),
    ("summarise my gym notes", "summarise", "gym", False),
]
LOOKALIKES = ["how do I delete a note?", "did I pin the dentist note?", "can I rename a tag?", "should I link these notes",
              "what did I tag as travel?", "when is my reminder for the plumber?", "where did I file the tax note?",
              "archive the gym note", "delete the tag urgent", "remind me what I wrote about Friday"]
(OUT / "acts_1010.json").write_text(json.dumps({
    "now": "2026-10-06T10:00:00",
    "acts": [{"phrase": p, "verb": v, "object": o, "confirm": c} for p, v, o, c in ACTS],
    "lookalikes": LOOKALIKES,
}, indent=1, ensure_ascii=False) + "\n")

# --- web --------------------------------------------------------------------------------
TOPICS = [
    ("spring tides", "tides", "Spring tides come at new and full moon, when the sun and moon pull in line."),
    ("a leap year", "calendar", "A leap year has 366 days, with the extra day added to February."),
    ("the boiling point of water", "water", "Water boils at 100 degrees Celsius at sea level."),
    ("the speed of sound", "sound", "Sound travels at about 343 metres a second in air at room temperature."),
    ("the tallest mountain", "mountains", "Everest is the tallest mountain above sea level, at 8,849 metres."),
    ("photosynthesis", "plants", "Photosynthesis turns light, water and carbon dioxide into sugar and oxygen."),
    ("a sourdough starter", "baking", "A sourdough starter is flour and water fermented by wild yeast and bacteria."),
    ("the Mohs scale", "minerals", "The Mohs scale ranks minerals by hardness, from talc at 1 to diamond at 10."),
    ("a haiku", "poetry", "A haiku has three lines of five, seven and five syllables."),
    ("the Rosetta Stone", "history", "The Rosetta Stone carries one decree in three scripts, which unlocked hieroglyphs."),
    ("a solar eclipse", "astronomy", "A solar eclipse happens when the moon passes between the sun and the earth."),
    ("the Fibonacci sequence", "maths", "Each Fibonacci number is the sum of the two before it."),
    ("a carbon footprint", "climate", "A carbon footprint is the greenhouse gas a person or thing causes, in tonnes."),
    ("compound interest", "money", "Compound interest is interest earned on earlier interest as well as on the sum."),
    ("the Doppler effect", "physics", "The Doppler effect is the change in pitch as a source moves toward or away from you."),
    ("a sonnet", "poetry", "A sonnet is a poem of fourteen lines, often in iambic pentameter."),
    ("the human heart", "biology", "The human heart has four chambers: two atria and two ventricles."),
    ("a black hole", "astronomy", "A black hole is a region where gravity is so strong that light cannot escape."),
    ("the Pareto principle", "work", "The Pareto principle says about 80 percent of effects come from 20 percent of causes."),
    ("a palindrome", "words", "A palindrome reads the same backward as forward, like level or racecar."),
]
web = []
for i, (thing, slug, answer) in enumerate(TOPICS):
    other = TOPICS[(i + 7) % len(TOPICS)]
    pages = [
        {"url": f"https://example.org/{slug}/{i}", "title": f"About {thing}", "text": f"{answer} It is a common question in school."},
        {"url": f"https://example.net/{other[1]}/{i}", "title": f"About {other[0]}", "text": other[2]},
    ]
    web.append({"id": f"web-{i + 1:02d}", "question": f"what is {thing}", "pages": pages, "answer_url": pages[0]["url"], "answer_sentence": answer})
(OUT / "web_1010.json").write_text(json.dumps({"today": TODAY.isoformat(), "rows": web}, indent=1, ensure_ascii=False) + "\n")

# --- sources ------------------------------------------------------------------------------
KINDS = [("note", None), ("board", "board"), ("map", "map"), ("document", "document"), ("caption", None)]
FACTS = [("the shed roof", "The shed roof is made of cedar shingles."), ("the launch date", "The launch date moved to the 14th of November."),
         ("the wifi password", "The wifi password is on the router label."), ("the pottery kiln", "The pottery kiln fires at 1240 degrees."),
         ("the bike lock", "The bike lock code is 4471."), ("the guest list", "The guest list has 28 names on it.")]
sources = []
for i in range(30):
    kind, row_kind = KINDS[i % 5]
    subject, fact = FACTS[i % 6]
    noise = {"id": 9000 + i, "content": f"# Errands {i}\n\nPick up the parcel and post the letter.", "created_at": "2026-10-01"}
    if kind == "caption":
        target = {"id": 9100 + i, "content": f"# Photos {i}\n\n- photo{i}.jpg: shows {fact[0].lower() + fact[1:].rstrip('.')}", "created_at": "2026-10-02"}
    elif kind == "note":
        target = {"id": 9100 + i, "content": f"# Notes {i}\n\n{fact}", "created_at": "2026-10-02"}
    else:
        target = {"id": 9100 + i, "content": f"Sources {i}\n\n{fact}", "kind": row_kind, "created_at": "2026-10-02"}
    sources.append({"id": f"source-{i + 1:02d}", "question": f"what about {subject}", "sources": [noise, target],
                    "expect": {"kind": "note" if kind == "caption" else kind, "id": target["id"], "said": "picture" if kind == "caption" else "quoted"}})
(OUT / "sources_1010.json").write_text(json.dumps({"today": TODAY.isoformat(), "rows": sources}, indent=1, ensure_ascii=False) + "\n")
print("ok", len(rows), len(dialogues), len(ACTS) + len(LOOKALIKES), len(web), len(sources))
