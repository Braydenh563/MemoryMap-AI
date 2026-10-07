"""The composed answer's eval (INBOX 725): 25 questions over the showcase notebook.

Not a test module (no `test_` prefix): `tests/test_composer_eval_725.py` holds
the gates and `python -m tests._composer_eval` prints the table the report
quotes. The fixture, `fixtures/composer/showcase_725.json`, is the notebook
`scratchpad/ui-sweeps/seed-showcase.py` writes, read back from its database,
with the notes `/chat/stream` retrieved for each question on that notebook
(ranked, the connected ones marked), so the eval runs the composer on what
the route hands it, deterministically and with no server and no network.

Four measures, each a number:

- **grounded**: the share of an answer's factual parts (quotes, note names,
  measured values, words of the question) that trace back to the notes or the
  question. The rule says 1.0, always.
- **redundancy**: the most two quoted sentences of one answer share (token
  Jaccard over stems). A chat answer does not say a thing twice.
- **readability**: mean words per sentence of the answer as read (markdown
  marks off), and how many different joining phrases it uses.
- **first line**: whether the answer's first line answers the question's
  shape on its own: a figure for a count, a date for a when, the newest day
  and its words for a status, a quote for everything else, a measured count
  or the list for a list.
"""

from __future__ import annotations

import json
import re
from datetime import date
from pathlib import Path

from memorymap.ai import composer

FIXTURE = Path(__file__).parent / "fixtures" / "composer" / "showcase_725.json"

#: Spelled by its code point: the lint reads this file too.
EM_DASH = chr(0x2014)


def load() -> dict:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def today(data: dict | None = None) -> date:
    return date.fromisoformat((data or load())["today"])


def notes_for(entry: dict, data: dict) -> list[dict]:
    """The notes the route handed the composer for this question, ranked."""
    by_id = {note["id"]: note for note in data["notes"]}
    connected = set(entry.get("connected") or [])
    return [{**by_id[i], "connected": i in connected} for i in entry["notes"] if i in by_id]


def _flat(text: str) -> str:
    return " ".join(text.split())


def _count_word(n: int) -> str:
    words = composer._NUMBER_WORDS
    return words[n] if 0 <= n < len(words) else str(n)


def measured_values(notes: list[dict], on: date) -> set[str]:
    """Every value the app could have measured over these notes: counts (as
    digits and as words) up to the most units any one note holds, and every
    note's day, worded as `_Answer.day` words it."""
    most = max([len(notes)] + [len(composer.read_note(n, 0).sentences) for n in notes if composer.read_note(n, 0)])
    values = {str(n) for n in range(most + 1)}
    values |= {_count_word(n) for n in range(most + 1)}
    values |= {_count_word(n).capitalize() for n in range(most + 1)}
    for note in notes:
        day = date.fromisoformat(str(note["created_at"])[:10])
        month = composer._MONTHS[day.month - 1]
        values |= {f"{day.day} {month}", f"{day.day} {month} {day.year}"}
        if day == on:
            values.add("today")
        if (on - day).days == 1:
            values.add("yesterday")
    return values


def _in_note(text: str, content: str) -> bool:
    """A quote as the composer may lightly trim it: the first letter raised
    or lowered, a final stop or an ellipsis off."""
    body = text.rstrip("…").rstrip(".")
    if not body:
        return False
    flat = _flat(content)
    return body[1:] in flat and (body in flat or body[0].lower() + body[1:] in flat or body[0].upper() + body[1:] in flat)


