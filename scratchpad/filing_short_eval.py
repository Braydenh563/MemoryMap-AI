"""Short notes and the meaning-based filer (BACKLOG section 8, "ai is cool").

`janitor._semantic_category` files at a centroid similarity of 0.60 or a
nearest-neighbour vote with no length floor, so a very short note's vector can
land anywhere. This measures it with the real embedding model the app ships
(BAAI/bge-small-en-v1.5, from the local cache): the hundred-note notebook in
`filing_eval.py`, then short held-out notes with a known category and a set of
short notes that belong nowhere (they should abstain).

    PYTHONPATH=src .venv/bin/python scratchpad/filing_short_eval.py

Prints, per word count bucket and per threshold set: how many files, how many
of those are right, how many of the notes that belong nowhere get filed anyway.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from filing_eval import NOTES  # noqa: E402

SHORT = {
    "Gym": ["squats today", "bench press", "leg day", "rest day", "ran 5k", "deadlift form"],
    "Recipes": ["banana bread", "pasta sauce", "bake 50 minutes", "tomato soup", "pancake batter", "lemon chicken"],
    "Work": ["standup notes", "sprint retro", "client proposal", "deploy failed", "board meeting", "hire backend dev"],
    "Travel": ["flight to Tokyo", "hotel booking", "pack passport", "train to Rome", "visa application", "airport transfer"],
    "Finance": ["pay credit card", "tax return", "savings account", "mortgage rates", "invoice client", "budget"],
    "Health": ["doctor appointment", "dentist booked", "vitamin D", "blood test", "physio knee", "eye test"],
    "Books": ["finished Dune", "reading list", "book club", "new novel", "audiobook", "borrow sequel"],
    "Garden": ["water tomatoes", "prune roses", "compost bin", "plant garlic", "mow lawn", "order seeds"],
    "Ideas": ["app idea", "blog post idea", "startup idea", "short story", "podcast episode", "board game idea"],
    "Home": ["fix the tap", "call landlord", "buy light bulbs", "clean gutters", "repaint hallway", "smoke alarm"],
}
NOWHERE = [
    "ai is cool", "hello", "test", "ok thanks", "remember this", "interesting", "maybe later",
    "good point", "what is this", "note to self", "cool idea", "todo", "lol", "thinking out loud",
    "machine learning", "the weather", "random thought", "monday", "yes", "check this",
]

# (centroid floor, knn min similarity, knn min share): today's three numbers first.
SETS = {
    "today": (0.60, 0.42, 0.55),
    "short +0.10": (0.70, 0.52, 0.65),
    "short +0.15": (0.75, 0.57, 0.70),
    "short +0.20": (0.80, 0.62, 0.75),
}


def main() -> None:
    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer("BAAI/bge-small-en-v1.5", local_files_only=True)

    def enc(texts):
        v = np.asarray(model.encode(list(texts), show_progress_bar=False), dtype="float32")
        return v / np.linalg.norm(v, axis=1, keepdims=True)

    names, texts = [], []
    for cat, notes in NOTES.items():
        for n in notes:
            names.append(cat)
            texts.append(n)
    rows = enc(texts)
    cats = sorted(set(names))
    groups = np.array([cats.index(n) for n in names])
    centroids = np.stack([rows[groups == i].mean(axis=0) for i in range(len(cats))])

    def decide(vec, floor, min_sim, min_share):
        """(category or None, how) with the janitor's own two paths."""
        v = vec / np.linalg.norm(vec)
        sims = [float(np.dot(v, c) / np.linalg.norm(c)) for c in centroids]
        best = int(np.argmax(sims))
        if sims[best] >= floor:
            return cats[best]
        s = rows @ v
        order = np.argsort(-s)[:7]
        scored = [(float(s[i]), names[i]) for i in order]
        if scored[0][0] < min_sim:
            return None
        votes = {}
        for sim, name in scored:
            if sim >= min_sim:
                votes[name] = votes.get(name, 0.0) + sim
        if not votes:
            return None
        total = sum(votes.values())
        name, weight = max(votes.items(), key=lambda p: p[1])
        return name if weight / total >= min_share else None

    cases = [(t, c) for c, ts in SHORT.items() for t in ts] + [(t, None) for t in NOWHERE]
    vecs = enc([t for t, _ in cases])
    print(f"{len(rows)} filed notes, {sum(c is not None for _, c in cases)} short with a category, "
          f"{len(NOWHERE)} that belong nowhere\n")
    for bucket, ok in (("1-2 words", lambda n: n <= 2), ("3 words", lambda n: n == 3), ("4+ words", lambda n: n >= 4)):
        picked = [(i, t, c) for i, (t, c) in enumerate(cases) if ok(len(t.split()))]
        known = [(i, t, c) for i, t, c in picked if c is not None]
        none = [(i, t, c) for i, t, c in picked if c is None]
        print(f"{bucket}: {len(known)} with a category, {len(none)} nowhere")
        for label, (floor, sim, share) in SETS.items():
            filed = right = 0
            for i, t, c in known:
                got = decide(vecs[i], floor, sim, share)
                if got is not None:
                    filed += 1
                    right += got == c
            stray = [t for i, t, c in none if decide(vecs[i], floor, sim, share) is not None]
            prec = f"{right / filed:.2f}" if filed else "n/a"
            print(f"  {label:12s} files {filed:2d}/{len(known):2d}  precision {prec}  "
                  f"nowhere-notes filed {len(stray)}/{len(none)} {stray[:4]}")
        print()


