# settings-1017 (Sonnet agent, port 8782, INBOX 904 B-list)

Order: B60 B65 B66 B56 B57 B63 B14 B68 B61 B75 B59 B53 B55.
Tests: tests/test_settings_bugs_1017.py (one per bug).

## Log
- B60 done: OCR language picker centres in Settings (label cy 2186 vs select 2193, now both 2193). b0c7e36.
- B65 done: Use this model disabled with 0 options; Stop the model disabled unless loaded or an answer runs (probe p/b65.js, MODE=empty/idle/loaded; before all enabled). Next: B66.
