# Browser probes

Playwright scripts that drive the running app and **measure** it. They are here
rather than in a session's scratch directory because both of the bugs that
prompted them were invisible to reading the source, and the next session should
not have to rewrite the probe before it can look.

CLAUDE.md's standing rule is the reason these exist: *measure and look before
you claim a UI change works.* A screenshot you look at is not a measurement.

## Running them

The app has to be up first (see CLAUDE.md for the `setsid` recipe and why
`pkill -f uvicorn` must not be used here):

```bash
SCRATCH=tools/browser PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
    node tools/browser/find-unclickable-controls.js
```

`lib.js` holds the boot: it unlocks (`#lock-password` is *one* field in two
modes, not a setup/confirm pair), dismisses onboarding, and hands back a page.
`waitUntil: "networkidle"` never settles against this app — it polls reminders,
model status and tasks — so it uses `domcontentloaded` plus an explicit wait.

## `find-unclickable-controls.js`

Walks every button, link, input, select and `summary` across eight tabs, four
Notes sections, eight Library sub-tabs and Settings, and asks
`document.elementFromPoint` whether each control is actually the topmost thing
at its own centre. It exists because two separately-reported bugs turned out to
be the same shape — a control that renders correctly and cannot be clicked
because something transparent sits over it (the gallery's select ticks, the
lightbox's dismiss area).

**It produces about 118 hits and, at the time of writing, zero bugs.** Three
artifacts account for all of them, and each has to be filtered or chased rather
than reported:

1. **Controls behind an open modal.** Correct. Filter on `.modal-overlay`,
   `.lightbox` and dialogs.
2. **Items inside a closed `<details>`.** They report a real rect and
   `visibility: visible`, because Chromium hides `<details>` content with
   `content-visibility` rather than `display: none`, so the box stays
   measurable. Settle it by tabbing through instead: focus never enters a
   closed menu.
3. **Elements whose centre is under the sticky status bar mid-scroll.** Settle
   it by scrolling the tab's own scroller to the bottom and re-testing; nothing
   is actually covered.

A sweep that yields 118 hits and 0 bugs is worth running — but only if whoever
runs it finishes it. Reporting the 118 would have been worse than not running.

## `verify-fixes.js`

Re-checks a batch of fixes against the running app in one pass, so "I fixed
nine things" can be one measurement rather than nine arguments. Written for one
session's batch, so **edit it for yours** — the value is the shape (assert the
number, not the appearance), not the specific checks.