if __name__ == "__main__":
    main()


def signals() -> None:
    """The two numbers the filer thresholds on, for notes with and without a home."""
    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer("BAAI/bge-small-en-v1.5", local_files_only=True)

    def enc(texts):
        v = np.asarray(model.encode(list(texts), show_progress_bar=False), dtype="float32")
        return v / np.linalg.norm(v, axis=1, keepdims=True)

    names = [c for c, ns in NOTES.items() for _ in ns]
    rows = enc([n for ns in NOTES.values() for n in ns])
    cats = sorted(set(names))
    groups = np.array([cats.index(n) for n in names])
    cents = np.stack([rows[groups == i].mean(axis=0) for i in range(len(cats))])
    cents = cents / np.linalg.norm(cents, axis=1, keepdims=True)
    for label, items in (("with a home", [t for ts in SHORT.values() for t in ts]), ("nowhere", NOWHERE)):
        v = enc(items)
        top1 = (v @ rows.T).max(axis=1)
        cs = v @ cents.T
        cbest = cs.max(axis=1)
        cmargin = np.sort(cs, axis=1)[:, -1] - np.sort(cs, axis=1)[:, -2]
        for name, arr in (("top neighbour", top1), ("best centroid", cbest), ("centroid margin", cmargin)):
            q = np.percentile(arr, [0, 10, 25, 50, 75, 90, 100])
            print(f"{label:12s} {name:16s} " + "  ".join(f"{x:.2f}" for x in q))


if __name__ == "__main__" and len(sys.argv) > 1 and sys.argv[1] == "signals":
    signals()


def floors() -> None:
    """The candidate fix: a note under four words files by meaning only when its
    nearest filed note is at least FLOOR close. Today's thresholds otherwise."""
    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer("BAAI/bge-small-en-v1.5", local_files_only=True)

    def enc(texts):
        v = np.asarray(model.encode(list(texts), show_progress_bar=False), dtype="float32")
        return v / np.linalg.norm(v, axis=1, keepdims=True)

    names = [c for c, ns in NOTES.items() for _ in ns]
    rows = enc([n for ns in NOTES.values() for n in ns])
    homed = [(t, c) for c, ts in SHORT.items() for t in ts]
    hv = enc([t for t, _ in homed])
    nv = enc(NOWHERE)
    print("floor  homed kept  precision of kept  nowhere filed")
    for floor in (0.0, 0.68, 0.70, 0.72, 0.74, 0.76, 0.78):
        kept = right = 0
        for v, (_t, c) in zip(hv, homed):
            s = rows @ v
            if s.max() < floor:
                continue
            kept += 1
            order = np.argsort(-s)[:7]
            votes = {}
            for i in order:
                votes[names[i]] = votes.get(names[i], 0.0) + float(s[i])
            right += max(votes.items(), key=lambda p: p[1])[0] == c
        stray = sum(float((rows @ v).max()) >= floor for v in nv)
        print(f"{floor:.2f}   {kept:2d}/{len(homed)}       {right / kept:.2f}               {stray}/{len(nv)}")


if __name__ == "__main__" and len(sys.argv) > 1 and sys.argv[1] == "floors":
    floors()