def trace_failures(result: dict, question: str, notes: list[dict], on: date, asked_from: str = "") -> list[str]:
    """Every part of the answer that is not what it says it is: a template not
    in `PHRASES`, a quote not in the note it names, a measured value nothing
    measured. Empty for an answer that keeps the rule. `asked_from` is any
    earlier question a follow-up was resolved against: its words are the
    person's too."""
    by_id = {note["id"]: note for note in notes}
    failures: list[str] = []
    parts = result["parts"]
    if "".join(part[1] for part in parts) != result["text"]:
        failures.append("the parts are not the whole text")
    templates = set(composer.PHRASES.values())
    measured = measured_values(notes, on) if notes else set()
    for part in parts:
        kind, text = part[0], part[1]
        if kind == "template":
            if text not in templates:
                failures.append(f"not a fixed phrase: {text!r}")
        elif kind in ("quote", "picture"):
            if not _in_note(text, by_id[part[2]]["content"]):
                failures.append(f"{kind} not in note {part[2]}: {text!r}")
        elif kind == "title":
            first = re.sub(r"[*_`#]", "", by_id[part[2]]["content"].split("\n", 1)[0]).strip()
            if not first.startswith(text.rstrip("…")):
                failures.append(f"not note {part[2]}'s name: {text!r}")
        elif kind == "filed":
            note = by_id[part[2]]
            filed = [str(t).lower() for t in note.get("tags") or []] + [str(note.get("category") or "").lower()]
            if text.lower() not in filed:
                failures.append(f"not a tag of note {part[2]}: {text!r}")
        elif kind == "measure":
            if text not in measured:
                failures.append(f"not a measured value: {text!r}")
        elif kind == "asked":
            if text.lower() not in f"{question} {asked_from}".lower():
                failures.append(f"not from the question: {text!r}")
        else:
            failures.append(f"unknown part kind {kind!r}")
    for row in result["grounding"]:
        content = by_id[row["note_id"]]["content"]
        span = _flat(content[row["start"]:row["end"]])
        body = row["sentence"].rstrip("…").rstrip(".")
        if not (span[:1].lower() == body[:1].lower() and span[1:].startswith(body[1:])):
            failures.append(f"row {row['sentence']!r} does not point at its own text: {span!r}")
        if row["sentence"] not in result["text"]:
            failures.append(f"row {row['sentence']!r} is not in the answer")
    if EM_DASH in result["text"] or "!" in result["text"].replace("![", ""):
        failures.append("an em-dash or an exclamation mark")
    return failures


def _factual_parts(result: dict) -> int:
    return sum(1 for part in result["parts"] if part[0] != "template")


def redundancy(result: dict) -> float:
    """The most two quoted sentences in one answer share, token Jaccard."""
    quotes = list(dict.fromkeys(part[1] for part in result["parts"] if part[0] in ("quote", "picture")))
    words = [set(composer._words(q)) for q in quotes]
    best = 0.0
    for i, a in enumerate(words):
        for b in words[i + 1:]:
            if a and b:
                best = max(best, len(a & b) / len(a | b))
    return best


_MARKDOWN = re.compile(r"\*\*|^> |^- \[[ x]\] |^- ", re.M)
_SENTENCE_END = re.compile(r"(?<=[.?:])\s+|\n+")


def sentence_lengths(text: str) -> list[int]:
    plain = _MARKDOWN.sub("", text)
    return [len(s.split()) for s in _SENTENCE_END.split(plain) if s.strip()]


def connectives(result: dict) -> set[str]:
    """The joining phrases an answer used: the templates with a word in them."""
    names = {value: key for key, value in composer.PHRASES.items()}
    return {names[p[1]] for p in result["parts"] if p[0] == "template" and re.search(r"[A-Za-z]", p[1])}


_FIGURE = re.compile(r"\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|half)\b", re.I)


def first_line(result: dict) -> list[tuple]:
    """The parts of the answer's first line."""
    out: list[tuple] = []
    for part in result["parts"]:
        if "\n" in part[1]:
            break
        out.append(part)
    return out


