# deepen-b-1010 (Brief 72b): what is left

Blocks written: TIMELINE_PLAN 10 to 12, AGENT_SKILLS_REFORM "Deepened
2026-10-10", CHAT_PLAN foundation 7 to 9, UI_MODERNISATION statistics,
utilities, palette and Find anything; Briefs 85 to 90 in SESSION_BRIEFS.
Sweep: `scratchpad/ui-sweeps/deepen72b.js` (SEED=1 for fixtures, then
`seed-timeline.py` on the data dir's `memorymap.db`).

## Decisions needed (one-line recommendation each)

- One calendar or two: the reminders tab's month grid (`renderReminderCalendar`, `shell-reminders.js:976`) and TIMELINE_PLAN section 9's calendar view. Recommendation: one component, section 9's, with the reminders toggle opening it filtered to reminders (TIMELINE_PLAN 12 row 1).
- Desktop notifications (decision 69): the launcher posts through the OS's own command (PowerShell toast, `osascript`, `notify-send`) with no new dependency. Recommendation: take it; an optional `plyer`-style package only if Windows toasts need actions (TIMELINE_PLAN 11 row 3).

## Not verified

- The phone paths through the More sheet: the agent (`toggleAgentPalette()` leaves the overlay hidden at 390), the Guide, the timeline and reminders were reached with `switchTab` or not at all.
- The reminders quick-add row at 390 (not visible; the phone compose not driven).
- Chat's 82 (1440) and 136 (390) overlaps after answers: a sticky head over scrolled cards or a real paint clash.
- Whether each Guide topic answers its question (only the topic's head was read).
- "last week" in Find anything: a window or the words.
- Timings: two runs at 1440, one at 390, the second 1440 run under a concurrent sweep; ranges, not budgets.
- Any real-model behaviour of the agent (CLAUDE.md section 4).
- The rail-dot alignment at 390 (0 px at 1440).
- The fixture is 96 notes (the seed ran twice), not 48.

## Found, not fixed (no app code in this brief)

- Chat with no model: "what is 15% of 240" quotes a note; "convert 5 km to miles", "what day is it today" and "summarise my week" answer "Nothing in the notes"; "remind me to call Sam tomorrow at 9" makes no reminder (CHAT_PLAN foundation 7).
- The reminders presets menu lays out while closed: 7 overlaps over the filter chips at 1440 (TIMELINE_PLAN 11 row 2).
- The agent panel with no model: 16 of 20 controls disabled (AGENT_SKILLS_REFORM, Deepened row 1).
