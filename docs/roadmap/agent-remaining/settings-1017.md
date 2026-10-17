# settings-1017 (Sonnet agent, port 8782, INBOX 904 B-list)

Order: B60 B65 B66 B56 B57 B63 B14 B68 B61 B75 B59 B53 B55.
Tests: tests/test_settings_bugs_1017.py (one per bug).

## Log
- B60 done: OCR language picker centres in Settings (label cy 2186 vs select 2193, now both 2193). b0c7e36.
- B65 done: Use this model disabled with 0 options; Stop the model disabled unless loaded or an answer runs (probe p/b65.js, MODE=empty/idle/loaded; before all enabled). 6cb4ef9.
- B66 done: mark_interrupted no longer stamps finished_at = start-up time (a 2-day-old run read "26 min ago"); line now reads the run's own start. Cause inferred from code + a seeded row; the owner's exact run was not reproduced. 94db83d.
- B56 done: Auto options in Appearance (density, performance, progress/background movement, Atlas look) and small-model mode name what Auto resolved to ("Auto (compact now)"); /models/status gains chat_model_small. Left: context window placeholder "Auto", timeline Bucket by Auto. Next: B57.
