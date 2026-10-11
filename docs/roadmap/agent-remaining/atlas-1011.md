# atlas-1011: Atlas as the app's assistant (CHAT_PLAN decisions 65, 66, 69, 70 to 74; rows A1 to A8, B1 to B12, B30 to B32)

Owner: "the response feels plain, boring, lifeless, and doesnt give me anything more. I may as well just read the notes I made on the right ... I feel like Im going in a loop". Built so far: decision 70 (`ai/composer_digest.py`, `tests/test_gold_answers.py`, `scratchpad/ui-sweeps/gold.js`), decision 65 (`ai/capability.py`, `tests/test_capability_1011.py`). Gold mean in the app, no model: 45 before, 72 now (notes answers about 80). Left, in order:

1. B1 to B12 (decisions 71 to 74): answer first then one supported inference; a shape per kind (a compare as a table, a count as a large number, a who as a card, what's left as a checklist); pin relative time ("this week" written 17 July becomes "the week of 17 July", `composer_digest._tidy`); how sure and how fresh per fact; More expands, citation hover previews; varied openings per voice (Settings, Chat; Warm and concise, Neutral, Playful, Plain); glossary; dialogue memory over 5 turns; one clarifying chip on a tie; the open tab as context; volunteered insight switch (off, one line, as found) with a rising threshold; answer to note, document, mind map, flashcards or reminder.
2. B30 to B32: "Why this answer" lines (INBOX 805); "Wrong fact" on a line feeding decision 68's audit; "Pin as true".
3. A4 (decision 66): web results as a collapsible source panel (the thinking fold's recipe), "Read this page" rendered in place from `/websearch/read`; `routes_chat._web_answer` returns None when the composer grounds nothing (routes_chat.py ~1965), so a search that found pages answers nothing: the owner, INBOX 810, "didnt even output the results".
4. A1: utilities, "5 + 5", "time in Western Australia", "average of 3, 8, 10", "days until 25 Dec" (`utilities.kind_of("5 + 5")` is None); 60 phrasings at 95%. Gold Q3 28, Q4 27, Q5 14.
5. A5 every tool result shown as a card; A6 query clean-up and dialogue (INBOX 808); A3 history records ("what did I search yesterday"); A7 composer in background uses; A8 ghost text (decision 69, its DESIGN.md recipe and lint).
6. Later rows for the queue: B20 to B27, B40.

Not verified: any real model; the non-stream `/chat` route (routes_chat.py ~1571) does not answer capability questions from the list.

Found, not fixed: a chat title keeps a trailing backslash ("what is there about a gaming mouse?\"); a digest answer has no Ask next chips (`next: []`); `test_question_noise.py::test_the_composer_imports_without_the_database_layer` fails at load average 10 (0.53 s; 0.17 to 0.25 s measured alone).
