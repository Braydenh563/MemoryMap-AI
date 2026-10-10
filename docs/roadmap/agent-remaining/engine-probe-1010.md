# Engine probe, 2026-10-10 (Fable): what the real route answers today

Sixty questions were put to `composer.compose` directly and twenty-seven to
`POST /chat/stream` (notes only, no model) over the 77 showcase notes
(`tests/fixtures/composer/showcase_725.json`, seeded fresh so every note is
dated today and uncategorised; time questions are therefore not judged
here). Scripts: `$S/probe_composer.py`, `$S/probe_route.py`. Each row is a
failing test for Brief 39; the first block is bugs outside Phase 6's
numbered steps and comes first.

## Bugs (step 0 of Brief 39: a test each, then the fix)

| # | Question | Today, on the route | Expected |
| --- | --- | --- | --- |
| P1 | "who is Sam", "what did Sam say" | "Same breakfast as the long runs" (`Sam` matched inside `Same`) | subject terms match on word boundaries; when no note names Sam, say so |
| P2 | "hello", "thanks", "ok", "what is your name", "what can you do" with answer-from-notes on | an empty answer (no `answer` event) | the social or about-app answer, exactly as with the setting off |
| P3 | "what is 12 * 7" on the route | "Your five newest notes" (the recent fallback ran before `_sum`) | "12 * 7 is 84." (it is right when `compose` is called directly: the route's recent mode skips the utilities) |
| P4 | many answers | "(Your notes say this four times.)" on a sentence that exists in exactly one note (`Bib and pins the night before`; also `Whetstone at 15 degrees` four, `Cook grains` five) | the repetition count counts distinct notes, never retrieval rows or chunks; when it is one, nothing is said |
| P5 | "how many notes are about Harbor" | "You have 77 notes." (`notebook_stats` answered the question without its "about Harbor") | a count over the retrieval ("At least four of your notes mention Harbor", which `compose` already produces directly) |
| P6 | "what did I write last week", "when did I last write about running" | "No note found brings up 'last'"; "I couldn't find any reference to 'running'" with running notes present | time words (`last`, `recent`, `week`, `ago`) are never subject terms; the window goes to `when.py` |
| P7 | "are you an AI", "summarise my gym notes", "what did I write most about" | "Your five newest notes" | about-app answer; "No notes mention gym"; a measured answer (top terms or categories) |
| P8 | first `compose` call | 583 ms (the tables build on first use), then under 20 ms | the first call under 100 ms, or the tables built at import behind the 0.2 s import budget |

## Phase 6 shapes the probe confirms are missing (the spec covers them)

| # | Question | Today | Spec step |
| --- | --- | --- | --- |
| P9 | "what time is it", "what day is it today", "convert 5 miles to km" | a note quote ("Due in March") | utilities |
| P10 | "how many days until the dentist", "is the dentist before the boiler service" | the quote, no computation | the computed kind |
| P11 | "how many times did I mention Porto" | a quote and the repetition note | a count ("Porto appears in 5 notes, 7 times") |
| P12 | "list my work notes", "list everything tagged launch" | the checklist of one note | a list filtered by category or tag, or "no notes in Work" |
| P13 | "what are all the dates in my notes", "what is due this week" | a quote; nothing | the fact layer's dates and reminders |
| P14 | "delete the boiler note", "remind me about the dentist tomorrow", "move the sourdough note to Cooking", "tag the knife note with kitchen" | treated as questions | acts, with confirm and undo |
| P15 | "Here's the exact date:" followed by no date; "Out of the notes I looked at, one mentions X and one mentions Y. This is the information for both sides." | a lead-in promising a shape it does not deliver; a 20-word lead-in | a lead-in is chosen after the parts and names only what follows; the compare opener under eight words |
| P16 | "what is still open on the launch" | "63 open tickets" from another note | the unchecked checklist items of the launch note (the checklist parser exists; the shape does not reach it) |

Numbers: 60 direct questions in 0.89 s total; the route's answers in the
probe output. Not verified: time windows (every seeded note is dated today);
the social path with the setting off (not probed); P4's cause (fusion of
retrievers or chunking) is a reading, the count is measured.
