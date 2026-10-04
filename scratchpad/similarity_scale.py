"""GRAPH_PLAN 518 (4): similar_pairs at 2k and 10k synthetic vectors, every
pair above the cutoff against each note's closest four.

    PYTHONPATH=src .venv/bin/python scratchpad/similarity_scale.py

Vectors are 384-wide (bge-small's width) around a shared direction, so most
pairs score above 0.55 the way a real notebook's do. Prints seconds, peak
traced memory and the number of pairs kept.
"""

import time
import tracemalloc

import numpy as np

from memorymap.ai.embeddings import similar_pairs

rng = np.random.default_rng(1)
for n in (2000, 10000):
    common = rng.normal(size=384)
    vectors = {i: (common + 0.9 * rng.normal(size=384)).astype("float32") for i in range(n)}
    for label, per_node in (("all pairs", None), ("per node 4", 4)):
        if per_node is None and n > 2000:
            # Not materialised: count what every-pair would hold (a Python
            # tuple of two ints and a float is about 150 bytes with its list slot).
            m = np.stack(list(vectors.values()))
            m /= np.linalg.norm(m, axis=1, keepdims=True)
            above = sum(int(((m[s : s + 512] @ m.T) >= 0.55).sum()) for s in range(0, n, 512))
            pairs = (above - n) // 2
            print(f"n={n} {label}: not run, {pairs} pairs, about {pairs * 150 / 1e9:.1f} GB of tuples")
            continue
        tracemalloc.start()
        started = time.perf_counter()
        pairs = similar_pairs(vectors, 0.55, per_node=per_node)
        seconds = time.perf_counter() - started
        _, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        print(f"n={n} {label}: {seconds:.2f}s, peak {peak / 1e6:.0f} MB, {len(pairs)} pairs")
        del pairs
