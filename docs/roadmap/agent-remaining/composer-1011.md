# composer-1011: the composer, smart everywhere (INBOX 895, 899; Briefs 104, 97; atlas B20 to B27, B40, A8)

Owner (895): "The composer needs to be a legitimately smart chatbot ... do anything and everythinf and do it very accurately and well." Latest (coordinator relay): the Guide tailored to the question and the person's state; personal and random questions with no model.

Baseline (merge 6afaf8f3c, port 8893, `scratchpad/ui-sweeps/gold.js` TAG=before): gold 89 (sim 0.833, shape 0.949); Q4 73, Q14 75, Q17 81, Q8 83, Q11 83, Q20 84.

Plan, in order: typos fixtures and the speller (Brief 104); UK/US spelling equivalence; personal and random questions (30 gold); tasks and routing (30 phrasings); the Guide tailored (25 gold); phrasing diversity metric; A8 ghost text; B20 to B27, B40.

- done: 6afaf8f3c merge gemini/composer-improvements (boot scripts 322,272 to under 320,600 by moving the answer foot to ask-compose.js)
- done (step A): owner typos (18 new fixtures, real-word slips, long English words from the vendored list, warmed in the background); UK/US equivalence (`ai/variants.py`, search_manager, engine, composer `_stem`); INBOX 899 part 1: composer_digest, records and ask-compose.js read dates and units through `ai/recognise.py` (one-reader lint back to 1)
- done (step B, ffa4eeefc): find-it nav links (`ai/find_it.py`, 40/40 gold, 0/8 false links; 0 before)
- done (step C): vocatives (`ai/vocative.py`, 38/38 gold, 14/14 controls; calls answered with three ask chips) and reply variety (`ai/phrasing.py`, `ai/composer_replies.py`; every family 8+ in both voices; over 50 replies: openers 0.82 to 1.00, shape 0.60 to 1.00, repeats 250 to 0); "glad" kind; emotion and insult readings fixed
- done (step C): nothing found 8+ a voice; note-answer openers avoid the last three answers (`_Answer.recent`); nothing-found openers 0.25 to 1.00 over 50 turns
- coordinator order (2026-10-11): every S/M row of OPEN-ledger rows 395 to 543; L rows deferred-next-PR
- done (rows, step D): 543 agreement is small talk (15/15 forms, owner-typo "gud plan"); 414 monthly from the 29th to 31st keeps its day (BYMONTHDAY, rolled 31 Jan, 28 Feb, 31 Mar); 404 and 417 the Guide with no model reads typos and says so; 410 chips and overview subject drop "notes about"; found working 409: "rust" fitted to "rest" (dictionary words are never fitted); checked built: 406, 416 (Ask draws its own chart), 424, 498, 533 to 535, 542
- next: clarifying and confirmation families; personal and random questions (30 gold); tasks and routing (30); actions with chips (30); the Guide (25 gold); A8, B20 to B27, B40; Chromium after-run
