# tagsearch-1011 (Sonnet), rows 1271 to 1353

id | status | evidence or commit

1271 | built | clear/restore reach discarded_tags (routes_inbox.py), counted in GET /suggestions/dismissed, Settings line + Undo carry note_tags; tests/test_dismissed_suggestions_1011.py::test_tags_turned_down_on_notes_are_counted_cleared_and_restored
1274 | done-already | measured at 1440: .doc-backlink-action border 0, background transparent, 28px tall (05-sidebars-themes.css:5978, quiet row action); the tool-confirm pair belongs to the agent/Ask owner
1278 | built | #dash-quicklinks scrollWidth 1412 to 1408 and scrollHeight 101 to 97 at 1440; 1024 999=999; 600 584=584 (08-consistency.css, ring room only under 600); at 390 the 4px is the scrolling strip's ring room, held by tests/test_ring_room.py
1280 | built | notebook_stats._notebook_block counts links and orphans only between counted notes; tests/test_notebook_stats_page.py::test_a_link_to_a_binned_or_private_note_is_not_a_link_on_the_page
1284 | done-already | navigation.js hasUnsavedWork (1692) no longer counts the capture box; tests/test_unsaved_work_guard.py
1285 | done-already | GET /most-opened + EntryOpen log + dashboard "most-opened" widget (routes_vision.py:112, dashboard.js:68), tests/test_vision_rows_row11.py::test_most_opened_counts_this_month_only; its "wrong" correction half is the Ask evidence card (skipped, Ask owner)
1338 | done-already | undo toast on "not about this tag" (tag-suggest.js answerSuggestedTags) and the "Not suggested" list with restore chips (note-edit-panels.js:501); this commit adds the count and a clear to Settings, Data
