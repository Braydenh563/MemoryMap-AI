# engine-1010: what Brief 39 (CHAT_PLAN Phase 6) leaves open

Steps 0 to 10 are built (HISTORY.md "Moved from the plans, 2026-10-10 (CHAT_PLAN Phase 6)").

- Blind panel (decision 40): the owner's rating against the 1 to 3B model; not runnable by an agent.
- P10 days until a note's date ("how many days until the dentist"): `utilities.until_subject` (src/memorymap/ai/utilities.py:313) finds the subject; compose does not yet look the date up in the notes.
- P11 mention counts ("how many times did I mention Porto"): no count shape; `notebook_stats` counts notes, not mentions.
- P12 a list filtered by category or tag ("list my work notes"): `composer._filtered` (src/memorymap/ai/composer.py:3155) filters by tag and source kind, not by category.
- P13 every date and what is due this week: the fact layer has the dates (`factgraph.of_kind`), no answer shape lists them.
- P15 a lead-in chosen after the parts: the compare opener is still chosen first.
- P16 a note's open checklist items for "what is still open on X".
- Decision 45: the readings are listed (`composer._readings`, src/memorymap/ai/composer.py:2693); a running model does not yet pick among them (needs a real model; `pytest -m evals`).
- Decision 43: the currency table is dated (`utilities.RATES_DATE`, src/memorymap/ai/utilities.py:113) but has no Settings editor.
- Captions: the composer reads them as note content; keyword search finds them as the picture's own row (src/memorymap/search/index.py:793), not as its note's.
- Dates like 3/4 read day first (`when._date_phrase`, src/memorymap/ai/when.py:420); no locale order.
- Not seen in a browser: the web sources list with a real search engine; contrast sweeps over `.said` and the act card.
- Polarity in the fact layer: dropped by decision 30's own condition (no feature uses it).
- Found, not mine: tests/test_ask_answer_object.py::test_ask_is_never_disabled_when_the_model_is_off fails on the base too (the chat skills trigger's `dataset.needsModel`).
