# filing-1010: WORLD_CLASS_PLAN 23, steps 1 to 5 (Brief 39b)

Branch `agent/filing-1010`. Steps 1 to 4 built and their Built block moved to
HISTORY.md ("Moved from the plans, 2026-10-10 (filing-1010)"), because the
plan passed its 4,200-line cap; step 5's CHANGELOG, Guide topics and help
popovers are in its commit.

## Measured (120-note fixture, leave one out, no chat model)

| step | no model | with the embedder |
| --- | --- | --- |
| baseline | 0.175 (8 wrong) | 0.817 (18 wrong) |
| 2, the pack | 0.192 (8 wrong) | 0.817 |
| 3, the decision | 0.417 (15 wrong, 14 sensitive held); 0.533 with sensitive filing on; first choice 0.617 | 0.808 (20 wrong) |
| 4, Tidy and the lexicon | 0.417 | 0.808 |

The embedder numbers are bge-small in numpy (`scratchpad/filing-tools/npbge.py`),
equal to sentence-transformers' vectors (cosine 1.0); bge takes no prefix, so
they are the app's own.

## Left, one line each

- Decision 8's bar, "below 0.8 top-1 without a model the step is not done": 0.417 (`tests/test_filing_accuracy.py`, strict xfail). Forced to choose, the evidence is right 0.61; 39 of 120 notes name no pack phrase ("dal", "boiler", "episode", "MOT", "nursery"). Recommendation: an everyday vocabulary supplement beside the pack, reviewed by the owner (a pack migration, so the owner's call), measured on a second fixture written after it.
- Decision 6's scope, needs a ruling: "Sensitive topics ... are suggested, never auto-filed". Applied to filing without a chat model (`lexical_filing.decide`, Tidy's uncategorised review); the model and the embedder still file a health note into Health. Recommendation: keep it there, since the destination is the person's own category.
- Decision 6 says "the pack's flag": the pack has none. The 49 sensitive topics are MemoryMap's own list in `src/memorymap/ai/data/taxonomy/memorymap_filing.json`.
- The data path: section 23 says `src/memorymap/ai/data/taxonomy/`, section 26 decision 56 says `src/memorymap/data/`; section 23's was followed.
- Decision 4, "alternate names come from the pack's labels and the person's own titles": only the pack's labels (`entry/tidy.py` `_rows_category_names`).
- Decision 4's centroid test needs the search model; with it off the merge review uses topics alone at 0.8 and says so in the row (`tidy.MERGE_TOPIC_OVERLAP_ALONE`).
- The lexicon (decision 7) costs one note in the online simulation (0.521 to 0.510, `scratchpad/filing-tools/online.py`); the fixture has no category named for a topic another holds, so the case it is for ("Work, not Software") is only in `tests/test_tidy_categories.py`.
- Decision 9 (the 30 context rules, 50 acceptance fixtures): not started; `taxonomy.context_rules()` and `tests/fixtures/taxonomy/context_acceptance_fixtures.json` are in place.
- Cost: `decide` is 34 ms a call at 5,000 synthetic notes against 8 to 17 ms for the old tally (`scratchpad/filing-tools/perf.py`); Tidy's uncategorised review calls it once a note.
- The tag picker on an empty field puts the tags the note says first ("training 10 notes, in this note"), but on a note that says none of them it still lists every tag by use (`frontend/js/tag-suggest.js` `fillTagSuggest`): a completion list, not a suggestion, so left.
- The model's tag reply is grounded against a faked reply (`tests/test_tag_grounding.py`); what a real small model answers is not verified.
- Graph topics as categories ("How are they different from categories??", the graph agent's hand-off in `archive/agent-remaining/graph-1010.md`): not in section 23's steps, so not done.

## Found, not fixed

- torch 2.14.1 and sentence-transformers 6.1.0 are in the shared `.venv` (installed 07:41 today), against CLAUDE.md section 7 and AGENT_COMMON ("no torch"); a server on a fresh data dir files by meaning unless `embedding_backend` is set to `ollama`.
- `tests/test_global_scope_ratchet.py::test_cross_file_guards_only_go_down` fails on the working branch itself (279 guards, cap 277).
