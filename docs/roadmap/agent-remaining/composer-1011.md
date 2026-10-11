# composer-1011: the composer, smart everywhere (INBOX 895, 899; Briefs 104, 97; atlas B20 to B27, B40, A8)

Owner (895): "The composer needs to be a legitimately smart chatbot ... do anything and everythinf and do it very accurately and well." Latest (coordinator relay): the Guide tailored to the question and the person's state; personal and random questions with no model.

Baseline (merge 6afaf8f3c, port 8893, `scratchpad/ui-sweeps/gold.js` TAG=before): gold 89 (sim 0.833, shape 0.949); Q4 73, Q14 75, Q17 81, Q8 83, Q11 83, Q20 84.

Plan, in order: typos fixtures and the speller (Brief 104); UK/US spelling equivalence; personal and random questions (30 gold); tasks and routing (30 phrasings); the Guide tailored (25 gold); phrasing diversity metric; A8 ghost text; B20 to B27, B40.

- done: 6afaf8f3c merge gemini/composer-improvements (boot scripts 322,272 to under 320,600 by moving the answer foot to ask-compose.js)
- done (step A): owner typos (18 new fixtures, real-word slips, long English words from the vendored list, warmed in the background); UK/US equivalence (`ai/variants.py`, search_manager, engine, composer `_stem`); INBOX 899 part 1: composer_digest, records and ask-compose.js read dates and units through `ai/recognise.py` (one-reader lint back to 1)
- next: personal and random questions (30 gold), then tasks and routing, actions with chips, find-it nav (40 gold), the Guide (25 gold), diversity metric
