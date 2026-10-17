# calendar-b72-1017: the calendar as a calendar (INBOX 904 B72; TIMELINE_PLAN 9 and 12 row 6)

The owner, verbatim (INBOX 904 B72): "Have the timeline calendar on the timelone act and be more usable as a calendar, I wanna be able to double click on a date and be able to add an event and set a reminder and stuff. Also on the timeline I wanna be able to scroll above today's date to see future dates and also I want the app to be able to recognise future date and time mentions and suggest to use magic add to add it to the timeline, calendar and as a reminder"

Found on arrival: Phase 5 steps 1 to 4 were built 2026-10-11 (HISTORY, "TIMELINE Brief 55"); section 12 row 6 (N opens quick add with the day) and B72 were open.

## Decisions taken (missing from the plan; recommendation taken)

- An "event" is a meeting note on the day (decision 27: no events table), titled from the words, at the sheet's day and time, with "Remind me at the start" on by default (a reminder linked to it, `entry_id`); an event already past gets no reminder.
- A single press on a day waits 250 ms (`TIMELINE_CAL_DOUBLE_MS`) before decision 20's open, so a double click adds instead of landing in the Day view; a slower second press lands in the Day view's cell for the same day and adds there.
- A time alone in the words ("at 3pm") keeps the pressed day; only a day the words name moves it.
- An event's own reminder folds into the event's chip on the grid ("with a reminder" in its title), not a second chip.
- The add sheet is its own lazy file (`timeline-cal-add.js`): the calendar's one-keydown-listener lint, and most visits add nothing.

- The feed's days ahead are seven (today and the next seven always drawn on the day scale, any later day with rows as before); a fresh read lands on today (the dock's Today scroll), the future above it.

## Log

- done 1c7182d: the add sheet (double click, head Add, N).
- step 2: the feed's week ahead and the landing on today; row detail to timeline-detail.js (boot offset); timelineZoom const fix.
- next: step 3, future dates in the note editor's offers: say the reminder is on the calendar and the timeline (ai/offers.py `_reminders` label, quickadd.js `noteOfferTake` toast), frontend/js/quickadd.js:706.
