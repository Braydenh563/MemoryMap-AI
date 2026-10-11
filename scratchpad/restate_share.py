"""INBOX 870's measure: the share of an answer's sentences that only restate
one note's text. A sentence restates when, past its label and the joining
words, at least 80% of its content words are in one note and it carries no
relating clause of its own. Run over the gold questions (no model):

    PYTHONPATH=src:tests python scratchpad/restate_share.py [--show]
"""

from __future__ import annotations

import re
import sys

sys.path.insert(0, "tests")
import _gold  # noqa: E402

from memorymap.ai import composer, composer_digest  # noqa: E402
from datetime import date  # noqa: E402

FIXTURE = _gold.load()
TODAY = date.fromisoformat(FIXTURE["today"])
NOTES = [
    {"id": i + 1, "content": n["content"], "created_at": f"{n['date']}T10:00:00", "category": n["category"], "tags": n["tags"]}
    for i, n in enumerate(FIXTURE["notes"])
]
STOP = set("a an the and or but of to in on at for with from by is are was were be been it its this that these those you your i my me we our so as up down out no not yet".split())
_WORD = re.compile(r"[a-z0-9]+")


def words(text: str) -> list[str]:
    return [w for w in _WORD.findall(text.lower()) if w not in STOP and len(w) > 1]


def sentences(text: str) -> list[str]:
    out = []
    for block in text.split("\n"):
        block = re.sub(r"^\s*[-*]\s+", "", block).strip()
        block = re.sub(r"\*\*[^*]+:\*\*\s*", "", block)
        if not block:
            continue
        out += [s for s in re.split(r"(?<=[.?!])\s+(?=[A-Z])", block) if s.strip()]
    return out


def restates(sentence: str) -> bool:
    got = words(sentence)
    if len(got) < 2:
        return False
    best = max(sum(1 for w in got if w in set(words(n["content"]))) / len(got) for n in NOTES)
    return best >= 0.8


def main() -> None:
    show = "--show" in sys.argv
    total = restated = 0
    for item in FIXTURE["answers"]:
        if item["kind"] != "notes":
            continue
        result = composer_digest.answer(item["question"], NOTES, today=TODAY) or composer.compose(item["question"], NOTES, today=TODAY)
        said = sentences(result["text"])
        flags = [restates(s) for s in said]
        total += len(said)
        restated += sum(flags)
        if show:
            print(f"\nQ{item['n']} {item['question']}  ({sum(flags)}/{len(said)} restate)")
            for s, f in zip(said, flags):
                print(("  R " if f else "    ") + s)
    scores = [_gold.score((composer_digest.answer(a["question"], NOTES, today=TODAY) or composer.compose(a["question"], NOTES, today=TODAY))["text"], a)["total"] for a in FIXTURE["answers"] if a["kind"] == "notes"]
    print(f"\nrestating sentences: {restated}/{total} = {restated / total:.0%}; gold note mean {sum(scores) / len(scores):.1f}")


if __name__ == "__main__":
    main()
