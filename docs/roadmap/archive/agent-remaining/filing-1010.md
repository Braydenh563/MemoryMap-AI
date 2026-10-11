# filing-1010 (INBOX 781, better deterministic tag and filing suggestions)

Done: HISTORY.md, "Moved from the plans, 2026-10-11 (WORLD_CLASS 23, INBOX 781, filing suggestions)".

Left, one line each:

- Journal and social notes with no tag word ("Felt anxious all morning", "Coffee with Priya and Jordan") still get nothing: the engine offers a tag only where the note has a word for it (decision 5); 10 of the 67-note set's 14 first-suggestion misses are notes with no word for their tag (journal lines, friends, a wishlist, a poem). The pack's purpose phrases ground #journal on "dear diary" and "grateful for" only (`ai/tagging.py:_purpose_grounds`); a mood and people lexicon would be the next step.
- Tags from a note's own words for a notebook with no tags yet: measured 4 of 12 right (a title word said twice), not shipped (`ai/tagging.py`, after `merged`).
- Category filing: unchanged on the tagging set (filed 0.612, first choice 0.881); fuzzy and abbreviation matching (`tagging.stem`) is not applied to category names in `lexical_filing._tally` / `decide`. The 120-note set's decision 8 bar (0.8 top-1 with no model, 0.417 measured) is still open.
- The stem fold reads "run" in "a tutoring service run by" as #running (one wrong extra on the set); a verb-sense guard would need a tagger.
- Real-model path not run: with a model, `_engine_tags` puts the model's grounded tags first and the engine fills the rest; only the no-model path was driven.
- Turn-down learning counts notes, not offers: a tag offered 50 times and discarded 3 times is damped like one discarded every time. Counting takes as well needs a column (`entries.taken_tags` or an event).
