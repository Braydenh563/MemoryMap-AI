# density-1010: what is left (Brief 41, UI_MODERNISATION_PLAN Phase 12)

- Step 5b, decision 6 ("a better and more primary calendar feature paired with the reminders"): the calendar mode is TIMELINE_PLAN section 9 (Phase 5, Brief 55, gates 1 to 4); not started here. `renderReminderCalendar` (frontend/js/shell-reminders.js:982) still stands until it goes (decision 19).
- Decision 8, indent guides ("on vs code selected lines have their line number bolded, the line subtly bordered and there are also indentation lines"): the active line is built (library-lazy.css, `.cm-activeLineGutter`); indent markers are not in the vendored CodeMirror bundle; Brief 42 owns documents-code.js (DOCUMENTS_PLAN 25 row 3).
- Decision 7 on chat bubbles and library cards ("Note metadata and chat bubble metadata still feels incredibly messy"): only note cards changed (category pill to dot and word); chat bubble meta not measured (no conversation in the fixture without a model).
- Decision 1, panel padding 12 and sidebar gutter 8: not measured or moved; the Notes dock wraps to two rows at 1440 (86px).
- Decision 5 for a date field built after boot (the map topic's due date, frontend/js/whiteboard-map.js:8793) stays native; documents' properties dates not found as inputs.
- The date picker's typed field sets the date only: "tomorrow at 3pm" typed into the date field does not move the time field.
- Pre-existing red on the base (e583d76de), not touched: test_a11y_wcag22 resize grip (documents-ide.js), test_note_meta_line, test_kept_suggestions, test_ask_records_voice, test_composer_725, test_error_toasts (2), test_feature_catalog, test_inbox_436_dashboard, test_quick_access.
- Sweeps: touch.js reports Settings appearance and privacy "did not open" (section names moved); overlap.js still counts 4px rows on `#notes-tidy`, `#dash-quicklinks`, `.library-controls`.
- Found, not fixed: one focus ring at 1:1 in Chat (`button.active`, its outline takes the ground colour, both themes, present on the base too; `scratchpad/ui-sweeps/focusring.js`).
