# calendar55, 2026-10-11 (TIMELINE_PLAN section 9, Brief 55)

Built: section 9 steps 1 to 4, section 10 row 4, section 11 row 9, section 12 rows 1 to 5 (HISTORY.md, "Moved from the plans, 2026-10-11 (TIMELINE Brief 55)").

Left, one line each:

- Touch drag on a tablet at 768 and up: HTML drag and drop does not start from a finger in every browser; not driven (timeline-calendar.js `timelineCalDragStart`).
- A day page dropped on another day rewrites its title through `PUT /entries/{id}` (`timelineCalMovePage`); built, not driven by the sweep; a document day page is refused with the hint.
- The 1,000-note month (TIMELINE_PLAN 9 "Not verified"): `TIMELINE_CAL_PAGES` reads at most ten pages of 1,000; dots cap at six and a count; not measured on `scale_test.py`'s fixture.
- Dark theme, contrast and the errors sweep not run on the calendar (`scratchpad/ui-sweeps/contrast.js`, `errors.js` with the view set to calendar).
- N on a day fills the reminders box's date (`timelineCalNewReminder`); the quick-add row with the day filled is Brief 66 (section 12 row 6).