def answers_shape(result: dict, shape: str) -> bool:
    """Whether the first line answers the question's shape on its own."""
    line = first_line(result)
    if not line:
        return False
    text = "".join(p[1] for p in line)
    quoted = " ".join(p[1] for p in line if p[0] in ("quote", "picture"))
    measures = [p[1] for p in line if p[0] == "measure"]
    dated = any(re.search(r"\d+ [A-Z][a-z]+|today|yesterday", m) for m in measures)
    if text.rstrip().endswith(":") and not quoted and shape not in ("list", "compare", "recent"):
        #: A list the person wrote, introduced by its count ("Your note
        #: **Launch risks** lists three:") with its entries on the lines
        #: below, is the list answer's own layout, whatever was asked.
        return bool(measures) and any(p[0] == "quote" for p in result["parts"][len(line):len(line) + 4])
    if shape == "count":
        return bool(_FIGURE.search(quoted))
    if shape == "when":
        return bool(composer._DATE_CUE.search(quoted)) or (dated and bool(quoted))
    if shape == "status":
        return dated and bool(quoted)
    if shape in ("list", "compare", "recent"):
        return bool(measures) or bool(quoted)
    return bool(quoted)


def run(data: dict | None = None) -> list[dict]:
    """Every question composed, with its measures."""
    data = data or load()
    on = today(data)
    rows = []
    for entry in data["questions"]:
        notes = notes_for(entry, data)
        recent = str(entry.get("search_mode") or "").endswith("recent")
        result = composer.compose(entry["question"], notes, today=on, recent=recent)
        factual = _factual_parts(result)
        failures = trace_failures(result, entry["question"], notes, on)
        lengths = sentence_lengths(result["text"])
        rows.append(
            {
                "question": entry["question"],
                "shape": result["shape"],
                "text": result["text"],
                "result": result,
                "failures": failures,
                "grounded": 1.0 if not factual else (factual - len([f for f in failures if "row" not in f])) / factual,
                "redundancy": redundancy(result),
                "mean_sentence": sum(lengths) / len(lengths) if lengths else 0.0,
                "connectives": connectives(result),
                "first_line": answers_shape(result, result["shape"]),
                "words": len(result["text"].split()),
                "cited": len({row["note_id"] for row in result["grounding"]}),
            }
        )
    return rows


#: The phrases that join or open: the ones a reader hears as a template when
#: they come twice in one answer (INBOX 741, the owner: "ur note starting
#: with this says this. also ur not starting with this says this").
JOINERS = ("and_join", "on_top", "separately", "elsewhere", "another_note", "later_on", "then_on", "before_that",
           "earlier_on", "and_on", "latest_a", "latest_b", "latest_c", "going_by", "notes_have",
           "open_notes", "open_wrote", "open_put", "open_figure", "open_date", "closest_a", "closest_b")


def lead_in_repeats(result: dict) -> int:
    """How many joining or opening phrases come more than once in an answer."""
    joiners = {composer.PHRASES[k] for k in JOINERS}
    used = [p[1] for p in result["parts"] if p[0] == "template" and p[1] in joiners]
    return len(used) - len(set(used))


def opener(result: dict) -> str:
    """How the answer starts: its first worded phrase, or "(quote)" when it
    starts with the person's own sentence."""
    for part in result["parts"]:
        if part[0] != "template":
            return f"({part[0]})"
        if re.search(r"[A-Za-z]", part[1]):
            return part[1]
    return ""


def summary(rows: list[dict]) -> dict:
    n = len(rows)
    return {
        "questions": n,
        "grounded": min(r["grounded"] for r in rows),
        "redundancy_mean": round(sum(r["redundancy"] for r in rows) / n, 3),
        "redundancy_max": round(max(r["redundancy"] for r in rows), 3),
        "mean_sentence_words": round(sum(r["mean_sentence"] for r in rows) / n, 1),
        "connectives_per_answer": round(sum(len(r["connectives"]) for r in rows) / n, 2),
        "connectives_distinct": len(set().union(*(r["connectives"] for r in rows))),
        "first_line_answers": sum(1 for r in rows if r["first_line"]),
        "words_mean": round(sum(r["words"] for r in rows) / n, 1),
        "notes_cited_mean": round(sum(r["cited"] for r in rows) / n, 2),
        "lead_in_repeats": sum(1 for r in rows if lead_in_repeats(r["result"])),
        "openers_distinct": len({opener(r["result"]) for r in rows}),
        #: A note introduced as saying something ("Your note X says:"), the
        #: shape INBOX 741 removed.
        "says_colon": sum(len(re.findall(r"\b(?:says|said): ", r["text"])) for r in rows),
    }


