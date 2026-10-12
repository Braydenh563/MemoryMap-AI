# settings52-1011 (Brief 52, WORLD_CLASS 25f): what is left

Built: HISTORY "Moved from the plans, 2026-10-11 (WORLD_CLASS 25f, Brief 52)".

- Decision needed (INBOX row, recommendation: mirror them): 14 appearance keys are kept per browser only (`contrast`, `perf`, `progress-motion`, `show-thinking-words`, `border-style`, `shadow-intensity`, `avatar-*`, `atlas-style`, `assistant-avatar`, `atlas-look`, `face-look`, `dash-mark`); they are now labelled "This browser" and travel in the settings file, but a second browser does not get them (`mirroredUiKeys`, ai-tools.js:1404). `perf` is the one that should stay per machine.
- The bin row (Settings, General) grows 12px at 1440 when it shows its reset: its 70-character label wraps once the 28px button takes its width (`.row` rows, settings-rows.js `settingMarkHost`). Every other row: 0px (60 driven, 1440 and 390).
- Theme, palette, accent, custom accent and page colour, zoom and custom CSS have no per-row reset or marker (each already has its own reset or Clear beside it; Appearance's Reset appearance resets all).
- Keys with no Settings row (`NO_ROW` in tests/test_settings_rows.py) are edited where they live (lists, pickers in Chat, the document editor, the dashboard); none has a reset in Settings by design.
- Brief's "a reset per group": built as a reset per section ("Reset N changes" in the pane's title bar), not per `settings-group`; per group would put a second button in every group head.
- Not verified: the desktop (pywebview) save path for Export settings (`downloadJson` -> `saveFile`), only the browser download; the settings file's import of `skills`, `personas` and `custom_templates` replaces each list whole (validated, with Undo), not merged.
