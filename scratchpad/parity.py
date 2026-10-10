"""The parity scorecard's engine columns (CHAT_PLAN decision 58), the ones
measurable with no model: variety (decision 51's floor), structure (the
maxims lint, decision 52), grounding (every eval clause traced) and acts
(each with an inverse, decision 53). Brief 68 adds the model's columns.

    PYTHONPATH=src:. python scratchpad/parity.py
"""
from memorymap.ai import realise, validate
from tests import _composer_eval as E
from tests.test_realise import FLOOR_QUESTIONS, HELP_QUESTIONS, _chat


def variety() -> dict:
    out = {}
    for voice in ("natural", "professional"):
        seen = [realise.variety(_chat(q, voice)) for q in FLOOR_QUESTIONS]
        out[voice] = (min(s["openers"] for s in seen), max(s["facts"] for s in seen))
    helped = [realise.variety(_chat(q, "help")) for q in HELP_QUESTIONS]
    out["help"] = (min(s["wordings"] for s in helped), max(s["facts"] for s in helped))
    return out


def structure() -> tuple[int, int, int]:
    data = E.load()
    notes = data["notes"] + E.untitled_notes(E.load_voice(), E.today(data))
    rows = E.run() + E.run_voice()
    found = sum(len(validate.maxims(r["result"], r["question"], notes) + validate.computed_rule(r["result"], r["question"])) for r in rows)
    grounded = sum(1 for r in rows if r["grounded"] >= 1.0)
    return len(rows), found, grounded


def acts() -> tuple[int, int]:
    from memorymap.ai import acts as registry

    writes = [a for a in registry.ACTS.values() if a.writes]
    return sum(1 for a in writes if a.inverse), len(writes)


if __name__ == "__main__":
    for voice, (low, facts) in variety().items():
        print(f"variety  {voice:12} min distinct of {realise.VARIETY_TURNS}: {low} (floor {realise.VARIETY_FLOOR}); fact sets per question: {facts}")
    n, found, grounded = structure()
    print(f"maxims   {found} findings over {n} eval answers; grounded 1.0: {grounded} of {n}")
    try:
        have, total = acts()
        print(f"acts     {have} of {total} write acts have an inverse")
    except ImportError:
        print("acts     no registry yet")
