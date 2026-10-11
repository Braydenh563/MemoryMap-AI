# palette90-1010: the palette and Find anything (Brief 90, UI_MODERNISATION rows 1, 3, 5, 7)

Worktree `wt-palette90`, branch `agent/palette90-1010`. HISTORY "Moved from the
plans, 2026-10-10 (UI_MODERNISATION the palette, Brief 90)" has what was built
and its numbers.

## Built

- Row 1: generated palette rows (features, acts, settings); `tests/test_palette_coverage.py`. 18 of 18 words find a row.
- Row 3: the Nearest row and the handoff's why; Find anything's empty state with one way on.
- Row 5: learned ranking (`palettePick`), aliases (`PALETTE_ALIASES`), the reason in each row's title.
- Row 7: Find anything's field is the band's hit area; touch.js Find anything row.
- Help: the Guide's `command-palette` and `search` topics, the finder '?' popover, Settings' usage popover (the learned order is per browser and Clear forgets it).

## Left, one line each

- Not verified: the dictionary spelling offer in a live empty result. The server's own correction (`corrected`, notebook words) answered every typo tried first; `finderSpellingOffer("bolier")` was driven directly (113 ms, "boiler"). search.js `finderSpellingOffer`.
- Not verified: an act row against a running model; driven with no model, it opens Chat with the act's opening words ("remind ") at 1440 and 390, nothing is sent. app-palette.js `paletteStartAct`.
- A Settings row whose element is a plain label or head is focused as the element (the Settings search's own `openSettingRow`), not its control; measured "Accent colour" lands on its DIV at both widths. settings-find.js `openSettingRow`.
- The learned order is exact words only ("ocr", not "oc" on the way to it): Raycast also learns prefixes. Recommendation (take it): add the prefix with half weight once picks have a week of use. app-palette.js `paletteRanked`.
- Acts with no stem in the registry start with the example's first word ("remind ", "note: ", "find "); a stem per act in `act_registry._ACTS` would read better but also adds rows to the agent palette's Do group (palette.js `agentActStarters` shows stemmed acts). src/memorymap/ai/act_registry.py:62.
- Conflict risk for the merge: wt-stats89 edits app-palette.js and settings-wiring.js too (paletteEarly selection, "Count words"); `paletteRun` and `paletteMatches` are the shared lines.
- errors.js at 1440: 0 errors, 0 layout findings. At 390 not verified: four runs stopped at its login, where a second fill and click (scratchpad/ui-sweeps/errors.js:86) race an unlock slower than its 2.5 s wait; reproduced with the base commit 14a3c90f3 on the same data after a server restart, so it is the sweep and the machine, not this branch. Palette and Find anything at 390 drove with 0 page errors. Recommendation (take it): errors.js waits for `#lock-password` to be hidden instead of a fixed 2.5 s.