# --- the voice eval (INBOX 741): about a hundred questions -------------------------
#
# The 25 above plus `fixtures/composer/voice_741.json`: casual and indirect
# questions, typos and text-speak, every question kind, follow-ons read
# against the turn before, and a notebook of short untitled jottings (the
# kind "your note starting with ... says" came from). Its notes are retrieved
# here by a fixed lexical stand-in for the route's search (`retrieve`), so the
# eval is deterministic and needs no server; the 25 keep the route's own.

VOICE = Path(__file__).parent / "fixtures" / "composer" / "voice_741.json"


def load_voice() -> dict:
    return json.loads(VOICE.read_text(encoding="utf-8"))


def untitled_notes(voice: dict, on: date) -> list[dict]:
    from datetime import timedelta

    return [
        {"id": n["id"], "content": n["content"], "created_at": (on - timedelta(days=n["days_ago"])).isoformat(), "tags": []}
        for n in voice["untitled"]
    ]


def retrieve(question: str, notes: list[dict], limit: int = 8) -> list[dict]:
    """The notes a search would hand the composer, best first: a question
    word in a note's heading counts double, in its body once, a typo matched
    to the notebook's own words as search does. A stand-in, fixed so the
    eval measures the composer and not the search."""
    views = [v for v in (composer.read_note(n, i) for i, n in enumerate(notes)) if v]
    terms = composer._fit_terms(composer.subject_terms(question), views)
    stems = {composer._stem(t) for t in terms}
    scored = []
    for view in views:
        score = sum(
            2.0 * composer._holds(t, view.title_words) + composer._holds(t, view.words) + 0.5 * composer._holds(t, view.filed_words)
            for t in stems
        )
        if score > 0:
            scored.append((-score, str(view.note.get("created_at")), view.note))
    scored.sort(key=lambda row: (row[0], [-ord(c) for c in row[1]]))
    return [note for _, _, note in scored[:limit]]


def _syllables(word: str) -> int:
    w = re.sub(r"[^a-z]", "", word.lower())
    if not w:
        return 0
    groups = len(re.findall(r"[aeiouy]+", w))
    if w.endswith("e") and not w.endswith(("le", "ee")) and groups > 1:
        groups -= 1
    return max(1, groups)


def reading_ease(text: str) -> float:
    """Flesch reading ease of the answer as read: 60 to 70 is plain English,
    higher is easier."""
    plain = _MARKDOWN.sub("", text)
    sentences = [s for s in _SENTENCE_END.split(plain) if s.strip()]
    words = plain.split()
    if not sentences or not words:
        return 0.0
    syllables = sum(_syllables(w) for w in words)
    return 206.835 - 1.015 * len(words) / len(sentences) - 84.6 * syllables / len(words)


