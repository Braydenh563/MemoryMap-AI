"""The gold-answer score (CHAT_PLAN decision 70): an answer beside the one a
thoughtful person wrote from the same notes, as two numbers and the shape
rules the owner named in INBOX 812.

`sim` is the content-word overlap with the gold (F1), so a rewritten fact
scores and a quoted note scores only for the words they share. `shape` is the
share of decision 70's rules the answer keeps. The total is their mean, out
of 100. Used by `tests/test_gold_answers.py` and by
`scratchpad/ui-sweeps/gold.js` (`python tests/_gold.py < answers.json`).
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

FIXTURE = Path(__file__).parent / "fixtures" / "gold_answers.json"

_STOP = frozenset(
    "a an the and or but of to in on at for with from by is are was were be been it its this that these those "
    "i you your yours my me we our they them their he she his her so as if than then there here what which who "
    "when how do did does have has had not no yet just also about into up out over one any all".split()
)
_PLACEHOLDER = re.compile(r"\{[^}]*\}")
#: The marks INBOX 812 named: a bracketed date per line, a quoted note, the
#: sources said again under the answer.
_BRACKET = re.compile(r"\[(your note|from|note)[^\]]*\]|\[\d{1,2} [A-Z][a-z]+\]", re.I)
_QUOTING = re.compile(r"\bsays:|^>|Here is what (I found|your notes have)|From what you've written:|Grounded in|\b\d+ of \d+ from your notes", re.I | re.M)
_LABEL = re.compile(r"\*\*[^*\n]{2,40}:\*\*")


def load() -> dict:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def _content(text: str) -> list[str]:
    text = _PLACEHOLDER.sub(" ", text or "")
    words = re.findall(r"[a-z0-9$]+(?:'[a-z]+)?", text.lower())
    return [w for w in words if w not in _STOP]


def similarity(text: str, gold: str) -> float:
    got, want = _content(text), _content(gold)
    if not got or not want:
        return 0.0
    pool = {}
    for w in want:
        pool[w] = pool.get(w, 0) + 1
    shared = 0
    for w in got:
        if pool.get(w):
            pool[w] -= 1
            shared += 1
    if not shared:
        return 0.0
    precision, recall = shared / len(got), shared / len(want)
    return 2 * precision * recall / (precision + recall)


def _first(text: str) -> str:
    return re.split(r"(?<=[.?!])\s|\n", (text or "").strip(), maxsplit=1)[0]


def checks(text: str, item: dict) -> dict[str, bool]:
    """Each rule of decision 70 that applies to this gold, kept or not."""
    gold = item["gold"]
    body = text or ""
    out = {
        "no_brackets": not _BRACKET.search(body),
        "no_quoting": not _QUOTING.search(body),
        "opening_answers": similarity(_first(body), _first(gold)) >= 0.3,
        "never": not any(w.lower() in body.lower() for w in item.get("never", [])),
    }
    words, gold_words = len(body.split()), len(_PLACEHOLDER.sub("x", gold).split())
    out["length"] = 0.5 * gold_words <= words <= 1.8 * gold_words
    if _LABEL.search(gold):
        out["labels"] = bool(_LABEL.search(body))
    if re.search(r"^Nothing (yet )?(on|about)", gold, re.M):
        out["missing"] = bool(re.search(r"\bNothing\b|\bnot yet\b|\bno note\b", body, re.I))
    if gold.rstrip().endswith("?"):
        out["offer"] = body.rstrip().endswith("?")
    return out


def score(text: str, item: dict) -> dict:
    sim = similarity(text, item["gold"])
    kept = checks(text, item)
    shape = sum(kept.values()) / len(kept)
    return {
        "n": item["n"],
        "sim": round(sim, 3),
        "shape": round(shape, 3),
        "total": round(50 * sim + 50 * shape),
        "failed": sorted(k for k, ok in kept.items() if not ok),
    }


if __name__ == "__main__":
    #: stdin: {"<n>": "<answer text>", ...}; stdout: one score per answer.
    given = json.load(sys.stdin)
    items = {str(a["n"]): a for a in load()["answers"]}
    print(json.dumps([score(text, items[n]) for n, text in given.items() if n in items]))
