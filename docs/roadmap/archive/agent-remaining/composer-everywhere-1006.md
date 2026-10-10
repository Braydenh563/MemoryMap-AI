# composer-everywhere-1006: the app's voice (CHAT_PLAN "the composer everywhere" 1, 2, 4, 5, 8)

Stopped early (owner usage at 98%). Landed: `ai/composer_voice.py` (own `VOICE` phrasebook, reuses composer's `read_note`/`_Answer`, never edits `PHRASES`): `remarks` (due, on this day, resurfaced, pattern, open items, empty day, week count), `today_line`, `week_review`, `one_line` + `asks` (Find anything), `title_for`, `suggested_searches`. Eval `tests/_voice_eval.py`, gates `tests/test_composer_voice.py` (6 pass).
Measured (showcase fixture): grounded 1.0 on every surface; companion 20 of 20 distinct over 20 days, 4 openings, 20.4 words; today line 9.6 words; week review 87.7 words; find line 25/25 questions, 20 openings; titles 75, grounded 1.0, 5.7 words.

## Remaining, in order (nothing of these is built)
1. Route `GET /insights/voice` (routes_insights.py): load 14 days of non-private notes + on-this-day + `resurface.for_day` ids + open reminders due by tomorrow; return remarks, today, week (unlinked from `paths.orphans`), searches.
2. Companion bubbles: lazy module `frontend/js/companion-voice.js` (LAZY_MODULES in app.js); bubble = `.nm-say` + modifier with an Open button (`flashEntry(id)`); seen keys in prefs; one remark per ~5 min; quiet while an input/textarea/contenteditable has focus or a key was pressed in 20s; Appearance toggle + help (order 13).
3. Dashboard: today line under `#dash-greeting` (dashboard.js `renderDashboardGreeting`); digest widget with no model shows `week` with a "Your notes, no AI" label (`renderDigestWidget` ~3321); on-this-day lead line (`renderOnThisDayWidget` ~4924).
4. Find anything: `GET /search/answer?q=` (routes_search.py, top note hits -> `one_line`), drawn above `#finder-results` when `asks(q)` (spaces-find.js `finderSearch` ~878); suggested searches in `finderRenderEmpty`.
5. Titles: `routes_drafts.draft_title` falls back to `title_for` when the model gives "".
6. DESIGN.md "App voice" section; lint holding `VOICE` to it (extend test_phrasebook_keeps_the_copy_rules). CHANGELOG lines (both files).
Not verified: no browser run (no UI built). Found-not-fixed: `one_line` for "when is the harbor launch?" quotes Q4 roadmap, not the dated sentence (compose's grounding rows lack it).
