# coverage-1010: the 18 open INBOX items, each checked in the app (2026-10-10)

Port 8803, branch agent/coverage-1010. State is fixed now, already fixed, owned (Owner line in INBOX), or placed (a row in a plan, item resolved).

| Item | State | Owner or fix | Evidence |
| --- | --- | --- | --- |
| 561 | owned | TIMELINE_PLAN, UI_MODERNISATION 12; waits on the owner's look at 543 | built in 543; not re-measured here |
| 694 | already fixed | dock694-1006 (`cf6af06`), HISTORY 685 | chat dock Ask / Agent segments sit 1px inside the track at 1440 and 390; Settings Pace pill not re-measured |
| 725 | owned | CHAT_PLAN Phase 5, 6; Brief 39, 65 to 68 | composer725-1006.md numbers; open-ended |
| 727 | already fixed | `askStatusBusy`, INBOX 649 | progress line 26px high 50 ms after asking, two phases seen |
| 728 | owned | carddate agent, Brief 37 | `fitNoteMetas` folds the reason chip to its icon (24px, `is-icon`) beside a plain 85px "65% similar"; one-line fix named |
| 729 | placed | CHAT_PLAN coverage section, Brief 39, 67 | hobbies answer: two quotes joined by "Also,", no summary |
| 730 | owned | Brief 39b, WORLD_CLASS 23 | not measured here |
| 731 | placed | CHAT_PLAN coverage section, Brief 84 | not reproduced; needs the owner's log |
| 734 | placed | CHAT_PLAN coverage section, Brief 67 | `reminder_parser.py` reads dates; wording row added |
| 735 | owned | DOCUMENTS_PLAN 23, Brief 42, 69 to 71 | |
| 736 | owned | DOCUMENTS_PLAN 23, Brief 42, 69 | |
| 737 | owned | DOCUMENTS_PLAN 23, Brief 69 to 71, Brief 75 | |
| 739 | fixed now | documents.js `docUntitledName` | two New clicks gave "Untitled document 2" and "1", title selected; test_document_untitled_names.py |
| 741 | owned | composer-voice-1006.md, CHAT_PLAN Phase 6 | Ask answer has no "says" openers; direct speech still open |
| 742 | owned | Brief 34 second part | |
| 743 | owned | Brief 34 second part, OPEN.md Atlas rows | |
| 744 | placed | CHAT_PLAN decision 37, coverage section rows (b) and (c) | sources of every kind is decision 37 |
| 745 | owned | carddate agent (a), CHAT_PLAN 554 and 649 (b, c), Brief 37 (d, hover row added) | tour card already hidden while `aria-busy` (tour.js:1625); no hover reveal in tour.js |

## Left

- 728: sort `.result-reason-chip` last in `fitNoteMetas`' `words` (note-cards.js:1318), after the carddate agent merges.
- 694: re-measure the Settings Pace pill (Library, AI skills) at 390.
- 745 (d): the hover-only tour step reveal is built nowhere (tour.js has no hover handling).
