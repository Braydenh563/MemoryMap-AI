# grammar57-1011: Brief 57 (UI_MODERNISATION 13a), what is left

Branch `agent/grammar57-1011`. Substitutions: `$S/grammar57-subst.py` keys 11, 15, 17, 10, 9 (re-runnable after other agents' CSS lands; run the key, then the lint in the commit after it).

## Decisions not taken all the way

- **12, the layer scale.** Ratchet only (`Z_LITERALS_LEFT` 115). 49 distinct literal z-indexes from 3 to 100000, about thirty of them global: 45 menus, 50 lock, 60 popups and panels (seven rules, the AI status popup among them), 1000 to 1210 side panels, 1045 lock prompt, 1050 `#toast-box`, 2000 to 3100 the phone shell and sheets. The decision's eight steps (2, 10, 20, 40, 50, 60, 70, 80) change what stacks over what (the lock at 50 sits under toasts at 1050 today). Next: an order map per surface in a sweep (`elementFromPoint` over each pair), then one substitution.
- **13, shadows.** Ratchet only (`DROP_SHADOWS_LEFT` 19): each is a blur a token would visibly change. Next: a computed-style diff per selector, then move each to `--shadow-sm/md/lg`.
- **16, `!important`.** Ratchet only (`IMPORTANT_LEFT` 128, 171 at the design review): mostly the motion switches, print, and the companion's states.
- **17, circles.** `CIRCLES_LEFT`: six selectors keep 50% (the agent rail's step, tool chip and confirmation dots, the board's round tool buttons, and the category dot on a note's chip and on a timeline row) because the pill lint forbids them as capsules; for 13c.
- **10, colour literals.** 198 left outside the two colour files (`COLOUR_LITERALS_LEFT`, 08: 64, 02: 46, library-lazy: 33, 06: 23). Most are a theme's own palette inside a component; each needs a token named for what it paints.
- **11, the type ramp.** Done value for value (152 to 0): the decision's "four off-ramp sizes to the type tokens" would round 0.92, 0.82, 0.78 and 0.7rem onto neighbours and change what renders; the mapping kept the exact sizes as tokens. Folding them is a visual decision for 13c.
- **13.R** (decision 23, the six references) is listed against Brief 57 in 13.4 but was not in this brief; not started.

## INBOX work not finished

- 813: the timeline's and gallery's "Kinds: all" triggers keep their state word at every width (a filter that says its state is not the Filter trigger); the chat strip's skill, web search and plan toggles are pill chips on a tint, a different family from the dock's ghosts.
- 810: the "three or more fold into ⋯" rule runs through `rowActions` in Settings (learned facts, backups) only; other lists with three or more row buttons (meetings, suggestions inbox, tag manager) are not converted. Measure with `$S/g57/walls.js` (columns) and `$S/g57/setctl.js`.
- 804c: walls left at 1440 are pickers, not walls: Appearance's theme and accent grids (16, 13, 11) and Preferences' avatar looks (11); at 390 "From your name" ×9 is the avatar picker.
- 804d: "Grammar check off for this session: the grammar worker did not start" on Windows is not reproduced: in Chromium on Linux the worker starts in 8 s with the right MIME types, CSP and service worker. The failure now names the file and the reason (`docGrammarWhy`, documents-prose.js); the next Windows log says which.
- T4 menu gaps: dock menu sections no longer add their padding at a menu's ends; the board's Start and End menus were not reached by `menus.js` (it found no map), so they are not measured.

## Not verified

- Windows WebView2 for any of this; real touch (390 is emulated).
- The reply bar's model picker with a real model list (the strip was measured with one installed model).