def run_voice(module=composer) -> list[dict]:  # noqa: ANN001
    """Every voice question composed by `module` (the composer, or an older
    copy of it for a before-and-after), each with its measures, in order, the
    turn before's answer passed where `module.compose` takes one."""
    import inspect

    data = load()
    voice = load_voice()
    on = today(data)
    showcase = [{**n, "connected": False} for n in data["notes"]]
    jottings = untitled_notes(voice, on)
    takes_previous = "previous" in inspect.signature(module.compose).parameters
    rows: list[dict] = []
    previous_text = ""
    for entry in voice["questions"]:
        pool = jottings if entry.get("notebook") == "untitled" else showcase
        question, said, asked_from = entry["question"], "", ""
        if entry.get("previous"):
            before = module.compose(entry["previous"], retrieve(entry["previous"], pool), today=on)
            follow = module.follow_on(question, [{"question": entry["previous"], "answer": before["text"]}])
            if follow:
                question, said, asked_from = follow.question, follow.said, entry["previous"]
        notes = retrieve(question, pool)
        kwargs = {"today": on, "said": said}
        if takes_previous:
            kwargs["previous"] = previous_text
        result = module.compose(question, notes, **kwargs)
        failures = trace_failures(result, question, notes, on, asked_from) if notes else []
        factual = _factual_parts(result)
        untitled_ids = {n["id"] for n in jottings}
        rows.append(
            {
                "category": entry["category"],
                "question": entry["question"],
                "expect": entry["expect"],
                "shape": result["shape"],
                "text": result["text"],
                "result": result,
                "failures": failures,
                "grounded": 1.0 if not factual else (factual - len([f for f in failures if "row" not in f])) / factual,
                "kind_right": result["shape"] == entry["expect"],
                "first_line": answers_shape(result, result["shape"]),
                "words": len(result["text"].split()),
                "mean_sentence": (lambda ls: sum(ls) / len(ls) if ls else 0.0)(sentence_lengths(result["text"])),
                "ease": reading_ease(result["text"]),
                "opener": opener(result),
                "lead_in_repeats": lead_in_repeats(result),
                #: The owner's complaint, counted: a note with no heading named
                #: by its first words.
                "named_by_first_words": sum(1 for p in result["parts"] if p[0] == "title" and p[2] in untitled_ids),
                "says_colon": len(re.findall(r"\b(?:says|said): ", result["text"])),
            }
        )
        previous_text = result["text"]
    return rows


def voice_summary(rows: list[dict]) -> dict:
    n = len(rows)
    by: dict[str, list[int]] = {}
    for r in rows:
        tally = by.setdefault(r["category"], [0, 0])
        tally[0] += r["kind_right"]
        tally[1] += 1
    answered = [r for r in rows if r["result"]["grounding"]]
    return {
        "questions": n,
        "answered": len(answered),
        "grounded": min(r["grounded"] for r in rows),
        "kind_right": sum(r["kind_right"] for r in rows),
        "kind_right_by_category": {k: f"{v[0]}/{v[1]}" for k, v in sorted(by.items())},
        "first_line_answers": sum(1 for r in answered if r["first_line"]),
        "says_colon": sum(r["says_colon"] for r in rows),
        "named_by_first_words": sum(r["named_by_first_words"] for r in rows),
        "lead_in_repeats": sum(1 for r in rows if r["lead_in_repeats"]),
        "openers_distinct": len({r["opener"] for r in rows}),
        #: Two answers in a row opening with the same words: "no template
        #: repeated in a session" (CHAT_PLAN decision 25), said as a count.
        "same_opener_twice_running": sum(
            1 for a, b in zip(rows, rows[1:]) if a["opener"] == b["opener"] and a["opener"] not in ("(quote)", "(asked)")
        ),
        "words_mean": round(sum(r["words"] for r in answered) / max(1, len(answered)), 1),
        "mean_sentence_words": round(sum(r["mean_sentence"] for r in answered) / max(1, len(answered)), 1),
        "reading_ease": round(sum(r["ease"] for r in answered) / max(1, len(answered)), 1),
    }


if __name__ == "__main__":  # pragma: no cover - the report's table
    import sys

    rows = run()
    for row in rows:
        if "-v" in sys.argv:
            print(f"#### {row['question']} [{row['shape']}]\n\n{row['text']}\n")
        print(
            f"- {row['question']} [{row['shape']}] first line {'yes' if row['first_line'] else 'no'}, "
            f"redundancy {row['redundancy']:.2f}, {row['mean_sentence']:.1f} words a sentence, "
            f"{len(row['connectives'])} connectives{', FAIL ' + '; '.join(row['failures']) if row['failures'] else ''}"
        )
    print(json.dumps(summary(rows), indent=1))
    if "--voice" in sys.argv:
        voice_rows = run_voice()
        for row in voice_rows:
            if "-v" in sys.argv:
                print(f"#### [{row['category']}] {row['question']} [{row['shape']}, expected {row['expect']}]\n\n{row['text']}\n")
            if row["failures"] or not row["kind_right"]:
                print(f"- {row['question']}: {row['shape']} (expected {row['expect']}) {'; '.join(row['failures'])}")
        print(json.dumps(voice_summary(voice_rows), indent=1))
