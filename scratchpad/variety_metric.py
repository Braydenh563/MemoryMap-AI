"""The variety and maxims measures on the showcase eval (CHAT_PLAN "The
deterministic foundation", phase F0, Brief 64). Measures only.

    PYTHONPATH=src:. python scratchpad/variety_metric.py [--json]

Variety: ten of the 25 `showcase_725` questions, asked twenty times each, in
three conditions, counting distinct openers (the first worded template phrase
of the answer, `tests/_composer_eval.opener`; "(quote)" when the answer starts
with the person's own sentence) and distinct fact sets (the quote, title,
filed and picture parts, in order; the measure and asked parts are kept
apart because they are computed from the notes and the question).

  as shipped   twenty identical calls: `_pick(question, salt, options)` hashes
               only the question and a fixed salt, so nothing varies
  previous     a twenty-turn chat that asks the same question: each call gets
               the turn before's answer as `previous`, the one input
               `compose` takes that changes between turns today
  salted       `_pick`'s salt argument carries the turn number, the way the
               realiser (F3) will salt per chat and turn; the pool of options
               is then the only limit on variety

Maxims, over the 25 eval answers as shipped, sentence by sentence:
  more than one number   a sentence with two or more numerals or spelled
                         numbers; split into the app's own words and the
                         note's quoted sentences (which the app cannot edit)
  number with no span    a number in a template or measure part, so one that
                         no grounding row points at
  repeats another        two sentences of one answer whose stem sets share
                         at least half (token Jaccard over stems)
"""
import json
import re
import sys
from collections import Counter

from memorymap.ai import composer
from tests import _composer_eval as E

QUESTIONS = [
    "Who asked for a public API?",
    "How many beta testers are active?",
    "Compare Lisbon and Porto",
    "Does Harbor work offline?",
    "What do I know about sourdough?",
    "How do I sharpen my knife?",
    "What is my half marathon training plan?",
    "How much will the trip cost?",
    "What is the status of the onboarding rewrite?",
    "Which dinners take under 30 minutes?",
]
TURNS = 20

_NUMBER = re.compile(
    r"\d[\d,.:]*|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|"
    r"twenty|thirty|forty|fifty|hundred|thousand|dozen|half|twice|double)\b",
    re.I,
)
_MARK = re.compile(r"\*\*|^> |^- \[[ x]\] |^- |\[|\]", re.M)
_SPLIT = re.compile(r"(?<=[.?:])\s+|\n+")


def _entry(question, data):
    for entry in data["questions"]:
        if entry["question"] == question:
            return entry
    raise KeyError(question)


def _facts(result):
    # The first letter of a quote is lowered after a joiner ("three gates",
    # "Three gates"): the same fact, so compared without that case.
    return tuple((p[0], p[1][:1].lower() + p[1][1:]) for p in result["parts"] if p[0] in ("quote", "picture", "title", "filed"))


def _computed(result):
    return tuple((p[0], p[1]) for p in result["parts"] if p[0] in ("measure", "asked"))


def run_variety():
    data = E.load()
    on = E.today(data)
    out = {}
    for question in QUESTIONS:
        entry = _entry(question, data)
        notes = E.notes_for(entry, data)
        recent = str(entry.get("search_mode") or "").endswith("recent")
        rows = {}

        def call(**kw):
            return composer.compose(question, notes, today=on, recent=recent, **kw)

        rows["as shipped"] = [call() for _ in range(TURNS)]
        chain, prev = [], ""
        for _ in range(TURNS):
            res = call(previous=prev)
            chain.append(res)
            prev = res["text"]
        rows["previous"] = chain
        orig = composer._pick
        salted = []
        try:
            for turn in range(TURNS):
                composer._pick = lambda q, salt, options, _t=turn: orig(q, f"{salt}#{_t}", options)
                salted.append(call())
        finally:
            composer._pick = orig
        rows["salted"] = salted
        out[question] = {
            name: {
                "openers": Counter(E.opener(r) for r in results),
                "distinct_openers": len({E.opener(r) for r in results}),
                "distinct_texts": len({r["text"] for r in results}),
                "distinct_facts": len({_facts(r) for r in results}),
                "distinct_computed": len({_computed(r) for r in results}),
                "shape": results[0]["shape"],
            }
            for name, results in rows.items()
        }
    return out


