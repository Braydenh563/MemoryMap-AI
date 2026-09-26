# The phone, content first (INBOX 392): what this run closed, and what is left

> Companions: [OPEN.md](OPEN.md) · [../UI_MODERNISATION_PLAN.md](../UI_MODERNISATION_PLAN.md)
> Phase 11 item 12 · [../HISTORY.md](../HISTORY.md), "Moved from the plans,
> 2026-09-23"
>
> The gate is `scratchpad/ui-sweeps/phonechrome.js` at 390x844, 768x1024 and
> 1024x768 (`WIDTH`/`HEIGHT`), in a touch context, in the new default look.
> Seed first (`seed.js`, `seed-boards.js`).

## Closed

The chrome share, the first screen and the touch floor on every tab at the
three sizes (PASS, 0 findings); the status bar off a phone's screen; note rows,
dock heads, the chat head and composer, Reminders, the Library and an open
board designed for a thumb; every ⋯ menu an action sheet below 600; the 44px
floor for a coarse pointer at every width; toasts and the agent panel off the
tab bar and the composer. Numbers in HISTORY.

## Left, in the order to build it

1. ~~**The selection ticks**~~ Built 2026-09-23 (agent M, `touchticks.js`
   7/7: a 22px box inside the 44px target). Was: on Library cards and reminder rows draw a 44px box
   at rest on a touch screen; a smaller drawn box inside a 44px target would
   read lighter (the recipe is the `appearance: none` tick block in
   07-whiteboard-misc.css).
2. **Settings at 768** scrolls sideways in two sections (errors.js: Appearance
   477 in 452, `#theme-clear-overrides`; Preferences 475 in 452,
   `#pref-display-name`). Not caused by this run; not fixed in it.
3. **`phonemore.js` expects four rows** in the tab bar's More sheet and there
   are six (Ask the agent and Guide were added to it before this run); the
   sweep's number is stale, not the sheet.
4. **Not verified:** a real phone's soft keyboard and safe areas (Chromium here
   has neither), and the look on a real iPad in landscape, where
   `(pointer: coarse)` is what now raises the floor.