def sentences(result):
    """(sentence, app_authored) for each sentence of the answer: a sentence is
    app-authored when any of its characters come from a template, measure or
    asked part rather than wholly from one quote."""
    chars = []
    for part in result["parts"]:
        kind = "quote" if part[0] in ("quote", "picture", "title", "filed") else "app"
        chars.extend((c, kind) for c in part[1])
    plain = "".join(c for c, _ in chars)
    out, pos = [], 0
    for piece in _SPLIT.split(plain):
        i = plain.find(piece, pos)
        if i < 0 or not piece.strip():
            continue
        pos = i + len(piece)
        kinds = {k for c, k in chars[i:pos] if c.strip() and c not in "*[]"}
        out.append((_MARK.sub("", piece).strip(), "app" in kinds, chars[i:pos]))
    return out


def stems(s):
    return {composer._stem(w) for w in composer._words(s)}


def run_maxims():
    data = E.load()
    on = E.today(data)
    totals = Counter()
    detail = {"multi_app": [], "multi_quote": [], "unspanned": [], "repeats": []}
    for entry in data["questions"]:
        notes = E.notes_for(entry, data)
        recent = str(entry.get("search_mode") or "").endswith("recent")
        res = composer.compose(entry["question"], notes, today=on, recent=recent)
        sents = sentences(res)
        totals["answers"] += 1
        totals["sentences"] += len(sents)
        for text, app, chars in sents:
            if len(_NUMBER.findall(text)) > 1:
                key = "multi_app" if app else "multi_quote"
                totals[key] += 1
                detail[key].append((entry["question"], text[:90]))
            # numbers outside every quote part
            app_text = "".join(c for c, k in chars if k == "app")
            loose = _NUMBER.findall(app_text)
            if loose:
                totals["unspanned_sentences"] += 1
                totals["unspanned_numbers"] += len(loose)
                detail["unspanned"].append((entry["question"], app_text.strip()[:60], loose))
        bodies = [(t, stems(t)) for t, _, _ in sents]
        worst, pair = 0.0, None
        for i, (ta, a) in enumerate(bodies):
            for tb, b in bodies[i + 1:]:
                if len(a) >= 3 and len(b) >= 3:
                    j = len(a & b) / len(a | b)
                    if j > worst:
                        worst, pair = j, (ta[:50], tb[:50])
        if worst >= 0.5:
            totals["answers_with_repeat"] += 1
            detail["repeats"].append((entry["question"], round(worst, 2), pair))
        totals["max_repeat_x100"] = max(totals["max_repeat_x100"], int(worst * 100))
        # the same fact (a quote) stated twice
        quotes = [p[1] for p in res["parts"] if p[0] == "quote"]
        if len(quotes) != len(set(quotes)):
            totals["answers_quoting_twice"] += 1
    return dict(totals), detail


def main(argv):
    variety = run_variety()
    maxims, detail = run_maxims()
    if "--json" in argv:
        print(json.dumps({"variety": {q: {n: {k: (dict(v) if isinstance(v, Counter) else v) for k, v in m.items()} for n, m in r.items()} for q, r in variety.items()}, "maxims": maxims, "detail": detail}, indent=1, default=str))
        return
    print(f"{'question':48} {'condition':11} openers texts facts computed")
    for q, r in variety.items():
        for name, m in r.items():
            print(f"{q[:47]:48} {name:11} {m['distinct_openers']:7} {m['distinct_texts']:5} {m['distinct_facts']:5} {m['distinct_computed']:8}  {m['shape']}")
    for name in ("as shipped", "previous", "salted"):
        ds = [r[name]["distinct_openers"] for r in variety.values()]
        fs = [r[name]["distinct_facts"] for r in variety.values()]
        print(f"{name:11} openers per question: mean {sum(ds) / len(ds):.1f}, min {min(ds)}, max {max(ds)}; "
              f"questions with identical facts across {TURNS}: {sum(1 for f in fs if f == 1)} of {len(fs)}")
    print("maxims:", maxims)
    for key, rows in detail.items():
        print(f"-- {key} ({len(rows)})")
        for row in rows[:40]:
            print("  ", row)
    print("-- salted openers, each question")
    for q, r in variety.items():
        print(f"  {q}: {dict(r['salted']['openers'])}")


if __name__ == "__main__":
    main(sys.argv[1:])
